import { PromptCompressor } from '../optimization/PromptCompressor';
import { CachingStrategy } from '../optimization/CachingStrategy';
import { BatchProcessor } from '../optimization/BatchProcessor';
import { StrategyRegistry } from '../optimization/StrategyRegistry';
import {
  IOptimizationStrategy,
  OptimizationContext,
  OptimizationResult,
} from '../optimization/types';

describe('Optimization strategies', () => {
  const context: OptimizationContext = {
    experimentId: 'exp-1',
    sessionId: 'session-1',
    provider: 'openai',
    model: 'gpt-4o-mini',
    prompt:
      ' '.repeat(120) +
      'Please provide a detailed explanation of the API usage including redundant details.',
  };

  it('PromptCompressor reduces token count for long prompts', async () => {
    const strategy = new PromptCompressor();
    const result = await strategy.apply(context);

    expect(result.success).toBe(true);
    expect(result.estimatedTokenSavings).toBeGreaterThan(0);
    expect(result.appliedTechniques.length).toBeGreaterThan(0);
  });

  it('PromptCompressor skips compression when prompt is short', async () => {
    const strategy = new PromptCompressor();
    const result = await strategy.apply({ ...context, prompt: 'short prompt' });

    expect(result.success).toBe(false);
    expect(result.estimatedTokenSavings).toBe(0);
  });

  it('CachingStrategy reports cache hits after storing entry', async () => {
    const strategy = new CachingStrategy({ ttlMs: 10_000 });
    const miss = await strategy.apply(context);
    expect(miss.explanation).toContain('キャッシュミス');

    strategy.setCacheEntry(context, 'ok', 150, 0.02);
    const hit = await strategy.apply(context);
    expect(hit.explanation).toContain('キャッシュヒット');
    expect(hit.estimatedTokenSavings).toBe(150);
    expect(hit.estimatedCostSavings).toBe(0.02);
  });

  it('BatchProcessor estimates cost savings for batching', async () => {
    const strategy = new BatchProcessor(5);
    const result = await strategy.apply(context);

    expect(result.success).toBe(true);
    expect(result.estimatedTokenSavings).toBeGreaterThan(0);
    expect(result.explanation).toContain('バッチ処理');
  });

  it('StrategyRegistry ranks strategies by estimated savings and category priority', async () => {
    const registry = new StrategyRegistry();

    class MockStrategy implements IOptimizationStrategy {
      constructor(
        public readonly name: string,
        public readonly category: 'prompt' | 'caching' | 'batching' | 'model',
        private readonly savings: number
      ) {}
      readonly description = '';
      async apply(): Promise<OptimizationResult> {
        return {
          success: true,
          optimizedPrompt: 'mock',
          estimatedTokenSavings: this.savings,
          estimatedCostSavings: this.savings / 1000,
          explanation: 'mock',
          appliedTechniques: [],
        };
      }
      async estimateSavings(): Promise<number> {
        return this.savings;
      }
    }

    registry.register(new MockStrategy('cache', 'caching', 200));
    registry.register(new MockStrategy('prompt', 'prompt', 500));

    const rankings = await registry.rankStrategies(context);
    expect(rankings[0].strategy.name).toBe('cache');
    expect(rankings[0].priority).toBeGreaterThan(rankings[1].priority);
  });
});
