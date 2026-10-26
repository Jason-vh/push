"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { KeenBookingForm } from "@/components/KeenBookingForm";
import { BookingTicket, PlusIcon, displayName } from "@/components/KeenParts";
import {
  PLAYERS_PER_GAME,
  benchOf,
  dayStatus,
  formatDate,
  isKeen,
  lineupOf,
  playersNeeded,
  type KeenDay,
  type KeenPlayer,
} from "@/lib/keenDays";

const CLOSE_ANIMATION_MS = 280;
const CANCEL_CONFIRM_MS = 4000;

type Step = "day" | "book";

export function KeenDaySheet({
  day,
  userId,
  venueSuggestions,
  onClose,
}: {
  day: KeenDay | null;
  userId: string;
  venueSuggestions: string[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shownDay, setShownDay] = useState<KeenDay | null>(day);
  const [step, setStep] = useState<Step>("day");
  const [closing, setClosing] = useState(false);
  const open = day !== null;

  useEffect(() => {
    if (day) setShownDay(day);
  }, [day]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStep("day");
      setClosing(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      setClosing(true);
      const timer = window.setTimeout(() => {
        dialog.close();
        setClosing(false);
      }, CLOSE_ANIMATION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const onBackdropClick = (event: MouseEvent) => {
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
  }, [open, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={`sheet${closing ? " is-closing" : ""}`}
      aria-label="Day"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="sheet-inner">
        <div className="sheet-grabber">
          <span />
        </div>
        {shownDay && step === "day" ? (
          <DayDetails
            day={shownDay}
            userId={userId}
            onBook={() => setStep("book")}
            onClose={onClose}
          />
        ) : null}
        {shownDay && step === "book" ? (
          <KeenBookingForm
            day={shownDay}
            userId={userId}
            venueSuggestions={venueSuggestions}
            onBack={() => setStep("day")}
            onClose={onClose}
          />
        ) : null}
      </div>
    </dialog>
  );
}

function DayDetails({
  day,
  userId,
  onBook,
  onClose,
}: {
  day: KeenDay;
  userId: string;
  onBook: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = saving || refreshing;

  const status = dayStatus(day);
  const keen = isKeen(day, userId);
  const lineup = lineupOf(day);
  const bench = benchOf(day);
  const me = day.keen.find((player) => player.userId === userId);
  const canChange = !day.booking;

  async function send(method: "POST" | "DELETE" | "PATCH", body?: unknown) {
    if (busy) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/keen/${day.date}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save");
      startRefresh(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const join = () => send("POST");
  const leave = () => send("DELETE");

  return (
    <>
      <div className="sheet-header">
        <div>
          <h2 className="sheet-title">
            {formatDate(day.date, { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <div className="sheet-sub">{subtitle(day, userId)}</div>
        </div>
        <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="keen-sheet-body">
        {error ? <div className="error keen-sheet-error">{error}</div> : null}
        {day.booking ? <BookingTicket booking={day.booking} /> : null}

        <div className="keen-section-label">{day.booking ? "Playing" : "Who's keen"}</div>
        <div className="keen-lineup">
          {Array.from({ length: PLAYERS_PER_GAME }, (_, index) => {
            const player = lineup[index];
            if (player) {
              return (
                <PlayerSpot
                  key={player.userId}
                  player={player}
                  userId={userId}
                  onLeave={canChange && player.userId === userId ? leave : undefined}
                  disabled={busy}
                />
              );
            }
            if (canChange && !keen) {
              const isFirstOpen = index === lineup.length;
              return (
                <button
                  key={index}
                  type="button"
                  className={`keen-spot open${isFirstOpen ? " take" : ""}`}
                  onClick={join}
                  disabled={busy}
                >
                  <span className="keen-spot-ghost">{isFirstOpen ? <PlusIcon /> : null}</span>
                  <span className="keen-spot-name">{isFirstOpen ? "I'm keen" : "Open spot"}</span>
                </button>
              );
            }
            return (
              <div key={index} className="keen-spot open">
                <span className="keen-spot-ghost" />
                <span className="keen-spot-name">Open spot</span>
              </div>
            );
          })}
        </div>

        {bench.length > 0 ? (
          <>
            <div className="keen-section-label">{day.booking ? "Also keen" : "On the bench"}</div>
            <div className="keen-bench">
              {bench.map((player) => (
                <span key={player.userId} className="keen-chip">
                  <Avatar name={player.name} size={22} />
                  {displayName(player, userId)}
                  {canChange && player.userId === userId ? (
                    <LeaveButton onClick={leave} disabled={busy} />
                  ) : null}
                </span>
              ))}
            </div>
          </>
        ) : null}

        {me && canChange ? (
          <NoteInput
            key={day.date}
            initialNote={me.note ?? ""}
            onSave={(note) => send("PATCH", { note: note || null })}
          />
        ) : null}

        {canChange && !keen && lineup.length >= PLAYERS_PER_GAME ? (
          <button type="button" className="keen-bench-join" onClick={join} disabled={busy}>
            <span className="keen-spot-ghost">
              <PlusIcon />
            </span>
            <span>
              <strong>Join the bench</strong>
              <small>In case someone drops out</small>
            </span>
          </button>
        ) : null}

        {status === "booked" && day.booking?.bookedById === userId ? (
          <BookerActions date={day.date} onEdit={onBook} />
        ) : null}

        {status === "enough" && keen ? (
          <div className="keen-callout ready">
            <strong>That&apos;s four. Game on!</strong>
            Book a court with the club, then add the details here so everyone knows where to go.
            <button type="button" className="btn full" onClick={onBook} disabled={busy}>
              Mark as booked
            </button>
          </div>
        ) : null}

        {status === "open" || status === "empty" ? (
          <div className="keen-callout">
            Needs <strong>{playersNeededText(playersNeeded(day))}</strong> before someone can book a
            court.
          </div>
        ) : null}
      </div>
    </>
  );
}

function PlayerSpot({
  player,
  userId,
  onLeave,
  disabled,
}: {
  player: KeenPlayer;
  userId: string;
  onLeave?: () => void;
  disabled: boolean;
}) {
  return (
    <div className={`keen-spot${player.userId === userId ? " me" : ""}`}>
      <Avatar name={player.name} size={32} />
      <div className="keen-spot-text">
        <div className="keen-spot-name">{displayName(player, userId)}</div>
        {player.note ? <div className="keen-spot-note">{player.note}</div> : null}
      </div>
      {onLeave ? <LeaveButton onClick={onLeave} disabled={disabled} /> : null}
    </div>
  );
}

function LeaveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      className="keen-leave"
      aria-label="Give up your spot"
      onClick={onClick}
      disabled={disabled}
    >
      ×
    </button>
  );
}

function NoteInput({
  initialNote,
  onSave,
}: {
  initialNote: string;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState(initialNote);
  return (
    <input
      className="input keen-note"
      value={note}
      maxLength={80}
      placeholder="Add a note, e.g. after 19:00"
      aria-label="Note"
      onChange={(event) => setNote(event.target.value)}
      onBlur={() => {
        if (note.trim() !== initialNote) onSave(note.trim());
      }}
    />
  );
}

function BookerActions({ date, onEdit }: { date: string; onEdit: () => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  async function cancelBooking() {
    if (!confirming) {
      setConfirming(true);
      confirmTimeoutRef.current = window.setTimeout(() => setConfirming(false), CANCEL_CONFIRM_MS);
      return;
    }
    if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
    setError(null);
    setCancelling(true);
    try {
      const response = await fetch(`/api/keen/${date}/booking`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not cancel booking");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel booking");
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  }

  let cancelLabel = "Cancel booking";
  if (confirming) cancelLabel = "Tap again to cancel";
  if (cancelling) cancelLabel = "Cancelling…";

  return (
    <div className="keen-booker-actions">
      {error ? <div className="error">{error}</div> : null}
      <button type="button" className="btn subtle full" onClick={onEdit} disabled={cancelling}>
        Edit booking
      </button>
      <button
        type="button"
        className={`sheet-delete${confirming ? " is-confirming" : ""}`}
        onClick={cancelBooking}
        disabled={cancelling}
      >
        {cancelLabel}
      </button>
    </div>
  );
}

function subtitle(day: KeenDay, userId: string) {
  const status = dayStatus(day);
  if (status === "booked" && day.booking) {
    const booker = { userId: day.booking.bookedById, name: day.booking.bookedByName };
    return `Booked by ${displayName(booker, userId)}`;
  }
  if (status === "enough") return "Four in · ready to book";
  if (status === "empty") return "Nobody's keen yet";
  return `${day.keen.length} keen · ${playersNeeded(day)} more needed`;
}

function playersNeededText(count: number) {
  if (count === 1) return "one more player";
  return `${count} more players`;
}
