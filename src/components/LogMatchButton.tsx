"use client";

import { useState } from "react";
import { LogMatchSheet } from "@/components/LogMatchSheet";

type Attendee = { id: string; name: string };

export function LogMatchButton({
  sessionId,
  attendees,
}: {
  sessionId: string;
  attendees: Attendee[];
}) {
  const [open, setOpen] = useState(false);
  const disabled = attendees.length < 4;

  return (
    <>
      <button
        type="button"
        className="log-button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <span className="log-plus" aria-hidden>
          +
        </span>
        {disabled ? `Add ${4 - attendees.length} more player${4 - attendees.length === 1 ? "" : "s"}` : "Log a match"}
      </button>
      <LogMatchSheet
        sessionId={sessionId}
        attendees={attendees}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
