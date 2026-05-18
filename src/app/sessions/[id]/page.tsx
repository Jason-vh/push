import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { AvatarMenu } from "@/components/AvatarMenu";
import { LogMatchButton } from "@/components/LogMatchButton";
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

  const headerInitial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="shell">
      <header className="session-header">
        <div className="session-header-content">
          <Link className="brand-link" href="/" aria-label="Dashboard">
            <div className="brand-blob">P</div>
          </Link>
          <div>
            <h1 className="session-title">{formatDate(session.playedAt)}</h1>
            {(session.venue || session.courtNumber) ? (
              <div className="session-subtitle">
                {session.courtNumber ? <span>Court {session.courtNumber}</span> : null}
                {session.courtNumber && session.venue ? (
                  <span className="dotsep">·</span>
                ) : null}
                {session.venue ? <span>{session.venue}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
        <AvatarMenu initial={headerInitial} />
      </header>

      <SessionAttendeesForm
        sessionId={session.id}
        knownUsers={knownUsers}
        initialAttendees={attendees.map((attendee) => attendee.id)}
        matchCount={session.matches.length}
      />

      <section className="timeline">
        {session.matches.length > 0 ? (
          <div className="timeline-spine" aria-hidden />
        ) : null}

        <div className="timeline-row first">
          <LogMatchButton sessionId={session.id} attendees={attendees} />
        </div>

        {session.matches.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>
            No matches yet. Tap “Log a match” to add the first one.
          </div>
        ) : (
          session.matches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))
        )}
      </section>
    </main>
  );
}

type MatchWithPlayers = {
  id: string;
  winnerTeam: "A" | "B";
  teamAPlayer1: { id: string; name: string };
  teamAPlayer2: { id: string; name: string };
  teamBPlayer1: { id: string; name: string };
  teamBPlayer2: { id: string; name: string };
};

function MatchRow({ match }: { match: MatchWithPlayers }) {
  const aWon = match.winnerTeam === "A";
  return (
    <div className="timeline-row">
      <div className="match-card">
        <TeamColumn
          players={[match.teamAPlayer1, match.teamAPlayer2]}
          won={aWon}
          align="left"
        />
        <div className="match-vs">
          <span className="vs">VS</span>
        </div>
        <TeamColumn
          players={[match.teamBPlayer1, match.teamBPlayer2]}
          won={!aWon}
          align="right"
        />
      </div>
    </div>
  );
}

function TeamColumn({
  players,
  won,
  align,
}: {
  players: Array<{ id: string; name: string }>;
  won: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={`team-col ${align}${won ? "" : " lost"}`}>
      {players.map((player) => (
        <div className="team-player" key={player.id}>
          <Avatar name={player.name} size={20} tone={won ? "forest" : "mint"} />
          <span className="name">{player.name.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}
