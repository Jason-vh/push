"use client";

import { useMemo, useState } from "react";
import { parseEmailList } from "@/lib/email";

type KnownPlayer = { email: string; name: string | null };
type MatchDraft = {
  teamA1: string;
  teamA2: string;
  teamB1: string;
  teamB2: string;
  winnerTeam: "A" | "B";
  scoreText: string;
};

const emptyMatch = (): MatchDraft => ({
  teamA1: "",
  teamA2: "",
  teamB1: "",
  teamB2: "",
  winnerTeam: "A",
  scoreText: "",
});

export function AddSessionForm({ knownPlayers }: { knownPlayers: KnownPlayer[] }) {
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("");
  const [courtNumber, setCourtNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState(
    knownPlayers
      .slice(0, 4)
      .map((player) => player.email)
      .join("\n"),
  );
  const [matches, setMatches] = useState<MatchDraft[]>([emptyMatch()]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const attendeeEmails = useMemo(() => parseEmailList(attendees), [attendees]);

  function updateMatch(index: number, patch: Partial<MatchDraft>) {
    setMatches((current) =>
      current.map((match, matchIndex) => (matchIndex === index ? { ...match, ...patch } : match)),
    );
  }

  async function submit() {
    setError(null);
    setStatus("saving");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playedAt,
          venue,
          courtNumber,
          notes,
          attendeeEmails,
          matches: matches.map((match) => ({
            teamA: [match.teamA1, match.teamA2],
            teamB: [match.teamB1, match.teamB2],
            winnerTeam: match.winnerTeam,
            scoreText: match.scoreText,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save session");
      setStatus("saved");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save session");
      setStatus("idle");
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <div>
          <span className="pill">Sequential ELO</span>
          <h2 style={{ marginTop: 14 }}>Log completed session</h2>
        </div>
        <button className="btn dark" onClick={submit} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save session"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {status === "saved" ? <div className="success">Session saved.</div> : null}

      <div className="form-grid">
        <label className="label">
          Date played
          <input
            className="input"
            type="date"
            value={playedAt}
            onChange={(event) => setPlayedAt(event.target.value)}
          />
        </label>
        <label className="label">
          Venue
          <input
            className="input"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            placeholder="The Padellers"
          />
        </label>
        <label className="label">
          Court
          <input
            className="input"
            value={courtNumber}
            onChange={(event) => setCourtNumber(event.target.value)}
            placeholder="3"
          />
        </label>
        <label className="label">
          Notes
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <label className="label">
        Attendees by email
        <textarea
          className="textarea"
          value={attendees}
          onChange={(event) => setAttendees(event.target.value)}
          placeholder="alice@example.com&#10;bob@example.com"
        />
        <span className="help">
          Players can be added before signup. If they later register with that email, their history
          links automatically.
        </span>
      </label>

      <datalist id="known-players">
        {knownPlayers.map((player) => (
          <option key={player.email} value={player.email}>
            {player.name ?? player.email}
          </option>
        ))}
      </datalist>

      <div className="stack">
        <div className="row">
          <h3 style={{ margin: 0 }}>Matches in played order</h3>
          <button
            className="btn secondary"
            onClick={() => setMatches((current) => [...current, emptyMatch()])}
          >
            + Add match
          </button>
        </div>

        {matches.map((match, index) => (
          <div className="match-form" key={index}>
            <div className="row">
              <strong>Match {index + 1}</strong>
              {matches.length > 1 ? (
                <button
                  className="icon-button"
                  onClick={() =>
                    setMatches((current) => current.filter((_, matchIndex) => matchIndex !== index))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="match-form-grid">
              <PlayerInput
                label="Team A · Player 1"
                value={match.teamA1}
                emails={attendeeEmails}
                onChange={(value) => updateMatch(index, { teamA1: value })}
              />
              <PlayerInput
                label="Team A · Player 2"
                value={match.teamA2}
                emails={attendeeEmails}
                onChange={(value) => updateMatch(index, { teamA2: value })}
              />
              <PlayerInput
                label="Team B · Player 1"
                value={match.teamB1}
                emails={attendeeEmails}
                onChange={(value) => updateMatch(index, { teamB1: value })}
              />
              <PlayerInput
                label="Team B · Player 2"
                value={match.teamB2}
                emails={attendeeEmails}
                onChange={(value) => updateMatch(index, { teamB2: value })}
              />
            </div>
            <div className="form-grid">
              <label className="label">
                Winner
                <select
                  className="select"
                  value={match.winnerTeam}
                  onChange={(event) =>
                    updateMatch(index, { winnerTeam: event.target.value as "A" | "B" })
                  }
                >
                  <option value="A">Team A</option>
                  <option value="B">Team B</option>
                </select>
              </label>
              <label className="label">
                Score
                <input
                  className="input"
                  value={match.scoreText}
                  onChange={(event) => updateMatch(index, { scoreText: event.target.value })}
                  placeholder="6-4, 7-5"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerInput({
  label,
  value,
  emails,
  onChange,
}: {
  label: string;
  value: string;
  emails: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="label">
      {label}
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select player</option>
        {emails.map((email) => (
          <option value={email} key={email}>
            {email}
          </option>
        ))}
      </select>
    </label>
  );
}
