"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attendee = { id: string; name: string };
type Team = "A" | "B";
type SlotKey = "a1" | "a2" | "b1" | "b2";
type Slots = Record<SlotKey, string>;
type Status = "idle" | "saving" | "saved";

const EMPTY_SLOTS: Slots = { a1: "", a2: "", b1: "", b2: "" };
const SLOT_ORDER: SlotKey[] = ["a1", "a2", "b1", "b2"];
const SAVED_DISPLAY_MS = 1500;

export function AddMatchForm({
  sessionId,
  attendees,
}: {
  sessionId: string;
  attendees: Attendee[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slots>(EMPTY_SLOTS);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const allFilled = SLOT_ORDER.every((key) => slots[key]);
  const attendeeById = new Map(attendees.map((attendee) => [attendee.id, attendee]));
  const assignedIds = new Set(Object.values(slots).filter(Boolean));
  const available = attendees.filter((attendee) => !assignedIds.has(attendee.id));
  const busy = status !== "idle";

  async function trySaveWith(nextSlots: Slots, nextWinner: Team | null) {
    if (status !== "idle") return;
    if (!nextWinner) return;
    if (!SLOT_ORDER.every((key) => nextSlots[key])) return;

    setError(null);
    setStatus("saving");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAPlayer1Id: nextSlots.a1,
          teamAPlayer2Id: nextSlots.a2,
          teamBPlayer1Id: nextSlots.b1,
          teamBPlayer2Id: nextSlots.b2,
          winnerTeam: nextWinner,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save match");
      setSlots(EMPTY_SLOTS);
      setWinnerTeam(null);
      setStatus("saved");
      router.refresh();
      window.setTimeout(() => setStatus("idle"), SAVED_DISPLAY_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save match");
      setStatus("idle");
    }
  }

  function assignNext(attendeeId: string) {
    if (busy) return;
    const nextEmpty = SLOT_ORDER.find((key) => !slots[key]);
    if (!nextEmpty) return;
    const next = { ...slots, [nextEmpty]: attendeeId };
    setSlots(next);
    trySaveWith(next, winnerTeam);
  }

  function removeFromSlot(slotKey: SlotKey) {
    if (busy) return;
    setSlots({ ...slots, [slotKey]: "" });
  }

  function pickWinner(team: Team) {
    if (busy) return;
    setWinnerTeam(team);
    trySaveWith(slots, team);
  }

  return (
    <div className="card stack">
      <span className="pill">Next match</span>
      <h2 style={{ marginTop: 0 }}>Log match</h2>

      {error ? <div className="error">{error}</div> : null}

      <div>
        <div className="court-pool-label">Available</div>
        <div className="chip-strip">
          {available.length === 0 ? (
            <span className="empty compact">All attendees are on the court.</span>
          ) : (
            available.map((attendee) => (
              <button
                key={attendee.id}
                type="button"
                className="chip"
                onClick={() => assignNext(attendee.id)}
                disabled={allFilled || busy}
              >
                {attendee.name}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="court-block">
        <div className="court-header">
          <button
            type="button"
            className={`court-team-button${winnerTeam === "A" ? " winner" : ""}`}
            aria-pressed={winnerTeam === "A"}
            aria-label="Mark Team A as winner"
            onClick={() => pickWinner("A")}
            disabled={busy}
          >
            Team A{winnerTeam === "A" ? " · Won" : ""}
          </button>
          <button
            type="button"
            className={`court-team-button${winnerTeam === "B" ? " winner" : ""}`}
            aria-pressed={winnerTeam === "B"}
            aria-label="Mark Team B as winner"
            onClick={() => pickWinner("B")}
            disabled={busy}
          >
            Team B{winnerTeam === "B" ? " · Won" : ""}
          </button>
        </div>
        <div className="court-wrap">
          <div className="court">
            <CourtSide
              team="A"
              isWinner={winnerTeam === "A"}
              slotKeys={["a1", "a2"]}
              slots={slots}
              attendeeById={attendeeById}
              onRemove={removeFromSlot}
            />
            <CourtSide
              team="B"
              isWinner={winnerTeam === "B"}
              slotKeys={["b1", "b2"]}
              slots={slots}
              attendeeById={attendeeById}
              onRemove={removeFromSlot}
            />
          </div>
        </div>
      </div>

      <div className={`court-hint${status === "saved" ? " saved" : ""}`}>
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "✓ Match saved"
            : allFilled
              ? "Tap a team button above to log the winner."
              : "Tap an attendee above to place them on the court."}
      </div>
    </div>
  );
}

function CourtSide({
  team,
  isWinner,
  slotKeys,
  slots,
  attendeeById,
  onRemove,
}: {
  team: Team;
  isWinner: boolean;
  slotKeys: SlotKey[];
  slots: Slots;
  attendeeById: Map<string, Attendee>;
  onRemove: (slotKey: SlotKey) => void;
}) {
  return (
    <div className={`court-side ${team === "A" ? "left" : "right"}${isWinner ? " winner" : ""}`}>
      {slotKeys.map((key) => {
        const attendee = slots[key] ? attendeeById.get(slots[key]) : null;
        if (!attendee) {
          return (
            <div key={key} className="court-slot empty">
              Empty
            </div>
          );
        }
        return (
          <button
            key={key}
            type="button"
            className="court-slot filled"
            onClick={() => onRemove(key)}
            aria-label={`Remove ${attendee.name} from Team ${team}`}
          >
            {attendee.name}
            <span className="court-slot-remove" aria-hidden="true">
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
