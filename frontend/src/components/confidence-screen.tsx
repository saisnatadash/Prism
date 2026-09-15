"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HypothesisOut } from "@/lib/api";

export type ConfidencePoint = {
  step: number;
  event?: string;
} & Record<string, number | string | undefined>;

const LINE_COLORS = ["#22d3ee", "#818cf8", "#f472b6"];

export function ConfidenceScreen({
  hypotheses,
  history,
}: {
  hypotheses: HypothesisOut[];
  history: ConfidencePoint[];
}) {
  if (hypotheses.length === 0 || history.length === 0) {
    return (
      <div className="rounded-xl border border-panel-border bg-panel/40 p-10 text-center text-sm text-slate-500">
        No confidence history yet — generate hypotheses, then click &ldquo;Simulate next update&rdquo; a few times.
      </div>
    );
  }

  const events = history.filter((h) => h.event);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-panel-border bg-panel/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Confidence evolution</h2>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
              <XAxis dataKey="step" stroke="#64748b" fontSize={12} label={{ value: "replay step", position: "insideBottom", offset: -3, fill: "#64748b", fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#0d1220", border: "1px solid #1e2740", fontSize: 12 }}
                labelStyle={{ color: "#e7ecf5" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {hypotheses.map((h, i) => (
                <Line
                  key={h.id}
                  type="monotone"
                  dataKey={h.id}
                  name={h.statement.slice(0, 28)}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {events.length > 0 && (
        <div className="rounded-xl border border-panel-border bg-panel/40 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Change points</h3>
          <ul className="space-y-1.5">
            {events.map((e, i) => (
              <li key={i} className="text-xs text-slate-400">
                <span className="font-mono text-slate-500">step {e.step}:</span> {e.event}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
