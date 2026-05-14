"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEmailList } from "@/lib/email";

type KnownPlayer = { email: string; name: string | null };

export function CreateSessionForm({ knownPlayers }: { knownPlayers: KnownPlayer[] }) {
  const router = useRouter();
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
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

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
          attendeeEmails: parseEmailList(attendees),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save session");
      router.push(`/sessions/${data.sessionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save session");
      setStatus("idle");
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <div>
          <span className="pill">Session</span>
          <h2 style={{ marginTop: 14 }}>Create session</h2>
        </div>
        <button className="btn dark" onClick={submit} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Create session"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="form-grid">
        <label className="label">
          Date
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
      </label>
    </div>
  );
}
