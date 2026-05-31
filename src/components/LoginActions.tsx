"use client";

import Link from "next/link";
import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

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

export function LoginActions() {
  const [mode, setMode] = useState<"idle" | "signin">("idle");
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    setMode("signin");
    try {
      const { challengeId, options } = await postJson("/api/auth/login/options", {});
      const response = await startAuthentication({ optionsJSON: options });
      await postJson("/api/auth/login/verify", { challengeId, response });
      window.location.href = "/";
    } catch (err) {
      if (!isCanceledAuthDialog(err)) {
        setError(err instanceof Error ? err.message : "Could not sign in");
      }
    } finally {
      setMode("idle");
    }
  }

  return (
    <div className="auth-actions">
      {error ? <div className="error auth-error">{error}</div> : null}
      <button
        type="button"
        className="btn dark full"
        onClick={signIn}
        disabled={mode !== "idle"}
      >
        {mode === "signin" ? (
          <span className="button-spinner" aria-hidden="true" />
        ) : null}
        {mode === "signin" ? "Logging in…" : "Log in"}
      </button>
      <Link className="auth-toggle" href="/register">
        Create an account
      </Link>
    </div>
  );
}
