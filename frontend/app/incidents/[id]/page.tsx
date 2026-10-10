"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AgentLog, { agentLabel } from "@/components/AgentLog";
import Sparkline from "@/components/Sparkline";
import { getHistory } from "@/lib/api";
import { STATUS_LABEL, litres } from "@/lib/format";
import type { HistoryPoint } from "@/lib/types";
import { useIncident } from "@/lib/useCampus";

const CAUSE: Record<string, string> = {
  riser_leak: "Riser leak", tank_overflow: "Tank overflow", scheduled_use: "Scheduled use", unknown: "Unknown",
};
const ACTION: Record<string, string> = {
  close_valve: "Closed valve V2", stop_pump: "Stopped the pump", none: "None needed", escalate: "Escalated to staff",
};

export default function IncidentPage() {
  const { id } = useParams<{ id: string }>();
  const { incident, error } = useIncident(id);
  const [hist, setHist] = useState<HistoryPoint[]>([]);
  const building = incident?.building_id;
  const open = incident?.status === "investigating";

  useEffect(() => {
    if (!building) return;
    let alive = true;
    const load = () => getHistory(building, 90).then((h) => alive && setHist(h)).catch(() => undefined);
    load();
    const t = open ? setInterval(load, 2500) : undefined;
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, [building, open]);

  if (error && !incident) return <main className="container"><div className="banner-err" style={{ marginTop: 32 }}>{error}</div></main>;
  if (!incident) return <main className="container"><p className="muted" style={{ paddingTop: 32 }}>Loading the incident...</p></main>;

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <p className="small"><Link href="/dashboard" style={{ color: "var(--lagoon)" }}>Back to the dashboard</Link></p>
          <h1 style={{ marginTop: 10 }}>{incident.building_name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>{incident.detect_text}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`chip ${incident.status === "resolved" ? "ok" : incident.status === "investigating" ? "alert" : incident.status === "dismissed" ? "info" : "warn"}`}>{STATUS_LABEL[incident.status]}</span>
          <span className="chip">{agentLabel(incident.agent)}</span>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="v num" style={{ fontSize: 24 }}>{incident.opened_clock}</div><div className="l">Detected{incident.closed_clock ? `, closed ${incident.closed_clock}` : ""}</div></div>
        <div className="kpi"><div className="v num" style={{ fontSize: 24 }}>{incident.cause ? CAUSE[incident.cause] ?? incident.cause : "Working"}</div><div className="l">Cause the agent found</div></div>
        <div className="kpi"><div className="v num" style={{ fontSize: 24 }}>{incident.action ? ACTION[incident.action] ?? incident.action : "Pending"}</div><div className="l">Action taken</div></div>
        <div className="kpi"><div className="v num" style={{ fontSize: 24 }}>{litres(incident.loss_l)}</div><div className="l">Water lost before the fix</div></div>
      </div>

      <div className="dash">
        <section className="panel" aria-label="Agent timeline">
          <h2 style={{ fontSize: 20 }}>What the agent did</h2>
          <p className="small muted" style={{ margin: "6px 0 0" }}>Open Evidence on any step to see the exact numbers its tool returned.</p>
          <AgentLog incident={incident} />
        </section>
        <aside>
          <h2 style={{ fontSize: 20 }}>Sensors around the incident</h2>
          <div className="spark-head"><strong>Outflow, L/min</strong></div>
          <Sparkline values={hist.map((h) => h.outflow)} color="var(--lagoon)" label="Outflow around the incident" />
          <div className="spark-head"><strong>Inflow, L/min</strong></div>
          <Sparkline values={hist.map((h) => h.inflow)} color="var(--amber)" label="Inflow around the incident" />
          <div className="spark-head"><strong>Tank level, %</strong></div>
          <Sparkline values={hist.map((h) => h.level)} max={100} color="var(--kelp)" label="Tank level around the incident" />
        </aside>
      </div>
    </main>
  );
}
