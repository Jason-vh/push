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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"idle" | "signup" | "signin">("idle");
  const [error, setError] = useState<string | null>(null);
  const [autofillAvailable, setAutofillAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startConditionalSignIn() {
      try {
        const supportsAutofill = await browserSupportsWebAuthnAutofill();
        if (!supportsAutofill || cancelled) return;

        setAutofillAvailable(true);
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
          console.debug("Conditional passkey sign-in unavailable", err);
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
      const { challengeId, options } = await postJson("/api/auth/login/options", { email });
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
      <div>
        <span className="pill">Passkey auth</span>
        <h2 style={{ marginTop: 14 }}>Join the group</h2>
        <p className="muted">
          Use your email so historic matches can link to your account when you sign up.
        </p>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <label className="label">
        Email
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="username webauthn"
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

      {autofillAvailable ? (
        <p className="help">
          If you already have a passkey, select it from your browser’s sign-in suggestion.
        </p>
      ) : null}

      <div className="row wrap">
        <button className="btn dark" onClick={signUp} disabled={!email || mode !== "idle"}>
          {mode === "signup" ? "Creating passkey…" : "Sign up with passkey"}
        </button>
        <button className="btn secondary" onClick={signIn} disabled={!email || mode !== "idle"}>
          {mode === "signin" ? "Checking passkey…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
