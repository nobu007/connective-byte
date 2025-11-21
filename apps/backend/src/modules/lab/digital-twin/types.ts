/**
 * Digital Twin System Types
 */

export interface DigitalTwinConfig {
  name: string;
  description: string;
  sourceExperimentId?: string;
  usagePattern: UsagePatternConfig;
  replicationFidelity: 'low' | 'medium' | 'high';
}

export interface UsagePatternConfig {
  requestFrequency: number; // requests per hour
  requestTypes: RequestTypeDistribution[];
  timingDistribution: 'uniform' | 'poisson' | 'burst';
}

export interface RequestTypeDistribution {
  type: string;
  percentage: number;
  averageTokens: number;
  examplePrompt: string;
}

export interface DigitalTwin {
  id: string;
  config: DigitalTwinConfig;
  createdAt: Date;
  lastRunAt?: Date;
  metrics: TwinMetrics;
}

export interface TwinMetrics {
  totalRuns: number;
  totalCost: number;
  averageCostPerRun: number;
  lastOptimizationSavings?: number;
}

export interface TwinOptimizationTest {
  twinId: string;
  strategyName: string;
  baselineCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
  qualityScore: number;
  recommendation: 'apply' | 'test-further' | 'reject';
}
