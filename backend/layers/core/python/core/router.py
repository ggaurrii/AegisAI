"""HTTP routing, independent of Lambda or FastAPI. handle() returns (status, payload)."""
import time

from . import config, detector, engine, sim
from .models import sim_clock
from .store import get_store


def public_building(b):
    out = {k: v for k, v in b.items() if k not in ("truth", "suppress_until_sm")}
    for k in ("level_pct", "inflow_lpm", "outflow_lpm", "baseline_out_lpm", "lost_l", "spilled_l"):
        out[k] = round(out[k], 2)
    return out


def incident_summary(i):
    steps = i.get("steps", [])
    return {
        "id": i["id"], "building_id": i["building_id"], "building_name": i["building_name"], "kind": i["kind"],
        "status": i["status"], "opened_clock": i["opened_clock"], "closed_clock": i.get("closed_clock"),
        "steps_count": len(steps), "last_phase": steps[-1]["phase"] if steps else None,
        "cause": i.get("cause"), "action": i.get("action"), "summary": i.get("summary"),
        "agent": i.get("agent"), "loss_l": i.get("loss_l", 0.0),
    }


def _state(store):
    engine.tick(store)
    meta = store.get_meta()
    buildings = store.get_buildings()
    incidents = store.list_incidents(12)
    lost = sum(b.get("lost_l", 0) + b.get("spilled_l", 0) for b in buildings)
    return {
        "sm": round(meta.get("sm", 0.0), 2),
        "clock": sim_clock(meta.get("sm", 0.0)),
        "speedup": config.SIM_SPEEDUP,
        "agent_mode": config.AGENT_MODE,
        "buildings": [public_building(b) for b in buildings],
        "incidents": [incident_summary(i) for i in incidents],
        "events": store.list_events(12),
        "kpis": {
            "buildings": len(buildings),
            "active_incidents": sum(1 for i in incidents if i["status"] == "investigating"),
            "resolved_incidents": sum(1 for i in incidents if i["status"] == "resolved"),
            "avg_level_pct": round(sum(b["level_pct"] for b in buildings) / max(1, len(buildings)), 1),
            "water_lost_l": round(lost, 0),
        },
        "server_time": int(time.time() * 1000),
    }


def _history(store, bid, minutes):
    rs = list(reversed(store.get_readings(bid, limit=200)))  # oldest first
    if rs:
        cutoff = rs[-1]["sm"] - minutes
        rs = [r for r in rs if r["sm"] >= cutoff]
    step = max(1, len(rs) // 90)
    return [{"sm": r["sm"], "clock": sim_clock(r["sm"]), "level": r["level"], "inflow": r["inflow"],
             "outflow": r["outflow"], "pump": r["pump"]} for r in rs[::step]]


def handle(method, path, query=None, body=None, store=None):
    store = store or get_store()
    query = query or {}
    body = body or {}
    path = path.rstrip("/") or "/"
    parts = [p for p in path.split("/") if p]
    try:
        if method == "GET" and path == "/health":
            return 200, {"ok": True, "store": config.STORE, "agent_mode": config.AGENT_MODE}

        if method == "GET" and path == "/state":
            return 200, _state(store)

        if method == "GET" and len(parts) == 3 and parts[0] == "buildings" and parts[2] == "history":
            engine.tick(store)
            minutes = float(query.get("minutes", 30))
            return 200, {"building_id": parts[1], "readings": _history(store, parts[1], minutes)}

        if method == "POST" and path == "/scenario":
            kind, bid = body.get("type"), body.get("building_id")
            if not kind or not bid:
                return 400, {"error": "type and building_id are required"}
            name = sim.apply_scenario(store, kind, bid, body.get("severity"))
            store.add_event({"kind": "simulation", "building_id": bid,
                             "text": f"Simulation control: injected a {kind} fault in {name}."})
            return 200, _state(store)

        if method == "POST" and path == "/scenario/reset":
            store.reset()
            return 200, _state(store)

        if method == "GET" and path == "/incidents":
            return 200, {"incidents": [incident_summary(i) for i in store.list_incidents(30)]}

        if method == "GET" and len(parts) == 2 and parts[0] == "incidents":
            inc = store.get_incident(parts[1])
            return (200, inc) if inc else (404, {"error": "incident not found"})

        if method == "POST" and path == "/reports":
            text, bid = str(body.get("text", "")).strip(), body.get("building_id")
            if not bid or not text:
                return 400, {"error": "building_id and text are required"}
            ev = store.add_event({"kind": "report", "building_id": bid, "text": text[:300],
                                  "category": body.get("category", "other")})
            return 201, ev

        if method == "GET" and path == "/reports":
            return 200, {"reports": store.list_events(30, kind="report")}

        if method == "POST" and path == "/ingest":
            # Real sensors post here. The simulator writes through the same storage.
            bid = body.get("building_id")
            if not bid or "outflow_lpm" not in body or "level_pct" not in body:
                return 400, {"error": "building_id, level_pct and outflow_lpm are required"}
            meta = store.get_meta()
            r = {"ts": int(time.time() * 1000), "sm": round(meta.get("sm", 0.0), 3), "dt": 0.5,
                 "level": float(body["level_pct"]), "inflow": float(body.get("inflow_lpm", 0.0)),
                 "outflow": float(body["outflow_lpm"]), "pump": bool(body.get("pump_on", False))}
            store.add_reading(bid, r)
            store.update_building(bid, level_pct=r["level"], inflow_lpm=r["inflow"], outflow_lpm=r["outflow"],
                                  pump_on=r["pump"])
            return 202, {"accepted": True, "opened": detector.check(store)}

        return 404, {"error": f"no route for {method} {path}"}
    except KeyError as err:
        return 404, {"error": f"not found: {err}"}
    except ValueError as err:
        return 400, {"error": str(err)}
