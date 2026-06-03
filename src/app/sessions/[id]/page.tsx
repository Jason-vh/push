import { notFound, redirect } from "next/navigation";
import { LogMatchButton } from "@/components/LogMatchButton";
import { MatchCard } from "@/components/MatchCard";
import { SessionAttendeesForm } from "@/components/SessionAttendeesForm";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [session, knownUsers] = await Promise.all([
    prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          include: { user: true },
          orderBy: { user: { name: "asc" } },
        },
        matches: {
          orderBy: { orderIndex: "desc" },
          include: {
            teamAPlayer1: { select: { id: true, name: true } },
            teamAPlayer2: { select: { id: true, name: true } },
            teamBPlayer1: { select: { id: true, name: true } },
            teamBPlayer2: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!session) notFound();

  const attendees = session.players.map((sessionPlayer) => ({
    id: sessionPlayer.user.id,
    name: sessionPlayer.user.name,
  }));

  return (
    <main className="shell">
      <header className="session-header">
        <h1 className="session-title">{formatDate(session.playedAt)}</h1>
        {session.venue ? (
          <div className="session-subtitle">
            <span>{session.venue}</span>
          </div>
        ) : null}
      </header>

      <SessionAttendeesForm
        sessionId={session.id}
        knownUsers={knownUsers}
        initialAttendees={attendees.map((attendee) => attendee.id)}
        matchCount={session.matches.length}
      />

      <section className="timeline">
        <div className="timeline-spine" aria-hidden />

        <div className="timeline-row first">
          <LogMatchButton sessionId={session.id} attendees={attendees} />
        </div>

        {session.matches.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>
            No matches yet. Tap “Log a match” to add the first one.
          </div>
        ) : (
          session.matches.map((match) => (
            <MatchCard
              key={match.id}
              sessionId={session.id}
              attendees={attendees}
              match={match}
            />
          ))
        )}
      </section>
    </main>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}
