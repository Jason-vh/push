import { AuthPanel } from "@/components/AuthPanel";
import { AddSessionForm } from "@/components/AddSessionForm";
import { LogoutButton } from "@/components/LogoutButton";
import { prisma } from "@/lib/db";
import { displayDelta, displayRating } from "@/lib/elo";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <Landing />;
  }

  const [players, recentSessions] = await Promise.all([
    prisma.player.findMany({
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
            ratingChanges: { include: { player: true } },
          },
        },
      },
    }),
  ]);

  const currentPlayer = user.player;
  const currentRank = currentPlayer
    ? players.findIndex((player) => player.id === currentPlayer.id) + 1
    : null;
  const knownPlayers = players.map((player) => ({ email: player.email, name: player.name }));

  return (
    <main className="shell">
      <Header signedInAs={user.email} />

      <section className="dashboard-grid">
        <div className="stack">
          <div className="card hero-card">
            <div className="row">
              <div>
                <div className="eyebrow" style={{ color: "rgba(255,255,255,.78)" }}>
                  Your rating
                </div>
                <div className="big-number">{displayRating(currentPlayer?.rating ?? 1000)}</div>
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

          <Leaderboard players={players} />
          <RecentSessions sessions={recentSessions} />
        </div>

        <AddSessionForm knownPlayers={knownPlayers} />
      </section>
    </main>
  );
}

function Landing() {
  return (
    <main className="shell">
      <Header />
      <section className="grid">
        <div className="stack" style={{ paddingTop: 36 }}>
          <span className="pill">Private friend-group padel tracker</span>
          <div>
            <h1>Track sessions, rotating teams, and lifetime ELO.</h1>
            <p className="lede">
              Log completed padel sessions after you play. Add people by email, record matches in
              order, and keep a friendly leaderboard for the group.
            </p>
          </div>
          <div className="card hero-card">
            <div className="row">
              <div>
                <div className="eyebrow" style={{ color: "rgba(255,255,255,.78)" }}>
                  Sequential doubles ELO
                </div>
                <div className="big-number">1048</div>
              </div>
              <span className="pill">+18 last session</span>
            </div>
            <div className="chart" aria-hidden="true">
              <span style={{ height: "38%" }} />
              <span style={{ height: "44%" }} />
              <span style={{ height: "58%" }} />
              <span style={{ height: "51%" }} />
              <span style={{ height: "76%" }} />
              <span style={{ height: "70%" }} />
            </div>
          </div>
        </div>
        <AuthPanel />
      </section>
    </main>
  );
}

function Header({ signedInAs }: { signedInAs?: string }) {
  return (
    <header className="header">
      <div className="brand">
        <div className="logo">P</div>
        <div>
          <div className="eyebrow">Push Padel</div>
          <strong>push.vhtm.eu</strong>
        </div>
      </div>
      {signedInAs ? (
        <div className="row wrap">
          <span className="pill">{signedInAs}</span>
          <LogoutButton />
        </div>
      ) : null}
    </header>
  );
}

type PlayerWithStats = Awaited<ReturnType<typeof prisma.player.findMany>>[number] & {
  ratingChanges: { delta: number }[];
};

function Leaderboard({ players }: { players: PlayerWithStats[] }) {
  return (
    <div className="card">
      <div className="row">
        <h2>Leaderboard</h2>
        <span className="pill">Lifetime ELO</span>
      </div>
      {players.length === 0 ? (
        <div className="empty">No players yet. Log the first session.</div>
      ) : null}
      {players.map((player, index) => {
        const wins = player.ratingChanges.filter((change) => change.delta > 0).length;
        const losses = player.ratingChanges.filter((change) => change.delta < 0).length;
        return (
          <div className="leaderboard-row" key={player.id}>
            <span className="rank">{index + 1}</span>
            <div>
              <strong>{player.name ?? player.email}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {wins}W · {losses}L · {player.email}
              </div>
            </div>
            <strong>{displayRating(player.rating)}</strong>
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
    scoreText: string | null;
    winnerTeam: "A" | "B";
    teamAPlayer1: { name: string | null; email: string };
    teamAPlayer2: { name: string | null; email: string };
    teamBPlayer1: { name: string | null; email: string };
    teamBPlayer2: { name: string | null; email: string };
    ratingChanges: Array<{ delta: number; player: { email: string } }>;
  }>;
};

function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  return (
    <div className="card stack">
      <div className="row">
        <h2>Recent sessions</h2>
        <span className="pill">Played order</span>
      </div>
      {sessions.length === 0 ? <div className="empty">No sessions logged yet.</div> : null}
      {sessions.map((session) => (
        <div className="match" key={session.id}>
          <div className="row">
            <strong>
              {formatDate(session.playedAt)}
              {session.venue ? ` · ${session.venue}` : ""}
            </strong>
            <span className="pill">{session.matches.length} matches</span>
          </div>
          <div className="match-result" style={{ marginTop: 12 }}>
            {session.matches.map((match) => {
              const teamA = `${label(match.teamAPlayer1)} / ${label(match.teamAPlayer2)}`;
              const teamB = `${label(match.teamBPlayer1)} / ${label(match.teamBPlayer2)}`;
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
                    {match.scoreText || "—"} · ±{displayDelta(avgDelta).replace("+", "")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function label(player: { name: string | null; email: string }) {
  return player.name ?? player.email.split("@")[0];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    date,
  );
}
