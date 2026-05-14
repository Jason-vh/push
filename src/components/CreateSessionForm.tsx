"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttendeePicker } from "@/components/AttendeePicker";

type KnownPlayer = { email: string; name: string | null };

export function CreateSessionForm({ knownPlayers }: { knownPlayers: KnownPlayer[] }) {
  const router = useRouter();
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("");
  const [courtNumber, setCourtNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<string[]>(
    knownPlayers.slice(0, 4).map((player) => player.email),
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
          attendeeEmails: attendees,
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

      <div className="label">
        Attendees
        <AttendeePicker knownPlayers={knownPlayers} value={attendees} onChange={setAttendees} />
      </div>
    </div>
  );
}
