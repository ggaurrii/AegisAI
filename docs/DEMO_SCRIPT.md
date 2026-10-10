# Demo video: 3 minutes

The rules want the video to show AWS, not just name it. Keep these tabs open before you record:
the dashboard, the CloudFormation stack, the agent Lambda's CloudWatch log, and a DynamoDB table with items.

| Time | Show | Say |
| --- | --- | --- |
| 0:00 to 0:20 | Landing page, hero loop | The problem in your own words. Add one real example from your campus here (a tank overflowing overnight, a tap nobody reported). That is what makes this yours. |
| 0:20 to 0:40 | Landing page, "A loop that finishes the job" | Most monitoring stops at an alert. Here the alert is the start of an investigation. |
| 0:40 to 1:50 | Dashboard. Press "Watch the agent fix a leak" | Calm campus first, then a leak in block B. Narrate each phase as it appears. Open Evidence on "Check water balance". Point out that the agent only sees sensors, and that the action tools refuse anything that does not match its decision. End on "Incident stabilized". |
| 1:50 to 2:15 | Simulate overflow, then flush | Same kind of alarm, different answers: stop the pump, and "leave it alone". This is the proof it reasons from evidence. |
| 2:15 to 2:45 | CloudFormation, Lambda log, DynamoDB | Lambda, API Gateway, DynamoDB, EventBridge heartbeat, SNS. Show the agent's log lines. If you enabled Bedrock, show the incident saying "Claude on Bedrock". |
| 2:45 to 3:00 | Dashboard | What you learned. Be upfront: sensors are simulated and the ingest API is ready for real ones. |

## Draft answers for the submission form

Edit these so they match what you actually deployed and recorded.

**What does your project do?**
JalRakshak is an AI operations manager for campus water. A detector flags unusual readings from tank and flow sensors, and an
agent investigates with five read-only tools, records a decision, takes a reversible action (close a riser valve, stop a pump,
alert staff), then re-reads the sensors to verify the fix before closing the incident. The same alarm gets different answers:
a leak is isolated, an overflow is traced to a stuck float switch and the pump is stopped, and a scheduled flush is dismissed
with no action. Sensors are simulated; the ingest API accepts real readings.

**How did you use AWS?** (Ship it)
AWS Lambda (api, heartbeat and agent functions sharing one layer), API Gateway HTTP API, DynamoDB (buildings, readings with TTL,
incidents, events), EventBridge (a one-minute heartbeat that runs the detector), SNS (staff alerts), CloudWatch Logs, and
CloudFormation through AWS SAM. [If enabled: Amazon Bedrock with the Strands Agents SDK, Claude choosing the tools.] If the model
call fails the agent falls back to a rule-based planner and says so in the timeline.

**AI tools used:** Claude (AI coding assistant).

## Before you submit

- Push the repo with a real commit history, and keep the `README.md`.
- Read the code you are presenting. `backend/layers/core/python/core/tools.py` and `agent.py` are the heart of it.
- Publish your blog on AWS Builder Center. The story of the fallback design and the water-balance maths is a good one.
