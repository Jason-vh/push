import type { Prisma } from "@prisma/client";
import { fastmailBaseUrl, inviteSender } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  inviteContentHash,
  sessionStart,
  type InviteSession,
  type Recipient,
} from "@/lib/invites/calendar";
import { FastmailSender, MaybeSentError } from "@/lib/invites/fastmail";
import { composeInvite, type Invite } from "@/lib/invites/message";
import { todayKey } from "@/lib/keen";
import { addDays, dateFromKey } from "@/lib/keenDays";

// The edit sheet saves every field as it changes, so wait for a session to settle before telling anyone.
const SETTLE_MS = 2 * 60_000;
const RETRY_MS = 5 * 60_000;
// Past sessions only get updates and cancellations for invites already out, e.g. a date corrected after the game.
const PAST_DAYS_KEPT_IN_SYNC = 7;
// A ceiling on what a bug or an abuser could send from the Fastmail account.
const DAILY_SEND_LIMIT = 25;
const DAY_MS = 24 * 60 * 60_000;

type InviteState = {
  timers: Map<string, NodeJS.Timeout>;
  queue: Promise<void>;
  recentSends: number[];
};

// Next.js can load this module once per bundle (instrumentation, each route), so the state lives on globalThis.
const globalForInvites = globalThis as unknown as { pushInvites?: InviteState };
const state: InviteState = (globalForInvites.pushInvites ??= {
  timers: new Map(),
  queue: Promise.resolve(),
  recentSends: [],
});

const sender = fastmailBaseUrl ? new FastmailSender(fastmailBaseUrl, inviteSender.email) : null;
const isOff = !sender && process.env.NODE_ENV === "production";

function isWithinDailyLimit(now: number) {
  while (state.recentSends.length > 0 && state.recentSends[0] < now - DAY_MS) {
    state.recentSends.shift();
  }
  return state.recentSends.length < DAILY_SEND_LIMIT;
}

async function deliver(invite: Invite) {
  const message = await composeInvite(invite);
  if (!sender) {
    console.info(`Calendar invite not sent (no FASTMAIL_BASE_URL):\n${message}`);
    return;
  }
  const sentAt = Date.now();
  if (!isWithinDailyLimit(sentAt)) throw new Error("Daily calendar invite limit reached");
  try {
    await sender.send(message);
  } catch (error) {
    if (error instanceof MaybeSentError) state.recentSends.push(sentAt);
    throw error;
  }
  state.recentSends.push(sentAt);
}

/** Delivers the invite and records it; an invite that may have gone out is recorded too, so it's never sent twice. */
async function deliverAndRecord(invite: Invite, record: () => Promise<unknown>) {
  try {
    await deliver(invite);
  } catch (error) {
    if (!(error instanceof MaybeSentError)) throw error;
    console.error(`Calendar invite to ${invite.recipient.email} may not have gone out`, error);
  }
  await record();
}

function inSyncWindow(): Prisma.GameSessionWhereInput {
  return {
    playedAt: { gte: dateFromKey(addDays(todayKey(), -PAST_DAYS_KEPT_IN_SYNC)) },
    startTime: { not: null },
  };
}

async function loadSessions(where: Prisma.GameSessionWhereInput) {
  return prisma.gameSession.findMany({
    where: { AND: [inSyncWindow(), where] },
    select: {
      id: true,
      playedAt: true,
      startTime: true,
      durationMinutes: true,
      venue: true,
      court: true,
      deletedAt: true,
      players: { select: { user: { select: { name: true, email: true } } } },
      invites: true,
    },
  });
}

type LoadedSession = Awaited<ReturnType<typeof loadSessions>>[number] & InviteSession;
type Task = { invite: Invite; record: () => Promise<unknown> };

function tasksFor(session: LoadedSession, now: Date): Task[] {
  const contentHash = inviteContentHash(session);
  const isUpcoming = sessionStart(session) > now;
  const sequence = Math.max(-1, ...session.invites.map((invite) => invite.sequence)) + 1;
  const invites = new Map(session.invites.map((invite) => [invite.email, invite]));
  const recipients: Recipient[] = session.deletedAt
    ? []
    : session.players.flatMap(({ user }) =>
        user.email ? [{ email: user.email, name: user.name }] : [],
      );
  const recipientEmails = new Set(recipients.map((recipient) => recipient.email));
  const tasks: Task[] = [];

  for (const recipient of recipients) {
    const invite = invites.get(recipient.email);
    const isInvited = Boolean(invite && !invite.cancelledAt);
    if (isInvited && invite?.contentHash === contentHash) continue;
    if (!isInvited && !isUpcoming) continue;

    tasks.push({
      invite: { session, recipient, sequence, kind: isInvited ? "update" : "new" },
      record: () =>
        prisma.sessionInvite.upsert({
          where: { sessionId_email: { sessionId: session.id, email: recipient.email } },
          create: { sessionId: session.id, email: recipient.email, sequence, contentHash },
          update: { sequence, contentHash, cancelledAt: null },
        }),
    });
  }

  for (const invite of session.invites) {
    if (invite.cancelledAt || recipientEmails.has(invite.email)) continue;

    tasks.push({
      invite: {
        session,
        recipient: { email: invite.email, name: null },
        sequence,
        kind: session.deletedAt ? "cancel" : "removed",
      },
      record: () =>
        prisma.sessionInvite.update({
          where: { id: invite.id },
          data: { sequence, contentHash, cancelledAt: new Date() },
        }),
    });
  }

  return tasks;
}

/**
 * Sends whatever invites, updates and cancellations bring people's calendars in line with the sessions,
 * and returns the sessions where something failed.
 */
export async function syncInvites(where: Prisma.GameSessionWhereInput = {}, now = new Date()) {
  const failed = new Set<string>();
  for (const session of await loadSessions(where)) {
    const { startTime } = session;
    if (!startTime) continue;
    for (const { invite, record } of tasksFor({ ...session, startTime }, now)) {
      try {
        await deliverAndRecord(invite, record);
      } catch (error) {
        failed.add(session.id);
        console.error(
          `Calendar invite for session ${session.id} to ${invite.recipient.email} failed`,
          error,
        );
      }
    }
  }
  return [...failed];
}

function enqueue(where: Prisma.GameSessionWhereInput) {
  state.queue = state.queue
    .then(async () => {
      const failed = await syncInvites(where);
      if (failed.length > 0) scheduleInvites(failed, RETRY_MS);
    })
    .catch((error: unknown) => console.error("Calendar invites failed", error));
}

/** Brings these sessions' invites up to date once they've been left alone for a while. */
export function scheduleInvites(sessionIds: string[], delayMs = SETTLE_MS) {
  if (isOff) return;
  for (const sessionId of sessionIds) {
    clearTimeout(state.timers.get(sessionId));
    const timer = setTimeout(() => {
      state.timers.delete(sessionId);
      enqueue({ id: sessionId });
    }, delayMs);
    state.timers.set(sessionId, timer);
  }
}

export async function schedulePlayerInvites(userId: string) {
  const sessions = await prisma.gameSession.findMany({
    where: { AND: [inSyncWindow(), { players: { some: { userId } } }] },
    select: { id: true },
  });
  scheduleInvites(sessions.map((session) => session.id));
}

/** Catches up on anything a restart interrupted. */
export function startInvites() {
  if (isOff) {
    console.error("FASTMAIL_BASE_URL is not set, so calendar invites are off");
    return;
  }
  enqueue({});
}
