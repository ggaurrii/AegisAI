import type { CampusState, HistoryPoint, Incident, ScenarioKind } from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(8000), // a hung request must never freeze the dashboard
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body as T;
}

export const getState = () => call<CampusState>("/state");
export const getIncident = (id: string) => call<Incident>(`/incidents/${id}`);
export const getHistory = (id: string, minutes = 30) =>
  call<{ readings: HistoryPoint[] }>(`/buildings/${id}/history?minutes=${minutes}`).then((r) => r.readings);
export const runScenario = (type: ScenarioKind, building_id: string) =>
  call<CampusState>("/scenario", { method: "POST", body: JSON.stringify({ type, building_id }) });
export const resetCampus = () => call<CampusState>("/scenario/reset", { method: "POST", body: "{}" });
export const sendReport = (building_id: string, text: string, category: string) =>
  call("/reports", { method: "POST", body: JSON.stringify({ building_id, text, category }) });
