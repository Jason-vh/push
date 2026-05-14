"use client";

import { useEffect, useState } from "react";

const REVEAL_FLAG = "push:play-dashboard-reveal";

export function queueDashboardReveal() {
  window.sessionStorage.setItem(REVEAL_FLAG, "1");
}

export function DashboardReveal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(REVEAL_FLAG) !== "1") return;

    window.sessionStorage.removeItem(REVEAL_FLAG);
    setShow(true);

    const timeout = window.setTimeout(() => setShow(false), 1250);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!show) return null;

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
