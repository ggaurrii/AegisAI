"""Static catalog and helpers for the simulated campus."""

# The simulated clock starts at 03:00, the quietest hour of the night.
CLOCK_START_MIN = 3 * 60

PUMP_LPM = 30.0          # inflow while the pump runs
PUMP_ON_BELOW = 50.0     # float switch: pump starts below this level (%)
PUMP_OFF_ABOVE = 70.0    # and stops above this level (%)

CATALOG = [
    dict(id="hostel-a", name="Hostel block A", kind="hostel", capacity_l=3000, base_use_lpm=3.2, start_level=78),
    dict(id="hostel-b", name="Hostel block B", kind="hostel", capacity_l=3000, base_use_lpm=2.8, start_level=62),
    dict(id="hostel-c", name="Hostel block C", kind="hostel", capacity_l=2800, base_use_lpm=3.0, start_level=70),
    dict(id="library", name="Library", kind="library", capacity_l=1800, base_use_lpm=1.2, start_level=71),
    dict(id="mess", name="Mess", kind="mess", capacity_l=2500, base_use_lpm=4.0, start_level=58),
    dict(id="academic", name="Academic block", kind="academic", capacity_l=2000, base_use_lpm=1.0, start_level=66),
]


def sim_clock(sm):
    """Simulated minutes since start -> 'HH:MM' on the simulated night clock."""
    total = int(CLOCK_START_MIN + sm)
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"


def fresh_building(spec, order):
    base = spec["base_use_lpm"]
    return {
        "id": spec["id"],
        "name": spec["name"],
        "kind": spec["kind"],
        "ord": order,
        "capacity_l": spec["capacity_l"],
        "base_use_lpm": base,
        "baseline_out_lpm": base,        # learned from calm readings
        "level_pct": float(spec["start_level"]),
        "inflow_lpm": 0.0,
        "outflow_lpm": base,
        "pump_on": False,
        "pump_override": None,           # "off" once the agent stops the pump
        "valve": "open",                 # riser valve V2
        "status": "ok",                  # ok | alert | fixed
        "lost_l": 0.0,                   # cumulative leaked litres
        "spilled_l": 0.0,                # cumulative overflow litres
        "maintenance": None,             # {"label", "from_sm", "until_sm"} while a flush is scheduled
        "suppress_until_sm": 0.0,
        # Hidden ground truth. Never sent to the UI or the agent: they only see sensor readings.
        "truth": {"leak_lpm": 0.0, "stuck_float": False, "flush_lpm": 0.0},
    }
