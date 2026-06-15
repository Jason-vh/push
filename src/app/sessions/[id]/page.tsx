import { notFound, redirect } from "next/navigation";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { LogMatchButton } from "@/components/LogMatchButton";
import { MatchCard } from "@/components/MatchCard";
import { SessionAttendeesForm } from "@/components/SessionAttendeesForm";
import { SessionHeader } from "@/components/SessionHeader";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [session, knownUsers] = await Promise.all([
    prisma.gameSession.findFirst({
      where: { id, deletedAt: null },
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

  const lockedUserIds = new Set<string>();
  for (const match of session.matches) {
    lockedUserIds.add(match.teamAPlayer1Id);
    lockedUserIds.add(match.teamAPlayer2Id);
    lockedUserIds.add(match.teamBPlayer1Id);
    lockedUserIds.add(match.teamBPlayer2Id);
  }

  const playedAtIso = session.playedAt.toISOString().slice(0, 10);
  const readyToLog = attendees.length >= 4;
  const hasMatches = session.matches.length > 0;

  return (
    <main className="shell">
      <SessionHeader
        sessionId={session.id}
        initialPlayedAt={playedAtIso}
        initialVenue={session.venue}
      />

      <SessionAttendeesForm
        sessionId={session.id}
        knownUsers={knownUsers}
        initialAttendees={attendees.map((attendee) => attendee.id)}
        matchCount={session.matches.length}
        lockedUserIds={Array.from(lockedUserIds)}
      />

      {readyToLog || hasMatches ? (
        <section className="timeline">
          <div className="timeline-spine" aria-hidden />

          <div className="timeline-row first">
            <LogMatchButton sessionId={session.id} attendees={attendees} />
          </div>

          {session.matches.length === 0 ? (
            <div className="empty">
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
      ) : null}

      {!hasMatches ? <DeleteSessionButton sessionId={session.id} /> : null}
    </main>
  );
}
