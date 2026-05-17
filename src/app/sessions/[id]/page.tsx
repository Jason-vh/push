import { notFound, redirect } from "next/navigation";
import { AddMatchForm } from "@/components/AddMatchForm";
import { AppHeader } from "@/components/AppHeader";
import { SessionAttendeesForm } from "@/components/SessionAttendeesForm";
import { displayDelta } from "@/lib/elo";
import { prisma } from "@/lib/db";
import { computeRatings, loadAllMatchesOrdered } from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [session, knownUsers, orderedMatches] = await Promise.all([
    prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          include: { user: true },
          orderBy: { user: { name: "asc" } },
        },
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
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    loadAllMatchesOrdered(prisma),
  ]);

  if (!session) notFound();

  const { byMatch } = computeRatings(orderedMatches);

  const attendees = session.players.map((sessionPlayer) => ({
    id: sessionPlayer.user.id,
    name: sessionPlayer.user.name,
  }));

  return (
    <main className="shell">
      <AppHeader userName={user.name} />

      <section className="page-heading compact-heading">
        <h1 className="session-title-line">
          <span>{formatDate(session.playedAt)}</span>
          {[session.venue, session.courtNumber ? `Court ${session.courtNumber}` : null].filter(
            Boolean,
          ).length > 0 ? (
            <span className="session-title-meta">
              {[session.venue, session.courtNumber ? `Court ${session.courtNumber}` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </h1>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          <SessionAttendeesForm
            sessionId={session.id}
            knownUsers={knownUsers}
            initialAttendees={attendees.map((attendee) => attendee.id)}
          />
          <MatchHistory matches={session.matches} byMatch={byMatch} />
        </div>
        <AddMatchForm sessionId={session.id} attendees={attendees} />
      </section>
    </main>
  );
}

type MatchWithPlayers = {
  id: string;
  orderIndex: number;
  winnerTeam: "A" | "B";
  teamAPlayer1: { name: string };
  teamAPlayer2: { name: string };
  teamBPlayer1: { name: string };
  teamBPlayer2: { name: string };
};

function MatchHistory({
  matches,
  byMatch,
}: {
  matches: MatchWithPlayers[];
  byMatch: ReturnType<typeof computeRatings>["byMatch"];
}) {
  return (
    <div className="card stack">
      <h2>Matches</h2>
      {matches.length === 0 ? <div className="empty">No matches logged yet.</div> : null}
      {matches.map((match) => {
        const teamA = `${match.teamAPlayer1.name} / ${match.teamAPlayer2.name}`;
        const teamB = `${match.teamBPlayer1.name} / ${match.teamBPlayer2.name}`;
        const winner = match.winnerTeam === "A" ? teamA : teamB;
        const loser = match.winnerTeam === "A" ? teamB : teamA;
        const changes = byMatch.get(match.id) ?? [];
        const avgDelta =
          changes.reduce((sum, change) => sum + Math.abs(change.delta), 0) /
          Math.max(changes.length, 1);

        return (
          <div className="match" key={match.id}>
            <div className="row">
              <strong>
                {match.orderIndex}. {winner} beat {loser}
              </strong>
              <span className="score">±{displayDelta(avgDelta).replace("+", "")}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(
    date,
  );
}
