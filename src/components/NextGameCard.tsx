import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BallSeam, PinIcon, displayName } from "@/components/KeenParts";
import { formatDate, lineupOf, relativeDay, type KeenDay } from "@/lib/keenDays";

export function NextGameCard({
  day,
  today,
  userId,
}: {
  day: KeenDay;
  today: string;
  userId: string;
}) {
  const booking = day.booking;
  if (!booking) return null;
  const booker = { userId: booking.bookedById, name: booking.bookedByName };

  return (
    <Link className="next-game" href={`/calendar?date=${day.date}`}>
      <BallSeam />
      <div className="next-game-label">Next game · {relativeDay(day.date, today)}</div>
      <div className="next-game-when">
        {formatDate(day.date, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
        {booking.startTime}
      </div>
      <div className="next-game-where">
        <PinIcon />
        {booking.venue}
        {booking.court ? ` · ${booking.court}` : ""}
      </div>
      <div className="next-game-foot">
        <div className="keen-stack on-dark">
          {lineupOf(day).map((player) => (
            <span key={player.userId} className="keen-stack-avatar">
              <Avatar name={player.name} size={28} />
            </span>
          ))}
        </div>
        <span className="next-game-booker">Booked by {displayName(booker, userId)}</span>
      </div>
    </Link>
  );
}
