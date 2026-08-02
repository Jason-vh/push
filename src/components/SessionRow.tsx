import Link from "next/link";

export function SessionRow({
  href,
  playedAt,
  venue,
  results,
  delta,
}: {
  href: string;
  playedAt: Date;
  venue: string | null;
  results: { won: number; lost: number; total: number };
  delta: number;
}) {
  const { dow, day } = splitDate(playedAt);
  return (
    <Link className="session-row" href={href}>
      <div className="session-date">
        <span className="dow">{dow}</span>
        <span className="day">{day}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="session-meta-line">
          {results.total} {results.total === 1 ? "game" : "games"}
          {results.won + results.lost > 0 ? (
            <>
              {" · "}
              <span className="w">{results.won}W</span>
              <span className="sep"> · </span>
              <span className="l">{results.lost}L</span>
            </>
          ) : null}
        </div>
        {venue ? <div className="session-venue">{venue}</div> : null}
      </div>
      <DeltaPill value={delta} />
    </Link>
  );
}

export function DeltaPill({ value }: { value: number }) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const abs = Math.abs(value);
  return (
    <span className={`delta-pill ${direction}`}>
      {direction === "flat" ? (
        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
          <rect x="2" y="4.3" width="6" height="1.4" rx="0.7" />
        </svg>
      ) : (
        <svg width="9" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
          <path d="M5 1.5L9 6.5H1L5 1.5Z" />
        </svg>
      )}
      {direction === "flat" ? "0" : abs}
    </span>
  );
}

function splitDate(date: Date) {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric" });
  const parts = formatter.formatToParts(date);
  const dow = parts.find((p) => p.type === "weekday")?.value.toUpperCase() ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return { dow, day };
}
