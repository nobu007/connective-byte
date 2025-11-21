/**
 * Provider Comparison Engine
 * Compares costs and performance across AI providers
 */

import { Provider, APIRequest, TokenBreakdown } from '../types';
import { APIGateway } from '../gateway/APIGateway';

export interface ProviderComparisonRequest {
  prompt: string;
  providers: Array<{
    provider: Provider;
    model: string;
    apiKey: string;
  }>;
  parameters?: Record<string, unknown>;
}

export interface ProviderComparisonResult {
  prompt: string;
  results: ProviderResult[];
  recommendation: {
    bestCost: ProviderResult;
    bestLatency: ProviderResult;
    bestValue: ProviderResult;
  };
  timestamp: Date;
}

export interface ProviderResult {
  provider: Provider;
  model: string;
  response: string;
  tokens: TokenBreakdown;
  cost: number;
  latencyMs: number;
  qualityScore?: number;
}

export interface TCOCalculation {
  provider: Provider;
  model: string;
  apiCosts: number;
  infrastructureCosts: number;
  maintenanceCosts: number;
  totalCost: number;
  costPerRequest: number;
  projectedMonthlyCost: number;
}

export class ProviderComparison {
  constructor(private readonly gateway: APIGateway) {}

  public async compare(request: ProviderComparisonRequest): Promise<ProviderComparisonResult> {
    const results: ProviderResult[] = [];

    for (const providerConfig of request.providers) {
      try {
        const response = await this.gateway.execute({
          provider: providerConfig.provider,
          model: providerConfig.model,
          prompt: request.prompt,
          parameters: request.parameters,
          apiKey: providerConfig.apiKey,
        });

        results.push({
          provider: providerConfig.provider,
          model: providerConfig.model,
          response: response.content,
          tokens: response.tokens,
          cost: response.cost,
          latencyMs: response.latencyMs,
        });
      } catch (error) {
        console.error(`Failed to get response from ${providerConfig.provider}:`, error);
      }
    }

    if (results.length === 0) {
      throw new Error('No providers returned successful responses');
    }

    const recommendation = this.generateRecommendation(results);

    return {
      prompt: request.prompt,
      results,
      recommendation,
      timestamp: new Date(),
    };
  }

  public calculateTCO(
    provider: Provider,
    model: string,
    requestsPerMonth: number,
    averageCostPerRequest: number
  ): TCOCalculation {
    const apiCosts = requestsPerMonth * averageCostPerRequest;

    // Infrastructure costs (rough estimates)
    const infrastructureCosts = this.estimateInfrastructureCosts(provider, requestsPerMonth);

    // Maintenance costs (10% of total)
    const maintenanceCosts = (apiCosts + infrastructureCosts) * 0.1;

    const totalCost = apiCosts + infrastructureCosts + maintenanceCosts;
    const costPerRequest = totalCost / requestsPerMonth;

    return {
      provider,
      model,
      apiCosts: Number(apiCosts.toFixed(2)),
      infrastructureCosts: Number(infrastructureCosts.toFixed(2)),
      maintenanceCosts: Number(maintenanceCosts.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      costPerRequest: Number(costPerRequest.toFixed(6)),
      projectedMonthlyCost: Number(totalCost.toFixed(2)),
    };
  }

  public compareAtScale(
    providers: Array<{ provider: Provider; model: string; costPerRequest: number }>,
    scales: number[]
  ): Array<{
    scale: number;
    comparisons: TCOCalculation[];
  }> {
    return scales.map((scale) => ({
      scale,
      comparisons: providers.map((p) =>
        this.calculateTCO(p.provider, p.model, scale, p.costPerRequest)
      ),
    }));
  }

  private generateRecommendation(
    results: ProviderResult[]
  ): ProviderComparisonResult['recommendation'] {
    const sortedByCost = [...results].sort((a, b) => a.cost - b.cost);
    const sortedByLatency = [...results].sort((a, b) => a.latencyMs - b.latencyMs);

    // Value score: balance of cost and latency
    const sortedByValue = [...results].sort((a, b) => {
      const aValue = a.cost * 0.6 + (a.latencyMs / 1000) * 0.4;
      const bValue = b.cost * 0.6 + (b.latencyMs / 1000) * 0.4;
      return aValue - bValue;
    });

    return {
      bestCost: sortedByCost[0],
      bestLatency: sortedByLatency[0],
      bestValue: sortedByValue[0],
    };
  }

  private estimateInfrastructureCosts(provider: Provider, requestsPerMonth: number): number {
    // Base infrastructure cost
    const baseCost = 50;

    // Scale-based costs
    if (requestsPerMonth < 10000) return baseCost;
    if (requestsPerMonth < 100000) return baseCost + 100;
    if (requestsPerMonth < 1000000) return baseCost + 500;
    return baseCost + 2000;
  }
}
