import { notFound, redirect } from "next/navigation";
import { AddMatchForm } from "@/components/AddMatchForm";
import { AppHeader } from "@/components/AppHeader";
import { SessionAttendeesForm } from "@/components/SessionAttendeesForm";
import { displayDelta } from "@/lib/elo";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [session, knownPlayers] = await Promise.all([
    prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          include: { player: true },
          orderBy: { player: { email: "asc" } },
        },
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
    prisma.player.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);

  if (!session) notFound();

  const attendees = session.players.map((sessionPlayer) => ({
    id: sessionPlayer.player.id,
    email: sessionPlayer.player.email,
    name: sessionPlayer.player.name,
  }));

  return (
    <main className="shell">
      <AppHeader userName={user.player?.name ?? user.name} userEmail={user.email} />

      <section className="page-heading compact-heading">
        <h1>
          {[
            formatDate(session.playedAt),
            session.venue,
            session.courtNumber ? `Court ${session.courtNumber}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </h1>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <SessionAttendeesForm
            sessionId={session.id}
            knownPlayers={knownPlayers.map((player) => ({
              email: player.email,
              name: player.name,
            }))}
            initialAttendees={attendees.map((attendee) => attendee.email)}
          />
          <MatchHistory matches={session.matches} />
        </div>
        <AddMatchForm sessionId={session.id} attendees={attendees} />
      </section>
    </main>
  );
}

type MatchWithPlayers = Awaited<ReturnType<typeof prisma.match.findMany>>[number] & {
  teamAPlayer1: { name: string | null; email: string };
  teamAPlayer2: { name: string | null; email: string };
  teamBPlayer1: { name: string | null; email: string };
  teamBPlayer2: { name: string | null; email: string };
  ratingChanges: Array<{ delta: number; player: { email: string; name: string | null } }>;
};

function MatchHistory({ matches }: { matches: MatchWithPlayers[] }) {
  return (
    <div className="card stack">
      <h2>Matches</h2>
      {matches.length === 0 ? <div className="empty">No matches logged yet.</div> : null}
      {matches.map((match) => {
        const teamA = `${label(match.teamAPlayer1)} / ${label(match.teamAPlayer2)}`;
        const teamB = `${label(match.teamBPlayer1)} / ${label(match.teamBPlayer2)}`;
        const winner = match.winnerTeam === "A" ? teamA : teamB;
        const loser = match.winnerTeam === "A" ? teamB : teamA;
        const avgDelta =
          match.ratingChanges.reduce((sum, change) => sum + Math.abs(change.delta), 0) /
          Math.max(match.ratingChanges.length, 1);

        return (
          <div className="match" key={match.id}>
            <div className="row">
              <strong>
                {match.orderIndex}. {winner} beat {loser}
              </strong>
              <span className="score">
                {match.scoreText || "—"} · ±{displayDelta(avgDelta).replace("+", "")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function label(player: { name: string | null; email: string }) {
  return player.name ?? player.email.split("@")[0];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(
    date,
  );
}
