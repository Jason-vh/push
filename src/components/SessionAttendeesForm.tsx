"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PlayerCheckList } from "@/components/PlayerCheckList";

type KnownUser = { id: string; name: string };

const REQUIRED_PLAYERS = 4;

export function SessionAttendeesForm({
  sessionId,
  knownUsers,
  initialAttendees,
  matchCount,
  lockedUserIds,
  onPlayersChange,
}: {
  sessionId: string;
  knownUsers: KnownUser[];
  initialAttendees: string[];
  matchCount: number;
  lockedUserIds: string[];
  onPlayersChange?: (playerIds: string[]) => void;
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialAttendees);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(initialAttendees.length < REQUIRED_PLAYERS);

  const canCollapse = players.length >= REQUIRED_PLAYERS;

  useEffect(() => {
    if (!canCollapse) setEditing(true);
  }, [canCollapse]);

  const locked = new Set(lockedUserIds);
  const userById = new Map(knownUsers.map((u) => [u.id, u]));
  const roster = players
    .map((id) => userById.get(id))
    .filter((u): u is KnownUser => Boolean(u));
  const needed = Math.max(0, REQUIRED_PLAYERS - players.length);

  async function save(nextPlayers: string[]) {
    const previousPlayers = players;
    setPlayers(nextPlayers);
    onPlayersChange?.(nextPlayers);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeUserIds: nextPlayers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save players");
      router.refresh();
    } catch (err) {
      setPlayers(previousPlayers);
      onPlayersChange?.(previousPlayers);
      setError(err instanceof Error ? err.message : "Could not save players");
    }
  }

  const status = !canCollapse
    ? `Need ${needed} more player${needed === 1 ? "" : "s"}`
    : matchCount > 0
      ? `${matchCount} ${matchCount === 1 ? "game" : "games"} logged`
      : null;

  return (
    <>
      <div className="roster-strip">
        <div className="roster-stack">
          {roster.map((player) => (
            <span className="roster-avatar-frame" key={player.id}>
              <Avatar name={player.name} size={30} />
            </span>
          ))}
        </div>
        <div className="roster-count">
          <strong>{roster.length} here</strong>
          {status ? (
            <>
              {" · "}
              {status}
            </>
          ) : null}
        </div>
        {canCollapse ? (
          <button
            type="button"
            className="roster-edit"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
          >
            {editing ? "Done" : "Edit"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="card edit-panel" style={{ marginTop: 12 }}>
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
