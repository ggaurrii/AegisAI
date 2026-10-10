"""The incident agent.

AGENT_MODE=bedrock runs a Strands agent driven by Claude on Amazon Bedrock.
AGENT_MODE=local runs a rule-based planner that calls the very same tools.
If the model call fails, the agent says so in the timeline and falls back to the rules.
"""
from . import config, notify, tools as T
from .models import sim_clock
from .store import get_store

SYSTEM_PROMPT = """You are JalRakshak, an operations agent for campus water infrastructure.
A sensor anomaly was detected in one building. Find out what is happening and fix it safely.

Work in this order:
1. Investigate. Call get_recent_readings, analyze_baseline_flow, check_mass_balance, check_pump_log and
   check_maintenance_schedule before concluding anything.
2. Decide. Call record_decision once, with the cause, the action and a short rationale grounded in the numbers.
3. Act. Take only the action that matches your decision: close_valve for riser_leak, stop_pump for
   tank_overflow. Take no action for scheduled_use. For unknown, escalate. Then call notify_staff with one or
   two sentences (skip it for scheduled_use).
4. Verify. Call verify_fix and read the result honestly. If the fix did not work, escalate.
5. Finish. Call finish_incident exactly once with outcome resolved, dismissed or escalated, and a one sentence summary.

Cause guide:
- riser_leak: outflow far above baseline, the tank balance is intact, the pump is only refilling a draining tank,
  and no maintenance is scheduled.
- tank_overflow: tank full, water enters but never leaves through a meter, the pump keeps running while full.
- scheduled_use: a maintenance window is active.
Never guess. Never call an action tool before record_decision."""


# ------------------------------------------------------------------ rule-based planner
def _run_local(ctx):
    name = ctx.incident["building_name"]
    T.get_recent_readings(ctx)
    flow = T.analyze_baseline_flow(ctx)
    mb = T.check_mass_balance(ctx)
    pump = T.check_pump_log(ctx)
    sched = T.check_maintenance_schedule(ctx)

    if sched["active"]:
        T.record_decision(ctx, "scheduled_use", "none",
                          f"{sched['label']} explains the extra flow, so this is expected. No action is needed.")
        T.finish_incident(ctx, "dismissed", f"{name}: the flow was a scheduled tank flush. No action taken.")
        return

    if mb["overflow"] and pump["on_while_full"]:
        T.record_decision(ctx, "tank_overflow", "stop_pump",
                          "The tank is full, water is entering but not leaving through a meter, and the pump keeps "
                          "running while full. The float switch has failed. Stopping the pump is reversible and low risk.")
        T.stop_pump(ctx)
        T.notify_staff(ctx, "high", f"{name}: tank overflow, float switch stuck. Pump stopped. Please inspect the float switch.")
        v = T.verify_fix(ctx)
        _wrap_up(ctx, v, f"{name}: the overflow was a stuck float switch. Pump stopped", name)
        return

    if flow["abnormal"] and not mb["overflow"]:
        T.record_decision(ctx, "riser_leak", "close_valve",
                          f"Outflow is {flow['ratio']:.0f} times the baseline, the tank balance is intact, the pump is "
                          "only refilling a draining tank and no maintenance is scheduled. Water is being lost "
                          "downstream of the tank. Closing the riser valve is reversible and low risk.")
        T.close_valve(ctx)
        T.notify_staff(ctx, "high", f"{name}: leak confirmed and riser valve V2 closed. Please inspect the riser.")
        v = T.verify_fix(ctx)
        _wrap_up(ctx, v, f"{name}: a riser leak was isolated by closing valve V2", name)
        return

    T.record_decision(ctx, "unknown", "escalate",
                      "The evidence does not match a known pattern, so I will not act on my own. Escalating to staff.")
    T.notify_staff(ctx, "high", f"{name}: unusual water readings the system could not explain. Please check on site.")
    T.finish_incident(ctx, "escalated", f"{name}: the cause is unknown. Staff have been asked to check.")


def _wrap_up(ctx, verify, fixed_text, name):
    loss = ctx.loss_so_far()
    if verify.get("resolved"):
        T.finish_incident(ctx, "resolved", f"{fixed_text}. About {loss:.0f} L was lost before the fix.")
    else:
        T.notify_staff(ctx, "high", f"{name}: the automatic fix did not work. Please go to the site.")
        T.finish_incident(ctx, "escalated", f"{name}: the automatic fix did not work. Staff have been asked to go on site.")


