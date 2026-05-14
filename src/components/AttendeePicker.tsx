"use client";

import { useMemo, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";

type KnownPlayer = { email: string; name: string | null };

export function AttendeePicker({
  knownPlayers,
  value,
  onChange,
}: {
  knownPlayers: KnownPlayer[];
  value: string[];
  onChange: (emails: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const selected = useMemo(() => new Set(value.map(normalizeEmail)), [value]);
  const suggestions = useMemo(
    () =>
      knownPlayers
        .filter((player) => !selected.has(normalizeEmail(player.email)))
        .map((player) => player.email),
    [knownPlayers, selected],
  );

  function addEmail(email: string) {
    const normalized = normalizeEmail(email);
    if (!isEmail(normalized) || selected.has(normalized)) return;

    onChange([...value, normalized]);
    setInputValue("");
  }

  function removeEmail(email: string) {
    const normalized = normalizeEmail(email);
    onChange(value.filter((attendeeEmail) => normalizeEmail(attendeeEmail) !== normalized));
  }

  return (
    <div className="attendee-picker">
      <Autocomplete.Root
        items={suggestions}
        value={inputValue}
        onValueChange={setInputValue}
        openOnInputClick
      >
        <form
          className="attendee-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            addEmail(inputValue);
          }}
        >
          <Autocomplete.InputGroup className="attendee-autocomplete-group">
            <Autocomplete.Input className="input" placeholder="friend@example.com" type="email" />
          </Autocomplete.InputGroup>
          <button className="btn secondary" type="submit" disabled={!isEmail(inputValue)}>
            Add
          </button>
        </form>

        <Autocomplete.Portal>
          <Autocomplete.Positioner className="attendee-positioner" sideOffset={8}>
            <Autocomplete.Popup className="attendee-popup">
              <Autocomplete.List>
                {(email: string) => {
                  const player = knownPlayers.find(
                    (knownPlayer) => normalizeEmail(knownPlayer.email) === normalizeEmail(email),
                  );

                  return (
                    <Autocomplete.Item
                      className="attendee-option"
                      key={email}
                      value={email}
                      onClick={() => addEmail(email)}
                    >
                      <strong>{player?.name ?? email}</strong>
                      {player?.name ? <span>{email}</span> : null}
                    </Autocomplete.Item>
                  );
                }}
              </Autocomplete.List>
              <Autocomplete.Empty className="attendee-empty">
                No matching players.
              </Autocomplete.Empty>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>

      {value.length > 0 ? (
        <div className="chip-list">
          {value.map((email) => {
            const player = knownPlayers.find(
              (knownPlayer) => normalizeEmail(knownPlayer.email) === normalizeEmail(email),
            );
            return (
              <span className="attendee-chip" key={email}>
                {player?.name ?? email}
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  aria-label={`Remove ${email}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <div className="empty compact">No players yet.</div>
      )}
    </div>
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}
