"use client";

import { useState, type FormEvent } from "react";

export function EmailSettings({ email }: { email: string | null }) {
  const [value, setValue] = useState(email ?? "");
  const [saved, setSaved] = useState(email ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanged = value.trim().toLowerCase() !== saved;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!hasChanged || isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save");
      setSaved(data.email ?? "");
      setValue(data.email ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card-panel">
      <div className="panel-head">
        <h2>Email</h2>
      </div>
      <p className="help email-settings-help">
        {saved
          ? "Calendar invites for every session you're playing go here. Clear it to stop them."
          : "Add your email to get calendar invites for every session you're playing."}
      </p>
      <form className="email-settings-form" onSubmit={save}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="you@example.com"
          aria-label="Email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className="btn" disabled={!hasChanged || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </form>
      {error ? <div className="error email-settings-error">{error}</div> : null}
    </section>
  );
}
