import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { endTime, formatDate, keyFromDate } from "@/lib/keenDays";

export type UpcomingGame = {
  id: string;
  playedAt: Date;
  venue: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  court: string | null;
  players: Array<{ id: string; name: string }>;
};

export function UpcomingGames({ games }: { games: UpcomingGame[] }) {
  return (
    <section style={{ marginTop: 22 }}>
      <div className="section-head">
        <h2>Upcoming games</h2>
        <Link className="btn-pill" href="/calendar">
          <CalendarIcon />
          Calendar
        </Link>
      </div>

      {games.length === 0 ? (
        <Link className="keen-empty upcoming-empty" href="/calendar">
          <Image src="/empty-court.webp" alt="" width={190} height={125} />
          <strong>Nothing booked yet</strong>
          <span>Pick a day you can play and others can join</span>
        </Link>
      ) : (
        <div className="session-list">
          {games.map((game, index) => (
            <UpcomingRow key={game.id} game={game} isNext={index === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingRow({ game, isNext }: { game: UpcomingGame; isNext: boolean }) {
  const date = keyFromDate(game.playedAt);
  const details = [timeRange(game), game.court].filter(Boolean).join(" · ");

  return (
    <Link className="upcoming-row" href={`/sessions/${game.id}`}>
      <div className="session-date">
        <span className="dow">{formatDate(date, { weekday: "short" })}</span>
        <span className="day">{formatDate(date, { day: "numeric" })}</span>
      </div>
      <div className="upcoming-main">
        {isNext ? <div className="upcoming-label">Next game</div> : null}
        <div className="upcoming-title">{game.venue ?? "Session"}</div>
        {details ? <div className="session-venue">{details}</div> : null}
      </div>
      <div className="keen-stack">
        {game.players.map((player) => (
          <span key={player.id} className="keen-stack-avatar">
            <Avatar name={player.name} size={22} />
          </span>
        ))}
      </div>
    </Link>
  );
}

function timeRange(game: UpcomingGame) {
  if (!game.startTime) return null;
  if (!game.durationMinutes) return game.startTime;
  return `${game.startTime}–${endTime(game.startTime, game.durationMinutes)}`;
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="2" y="3" width="12" height="11" rx="2.2" />
      <path d="M2 6.5h12M5.5 1.6v2.6M10.5 1.6v2.6" />
    </svg>
  );
}
