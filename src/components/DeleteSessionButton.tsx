"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "armed" | "deleting";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const disarmTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    };
  }, []);

  async function onClick() {
    if (status === "deleting") return;

    if (status === "idle") {
      setStatus("armed");
      setError(null);
      disarmTimer.current = window.setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    setStatus("deleting");
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete session");
      router.push("/");
      router.refresh();
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not delete session");
    }
  }

  const label =
    status === "deleting"
      ? "Deleting…"
      : status === "armed"
      ? "Tap again to confirm"
      : "Delete session";

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        className={`btn danger full${status === "armed" ? " armed" : ""}`}
        onClick={onClick}
        disabled={status === "deleting"}
      >
        {label}
      </button>
      {error ? <div className="error" style={{ marginTop: 8 }}>{error}</div> : null}
    </div>
  );
}
