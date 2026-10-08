from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime

from backend.models.schemas import (
    User, UserRole, Building, WaterReading, Incident,
    IncidentStatus, AgentToolLog, ActionStatus
)
from backend.services.dynamo_store import store
from backend.agents.aquaops_agent import agent
from backend.tools.agent_tools import AgentToolsRegistry

app = FastAPI(
    title="AquaOps API",
    description="Autonomous AI Water Operations Platform Backend API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Role-Based Access Dependency ---

def get_current_user(x_user_role: Optional[str] = Header(None), x_user_id: Optional[str] = Header(None)) -> User:
    """Extract authenticated user role and identity (simulates Cognito JWT Authorizer)."""
    role = x_user_role or "manager"
    user_id = x_user_id or ("mgr-1" if role == "manager" else "stu-1")
    user = store.users.get(user_id)
    if not user:
        user = User(
            userId=user_id,
            email=f"{role}@campus.edu",
            name="Facility Lead" if role == "manager" else "Alex Chen",
            role=UserRole(role),
            buildingId="BLD-C"
        )
        store.users[user_id] = user
    return user

def require_manager(user: User = Depends(get_current_user)):
    if user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Operational access restricted to Facility Managers")
    return user

# --- Auth Routes ---

class LoginRequest(BaseModel):
    email: str
    role: UserRole
    buildingId: Optional[str] = "BLD-C"

@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    user_id = f"usr-{uuid.uuid4().hex[:6]}"
    user = User(
        userId=user_id,
        email=req.email,
        name=req.email.split("@")[0].capitalize(),
        role=req.role,
        buildingId=req.buildingId
    )
    store.users[user_id] = user
    return {
        "accessToken": f"mock-cognito-jwt-{user_id}",
        "user": user
    }

@app.get("/api/v1/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return user

# --- Telemetry & Buildings ---

@app.get("/api/v1/buildings", response_model=List[Building])
def list_buildings():
    return store.get_all_buildings()

@app.get("/api/v1/buildings/{building_id}", response_model=Building)
def get_building(building_id: str):
    b = store.get_building(building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    return b

@app.get("/api/v1/buildings/{building_id}/readings", response_model=List[WaterReading])
def get_building_readings(building_id: str, hours: int = Query(24)):
    return store.get_readings(building_id, limit=hours)

class IngestReadingRequest(BaseModel):
    buildingId: str
    tankLevelPct: float
    inflowLph: float
    outflowLph: float
    pressurePsi: Optional[float] = 45.0
    waterTempC: Optional[float] = 21.0
    isSimulated: bool = False

@app.post("/api/v1/telemetry/readings", response_model=WaterReading)
def ingest_reading(req: IngestReadingRequest):
    reading = WaterReading(
        readingId=f"read-{uuid.uuid4().hex[:8]}",
        buildingId=req.buildingId,
        timestamp=datetime.utcnow().isoformat() + "Z",
        tankLevelPct=req.tankLevelPct,
        inflowLph=req.inflowLph,
        outflowLph=req.outflowLph,
        pressurePsi=req.pressurePsi or 45.0,
        waterTempC=req.waterTempC or 21.0,
        isSimulated=req.isSimulated
    )
    store.add_reading(reading)
    return reading

# --- Incidents & Operations ---

@app.get("/api/v1/incidents", response_model=List[Incident])
def list_incidents(building_id: Optional[str] = None):
    all_inc = store.get_all_incidents()
    if building_id:
        return [i for i in all_inc if i.buildingId == building_id]
    return all_inc

@app.get("/api/v1/incidents/{incident_id}", response_model=Incident)
def get_incident(incident_id: str):
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@app.post("/api/v1/incidents/{incident_id}/investigate")
def run_investigation(incident_id: str, manager: User = Depends(require_manager)):
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    updated = agent.investigate_incident(inc.buildingId)
    return updated

@app.post("/api/v1/incidents/{incident_id}/actions/approve")
def approve_actions(incident_id: str, manager: User = Depends(require_manager)):
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    updated = agent.execute_approved_actions(incident_id)
    return updated

@app.post("/api/v1/incidents/{incident_id}/verify")
def verify_incident(incident_id: str, manager: User = Depends(require_manager)):
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    updated = agent.verify_incident_recovery(incident_id)
    return updated

# --- Agent Activity Log ---

@app.get("/api/v1/agent/activity", response_model=List[AgentToolLog])
def get_agent_activity(limit: int = 50):
    return store.get_agent_logs(limit=limit)

# --- Simulation Controls (Manager Only) ---

class SimulationModeRequest(BaseModel):
    buildingId: str
    mode: str  # NORMAL, LEAK, HIGH_DEMAND, SENSOR_FAIL

@app.post("/api/v1/simulation/mode")
def set_simulation_mode(req: SimulationModeRequest, manager: User = Depends(require_manager)):
    b = store.get_building(req.buildingId)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    
    if req.mode == "LEAK":
        # Generate progressive leak reading spike
        reading = WaterReading(
            readingId=f"sim-{uuid.uuid4().hex[:6]}",
            buildingId=req.buildingId,
            timestamp=datetime.utcnow().isoformat() + "Z",
            tankLevelPct=41.0,
            inflowLph=500.0,
            outflowLph=720.0, # +53% spike
            pressurePsi=36.0,
            waterTempC=21.2,
            isSimulated=True
        )
        store.add_reading(reading)
        # Autonomous agent triggered on anomaly
        incident = agent.investigate_incident(req.buildingId)
        return {"status": "LEAK_TRIGGERED", "incident": incident}
        
    elif req.mode == "NORMAL":
        reading = WaterReading(
            readingId=f"sim-{uuid.uuid4().hex[:6]}",
            buildingId=req.buildingId,
            timestamp=datetime.utcnow().isoformat() + "Z",
            tankLevelPct=82.0,
            inflowLph=500.0,
            outflowLph=470.0,
            pressurePsi=45.0,
            waterTempC=21.0,
            isSimulated=True
        )
        store.add_reading(reading)
        return {"status": "NORMAL_RESTORED"}

    return {"status": "MODE_APPLIED"}

@app.post("/api/v1/simulation/reset")
def reset_simulation(manager: User = Depends(require_manager)):
    store._seed_initial_data()
    store.incidents.clear()
    store.agent_logs.clear()
    return {"status": "SYSTEM_RESET_SUCCESS"}

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "AquaOps Core", "timestamp": datetime.utcnow().isoformat() + "Z"}
