"use client";

export function LogoutButton() {
  return (
    <button
      className="btn secondary"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.reload();
      }}
    >
      Sign out
    </button>
  );
}
