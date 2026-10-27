"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DurationPicker } from "@/components/DurationPicker";
import { TimeInput } from "@/components/TimeInput";
import { DEFAULT_DURATION, DEFAULT_START_TIME, formatDate, type KeenDay } from "@/lib/keenDays";

export function KeenBookingForm({
  day,
  venueSuggestions,
  onBack,
  onClose,
}: {
  day: KeenDay;
  venueSuggestions: string[];
  onBack: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [venue, setVenue] = useState("");
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [court, setCourt] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = saving || refreshing;

  const typedVenue = venueSuggestions.includes(venue) ? "" : venue;
  const canSave = venue.trim() !== "" && startTime !== "";
  const saveLabel = busy ? "Saving…" : "Book";

  async function save() {
    if (!canSave || busy) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/keen/${day.date}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue: venue.trim(),
          startTime,
          durationMinutes,
          court: court.trim() || null,
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
          <h2 className="sheet-title">Book</h2>
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
          <TimeInput label="Start" value={startTime} onChange={setStartTime} />
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

        <button type="button" className="btn full" onClick={save} disabled={!canSave || busy}>
          {saveLabel}
        </button>
      </div>
    </>
  );
}
