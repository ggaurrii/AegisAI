import json

from conftest import load_lambda, warm_up
from core import router
from core.store import MemoryStore


def test_state_hides_the_hidden_truth(clock):
    store = MemoryStore()
    warm_up(store, clock)
    status, state = router.handle("GET", "/state", store=store)
    assert status == 200 and len(state["buildings"]) == 6
    assert all("truth" not in b for b in state["buildings"])
    assert state["clock"].count(":") == 1


def test_scenario_validation_and_unknown_routes(clock):
    store = MemoryStore()
    assert router.handle("POST", "/scenario", body={}, store=store)[0] == 400
    assert router.handle("POST", "/scenario", body={"type": "nope", "building_id": "mess"}, store=store)[0] == 400
    assert router.handle("POST", "/scenario", body={"type": "leak", "building_id": "ghost"}, store=store)[0] == 404
    assert router.handle("GET", "/nothing", store=store)[0] == 404
    assert router.handle("GET", "/incidents/zzz", store=store)[0] == 404


def test_student_reports_round_trip(clock):
    store = MemoryStore()
    assert router.handle("POST", "/reports", body={"building_id": "hostel-a"}, store=store)[0] == 400
    s, ev = router.handle("POST", "/reports", body={"building_id": "hostel-a", "text": "Tap dripping on floor 2"}, store=store)
    assert s == 201
    _, listing = router.handle("GET", "/reports", store=store)
    assert listing["reports"][0]["text"] == "Tap dripping on floor 2"


def test_ingest_accepts_real_sensor_readings(clock, monkeypatch):
    from core import engine
    store = MemoryStore()
    warm_up(store, clock)
    monkeypatch.setattr(engine, "tick", lambda *a, **k: False)  # freeze the simulator: this test uses a fake clock
    body = {"building_id": "mess", "level_pct": 55.5, "outflow_lpm": 3.9, "inflow_lpm": 0}
    assert router.handle("POST", "/ingest", body=body, store=store)[0] == 202
    assert router.handle("POST", "/ingest", body={"building_id": "mess"}, store=store)[0] == 400
    _, hist = router.handle("GET", "/buildings/mess/history", {"minutes": "5"}, store=store)
    assert hist["readings"][-1]["level"] == 55.5


def test_lambda_handler_speaks_http_api_payload_v2(clock):
    from core import store as store_mod
    store_mod.set_store(MemoryStore())
    app = load_lambda("api")
    ev = {"requestContext": {"http": {"method": "POST"}}, "rawPath": "/scenario/reset", "body": "{}"}
    res = app.handler(ev, None)
    assert res["statusCode"] == 200 and len(json.loads(res["body"])["buildings"]) == 6
    bad = app.handler({"requestContext": {"http": {"method": "POST"}}, "rawPath": "/scenario", "body": "{oops"}, None)
    assert bad["statusCode"] == 400
