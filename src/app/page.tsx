import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AuthPanel } from "@/components/AuthPanel";
import { Avatar } from "@/components/Avatar";
import { prisma } from "@/lib/db";
import { displayRating } from "@/lib/elo";
import {
  bestTeammate,
  computeRatings,
  loadAllMatchesOrdered,
  statsFor,
  toughestOpponent,
  type PairRecord,
} from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const [users, recentSessions, orderedMatches] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
    }),
    prisma.gameSession.findMany({
      take: 5,
      orderBy: { playedAt: "desc" },
      include: {
        matches: {
          select: {
            id: true,
            winnerTeam: true,
            teamAPlayer1Id: true,
            teamAPlayer2Id: true,
            teamBPlayer1Id: true,
            teamBPlayer2Id: true,
          },
        },
      },
    }),
    loadAllMatchesOrdered(prisma),
  ]);

  const { stats, byMatch } = computeRatings(orderedMatches);
  const usersById = new Map(users.map((u) => [u.id, u]));

  const leaderboard = users
    .map((u) => {
      const s = statsFor(stats, u.id);
      return {
        id: u.id,
        name: u.name,
        rating: s.rating,
        wins: s.wins,
        losses: s.losses,
        isMe: u.id === user.id,
      };
    })
    .sort((a, b) => b.rating - a.rating);

  const currentStats = statsFor(stats, user.id);
  const currentRank = leaderboard.findIndex((entry) => entry.id === user.id) + 1 || null;

  const teammate = bestTeammate(orderedMatches, user.id);
  const opponent = toughestOpponent(orderedMatches, user.id);

  // Per-session "my delta" + my W/L. total = all matches in the session.
  const sessionDelta = new Map<string, number>();
  const sessionMyResults = new Map<string, { won: number; lost: number; total: number }>();
  for (const session of recentSessions) {
    let delta = 0;
    let won = 0;
    let lost = 0;
    for (const match of session.matches) {
      const onTeamA =
        match.teamAPlayer1Id === user.id || match.teamAPlayer2Id === user.id;
      const onTeamB =
        match.teamBPlayer1Id === user.id || match.teamBPlayer2Id === user.id;
      if (onTeamA || onTeamB) {
        const myTeam: "A" | "B" = onTeamA ? "A" : "B";
        if (match.winnerTeam === myTeam) won += 1;
        else lost += 1;
        const change = byMatch.get(match.id)?.find((c) => c.userId === user.id);
        if (change) delta += change.delta;
      }
    }
    sessionDelta.set(session.id, Math.round(delta));
    sessionMyResults.set(session.id, { won, lost, total: session.matches.length });
  }

  return (
    <main className="shell">
      <AppHeader userName={user.name} />

      <RatingHero rating={currentStats.rating} rank={currentRank} />

      <Leaderboard entries={leaderboard} />

      <div className="callout-grid" style={{ marginTop: 14 }}>
        <CalloutCard
          title="Best teammate"
          record={teammate}
          name={teammate ? usersById.get(teammate.otherUserId)?.name ?? null : null}
          tone="positive"
        />
        <CalloutCard
          title="Toughest opponent"
          record={opponent}
          name={opponent ? usersById.get(opponent.otherUserId)?.name ?? null : null}
          tone="negative"
        />
      </div>

      <section style={{ marginTop: 22 }}>
        <div className="section-head">
          <h2>Recent sessions</h2>
          <Link className="btn-pill" href="/sessions/new">
            <span className="plus">+</span>
            New
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="empty">No sessions logged yet. Start one to see it here.</div>
        ) : (
          <div className="session-list">
            {recentSessions.map((session) => (
              <SessionRow
                key={session.id}
                href={`/sessions/${session.id}`}
                playedAt={session.playedAt}
                venue={session.venue}
                results={sessionMyResults.get(session.id) ?? { won: 0, lost: 0, total: 0 }}
                delta={sessionDelta.get(session.id) ?? 0}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Landing() {
  return (
    <main className="auth-shell">
      <section className="auth-card-wrap">
        <div className="auth-brand">
          <div className="brand-blob">P</div>
          <strong>Push Padel</strong>
        </div>
        <AuthPanel />
      </section>
    </main>
  );
}

function RatingHero({ rating, rank }: { rating: number; rank: number | null }) {
  return (
    <div className="rating-hero" style={{ marginBottom: 14 }}>
      <svg
        className="ball-seam"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="ballPanel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6c8845" />
            <stop offset="100%" stopColor="#5a7338" />
          </linearGradient>
        </defs>
        <path d="M250,0 C220,30 220,90 250,120 L400,120 L400,0 Z" fill="url(#ballPanel)" />
      </svg>
      <div className="hero-body">
        <div className="hero-label">YOUR RATING</div>
        <div className="hero-rating">{displayRating(rating)}</div>
      </div>
      <div className="hero-rank">{rank ? `Rank #${rank}` : "Unranked"}</div>
    </div>
  );
}

type LeaderboardEntry = {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  isMe: boolean;
};

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      {entries.length === 0 ? (
        <div className="empty" style={{ marginBottom: 12 }}>
          No players yet. Create a session.
        </div>
      ) : null}
      {entries.map((entry, index) => (
        <div className="lb-row" key={entry.id}>
          <div className="lb-rank">{index + 1}</div>
          <Avatar name={entry.name} size={28} tone="forest" />
          <div style={{ minWidth: 0 }}>
            <div className="lb-name">{entry.isMe ? "You" : entry.name}</div>
            <div className="lb-wl">
              <span className="w">{entry.wins}W</span>
              <span className="sep"> · </span>
              <span className="l">{entry.losses}L</span>
            </div>
          </div>
          <div className="lb-rating">{displayRating(entry.rating)}</div>
        </div>
      ))}
    </div>
  );
}

function CalloutCard({
  title,
  record,
  name,
  tone,
}: {
  title: string;
  record: PairRecord | null;
  name: string | null;
  tone: "positive" | "negative";
}) {
  return (
    <div className={`callout ${tone}`}>
      <div className="callout-title">{title}</div>
      {record && name ? (
        <div className="callout-body">
          <Avatar name={name} size={36} tone="forest" />
          <div style={{ minWidth: 0 }}>
            <div className="callout-name">{name.split(" ")[0]}</div>
            <div className="callout-stats">
              {record.winRate}% · {record.wins}–{record.losses}
            </div>
          </div>
        </div>
      ) : (
        <div className="callout-empty">Not enough games yet.</div>
      )}
    </div>
  );
}

function SessionRow({
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

function DeltaPill({ value }: { value: number }) {
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
