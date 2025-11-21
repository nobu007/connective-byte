/**
 * Batch Processing Strategy
 * Groups multiple requests for efficient processing
 */

import { BaseOptimizationStrategy } from './BaseStrategy';
import { OptimizationContext, OptimizationResult } from './types';

export interface BatchRequest {
  id: string;
  context: OptimizationContext;
}

export interface BatchResult {
  id: string;
  response: string;
  tokens: number;
  cost: number;
}

export class BatchProcessor extends BaseOptimizationStrategy {
  readonly name = 'batch-processing';
  readonly description = '複数リクエストをバッチ処理してコスト削減';
  readonly category = 'batching' as const;

  private pendingBatch: BatchRequest[] = [];
  private readonly batchSize: number;
  private readonly batchTimeoutMs: number;

  constructor(batchSize = 10, batchTimeoutMs = 5000) {
    super();
    this.batchSize = batchSize;
    this.batchTimeoutMs = batchTimeoutMs;
  }

  async apply(context: OptimizationContext): Promise<OptimizationResult> {
    // Estimate savings from batching
    const individualCost = (this.calculateTokenCount(context.prompt) / 1000) * 0.5;
    const batchedCost = individualCost * 0.7; // 30% savings estimate
    const savings = individualCost - batchedCost;

    return {
      success: true,
      optimizedPrompt: context.prompt,
      estimatedTokenSavings: Math.round(this.calculateTokenCount(context.prompt) * 0.3),
      estimatedCostSavings: Number(savings.toFixed(6)),
      explanation: `バッチ処理により約30%のコスト削減が見込まれます（バッチサイズ: ${this.batchSize}）`,
      appliedTechniques: ['batch-grouping', 'request-optimization'],
    };
  }

  public addToBatch(request: BatchRequest): void {
    this.pendingBatch.push(request);
  }

  public shouldProcessBatch(): boolean {
    return this.pendingBatch.length >= this.batchSize;
  }

  public getBatchSize(): number {
    return this.pendingBatch.length;
  }

  public async processBatch(): Promise<BatchResult[]> {
    if (this.pendingBatch.length === 0) {
      return [];
    }

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    // Simulate batch processing
    // In real implementation, this would make a single API call
    const results: BatchResult[] = batch.map((req) => ({
      id: req.id,
      response: `Batched response for ${req.id}`,
      tokens: this.calculateTokenCount(req.context.prompt),
      cost: (this.calculateTokenCount(req.context.prompt) / 1000) * 0.5 * 0.7,
    }));

    return results;
  }

  public clearBatch(): void {
    this.pendingBatch = [];
  }

  public calculateOptimalBatchSize(
    requestsPerMinute: number,
    averageTokensPerRequest: number
  ): number {
    // Simple heuristic: balance between latency and cost savings
    if (requestsPerMinute < 10) return 5;
    if (requestsPerMinute < 50) return 10;
    if (requestsPerMinute < 100) return 20;
    return 50;
  }
}
