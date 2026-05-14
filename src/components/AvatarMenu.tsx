"use client";

import { useState } from "react";

export function AvatarMenu({ initial }: { initial: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="avatar-menu">
      <button className="avatar-button" onClick={() => setOpen((current) => !current)}>
        {initial}
      </button>
      {open ? (
        <div className="avatar-dropdown">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
