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

function isCanceledAuthDialog(error: unknown) {
  if (!(error instanceof Error)) return false;

  return error.name === "AbortError" || error.name === "NotAllowedError";
}

export function AuthPanel() {
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"idle" | "signup" | "signin">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(false);

  function enterApp() {
    setIsEntering(true);
    window.setTimeout(() => {
      window.location.href = "/";
    }, 1150);
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
      enterApp();
    } catch (err) {
      if (!isCanceledAuthDialog(err)) {
        setError(err instanceof Error ? err.message : "Could not sign up");
      }
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
    <>
      {isEntering ? <CourtReveal /> : null}
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
            <button className="btn dark full" onClick={signIn} disabled={mode !== "idle"}>
              {mode === "signin" ? <span className="button-spinner" aria-hidden="true" /> : null}
              {mode === "signin" ? "Logging in…" : "Log in"}
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
    </>
  );
}

function CourtReveal() {
  return (
    <div className="court-reveal" aria-hidden="true">
      <div className="court-reveal__mark">P</div>
      <svg className="court-reveal__court" viewBox="0 0 320 520">
        <rect x="34" y="34" width="252" height="452" rx="18" />
        <path d="M34 260H286" />
        <path d="M160 34V486" />
        <path d="M34 146H286" />
        <path d="M34 374H286" />
        <path d="M98 146V374" />
        <path d="M222 146V374" />
      </svg>
    </div>
  );
}
