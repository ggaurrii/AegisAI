"""Storage layer. MemoryStore for local dev and tests, DynamoStore for AWS.

Both expose the same methods. Fields are owned by one writer each (simulator, agent,
detector) and written with partial updates, so concurrent Lambdas do not overwrite
each other's changes.
"""
import copy
import threading
import time
import uuid
from decimal import Decimal

from . import config
from .models import CATALOG, fresh_building

META_KEY = "__meta__"


def new_id():
    return uuid.uuid4().hex[:8]


# --------------------------------------------------------------------------- memory
class MemoryStore:
    def __init__(self):
        self._lock = threading.RLock()
        self.reset()

    def reset(self):
        with self._lock:
            self._buildings = {}
            self._meta = {"sm": 0.0, "last_ms": None}
            self._readings = {}
            self._incidents = {}
            self._events = []
            for i, spec in enumerate(CATALOG):
                self._buildings[spec["id"]] = fresh_building(spec, i)

    # buildings
    def get_buildings(self):
        with self._lock:
            ordered = sorted(self._buildings.values(), key=lambda b: b["ord"])
            return [copy.deepcopy(b) for b in ordered]

    def update_building(self, bid, **fields):
        with self._lock:
            self._buildings[bid].update(copy.deepcopy(fields))

    # meta / simulation clock
    def get_meta(self):
        with self._lock:
            return dict(self._meta)

    def set_meta(self, **fields):
        with self._lock:
            self._meta.update(fields)

    def try_advance(self, old_ms, new_ms):
        """Claim the right to advance the simulation from old_ms to new_ms."""
        with self._lock:
            if self._meta["last_ms"] != old_ms:
                return False
            self._meta["last_ms"] = new_ms
            return True

    # readings (newest first on read)
    def add_reading(self, bid, reading):
        with self._lock:
            lst = self._readings.setdefault(bid, [])
            lst.append(copy.deepcopy(reading))
            if len(lst) > 500:
                del lst[:100]

    def get_readings(self, bid, limit=60):
        with self._lock:
            lst = self._readings.get(bid, [])
            return [copy.deepcopy(r) for r in reversed(lst[-limit:])]

    # incidents
    def put_incident(self, inc):
        with self._lock:
            self._incidents[inc["id"]] = copy.deepcopy(inc)

    def get_incident(self, iid):
        with self._lock:
            inc = self._incidents.get(iid)
            return copy.deepcopy(inc) if inc else None

    def update_incident(self, iid, **fields):
        with self._lock:
            self._incidents[iid].update(copy.deepcopy(fields))

    def append_step(self, iid, step):
        with self._lock:
            self._incidents[iid]["steps"].append(copy.deepcopy(step))

    def list_incidents(self, limit=20):
        with self._lock:
            items = sorted(self._incidents.values(), key=lambda i: i["opened_ms"], reverse=True)
            return [copy.deepcopy(i) for i in items[:limit]]

    # events: notifications, student reports, simulation controls
    def add_event(self, ev):
        with self._lock:
            ev = dict(ev)
            ev.setdefault("id", new_id())
            ev.setdefault("ts_ms", int(time.time() * 1000))
            self._events.append(ev)
            if len(self._events) > 300:
                del self._events[:100]
            return ev

    def list_events(self, limit=20, kind=None):
        with self._lock:
            items = [e for e in self._events if kind is None or e["kind"] == kind]
            items.sort(key=lambda e: e["ts_ms"], reverse=True)
            return [copy.deepcopy(e) for e in items[:limit]]


