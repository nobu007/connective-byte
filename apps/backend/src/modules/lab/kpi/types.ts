/**
 * KPI Designer Types
 */

export type KPICategory = 'cost' | 'performance' | 'quality' | 'efficiency';
export type KPIStatus = 'normal' | 'warning' | 'critical';

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  category: KPICategory;
  formula: string;
  unit: string;
  thresholds: {
    warning: number;
    critical: number;
  };
  higherIsBetter: boolean;
  createdAt: Date;
}

export interface KPIValue {
  kpiId: string;
  value: number;
  status: KPIStatus;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface KPITrend {
  kpiId: string;
  values: Array<{
    timestamp: Date;
    value: number;
    status: KPIStatus;
  }>;
  trend: 'improving' | 'stable' | 'degrading';
  changePercentage: number;
}

export interface KPIAlert {
  id: string;
  kpiId: string;
  status: KPIStatus;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}
