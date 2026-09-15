"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";

type Status = "checking" | "ok" | "error";

export function HealthStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    fetchHealth()
      .then(() => {
        if (!cancelled) setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    status === "checking"
      ? "Connecting..."
      : status === "ok"
        ? "Backend online"
        : "Backend unreachable";

  const dotColor =
    status === "checking"
      ? "bg-amber-400"
      : status === "ok"
        ? "bg-emerald-400"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2 rounded-full border border-panel-border bg-panel/60 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${status === "ok" ? "animate-pulse-dot" : ""}`} />
      {label}
    </div>
  );
}
