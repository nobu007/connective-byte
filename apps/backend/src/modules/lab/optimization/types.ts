/**
 * Optimization Strategy Types
 */

export interface OptimizationContext {
  experimentId: string;
  sessionId: string;
  provider: string;
  model: string;
  prompt: string;
  parameters?: Record<string, unknown>;
}

export interface OptimizationResult {
  success: boolean;
  optimizedPrompt?: string;
  optimizedParameters?: Record<string, unknown>;
  estimatedTokenSavings: number;
  estimatedCostSavings: number;
  explanation: string;
  appliedTechniques: string[];
}

export interface IOptimizationStrategy {
  readonly name: string;
  readonly description: string;
  readonly category: 'prompt' | 'caching' | 'batching' | 'model';

  apply(context: OptimizationContext): Promise<OptimizationResult>;
  estimateSavings(context: OptimizationContext): Promise<number>;
}

export interface StrategyRanking {
  strategy: IOptimizationStrategy;
  estimatedSavings: number;
  priority: number;
}
