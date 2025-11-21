/**
 * Report Generation Types
 */

export interface ExperimentReport {
  id: string;
  experimentId: string;
  experimentName: string;
  userId: string;
  generatedAt: Date;
  summary: ReportSummary;
  baseline: BaselineSection;
  optimizations: OptimizationSection[];
  results: ResultsSection;
  recommendations: string[];
  visualizations: VisualizationData[];
}

export interface ReportSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  costSavings: number;
  costSavingsPercentage: number;
  averageLatency: number;
  duration: {
    start: Date;
    end: Date;
    durationMs: number;
  };
}

export interface BaselineSection {
  scenario: string;
  averageCost: number;
  totalTokens: number;
  averageLatency: number;
  callCount: number;
}

export interface OptimizationSection {
  strategyName: string;
  description: string;
  applied: boolean;
  estimatedSavings: number;
  actualSavings?: number;
  techniques: string[];
}

export interface ResultsSection {
  finalCost: number;
  finalTokens: number;
  finalLatency: number;
  improvementMetrics: {
    costReduction: number;
    tokenReduction: number;
    latencyImprovement: number;
  };
  statisticalSignificance: boolean;
}

export interface VisualizationData {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

export type ExportFormat = 'json' | 'pdf' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  includeVisualizations: boolean;
  includeRawData: boolean;
}
