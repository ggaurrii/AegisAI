"""The agent's tools.

Every tool works on the one building named in the incident, reads only sensor data,
and writes a step into the incident timeline. The rule-based planner and the Strands
agent call exactly the same functions.
"""
import time

from . import config, engine, notify
from .models import sim_clock

CAUSES = ("riser_leak", "tank_overflow", "scheduled_use", "unknown")
ACTIONS = ("close_valve", "stop_pump", "none", "escalate")
ALLOWED_ACTION = {"riser_leak": "close_valve", "tank_overflow": "stop_pump",
                  "scheduled_use": "none", "unknown": "escalate"}
DECISION_TITLE = {"close_valve": "Decision: close valve V2", "stop_pump": "Decision: stop the pump",
                  "none": "Decision: no action needed", "escalate": "Decision: escalate to staff"}


class Runtime:
    """Clock and sleep, injectable so tests do not have to wait."""

    def __init__(self, now=None, sleep=None, step_delay=None):
        self.now = now or time.time
        self.sleep = sleep or time.sleep
        self.step_delay = config.AGENT_STEP_DELAY if step_delay is None else step_delay


class Ctx:
    def __init__(self, store, incident_id, rt=None):
        self.store = store
        self.rt = rt or Runtime()
        self.incident_id = incident_id
        self.incident = store.get_incident(incident_id)
        self.building_id = self.incident["building_id"]
        self.n = len(self.incident["steps"])
        self.decision = None

    def building(self):
        return next(b for b in self.store.get_buildings() if b["id"] == self.building_id)

    def sm(self):
        return float(self.store.get_meta().get("sm", 0.0))

    def tick(self):
        engine.tick(self.store, self.rt.now())

    def log(self, phase, title, text, tool=None, data=None, pause=True):
        self.n += 1
        sm = self.sm()
        step = {"n": self.n, "phase": phase, "title": title, "text": text, "tool": tool,
                "data": data or {}, "sm": sm, "clock": sim_clock(sm), "ts_ms": int(self.rt.now() * 1000)}
        self.store.append_step(self.incident_id, step)
        if pause and self.rt.step_delay > 0:
            self.rt.sleep(self.rt.step_delay)
        self.tick()  # the world keeps moving while the agent works
        return step

    def loss_so_far(self):
        b = self.building()
        total = b.get("lost_l", 0.0) + b.get("spilled_l", 0.0)
        return max(0.0, total - self.incident.get("loss_at_open", 0.0))


def _r(x, n=1):
    return round(float(x), n)


def _window(ctx, minutes):
    sm = ctx.sm()
    rs = ctx.store.get_readings(ctx.building_id, limit=120)  # newest first
    return [r for r in reversed(rs) if r["sm"] >= sm - minutes]


# ------------------------------------------------------------------ investigate
def get_recent_readings(ctx, minutes=10):
    rs = _window(ctx, minutes)
    if len(rs) < 2:
        data = {"samples": len(rs)}
        ctx.log("investigate", "Read recent sensors", "Not enough readings yet to judge a trend.",
                tool="get_recent_readings", data=data)
        return data
    avg_out = sum(r["outflow"] for r in rs) / len(rs)
    avg_in = sum(r["inflow"] for r in rs) / len(rs)
    data = {"window_min": minutes, "samples": len(rs), "outflow_avg_lpm": _r(avg_out), "inflow_avg_lpm": _r(avg_in),
            "level_start_pct": _r(rs[0]["level"]), "level_end_pct": _r(rs[-1]["level"])}
    ctx.log("investigate", "Read recent sensors",
            f"Last {minutes} min: outflow averaged {avg_out:.0f} L/min, tank level moved from "
            f"{rs[0]['level']:.0f}% to {rs[-1]['level']:.0f}%.",
            tool="get_recent_readings", data=data)
    return data


