"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AttendeePicker } from "@/components/AttendeePicker";
import { Avatar } from "@/components/Avatar";

type KnownUser = { id: string; name: string };

type SaveStatus = "idle" | "saving" | "saved";

export function SessionAttendeesForm({
  sessionId,
  knownUsers,
  initialAttendees,
  matchCount,
}: {
  sessionId: string;
  knownUsers: KnownUser[];
  initialAttendees: string[];
  matchCount: number;
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialAttendees);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const userById = new Map(knownUsers.map((u) => [u.id, u]));
  const roster = players
    .map((id) => userById.get(id))
    .filter((u): u is KnownUser => Boolean(u));

  async function save(nextPlayers: string[]) {
    const previousPlayers = players;
    setPlayers(nextPlayers);
    setError(null);
    setStatus("saving");

    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeUserIds: nextPlayers }),
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
    <>
      <div className="roster-strip">
        <div className="roster-stack">
          {roster.length === 0 ? (
            <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
              No players yet
            </span>
          ) : (
            roster.map((player) => (
              <span className="roster-avatar-frame" key={player.id}>
                <Avatar name={player.name} size={30} />
              </span>
            ))
          )}
        </div>
        {roster.length > 0 ? (
          <div className="roster-count">
            <strong>{roster.length} here</strong>
            {" · "}
            {matchCount} {matchCount === 1 ? "game" : "games"}
          </div>
        ) : null}
        <button
          type="button"
          className="roster-edit"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
        >
          {editing ? "Done" : roster.length === 0 ? "Add players" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="card edit-panel" style={{ marginTop: 12 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Players</h2>
            {status !== "idle" ? (
              <span className="save-status">
                {status === "saving" ? "Saving…" : "Saved"}
              </span>
            ) : null}
          </div>
          {error ? <div className="error" style={{ marginBottom: 10 }}>{error}</div> : null}
          <AttendeePicker knownUsers={knownUsers} value={players} onChange={save} />
        </div>
      ) : null}
    </>
  );
}
