/**
 * Cost Projector
 * Projects costs over time periods with confidence intervals
 */

import { SimulationResult, CostProjection } from './types';

export type TimePeriod = 'day' | 'week' | 'month' | 'year';

export interface ProjectionOptions {
  varianceFactor?: number;
  infrastructureRatio?: number;
  maintenanceRatio?: number;
}

export class CostProjector {
  private readonly defaultVariance = 0.15; // 15%
  private readonly defaultInfrastructure = 0.1; // 10%
  private readonly defaultMaintenance = 0.05; // 5%

  public project(
    simulationResult: SimulationResult,
    period: TimePeriod,
    options: ProjectionOptions = {}
  ): CostProjection {
    const variance = options.varianceFactor ?? this.defaultVariance;
    const infraRatio = options.infrastructureRatio ?? this.defaultInfrastructure;
    const maintenanceRatio = options.maintenanceRatio ?? this.defaultMaintenance;

    const dailyAverage = this.calculateDailyAverage(simulationResult);
    const periodCost = this.calculatePeriodCost(dailyAverage, period);

    const apiCost = periodCost * (1 - infraRatio - maintenanceRatio);
    const infraCost = periodCost * infraRatio;
    const maintenanceCost = periodCost * maintenanceRatio;

    return {
      period,
      estimatedCost: Number(periodCost.toFixed(2)),
      confidenceInterval: {
        low: Number((periodCost * (1 - variance)).toFixed(2)),
        high: Number((periodCost * (1 + variance)).toFixed(2)),
      },
      breakdown: {
        apiCalls: Number(apiCost.toFixed(2)),
        infrastructure: Number(infraCost.toFixed(2)),
        maintenance: Number(maintenanceCost.toFixed(2)),
      },
    };
  }

  public projectMultiple(
    simulationResult: SimulationResult,
    periods: TimePeriod[],
    options: ProjectionOptions = {}
  ): CostProjection[] {
    return periods.map((period) => this.project(simulationResult, period, options));
  }

  private calculateDailyAverage(result: SimulationResult): number {
    if (result.dailyBreakdown.length === 0) {
      return 0;
    }

    const totalCost = result.dailyBreakdown.reduce((sum, day) => sum + day.cost, 0);
    return totalCost / result.dailyBreakdown.length;
  }

  private calculatePeriodCost(dailyAverage: number, period: TimePeriod): number {
    const multipliers: Record<TimePeriod, number> = {
      day: 1,
      week: 7,
      month: 30,
      year: 365,
    };

    return dailyAverage * multipliers[period];
  }
}
