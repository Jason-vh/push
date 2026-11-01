import { fastmailBaseUrl, inviteSender } from "@/lib/config";
import { prisma } from "@/lib/db";
import { inviteContentHash, sessionStart, type InviteSession } from "@/lib/invites/calendar";
import { FastmailSender } from "@/lib/invites/fastmail";
import { composeInvite, type Invite } from "@/lib/invites/message";
import { todayKey } from "@/lib/keen";
import { dateFromKey } from "@/lib/keenDays";

const INTERVAL_MS = 60_000;
// The edit sheet saves every field as it changes, so wait for a session to settle before telling anyone.
const QUIET_MS = 2 * 60_000;

const sender = fastmailBaseUrl ? new FastmailSender(fastmailBaseUrl, inviteSender.email) : null;

async function deliver(invite: Invite) {
  const message = await composeInvite(invite);
  if (!sender) {
    console.info(
      `Calendar invite not sent (no FASTMAIL_BASE_URL): ${invite.kind} to ${invite.recipient.email}\n${message}`,
    );
    return;
  }
  await sender.send(message);
}

async function loadSettledSessions(now: Date) {
  return prisma.gameSession.findMany({
    where: {
      playedAt: { gte: dateFromKey(todayKey()) },
      startTime: { not: null },
      updatedAt: { lt: new Date(now.getTime() - QUIET_MS) },
    },
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

type SettledSession = Awaited<ReturnType<typeof loadSettledSessions>>[number];

async function reconcileSession(session: SettledSession & InviteSession) {
  const contentHash = inviteContentHash(session);
  const invites = new Map(session.invites.map((invite) => [invite.email, invite]));
  const recipients = session.deletedAt
    ? []
    : session.players.flatMap(({ user }) =>
        user.email ? [{ email: user.email, name: user.name }] : [],
      );
  const recipientEmails = new Set(recipients.map((recipient) => recipient.email));

  for (const recipient of recipients) {
    const invite = invites.get(recipient.email);
    const isInvited = Boolean(invite && !invite.cancelledAt);
    if (isInvited && invite?.contentHash === contentHash) continue;

    const sequence = invite ? invite.sequence + 1 : 0;
    await deliver({ session, recipient, sequence, kind: isInvited ? "update" : "new" });
    await prisma.sessionInvite.upsert({
      where: { sessionId_email: { sessionId: session.id, email: recipient.email } },
      create: { sessionId: session.id, email: recipient.email, sequence, contentHash },
      update: { sequence, contentHash, cancelledAt: null },
    });
  }

  for (const invite of session.invites) {
    if (invite.cancelledAt || recipientEmails.has(invite.email)) continue;

    const sequence = invite.sequence + 1;
    await deliver({
      session,
      recipient: { email: invite.email, name: null },
      sequence,
      kind: "cancel",
    });
    await prisma.sessionInvite.update({
      where: { id: invite.id },
      data: { sequence, contentHash, cancelledAt: new Date() },
    });
  }
}

/** Sends whatever invites, updates and cancellations bring everyone's calendar in line with upcoming sessions. */
export async function reconcileInvites(now = new Date()) {
  const sessions = await loadSettledSessions(now);
  for (const session of sessions) {
    const { startTime } = session;
    if (!startTime) continue;
    const inviteSession = { ...session, startTime };
    if (sessionStart(inviteSession) <= now) continue;
    try {
      await reconcileSession(inviteSession);
    } catch (error) {
      console.error(`Calendar invites for session ${session.id} failed`, error);
    }
  }
}

let isRunning = false;

export function startInviteLoop() {
  setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await reconcileInvites();
    } catch (error) {
      console.error("Calendar invites failed", error);
    } finally {
      isRunning = false;
    }
  }, INTERVAL_MS);
}
