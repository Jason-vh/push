"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SessionHeader({
  sessionId,
  initialPlayedAt,
  initialVenue,
}: {
  sessionId: string;
  initialPlayedAt: string;
  initialVenue: string | null;
}) {
  const router = useRouter();
  const [playedAt, setPlayedAt] = useState(initialPlayedAt);
  const [venue, setVenue] = useState(initialVenue ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: { playedAt?: string; venue?: string | null }) {
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <header className="session-header">
      <div className="session-header-main">
        <h1 className="session-title">{formatDate(playedAt)}</h1>
        {venue ? (
          <div className="session-subtitle">
            <span>{venue}</span>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="btn-pill subtle"
        onClick={() => setEditing((v) => !v)}
        aria-expanded={editing}
      >
        {editing ? "Done" : "Edit"}
      </button>

      {editing ? (
        <div className="card edit-panel session-edit-panel">
          <label className="label">
            Date
            <input
              className="input"
              type="date"
              value={playedAt}
              onChange={(event) => {
                setPlayedAt(event.target.value);
                void save({ playedAt: event.target.value });
              }}
            />
          </label>
          <label className="label">
            Venue
            <input
              className="input"
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              onBlur={() => {
                if (venue !== (initialVenue ?? "")) void save({ venue: venue || null });
              }}
              placeholder="The Padellers"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
        </div>
      ) : null}
    </header>
  );
}

function formatDate(value: string) {
  // The header stores `playedAt` as YYYY-MM-DD (the format the date input
  // uses); parse explicitly so the displayed weekday matches what the user
  // picked regardless of timezone.
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
