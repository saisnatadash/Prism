"use client";

import type { ClusterOut, EvidenceCheckOut, HypothesisOut } from "@/lib/api";

export const ANOMALY_THRESHOLD = 0.6; // must match backend app/anomaly_scoring.py

function PredictionStatus({
  prediction,
  checks,
}: {
  prediction: string;
  checks: EvidenceCheckOut[];
}) {
  const match = checks.find((c) => c.predicted_evidence === prediction);
  if (!match) return <span className="text-slate-500">○ pending</span>;
  if (match.outcome === "SUPPORTS") return <span className="text-emerald-400">✓ confirmed</span>;
  if (match.outcome === "CONTRADICTS") return <span className="text-red-400">✗ contradicted</span>;
  return <span className="text-slate-500">○ pending</span>;
}

function HypothesisCard({ h, checks }: { h: HypothesisOut; checks: EvidenceCheckOut[] }) {
  const d = h.details || {};
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-panel-border bg-panel/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{h.statement}</h3>
        <span className="rounded-full bg-accent/15 px-2 py-1 font-mono text-xs font-bold text-accent">
          {h.confidence.toFixed(0)}%
        </span>
      </div>

      {!!d.supporting_evidence?.length && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Supporting evidence</p>
          <ul className="space-y-1">
            {d.supporting_evidence.map((e, i) => (
              <li key={i} className="rounded border border-solid border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-xs text-slate-300">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!d.assumptions?.length && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Assumptions (unobserved)</p>
          <ul className="space-y-1">
            {d.assumptions.map((e, i) => (
              <li key={i} className="rounded border border-dashed border-amber-500/40 bg-amber-500/5 px-2 py-1 text-xs text-slate-400">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!d.contradicting_evidence?.length && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Contradicting evidence</p>
          <ul className="space-y-1">
            {d.contradicting_evidence.map((e, i) => (
              <li key={i} className="rounded border border-solid border-red-500/30 bg-red-500/5 px-2 py-1 text-xs text-slate-300">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!d.predictions?.length && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Predictions</p>
          <ul className="space-y-1 text-xs text-slate-300">
            {d.predictions.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded bg-black/20 px-2 py-1">
                <span>{p}</span>
                <PredictionStatus prediction={p} checks={checks} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function InvestigationScreen({
  cluster,
  hypotheses,
  evidenceChecks,
}: {
  cluster: ClusterOut | null;
  hypotheses: HypothesisOut[];
  evidenceChecks: EvidenceCheckOut[];
}) {
  if (!cluster) {
    return (
      <div className="rounded-xl border border-panel-border bg-panel/40 p-10 text-center text-sm text-slate-500">
        No cluster yet — seed, process, then run &ldquo;Detect clusters&rdquo;.
      </div>
    );
  }

  const pct = Math.round(cluster.anomaly_score * 100);
  const overThreshold = cluster.anomaly_score >= ANOMALY_THRESHOLD;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-panel-border bg-panel/50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {cluster.location_name} · {cluster.category ?? "unclassified"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{cluster.anomaly_explanation}</p>
          </div>
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 text-sm font-bold ${
              overThreshold ? "border-red-500 text-red-400" : "border-amber-500 text-amber-400"
            }`}
          >
            {pct}%
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className={`h-full ${overThreshold ? "bg-red-500" : "bg-amber-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!overThreshold && (
          <p className="mt-2 text-xs text-slate-500">
            Below the {Math.round(ANOMALY_THRESHOLD * 100)}% threshold — hypotheses generate once it crosses.
          </p>
        )}
      </div>

      {hypotheses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {hypotheses
            .slice()
            .sort((a, b) => b.confidence - a.confidence)
            .map((h) => (
              <HypothesisCard key={h.id} h={h} checks={evidenceChecks.filter((c) => c.hypothesis_id === h.id)} />
            ))}
        </div>
      )}
    </div>
  );
}
