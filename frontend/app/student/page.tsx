"use client";
import { useState } from "react";
import Tank2D from "@/components/Tank2D";
import { sendReport } from "@/lib/api";
import { alertKind } from "@/lib/format";
import type { Building, CampusState } from "@/lib/types";
import { useCampus } from "@/lib/useCampus";

function waterStatus(b: Building, state: CampusState) {
  const kind = alertKind(b, state.incidents);
  if (kind === "leak") return { label: "Checking a flow problem", tone: "var(--amber)", note: "We spotted unusual water flow in your block and the system is investigating. Water should keep running." };
  if (kind === "overflow") return { label: "Fixing a tank problem", tone: "var(--amber)", note: "A tank in your block was overflowing. It is being sorted out and supply is not affected." };
  if (b.valve === "closed") return { label: "Reduced pressure possible", tone: "var(--amber)", note: "A leaking pipe section was shut off. Upper floors may notice lower pressure until the plumber arrives." };
  if (b.level_pct < 25) return { label: "Tank refilling", tone: "var(--amber)", note: "The tank is low and the pump is refilling it. Please avoid filling buckets for a few minutes." };
  return { label: "Water available", tone: "var(--kelp)", note: "Your block's tank is healthy and supply is normal." };
}

const TIPS = [
  "Report a dripping tap the same day. A slow drip wastes more than it looks.",
  "Avoid filling buckets while the tank is below 25 percent.",
  "Switch off the tap while brushing your teeth or soaping up.",
];

export default function Student() {
  const { state, error } = useCampus(2000);
  const [sel, setSel] = useState("hostel-a");
  const [category, setCategory] = useState("leaking tap");
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) {
    return (
      <main className="container">
        <div className="page-head"><h1>Your water</h1></div>
        {error ? <div className="banner-err">Cannot reach the API ({error}).</div> : <p className="muted">Loading...</p>}
      </main>
    );
  }

  const b = state.buildings.find((x) => x.id === sel) ?? state.buildings[0];
  const st = waterStatus(b, state);
  const mine = state.incidents.filter((i) => i.building_id === b.id).slice(0, 3);
  const reports = state.events.filter((e) => e.kind === "report" && e.building_id === b.id).slice(0, 3);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setFormErr(null);
    try {
      await sendReport(b.id, `${category}: ${text.trim()}`, category);
      setSent(`Sent to facilities for ${b.name}.`);
      setText("");
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Could not send the report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Your water</h1>
          <p className="muted" style={{ marginTop: 6 }}>Pick your building to see what the tank is doing right now.</p>
        </div>
      </div>

      <div className="tabs" role="group" aria-label="Choose your building">
        {state.buildings.map((x) => (
          <button key={x.id} aria-pressed={x.id === b.id} onClick={() => { setSel(x.id); setSent(null); }}>{x.name}</button>
        ))}
      </div>

      <div className="student">
        <div>
          <Tank2D level={b.level_pct} />
          <p className="small muted" style={{ marginTop: 10 }}>{Math.round(b.level_pct)}% full</p>
        </div>

        <div>
          <div className="small muted">{b.name}</div>
          <div className="status-big" style={{ color: st.tone }}>{st.label}</div>
          <p className="muted">{st.note}</p>

          <h2 style={{ fontSize: 20, marginTop: 32 }}>Alerts for your block</h2>
          {mine.length === 0 && reports.length === 0 ? (
            <p className="empty-state">Nothing to report. You will see messages here if something happens in your block.</p>
          ) : (
            <ul className="events">
              {mine.map((i) => (
                <li key={i.id}>
                  <span className="k">{i.opened_clock}</span>
                  {i.status === "investigating" && "Unusual water flow detected. The system is checking it now."}
                  {i.status === "resolved" && "A leak or overflow was found and fixed. Supply is back to normal."}
                  {i.status === "dismissed" && "Extra water use was a scheduled maintenance task. Nothing to do."}
                  {i.status === "escalated" && "Facilities have been asked to check on site."}
                </li>
              ))}
              {reports.map((r) => (
                <li key={r.id}><span className="k">Your report</span>{r.text}</li>
              ))}
            </ul>
          )}

          <h2 style={{ fontSize: 20, marginTop: 32 }}>Report a problem</h2>
          <form className="form" onSubmit={submit} style={{ maxWidth: 460, marginTop: 12 }}>
            <label>What is wrong
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>leaking tap</option>
                <option>water overflowing</option>
                <option>no water</option>
                <option>dirty water</option>
              </select>
            </label>
            <label>Where, and anything else we should know
              <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Second floor washroom, near room 214" />
            </label>
            <div><button className="btn btn-primary btn-sm" type="submit" disabled={busy || !text.trim()}>Send to facilities</button></div>
            {sent && <div className="small" style={{ color: "var(--kelp)" }} role="status">{sent}</div>}
            {formErr && <div className="small" style={{ color: "var(--coral)" }} role="alert">{formErr}</div>}
          </form>

          <h2 style={{ fontSize: 20, marginTop: 32 }}>Saving water</h2>
          <ul className="tips">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </main>
  );
}
