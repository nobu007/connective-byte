/**
 * Simulation Engine Types
 */

export type LoadPattern = 'steady' | 'peak' | 'seasonal' | 'burst';

export interface UsageScenario {
  name: string;
  description: string;
  requestsPerDay: number;
  averageTokensPerRequest: number;
  loadPattern: LoadPattern;
  peakMultiplier?: number;
  duration: {
    days: number;
  };
}

export interface SimulationConfig {
  scenario: UsageScenario;
  provider: string;
  model: string;
  costPerThousandTokens: number;
}

export interface SimulationResult {
  scenarioName: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerRequest: number;
  dailyBreakdown: DailySimulationData[];
  projections: CostProjection[];
}

export interface DailySimulationData {
  day: number;
  requests: number;
  tokens: number;
  cost: number;
  pattern: LoadPattern;
}

export interface CostProjection {
  period: 'day' | 'week' | 'month' | 'year';
  estimatedCost: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  breakdown: {
    apiCalls: number;
    infrastructure: number;
    maintenance: number;
  };
}

export interface ScaleAnalysis {
  userScale: number;
  requestsPerDay: number;
  monthlyCost: number;
  costPerUser: number;
  thresholds: {
    warning: boolean;
    critical: boolean;
  };
}
