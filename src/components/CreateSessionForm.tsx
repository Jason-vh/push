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
  const [players, setPlayers] = useState<string[]>(
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
          attendeeEmails: players,
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
      <h2>Create session</h2>

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
      </div>

      <div className="label">
        Players
        <AttendeePicker knownPlayers={knownPlayers} value={players} onChange={setPlayers} />
      </div>

      <button className="btn dark full" onClick={submit} disabled={status === "saving"}>
        {status === "saving" ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
