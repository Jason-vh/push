"use client";

import { Avatar } from "@/components/Avatar";

type KnownUser = { id: string; name: string };

export function PlayerCheckList({
  knownUsers,
  value,
  onChange,
  lockedUserIds,
}: {
  knownUsers: KnownUser[];
  value: string[];
  onChange: (userIds: string[]) => void;
  lockedUserIds?: Set<string>;
}) {
  const selected = new Set(value);

  function toggle(userId: string) {
    if (lockedUserIds?.has(userId)) return;
    if (selected.has(userId)) onChange(value.filter((id) => id !== userId));
    else onChange([...value, userId]);
  }

  return (
    <ul className="player-check-list">
      {knownUsers.map((user) => {
        const isSelected = selected.has(user.id);
        const isLocked = lockedUserIds?.has(user.id) ?? false;
        return (
          <li key={user.id}>
            <button
              type="button"
              className={`player-check-row${isSelected ? " selected" : ""}${
                isLocked ? " locked" : ""
              }`}
              onClick={() => toggle(user.id)}
              aria-pressed={isSelected}
              aria-disabled={isLocked || undefined}
            >
              <Avatar name={user.name} size={32} />
              <span className="player-check-name">{user.name}</span>
              {isLocked ? (
                <span className="player-check-badge" aria-label="Played matches in this session">
                  Played
                </span>
              ) : (
                <span className="player-check-pip" aria-hidden>
                  {isSelected ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6.5L5 9L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
