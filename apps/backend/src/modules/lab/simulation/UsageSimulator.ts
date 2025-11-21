/**
 * Usage Simulator
 * Simulates API usage patterns for cost projection
 */

import {
  UsageScenario,
  LoadPattern,
  DailySimulationData,
  SimulationConfig,
  SimulationResult,
} from './types';

export class UsageSimulator {
  public simulate(config: SimulationConfig): SimulationResult {
    const { scenario, costPerThousandTokens } = config;
    const dailyBreakdown: DailySimulationData[] = [];

    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (let day = 1; day <= scenario.duration.days; day++) {
      const dailyData = this.simulateDay(day, scenario, costPerThousandTokens);
      dailyBreakdown.push(dailyData);

      totalRequests += dailyData.requests;
      totalTokens += dailyData.tokens;
      totalCost += dailyData.cost;
    }

    const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

    return {
      scenarioName: scenario.name,
      totalRequests,
      totalTokens,
      totalCost: Number(totalCost.toFixed(2)),
      averageCostPerRequest: Number(averageCostPerRequest.toFixed(6)),
      dailyBreakdown,
      projections: this.generateProjections(
        totalRequests,
        totalTokens,
        totalCost,
        scenario.duration.days
      ),
    };
  }

  private simulateDay(
    day: number,
    scenario: UsageScenario,
    costPerThousandTokens: number
  ): DailySimulationData {
    const baseRequests = scenario.requestsPerDay;
    const multiplier = this.getLoadMultiplier(
      day,
      scenario.loadPattern,
      scenario.peakMultiplier ?? 2
    );

    const requests = Math.round(baseRequests * multiplier);
    const tokens = requests * scenario.averageTokensPerRequest;
    const cost = (tokens / 1000) * costPerThousandTokens;

    return {
      day,
      requests,
      tokens,
      cost: Number(cost.toFixed(6)),
      pattern: scenario.loadPattern,
    };
  }

  private getLoadMultiplier(day: number, pattern: LoadPattern, peakMultiplier: number): number {
    switch (pattern) {
      case 'steady':
        return 1;

      case 'peak':
        // Peak during business hours (weekdays)
        const isWeekday = day % 7 !== 0 && day % 7 !== 6;
        return isWeekday ? peakMultiplier : 0.5;

      case 'seasonal':
        // Sinusoidal pattern over 30 days
        const phase = ((day % 30) / 30) * 2 * Math.PI;
        return 1 + (Math.sin(phase) * (peakMultiplier - 1)) / 2;

      case 'burst':
        // Random bursts
        return Math.random() < 0.2 ? peakMultiplier : 1;

      default:
        return 1;
    }
  }

  private generateProjections(
    totalRequests: number,
    totalTokens: number,
    totalCost: number,
    days: number
  ): SimulationResult['projections'] {
    const dailyAvg = totalCost / days;
    const weeklyAvg = dailyAvg * 7;
    const monthlyAvg = dailyAvg * 30;
    const yearlyAvg = dailyAvg * 365;

    const variance = 0.15; // 15% variance for confidence intervals

    return [
      {
        period: 'day',
        estimatedCost: Number(dailyAvg.toFixed(2)),
        confidenceInterval: {
          low: Number((dailyAvg * (1 - variance)).toFixed(2)),
          high: Number((dailyAvg * (1 + variance)).toFixed(2)),
        },
        breakdown: {
          apiCalls: Number((dailyAvg * 0.85).toFixed(2)),
          infrastructure: Number((dailyAvg * 0.1).toFixed(2)),
          maintenance: Number((dailyAvg * 0.05).toFixed(2)),
        },
      },
      {
        period: 'week',
        estimatedCost: Number(weeklyAvg.toFixed(2)),
        confidenceInterval: {
          low: Number((weeklyAvg * (1 - variance)).toFixed(2)),
          high: Number((weeklyAvg * (1 + variance)).toFixed(2)),
        },
        breakdown: {
          apiCalls: Number((weeklyAvg * 0.85).toFixed(2)),
          infrastructure: Number((weeklyAvg * 0.1).toFixed(2)),
          maintenance: Number((weeklyAvg * 0.05).toFixed(2)),
        },
      },
      {
        period: 'month',
        estimatedCost: Number(monthlyAvg.toFixed(2)),
        confidenceInterval: {
          low: Number((monthlyAvg * (1 - variance)).toFixed(2)),
          high: Number((monthlyAvg * (1 + variance)).toFixed(2)),
        },
        breakdown: {
          apiCalls: Number((monthlyAvg * 0.85).toFixed(2)),
          infrastructure: Number((monthlyAvg * 0.1).toFixed(2)),
          maintenance: Number((monthlyAvg * 0.05).toFixed(2)),
        },
      },
      {
        period: 'year',
        estimatedCost: Number(yearlyAvg.toFixed(2)),
        confidenceInterval: {
          low: Number((yearlyAvg * (1 - variance)).toFixed(2)),
          high: Number((yearlyAvg * (1 + variance)).toFixed(2)),
        },
        breakdown: {
          apiCalls: Number((yearlyAvg * 0.85).toFixed(2)),
          infrastructure: Number((yearlyAvg * 0.1).toFixed(2)),
          maintenance: Number((yearlyAvg * 0.05).toFixed(2)),
        },
      },
    ];
  }
}
