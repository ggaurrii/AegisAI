"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AgentLog, { agentLabel } from "@/components/AgentLog";
import CampusMap, { MapBuilding } from "@/components/CampusMap";
import Sparkline from "@/components/Sparkline";
import { getHistory, resetCampus, runScenario } from "@/lib/api";
import { STATUS_LABEL, alertKind, litres } from "@/lib/format";
import type { HistoryPoint, ScenarioKind } from "@/lib/types";
import { useCampus, useIncident } from "@/lib/useCampus";

const EVENT_LABEL: Record<string, string> = {
  notification: "Alert", incident: "Incident", report: "Student report", simulation: "Simulation", system: "System",
};

export default function Dashboard() {
  const { state, error, setState } = useCampus(1500);
  const [sel, setSel] = useState("hostel-b");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [hist, setHist] = useState<HistoryPoint[]>([]);
  const demoDone = useRef(false);

  const focus = state?.incidents.find((i) => i.status === "investigating") ?? state?.incidents[0] ?? null;
  const { incident } = useIncident(focus?.id ?? null);

  useEffect(() => {
    let alive = true;
    const load = () => getHistory(sel, 20).then((h) => alive && setHist(h)).catch(() => undefined);
    load();
    const t = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [sel]);

  // /dashboard?demo=leak starts the story on its own
  useEffect(() => {
    if (!state || demoDone.current) return;
    const kind = new URLSearchParams(window.location.search).get("demo") as ScenarioKind | null;
    if (!kind) return;
    demoDone.current = true;
    window.history.replaceState(null, "", "/dashboard");
    (async () => {
      try {
        await resetCampus();
        await new Promise((r) => setTimeout(r, 7000)); // let the dashboard show a calm campus first
        setState(await runScenario(kind, "hostel-b"));
        setSel("hostel-b");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Could not start the demo");
      }
    })();
  }, [state, setState]);

  const run = async (kind: ScenarioKind) => {
    setBusy(true);
    setMsg(null);
    try {
      setState(await runScenario(kind, sel));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not start the scenario");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    setMsg(null);
    try {
      setState(await resetCampus());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not reset");
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <main className="container">
        <div className="page-head"><h1>Campus water</h1></div>
        {error ? (
          <div className="banner-err">
            Cannot reach the API at the configured address ({error}). Start the backend with
            {" "}<span className="code">uvicorn local_server:app --port 8000</span>{" "}or set NEXT_PUBLIC_API_BASE_URL.
          </div>
        ) : (
          <p className="muted">Connecting to the campus sensors...</p>
        )}
      </main>
    );
  }

  const mapB: MapBuilding[] = state.buildings.map((b) => ({
    id: b.id, name: b.name, kind: b.kind, level: b.level_pct, alert: alertKind(b, state.incidents),
    fixed: b.status === "fixed", valveClosed: b.valve === "closed", flush: !!b.maintenance,
  }));
  const b = state.buildings.find((x) => x.id === sel) ?? state.buildings[0];
  const pump = b.pump_override === "off" ? "Stopped by agent" : b.pump_on ? "Running" : "Idle";

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Campus water</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Simulated clock {state.clock}. The agent only sees sensor readings, never the fault itself.
          </p>
        </div>
        <span className="chip info">Reasoning: {state.agent_mode === "bedrock" ? "Claude on Bedrock" : "Rule-based planner"}</span>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="v num">{state.kpis.buildings}</div><div className="l">Buildings monitored</div></div>
        <div className="kpi"><div className="v num" style={{ color: state.kpis.active_incidents ? "var(--coral)" : undefined }}>{state.kpis.active_incidents}</div><div className="l">Active incidents</div></div>
        <div className="kpi"><div className="v num">{state.kpis.avg_level_pct}%</div><div className="l">Average tank level</div></div>
        <div className="kpi"><div className="v num">{litres(state.kpis.water_lost_l)}</div><div className="l">Water lost so far</div></div>
      </div>

      {(error || msg) && <div className="banner-err">{msg || `Connection problem: ${error}`}</div>}

      <div className="dash">
        <section aria-label="Campus map">
          <div className="controls">
            <label className="small muted" htmlFor="bsel">Building</label>
            <select id="bsel" className="select" value={sel} onChange={(e) => setSel(e.target.value)}>
              {state.buildings.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => run("leak")}>Simulate leak</button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => run("overflow")}>Simulate overflow</button>
            <button className="btn btn-sm" disabled={busy} onClick={() => run("flush")}>Simulate flush</button>
            <button className="btn btn-sm" disabled={busy} onClick={reset}>Reset</button>
          </div>

          <CampusMap buildings={mapB} selectedId={sel} onSelect={setSel} />
          <div className="map-legend" aria-label="Legend">
            <span><i style={{ background: "var(--lagoon)" }} />Water flowing</span>
            <span><i style={{ background: "var(--coral)" }} />Problem detected</span>
            <span><i style={{ background: "var(--kelp)" }} />Fixed by the agent</span>
            <span><i style={{ background: "var(--amber)" }} />Scheduled maintenance</span>
          </div>

          <div className="facts" aria-label={`${b.name} details`}>
            <div><div className="n num">{Math.round(b.level_pct)}%</div><div className="l">Tank level, {litres(b.capacity_l)} tank</div></div>
            <div><div className="n num" style={{ color: b.outflow_lpm > b.baseline_out_lpm * 3 ? "var(--coral)" : undefined }}>{b.outflow_lpm.toFixed(1)}</div><div className="l">Outflow L/min, baseline {b.baseline_out_lpm.toFixed(1)}</div></div>
            <div><div className="n num">{b.inflow_lpm.toFixed(0)}</div><div className="l">Inflow L/min</div></div>
            <div><div className="n num" style={{ fontSize: 20, lineHeight: "32px" }}>{b.valve === "closed" ? "Closed" : "Open"}</div><div className="l">Riser valve V2. Pump: {pump}</div></div>
          </div>

          <div className="spark-head"><strong>{b.name}: outflow</strong><span className="small muted">last 20 simulated minutes</span></div>
          <Sparkline values={hist.map((h) => h.outflow)} baseline={b.baseline_out_lpm} color="var(--lagoon)" label={`${b.name} outflow over time`} />
          <div className="spark-head"><strong>{b.name}: tank level</strong></div>
          <Sparkline values={hist.map((h) => h.level)} max={100} color="var(--kelp)" label={`${b.name} tank level over time`} />
        </section>

        <aside className="side" aria-label="Agent and activity">
          <div className="side-block">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h2>Agent</h2>
              {incident && <span className="chip">{agentLabel(incident.agent)}</span>}
            </div>
            {incident ? (
              <>
                <p className="small muted" style={{ marginTop: 6 }}>
                  {incident.building_name}, opened {incident.opened_clock}.{" "}
                  <Link href={`/incidents/${incident.id}`} style={{ color: "var(--lagoon)" }}>Open the full incident</Link>
                </p>
                <AgentLog incident={incident} />
              </>
            ) : (
              <p className="empty-state">
                Nothing to investigate. Pick a building, then simulate a leak, an overflow or a scheduled flush and watch the agent work.
              </p>
            )}
          </div>

          <div className="side-block">
            <h2>Recent incidents</h2>
            {state.incidents.length === 0 ? (
              <p className="empty-state">No incidents yet.</p>
            ) : (
              <ul className="inc-list">
                {state.incidents.slice(0, 5).map((i) => (
                  <li key={i.id}>
                    <Link href={`/incidents/${i.id}`}>
                      <div className="row">
                        <strong>{i.building_name}</strong>
                        <span className={`chip ${i.status === "resolved" ? "ok" : i.status === "investigating" ? "alert" : i.status === "dismissed" ? "info" : "warn"}`}>{STATUS_LABEL[i.status]}</span>
                      </div>
                      <div className="small muted">{i.opened_clock}{i.summary ? `: ${i.summary}` : ""}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="side-block">
            <h2>Activity</h2>
            {state.events.length === 0 ? (
              <p className="empty-state">Alerts and student reports appear here.</p>
            ) : (
              <ul className="events">
                {state.events.slice(0, 7).map((e) => (
                  <li key={e.id}><span className="k">{EVENT_LABEL[e.kind] ?? e.kind}</span>{e.text}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
