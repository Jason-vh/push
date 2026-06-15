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

  return (
    <>
      <button
        type="button"
        className="btn full"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="log-plus" aria-hidden>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M4 0h2v10H4z M0 4h10v2H0z" />
          </svg>
        </span>
        Log a match
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
