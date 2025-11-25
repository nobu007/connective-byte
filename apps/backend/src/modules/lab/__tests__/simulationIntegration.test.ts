import { UsageSimulator } from '../simulation/UsageSimulator';
import { CostProjector } from '../simulation/CostProjector';
import { ScaleCalculator } from '../simulation/ScaleCalculator';

describe('Simulation integration', () => {
  const baseConfig = {
    scenario: {
      name: 'steady baseline',
      description: 'Deterministic scenario for verification',
      requestsPerDay: 100,
      averageTokensPerRequest: 500,
      loadPattern: 'steady' as const,
      duration: { days: 7 },
    },
    provider: 'openai',
    model: 'gpt-4o-mini',
    costPerThousandTokens: 0.02,
  };

  it('simulates steady scenario with consistent daily totals', () => {
    const simulator = new UsageSimulator();
    const result = simulator.simulate(baseConfig);

    expect(result.totalRequests).toBe(700);
    expect(result.totalTokens).toBe(350000);
    expect(result.totalCost).toBeCloseTo(7, 2);
    expect(result.averageCostPerRequest).toBeCloseTo(result.totalCost / result.totalRequests, 6);
    expect(result.dailyBreakdown).toHaveLength(7);

    result.dailyBreakdown.forEach((day) => {
      expect(day.pattern).toBe('steady');
      expect(day.requests).toBe(100);
      expect(day.tokens).toBe(50000);
      expect(day.cost).toBeCloseTo(1, 6);
    });
  });

  it('projects costs over multiple periods using simulation output', () => {
    const simulator = new UsageSimulator();
    const result = simulator.simulate(baseConfig);
    const projector = new CostProjector();

    const projections = projector.projectMultiple(result, ['day', 'week', 'month', 'year']);

    expect(projections).toHaveLength(4);
    const [day, week, month, year] = projections;
    expect(day.period).toBe('day');
    expect(day.estimatedCost).toBeCloseTo(1, 2);
    expect(week.estimatedCost).toBeCloseTo(day.estimatedCost * 7, 2);
    expect(month.estimatedCost).toBeCloseTo(day.estimatedCost * 30, 2);
    expect(year.estimatedCost).toBeCloseTo(day.estimatedCost * 365, 2);

    projections.forEach((projection) => {
      const { apiCalls, infrastructure, maintenance } = projection.breakdown;
      const sum = apiCalls + infrastructure + maintenance;
      expect(sum).toBeCloseTo(projection.estimatedCost, 2);
      expect(projection.confidenceInterval.low).toBeLessThan(projection.estimatedCost);
      expect(projection.confidenceInterval.high).toBeGreaterThan(projection.estimatedCost);
    });
  });

  it('calculates scale analysis across user growth scenarios', () => {
    const calculator = new ScaleCalculator({ warningThreshold: 1000, criticalThreshold: 2000 });
    const analyses = calculator.calculateMultipleScales([100, 1000], 5, 0.02);

    expect(analyses).toHaveLength(2);

    const smallScale = analyses[0];
    expect(smallScale.userScale).toBe(100);
    expect(smallScale.thresholds.warning).toBe(false);
    expect(smallScale.thresholds.critical).toBe(false);

    const largeScale = analyses[1];
    expect(largeScale.userScale).toBe(1000);
    expect(largeScale.monthlyCost).toBeCloseTo(3000, 2);
    expect(largeScale.thresholds.warning).toBe(true);
    expect(largeScale.thresholds.critical).toBe(true);
  });
});
