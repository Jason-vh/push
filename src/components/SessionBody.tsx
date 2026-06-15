"use client";

import { useEffect, useState } from "react";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { LogMatchButton } from "@/components/LogMatchButton";
import { MatchCard, type MatchCardData } from "@/components/MatchCard";
import { SessionAttendeesForm } from "@/components/SessionAttendeesForm";

type KnownUser = { id: string; name: string };

const REQUIRED_PLAYERS = 4;
const TIMELINE_LEAVE_MS = 220;

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
  const shouldShowTimeline = liveAttendees.length >= REQUIRED_PLAYERS || hasMatches;

  const [renderTimeline, setRenderTimeline] = useState(shouldShowTimeline);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (shouldShowTimeline) {
      setRenderTimeline(true);
      setIsLeaving(false);
      return;
    }
    if (!renderTimeline) return;
    setIsLeaving(true);
    const t = window.setTimeout(() => {
      setRenderTimeline(false);
      setIsLeaving(false);
    }, TIMELINE_LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [shouldShowTimeline, renderTimeline]);

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

      {renderTimeline ? (
        <section className={`timeline${isLeaving ? " is-leaving" : ""}`}>
          <div className="timeline-spine" aria-hidden />

          <div className="timeline-row first">
            <LogMatchButton sessionId={sessionId} attendees={liveAttendees} />
          </div>

          {matches.map((match) => (
            <MatchCard
              key={match.id}
              sessionId={sessionId}
              attendees={liveAttendees}
              match={match}
            />
          ))}
        </section>
      ) : null}

      {!hasMatches ? <DeleteSessionButton sessionId={sessionId} /> : null}
    </>
  );
}