# ------------------------------------------------------------------ Strands agent
def _strands_tools(ctx):
    from strands import tool

    @tool
    def get_recent_readings(minutes: int = 10) -> dict:
        """Summarize recent sensor readings for the affected building.

        Args:
            minutes: Simulated minutes of history to include.
        """
        return T.get_recent_readings(ctx, minutes)

    @tool
    def analyze_baseline_flow() -> dict:
        """Compare the current outlet flow with the learned baseline flow and estimate excess loss."""
        return T.analyze_baseline_flow(ctx)

    @tool
    def check_mass_balance(minutes: int = 10) -> dict:
        """Compare water in, water out and the change in tank volume to find water that left unmetered.

        Args:
            minutes: Simulated minutes of history to include.
        """
        return T.check_mass_balance(ctx, minutes)

    @tool
    def check_pump_log(minutes: int = 10) -> dict:
        """Check how long the pump ran, and whether it kept running while the tank was full.

        Args:
            minutes: Simulated minutes of history to include.
        """
        return T.check_pump_log(ctx, minutes)

    @tool
    def check_maintenance_schedule() -> dict:
        """Check whether maintenance such as a tank flush is currently scheduled for this building."""
        return T.check_maintenance_schedule(ctx)

    @tool
    def record_decision(cause: str, action: str, rationale: str) -> dict:
        """Record your diagnosis and chosen action. Must be called before any action tool.

        Args:
            cause: One of riser_leak, tank_overflow, scheduled_use, unknown.
            action: close_valve for riser_leak, stop_pump for tank_overflow, none for scheduled_use, escalate for unknown.
            rationale: Two or three sentences citing the numbers you observed.
        """
        return T.record_decision(ctx, cause, action, rationale)

    @tool
    def close_valve() -> dict:
        """Close riser valve V2 to isolate a leaking riser. Reversible. Only valid after deciding close_valve."""
        return T.close_valve(ctx)

    @tool
    def stop_pump() -> dict:
        """Stop the tank pump to end an overflow. Reversible. Only valid after deciding stop_pump."""
        return T.stop_pump(ctx)

    @tool
    def notify_staff(severity: str, message: str) -> dict:
        """Alert the warden and plumber.

        Args:
            severity: info, warning or high.
            message: One or two plain sentences saying what happened and what to inspect.
        """
        return T.notify_staff(ctx, severity, message)

    @tool
    def verify_fix() -> dict:
        """Wait a few seconds, then re-read the sensors to confirm the action worked."""
        return T.verify_fix(ctx)

    @tool
    def finish_incident(outcome: str, summary: str) -> dict:
        """Close the incident.

        Args:
            outcome: resolved, dismissed or escalated.
            summary: One plain sentence for the facility manager.
        """
        return T.finish_incident(ctx, outcome, summary)

    return [get_recent_readings, analyze_baseline_flow, check_mass_balance, check_pump_log,
            check_maintenance_schedule, record_decision, close_valve, stop_pump, notify_staff,
            verify_fix, finish_incident]


def _run_strands(ctx):
    from strands import Agent
    from strands.models import BedrockModel

    model = BedrockModel(model_id=config.BEDROCK_MODEL_ID, region_name=config.REGION, temperature=0.1)
    agent = Agent(model=model, tools=_strands_tools(ctx), system_prompt=SYSTEM_PROMPT, callback_handler=None)
    inc = ctx.incident
    agent(f"Incident {inc['id']} in {inc['building_name']}. {inc['detect_text']} "
          "Investigate, decide, act, verify and finish.")


# ------------------------------------------------------------------ entry point
def _escalate(ctx, err):
    name = ctx.incident["building_name"]
    why = f" ({type(err).__name__})" if err else ""
    notify.send(ctx.store, "high", f"{name}: the agent could not finish the investigation{why}. Please check on site.",
                building_id=ctx.building_id, clock=sim_clock(ctx.sm()))
    T.finish_incident(ctx, "escalated", f"{name}: the agent could not finish, so staff were alerted.")


def run_incident(incident_id, store=None, rt=None):
    store = store or get_store()
    ctx = T.Ctx(store, incident_id, rt)
    inc = ctx.incident
    if not inc or inc["status"] != "investigating":
        return inc
    use_bedrock = config.AGENT_MODE == "bedrock"
    store.update_incident(incident_id, agent=(f"bedrock:{config.BEDROCK_MODEL_ID}" if use_bedrock else "rules"))
    try:
        if use_bedrock:
            if not config.BEDROCK_MODEL_ID:
                raise RuntimeError("BEDROCK_MODEL_ID is not set")
            _run_strands(ctx)
        else:
            _run_local(ctx)
    except Exception as err:
        if use_bedrock:
            ctx.log("investigate", "AI model unavailable",
                    f"Switching to the rule-based planner. Reason: {type(err).__name__}: {str(err)[:160]}",
                    tool="agent")
            store.update_incident(incident_id, agent="rules (fallback after model error)")
            ctx.decision = None
            try:
                _run_local(ctx)
            except Exception as err2:
                _escalate(ctx, err2)
        else:
            _escalate(ctx, err)
    if (store.get_incident(incident_id) or {}).get("status") == "investigating":
        _escalate(ctx, None)  # the agent stopped without closing the incident
    return store.get_incident(incident_id)
