"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { displayName } from "@/components/KeenParts";
import { DurationPicker } from "@/components/DurationPicker";
import {
  DEFAULT_DURATION,
  DEFAULT_START_TIME,
  PLAYERS_PER_GAME,
  formatDate,
  type KeenDay,
  type KeenPlayer,
} from "@/lib/keenDays";

export function KeenBookingForm({
  day,
  userId,
  userName,
  venueSuggestions,
  onBack,
  onClose,
}: {
  day: KeenDay;
  userId: string;
  userName: string;
  venueSuggestions: string[];
  onBack: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const session = day.session;
  const [venue, setVenue] = useState(session?.venue ?? "");
  const [startTime, setStartTime] = useState(session?.startTime ?? DEFAULT_START_TIME);
  const [durationMinutes, setDurationMinutes] = useState(
    session?.durationMinutes ?? DEFAULT_DURATION,
  );
  const [court, setCourt] = useState(session?.court ?? "");
  const [playerIds, setPlayerIds] = useState(() => defaultLineup(day, userId));
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = saving || refreshing;

  const typedVenue = venueSuggestions.includes(venue) ? "" : venue;
  const candidates = bookingCandidates(day, userId, userName);
  const playersChosen = session !== null || playerIds.length > 0;
  const canSave = venue.trim() !== "" && startTime !== "" && playersChosen;
  let saveLabel = session ? "Save changes" : "Book";
  if (busy) saveLabel = "Saving…";

  function togglePlayer(id: string) {
    if (playerIds.includes(id)) {
      setPlayerIds(playerIds.filter((playerId) => playerId !== id));
    } else {
      setPlayerIds([...playerIds, id]);
    }
  }

  async function save() {
    if (!canSave || busy) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/keen/${day.date}/booking`, {
        method: session ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue: venue.trim(),
          startTime,
          durationMinutes,
          court: court.trim() || null,
          ...(session ? {} : { playerIds }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save booking");
      startRefresh(() => router.refresh());
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save booking");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="sheet-header">
        <div>
          <button type="button" className="keen-back-inline" onClick={onBack}>
            ‹ {formatDate(day.date, { weekday: "short", day: "numeric", month: "short" })}
          </button>
          <h2 className="sheet-title">{session ? "Edit booking" : "Book"}</h2>
        </div>
        <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="keen-sheet-body keen-form">
        {error ? <div className="error keen-sheet-error">{error}</div> : null}

        <div className="label">
          Where
          {venueSuggestions.length > 0 ? (
            <div className="keen-choices">
              {venueSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`keen-choice${venue === suggestion ? " selected" : ""}`}
                  onClick={() => setVenue(venue === suggestion ? "" : suggestion)}
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
          />
        </div>

        <div className="form-grid">
          <label className="label">
            Start
            <input
              className="input"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
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
            />
          </label>
        </div>

        <div className="label">
          Length
          <DurationPicker value={durationMinutes} onChange={setDurationMinutes} />
        </div>

        {session ? null : (
          <div className="label">
            Who&apos;s playing
            <div className="keen-pick-list">
              {candidates.map((player) => {
                const selected = playerIds.includes(player.userId);
                return (
                  <button
                    key={player.userId}
                    type="button"
                    className={`keen-pick${selected ? " selected" : ""}`}
                    onClick={() => togglePlayer(player.userId)}
                    aria-pressed={selected}
                  >
                    <Avatar name={player.name} size={28} />
                    <span className="keen-pick-name">
                      {displayName(player, userId)}
                      {player.note ? <small>{player.note}</small> : null}
                    </span>
                    <span className="keen-pip" aria-hidden>
                      {selected ? <CheckIcon /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button type="button" className="btn full" onClick={save} disabled={!canSave || busy}>
          {saveLabel}
        </button>
      </div>
    </>
  );
}

function bookingCandidates(day: KeenDay, userId: string, userName: string): KeenPlayer[] {
  const me = day.keen.find((player) => player.userId === userId) ?? {
    userId,
    name: userName,
    note: null,
  };
  return [me, ...day.keen.filter((player) => player.userId !== userId)];
}

function defaultLineup(day: KeenDay, userId: string) {
  const others = day.keen.map((player) => player.userId).filter((id) => id !== userId);
  return [userId, ...others].slice(0, PLAYERS_PER_GAME);
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 6.3l2.4 2.4 4.6-5" />
    </svg>
  );
}
