/**
 * Visualization Generator
 * Generates chart data for cost comparisons and token usage
 */

import { APICallRecord, Baseline } from '../entities';
import { TokenBreakdown } from '../types';

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
}

export interface TokenDistributionChart extends ChartData {
  type: 'pie';
  totalTokens: number;
}

export interface CostComparisonChart extends ChartData {
  type: 'bar';
  totalCost: number;
  savings: number;
  savingsPercentage: number;
}

export interface TrendChart extends ChartData {
  type: 'line';
  period: string;
}

export class VisualizationGenerator {
  public generateTokenDistribution(tokens: TokenBreakdown): TokenDistributionChart {
    const total = tokens.inputTokens + tokens.outputTokens + tokens.systemTokens;

    return {
      type: 'pie',
      title: 'Token Distribution',
      labels: ['Input Tokens', 'Output Tokens', 'System Tokens'],
      datasets: [
        {
          label: 'Tokens',
          data: [tokens.inputTokens, tokens.outputTokens, tokens.systemTokens],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
        },
      ],
      totalTokens: total,
    };
  }

  public generateCostComparison(
    baseline: Baseline,
    optimizedCalls: APICallRecord[]
  ): CostComparisonChart {
    const optimizedCost = optimizedCalls.reduce((sum, call) => sum + call.cost, 0);
    const baselineCost = baseline.averageCost * optimizedCalls.length;
    const savings = baselineCost - optimizedCost;
    const savingsPercentage = baselineCost > 0 ? (savings / baselineCost) * 100 : 0;

    return {
      type: 'bar',
      title: 'Cost Comparison: Baseline vs Optimized',
      labels: ['Baseline', 'Optimized'],
      datasets: [
        {
          label: 'Cost ($)',
          data: [Number(baselineCost.toFixed(6)), Number(optimizedCost.toFixed(6))],
          backgroundColor: ['#ef4444', '#10b981'],
        },
      ],
      totalCost: optimizedCost,
      savings: Number(savings.toFixed(6)),
      savingsPercentage: Number(savingsPercentage.toFixed(2)),
    };
  }

  public generateCostTrend(calls: APICallRecord[]): TrendChart {
    // Group by day
    const dailyCosts = new Map<string, number>();

    for (const call of calls) {
      const date = call.timestamp.toISOString().split('T')[0];
      const current = dailyCosts.get(date) ?? 0;
      dailyCosts.set(date, current + call.cost);
    }

    const sortedDates = Array.from(dailyCosts.keys()).sort();
    const costs = sortedDates.map((date) => Number((dailyCosts.get(date) ?? 0).toFixed(6)));

    return {
      type: 'line',
      title: 'Cost Trend Over Time',
      labels: sortedDates,
      datasets: [
        {
          label: 'Daily Cost ($)',
          data: costs,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
      ],
      period: 'daily',
    };
  }

  public generateTokenTrend(calls: APICallRecord[]): TrendChart {
    // Group by day
    const dailyTokens = new Map<string, TokenBreakdown>();

    for (const call of calls) {
      const date = call.timestamp.toISOString().split('T')[0];
      const current = dailyTokens.get(date) ?? {
        inputTokens: 0,
        outputTokens: 0,
        systemTokens: 0,
      };
      dailyTokens.set(date, {
        inputTokens: current.inputTokens + call.inputTokens,
        outputTokens: current.outputTokens + call.outputTokens,
        systemTokens: current.systemTokens + call.systemTokens,
      });
    }

    const sortedDates = Array.from(dailyTokens.keys()).sort();
    const inputData = sortedDates.map((date) => dailyTokens.get(date)!.inputTokens);
    const outputData = sortedDates.map((date) => dailyTokens.get(date)!.outputTokens);

    return {
      type: 'line',
      title: 'Token Usage Trend',
      labels: sortedDates,
      datasets: [
        {
          label: 'Input Tokens',
          data: inputData,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3b82f6',
        },
        {
          label: 'Output Tokens',
          data: outputData,
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: '#10b981',
        },
      ],
      period: 'daily',
    };
  }

  public generateProviderComparison(
    providers: Array<{ provider: string; cost: number; latency: number }>
  ): ChartData {
    return {
      type: 'bar',
      title: 'Provider Cost Comparison',
      labels: providers.map((p) => p.provider),
      datasets: [
        {
          label: 'Cost ($)',
          data: providers.map((p) => Number(p.cost.toFixed(6))),
          backgroundColor: '#3b82f6',
        },
      ],
    };
  }
}
