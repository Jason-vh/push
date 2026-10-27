"use client";

import { useCallback, useState } from "react";
import { ClockIcon, PinIcon } from "@/components/KeenParts";
import { SessionEditSheet, type EditableSession } from "@/components/SessionEditSheet";
import { endTime } from "@/lib/keenDays";

export function SessionHeader({
  session,
  title,
  whenLabel,
  knownUsers,
  lockedUserIds,
  venueSuggestions,
}: {
  session: EditableSession;
  title: string;
  whenLabel: string | null;
  knownUsers: Array<{ id: string; name: string }>;
  lockedUserIds: string[];
  venueSuggestions: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const closeEditor = useCallback(() => setEditing(false), []);
  const time = timeRange(session.startTime, session.durationMinutes);

  return (
    <header className="session-header">
      <div className="session-header-main">
        {whenLabel ? <div className="session-when">{whenLabel}</div> : null}
        <h1 className="session-title">{title}</h1>
      </div>
      <button
        type="button"
        className="btn-pill subtle"
        onClick={() => {
          setEditorKey((key) => key + 1);
          setEditing(true);
        }}
      >
        Edit
      </button>

      {time || session.venue || session.court ? (
        <div className="session-meta">
          {time ? (
            <span>
              <ClockIcon />
              {time}
            </span>
          ) : null}
          {session.venue || session.court ? (
            <span>
              <PinIcon />
              <span>
                {session.venue}
                {session.venue && session.court ? (
                  <span className="session-meta-soft"> · {session.court}</span>
                ) : (
                  session.court
                )}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      <SessionEditSheet
        key={editorKey}
        session={session}
        knownUsers={knownUsers}
        lockedUserIds={lockedUserIds}
        venueSuggestions={venueSuggestions}
        open={editing}
        onClose={closeEditor}
      />
    </header>
  );
}

function timeRange(startTime: string | null, durationMinutes: number | null) {
  if (!startTime) return null;
  if (!durationMinutes) return startTime;
  return `${startTime}–${endTime(startTime, durationMinutes)}`;
}
