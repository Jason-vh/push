"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { LogMatchSheet } from "@/components/LogMatchSheet";

type Attendee = { id: string; name: string };
type Player = { id: string; name: string };

export type MatchCardData = {
  id: string;
  winnerTeam: "A" | "B";
  teamAPlayer1: Player;
  teamAPlayer2: Player;
  teamBPlayer1: Player;
  teamBPlayer2: Player;
};

export function MatchCard({
  sessionId,
  attendees,
  match,
}: {
  sessionId: string;
  attendees: Attendee[];
  match: MatchCardData;
}) {
  const [open, setOpen] = useState(false);
  const aWon = match.winnerTeam === "A";
  return (
    <>
      <div className="timeline-row">
        <button
          type="button"
          className="match-card"
          onClick={() => setOpen(true)}
          aria-label="Edit match"
        >
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
        </button>
      </div>
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
          winnerTeam: match.winnerTeam,
        }}
      />
    </>
  );
}

function TeamColumn({
  players,
  won,
  align,
}: {
  players: Player[];
  won: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={`team-col ${align}${won ? "" : " lost"}`}>
      {players.map((player) => (
        <div className="team-player" key={player.id}>
          <Avatar name={player.name} size={20} />
          <span className="name">{player.name.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}
