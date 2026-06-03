"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttendeePicker } from "@/components/AttendeePicker";

type KnownUser = { id: string; name: string };

export function CreateSessionForm({ knownUsers }: { knownUsers: KnownUser[] }) {
  const router = useRouter();
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("");
  const [players, setPlayers] = useState<string[]>(
    knownUsers.slice(0, 4).map((user) => user.id),
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
          attendeeUserIds: players,
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
      </div>

      <div className="label">
        Players
        <AttendeePicker knownUsers={knownUsers} value={players} onChange={setPlayers} />
      </div>

      <button className="btn dark full" onClick={submit} disabled={status === "saving"}>
        {status === "saving" ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
