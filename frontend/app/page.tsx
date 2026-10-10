import Link from "next/link";
import Arch from "@/components/Arch";
import HeroMap from "@/components/HeroMap";
import ScrollReveal from "@/components/ScrollReveal";

const LOOP = [
  { ph: "Detect", tool: "detector", text: "A heartbeat reads every tank and meter and flags readings that break the baseline it has learned for that building." },
  { ph: "Investigate", tool: "5 read-only tools", text: "Recent readings, baseline flow, water balance, pump log and the maintenance schedule. It does not conclude before it has looked at all five." },
  { ph: "Decide", tool: "record_decision", text: "One cause and one permitted action, with its reasoning written down. The tools refuse any action that does not match the decision." },
  { ph: "Act", tool: "close_valve, stop_pump, notify_staff", text: "Only reversible actions: close a riser valve, stop a pump, alert the warden and plumber." },
  { ph: "Verify", tool: "verify_fix", text: "It waits, re-reads the sensors, and only then closes the incident. If the fix did not work, it escalates to a human." },
];

export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <ScrollReveal delay={0}>
          <h1>
            An AI operations manager for <em>campus water</em>
          </h1>
          <p className="lede">
            It watches every tank, spots a leak or an overflow, works out the cause, acts, and then checks that the fix
            actually worked.
          </p>
          <div className="cta-row">
            <Link className="btn btn-primary" href="/dashboard?demo=leak">Watch the agent fix a leak</Link>
            <Link className="btn" href="/student">Student view</Link>
          </div>
          <p className="hero-note">
            Sensors are simulated in this demo. The ingest API takes real flow meter readings in the same shape.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <HeroMap />
        </ScrollReveal>
      </section>

      <section className="section">
        <ScrollReveal>
          <h2>A loop that finishes the job, not a dashboard that waits for you</h2>
          <p className="sub">
            Most monitoring stops at an alert. Here the alert is the start: the agent investigates, decides, acts and
            confirms, and every step lands in a timeline you can read.
          </p>
        </ScrollReveal>
        <div className="loop">
          {LOOP.map((s, idx) => (
            <ScrollReveal key={s.ph} delay={idx * 100}>
              <div className="ph">{s.ph}</div>
              <div className="code" style={{ marginTop: 4 }}>{s.tool}</div>
              <p>{s.text}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="section">
        <ScrollReveal>
          <h2>The same alarm, three different answers</h2>
          <p className="sub">An outflow alarm is not always a leak. The agent decides from evidence, so the right action changes.</p>
        </ScrollReveal>
        <div className="cases">
          <ScrollReveal delay={50}>
            <div>
              <span className="chip alert">Riser leak</span>
              <h3>Isolate it</h3>
              <p>Outflow is far above baseline, the tank balance is intact and the pump is only refilling a draining tank.</p>
              <p className="verdict">Closes valve V2 on the riser and alerts staff.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <div>
              <span className="chip alert">Tank overflow</span>
              <h3>Stop the pump</h3>
              <p>The tank is full, water enters but never leaves through a meter, and the pump keeps running. The float switch is stuck.</p>
              <p className="verdict">Stops the pump and asks staff to inspect the float switch.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={250}>
            <div>
              <span className="chip info">Scheduled flush</span>
              <h3>Leave it alone</h3>
              <p>A tank flush is on the maintenance schedule. The flow is large, but it is expected.</p>
              <p className="verdict">Dismisses the incident with no action and stays quiet until the flush ends.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section">
        <ScrollReveal>
          <h2>Built on AWS</h2>
          <p className="sub">
            Serverless end to end, defined in one SAM template. The agent runs as a Strands agent on Bedrock, and falls
            back to a rule-based planner, saying so in the timeline, if the model call fails.
          </p>
          <div className="arch"><Arch /></div>
        </ScrollReveal>
      </section>

      <ScrollReveal delay={100}>
        <footer className="footer">
          <div>
            <span>Built with ❤️ by <strong>Gauri Sharma</strong> for AWS Environmental Hacks.</span>
            <span style={{ display: "block", marginTop: 4, color: "var(--mute)", fontSize: 13 }}>
              Water conservation through intelligent autonomous operations.
            </span>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <Link href="/dashboard" style={{ color: "var(--mist)", transition: "color 0.2s" }}>Dashboard</Link>
            <Link href="/student" style={{ color: "var(--mist)", transition: "color 0.2s" }}>Student View</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: "var(--lagoon)", textDecoration: "none" }}>GitHub ↗</a>
          </div>
        </footer>
      </ScrollReveal>
    </main>
  );
}
