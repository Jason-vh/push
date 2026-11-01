import { createHash } from "node:crypto";
import ical, {
  ICalAttendeeRole,
  ICalAttendeeStatus,
  ICalCalendarMethod,
  ICalEventStatus,
} from "ical-generator";
import { appTimeZone, appUrl, inviteSender, rpID, rpName } from "@/lib/config";
import { DEFAULT_DURATION, keyFromDate } from "@/lib/keenDays";
import { zonedTimeToUtc } from "@/lib/zonedTime";

export type InviteSession = {
  id: string;
  playedAt: Date;
  startTime: string;
  durationMinutes: number | null;
  venue: string | null;
  court: string | null;
};

export type InviteMethod = "REQUEST" | "CANCEL";

export type Recipient = { email: string; name: string | null };

export function sessionStart(session: InviteSession) {
  return zonedTimeToUtc(keyFromDate(session.playedAt), session.startTime, appTimeZone);
}

export function sessionEnd(session: InviteSession) {
  const minutes = session.durationMinutes ?? DEFAULT_DURATION;
  return new Date(sessionStart(session).getTime() + minutes * 60_000);
}

export function sessionTitle(session: InviteSession) {
  return session.venue ? `Padel at ${session.venue}` : "Padel";
}

function eventTitle(session: InviteSession) {
  return session.court ? `Padel · ${session.court}` : "Padel";
}

export function sessionUrl(session: InviteSession) {
  return `${appUrl}/sessions/${session.id}`;
}

/** Changes whenever what the invite says changes; who else is invited is deliberately left out. */
export function inviteContentHash(session: InviteSession) {
  const content = [
    keyFromDate(session.playedAt),
    session.startTime,
    session.durationMinutes,
    session.venue,
    session.court,
  ];
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function calendarInvite({
  session,
  recipient,
  method,
  sequence,
}: {
  session: InviteSession;
  recipient: Recipient;
  method: InviteMethod;
  sequence: number;
}) {
  const calendar = ical({
    prodId: { company: "vhtm.eu", product: rpName, language: "EN" },
    method: method === "CANCEL" ? ICalCalendarMethod.CANCEL : ICalCalendarMethod.REQUEST,
  });
  calendar.createEvent({
    id: `${session.id}@${rpID}`,
    sequence,
    stamp: new Date(),
    start: sessionStart(session),
    end: sessionEnd(session),
    summary: eventTitle(session),
    location: session.venue,
    description: sessionUrl(session),
    status: method === "CANCEL" ? ICalEventStatus.CANCELLED : ICalEventStatus.CONFIRMED,
    organizer: { name: inviteSender.name, email: inviteSender.email },
    attendees: [
      {
        email: recipient.email,
        name: recipient.name,
        role: ICalAttendeeRole.REQ,
        status: ICalAttendeeStatus.NEEDSACTION,
        rsvp: method === "REQUEST",
      },
    ],
  });
  return calendar.toString();
}
