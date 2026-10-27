"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { LogMatchSheet } from "@/components/LogMatchSheet";
import { displayDelta } from "@/lib/elo";

type Attendee = { id: string; name: string };
type Player = { id: string; name: string };

export type MatchCardData = {
  id: string;
  winnerTeam: "A" | "B";
  teamAScore: number | null;
  teamBScore: number | null;
  teamAPlayer1: Player;
  teamAPlayer2: Player;
  teamBPlayer1: Player;
  teamBPlayer2: Player;
};

/** What the match did to the viewer's rating; null when they aren't in the session. */
export type ViewerResult = { played: true; delta: number } | { played: false } | null;

export function MatchCard({
  sessionId,
  attendees,
  match,
  gameNumber,
  userId,
  viewerResult,
}: {
  sessionId: string;
  attendees: Attendee[];
  match: MatchCardData;
  gameNumber: number;
  userId: string;
  viewerResult: ViewerResult;
}) {
  const [open, setOpen] = useState(false);
  const aWon = match.winnerTeam === "A";
  const hasScore = match.teamAScore != null && match.teamBScore != null;
  return (
    <>
      <button
        type="button"
        className="match-card"
        onClick={() => setOpen(true)}
        aria-label={`Edit game ${gameNumber}`}
      >
        <div className="match-card-top">
          <span className="match-number">Game {gameNumber}</span>
          <ViewerDelta result={viewerResult} />
        </div>
        <div className="match-card-body">
          <TeamColumn
            players={[match.teamAPlayer1, match.teamAPlayer2]}
            won={aWon}
            align="left"
            userId={userId}
          />
          <div className="match-vs">
            {hasScore ? (
              <span className="match-score">
                {match.teamAScore}–{match.teamBScore}
              </span>
            ) : (
              <span className="vs">VS</span>
            )}
          </div>
          <TeamColumn
            players={[match.teamBPlayer1, match.teamBPlayer2]}
            won={!aWon}
            align="right"
            userId={userId}
          />
        </div>
      </button>
      <LogMatchSheet
        sessionId={sessionId}
        attendees={attendees}
        open={open}
        onClose={() => setOpen(false)}
        match={{
          id: match.id,
          teamAPlayer1Id: match.teamAPlayer1.id,
          teamAPlayer2Id: match.teamAPlayer2.id,
          teamBPlayer1Id: match.teamBPlayer1.id,
          teamBPlayer2Id: match.teamBPlayer2.id,
          teamAScore: match.teamAScore,
          teamBScore: match.teamBScore,
        }}
      />
    </>
  );
}

function ViewerDelta({ result }: { result: ViewerResult }) {
  if (!result) return null;
  if (!result.played) return <span className="match-viewer">Sat out</span>;
  const direction = result.delta >= 0 ? "up" : "down";
  return <span className={`match-viewer ${direction}`}>You {displayDelta(result.delta)}</span>;
}

function TeamColumn({
  players,
  won,
  align,
  userId,
}: {
  players: Player[];
  won: boolean;
  align: "left" | "right";
  userId: string;
}) {
  return (
    <div className={`team-col ${align}${won ? "" : " lost"}`}>
      {players.map((player) => (
        <div className="team-player" key={player.id}>
          <Avatar name={player.name} size={20} />
          <span className="name">{player.id === userId ? "You" : player.name.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}
