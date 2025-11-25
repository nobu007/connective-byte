import { TokenAnalysisResult } from './TokenAnalyzer';
import { TokenBreakdown } from '../types';

export type TokenChartType = 'pie' | 'bar';

export interface TokenChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
}

export interface TokenChart {
  type: TokenChartType;
  title: string;
  labels: string[];
  datasets: TokenChartDataset[];
  meta?: Record<string, unknown>;
}

export interface CostComponentBreakdown {
  prompt: number;
  completion: number;
  system: number;
}

export interface CostBreakdownInput {
  breakdown: CostComponentBreakdown;
}

export class TokenVisualizer {
  public generateDistribution(analysis: TokenAnalysisResult): TokenChart {
    const { totals } = analysis;

    return {
      type: 'pie',
      title: 'Token Distribution',
      labels: ['Input Tokens', 'Output Tokens', 'System Tokens'],
      datasets: [
        {
          label: 'Tokens',
          data: [totals.inputTokens, totals.outputTokens, totals.systemTokens],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
        },
      ],
      meta: {
        totalTokens: totals.totalTokens,
      },
    };
  }

  public generateCostBreakdown(inputs: CostBreakdownInput[]): TokenChart {
    const totals = inputs.reduce(
      (acc, entry) => {
        acc.prompt += entry.breakdown.prompt;
        acc.completion += entry.breakdown.completion;
        acc.system += entry.breakdown.system;
        return acc;
      },
      { prompt: 0, completion: 0, system: 0 }
    );

    return {
      type: 'bar',
      title: 'Cost Breakdown',
      labels: ['Prompt', 'Completion', 'System'],
      datasets: [
        {
          label: 'Cost ($)',
          data: [
            Number(totals.prompt.toFixed(6)),
            Number(totals.completion.toFixed(6)),
            Number(totals.system.toFixed(6)),
          ],
          backgroundColor: ['#6366f1', '#14b8a6', '#f97316'],
        },
      ],
      meta: {
        totalCost: Number((totals.prompt + totals.completion + totals.system).toFixed(6)),
      },
    };
  }

  public generateBaselineComparison(
    baseline: TokenBreakdown,
    optimized: TokenBreakdown
  ): TokenChart {
    const baselineTotals = this.sumTokens(baseline);
    const optimizedTotals = this.sumTokens(optimized);
    const reductionPercentage =
      baselineTotals === 0
        ? 0
        : Number((((baselineTotals - optimizedTotals) / baselineTotals) * 100).toFixed(2));

    return {
      type: 'bar',
      title: 'Token Comparison: Baseline vs Optimized',
      labels: ['Input', 'Output', 'System'],
      datasets: [
        {
          label: 'Baseline Tokens',
          data: [baseline.inputTokens, baseline.outputTokens, baseline.systemTokens],
          backgroundColor: '#94a3b8',
        },
        {
          label: 'Optimized Tokens',
          data: [optimized.inputTokens, optimized.outputTokens, optimized.systemTokens],
          backgroundColor: '#34d399',
        },
      ],
      meta: {
        baselineTotal: baselineTotals,
        optimizedTotal: optimizedTotals,
        reductionPercentage,
      },
    };
  }

  private sumTokens(tokens: TokenBreakdown): number {
    return tokens.inputTokens + tokens.outputTokens + tokens.systemTokens;
  }
}
