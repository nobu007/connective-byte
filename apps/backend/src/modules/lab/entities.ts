/**
 * API Cost Optimization Lab Entities
 * Strong typing foundation for lab domain models
 */

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'archived';

export interface Experiment {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  baselineId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface APICallRecord {
  id: string;
  experimentId: string;
  sessionId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  systemTokens: number;
  cost: number;
  latencyMs: number;
  timestamp: Date;
}

export interface Baseline {
  id: string;
  experimentId: string;
  averageCost: number;
  totalTokens: number;
  averageLatencyMs: number;
  callCount: number;
  createdAt: Date;
}

export interface UserProgress {
  userId: string;
  experimentsCompleted: number;
  totalCostSavings: number;
  badgesEarned: string[];
  challengesCompleted: string[];
  skillLevel: number;
  lastActivity: Date;
}
