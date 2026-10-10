from conftest import inject, warm_up
from core import agent, config, engine
from core import tools as T
from core.store import MemoryStore


def phases(inc):
    return [s["phase"] for s in inc["steps"]]


def test_calm_campus_opens_no_incidents(clock, started):
    store = MemoryStore()
    warm_up(store, clock, ticks=60)
    assert started == []
    assert all(b["status"] == "ok" for b in store.get_buildings())


def test_leak_is_detected_investigated_and_isolated(clock, rt, started):
    store = MemoryStore()
    iid = inject(store, clock, started, "leak", "hostel-b")
    assert iid, "detector should open an incident within a few readings"
    inc = store.get_incident(iid)
    assert inc["kind"] == "high_outflow" and phases(inc) == ["detect"]

    agent.run_incident(iid, store, rt)
    inc = store.get_incident(iid)
    assert inc["status"] == "resolved"
    assert (inc["cause"], inc["action"]) == ("riser_leak", "close_valve")
    ph = phases(inc)
    assert ph[0] == "detect" and ph.count("investigate") == 5
    assert ph[-5:] == ["decide", "act", "act", "verify", "summary"]
    assert inc["loss_l"] > 0 and inc["agent"] == "rules"

    b = next(x for x in store.get_buildings() if x["id"] == "hostel-b")
    assert b["valve"] == "closed" and b["status"] == "fixed"
    assert b["outflow_lpm"] < 8, "outflow should be back near baseline after the valve closes"


def test_overflow_is_traced_to_the_pump_and_stopped(clock, rt, started):
    store = MemoryStore()
    iid = inject(store, clock, started, "overflow", "library")
    assert iid
    agent.run_incident(iid, store, rt)
    inc = store.get_incident(iid)
    assert inc["status"] == "resolved"
    assert (inc["cause"], inc["action"]) == ("tank_overflow", "stop_pump")
    b = next(x for x in store.get_buildings() if x["id"] == "library")
    assert b["pump_override"] == "off" and b["inflow_lpm"] < 5


def test_scheduled_flush_is_dismissed_without_action_and_not_reopened(clock, rt, started):
    store = MemoryStore()
    iid = inject(store, clock, started, "flush", "mess")
    assert iid
    agent.run_incident(iid, store, rt)
    inc = store.get_incident(iid)
    assert inc["status"] == "dismissed" and inc["cause"] == "scheduled_use"
    assert "act" not in phases(inc), "a dismissed incident must not trigger any action"
    b = next(x for x in store.get_buildings() if x["id"] == "mess")
    assert b["valve"] == "open" and b["pump_override"] is None

    started.clear()
    for _ in range(30):  # the flush may still be running: the detector must stay quiet
        clock.t += 1.5
        engine.tick(store, clock.t)
    assert started == []


def test_action_tools_refuse_without_a_matching_decision(clock, rt, started):
    store = MemoryStore()
    iid = inject(store, clock, started, "leak", "hostel-a")
    ctx = T.Ctx(store, iid, rt)
    assert T.close_valve(ctx)["ok"] is False
    assert T.record_decision(ctx, "riser_leak", "stop_pump", "wrong action")["ok"] is False
    assert T.record_decision(ctx, "riser_leak", "close_valve", "ok")["ok"] is True
    assert T.stop_pump(ctx)["ok"] is False
    assert T.close_valve(ctx)["ok"] is True


def test_model_failure_falls_back_to_rules_and_says_so(clock, rt, started, monkeypatch):
    store = MemoryStore()
    iid = inject(store, clock, started, "leak", "hostel-c")
    monkeypatch.setattr(config, "AGENT_MODE", "bedrock")
    monkeypatch.setattr(config, "BEDROCK_MODEL_ID", "some-model")

    def boom(ctx):
        raise RuntimeError("AccessDeniedException: no access to model")

    monkeypatch.setattr(agent, "_run_strands", boom)
    agent.run_incident(iid, store, rt)
    inc = store.get_incident(iid)
    assert inc["status"] == "resolved"
    assert "fallback" in inc["agent"]
    assert any(s["title"] == "AI model unavailable" for s in inc["steps"])


def test_incident_is_never_left_open(clock, rt, started, monkeypatch):
    store = MemoryStore()
    iid = inject(store, clock, started, "leak", "academic")
    monkeypatch.setattr(agent, "_run_local", lambda ctx: None)  # an agent that stops without finishing
    agent.run_incident(iid, store, rt)
    assert store.get_incident(iid)["status"] == "escalated"
