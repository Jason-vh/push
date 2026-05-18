"use client";

import { useMemo, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";

type KnownUser = { id: string; name: string };
type Option = { value: string; label: string };

export function AttendeePicker({
  knownUsers,
  value,
  onChange,
}: {
  knownUsers: KnownUser[];
  value: string[];
  onChange: (userIds: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const suggestions = useMemo<Option[]>(
    () =>
      knownUsers
        .filter((user) => !selected.has(user.id))
        .map((user) => ({ value: user.id, label: user.name })),
    [knownUsers, selected],
  );
  const userById = useMemo(() => new Map(knownUsers.map((user) => [user.id, user])), [knownUsers]);

  function addUser(userId: string) {
    if (!userById.has(userId) || selected.has(userId)) return;
    onChange([...value, userId]);
    setInputValue("");
  }

  function removeUser(userId: string) {
    onChange(value.filter((id) => id !== userId));
  }

  return (
    <div className="attendee-picker">
      <Autocomplete.Root
        items={suggestions}
        value={inputValue}
        onValueChange={(newValue, details) => {
          // Picking a suggestion (click or Enter) fires with reason
          // "item-press" and newValue = the option's label. Intercept it so
          // the label doesn't get stamped into the input, and add the player
          // instead.
          if (details.reason === "item-press") {
            const match = suggestions.find((s) => s.label === newValue);
            if (match) addUser(match.value);
            return;
          }
          setInputValue(newValue);
        }}
        openOnInputClick
      >
        <Autocomplete.InputGroup className="attendee-autocomplete-group">
          <Autocomplete.Input className="input" placeholder="Add a player" />
        </Autocomplete.InputGroup>

        <Autocomplete.Portal>
          <Autocomplete.Positioner className="attendee-positioner" sideOffset={8}>
            <Autocomplete.Popup className="attendee-popup">
              <Autocomplete.List>
                {(option: Option) => (
                  <Autocomplete.Item
                    className="attendee-option"
                    key={option.value}
                    value={option}
                  >
                    <strong>{option.label}</strong>
                  </Autocomplete.Item>
                )}
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
          {value.map((userId) => {
            const user = userById.get(userId);
            const label = user?.name ?? "Unknown";
            return (
              <span className="attendee-chip" key={userId}>
                {label}
                <button
                  type="button"
                  onClick={() => removeUser(userId)}
                  aria-label={`Remove ${label}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
