"""Anomaly detector. Opens an incident and hands it to the agent."""
import time

from . import dispatch
from .models import sim_clock
from .store import new_id


def _loss(b):
    return b.get("lost_l", 0.0) + b.get("spilled_l", 0.0)


def check(store, now=None):
    """Scan the latest readings. Returns the ids of any incidents opened."""
    now = time.time() if now is None else now
    sm = float(store.get_meta().get("sm", 0.0))
    opened = []
    for b in store.get_buildings():
        if b["status"] == "alert" or sm < b.get("suppress_until_sm", 0.0):
            continue
        rs = store.get_readings(b["id"], limit=3)  # newest first
        if len(rs) < 3:
            continue
        base = max(b["baseline_out_lpm"], 0.5)
        thr = max(base * 3, base + 8)
        if all(r["outflow"] > thr for r in rs):
            kind = "high_outflow"
        elif all(r["level"] >= 99.0 and r["inflow"] > r["outflow"] + 5 for r in rs):
            kind = "tank_overflow"
        else:
            continue
        opened.append(_open(store, b, kind, rs[0], base, sm, now))
    return opened


def _open(store, b, kind, latest, base, sm, now):
    if kind == "high_outflow":
        text = f"{b['name']} outflow is {latest['outflow']:.0f} L/min. Its learned baseline is {base:.1f} L/min."
    else:
        text = f"{b['name']} tank is full and the pump is still adding {latest['inflow']:.0f} L/min."
    clock = sim_clock(sm)
    inc = {
        "id": new_id(),
        "building_id": b["id"],
        "building_name": b["name"],
        "kind": kind,
        "status": "investigating",
        "opened_ms": int(now * 1000),
        "opened_sm": sm,
        "opened_clock": clock,
        "loss_at_open": _loss(b),
        "loss_l": 0.0,
        "cause": None,
        "action": None,
        "summary": None,
        "agent": None,
        "detect_text": text,
        "steps": [{
            "n": 1, "phase": "detect", "title": "Anomaly detected", "text": text, "tool": "detector",
            "data": {"outflow_lpm": latest["outflow"], "baseline_lpm": round(base, 2),
                     "level_pct": latest["level"], "inflow_lpm": latest["inflow"]},
            "sm": sm, "clock": clock, "ts_ms": int(now * 1000),
        }],
    }
    store.put_incident(inc)
    store.update_building(b["id"], status="alert")
    store.add_event({"kind": "incident", "severity": "high", "building_id": b["id"], "clock": clock,
                     "text": f"Incident opened: {text}"})
    dispatch.start_agent(inc["id"])
    return inc["id"]
