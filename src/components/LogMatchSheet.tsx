"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { MAX_SCORE, winnerFromScore } from "@/lib/matchInput";

type Attendee = { id: string; name: string };
type Team = "A" | "B";
type SlotKey = "a1" | "a2" | "b1" | "b2";
type Slots = Record<SlotKey, string>;
type Status = "idle" | "saving" | "deleting";

const CLOSE_ANIMATION_MS = 280;
const DELETE_CONFIRM_MS = 4000;

export type EditingMatch = {
  id: string;
  teamAPlayer1Id: string;
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;
  teamAScore: number | null;
  teamBScore: number | null;
};

const SCORE_DIGITS = String(MAX_SCORE).length;

function scoreText(score: number | null | undefined) {
  return score == null ? "" : String(score);
}

const EMPTY_SLOTS: Slots = { a1: "", a2: "", b1: "", b2: "" };
const SLOT_ORDER: SlotKey[] = ["a1", "a2", "b1", "b2"];

function slotsFromMatch(match: EditingMatch): Slots {
  return {
    a1: match.teamAPlayer1Id,
    a2: match.teamAPlayer2Id,
    b1: match.teamBPlayer1Id,
    b2: match.teamBPlayer2Id,
  };
}

// Slot 1 = A front (top-left); 2 = A back (bottom-left);
// 3 = B front (top-right); 4 = B back (bottom-right).
const SLOT_STYLES: Record<SlotKey, React.CSSProperties> = {
  a1: { top: 18, left: 18, right: "calc(50% + 4px)", bottom: "calc(50% + 4px)" },
  a2: { bottom: 18, left: 18, right: "calc(50% + 4px)", top: "calc(50% + 4px)" },
  b1: { top: 18, right: 18, left: "calc(50% + 4px)", bottom: "calc(50% + 4px)" },
  b2: { bottom: 18, right: 18, left: "calc(50% + 4px)", top: "calc(50% + 4px)" },
};

const SLOT_NUMBERS: Record<SlotKey, number> = { a1: 1, a2: 2, b1: 3, b2: 4 };

