import { notFound, redirect } from "next/navigation";
import { SessionBody } from "@/components/SessionBody";
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

  const initialAttendees = session.players.map((sessionPlayer) => sessionPlayer.user.id);

  const lockedUserIds = new Set<string>();
  for (const match of session.matches) {
    lockedUserIds.add(match.teamAPlayer1Id);
    lockedUserIds.add(match.teamAPlayer2Id);
    lockedUserIds.add(match.teamBPlayer1Id);
    lockedUserIds.add(match.teamBPlayer2Id);
  }

  const matches = session.matches.map((match) => ({
    id: match.id,
    winnerTeam: match.winnerTeam as "A" | "B",
    teamAPlayer1: match.teamAPlayer1,
    teamAPlayer2: match.teamAPlayer2,
    teamBPlayer1: match.teamBPlayer1,
    teamBPlayer2: match.teamBPlayer2,
  }));

  const playedAtIso = session.playedAt.toISOString().slice(0, 10);

  return (
    <main className="shell">
      <SessionHeader
        sessionId={session.id}
        initialPlayedAt={playedAtIso}
        initialVenue={session.venue}
      />
      <SessionBody
        sessionId={session.id}
        knownUsers={knownUsers}
        initialAttendees={initialAttendees}
        matches={matches}
        lockedUserIds={Array.from(lockedUserIds)}
      />
    </main>
  );
}
