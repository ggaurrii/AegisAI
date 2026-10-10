"""Run the same leak flow against DynamoDB (mocked with moto) to prove the real store works."""
import boto3
import pytest
from moto import mock_aws

from conftest import inject
from core import agent, config, router
from core.store import DynamoStore

TABLES = {
    "JalRakshak-Buildings": [("building_id", "S", "HASH")],
    "JalRakshak-Readings": [("building_id", "S", "HASH"), ("ts", "N", "RANGE")],
    "JalRakshak-Incidents": [("incident_id", "S", "HASH")],
    "JalRakshak-Events": [("event_id", "S", "HASH")],
}


@pytest.fixture
def ddb(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setattr(config, "REGION", "us-east-1")
    with mock_aws():
        res = boto3.resource("dynamodb", region_name="us-east-1")
        for name, keys in TABLES.items():
            res.create_table(
                TableName=name, BillingMode="PAY_PER_REQUEST",
                AttributeDefinitions=[{"AttributeName": k, "AttributeType": t} for k, t, _ in keys],
                KeySchema=[{"AttributeName": k, "KeyType": kt} for k, _, kt in keys],
            )
        yield res


def test_leak_flow_end_to_end_on_dynamodb(ddb, clock, rt, started):
    store = DynamoStore(ddb)
    iid = inject(store, clock, started, "leak", "hostel-b")
    assert iid
    agent.run_incident(iid, store, rt)
    inc = store.get_incident(iid)
    assert inc["status"] == "resolved" and inc["action"] == "close_valve"
    assert [s["n"] for s in inc["steps"]] == list(range(1, len(inc["steps"]) + 1))

    status, state = router.handle("GET", "/state", store=store)
    assert status == 200 and state["kpis"]["resolved_incidents"] == 1
    b = next(x for x in state["buildings"] if x["id"] == "hostel-b")
    assert b["valve"] == "closed" and b["status"] == "fixed"


def test_reset_wipes_and_reseeds(ddb, clock, rt, started):
    store = DynamoStore(ddb)
    inject(store, clock, started, "leak", "mess")
    router.handle("POST", "/scenario/reset", store=store)
    assert store.list_incidents() == []
    assert len(store.get_buildings()) == 6
    assert all(b["status"] == "ok" for b in store.get_buildings())


def test_only_one_writer_advances_the_clock(ddb):
    store = DynamoStore(ddb)
    store.get_meta()
    assert store.try_advance(None, 1000) is True
    assert store.try_advance(None, 2000) is False   # stale claim loses
    assert store.try_advance(1000, 3000) is True
