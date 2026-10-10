"""One tick of the world: advance the simulation, then run the detector."""
import time

from . import detector, sim


def tick(store, now=None, rng=None):
    now = time.time() if now is None else now
    advanced = sim.advance(store, now, rng)
    if advanced:
        detector.check(store, now)
    return advanced
