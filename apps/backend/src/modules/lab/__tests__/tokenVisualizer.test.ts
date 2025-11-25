import { TokenVisualizer } from '../cost/TokenVisualizer';
import { TokenAnalysisResult } from '../cost/TokenAnalyzer';
import { TokenBreakdown } from '../types';

describe('TokenVisualizer', () => {
  const baseAnalysis: TokenAnalysisResult = {
    callCount: 3,
    totals: {
      inputTokens: 300,
      outputTokens: 150,
      systemTokens: 50,
      totalTokens: 500,
      totalCost: 1.25,
      averageCostPerCall: 0.416667,
      averageLatencyMs: 180,
    },
    distribution: {
      inputPercentage: 0.6,
      outputPercentage: 0.3,
      systemPercentage: 0.1,
    },
    highCostCalls: [],
    highTokenCalls: [],
    flags: {
      excessiveSystemTokens: false,
      highAverageTokens: false,
    },
  };

  it('generates token distribution pie chart with totals meta', () => {
    const visualizer = new TokenVisualizer();
    const chart = visualizer.generateDistribution(baseAnalysis);

    expect(chart.type).toBe('pie');
    expect(chart.labels).toEqual(['Input Tokens', 'Output Tokens', 'System Tokens']);
    expect(chart.datasets[0].data).toEqual([300, 150, 50]);
    expect(chart.meta).toEqual({ totalTokens: 500 });
  });

  it('aggregates cost breakdown inputs into bar chart with total cost meta', () => {
    const visualizer = new TokenVisualizer();
    const chart = visualizer.generateCostBreakdown([
      { breakdown: { prompt: 0.05, completion: 0.1, system: 0.01 } },
      { breakdown: { prompt: 0.02, completion: 0.04, system: 0.005 } },
    ]);

    expect(chart.type).toBe('bar');
    expect(chart.datasets[0].data).toEqual([0.07, 0.14, 0.015]);
    expect(chart.meta).toEqual({ totalCost: 0.225 });
  });

  it('compares baseline and optimized token totals with reduction percentage', () => {
    const visualizer = new TokenVisualizer();
    const baseline: TokenBreakdown = {
      inputTokens: 400,
      outputTokens: 200,
      systemTokens: 50,
    };
    const optimized: TokenBreakdown = {
      inputTokens: 250,
      outputTokens: 120,
      systemTokens: 30,
    };

    const chart = visualizer.generateBaselineComparison(baseline, optimized);

    expect(chart.datasets[0].data).toEqual([400, 200, 50]);
    expect(chart.datasets[1].data).toEqual([250, 120, 30]);
    expect(chart.meta).toMatchObject({
      baselineTotal: 650,
      optimizedTotal: 400,
      reductionPercentage: 38.46,
    });
  });
});