def analyze_baseline_flow(ctx):
    b = ctx.building()
    base = max(b["baseline_out_lpm"], 0.5)
    rs = _window(ctx, 15)
    recent = rs[-3:]
    cur = sum(r["outflow"] for r in recent) / len(recent) if recent else b["outflow_lpm"]
    thr = max(base * 3, base + 8)
    dur = excess = 0.0
    for r in reversed(rs):
        if r["outflow"] > thr:
            dur += r["dt"]
            excess += (r["outflow"] - base) * r["dt"]
        else:
            break
    abnormal = cur > thr
    data = {"baseline_lpm": _r(base, 2), "current_lpm": _r(cur), "excess_lpm": _r(cur - base), "ratio": _r(cur / base),
            "sustained_min": _r(dur), "estimated_excess_l": _r(excess, 0), "abnormal": abnormal}
    if abnormal:
        text = (f"Outflow is {cur:.0f} L/min against a learned baseline of {base:.1f} L/min, sustained for "
                f"{dur:.0f} min. About {excess:.0f} L of excess flow so far.")
    else:
        text = f"Outflow is {cur:.1f} L/min, close to the {base:.1f} L/min baseline."
    ctx.log("investigate", "Compare with baseline flow", text, tool="analyze_baseline_flow", data=data)
    return data


def check_mass_balance(ctx, minutes=10):
    rs = _window(ctx, minutes)
    cap = ctx.building()["capacity_l"]
    if len(rs) < 2:
        data = {"unaccounted_l": 0.0, "tank_full": False, "overflow": False}
        ctx.log("investigate", "Check water balance", "Not enough readings for a balance yet.",
                tool="check_mass_balance", data=data)
        return data
    # Interval by interval: what the meters say should have been stored, against what the level says was.
    # Only water that vanished (expected more than stored) counts as unaccounted for.
    in_l = out_l = vanished = 0.0
    for prev, cur in zip(rs, rs[1:]):
        expected = (cur["inflow"] - cur["outflow"]) * cur["dt"]
        actual = (cur["level"] - prev["level"]) / 100.0 * cap
        in_l += cur["inflow"] * cur["dt"]
        out_l += cur["outflow"] * cur["dt"]
        vanished += max(0.0, expected - actual)
    full = rs[-1]["level"] >= 99.0
    overflow = vanished > 60 and full
    data = {"inflow_l": _r(in_l, 0), "outflow_l": _r(out_l, 0), "unaccounted_l": _r(vanished, 0),
            "tank_full": full, "overflow": overflow}
    if overflow:
        text = (f"{vanished:.0f} L entered the tank but never left through a meter, and the tank is full. "
                "Water is spilling over the top.")
    else:
        text = (f"Inflow, outflow and tank volume balance. Under {max(vanished, 1):.0f} L is unaccounted for, "
                "so the tank itself is intact.")
    ctx.log("investigate", "Check water balance", text, tool="check_mass_balance", data=data)
    return data


def check_pump_log(ctx, minutes=10):
    rs = _window(ctx, minutes)
    on = [r for r in rs if r["pump"]]
    frac = len(on) / len(rs) if rs else 0.0
    on_full = [r for r in on if r["level"] >= 99.0]
    stuck = len(on_full) >= 2
    data = {"on_fraction": _r(frac, 2), "on_while_full": stuck}
    if stuck:
        text = "The pump kept running while the tank was already full. The float switch is probably stuck."
    elif frac > 0.6:
        text = (f"The pump ran {frac * 100:.0f}% of the time. That fits it refilling a draining tank, "
                "not a faulty float switch.")
    else:
        text = "Pump behaviour looks normal."
    ctx.log("investigate", "Read pump log", text, tool="check_pump_log", data=data)
    return data


def check_maintenance_schedule(ctx):
    b = ctx.building()
    m, sm = b.get("maintenance"), ctx.sm()
    active = bool(m and m["from_sm"] <= sm < m["until_sm"])
    if active:
        data = {"active": True, "label": m["label"], "until": sim_clock(m["until_sm"])}
        text = f"{m['label']} is on the schedule until {data['until']}. This flow is expected."
    else:
        data = {"active": False, "label": None}
        text = "No maintenance is scheduled for this building."
    ctx.log("investigate", "Check maintenance schedule", text, tool="check_maintenance_schedule", data=data)
    return data


# ------------------------------------------------------------------ decide
def record_decision(ctx, cause, action, rationale):
    if cause not in CAUSES or action not in ACTIONS:
        return {"ok": False, "error": f"cause must be one of {CAUSES} and action one of {ACTIONS}"}
    if ALLOWED_ACTION[cause] != action:
        return {"ok": False, "error": f"For cause '{cause}' the only permitted action is '{ALLOWED_ACTION[cause]}'."}
    ctx.decision = {"cause": cause, "action": action}
    ctx.store.update_incident(ctx.incident_id, cause=cause, action=action)
    ctx.log("decide", DECISION_TITLE[action], rationale, tool="record_decision",
            data={"cause": cause, "action": action})
    return {"ok": True, **ctx.decision}


