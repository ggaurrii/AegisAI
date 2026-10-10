export type Status = "ok" | "alert" | "fixed";

export interface Maintenance {
  label: string;
  from_sm: number;
  until_sm: number;
}

export interface Building {
  id: string;
  name: string;
  kind: string;
  ord: number;
  capacity_l: number;
  level_pct: number;
  inflow_lpm: number;
  outflow_lpm: number;
  baseline_out_lpm: number;
  pump_on: boolean;
  pump_override: string | null;
  valve: "open" | "closed";
  status: Status;
  lost_l: number;
  spilled_l: number;
  maintenance: Maintenance | null;
}

export type Phase = "detect" | "investigate" | "decide" | "act" | "verify" | "summary";

export interface Step {
  n: number;
  phase: Phase;
  title: string;
  text: string;
  tool: string | null;
  data: Record<string, unknown>;
  clock: string;
}

export type IncidentStatus = "investigating" | "resolved" | "dismissed" | "escalated";

export interface IncidentSummary {
  id: string;
  building_id: string;
  building_name: string;
  kind: "high_outflow" | "tank_overflow";
  status: IncidentStatus;
  opened_clock: string;
  closed_clock: string | null;
  steps_count: number;
  last_phase: Phase | null;
  cause: string | null;
  action: string | null;
  summary: string | null;
  agent: string | null;
  loss_l: number;
}

export interface Incident extends IncidentSummary {
  steps: Step[];
  detect_text: string;
}

export interface CampusEvent {
  id: string;
  kind: "notification" | "incident" | "report" | "simulation" | "system";
  text: string;
  severity?: string;
  building_id?: string;
  clock?: string;
  category?: string;
  ts_ms: number;
}

export interface CampusState {
  sm: number;
  clock: string;
  speedup: number;
  agent_mode: string;
  buildings: Building[];
  incidents: IncidentSummary[];
  events: CampusEvent[];
  kpis: {
    buildings: number;
    active_incidents: number;
    resolved_incidents: number;
    avg_level_pct: number;
    water_lost_l: number;
  };
}

export interface HistoryPoint {
  sm: number;
  clock: string;
  level: number;
  inflow: number;
  outflow: number;
  pump: boolean;
}

export type ScenarioKind = "leak" | "overflow" | "flush";
