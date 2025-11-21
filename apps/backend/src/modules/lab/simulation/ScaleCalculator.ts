/**
 * Scale Calculator
 * Calculates costs at different user scales
 */

import { ScaleAnalysis } from './types';

export interface ScaleCalculatorOptions {
  warningThreshold?: number; // Monthly cost threshold for warning
  criticalThreshold?: number; // Monthly cost threshold for critical
}

export class ScaleCalculator {
  private readonly warningThreshold: number;
  private readonly criticalThreshold: number;

  constructor(options: ScaleCalculatorOptions = {}) {
    this.warningThreshold = options.warningThreshold ?? 1000;
    this.criticalThreshold = options.criticalThreshold ?? 5000;
  }

  public calculateScale(
    userCount: number,
    requestsPerUserPerDay: number,
    costPerRequest: number
  ): ScaleAnalysis {
    const requestsPerDay = userCount * requestsPerUserPerDay;
    const dailyCost = requestsPerDay * costPerRequest;
    const monthlyCost = dailyCost * 30;
    const costPerUser = monthlyCost / userCount;

    return {
      userScale: userCount,
      requestsPerDay,
      monthlyCost: Number(monthlyCost.toFixed(2)),
      costPerUser: Number(costPerUser.toFixed(2)),
      thresholds: {
        warning: monthlyCost >= this.warningThreshold,
        critical: monthlyCost >= this.criticalThreshold,
      },
    };
  }

  public calculateMultipleScales(
    scales: number[],
    requestsPerUserPerDay: number,
    costPerRequest: number
  ): ScaleAnalysis[] {
    return scales.map((scale) => this.calculateScale(scale, requestsPerUserPerDay, costPerRequest));
  }

  public findBreakEvenScale(
    fixedCosts: number,
    revenuePerUser: number,
    requestsPerUserPerDay: number,
    costPerRequest: number
  ): number {
    // Binary search for break-even point
    let low = 1;
    let high = 1000000;
    let breakEven = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const analysis = this.calculateScale(mid, requestsPerUserPerDay, costPerRequest);
      const totalCost = fixedCosts + analysis.monthlyCost;
      const totalRevenue = mid * revenuePerUser;

      if (Math.abs(totalRevenue - totalCost) < 100) {
        breakEven = mid;
        break;
      }

      if (totalRevenue < totalCost) {
        low = mid + 1;
      } else {
        high = mid - 1;
        breakEven = mid;
      }
    }

    return breakEven;
  }

  public generateScaleReport(
    currentUsers: number,
    requestsPerUserPerDay: number,
    costPerRequest: number
  ): {
    current: ScaleAnalysis;
    projections: Array<{ label: string; analysis: ScaleAnalysis }>;
  } {
    const current = this.calculateScale(currentUsers, requestsPerUserPerDay, costPerRequest);

    const projections = [
      { label: '10x成長', scale: currentUsers * 10 },
      { label: '100x成長', scale: currentUsers * 100 },
      { label: '1000x成長', scale: currentUsers * 1000 },
    ].map(({ label, scale }) => ({
      label,
      analysis: this.calculateScale(scale, requestsPerUserPerDay, costPerRequest),
    }));

    return { current, projections };
  }
}
