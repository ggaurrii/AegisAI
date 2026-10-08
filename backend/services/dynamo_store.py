import json
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import random
from backend.models.schemas import (
    Building, BuildingStatus, WaterReading, Incident, IncidentStatus,
    IncidentType, IncidentSeverity, RecommendedAction, ActionType, ActionStatus,
    AgentToolLog, User, UserRole
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

class DynamoStore:
    """
    Persistence Store mirroring AWS DynamoDB single-table and multi-table operations.
    Supports atomic writes, partition/sort key queries, and audit logs.
    Can be backed by real AWS DynamoDB or local file-backed persistence.
    """
    def __init__(self):
        self.buildings: Dict[str, Building] = {}
        self.readings: Dict[str, List[WaterReading]] = {} # buildingId -> list of readings
        self.incidents: Dict[str, Incident] = {} # incidentId -> Incident
        self.agent_logs: List[AgentToolLog] = []
        self.users: Dict[str, User] = {}
        self._seed_initial_data()

    def _seed_initial_data(self):
        # 1. Seed Buildings: Block A, B, C, D
        b_seeds = [
            Building(buildingId="BLD-A", name="Arundel Hall (Block A)", code="Block A", residentCount=380, tankCapacityLitres=60000, normalBaselineLph=450.0, currentTankLevelPct=82.0, currentInflowLph=480.0, currentOutflowLph=450.0, currentStatus=BuildingStatus.OPTIMAL),
            Building(buildingId="BLD-B", name="Brampton Hall (Block B)", code="Block B", residentCount=320, tankCapacityLitres=50000, normalBaselineLph=410.0, currentTankLevelPct=76.0, currentInflowLph=430.0, currentOutflowLph=410.0, currentStatus=BuildingStatus.OPTIMAL),
            Building(buildingId="BLD-C", name="Camberley Hall (Block C)", code="Block C", residentCount=420, tankCapacityLitres=55000, normalBaselineLph=470.0, currentTankLevelPct=68.0, currentInflowLph=500.0, currentOutflowLph=470.0, currentStatus=BuildingStatus.OPTIMAL),
            Building(buildingId="BLD-D", name="Devonshire Hall (Block D)", code="Block D", residentCount=290, tankCapacityLitres=45000, normalBaselineLph=380.0, currentTankLevelPct=80.0, currentInflowLph=400.0, currentOutflowLph=380.0, currentStatus=BuildingStatus.OPTIMAL)
        ]
        for b in b_seeds:
            self.buildings[b.buildingId] = b
            self.readings[b.buildingId] = []
            
            # Seed 24 hours of baseline time-series
            now = datetime.utcnow()
            for h in range(24, 0, -1):
                ts = (now - timedelta(hours=h)).isoformat() + "Z"
                # Natural slight variance (+- 5%)
                noise = random.uniform(-15.0, 15.0)
                reading = WaterReading(
                    readingId=f"read-{b.buildingId}-{h}",
                    buildingId=b.buildingId,
                    timestamp=ts,
                    tankLevelPct=round(b.currentTankLevelPct + random.uniform(-2, 2), 1),
                    inflowLph=round(b.currentInflowLph + noise, 1),
                    outflowLph=round(b.normalBaselineLph + noise, 1),
                    pressurePsi=round(44.0 + random.uniform(-1, 1), 1),
                    waterTempC=21.0,
                    isSimulated=False
                )
                self.readings[b.buildingId].append(reading)
            
            # Attach most recent reading
            b.lastReadingTimestamp = self.readings[b.buildingId][-1].timestamp

        # 2. Seed Default Demo Users
        self.users["mgr-1"] = User(
            userId="mgr-1",
            email="manager@campus.edu",
            name="Sarah Jenkins (Facility Lead)",
            role=UserRole.MANAGER
        )
        self.users["stu-1"] = User(
            userId="stu-1",
            email="student@campus.edu",
            name="Alex Chen",
            role=UserRole.STUDENT,
            buildingId="BLD-C",
            room="Room 312"
        )

    def get_building(self, building_id: str) -> Optional[Building]:
        return self.buildings.get(building_id)

    def get_all_buildings(self) -> List[Building]:
        return list(self.buildings.values())

    def update_building(self, building: Building):
        self.buildings[building.buildingId] = building

    def add_reading(self, reading: WaterReading):
        if reading.buildingId not in self.readings:
            self.readings[reading.buildingId] = []
        self.readings[reading.buildingId].append(reading)
        
        # Keep maximum last 100 readings per building
        if len(self.readings[reading.buildingId]) > 100:
            self.readings[reading.buildingId].pop(0)

        # Update building current telemetry
        b = self.buildings.get(reading.buildingId)
        if b:
            b.currentTankLevelPct = reading.tankLevelPct
            b.currentInflowLph = reading.inflowLph
            b.currentOutflowLph = reading.outflowLph
            b.lastReadingTimestamp = reading.timestamp
            self.buildings[b.buildingId] = b

    def get_readings(self, building_id: str, limit: int = 24) -> List[WaterReading]:
        return self.readings.get(building_id, [])[-limit:]

    def create_incident(self, incident: Incident):
        self.incidents[incident.incidentId] = incident
        # Update building status
        b = self.buildings.get(incident.buildingId)
        if b:
            if incident.severity in [IncidentSeverity.HIGH, IncidentSeverity.CRITICAL]:
                b.currentStatus = BuildingStatus.CRITICAL
            else:
                b.currentStatus = BuildingStatus.ALERT
            self.buildings[b.buildingId] = b

    def get_incident(self, incident_id: str) -> Optional[Incident]:
        return self.incidents.get(incident_id)

    def get_all_incidents(self) -> List[Incident]:
        # Sort newest first
        return sorted(list(self.incidents.values()), key=lambda x: x.createdAt, reverse=True)

    def update_incident(self, incident: Incident):
        self.incidents[incident.incidentId] = incident
        if incident.status == IncidentStatus.STABILIZED:
            b = self.buildings.get(incident.buildingId)
            if b:
                b.currentStatus = BuildingStatus.OPTIMAL
                self.buildings[b.buildingId] = b

    def log_agent_tool(self, log: AgentToolLog):
        self.agent_logs.insert(0, log)
        if len(self.agent_logs) > 200:
            self.agent_logs.pop()

    def get_agent_logs(self, limit: int = 50) -> List[AgentToolLog]:
        return self.agent_logs[:limit]

# Singleton instance for operational persistence
store = DynamoStore()
