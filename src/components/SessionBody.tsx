"use client";

import { useState } from "react";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { LogMatchButton } from "@/components/LogMatchButton";
import { MatchCard, type MatchCardData } from "@/components/MatchCard";
import { SessionAttendeesForm } from "@/components/SessionAttendeesForm";

type KnownUser = { id: string; name: string };

const REQUIRED_PLAYERS = 4;

export function SessionBody({
  sessionId,
  knownUsers,
  initialAttendees,
  matches,
  lockedUserIds,
}: {
  sessionId: string;
  knownUsers: KnownUser[];
  initialAttendees: string[];
  matches: MatchCardData[];
  lockedUserIds: string[];
}) {
  const [livePlayers, setLivePlayers] = useState(initialAttendees);
  const userById = new Map(knownUsers.map((u) => [u.id, u]));
  const liveAttendees = livePlayers
    .map((id) => userById.get(id))
    .filter((u): u is KnownUser => Boolean(u));

  const hasMatches = matches.length > 0;
  const readyToLog = liveAttendees.length >= REQUIRED_PLAYERS;

  return (
    <>
      <SessionAttendeesForm
        sessionId={sessionId}
        knownUsers={knownUsers}
        initialAttendees={initialAttendees}
        matchCount={matches.length}
        lockedUserIds={lockedUserIds}
        onPlayersChange={setLivePlayers}
      />

      {readyToLog || hasMatches ? (
        <section className="timeline">
          <div className="timeline-spine" aria-hidden />

          <div className="timeline-row first">
            <LogMatchButton sessionId={sessionId} attendees={liveAttendees} />
          </div>

          {matches.length === 0 ? (
            <div className="empty">
              No matches yet. Tap “Log a match” to add the first one.
            </div>
          ) : (
            matches.map((match) => (
              <MatchCard
                key={match.id}
                sessionId={sessionId}
                attendees={liveAttendees}
                match={match}
              />
            ))
          )}
        </section>
      ) : null}

      {!hasMatches ? <DeleteSessionButton sessionId={sessionId} /> : null}
    </>
  );
}
