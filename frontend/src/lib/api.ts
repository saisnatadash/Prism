export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

export type ReportOut = {
  id: string;
  source_language: string;
  raw_text: string;
  reporter_channel: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  reported_at: string;
};

export type ReportStats = {
  total: number;
  languages: number;
  wards: number;
  earliest: string | null;
  latest: string | null;
};

export type SeedResult = {
  inserted: number;
  by_language: Record<string, number>;
  by_ward: Record<string, number>;
  time_range: [string, string];
};

export type ProcessResult = {
  considered: number;
  processed: number;
  fallback_used: number;
  duration_seconds: number;
};

export type ClusterOut = {
  id: string;
  category: string | null;
  representative_summary: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  report_count: number;
  anomaly_score: number;
  status: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  anomaly_explanation: string | null;
  hypotheses_generated: boolean;
};

export type HypothesisDetails = {
  supporting_evidence?: string[];
  contradicting_evidence?: string[];
  assumptions?: string[];
  predictions?: string[];
};

export type HypothesisOut = {
  id: string;
  cluster_id: string;
  statement: string;
  rationale: string | null;
  confidence: number;
  status: string;
  details: HypothesisDetails;
  created_at: string;
  updated_at: string;
};

export type EvidenceCheckOut = {
  id: string;
  hypothesis_id: string;
  predicted_evidence: string;
  outcome: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  old_confidence: number | null;
  new_confidence: number | null;
  reasoning: string | null;
  match_score: number | null;
  checked_at: string;
};

export type StructuredSignalOut = {
  id: string;
  report_id: string;
  category: string | null;
  severity_hint: string | null;
  entities: Record<string, unknown>;
};

export type ReplayResult = {
  report: ReportOut;
  signal: StructuredSignalOut;
  cluster: ClusterOut | null;
  hypotheses: HypothesisOut[];
  evidence_checks: EvidenceCheckOut[];
  remaining_unprocessed: number;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${path} responded with ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function fetchHealth() {
  return apiFetch<{ status: string }>("/health");
}

export function fetchReports(limit = 30) {
  return apiFetch<ReportOut[]>(`/api/reports?limit=${limit}`);
}

export type FeedItem = {
  report: ReportOut;
  signal: { category: string | null; severity_hint: string | null; entities: Record<string, unknown> } | null;
};

export function fetchFeed(limit = 40) {
  return apiFetch<FeedItem[]>(`/api/reports/feed?limit=${limit}`);
}

export function fetchStats() {
  return apiFetch<ReportStats>("/api/reports/stats");
}

export function seedReports() {
  return apiFetch<SeedResult>("/api/reports/seed", { method: "POST" });
}

export function processReports(limit?: number) {
  const qs = limit ? `?limit=${limit}` : "";
  return apiFetch<ProcessResult>(`/api/reports/process${qs}`, { method: "POST" });
}

export function detectClusters() {
  return apiFetch<ClusterOut[]>("/api/clusters/detect", { method: "POST" });
}

export function generateHypotheses(clusterId: string) {
  return apiFetch<HypothesisOut[]>(`/api/clusters/${clusterId}/hypotheses`, { method: "POST" });
}

export function listHypotheses(clusterId: string) {
  return apiFetch<HypothesisOut[]>(`/api/clusters/${clusterId}/hypotheses`);
}

export function replayNext() {
  return apiFetch<ReplayResult | null>("/api/replay/next", { method: "POST" });
}
