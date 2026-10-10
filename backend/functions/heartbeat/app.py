"""EventBridge schedule (every minute). Keeps the world moving and the detector running
even when nobody has the dashboard open."""
from core import engine
from core.store import get_store


def handler(event, context):
    advanced = engine.tick(get_store())
    return {"advanced": advanced}
