import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { shortName } from "@/components/CalloutRow";
import { DeltaPill } from "@/components/SessionRow";
import { displayRating } from "@/lib/elo";
import type { PersonalSession, StandingsRow } from "@/lib/sessionStats";

type Player = { id: string; name: string };

export function YourSession({ stats }: { stats: PersonalSession }) {
  const delta = Math.round(stats.delta);
  let direction = "flat";
  if (delta > 0) direction = "up";
  if (delta < 0) direction = "down";
  const played = stats.won + stats.lost;
  const winRate = Math.round((stats.won / played) * 100);

  return (
    <section className="session-section">
      <div className="section-head">
        <h2>Your session</h2>
      </div>
      <div className="session-stat-grid">
        <div className="session-stat wide">
          <div>
            <div className="session-stat-label">Rating change</div>
            <div className={`session-stat-value big ${direction}`}>{signed(delta)}</div>
            <div className="session-stat-sub">
              {displayRating(stats.before)} → {displayRating(stats.after)}
            </div>
          </div>
          {stats.trail.length > 1 ? <SessionSparkline values={stats.trail} /> : null}
        </div>
        <Stat label="Won" value={String(stats.won)} tone="up" />
        <Stat label="Lost" value={String(stats.lost)} tone="down" />
        <Stat label="Win rate" value={`${winRate}%`} />
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="session-stat">
      <div className="session-stat-label">{label}</div>
      <div className={`session-stat-value${tone ? ` ${tone}` : ""}`}>{value}</div>
    </div>
  );
}

const SPARK_WIDTH = 132;
const SPARK_HEIGHT = 56;
const SPARK_PAD = 6;
const SPARK_INSET_X = 5;

function SessionSparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => ({
    x: SPARK_INSET_X + (index / (values.length - 1)) * (SPARK_WIDTH - SPARK_INSET_X * 2),
    y: SPARK_HEIGHT - SPARK_PAD - ((value - min) / span) * (SPARK_HEIGHT - SPARK_PAD * 2),
  }));
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];

  return (
    <svg className="session-sparkline" viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} aria-hidden>
      <path
        d={`${line} L${last.x},${SPARK_HEIGHT} L${points[0].x},${SPARK_HEIGHT} Z`}
        className="area"
      />
      <path d={line} className="line" />
      {points.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.2} className="dot" />
      ))}
      <circle cx={last.x} cy={last.y} r={4} className="end" />
    </svg>
  );
}

export function SessionStandings({
  rows,
  playersById,
  userId,
}: {
  rows: StandingsRow[];
  playersById: Map<string, Player>;
  userId: string;
}) {
  return (
    <section className="session-section">
      <div className="section-head">
        <h2>Standings</h2>
      </div>
      <div className="session-list-card">
        {rows.map((row, index) => {
          const player = playersById.get(row.userId);
          if (!player) return null;
          const played = row.won + row.lost > 0;
          return (
            <PlayerRow
              key={row.userId}
              rank={index + 1}
              player={player}
              isMe={row.userId === userId}
              isTop={index === 0 && played}
              meta={
                played ? (
                  <>
                    <span className="w">{row.won}W</span> · <span className="l">{row.lost}L</span>
                    {row.allScored ? ` · ${row.gamesFor}–${row.gamesAgainst}` : null}
                  </>
                ) : (
                  "Hasn't played yet"
                )
              }
              aside={<DeltaPill value={Math.round(row.delta)} />}
            />
          );
        })}
      </div>
    </section>
  );
}

export function SessionRatings({
  players,
  ratings,
  userId,
}: {
  players: Player[];
  ratings: Map<string, number>;
  userId: string;
}) {
  const ranked = [...players].sort((a, b) => (ratings.get(b.id) ?? 0) - (ratings.get(a.id) ?? 0));
  return (
    <section className="session-section">
      <div className="section-head">
        <h2>Ratings</h2>
      </div>
      <div className="session-list-card">
        {ranked.map((player, index) => (
          <PlayerRow
            key={player.id}
            rank={index + 1}
            player={player}
            isMe={player.id === userId}
            aside={
              <span className="session-row-rating">
                {displayRating(ratings.get(player.id) ?? 0)}
              </span>
            }
          />
        ))}
      </div>
    </section>
  );
}

function PlayerRow({
  rank,
  player,
  isMe,
  isTop = false,
  meta,
  aside,
}: {
  rank: number;
  player: Player;
  isMe: boolean;
  isTop?: boolean;
  meta?: React.ReactNode;
  aside: React.ReactNode;
}) {
  const classes = ["session-player-row"];
  if (isMe) classes.push("me");
  if (isTop) classes.push("top");
  return (
    <Link className={classes.join(" ")} href={`/players/${player.id}`}>
      <span className="session-row-rank">{rank}</span>
      <Avatar name={player.name} size={30} />
      <span className="session-row-main">
        <span className="session-row-name">{isMe ? "You" : shortName(player.name)}</span>
        {meta ? <span className="session-row-meta">{meta}</span> : null}
      </span>
      {aside}
    </Link>
  );
}

function signed(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}
