"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
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
  type KeenDay,
  type KeenPlayer,
  type KeenSession,
} from "@/lib/keenDays";

const CLOSE_ANIMATION_MS = 280;

type Step = { name: "day" } | { name: "book"; day: KeenDay };

export function KeenDaySheet({
  day,
  userId,
  userName,
  venueSuggestions,
  onClose,
}: {
  day: KeenDay | null;
  userId: string;
  userName: string;
  venueSuggestions: string[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shownDay, setShownDay] = useState<KeenDay | null>(day);
  const [step, setStep] = useState<Step>({ name: "day" });
  const [closing, setClosing] = useState(false);
  const open = day !== null;

  useEffect(() => {
    if (day) setShownDay(day);
  }, [day]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStep({ name: "day" });
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
        {shownDay && step.name === "day" ? (
          <DayDetails
            key={shownDay.date}
            day={shownDay}
            userId={userId}
            userName={userName}
            onBook={(bookingDay) => setStep({ name: "book", day: bookingDay })}
            onClose={onClose}
          />
        ) : null}
        {step.name === "book" ? (
          <KeenBookingForm
            day={step.day}
            userId={userId}
            userName={userName}
            venueSuggestions={venueSuggestions}
            onBack={() => setStep({ name: "day" })}
            onClose={onClose}
          />
        ) : null}
      </div>
    </dialog>
  );
}

function DayDetails({
  day: savedDay,
  userId,
  userName,
  onBook,
  onClose,
}: {
  day: KeenDay;
  userId: string;
  userName: string;
  onBook: (day: KeenDay) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [wantKeen, setWantKeen] = useState<boolean | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const queueRef = useRef(Promise.resolve());

  // Requests run one after another so a quick join-then-leave or note edit lands in order.
  function enqueue(method: "POST" | "DELETE" | "PATCH", body?: unknown) {
    setError(null);
    setInFlight((count) => count + 1);
    queueRef.current = queueRef.current.then(async () => {
      try {
        const response = await fetch(`/api/keen/${savedDay.date}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not save");
        startRefresh(() => router.refresh());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
        setWantKeen(null);
      } finally {
        setInFlight((count) => count - 1);
      }
    });
  }

  useEffect(() => {
    if (wantKeen === null || inFlight > 0) return;
    if (isKeen(savedDay, userId) === wantKeen) setWantKeen(null);
  }, [savedDay, userId, wantKeen, inFlight]);

  const day = wantKeen === null ? savedDay : withKeen(savedDay, userId, userName, wantKeen);
  const status = dayStatus(day);
  const keen = isKeen(day, userId);
  const lineup = lineupOf(day);
  const bench = benchOf(day);
  const me = day.keen.find((player) => player.userId === userId);
  const session = day.session;
  const canChange = !session;
  const spotCount = session ? lineup.length : PLAYERS_PER_GAME;
  const justJoined = wantKeen === true;

  function join() {
    setWantKeen(true);
    enqueue("POST");
  }

  function leave() {
    setWantKeen(false);
    enqueue("DELETE");
  }

  function saveNote(note: string) {
    enqueue("PATCH", { note: note || null });
  }

  return (
    <>
      <div className="sheet-header">
        <div>
          <h2 className="sheet-title">
            {formatDate(day.date, { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          {session ? <div className="sheet-sub">{bookedBy(session, userId)}</div> : null}
        </div>
        <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="keen-sheet-body">
        {error ? <div className="error keen-sheet-error">{error}</div> : null}
        {session ? <BookingTicket session={session} /> : null}

        {spotCount > 0 ? (
          <div className="keen-section-label">{session ? "Playing" : "Who's keen"}</div>
        ) : null}
        <div className="keen-lineup">
          {Array.from({ length: spotCount }, (_, index) => {
            const player = lineup[index];
            if (player) {
              return (
                <PlayerSpot
                  key={player.userId}
                  player={player}
                  userId={userId}
                  onLeave={canChange && player.userId === userId ? leave : undefined}
                  arriving={justJoined && player.userId === userId}
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
            <div className="keen-section-label">{session ? "Also keen" : "On the bench"}</div>
            <div className="keen-bench">
              {bench.map((player) => (
                <span
                  key={player.userId}
                  className={`keen-chip${justJoined && player.userId === userId ? " is-arriving" : ""}`}
                >
                  <Avatar name={player.name} size={22} />
                  {displayName(player, userId)}
                  {canChange && player.userId === userId ? <LeaveButton onClick={leave} /> : null}
                </span>
              ))}
            </div>
          </>
        ) : null}

        <Reveal open={Boolean(me && canChange)}>
          <NoteInput initialNote={me?.note ?? ""} onSave={saveNote} />
        </Reveal>

        {canChange && !keen && lineup.length >= PLAYERS_PER_GAME ? (
          <button type="button" className="keen-bench-join" onClick={join}>
            <span className="keen-spot-ghost">
              <PlusIcon />
            </span>
            <span>
              <strong>Join the bench</strong>
              <small>In case someone drops out</small>
            </span>
          </button>
        ) : null}

        {session ? (
          <Link className="btn full keen-book" href={`/sessions/${session.id}`}>
            Open session
          </Link>
        ) : null}

        {session ? null : (
          <button
            type="button"
            className={`btn full keen-book${status === "enough" && keen ? "" : " subtle"}`}
            onClick={() => onBook(day)}
          >
            Book
          </button>
        )}
      </div>
    </>
  );
}

function PlayerSpot({
  player,
  userId,
  onLeave,
  arriving,
}: {
  player: KeenPlayer;
  userId: string;
  onLeave?: () => void;
  arriving: boolean;
}) {
  const classes = ["keen-spot"];
  if (player.userId === userId) classes.push("me");
  if (arriving) classes.push("is-arriving");
  return (
    <div className={classes.join(" ")}>
      <Avatar name={player.name} size={32} />
      <div className="keen-spot-text">
        <div className="keen-spot-name">{displayName(player, userId)}</div>
        {player.note ? <div className="keen-spot-note">{player.note}</div> : null}
      </div>
      {onLeave ? <LeaveButton onClick={onLeave} /> : null}
    </div>
  );
}

function LeaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="keen-leave" aria-label="Give up your spot" onClick={onClick}>
      ×
    </button>
  );
}

const REVEAL_EXIT_MS = 200;

function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const lastChildren = useRef(children);

  useEffect(() => {
    if (open) lastChildren.current = children;
  });

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, REVEAL_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted && !open) return null;
  return (
    <div className={`keen-reveal${closing ? " is-closing" : ""}`}>
      <div className="keen-reveal-inner">{open ? children : lastChildren.current}</div>
    </div>
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
    <label className="keen-note">
      <span className="keen-section-label">Any notes?</span>
      <input
        className="input"
        value={note}
        maxLength={80}
        placeholder="e.g. only after 19:00"
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => {
          if (note.trim() !== initialNote) onSave(note.trim());
        }}
      />
    </label>
  );
}

function bookedBy(session: KeenSession, userId: string) {
  const booker = { userId: session.createdById, name: session.createdByName };
  return `Booked by ${displayName(booker, userId)}`;
}

function withKeen(day: KeenDay, userId: string, userName: string, keen: boolean): KeenDay {
  const others = day.keen.filter((player) => player.userId !== userId);
  if (!keen) return { ...day, keen: others };
  const existing = day.keen.find((player) => player.userId === userId);
  return { ...day, keen: [...others, existing ?? { userId, name: userName, note: null }] };
}
