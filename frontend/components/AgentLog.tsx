import type { Incident, Phase } from "@/lib/types";

const ORDER: Phase[] = ["detect", "investigate", "decide", "act", "verify"];
const LABEL: Record<string, string> = { detect: "Detect", investigate: "Investigate", decide: "Decide", act: "Act", verify: "Verify" };

export function agentLabel(agent: string | null) {
  if (!agent) return "Starting";
  if (agent.startsWith("bedrock:")) return "Claude on Bedrock";
  if (agent.includes("fallback")) return "Rule-based planner (model fell back)";
  return "Rule-based planner";
}

export default function AgentLog({ incident }: { incident: Incident }) {
  const seen = new Set(incident.steps.map((s) => s.phase));
  const closed = incident.status !== "investigating";
  const lastIdx = Math.max(...ORDER.map((p, i) => (seen.has(p) ? i : -1)));

  const cls = (p: Phase, i: number) => {
    if (seen.has(p) && (closed || i < lastIdx)) return incident.status === "escalated" && i === lastIdx ? "s bad" : "s done";
    if (!closed && i === lastIdx) return "s active";
    return "s";
  };

  return (
    <div>
      <div className="stepper" aria-label="Agent progress">
        {ORDER.map((p, i) => (
          <div key={p} className={cls(p, i)}>
            <div className="bar" />
            {LABEL[p]}
          </div>
        ))}
      </div>

      <ol className="log" aria-live="polite">
        {incident.steps.map((s) => (
          <li key={s.n} className={`${s.phase} ${s.phase === "summary" ? incident.status : ""}`}>
            <div className="t">
              <span>{s.title}</span>
              <small>{s.clock}</small>
            </div>
            <p className="x">{s.text}</p>
            {s.tool && s.tool !== "detector" && <div className="tool code">{s.tool}</div>}
            {Object.keys(s.data || {}).length > 0 && (
              <details>
                <summary>Evidence</summary>
                <pre>{JSON.stringify(s.data, null, 2)}</pre>
              </details>
            )}
          </li>
        ))}
      </ol>

      {!closed && (
        <div className="working">
          <i /> The agent is working on it
        </div>
      )}
      {closed && incident.summary && (
        <div className={`outcome ${incident.status}`}>
          {incident.status === "resolved" ? "Incident stabilized" : incident.status === "dismissed" ? "Dismissed as expected" : "Escalated to staff"}
          <small>{incident.summary}</small>
        </div>
      )}
    </div>
  );
}
