import { HealthStatus } from "@/components/health-status";
import { ReportsDashboard } from "@/components/reports-dashboard";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-slate-950">
              P
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">PRISM</h1>
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Early anomaly intelligence from multilingual citizen reports — English,
            Hindi &amp; Odia — clustered by meaning, geography, and time across Bhubaneswar.
          </p>
        </div>
        <HealthStatus />
      </header>

      <ReportsDashboard />

      <footer className="mt-auto pt-6 text-center text-xs text-slate-600">
        Simulated citizen-report ingestion · structured extraction, clustering &amp; hypothesis
        generation coming next.
      </footer>
    </div>
  );
}
