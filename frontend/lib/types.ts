export type UserRole = 'student' | 'manager';

export interface User {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  buildingId?: string;
  room?: string;
}

export interface Building {
  buildingId: string;
  name: string;
  code: string;
  campus: string;
  residentCount: number;
  tankCapacityLitres: number;
  normalBaselineLph: number;
  currentTankLevelPct: number;
  currentInflowLph: number;
  currentOutflowLph: number;
  currentStatus: 'OPTIMAL' | 'ALERT' | 'CRITICAL';
  lastReadingTimestamp?: string;
}

export interface WaterReading {
  readingId: string;
  buildingId: string;
  timestamp: string;
  tankLevelPct: number;
  inflowLph: number;
  outflowLph: number;
  pressurePsi: number;
  waterTempC: number;
  isSimulated: boolean;
}

export interface RecommendedAction {
  actionId: string;
  actionType: string;
  title: string;
  description: string;
  parameters: Record<string, any>;
  status: 'RECOMMENDED' | 'APPROVED' | 'EXECUTED' | 'REJECTED';
}

export interface Incident {
  incidentId: string;
  buildingId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'PENDING_APPROVAL' | 'ACTION_EXECUTED' | 'VERIFYING' | 'STABILIZED' | 'ESCALATED';
  anomalyScore: number;
  baselineExpectedLph: number;
  observedLph: number;
  agentAssessment?: string;
  confidencePct: number;
  recommendedActions: RecommendedAction[];
  createdAt: string;
  resolvedAt?: string;
  waterSavedLitres?: number;
  verificationResult?: {
    preInterventionLph: number;
    postInterventionLph: number;
    recoveryDeltaPct: number;
    stabilizationCertified: boolean;
    verifiedAt: string;
  };
}

export interface AgentToolLog {
  logId: string;
  timestamp: string;
  toolName: string;
  incidentId?: string;
  buildingId?: string;
  inputSummary: string;
  resultSummary: string;
  executionTimeMs: number;
  status: string;
}
