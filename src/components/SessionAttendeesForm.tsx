"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PlayerCheckList } from "@/components/PlayerCheckList";

type KnownUser = { id: string; name: string };

type SaveStatus = "idle" | "saving" | "saved";

const REQUIRED_PLAYERS = 4;

export function SessionAttendeesForm({
  sessionId,
  knownUsers,
  initialAttendees,
  matchCount,
  lockedUserIds,
}: {
  sessionId: string;
  knownUsers: KnownUser[];
  initialAttendees: string[];
  matchCount: number;
  lockedUserIds: string[];
}) {
  const router = useRouter();
  const startExpanded = matchCount === 0;
  const [players, setPlayers] = useState(initialAttendees);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(startExpanded);

  const locked = new Set(lockedUserIds);
  const userById = new Map(knownUsers.map((u) => [u.id, u]));
  const roster = players
    .map((id) => userById.get(id))
    .filter((u): u is KnownUser => Boolean(u));
  const needed = Math.max(0, REQUIRED_PLAYERS - players.length);

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

  // When the session already has matches, render the compact roster strip with
  // an Edit affordance; tapping it expands the picker (with locked rows).
  if (!startExpanded) {
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
            <PlayerCheckList
              knownUsers={knownUsers}
              value={players}
              onChange={save}
              lockedUserIds={locked}
            />
          </div>
        ) : null}
      </>
    );
  }

  // No matches yet — the player picker is the page. Always-expanded list with a
  // status line above; no compact roster strip.
  return (
    <section className="players-panel">
      <div className="players-status">
        <h2 className="players-status-title">
          {needed === 0 ? "Ready to play" : `Need ${needed} more player${needed === 1 ? "" : "s"}`}
        </h2>
        <span className="players-status-meta">
          {players.length}/{REQUIRED_PLAYERS}
          {status === "saving" ? " · Saving…" : status === "saved" ? " · Saved" : ""}
        </span>
      </div>
      {error ? <div className="error" style={{ marginBottom: 10 }}>{error}</div> : null}
      <PlayerCheckList knownUsers={knownUsers} value={players} onChange={save} />
    </section>
  );
}
