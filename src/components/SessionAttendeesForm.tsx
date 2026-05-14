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
  const [attendees, setAttendees] = useState(initialAttendees);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setStatus("saving");

    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeEmails: attendees }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save attendees");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save attendees");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <div>
          <span className="pill">Players</span>
          <h2 style={{ marginTop: 14 }}>Attendees</h2>
        </div>
        <button className="btn dark" onClick={submit} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      <AttendeePicker knownPlayers={knownPlayers} value={attendees} onChange={setAttendees} />
    </div>
  );
}