# ------------------------------------------------------------------ act
def _need(ctx, action):
    d = ctx.decision
    if not d or d["action"] != action:
        return {"ok": False, "error": f"Call record_decision with action '{action}' before using this tool."}
    return None


def close_valve(ctx):
    err = _need(ctx, "close_valve")
    if err:
        return err
    ctx.store.update_building(ctx.building_id, valve="closed")
    name = ctx.building()["name"]
    ctx.log("act", "Close riser valve V2", f"Valve V2 on the {name} riser is closed. The leaking section is isolated.",
            tool="close_valve", data={"valve": "V2", "state": "closed"})
    return {"ok": True, "valve": "V2", "state": "closed"}


def stop_pump(ctx):
    err = _need(ctx, "stop_pump")
    if err:
        return err
    ctx.store.update_building(ctx.building_id, pump_override="off")
    ctx.log("act", "Stop the pump", "The pump is stopped so the tank stops overflowing. It can be restarted by staff.",
            tool="stop_pump", data={"pump": "off"})
    return {"ok": True, "pump": "off"}


def notify_staff(ctx, severity, message):
    if severity not in ("info", "warning", "high"):
        severity = "warning"
    b = ctx.building()
    notify.send(ctx.store, severity, message, building_id=b["id"], clock=sim_clock(ctx.sm()))
    ctx.log("act", "Notify staff", f"Warden and plumber alerted: {message}", tool="notify_staff",
            data={"severity": severity})
    return {"ok": True}


# ------------------------------------------------------------------ verify
def verify_fix(ctx, wait_seconds=6):
    d = ctx.decision or {}
    end = ctx.rt.now() + wait_seconds
    while ctx.rt.now() < end:
        ctx.rt.sleep(min(1.5, max(0.1, end - ctx.rt.now())))
        ctx.tick()
    b = ctx.building()
    base = max(b["baseline_out_lpm"], 0.5)
    rs = _window(ctx, 4)[-3:]
    if not rs:
        data = {"resolved": False}
        ctx.log("verify", "Verify the fix", "No fresh readings arrived, so the fix cannot be confirmed.",
                tool="verify_fix", data=data)
        return data
    out = sum(r["outflow"] for r in rs) / len(rs)
    inn = sum(r["inflow"] for r in rs) / len(rs)
    if d.get("cause") == "tank_overflow":
        resolved = inn < 5
        text = (f"Pump inflow is {inn:.0f} L/min and the tank is no longer spilling. The overflow has stopped."
                if resolved else f"Inflow is still {inn:.0f} L/min. The overflow has not stopped.")
    else:
        resolved = out <= max(base * 1.6, base + 3)
        text = (f"Outflow is back to {out:.1f} L/min against a {base:.1f} L/min baseline. The leak is isolated."
                if resolved else f"Outflow is still {out:.0f} L/min. The fix did not work.")
    data = {"resolved": resolved, "outflow_lpm": _r(out), "inflow_lpm": _r(inn), "baseline_lpm": _r(base, 2)}
    ctx.log("verify", "Verify the fix", text, tool="verify_fix", data=data)
    return data


# ------------------------------------------------------------------ finish
def finish_incident(ctx, outcome, summary):
    if outcome not in ("resolved", "dismissed", "escalated"):
        return {"ok": False, "error": "outcome must be resolved, dismissed or escalated"}
    sm = ctx.sm()
    loss = ctx.loss_so_far()
    titles = {"resolved": "Incident stabilized", "dismissed": "Dismissed as expected", "escalated": "Escalated to staff"}
    ctx.log("summary", titles[outcome], summary, tool="finish_incident",
            data={"outcome": outcome, "loss_l": _r(loss, 0)}, pause=False)
    b = ctx.building()
    if outcome == "resolved":
        ctx.store.update_building(ctx.building_id, status="fixed")
    elif outcome == "dismissed":
        m = b.get("maintenance")
        ctx.store.update_building(ctx.building_id, status="ok",
                                  suppress_until_sm=(m["until_sm"] if m else sm + 10))
    ctx.store.update_incident(ctx.incident_id, status=outcome, summary=summary, loss_l=_r(loss, 0),
                              closed_sm=sm, closed_clock=sim_clock(sm), closed_ms=int(ctx.rt.now() * 1000))
    return {"ok": True, "outcome": outcome}
