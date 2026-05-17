import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AuthPanel } from "@/components/AuthPanel";
import { prisma } from "@/lib/db";
import { displayDelta, displayRating } from "@/lib/elo";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <Landing />;
  }

  const [users, recentSessions] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: { rating: "desc" },
      include: { ratingChanges: { select: { delta: true } } },
    }),
    prisma.gameSession.findMany({
      take: 5,
      orderBy: { playedAt: "desc" },
      include: {
        matches: {
          orderBy: { orderIndex: "asc" },
          include: {
            teamAPlayer1: true,
            teamAPlayer2: true,
            teamBPlayer1: true,
            teamBPlayer2: true,
            ratingChanges: { include: { user: true } },
          },
        },
      },
    }),
  ]);

  const currentRank = users.findIndex((u) => u.id === user.id) + 1 || null;

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
                <div className="big-number">{displayRating(user.rating)}</div>
              </div>
              <span className="pill">Rank {currentRank ? `#${currentRank}` : "—"}</span>
            </div>
            <div className="chart" aria-hidden="true">
              <span style={{ height: "36%" }} />
              <span style={{ height: "46%" }} />
              <span style={{ height: "58%" }} />
              <span style={{ height: "52%" }} />
              <span style={{ height: "73%" }} />
              <span style={{ height: "68%" }} />
            </div>
          </div>

          <Leaderboard users={users} />
        </div>

        <RecentSessions sessions={recentSessions} />
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

type UserWithStats = Awaited<ReturnType<typeof prisma.user.findMany>>[number] & {
  ratingChanges: { delta: number }[];
};

function Leaderboard({ users }: { users: UserWithStats[] }) {
  return (
    <div className="card">
      <div className="row">
        <h2>Leaderboard</h2>
        <span className="pill">Lifetime ELO</span>
      </div>
      {users.length === 0 ? <div className="empty">No players yet. Create a session.</div> : null}
      {users.map((user, index) => {
        const wins = user.ratingChanges.filter((change) => change.delta > 0).length;
        const losses = user.ratingChanges.filter((change) => change.delta < 0).length;
        return (
          <div className="leaderboard-row" key={user.id}>
            <span className="rank">{index + 1}</span>
            <div>
              <strong>{user.name}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {wins}W · {losses}L
              </div>
            </div>
            <strong>{displayRating(user.rating)}</strong>
          </div>
        );
      })}
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
    ratingChanges: Array<{ delta: number; user: { name: string } }>;
  }>;
};

function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
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
              const avgDelta =
                match.ratingChanges.reduce((sum, change) => sum + Math.abs(change.delta), 0) /
                Math.max(match.ratingChanges.length, 1);
              return (
                <div className="row" key={match.id}>
                  <span>
                    {match.orderIndex}. <strong>{winner}</strong> beat {loser}
                  </span>
                  <span className="score">
                    ±{displayDelta(avgDelta).replace("+", "")}
                  </span>
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