export function LogMatchSheet({
  sessionId,
  attendees,
  open,
  onClose,
  match,
}: {
  sessionId: string;
  attendees: Attendee[];
  open: boolean;
  onClose: () => void;
  match?: EditingMatch;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [slots, setSlots] = useState<Slots>(EMPTY_SLOTS);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimeoutRef = useRef<number | null>(null);
  const scoreBRef = useRef<HTMLInputElement>(null);
  // Blur-triggered auto-save can race the save button's click; a ref settles it.
  const savingRef = useRef(false);
  const isEditing = Boolean(match);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setSlots(match ? slotsFromMatch(match) : EMPTY_SLOTS);
      setScoreA(scoreText(match?.teamAScore));
      setScoreB(scoreText(match?.teamBScore));
      savingRef.current = false;
      setStatus("idle");
      setError(null);
      setClosing(false);
      setConfirmingDelete(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      setClosing(true);
      const timer = window.setTimeout(() => {
        dialog.close();
        setClosing(false);
      }, CLOSE_ANIMATION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [open, match]);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const onBackdropClick = (event: MouseEvent) => {
      if (status !== "idle") return;
      // The browser dispatches click events on the dialog element when
      // the user clicks the backdrop (outside the inner content rect).
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) onClose();
    };
    dialog.addEventListener("click", onBackdropClick);
    return () => dialog.removeEventListener("click", onBackdropClick);
  }, [open, status, onClose]);

  const attendeeById = new Map(attendees.map((a) => [a.id, a]));
  const assignedIds = new Set(Object.values(slots).filter(Boolean));
  const bench = attendees.filter((a) => !assignedIds.has(a.id));
  const placedCount = SLOT_ORDER.filter((k) => slots[k]).length;
  const ready = placedCount === 4;
  const nextEmpty = SLOT_ORDER.find((k) => !slots[k]) ?? null;
  const busy = status !== "idle";

  const teamAScore = scoreA === "" ? null : Number(scoreA);
  const teamBScore = scoreB === "" ? null : Number(scoreB);
  const hasBothScores = teamAScore !== null && teamBScore !== null;
  const isTie = hasBothScores && teamAScore === teamBScore;
  const winner: Team | null =
    hasBothScores && !isTie ? winnerFromScore(teamAScore, teamBScore) : null;
  const canSave = ready && winner !== null;

  function placeOnBench(attendeeId: string) {
    if (busy || !nextEmpty) return;
    setSlots({ ...slots, [nextEmpty]: attendeeId });
  }

  function clearSlot(slotKey: SlotKey) {
    if (busy) return;
    setSlots({ ...slots, [slotKey]: "" });
  }

  function changeScore(raw: string, setScore: (value: string) => void) {
    if (busy) return;
    setScore(raw.replace(/\D/g, "").slice(0, SCORE_DIGITS));
  }

  async function save() {
    if (savingRef.current || busy || !canSave) return;
    savingRef.current = true;
    setError(null);
    setStatus("saving");
    try {
      const endpoint = match
        ? `/api/sessions/${sessionId}/matches/${match.id}`
        : `/api/sessions/${sessionId}/matches`;
      const response = await fetch(endpoint, {
        method: match ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAPlayer1Id: slots.a1,
          teamAPlayer2Id: slots.a2,
          teamBPlayer1Id: slots.b1,
          teamBPlayer2Id: slots.b2,
          teamAScore,
          teamBScore,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save match");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save match");
      setStatus("idle");
    } finally {
      savingRef.current = false;
    }
  }

  async function deleteMatch() {
    if (busy || !match) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = window.setTimeout(
        () => setConfirmingDelete(false),
        DELETE_CONFIRM_MS,
      );
      return;
    }
    if (confirmTimeoutRef.current) {
      window.clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
    setError(null);
    setStatus("deleting");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/matches/${match.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete match");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete match");
      setStatus("idle");
      setConfirmingDelete(false);
    }
  }

  const scoreHint = !ready
    ? placedCount === 0
      ? "Tap 4 players from the bench"
      : `Tap ${4 - placedCount} more from the bench`
    : isTie
      ? "A match can't end in a tie"
      : !hasBothScores
        ? "Enter the final score"
        : `Team ${winner} wins ${teamAScore}–${teamBScore}`;

  const teamA: Attendee[] = [slots.a1, slots.a2]
    .map((id) => attendeeById.get(id))
    .filter((a): a is Attendee => Boolean(a));
  const teamB: Attendee[] = [slots.b1, slots.b2]
    .map((id) => attendeeById.get(id))
    .filter((a): a is Attendee => Boolean(a));

  return (
    <dialog
      ref={dialogRef}
      className={`sheet${closing ? " is-closing" : ""}`}
      aria-label={isEditing ? "Edit match" : "Log a match"}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="sheet-inner">
          <div className="sheet-grabber">
            <span />
          </div>

          <div className="sheet-header">
            <div>
              <h2 className="sheet-title">{isEditing ? "Edit match" : "Set the teams"}</h2>
              <div className="sheet-sub">{scoreHint}</div>
            </div>
            <button
              type="button"
              className="sheet-close"
              aria-label="Close"
              onClick={onClose}
              disabled={busy}
            >
              ×
            </button>
          </div>

          {error ? <div className="error sheet-error">{error}</div> : null}

          <div className="court-wrap">
            <div className="court-team-labels">
              <span>TEAM A</span>
              <span>TEAM B</span>
            </div>
            <div className="court">
              <div className="court-outline" />
              <div className="court-net" />
              {SLOT_ORDER.map((key) => {
                const id = slots[key];
                const attendee = id ? attendeeById.get(id) : null;
                const isActive = !attendee && key === nextEmpty;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`court-slot${attendee ? " filled" : " empty"}${
                      isActive ? " active" : ""
                    }`}
                    style={SLOT_STYLES[key]}
                    onClick={() => attendee && clearSlot(key)}
                    aria-label={
                      attendee ? `Remove ${attendee.name} from slot ${SLOT_NUMBERS[key]}` : `Slot ${SLOT_NUMBERS[key]} empty`
                    }
                    disabled={!attendee || busy}
                  >
                    {attendee ? (
                      <>
                        <Avatar name={attendee.name} size={34} />
                        <span className="slot-name">{firstName(attendee.name)}</span>
                      </>
                    ) : (
                      <span className="slot-num">{SLOT_NUMBERS[key]}</span>
                    )}
                  </button>
                );
              })}
              <span className="court-vs">VS</span>
            </div>
          </div>

          <div className="bench">
            <div className="bench-label">
              {ready ? "Sitting out" : "On the bench · tap to place"}
            </div>
            <div className="bench-strip">
              {bench.length === 0 ? (
                <div className="bench-empty">Nobody — everyone&apos;s on court</div>
              ) : (
                bench.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    className="bench-chip"
                    onClick={() => placeOnBench(player.id)}
                    disabled={ready || busy}
                  >
                    <Avatar name={player.name} size={22} />
                    {firstName(player.name)}
                  </button>
                ))
              )}
            </div>
          </div>

          {ready ? (
            <>
              <div className="score-entry">
                <ScoreField
                  label="Team A"
                  players={teamA}
                  value={scoreA}
                  onChange={(value) => changeScore(value, setScoreA)}
                  onEnter={() => scoreBRef.current?.focus()}
                  onBlur={save}
                  leading={winner === "A"}
                  disabled={busy}
                  enterKeyHint="next"
                />
                <span className="score-dash" aria-hidden>
                  –
                </span>
                <ScoreField
                  label="Team B"
                  players={teamB}
                  value={scoreB}
                  onChange={(value) => changeScore(value, setScoreB)}
                  onEnter={() => scoreBRef.current?.blur()}
                  onBlur={save}
                  leading={winner === "B"}
                  disabled={busy}
                  enterKeyHint="done"
                  inputRef={scoreBRef}
                />
              </div>
              <button
                type="button"
                className="score-save"
                onClick={save}
                disabled={!canSave || busy}
              >
                {status === "saving"
                  ? "Saving…"
                  : winner
                    ? `Save · Team ${winner} wins ${teamAScore}–${teamBScore}`
                    : "Enter both scores"}
              </button>
            </>
          ) : null}

          {isEditing ? (
            <button
              type="button"
              className={`sheet-delete${confirmingDelete ? " is-confirming" : ""}`}
              onClick={deleteMatch}
              disabled={busy}
            >
              {status === "deleting"
                ? "Deleting…"
                : confirmingDelete
                  ? "Tap again to delete"
                  : "Delete match"}
            </button>
          ) : null}

        </div>
    </dialog>
  );
}

function ScoreField({
  label,
  players,
  value,
  onChange,
  onEnter,
  onBlur,
  leading,
  disabled,
  enterKeyHint,
  inputRef,
}: {
  label: string;
  players: Attendee[];
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onBlur: () => void;
  leading: boolean;
  disabled: boolean;
  enterKeyHint: "next" | "done";
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const names = players.map((player) => firstName(player.name)).join(" & ");
  return (
    <label className={`score-field${leading ? " leading" : ""}`}>
      <span className="score-team">
        <span className="score-tag">{label.toUpperCase()}</span>
        <span className="score-names">{names}</span>
      </span>
      <input
        ref={inputRef}
        className="score-input"
        type="number"
        inputMode="numeric"
        enterKeyHint={enterKeyHint}
        min={0}
        max={MAX_SCORE}
        step={1}
        placeholder="–"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          onEnter();
        }}
        onBlur={onBlur}
        disabled={disabled}
        aria-label={`${label} score`}
      />
    </label>
  );
}

function firstName(full: string) {
  return full.split(" ")[0];
}
