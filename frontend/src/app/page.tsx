"use client";

import { useCallback, useEffect, useState } from "react";
import { HealthStatus } from "@/components/health-status";
import { LiveFeedScreen } from "@/components/live-feed-screen";
import { InvestigationScreen } from "@/components/investigation-screen";
import { ConfidenceScreen, type ConfidencePoint } from "@/components/confidence-screen";
import {
  detectClusters,
  fetchFeed,
  generateHypotheses,
  listHypotheses,
  processReports,
  replayNext,
  seedReports,
  type ClusterOut,
  type EvidenceCheckOut,
  type FeedItem,
  type HypothesisOut,
} from "@/lib/api";

type Tab = "feed" | "investigate" | "confidence";

export default function Home() {
  const [tab, setTab] = useState<Tab>("feed");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [clusters, setClusters] = useState<ClusterOut[]>([]);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [hypotheses, setHypotheses] = useState<HypothesisOut[]>([]);
  const [evidenceChecks, setEvidenceChecks] = useState<EvidenceCheckOut[]>([]);
  const [history, setHistory] = useState<ConfidencePoint[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeCluster = clusters.find((c) => c.id === activeClusterId) ?? null;

  const refreshFeed = useCallback(async () => {
    try {
      setFeed(await fetchFeed(40));
    } catch {
      /* backend not up yet */
    }
  }, []);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const handleSeed = () =>
    run("seed", async () => {
      const r = await seedReports();
      setMessage(`Seeded ${r.inserted} reports`);
      await refreshFeed();
    });

  const handleProcess = () =>
    run("process", async () => {
      const r = await processReports(292);
      setMessage(`Processed ${r.processed} reports (${r.fallback_used} fallback)`);
      await refreshFeed();
    });

  const handleDetect = () =>
    run("detect", async () => {
      const result = await detectClusters();
      setClusters(result);
      const top = result[0] ?? null;
      setActiveClusterId(top?.id ?? null);
      if (top?.hypotheses_generated) {
        const hyps = await listHypotheses(top.id);
        setHypotheses(hyps);
        setHistory((prev) =>
          prev.length > 0 ? prev : [{ step: 0, ...Object.fromEntries(hyps.map((h) => [h.id, h.confidence])) }]
        );
      }
      setMessage(
        top
          ? `${result.length} cluster(s). Top: ${top.location_name} @ ${(top.anomaly_score * 100).toFixed(0)}%`
          : "No clusters found yet"
      );
    });

  const handleGenerateHypotheses = () =>
    run("hypotheses", async () => {
      if (!activeClusterId) return;
      const hyps = await generateHypotheses(activeClusterId);
      setHypotheses(hyps);
      setHistory([{ step: 0, ...Object.fromEntries(hyps.map((h) => [h.id, h.confidence])) }]);
      setTab("investigate");
      setMessage(`Generated ${hyps.length} competing hypotheses`);
    });

  const handleReplayNext = () =>
    run("replay", async () => {
      const result = await replayNext();
      if (!result) {
        setMessage("No more held-back reports to replay");
        return;
      }
      setRemaining(result.remaining_unprocessed);
      await refreshFeed();

      if (result.cluster) {
        setClusters((prev) => {
          const idx = prev.findIndex((c) => c.id === result.cluster!.id);
          if (idx === -1) return [...prev, result.cluster!];
          const copy = [...prev];
          copy[idx] = result.cluster!;
          return copy;
        });
      }

      if (result.hypotheses.length > 0) {
        setHypotheses(result.hypotheses);
        setEvidenceChecks((prev) => [...prev, ...result.evidence_checks]);
        setHistory((prev) => {
          const last = prev[prev.length - 1] ?? {};
          const row: ConfidencePoint = {
            step: prev.length,
            ...Object.fromEntries(result.hypotheses.map((h) => [h.id, h.confidence])),
          };
          // carry forward any hypothesis not touched this step
          for (const key of Object.keys(last)) {
            if (key !== "step" && key !== "event" && !(key in row)) row[key] = last[key];
          }
          if (result.evidence_checks.length > 0) {
            row.event = result.evidence_checks.map((c) => `[${c.outcome}] ${c.reasoning}`).join(" | ");
          }
          return [...prev, row];
        });
      }
      setMessage(`Released report at ${new Date(result.report.reported_at).toLocaleTimeString()} — ${result.evidence_checks.length} evidence check(s)`);
    });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-slate-950">
              P
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">PRISM</h1>
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Early anomaly intelligence from multilingual citizen reports across Bhubaneswar.
          </p>
        </div>
        <HealthStatus />
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-panel-border bg-panel/40 p-3">
        <button onClick={handleSeed} disabled={!!busy} className="btn">
          {busy === "seed" ? "Seeding..." : "1. Seed"}
        </button>
        <button onClick={handleProcess} disabled={!!busy} className="btn">
          {busy === "process" ? "Processing..." : "2. Process (292)"}
        </button>
        <button onClick={handleDetect} disabled={!!busy} className="btn">
          {busy === "detect" ? "Detecting..." : "3. Detect clusters"}
        </button>
        <button onClick={handleGenerateHypotheses} disabled={!!busy || !activeClusterId} className="btn">
          {busy === "hypotheses" ? "Generating..." : "4. Generate hypotheses"}
        </button>
        <button
          onClick={handleReplayNext}
          disabled={!!busy}
          className="btn ml-auto bg-gradient-to-r from-accent to-accent-2 text-slate-950"
        >
          {busy === "replay" ? "..." : "▶ Simulate next update"}
        </button>
        {remaining !== null && <span className="text-xs text-slate-500">{remaining} held back</span>}
      </div>

      {message && <div className="rounded-lg border border-panel-border bg-black/20 px-3 py-2 text-xs text-slate-400">{message}</div>}

      <div className="flex gap-1 border-b border-panel-border">
        {(["feed", "investigate", "confidence"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-accent text-slate-50" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "feed" ? "Live Event Feed" : t === "investigate" ? "Investigation" : "Confidence Evolution"}
          </button>
        ))}
      </div>

      {tab === "feed" && <LiveFeedScreen feed={feed} />}
      {tab === "investigate" && (
        <InvestigationScreen cluster={activeCluster} hypotheses={hypotheses} evidenceChecks={evidenceChecks} />
      )}
      {tab === "confidence" && <ConfidenceScreen hypotheses={hypotheses} history={history} />}

      <footer className="mt-auto pt-6 text-center text-xs text-slate-600">
        Seed → Process → Detect clusters → Generate hypotheses → Simulate next update.
      </footer>
    </div>
  );
}
