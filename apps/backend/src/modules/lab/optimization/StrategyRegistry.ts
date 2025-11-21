/**
 * Strategy Registry
 * Manages and ranks optimization strategies
 */

import { IOptimizationStrategy, OptimizationContext, StrategyRanking } from './types';

export class StrategyRegistry {
  private strategies = new Map<string, IOptimizationStrategy>();

  public register(strategy: IOptimizationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  public get(name: string): IOptimizationStrategy | undefined {
    return this.strategies.get(name);
  }

  public getAll(): IOptimizationStrategy[] {
    return Array.from(this.strategies.values());
  }

  public getByCategory(
    category: 'prompt' | 'caching' | 'batching' | 'model'
  ): IOptimizationStrategy[] {
    return this.getAll().filter((s) => s.category === category);
  }

  public async rankStrategies(context: OptimizationContext): Promise<StrategyRanking[]> {
    const rankings: StrategyRanking[] = [];

    for (const strategy of this.strategies.values()) {
      const estimatedSavings = await strategy.estimateSavings(context);
      const priority = this.calculatePriority(strategy, estimatedSavings);

      rankings.push({
        strategy,
        estimatedSavings,
        priority,
      });
    }

    // Sort by priority (higher is better)
    return rankings.sort((a, b) => b.priority - a.priority);
  }

  private calculatePriority(strategy: IOptimizationStrategy, savings: number): number {
    // Base priority on category
    const categoryPriority: Record<string, number> = {
      caching: 100,
      batching: 80,
      prompt: 60,
      model: 40,
    };

    const base = categoryPriority[strategy.category] ?? 50;

    // Add savings bonus (up to 50 points)
    const savingsBonus = Math.min(50, savings / 100);

    return base + savingsBonus;
  }
}
