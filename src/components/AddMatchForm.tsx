"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attendee = { id: string; name: string };
type Team = "A" | "B";
type SlotKey = "a1" | "a2" | "b1" | "b2";
type Slots = Record<SlotKey, string>;

const EMPTY_SLOTS: Slots = { a1: "", a2: "", b1: "", b2: "" };
const SLOT_ORDER: SlotKey[] = ["a1", "a2", "b1", "b2"];

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
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const allFilled = SLOT_ORDER.every((key) => slots[key]);
  const attendeeById = new Map(attendees.map((attendee) => [attendee.id, attendee]));
  const assignedIds = new Set(Object.values(slots).filter(Boolean));
  const available = attendees.filter((attendee) => !assignedIds.has(attendee.id));

  function assignNext(attendeeId: string) {
    const nextEmpty = SLOT_ORDER.find((key) => !slots[key]);
    if (!nextEmpty) return;
    setSlots({ ...slots, [nextEmpty]: attendeeId });
  }

  function removeFromSlot(slotKey: SlotKey) {
    setSlots({ ...slots, [slotKey]: "" });
  }

  async function submit() {
    if (!winnerTeam) {
      setError("Tap a side of the court to mark the winner.");
      return;
    }
    setError(null);
    setStatus("saving");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAPlayer1Id: slots.a1,
          teamAPlayer2Id: slots.a2,
          teamBPlayer1Id: slots.b1,
          teamBPlayer2Id: slots.b2,
          winnerTeam,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save match");
      setSlots(EMPTY_SLOTS);
      setWinnerTeam(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save match");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="card stack">
      <span className="pill">Next match</span>
      <h2 style={{ marginTop: 0 }}>Log match</h2>

      {error ? <div className="error">{error}</div> : null}

      <div className="court-wrap">
        <div className="court">
          <CourtSide
            team="A"
            isWinner={winnerTeam === "A"}
            onSelectWinner={() => setWinnerTeam("A")}
            slotKeys={["a1", "a2"]}
            slots={slots}
            attendeeById={attendeeById}
            onRemove={removeFromSlot}
          />
          <CourtSide
            team="B"
            isWinner={winnerTeam === "B"}
            onSelectWinner={() => setWinnerTeam("B")}
            slotKeys={["b1", "b2"]}
            slots={slots}
            attendeeById={attendeeById}
            onRemove={removeFromSlot}
          />
        </div>
      </div>

      <div className="court-hint">
        {allFilled
          ? winnerTeam
            ? `Team ${winnerTeam} won. Ready to save.`
            : "Tap a side of the court to mark the winner."
          : "Tap an attendee below to place them on the court."}
      </div>

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
                disabled={allFilled}
              >
                {attendee.name}
              </button>
            ))
          )}
        </div>
      </div>

      <button
        className="btn dark full"
        onClick={submit}
        disabled={status === "saving" || !allFilled || !winnerTeam}
      >
        {status === "saving" ? "Saving…" : "Save match"}
      </button>
    </div>
  );
}

function CourtSide({
  team,
  isWinner,
  onSelectWinner,
  slotKeys,
  slots,
  attendeeById,
  onRemove,
}: {
  team: Team;
  isWinner: boolean;
  onSelectWinner: () => void;
  slotKeys: SlotKey[];
  slots: Slots;
  attendeeById: Map<string, Attendee>;
  onRemove: (slotKey: SlotKey) => void;
}) {
  return (
    <div className={`court-side ${team === "A" ? "left" : "right"}${isWinner ? " winner" : ""}`}>
      <button
        type="button"
        className="court-side-label"
        aria-pressed={isWinner}
        aria-label={`Mark Team ${team} as winner`}
        onClick={onSelectWinner}
      >
        Team {team}
        {isWinner ? " · Won" : ""}
      </button>
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
