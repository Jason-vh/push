import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { CalloutRow } from "@/components/CalloutRow";
import { SessionRow } from "@/components/SessionRow";
import { loadActivePlayerIds } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { displayRating } from "@/lib/elo";
import {
  bestTeammate,
  computeRatings,
  getCachedOrderedMatches,
  rankPlayers,
  statsFor,
  summarizeSession,
  toughestOpponent,
  type SessionSummary,
  type Winner,
} from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [users, recentSessions, orderedMatches, activePlayerIds] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
    }),
    prisma.gameSession.findMany({
      where: { deletedAt: null },
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
    getCachedOrderedMatches(),
    loadActivePlayerIds(),
  ]);

  const { stats, byMatch } = computeRatings(orderedMatches);
  const usersById = new Map(users.map((u) => [u.id, u]));

  // Lapsed players drop off the board; you always stay on your own.
  const ranked = users.filter((u) => activePlayerIds.has(u.id) || u.id === user.id);
  const leaderboard = rankPlayers(ranked, stats).map((entry) => ({
    ...entry,
    isMe: entry.id === user.id,
  }));

  const currentStats = statsFor(stats, user.id);
  const currentRank = leaderboard.find((entry) => entry.isMe)?.rank ?? null;

  const teammate = bestTeammate(orderedMatches, user.id, activePlayerIds);
  const opponent = toughestOpponent(orderedMatches, user.id, activePlayerIds);

  const sessionSummaries = new Map<string, SessionSummary>(
    recentSessions.map((session) => [
      session.id,
      summarizeSession(
        session.matches.map((match) => ({ ...match, winnerTeam: match.winnerTeam as Winner })),
        byMatch,
        user.id,
      ),
    ]),
  );

  return (
    <main className="shell">
      <RatingHero rating={currentStats.rating} rank={currentRank} />

      <Leaderboard entries={leaderboard} />

      {teammate || opponent ? (
        <div className="callout-card" style={{ marginTop: 14 }}>
          {teammate ? (
            <CalloutRow
              title="Best teammate"
              record={teammate}
              name={usersById.get(teammate.otherUserId)?.name ?? null}
              tone="positive"
              href={`/players/${teammate.otherUserId}`}
            />
          ) : null}
          {teammate && opponent ? <div className="callout-sep" /> : null}
          {opponent ? (
            <CalloutRow
              title="Toughest opponent"
              record={opponent}
              name={usersById.get(opponent.otherUserId)?.name ?? null}
              tone="negative"
              href={`/players/${opponent.otherUserId}`}
            />
          ) : null}
        </div>
      ) : null}

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
            {recentSessions.map((session) => {
              const summary = sessionSummaries.get(session.id);
              return (
                <SessionRow
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  playedAt={session.playedAt}
                  venue={session.venue}
                  results={summary ?? { won: 0, lost: 0, total: 0 }}
                  delta={summary?.delta ?? 0}
                />
              );
            })}
          </div>
        )}
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
  rank: number;
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
        <Link className="lb-row" key={entry.id} href={`/players/${entry.id}`}>
          <div className="lb-rank">
            {index > 0 && entries[index - 1].rank === entry.rank ? "" : entry.rank}
          </div>
          <Avatar name={entry.name} size={28} />
          <div style={{ minWidth: 0 }}>
            <div className="lb-name">{entry.isMe ? "You" : entry.name}</div>
            <div className="lb-wl">
              <span className="w">{entry.wins}W</span>
              <span className="sep"> · </span>
              <span className="l">{entry.losses}L</span>
            </div>
          </div>
          <div className="lb-rating">{displayRating(entry.rating)}</div>
        </Link>
      ))}
    </div>
  );
}
