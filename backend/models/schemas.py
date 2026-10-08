from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class UserRole(str, Enum):
    STUDENT = "student"
    MANAGER = "manager"

class BuildingStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    ALERT = "ALERT"
    CRITICAL = "CRITICAL"

class IncidentType(str, Enum):
    LEAK_SUSPECTED = "LEAK_SUSPECTED"
    TANK_DEPLETION = "TANK_DEPLETION"
    PUMP_ABNORMALITY = "PUMP_ABNORMALITY"
    HIGH_DEMAND = "HIGH_DEMAND"

class IncidentSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IncidentStatus(str, Enum):
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTION_EXECUTED = "ACTION_EXECUTED"
    VERIFYING = "VERIFYING"
    STABILIZED = "STABILIZED"
    ESCALATED = "ESCALATED"

class ActionType(str, Enum):
    PUMP_INFLOW_REDUCTION = "PUMP_INFLOW_REDUCTION"
    MAINTENANCE_DISPATCH = "MAINTENANCE_DISPATCH"
    RESIDENT_ALERT = "RESIDENT_ALERT"
    VALVE_ISOLATION = "VALVE_ISOLATION"

class ActionStatus(str, Enum):
    RECOMMENDED = "RECOMMENDED"
    APPROVED = "APPROVED"
    EXECUTED = "EXECUTED"
    REJECTED = "REJECTED"

# --- Domain Entities ---

class User(BaseModel):
    userId: str
    email: str
    name: str
    role: UserRole
    buildingId: Optional[str] = None
    room: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class Building(BaseModel):
    buildingId: str
    name: str
    code: str
    campus: str = "North Campus"
    residentCount: int = 350
    tankCapacityLitres: float = 50000.0
    normalBaselineLph: float = 470.0
    currentTankLevelPct: float = 85.0
    currentInflowLph: float = 500.0
    currentOutflowLph: float = 470.0
    currentStatus: BuildingStatus = BuildingStatus.OPTIMAL
    lastReadingTimestamp: Optional[str] = None

class WaterReading(BaseModel):
    readingId: str
    buildingId: str
    timestamp: str
    tankLevelPct: float
    inflowLph: float
    outflowLph: float
    pressurePsi: float = 45.0
    waterTempC: float = 21.5
    isSimulated: bool = False

class RecommendedAction(BaseModel):
    actionId: str
    actionType: ActionType
    title: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    status: ActionStatus = ActionStatus.RECOMMENDED

class Incident(BaseModel):
    incidentId: str
    buildingId: str
    type: IncidentType
    severity: IncidentSeverity
    status: IncidentStatus
    anomalyScore: float
    baselineExpectedLph: float
    observedLph: float
    agentAssessment: Optional[str] = None
    confidencePct: float = 85.0
    recommendedActions: List[RecommendedAction] = Field(default_factory=list)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    resolvedAt: Optional[str] = None
    waterSavedLitres: Optional[float] = 0.0
    verificationResult: Optional[Dict[str, Any]] = None

class AgentToolLog(BaseModel):
    logId: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    toolName: str
    incidentId: Optional[str] = None
    buildingId: Optional[str] = None
    inputSummary: str
    resultSummary: str
    executionTimeMs: float = 120.0
    status: str = "SUCCESS"
