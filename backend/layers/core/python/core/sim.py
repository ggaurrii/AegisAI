"""Water physics for the simulated campus.

Each building has a rooftop tank, a pump on a float switch, and a metered outlet.
The simulator knows the hidden truth (a leak, a stuck float switch, a scheduled flush).
Everything the agent and the UI see is a noisy sensor reading derived from it.
"""
import math
import random
import time

from . import config
from .models import PUMP_LPM, PUMP_OFF_ABOVE, PUMP_ON_BELOW

DT_MAX = 60.0  # never simulate more than a minute of real time in one go


def _flush_lpm(b, sm):
    m = b.get("maintenance")
    if m and m["from_sm"] <= sm < m["until_sm"]:
        return b["truth"].get("flush_lpm", 0.0)
    return 0.0


def _step(b, dt_min, sm, rng):
    t = b["truth"]
    cap = b["capacity_l"]
    leak = t.get("leak_lpm", 0.0) if b["valve"] == "open" else 0.0  # valve V2 isolates the riser
    flush = _flush_lpm(b, sm)
    out_true = b["base_use_lpm"] + leak + flush

    if b.get("pump_override") == "off":
        pump = False
    elif t.get("stuck_float"):
        pump = True
    else:
        pump = b["pump_on"]
        if pump and b["level_pct"] >= PUMP_OFF_ABOVE:
            pump = False
        elif not pump and b["level_pct"] <= PUMP_ON_BELOW:
            pump = True
    in_true = PUMP_LPM if pump else 0.0

    vol = b["level_pct"] / 100.0 * cap + (in_true - out_true) * dt_min
    spill = max(0.0, vol - cap)
    vol = min(cap, max(0.0, vol))
    b["level_pct"] = vol / cap * 100.0
    b["spilled_l"] = b.get("spilled_l", 0.0) + spill
    b["lost_l"] = b.get("lost_l", 0.0) + leak * dt_min
    b["pump_on"] = pump

    m_out = max(0.0, out_true * (1 + rng.gauss(0, 0.03)) + rng.gauss(0, 0.08))
    m_in = max(0.0, in_true * (1 + rng.gauss(0, 0.02)))
    b["inflow_lpm"], b["outflow_lpm"] = m_in, m_out

    calm = b["status"] == "ok" and leak == 0 and flush == 0 and not t.get("stuck_float")
    if calm:
        b["baseline_out_lpm"] = 0.97 * b["baseline_out_lpm"] + 0.03 * m_out
    return {"level": round(b["level_pct"], 2), "inflow": round(m_in, 2), "outflow": round(m_out, 2), "pump": pump}


def advance(store, now=None, rng=None):
    """Move the simulation forward to `now`. Returns True if it advanced."""
    now = time.time() if now is None else now
    rng = rng or random
    now_ms = int(now * 1000)
    meta = store.get_meta()
    last_ms = meta.get("last_ms")
    if last_ms is None:
        store.try_advance(None, now_ms)
        return False
    dt = (now_ms - last_ms) / 1000.0
    if dt < 0.4:
        return False
    if not store.try_advance(last_ms, now_ms):  # another Lambda is already advancing
        return False

    dt = min(dt, DT_MAX)
    n = max(1, min(20, math.ceil(dt / 2.0)))
    step_s = dt / n
    dt_min = step_s * config.SIM_SPEEDUP / 60.0
    sm = float(meta.get("sm", 0.0))
    buildings = store.get_buildings()
    expired = set()

    for i in range(n):
        sm += dt_min
        ts = now_ms - int((n - 1 - i) * step_s * 1000)
        for b in buildings:
            m = b.get("maintenance")
            if m and sm >= m["until_sm"]:
                b["maintenance"] = None
                expired.add(b["id"])
            r = _step(b, dt_min, sm, rng)
            r.update(ts=ts, sm=round(sm, 3), dt=round(dt_min, 4))
            store.add_reading(b["id"], r)

    for b in buildings:
        fields = dict(
            level_pct=b["level_pct"], inflow_lpm=b["inflow_lpm"], outflow_lpm=b["outflow_lpm"],
            pump_on=b["pump_on"], lost_l=b["lost_l"], spilled_l=b["spilled_l"],
            baseline_out_lpm=b["baseline_out_lpm"],
        )
        if b["id"] in expired:
            fields["maintenance"] = None
        store.update_building(b["id"], **fields)
    store.set_meta(sm=sm)
    return True


def apply_scenario(store, kind, building_id, severity=None):
    """Inject a hidden fault into one building. Returns the building name."""
    if kind not in ("leak", "overflow", "flush"):
        raise ValueError(f"unknown scenario '{kind}'")
    b = next((x for x in store.get_buildings() if x["id"] == building_id), None)
    if b is None:
        raise KeyError(building_id)
    sm = float(store.get_meta().get("sm", 0.0))
    truth = {"leak_lpm": 0.0, "stuck_float": False, "flush_lpm": 0.0}
    fields = dict(status="ok", valve="open", pump_override=None, maintenance=None, suppress_until_sm=0.0)
    if kind == "leak":
        truth["leak_lpm"] = float(severity or 45.0)
    elif kind == "overflow":
        truth["stuck_float"] = True
        fields["level_pct"] = max(b["level_pct"], 93.0)
        fields["pump_on"] = True
    else:
        truth["flush_lpm"] = 35.0
        fields["maintenance"] = {"label": "Scheduled tank flush", "from_sm": sm - 2.0, "until_sm": sm + 14.0}
    store.update_building(building_id, truth=truth, **fields)
    return b["name"]
