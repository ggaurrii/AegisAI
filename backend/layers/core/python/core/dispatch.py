"""Hands an incident to the agent: async Lambda invoke on AWS, a thread locally."""
import json
import threading

from . import config


def start_agent(incident_id):
    if config.AGENT_FUNCTION_NAME:
        import boto3

        try:
            boto3.client("lambda", region_name=config.REGION).invoke(
                FunctionName=config.AGENT_FUNCTION_NAME,
                InvocationType="Event",
                Payload=json.dumps({"incident_id": incident_id}).encode(),
            )
        except Exception as err:  # the incident must never be left silently open
            from .store import get_store

            get_store().update_incident(
                incident_id, status="escalated",
                summary=f"Could not start the agent ({type(err).__name__}). Staff have been alerted.",
            )
        return "lambda"
    from . import agent

    threading.Thread(target=agent.run_incident, args=(incident_id,), daemon=True).start()
    return "thread"
