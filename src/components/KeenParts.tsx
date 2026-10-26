import { shortName } from "@/components/CalloutRow";
import { endTime, type KeenSession } from "@/lib/keenDays";

export function BookingTicket({ session }: { session: KeenSession }) {
  const time = sessionTime(session);
  return (
    <div className="keen-ticket">
      <BallSeam />
      <div className="keen-ticket-label">Booked</div>
      <div className="keen-ticket-venue">{session.venue ?? "Session"}</div>
      {time || session.court ? (
        <div className="keen-ticket-meta">
          {time ? (
            <span>
              <ClockIcon />
              {time}
            </span>
          ) : null}
          {session.court ? (
            <span>
              <CourtIcon />
              {session.court}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function sessionTime(session: KeenSession) {
  if (!session.startTime) return null;
  if (!session.durationMinutes) return session.startTime;
  return `${session.startTime}–${endTime(session.startTime, session.durationMinutes)}`;
}

export function BallSeam() {
  return (
    <svg className="keen-seam" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden>
      <path d="M330,0 C305,35 305,105 330,140 L400,140 L400,0 Z" fill="#5f7a3c" opacity="0.75" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 1.5v9M1.5 6h9" />
    </svg>
  );
}

export function displayName(player: { userId: string; name: string }, userId: string) {
  return player.userId === userId ? "You" : shortName(player.name);
}

export function PinIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M8 14.5s-4.5-4.3-4.5-8a4.5 4.5 0 019 0c0 3.7-4.5 8-4.5 8z" />
      <circle cx="8" cy="6.5" r="1.6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.4" />
    </svg>
  );
}

function CourtIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M8 3v10" strokeDasharray="1.6 1.6" />
    </svg>
  );
}
