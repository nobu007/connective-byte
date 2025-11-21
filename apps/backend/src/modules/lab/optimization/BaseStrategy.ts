/**
 * Base Optimization Strategy
 */

import { IOptimizationStrategy, OptimizationContext, OptimizationResult } from './types';

export abstract class BaseOptimizationStrategy implements IOptimizationStrategy {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: 'prompt' | 'caching' | 'batching' | 'model';

  abstract apply(context: OptimizationContext): Promise<OptimizationResult>;

  async estimateSavings(context: OptimizationContext): Promise<number> {
    const result = await this.apply(context);
    return result.estimatedTokenSavings;
  }

  protected calculateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  protected createSuccessResult(
    optimizedPrompt: string,
    originalPrompt: string,
    explanation: string,
    techniques: string[],
    optimizedParameters?: Record<string, unknown>
  ): OptimizationResult {
    const originalTokens = this.calculateTokenCount(originalPrompt);
    const optimizedTokens = this.calculateTokenCount(optimizedPrompt);
    const tokenSavings = Math.max(0, originalTokens - optimizedTokens);
    const costSavings = (tokenSavings / 1000) * 0.5; // Rough estimate

    return {
      success: true,
      optimizedPrompt,
      optimizedParameters,
      estimatedTokenSavings: tokenSavings,
      estimatedCostSavings: Number(costSavings.toFixed(6)),
      explanation,
      appliedTechniques: techniques,
    };
  }

  protected createFailureResult(reason: string): OptimizationResult {
    return {
      success: false,
      estimatedTokenSavings: 0,
      estimatedCostSavings: 0,
      explanation: reason,
      appliedTechniques: [],
    };
  }
}
