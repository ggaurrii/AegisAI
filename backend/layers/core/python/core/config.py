"""Runtime configuration. Everything comes from environment variables.

Other modules read these as `config.NAME` at call time, so tests can override them.
"""
import os


def _float(name, default):
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return float(default)


# memory = in-process store for local dev and tests, dynamodb = real AWS storage
STORE = os.environ.get("STORE", "memory")

# local = rule-based planner, bedrock = Strands agent driven by Claude on Bedrock.
# If the model call fails, the agent falls back to the rule-based planner and says so.
AGENT_MODE = os.environ.get("AGENT_MODE", "local")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "")
REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))

# When set, incidents are handed to this Lambda asynchronously. Otherwise a thread is used.
AGENT_FUNCTION_NAME = os.environ.get("AGENT_FUNCTION_NAME", "")
ALERT_TOPIC_ARN = os.environ.get("ALERT_TOPIC_ARN", "")

# 1 real second = SIM_SPEEDUP / 60 simulated minutes. 30 makes a leak visible within seconds.
SIM_SPEEDUP = _float("SIM_SPEEDUP", 30)
# Pause between agent steps so the timeline is readable while it streams in.
AGENT_STEP_DELAY = _float("AGENT_STEP_DELAY", 1.6)

BUILDINGS_TABLE = os.environ.get("BUILDINGS_TABLE", "JalRakshak-Buildings")
READINGS_TABLE = os.environ.get("READINGS_TABLE", "JalRakshak-Readings")
INCIDENTS_TABLE = os.environ.get("INCIDENTS_TABLE", "JalRakshak-Incidents")
EVENTS_TABLE = os.environ.get("EVENTS_TABLE", "JalRakshak-Events")
