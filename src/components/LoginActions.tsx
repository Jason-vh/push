"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  browserSupportsWebAuthnAutofill,
  startAuthentication,
} from "@simplewebauthn/browser";

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

  function enterApp() {
    window.location.href = "/";
  }

  useEffect(() => {
    let cancelled = false;

    async function startConditionalSignIn() {
      try {
        const supportsAutofill = await browserSupportsWebAuthnAutofill();
        if (!supportsAutofill || cancelled) return;

        const { challengeId, options } = await postJson("/api/auth/login/options", {});
        const response = await startAuthentication({
          optionsJSON: options,
          useBrowserAutofill: true,
        });

        if (cancelled) return;
        await postJson("/api/auth/login/verify", { challengeId, response });
        enterApp();
      } catch (err) {
        const errorName = err instanceof Error ? err.name : null;
        if (errorName !== "AbortError" && errorName !== "NotAllowedError") {
          console.debug("Conditional sign-in unavailable", err);
        }
      }
    }

    startConditionalSignIn();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn() {
    setError(null);
    setMode("signin");
    try {
      const { challengeId, options } = await postJson("/api/auth/login/options", {});
      const response = await startAuthentication({ optionsJSON: options });
      await postJson("/api/auth/login/verify", { challengeId, response });
      enterApp();
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
