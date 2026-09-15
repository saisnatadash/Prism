"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReports, fetchStats, seedReports, type ReportOut, type ReportStats } from "@/lib/api";
import { LanguageBadge } from "@/components/language-badge";
import { StatCard } from "@/components/stat-card";

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
});

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return `${timeFormatter.format(d)} IST · ${dateFormatter.format(d)}`;
}

export function ReportsDashboard() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [reports, setReports] = useState<ReportOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSeed, setLastSeed] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [statsData, reportsData] = await Promise.all([fetchStats(), fetchReports(40)]);
      setStats(statsData);
      setReports(reportsData);
      setError(null);
    } catch {
      setError("Could not reach the PRISM backend. Is it running on " + (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000") + "?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSeed() {
    setSeeding(true);
    setError(null);
    try {
      const result = await seedReports();
      setLastSeed(
        `Loaded ${result.inserted} reports · ${Object.keys(result.by_language).length} languages · ${Object.keys(result.by_ward).length} wards`
      );
      await refresh();
    } catch {
      setError("Seeding failed — check the backend logs.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Reports" value={stats ? stats.total.toLocaleString() : "—"} hint="ingested, raw" />
          <StatCard label="Languages" value={stats ? String(stats.languages) : "—"} hint="en · hi · or" />
          <StatCard label="Wards" value={stats ? String(stats.wards) : "—"} hint="Bhubaneswar" />
          <StatCard
            label="Window"
            value={stats?.earliest ? timeFormatter.format(new Date(stats.earliest)) : "—"}
            hint={stats?.latest ? `to ${timeFormatter.format(new Date(stats.latest))} IST` : undefined}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-panel-border bg-panel/40 p-4">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {seeding ? "Seeding..." : "Seed simulation (300 reports)"}
        </button>
        <span className="text-xs text-slate-500">
          Resets the reports table and reloads the synthetic 24-hour Bhubaneswar dataset.
        </span>
        {lastSeed && <span className="text-xs font-medium text-emerald-400">{lastSeed}</span>}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-panel-border bg-panel/40">
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-200">Live report feed</h2>
          <span className="text-xs text-slate-500">most recent first</span>
        </div>
        <div className="max-h-[520px] divide-y divide-panel-border overflow-y-auto">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              No reports yet. Click &ldquo;Seed simulation&rdquo; to load the dataset.
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="flex gap-3 px-4 py-3 text-sm hover:bg-white/[0.02]">
                <div className="flex w-24 shrink-0 flex-col gap-1 pt-0.5 font-mono text-[11px] text-slate-500">
                  {formatTimestamp(report.reported_at)}
                </div>
                <LanguageBadge language={report.source_language} />
                <div className="min-w-0 flex-1">
                  <p className="truncate-none text-slate-200">{report.raw_text}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{report.location_name}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
