"use client";

import { useState, type FormEvent } from "react";

export function InviteEmailForm({ email }: { email: string | null }) {
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
        <h2>Calendar invites</h2>
        {saved ? <span className="panel-note">On</span> : null}
      </div>
      <p className="help invite-email-help">
        {saved
          ? "Every session you're playing lands in your calendar. Clear the address to stop."
          : "Add your email to get every session you're playing in your calendar."}
      </p>
      <form className="invite-email-form" onSubmit={save}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="you@example.com"
          aria-label="Email for calendar invites"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className="btn" disabled={!hasChanged || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </form>
      {error ? <div className="error invite-email-error">{error}</div> : null}
    </section>
  );
}
