"use client";

import { useEffect, useState } from "react";
import {
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
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

export function AuthPanel() {
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"idle" | "signup" | "signin">("idle");
  const [error, setError] = useState<string | null>(null);

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
        window.location.reload();
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

  async function signUp() {
    setError(null);
    setMode("signup");
    try {
      const { challengeId, options } = await postJson("/api/auth/register/options", {
        email,
        name,
      });
      const response = await startRegistration({ optionsJSON: options });
      await postJson("/api/auth/register/verify", { challengeId, response });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up");
    } finally {
      setMode("idle");
    }
  }

  async function signIn() {
    setError(null);
    setMode("signin");
    try {
      const { challengeId, options } = await postJson("/api/auth/login/options", {});
      const response = await startAuthentication({ optionsJSON: options });
      await postJson("/api/auth/login/verify", { challengeId, response });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setMode("idle");
    }
  }

  return (
    <div className="card stack">
      <h2>{authView === "signin" ? "Sign in" : "Create account"}</h2>

      {error ? <div className="error">{error}</div> : null}

      {authView === "signup" ? (
        <>
          <label className="label">
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="label">
            Name
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </label>
        </>
      ) : null}

      {authView === "signin" ? (
        <div className="stack">
          <button
            className={`btn dark full login-button ${mode === "signin" ? "is-loading" : ""}`}
            onClick={signIn}
            disabled={mode !== "idle"}
          >
            <span>{mode === "signin" ? "Opening court…" : "Log in"}</span>
          </button>
          <button
            className="btn secondary full"
            onClick={() => {
              setError(null);
              setAuthView("signup");
            }}
            disabled={mode !== "idle"}
          >
            Create account
          </button>
        </div>
      ) : (
        <div className="stack">
          <button
            className="btn dark full"
            onClick={signUp}
            disabled={!email || !name || mode !== "idle"}
          >
            {mode === "signup" ? "Creating account…" : "Create account"}
          </button>
          <button
            className="btn secondary full"
            onClick={() => {
              setError(null);
              setAuthView("signin");
            }}
            disabled={mode !== "idle"}
          >
            Sign in instead
          </button>
        </div>
      )}
    </div>
  );
}
