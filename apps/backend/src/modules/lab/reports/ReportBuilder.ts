/**
 * Report Builder
 * Generates comprehensive experiment reports
 */

import { randomUUID } from 'crypto';
import { Experiment, APICallRecord, Baseline } from '../entities';
import {
  ExperimentReport,
  ReportSummary,
  BaselineSection,
  OptimizationSection,
  ResultsSection,
  VisualizationData,
} from './types';

export interface ReportData {
  experiment: Experiment;
  baseline?: Baseline;
  calls: APICallRecord[];
  optimizations: OptimizationSection[];
}

export class ReportBuilder {
  public build(data: ReportData): ExperimentReport {
    const summary = this.buildSummary(data);
    const baselineSection = this.buildBaselineSection(data.baseline);
    const results = this.buildResults(data, summary);
    const recommendations = this.generateRecommendations(data, results);
    const visualizations = this.generateVisualizations(data);

    return {
      id: randomUUID(),
      experimentId: data.experiment.id,
      experimentName: data.experiment.name,
      userId: data.experiment.userId,
      generatedAt: new Date(),
      summary,
      baseline: baselineSection,
      optimizations: data.optimizations,
      results,
      recommendations,
      visualizations,
    };
  }

  private buildSummary(data: ReportData): ReportSummary {
    const totalCost = data.calls.reduce((sum, call) => sum + call.cost, 0);
    const totalTokens = data.calls.reduce(
      (sum, call) => sum + call.inputTokens + call.outputTokens + call.systemTokens,
      0
    );
    const totalLatency = data.calls.reduce((sum, call) => sum + call.latencyMs, 0);
    const averageLatency = data.calls.length > 0 ? totalLatency / data.calls.length : 0;

    const baselineCost = data.baseline ? data.baseline.averageCost * data.calls.length : totalCost;
    const costSavings = Math.max(0, baselineCost - totalCost);
    const costSavingsPercentage = baselineCost > 0 ? (costSavings / baselineCost) * 100 : 0;

    const timestamps = data.calls.map((c) => c.timestamp.getTime());
    const start = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
    const end = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

    return {
      totalCost: Number(totalCost.toFixed(6)),
      totalTokens,
      totalRequests: data.calls.length,
      costSavings: Number(costSavings.toFixed(6)),
      costSavingsPercentage: Number(costSavingsPercentage.toFixed(2)),
      averageLatency: Math.round(averageLatency),
      duration: {
        start,
        end,
        durationMs: end.getTime() - start.getTime(),
      },
    };
  }

  private buildBaselineSection(baseline?: Baseline): BaselineSection {
    if (!baseline) {
      return {
        scenario: 'none',
        averageCost: 0,
        totalTokens: 0,
        averageLatency: 0,
        callCount: 0,
      };
    }

    return {
      scenario: baseline.scenario,
      averageCost: baseline.averageCost,
      totalTokens: baseline.totalTokens,
      averageLatency: baseline.averageLatencyMs,
      callCount: baseline.callCount,
    };
  }

  private buildResults(data: ReportData, summary: ReportSummary): ResultsSection {
    const baselineCost = data.baseline
      ? data.baseline.averageCost * data.calls.length
      : summary.totalCost;
    const baselineTokens = data.baseline?.totalTokens ?? summary.totalTokens;
    const baselineLatency = data.baseline?.averageLatencyMs ?? summary.averageLatency;

    const costReduction =
      baselineCost > 0 ? ((baselineCost - summary.totalCost) / baselineCost) * 100 : 0;
    const tokenReduction =
      baselineTokens > 0 ? ((baselineTokens - summary.totalTokens) / baselineTokens) * 100 : 0;
    const latencyImprovement =
      baselineLatency > 0
        ? ((baselineLatency - summary.averageLatency) / baselineLatency) * 100
        : 0;

    // Simple statistical significance check (>5% improvement with >10 samples)
    const statisticalSignificance = data.calls.length >= 10 && Math.abs(costReduction) >= 5;

    return {
      finalCost: summary.totalCost,
      finalTokens: summary.totalTokens,
      finalLatency: summary.averageLatency,
      improvementMetrics: {
        costReduction: Number(costReduction.toFixed(2)),
        tokenReduction: Number(tokenReduction.toFixed(2)),
        latencyImprovement: Number(latencyImprovement.toFixed(2)),
      },
      statisticalSignificance,
    };
  }

  private generateRecommendations(data: ReportData, results: ResultsSection): string[] {
    const recommendations: string[] = [];

    if (results.improvementMetrics.costReduction < 10) {
      recommendations.push(
        'さらなるコスト削減のため、プロンプト圧縮とキャッシング戦略の適用を検討してください'
      );
    }

    if (results.finalLatency > 2000) {
      recommendations.push(
        'レスポンス時間が長いため、バッチ処理や並列実行の導入を検討してください'
      );
    }

    if (data.calls.length < 10) {
      recommendations.push(
        '統計的有意性を確保するため、より多くのテストケースで実験を実施してください'
      );
    }

    const appliedOptimizations = data.optimizations.filter((o) => o.applied);
    if (appliedOptimizations.length < 2) {
      recommendations.push('複数の最適化戦略を組み合わせることで、さらなる改善が期待できます');
    }

    if (results.improvementMetrics.costReduction > 30) {
      recommendations.push('素晴らしい成果です！この最適化を本番環境に適用することを推奨します');
    }

    return recommendations;
  }

  private generateVisualizations(data: ReportData): VisualizationData[] {
    const visualizations: VisualizationData[] = [];

    // Cost over time
    visualizations.push({
      type: 'line',
      title: 'コスト推移',
      data: {
        labels: data.calls.map((c) => c.timestamp.toISOString()),
        datasets: [
          {
            label: 'コスト',
            data: data.calls.map((c) => c.cost),
          },
        ],
      },
    });

    // Token distribution
    const totalInput = data.calls.reduce((sum, c) => sum + c.inputTokens, 0);
    const totalOutput = data.calls.reduce((sum, c) => sum + c.outputTokens, 0);
    const totalSystem = data.calls.reduce((sum, c) => sum + c.systemTokens, 0);

    visualizations.push({
      type: 'pie',
      title: 'トークン分布',
      data: {
        labels: ['入力', '出力', 'システム'],
        datasets: [
          {
            data: [totalInput, totalOutput, totalSystem],
          },
        ],
      },
    });

    return visualizations;
  }
}
