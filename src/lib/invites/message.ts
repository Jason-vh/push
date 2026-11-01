import { createTransport } from "nodemailer";
import { appTimeZone, inviteSender } from "@/lib/config";
import {
  calendarInvite,
  sessionEnd,
  sessionStart,
  sessionTitle,
  sessionUrl,
  type InviteMethod,
  type InviteSession,
  type Recipient,
} from "@/lib/invites/calendar";

export type InviteKind = "new" | "update" | "cancel";

export type Invite = {
  session: InviteSession;
  recipient: Recipient;
  kind: InviteKind;
  sequence: number;
};

const composer = createTransport({ streamTransport: true, buffer: true, newline: "windows" });

function formatWhen(session: InviteSession) {
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: appTimeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(sessionStart(session));
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: appTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time.format(sessionStart(session))}–${time.format(sessionEnd(session))}`;
}

function subjectFor(invite: Invite) {
  const subject = `${sessionTitle(invite.session)}, ${formatWhen(invite.session)}`;
  if (invite.kind === "update") return `Updated: ${subject}`;
  if (invite.kind === "cancel") return `Cancelled: ${subject}`;
  return subject;
}

function textFor(invite: Invite) {
  const { session } = invite;
  const lines = [sessionTitle(session), formatWhen(session)];
  if (session.court) lines.push(session.court);
  if (invite.kind === "cancel") lines.unshift("This session is off.", "");
  lines.push("", sessionUrl(session));
  return lines.join("\n");
}

/** The whole email, as Fastmail imports it: a text body with the calendar event as its alternative. */
export async function composeInvite(invite: Invite): Promise<Buffer> {
  const method: InviteMethod = invite.kind === "cancel" ? "CANCEL" : "REQUEST";
  const { message } = await composer.sendMail({
    from: { name: inviteSender.name, address: inviteSender.email },
    to: invite.recipient.name
      ? { name: invite.recipient.name, address: invite.recipient.email }
      : invite.recipient.email,
    subject: subjectFor(invite),
    text: textFor(invite),
    icalEvent: {
      method,
      content: calendarInvite({
        session: invite.session,
        recipient: invite.recipient,
        method,
        sequence: invite.sequence,
      }),
    },
  });
  if (!Buffer.isBuffer(message)) throw new Error("The email was composed as a stream");
  return message;
}
