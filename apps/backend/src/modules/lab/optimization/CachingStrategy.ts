/**
 * Caching Strategy
 * Implements response caching to reduce API calls
 */

import { createHash } from 'crypto';
import { BaseOptimizationStrategy } from './BaseStrategy';
import { OptimizationContext, OptimizationResult } from './types';

interface CacheEntry {
  response: string;
  tokens: number;
  cost: number;
  timestamp: Date;
  hits: number;
}

export interface CachingStrategyOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export class CachingStrategy extends BaseOptimizationStrategy {
  readonly name = 'response-caching';
  readonly description = 'レスポンスをキャッシュしてAPI呼び出しを削減';
  readonly category = 'caching' as const;

  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: CachingStrategyOptions = {}) {
    super();
    this.ttlMs = options.ttlMs ?? 1000 * 60 * 60; // 1 hour default
    this.maxEntries = options.maxEntries ?? 1000;
  }

  async apply(context: OptimizationContext): Promise<OptimizationResult> {
    const cacheKey = this.generateCacheKey(context);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isExpired(cached)) {
      cached.hits++;

      return {
        success: true,
        optimizedPrompt: context.prompt,
        estimatedTokenSavings: cached.tokens,
        estimatedCostSavings: cached.cost,
        explanation: `キャッシュヒット（${cached.hits}回目）- API呼び出し不要`,
        appliedTechniques: ['response-caching'],
      };
    }

    // Cache miss - would need to make API call
    return {
      success: true,
      optimizedPrompt: context.prompt,
      estimatedTokenSavings: 0,
      estimatedCostSavings: 0,
      explanation: 'キャッシュミス - 初回呼び出し後にキャッシュされます',
      appliedTechniques: ['cache-setup'],
    };
  }

  public setCacheEntry(
    context: OptimizationContext,
    response: string,
    tokens: number,
    cost: number
  ): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    const cacheKey = this.generateCacheKey(context);
    this.cache.set(cacheKey, {
      response,
      tokens,
      cost,
      timestamp: new Date(),
      hits: 0,
    });
  }

  public getCacheStats(): {
    size: number;
    totalHits: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1; // +1 for initial request
    }

    return {
      size: this.cache.size,
      totalHits,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private generateCacheKey(context: OptimizationContext): string {
    const data = JSON.stringify({
      provider: context.provider,
      model: context.model,
      prompt: context.prompt,
      parameters: context.parameters,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp.getTime() > this.ttlMs;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
