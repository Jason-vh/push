import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AuthPanel } from "@/components/AuthPanel";
import { prisma } from "@/lib/db";
import { displayDelta, displayRating } from "@/lib/elo";
import { computeRatings, loadAllMatchesOrdered, statsFor } from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <Landing />;
  }

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
          orderBy: { orderIndex: "asc" },
          include: {
            teamAPlayer1: { select: { name: true } },
            teamAPlayer2: { select: { name: true } },
            teamBPlayer1: { select: { name: true } },
            teamBPlayer2: { select: { name: true } },
          },
        },
      },
    }),
    loadAllMatchesOrdered(prisma),
  ]);

  const { stats, byMatch } = computeRatings(orderedMatches);

  const leaderboard = users
    .map((u) => {
      const s = statsFor(stats, u.id);
      return { id: u.id, name: u.name, rating: s.rating, wins: s.wins, losses: s.losses };
    })
    .sort((a, b) => b.rating - a.rating);

  const currentStats = statsFor(stats, user.id);
  const currentRank = leaderboard.findIndex((entry) => entry.id === user.id) + 1 || null;

  return (
    <main className="shell">
      <AppHeader userName={user.name} />

      <section className="dashboard-grid">
        <div className="stack">
          <div className="card hero-card">
            <div className="row">
              <div>
                <div className="eyebrow" style={{ color: "rgba(255,255,255,.78)" }}>
                  Your rating
                </div>
                <div className="big-number">{displayRating(currentStats.rating)}</div>
              </div>
              <span className="pill">Rank {currentRank ? `#${currentRank}` : "—"}</span>
            </div>
          </div>

          <Leaderboard entries={leaderboard} />
        </div>

        <RecentSessions sessions={recentSessions} byMatch={byMatch} />
      </section>
    </main>
  );
}

function Landing() {
  return (
    <main className="auth-shell">
      <section className="auth-card-wrap">
        <div className="auth-brand">
          <div className="logo">P</div>
          <strong>Push Padel</strong>
        </div>
        <AuthPanel />
      </section>
    </main>
  );
}

type LeaderboardEntry = {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
};

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="card">
      <h2>Leaderboard</h2>
      {entries.length === 0 ? <div className="empty">No players yet. Create a session.</div> : null}
      {entries.map((entry, index) => (
        <div className="leaderboard-row" key={entry.id}>
          <span className="rank">{index + 1}</span>
          <div>
            <strong>{entry.name}</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              {entry.wins}W · {entry.losses}L
            </div>
          </div>
          <strong>{displayRating(entry.rating)}</strong>
        </div>
      ))}
    </div>
  );
}

type RecentSession = Awaited<ReturnType<typeof prisma.gameSession.findMany>>[number] & {
  matches: Array<{
    id: string;
    orderIndex: number;
    winnerTeam: "A" | "B";
    teamAPlayer1: { name: string };
    teamAPlayer2: { name: string };
    teamBPlayer1: { name: string };
    teamBPlayer2: { name: string };
  }>;
};

function RecentSessions({
  sessions,
  byMatch,
}: {
  sessions: RecentSession[];
  byMatch: ReturnType<typeof computeRatings>["byMatch"];
}) {
  return (
    <div className="card stack">
      <div className="row">
        <h2>Recent sessions</h2>
        <Link className="btn secondary" href="/sessions/new">
          + New session
        </Link>
      </div>
      {sessions.length === 0 ? <div className="empty">No sessions logged yet.</div> : null}
      {sessions.map((session) => (
        <Link className="match match-link" href={`/sessions/${session.id}`} key={session.id}>
          <div className="row">
            <strong>
              {formatDate(session.playedAt)}
              {session.venue ? ` · ${session.venue}` : ""}
            </strong>
            <span className="pill">{session.matches.length} matches</span>
          </div>
          <div className="match-result" style={{ marginTop: 12 }}>
            {session.matches.length === 0 ? (
              <span className="muted">No matches logged yet.</span>
            ) : null}
            {session.matches.map((match) => {
              const teamA = `${match.teamAPlayer1.name} / ${match.teamAPlayer2.name}`;
              const teamB = `${match.teamBPlayer1.name} / ${match.teamBPlayer2.name}`;
              const winner = match.winnerTeam === "A" ? teamA : teamB;
              const loser = match.winnerTeam === "A" ? teamB : teamA;
              const changes = byMatch.get(match.id) ?? [];
              const avgDelta =
                changes.reduce((sum, change) => sum + Math.abs(change.delta), 0) /
                Math.max(changes.length, 1);
              return (
                <div className="row" key={match.id}>
                  <span>
                    {match.orderIndex}. <strong>{winner}</strong> beat {loser}
                  </span>
                  <span className="score">±{displayDelta(avgDelta).replace("+", "")}</span>
                </div>
              );
            })}
          </div>
        </Link>
      ))}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    date,
  );
}