# --------------------------------------------------------------------------- dynamodb
def _ser(o):
    if isinstance(o, float):
        return Decimal(str(round(o, 4)))
    if isinstance(o, dict):
        return {k: _ser(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_ser(v) for v in o]
    return o


def _de(o):
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    if isinstance(o, dict):
        return {k: _de(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_de(v) for v in o]
    return o


class DynamoStore:
    def __init__(self, resource=None):
        import boto3

        self._ddb = resource or boto3.resource("dynamodb", region_name=config.REGION)
        self.t_buildings = self._ddb.Table(config.BUILDINGS_TABLE)
        self.t_readings = self._ddb.Table(config.READINGS_TABLE)
        self.t_incidents = self._ddb.Table(config.INCIDENTS_TABLE)
        self.t_events = self._ddb.Table(config.EVENTS_TABLE)

    # helpers
    @staticmethod
    def _scan_all(table, **kw):
        items, resp = [], table.scan(**kw)
        items.extend(resp.get("Items", []))
        while "LastEvaluatedKey" in resp:
            resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"], **kw)
            items.extend(resp.get("Items", []))
        return [_de(i) for i in items]

    @staticmethod
    def _update(table, key, fields):
        names, vals, sets = {}, {}, []
        for i, (k, v) in enumerate(fields.items()):
            names[f"#k{i}"] = k
            vals[f":v{i}"] = _ser(v)
            sets.append(f"#k{i} = :v{i}")
        table.update_item(
            Key=key,
            UpdateExpression="SET " + ", ".join(sets),
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=vals,
        )

    def _seed(self):
        for i, spec in enumerate(CATALOG):
            b = fresh_building(spec, i)
            self.t_buildings.put_item(Item=_ser({**b, "building_id": b["id"]}))
        self.t_buildings.put_item(Item=_ser({"building_id": META_KEY, "sm": 0.0}))

    def reset(self):
        for table, keys in (
            (self.t_buildings, ["building_id"]),
            (self.t_readings, ["building_id", "ts"]),
            (self.t_incidents, ["incident_id"]),
            (self.t_events, ["event_id"]),
        ):
            names = {f"#k{i}": k for i, k in enumerate(keys)}
            proj = ", ".join(names)
            items = self._scan_all(table, ProjectionExpression=proj, ExpressionAttributeNames=names)
            with table.batch_writer() as bw:
                for it in items:
                    bw.delete_item(Key={k: _ser(it[k]) for k in keys})
        self._seed()

    # buildings
    def get_buildings(self):
        items = self._scan_all(self.t_buildings)
        items = [i for i in items if i["building_id"] != META_KEY]
        return sorted(items, key=lambda b: b["ord"])

    def update_building(self, bid, **fields):
        self._update(self.t_buildings, {"building_id": bid}, fields)

    # meta
    def get_meta(self):
        resp = self.t_buildings.get_item(Key={"building_id": META_KEY})
        if "Item" not in resp:
            self._seed()
            return {"sm": 0.0, "last_ms": None}
        item = _de(resp["Item"])
        return {"sm": item.get("sm", 0.0), "last_ms": item.get("last_ms")}

    def set_meta(self, **fields):
        self._update(self.t_buildings, {"building_id": META_KEY}, fields)

    def try_advance(self, old_ms, new_ms):
        from boto3.dynamodb.conditions import Attr
        from botocore.exceptions import ClientError

        cond = Attr("last_ms").not_exists() if old_ms is None else Attr("last_ms").eq(old_ms)
        try:
            self.t_buildings.update_item(
                Key={"building_id": META_KEY},
                UpdateExpression="SET last_ms = :n",
                ConditionExpression=cond,
                ExpressionAttributeValues={":n": new_ms},
            )
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            raise

    # readings
    def add_reading(self, bid, reading):
        item = {**reading, "building_id": bid, "expires": int(time.time()) + 7200}
        self.t_readings.put_item(Item=_ser(item))

    def get_readings(self, bid, limit=60):
        from boto3.dynamodb.conditions import Key

        resp = self.t_readings.query(
            KeyConditionExpression=Key("building_id").eq(bid), ScanIndexForward=False, Limit=limit
        )
        return [_de(i) for i in resp.get("Items", [])]

    # incidents
    def put_incident(self, inc):
        self.t_incidents.put_item(Item=_ser({**inc, "incident_id": inc["id"]}))

    def get_incident(self, iid):
        resp = self.t_incidents.get_item(Key={"incident_id": iid})
        return _de(resp["Item"]) if "Item" in resp else None

    def update_incident(self, iid, **fields):
        self._update(self.t_incidents, {"incident_id": iid}, fields)

    def append_step(self, iid, step):
        self.t_incidents.update_item(
            Key={"incident_id": iid},
            UpdateExpression="SET steps = list_append(if_not_exists(steps, :e), :s)",
            ExpressionAttributeValues={":e": [], ":s": [_ser(step)]},
        )

    def list_incidents(self, limit=20):
        items = self._scan_all(self.t_incidents)
        items.sort(key=lambda i: i["opened_ms"], reverse=True)
        return items[:limit]

    # events
    def add_event(self, ev):
        ev = dict(ev)
        ev.setdefault("id", new_id())
        ev.setdefault("ts_ms", int(time.time() * 1000))
        self.t_events.put_item(Item=_ser({**ev, "event_id": ev["id"]}))
        return ev

    def list_events(self, limit=20, kind=None):
        items = self._scan_all(self.t_events)
        items = [e for e in items if kind is None or e["kind"] == kind]
        items.sort(key=lambda e: e["ts_ms"], reverse=True)
        return items[:limit]


# --------------------------------------------------------------------------- factory
_store = None


def get_store():
    global _store
    if _store is None:
        _store = DynamoStore() if config.STORE == "dynamodb" else MemoryStore()
    return _store


def set_store(store):
    global _store
    _store = store
