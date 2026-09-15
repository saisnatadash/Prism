export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`${path} responded with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchHealth() {
  return apiFetch<{ status: string }>("/health");
}

export function fetchReports(limit = 30) {
  return apiFetch<ReportOut[]>(`/api/reports?limit=${limit}`);
}

export function fetchStats() {
  return apiFetch<ReportStats>("/api/reports/stats");
}

export function seedReports() {
  return apiFetch<SeedResult>("/api/reports/seed", { method: "POST" });
}
