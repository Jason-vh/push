"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/BottomSheet";
import { DurationPicker } from "@/components/DurationPicker";
import { PlayerCheckList } from "@/components/PlayerCheckList";
import { TimeInput } from "@/components/TimeInput";
import { DEFAULT_DURATION } from "@/lib/keenDays";

const DELETE_CONFIRM_MS = 3000;

export type EditableSession = {
  id: string;
  date: string;
  startTime: string | null;
  durationMinutes: number | null;
  venue: string | null;
  court: string | null;
  playerIds: string[];
  hasMatches: boolean;
};

type SessionPatch = {
  playedAt?: string;
  venue?: string | null;
  startTime?: string;
  durationMinutes?: number;
  court?: string | null;
};

export function SessionEditSheet({
  session,
  knownUsers,
  lockedUserIds,
  venueSuggestions,
  open,
  onClose,
}: {
  session: EditableSession;
  knownUsers: Array<{ id: string; name: string }>;
  lockedUserIds: string[];
  venueSuggestions: string[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startTime ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    session.durationMinutes ?? DEFAULT_DURATION,
  );
  const [court, setCourt] = useState(session.court ?? "");
  const [venue, setVenue] = useState(session.venue ?? "");
  const [players, setPlayers] = useState(session.playerIds);
  const [error, setError] = useState<string | null>(null);

  const isSuggestion = venueSuggestions.includes(venue);
  const typedVenue = isSuggestion ? "" : venue;

  async function request(url: string, method: string, body: unknown) {
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      return false;
    }
  }

  const save = (patch: SessionPatch) => request(`/api/sessions/${session.id}`, "PATCH", patch);

  async function savePlayers(nextPlayers: string[]) {
    const previous = players;
    setPlayers(nextPlayers);
    const saved = await request(`/api/sessions/${session.id}/attendees`, "POST", {
      attendeeUserIds: nextPlayers,
    });
    if (!saved) setPlayers(previous);
  }

  function chooseVenue(suggestion: string) {
    const next = venue === suggestion ? "" : suggestion;
    setVenue(next);
    void save({ venue: next || null });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit session">
      <div className="session-edit">
        {error ? <div className="error">{error}</div> : null}

        <label className="label">
          Date
          <input
            className="input"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              if (event.target.value) void save({ playedAt: event.target.value });
            }}
          />
        </label>

        <div className="form-grid">
          <TimeInput
            label="Start"
            value={startTime}
            onChange={(value) => {
              setStartTime(value);
              if (value) void save({ startTime: value, durationMinutes });
            }}
          />
          <label className="label">
            <span>
              Court <span className="keen-optional">optional</span>
            </span>
            <input
              className="input"
              value={court}
              maxLength={40}
              placeholder="Court 4"
              onChange={(event) => setCourt(event.target.value)}
              onBlur={() => {
                if (court.trim() !== (session.court ?? ""))
                  void save({ court: court.trim() || null });
              }}
            />
          </label>
        </div>

        <div className="label">
          Length
          <DurationPicker
            value={durationMinutes}
            onChange={(minutes) => {
              setDurationMinutes(minutes);
              void save({ durationMinutes: minutes });
            }}
          />
        </div>

        <div className="label">
          Where
          {venueSuggestions.length > 0 ? (
            <div className="keen-choices">
              {venueSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`keen-choice${venue === suggestion ? " selected" : ""}`}
                  onClick={() => chooseVenue(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          <input
            className="input"
            value={typedVenue}
            maxLength={120}
            placeholder={venueSuggestions.length > 0 ? "Or type another venue" : "Venue name"}
            aria-label="Venue"
            onChange={(event) => setVenue(event.target.value)}
            onBlur={() => {
              if (venue.trim() !== (session.venue ?? ""))
                void save({ venue: venue.trim() || null });
            }}
          />
        </div>

        <div className="label">
          Players
          <PlayerCheckList
            knownUsers={knownUsers}
            value={players}
            onChange={savePlayers}
            lockedUserIds={new Set(lockedUserIds)}
          />
        </div>

        <button type="button" className="btn full" onClick={onClose}>
          Done
        </button>
        {session.hasMatches ? null : <DeleteSessionButton sessionId={session.id} />}
      </div>
    </BottomSheet>
  );
}

function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disarmTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    };
  }, []);

  async function onClick() {
    if (!armed) {
      setArmed(true);
      setError(null);
      disarmTimer.current = window.setTimeout(() => setArmed(false), DELETE_CONFIRM_MS);
      return;
    }
    if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    setDeleting(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete session");
      router.push("/");
      router.refresh();
    } catch (err) {
      setDeleting(false);
      setArmed(false);
      setError(err instanceof Error ? err.message : "Could not delete session");
    }
  }

  let label = "Delete session";
  if (armed) label = "Tap again to delete";
  if (deleting) label = "Deleting…";

  return (
    <>
      {error ? <div className="error">{error}</div> : null}
      <button
        type="button"
        className={`sheet-delete${armed ? " is-confirming" : ""}`}
        onClick={onClick}
        disabled={deleting}
      >
        {label}
      </button>
    </>
  );
}
