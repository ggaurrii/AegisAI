"""Invoked asynchronously by the detector. Runs the agent on one incident."""
from core import agent


def handler(event, context):
    incident = agent.run_incident(event["incident_id"])
    return {"incident_id": event["incident_id"], "status": (incident or {}).get("status")}
