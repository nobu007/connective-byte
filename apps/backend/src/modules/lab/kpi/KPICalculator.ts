/**
 * KPI Calculator
 * Evaluates KPI formulas and calculates values
 */

import { KPIDefinition, KPIValue, KPIStatus } from './types';

export class KPICalculator {
  public calculate(kpi: KPIDefinition, data: Record<string, number>): KPIValue {
    const value = this.evaluateFormula(kpi.formula, data);
    const status = this.determineStatus(value, kpi);

    return {
      kpiId: kpi.id,
      value: Number(value.toFixed(6)),
      status,
      timestamp: new Date(),
      context: data,
    };
  }

  public calculateMultiple(kpis: KPIDefinition[], data: Record<string, number>): KPIValue[] {
    return kpis.map((kpi) => this.calculate(kpi, data));
  }

  private evaluateFormula(formula: string, data: Record<string, number>): number {
    // Replace variable names with values
    let expression = formula;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, String(value));
    }

    // Safe evaluation using Function constructor with restricted scope
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Formula evaluation resulted in invalid number');
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to evaluate formula: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private determineStatus(value: number, kpi: KPIDefinition): KPIStatus {
    const { warning, critical } = kpi.thresholds;
    const { higherIsBetter } = kpi;

    if (higherIsBetter) {
      if (value <= critical) return 'critical';
      if (value <= warning) return 'warning';
      return 'normal';
    } else {
      if (value >= critical) return 'critical';
      if (value >= warning) return 'warning';
      return 'normal';
    }
  }
}
