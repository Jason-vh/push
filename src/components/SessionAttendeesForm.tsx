"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttendeePicker } from "@/components/AttendeePicker";

type KnownPlayer = { email: string; name: string | null };

type SaveStatus = "idle" | "saving" | "saved";

export function SessionAttendeesForm({
  sessionId,
  knownPlayers,
  initialAttendees,
}: {
  sessionId: string;
  knownPlayers: KnownPlayer[];
  initialAttendees: string[];
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialAttendees);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(nextPlayers: string[]) {
    const previousPlayers = players;
    setPlayers(nextPlayers);
    setError(null);
    setStatus("saving");

    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeEmails: nextPlayers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save players");
      setStatus("saved");
      router.refresh();
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch (err) {
      setPlayers(previousPlayers);
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not save players");
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <h2>Players</h2>
        {status !== "idle" ? (
          <span className="save-status">{status === "saving" ? "Saving…" : "Saved"}</span>
        ) : null}
      </div>

      {error ? <div className="error">{error}</div> : null}
      <AttendeePicker knownPlayers={knownPlayers} value={players} onChange={save} />
    </div>
  );
}
