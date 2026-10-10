import type { Building, IncidentSummary } from "./types";

export const litres = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} kL` : `${Math.round(n)} L`);

export function alertKind(b: Building, incidents: IncidentSummary[]): "leak" | "overflow" | null {
  if (b.status !== "alert") return null;
  const mine = incidents.filter((i) => i.building_id === b.id);
  const inc = mine.find((i) => i.status === "investigating") || mine[0];
  if (!inc) return "leak";
  return inc.kind === "tank_overflow" ? "overflow" : "leak";
}

export const STATUS_LABEL: Record<string, string> = {
  investigating: "Investigating",
  resolved: "Stabilized",
  dismissed: "Dismissed",
  escalated: "Escalated",
};
