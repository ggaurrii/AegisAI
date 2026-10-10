import importlib.util
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "layers" / "core" / "python"))

from core import config, dispatch, engine, sim, tools as T  # noqa: E402
from core.store import MemoryStore  # noqa: E402


class Clock:
    def __init__(self, t=1_000_000.0):
        self.t = t

    def now(self):
        return self.t

    def sleep(self, s):
        self.t += s


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def rt(clock):
    return T.Runtime(now=clock.now, sleep=clock.sleep, step_delay=1.5)


@pytest.fixture
def started(monkeypatch):
    """Capture incident ids instead of launching the agent, so tests control when it runs."""
    ids = []
    monkeypatch.setattr(dispatch, "start_agent", lambda iid: ids.append(iid))
    return ids


@pytest.fixture(autouse=True)
def _defaults(monkeypatch):
    monkeypatch.setattr(config, "SIM_SPEEDUP", 30.0)
    monkeypatch.setattr(config, "AGENT_MODE", "local")
    monkeypatch.setattr(config, "ALERT_TOPIC_ARN", "")


def warm_up(store, clock, ticks=8):
    engine.tick(store, clock.t)  # first call only stamps the clock
    for _ in range(ticks):
        clock.t += 1.5
        engine.tick(store, clock.t)


def inject(store, clock, started, kind, building_id, max_ticks=15):
    """Warm up, inject a hidden fault, then tick until the detector opens an incident."""
    warm_up(store, clock)
    sim.apply_scenario(store, kind, building_id)
    for _ in range(max_ticks):
        clock.t += 1.5
        engine.tick(store, clock.t)
        if started:
            return started[0]
    return None


def load_lambda(name):
    path = ROOT / "functions" / name / "app.py"
    spec = importlib.util.spec_from_file_location(f"fn_{name}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
