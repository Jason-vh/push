import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { ViewerResult } from "@/components/MatchCard";
import { SessionHeader } from "@/components/SessionHeader";
import { SessionMatches, type SessionMatchEntry } from "@/components/SessionMatches";
import { SessionRatings, SessionStandings, YourSession } from "@/components/SessionStats";
import { prisma } from "@/lib/db";
import { loadVenueSuggestions, todayKey } from "@/lib/keen";
import { dateFromKey, formatDate, keyFromDate } from "@/lib/keenDays";
import { computeRatings, getCachedOrderedMatches, type Winner } from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";
import {
  personalSession,
  ratingChange,
  sessionStandings,
  type SessionMatch,
} from "@/lib/sessionStats";

const playerSelect = { select: { id: true, name: true } } as const;

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [session, knownUsers, orderedMatches, venueSuggestions] = await Promise.all([
    prisma.gameSession.findFirst({
      where: { id, deletedAt: null },
      include: {
        players: { include: { user: playerSelect }, orderBy: { user: { name: "asc" } } },
        matches: {
          orderBy: { orderIndex: "asc" },
          include: {
            teamAPlayer1: playerSelect,
            teamAPlayer2: playerSelect,
            teamBPlayer1: playerSelect,
            teamBPlayer2: playerSelect,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getCachedOrderedMatches(),
    loadVenueSuggestions(),
  ]);

  if (!session) notFound();

  const { stats, byMatch } = computeRatings(orderedMatches);
  const attendees = session.players.map(({ user: player }) => player);
  const playersById = new Map(attendees.map((player) => [player.id, player]));
  for (const match of session.matches) {
    for (const player of [
      match.teamAPlayer1,
      match.teamAPlayer2,
      match.teamBPlayer1,
      match.teamBPlayer2,
    ]) {
      playersById.set(player.id, player);
    }
  }

  const sessionMatches: SessionMatch[] = session.matches.map((match) => ({
    id: match.id,
    winnerTeam: match.winnerTeam as Winner,
    teamAScore: match.teamAScore,
    teamBScore: match.teamBScore,
    teamAPlayerIds: [match.teamAPlayer1Id, match.teamAPlayer2Id],
    teamBPlayerIds: [match.teamBPlayer1Id, match.teamBPlayer2Id],
  }));
  const playedIds = new Set(
    sessionMatches.flatMap((match) => [...match.teamAPlayerIds, ...match.teamBPlayerIds]),
  );
  const isAttending = playersById.has(user.id);

  const entries: SessionMatchEntry[] = session.matches
    .map((match, index) => {
      let viewerResult: ViewerResult = null;
      if (isAttending) {
        const change = ratingChange(byMatch, match.id, user.id);
        viewerResult = change ? { played: true, delta: change.delta } : { played: false };
      }
      return {
        gameNumber: index + 1,
        viewerResult,
        match: {
          id: match.id,
          winnerTeam: match.winnerTeam as Winner,
          teamAScore: match.teamAScore,
          teamBScore: match.teamBScore,
          teamAPlayer1: match.teamAPlayer1,
          teamAPlayer2: match.teamAPlayer2,
          teamBPlayer1: match.teamBPlayer1,
          teamBPlayer2: match.teamBPlayer2,
        },
      };
    })
    .reverse();

  const date = keyFromDate(session.playedAt);
  const mine = personalSession(user.id, sessionMatches, byMatch);
  const hasMatches = sessionMatches.length > 0;
  const currentRatings = new Map(
    attendees.map((player) => [player.id, stats.get(player.id)?.rating ?? 0]),
  );

  return (
    <main className="shell">
      <SessionHeader
        session={{
          id: session.id,
          date,
          startTime: session.startTime,
          durationMinutes: session.durationMinutes,
          venue: session.venue,
          court: session.court,
          playerIds: attendees.map((player) => player.id),
          hasMatches,
        }}
        title={formatDate(date, { weekday: "short", day: "numeric", month: "short" })}
        whenLabel={whenLabel(date, todayKey())}
        knownUsers={knownUsers}
        lockedUserIds={[...playedIds]}
        venueSuggestions={venueSuggestions}
      />

      {hasMatches ? (
        <>
          {mine ? <YourSession stats={mine} /> : null}
          <SessionStandings
            rows={sessionStandings(
              attendees.map((player) => player.id),
              sessionMatches,
              byMatch,
            )}
            playersById={playersById}
            userId={user.id}
          />
        </>
      ) : (
        <>
          <div className="session-art">
            <Image src="/kit-strip.webp" alt="" width={720} height={180} priority />
          </div>
          {attendees.length > 0 ? (
            <SessionRatings players={attendees} ratings={currentRatings} userId={user.id} />
          ) : null}
        </>
      )}

      <SessionMatches
        sessionId={session.id}
        attendees={attendees}
        entries={entries}
        userId={user.id}
      />
    </main>
  );
}

function whenLabel(date: string, today: string) {
  const days = Math.round(
    (dateFromKey(date).getTime() - dateFromKey(today).getTime()) / 86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `In ${days} days`;
  return null;
}
