"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attendee = {
  id: string;
  name: string;
};

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
  const [winnerTeam, setWinnerTeam] = useState<"A" | "B">("A");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
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
      setWinnerTeam("A");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save match");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <div>
          <span className="pill">Next match</span>
          <h2 style={{ marginTop: 14 }}>Log match</h2>
        </div>
        <button className="btn dark" onClick={submit} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save match"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="match-form-grid">
        <PlayerSelect
          label="Team A · Player 1"
          value={teamAPlayer1Id}
          attendees={attendees}
          onChange={setTeamAPlayer1Id}
        />
        <PlayerSelect
          label="Team A · Player 2"
          value={teamAPlayer2Id}
          attendees={attendees}
          onChange={setTeamAPlayer2Id}
        />
        <PlayerSelect
          label="Team B · Player 1"
          value={teamBPlayer1Id}
          attendees={attendees}
          onChange={setTeamBPlayer1Id}
        />
        <PlayerSelect
          label="Team B · Player 2"
          value={teamBPlayer2Id}
          attendees={attendees}
          onChange={setTeamBPlayer2Id}
        />
      </div>

      <label className="label">
        Winner
        <select
          className="select"
          value={winnerTeam}
          onChange={(event) => setWinnerTeam(event.target.value as "A" | "B")}
        >
          <option value="A">Team A</option>
          <option value="B">Team B</option>
        </select>
      </label>
    </div>
  );
}

function PlayerSelect({
  label,
  value,
  attendees,
  onChange,
}: {
  label: string;
  value: string;
  attendees: Attendee[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="label">
      {label}
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select player</option>
        {attendees.map((attendee) => (
          <option value={attendee.id} key={attendee.id}>
            {attendee.name}
          </option>
        ))}
      </select>
    </label>
  );
}
