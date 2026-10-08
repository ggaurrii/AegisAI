# AquaOps — Autonomous AI Water Operations Platform

> **Your water infrastructure, managed intelligently.**  
> *Detect waste. Investigate problems. Take action. Before water runs out.*

AquaOps is an agentic climate-tech operations platform built for university campuses and municipal facility clusters. Grounded in the **Heat & Water** hackathon track, AquaOps solves silent water losses (pipe ruptures, valve failures, and reservoir depletion) using a continuous closed-loop autonomous agent:

$$\textbf{Sense} \longrightarrow \textbf{Detect} \longrightarrow \textbf{Investigate} \longrightarrow \textbf{Reason} \longrightarrow \textbf{Act} \longrightarrow \textbf{Verify}$$

---

## 1. System Architecture

```text
       [ IoT Ultrasonic & Flow Sensors ]
                      │
                      ▼ (POST /readings)
           [ Amazon API Gateway ]
                      │
                      ▼
             [ AWS Lambda ] ───► [ Amazon DynamoDB ]
                      │
                      ▼ (PutEvents: reading.ingested)
           [ Amazon EventBridge ]
                      │
                      ▼ (Rule: Z-Score Outflow Spike)
         [ AquaOps Strands Agent ]
                      │
       ┌──────────────┴──────────────┐
       ▼                             ▼
[ Investigation Tools ]      [ Operational Actions ]
 - get_latest_reading()       - execute_pump_inflow_adjustment()
 - get_consumption_history()  - create_maintenance_ticket()
 - get_all_blocks_summary()   - send_water_alert() (SNS)
 - get_weather()              - schedule_recheck() (SQS/Step Functions)
 - calculate_anomaly()                       │
       │                                     ▼
       ▼                             [ Closed-Loop Verification ]
[ Facility Manager Console ]                 │
 (Human-in-the-Loop Approval)                ▼
                                  🟢 INCIDENT STABILIZED
                                  (Water Saved Certified)
```

---

## 2. Meaningful AWS Service Integration

| AWS Service | Architecture Function | Local MVP Implementation |
| :--- | :--- | :--- |
| **Amazon Cognito** | Cryptographic JWT token issuance, User directory, custom attributes (`custom:role`, `custom:buildingId`). | Server-side role inspection middleware simulating Cognito claims. |
| **Amazon API Gateway** | Managed REST routing, CORS, and request throttling. | FastAPI async router mirroring HTTP endpoint specs. |
| **AWS Lambda** | Event-driven microservices for ingestion and automated remediation triggers. | Stateless modular functions in `backend/`. |
| **Amazon DynamoDB** | Low-latency NoSQL persistence for time-series telemetry, building state, incidents, and audit trails. | High-performance DynamoDB abstraction in `backend/services/dynamo_store.py`. |
| **Amazon EventBridge** | Decoupled event bus routing sensor telemetry and anomaly triggers. | Real-time event publisher connecting sensors to Strands Agent. |
| **Amazon SNS** | Push notifications broadcasting urgent water conservation advisories to residents. | SNS dispatcher logging to audit table and student dashboard. |
| **AWS Strands Agents SDK** | Structured agent tool-calling framework orchestrating operational decisions. | Autonomous multi-tool agent in `backend/agents/aquaops_agent.py`. |

---

## 3. User Roles & Access Control

1. **Hostel Resident (Student)**:
   - Scoped access strictly to assigned building (`/student`).
   - View live water level gauge, daily consumption rate, AI-generated water saving advice, and localized water advisories.
   - Strictly forbidden from modifying pumps, dispatching tickets, or viewing private operational telemetry of other blocks.

2. **Facility Manager**:
   - Access to full **AquaOps Command Center** (`/manager`).
   - Campus-wide water inventory, flow rate analytics, active incident inspection, and real-time streaming tool-call audit log.
   - Human-in-the-Loop action approval gate and live incident simulator.

---

## 4. End-to-End 3-Minute Hackathon Demo Script

1. **Scene 1 (Campus Baseline)**:
   - Open Command Center at `http://localhost:3000/manager`.
   - All 4 Campus Blocks (A, B, C, D) are in green `OPTIMAL` status.
2. **Scene 2 (Anomaly Injection)**:
   - Click **"Simulate Leak — Block C (+53% Outflow)"**.
   - Outflow rate surges from 470 L/hr to 720 L/hr.
3. **Scene 3 (Autonomous Agent Investigation)**:
   - The agent executes tools in real time: queries current readings, queries 24h baseline (z-score: 6.57), checks peer blocks, checks weather (22.4°C), and calculates anomaly score (0.91).
   - Agent concludes: **Localized distribution pipeline leak detected (88% confidence)**.
4. **Scene 4 (Human-in-the-Loop Approval)**:
   - Incident #INC-XXXX appears with recommended actions: throttle pump by 40%, dispatch plumbing work order, and broadcast resident alert.
   - Facility manager clicks **"Approve & Execute Actions"**.
5. **Scene 5 (Resident View Notification)**:
   - Switch to Student Portal (`http://localhost:3000/student`).
   - Student dashboard displays high-priority water advisory explaining localized maintenance.
6. **Scene 6 (The Verification Loop)**:
   - In Command Center, click **"Trigger Recheck Verification (T+30m Loop)"**.
   - Flow drops back to 460 L/hr.
   - Status updates to **`🟢 INCIDENT STABILIZED`**, certifying **+3,500L water saved**.

---

## 5. Local Setup & Quickstart

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### Start the Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --port 8000
```
Backend API will be live at `http://localhost:8000` (docs at `http://localhost:8000/docs`).

### Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.
