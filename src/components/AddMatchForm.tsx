"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attendee = {
  id: string;
  name: string;
};

type Team = "A" | "B";

export function AddMatchForm({
  sessionId,
  attendees,
}: {
  sessionId: string;
  attendees: Attendee[];
}) {
  const router = useRouter();
  const [teamAPlayer1Id, setTeamAPlayer1Id] = useState("");
  const [teamAPlayer2Id, setTeamAPlayer2Id] = useState("");
  const [teamBPlayer1Id, setTeamBPlayer1Id] = useState("");
  const [teamBPlayer2Id, setTeamBPlayer2Id] = useState("");
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const allFilled =
    Boolean(teamAPlayer1Id) &&
    Boolean(teamAPlayer2Id) &&
    Boolean(teamBPlayer1Id) &&
    Boolean(teamBPlayer2Id);

  async function submit() {
    if (!winnerTeam) {
      setError("Tap a team to mark the winner.");
      return;
    }

    setError(null);
    setStatus("saving");

    try {
      const response = await fetch(`/api/sessions/${sessionId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAPlayer1Id,
          teamAPlayer2Id,
          teamBPlayer1Id,
          teamBPlayer2Id,
          winnerTeam,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save match");
      setTeamAPlayer1Id("");
      setTeamAPlayer2Id("");
      setTeamBPlayer1Id("");
      setTeamBPlayer2Id("");
      setWinnerTeam(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save match");
    } finally {
      setStatus("idle");
    }
  }

  const pickedIds = [teamAPlayer1Id, teamAPlayer2Id, teamBPlayer1Id, teamBPlayer2Id];
  function availableFor(currentValue: string) {
    return attendees.filter(
      (attendee) => attendee.id === currentValue || !pickedIds.includes(attendee.id),
    );
  }

  return (
    <div className="card stack">
      <span className="pill">Next match</span>
      <h2 style={{ marginTop: 0 }}>Log match</h2>

      {error ? <div className="error">{error}</div> : null}

      <div className="teams-row">
        <TeamCard
          team="A"
          isWinner={winnerTeam === "A"}
          onSelectWinner={() => setWinnerTeam("A")}
        >
          <PlayerSelect
            label="Player 1"
            value={teamAPlayer1Id}
            onChange={setTeamAPlayer1Id}
            options={availableFor(teamAPlayer1Id)}
          />
          <PlayerSelect
            label="Player 2"
            value={teamAPlayer2Id}
            onChange={setTeamAPlayer2Id}
            options={availableFor(teamAPlayer2Id)}
          />
        </TeamCard>

        <TeamCard
          team="B"
          isWinner={winnerTeam === "B"}
          onSelectWinner={() => setWinnerTeam("B")}
        >
          <PlayerSelect
            label="Player 1"
            value={teamBPlayer1Id}
            onChange={setTeamBPlayer1Id}
            options={availableFor(teamBPlayer1Id)}
          />
          <PlayerSelect
            label="Player 2"
            value={teamBPlayer2Id}
            onChange={setTeamBPlayer2Id}
            options={availableFor(teamBPlayer2Id)}
          />
        </TeamCard>
      </div>

      <button
        className="btn dark full"
        onClick={submit}
        disabled={status === "saving" || !allFilled || !winnerTeam}
      >
        {status === "saving" ? "Saving…" : "Save match"}
      </button>
    </div>
  );
}

function TeamCard({
  team,
  isWinner,
  onSelectWinner,
  children,
}: {
  team: Team;
  isWinner: boolean;
  onSelectWinner: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`team-card${isWinner ? " winner" : ""}`}>
      <h3>Team {team}</h3>
      {children}
      <button type="button" className="winner-toggle" onClick={onSelectWinner}>
        <span className="winner-dot" aria-hidden="true" />
        {isWinner ? "Won" : "Mark as winner"}
      </button>
    </div>
  );
}

function PlayerSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Attendee[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="label">
      {label}
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select player</option>
        {options.map((option) => (
          <option value={option.id} key={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
