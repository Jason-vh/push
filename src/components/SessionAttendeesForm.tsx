"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttendeePicker } from "@/components/AttendeePicker";

type KnownPlayer = { email: string; name: string | null };

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
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setStatus("saving");

    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeEmails: players }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save players");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save players");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <h2>Players</h2>
        <button className="btn dark" onClick={submit} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      <AttendeePicker knownPlayers={knownPlayers} value={players} onChange={setPlayers} />
    </div>
  );
}
