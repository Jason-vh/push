"use client";

import Link from "next/link";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

function isCanceledAuthDialog(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "NotAllowedError";
}

export function RegisterForm() {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"idle" | "signup">("idle");
  const [error, setError] = useState<string | null>(null);

  async function signUp() {
    const trimmed = name.trim();
    if (!trimmed || mode !== "idle") return;
    setError(null);
    setMode("signup");
    try {
      const { challengeId, options } = await postJson("/api/auth/register/options", {
        name: trimmed,
      });
      const response = await startRegistration({ optionsJSON: options });
      await postJson("/api/auth/register/verify", { challengeId, response });
      window.location.href = "/";
    } catch (err) {
      if (!isCanceledAuthDialog(err)) {
        setError(err instanceof Error ? err.message : "Could not sign up");
      }
    } finally {
      setMode("idle");
    }
  }

  return (
    <>
      <div className="auth-name-field">
        <label htmlFor="register-name">What we&apos;ll call you</label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") signUp();
          }}
          placeholder="Your name"
        />
      </div>
      <div className="auth-actions">
        {error ? <div className="error auth-error">{error}</div> : null}
        <button
          type="button"
          className="btn dark full"
          onClick={signUp}
          disabled={!name.trim() || mode !== "idle"}
        >
          {mode === "signup" ? "Creating account…" : "Create account"}
        </button>
        <Link className="auth-toggle" href="/login">
          Sign in instead
        </Link>
      </div>
    </>
  );
}
