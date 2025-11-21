/**
 * KPI Definition Manager
 * Manages custom KPI definitions
 */

import { randomUUID } from 'crypto';
import { KPIDefinition, KPICategory } from './types';

export class KPIDefinitionManager {
  private definitions = new Map<string, KPIDefinition>();

  constructor() {
    this.initializeDefaultKPIs();
  }

  public createKPI(params: {
    name: string;
    description: string;
    category: KPICategory;
    formula: string;
    unit: string;
    thresholds: { warning: number; critical: number };
    higherIsBetter: boolean;
  }): KPIDefinition {
    const kpi: KPIDefinition = {
      id: randomUUID(),
      ...params,
      createdAt: new Date(),
    };

    this.validateFormula(kpi.formula);
    this.definitions.set(kpi.id, kpi);
    return kpi;
  }

  public getKPI(id: string): KPIDefinition | undefined {
    return this.definitions.get(id);
  }

  public listKPIs(category?: KPICategory): KPIDefinition[] {
    const all = Array.from(this.definitions.values());
    return category ? all.filter((kpi) => kpi.category === category) : all;
  }

  public updateKPI(
    id: string,
    updates: Partial<Omit<KPIDefinition, 'id' | 'createdAt'>>
  ): KPIDefinition {
    const kpi = this.definitions.get(id);
    if (!kpi) {
      throw new Error(`KPI not found: ${id}`);
    }

    if (updates.formula) {
      this.validateFormula(updates.formula);
    }

    const updated = { ...kpi, ...updates };
    this.definitions.set(id, updated);
    return updated;
  }

  public deleteKPI(id: string): boolean {
    return this.definitions.delete(id);
  }

  private validateFormula(formula: string): void {
    // Basic validation - check for dangerous operations
    const dangerous = ['eval', 'Function', 'require', 'import', 'process'];
    for (const keyword of dangerous) {
      if (formula.includes(keyword)) {
        throw new Error(`Formula contains forbidden keyword: ${keyword}`);
      }
    }

    // Check for valid mathematical operations
    const validPattern = /^[\d\s+\-*/().a-zA-Z_]+$/;
    if (!validPattern.test(formula)) {
      throw new Error('Formula contains invalid characters');
    }
  }

  private initializeDefaultKPIs(): void {
    const defaults: Array<Omit<KPIDefinition, 'id' | 'createdAt'>> = [
      {
        name: 'API Cost per Request',
        description: 'リクエストあたりの平均APIコスト',
        category: 'cost',
        formula: 'totalCost / totalRequests',
        unit: 'USD',
        thresholds: { warning: 0.5, critical: 1.0 },
        higherIsBetter: false,
      },
      {
        name: 'Token Efficiency',
        description: 'トークン使用効率（出力/入力比）',
        category: 'efficiency',
        formula: 'outputTokens / inputTokens',
        unit: 'ratio',
        thresholds: { warning: 0.5, critical: 0.3 },
        higherIsBetter: true,
      },
      {
        name: 'Response Latency',
        description: '平均レスポンス時間',
        category: 'performance',
        formula: 'totalLatency / totalRequests',
        unit: 'ms',
        thresholds: { warning: 2000, critical: 5000 },
        higherIsBetter: false,
      },
      {
        name: 'Cost Savings Rate',
        description: 'ベースラインからのコスト削減率',
        category: 'cost',
        formula: '(baselineCost - currentCost) / baselineCost * 100',
        unit: '%',
        thresholds: { warning: 10, critical: 5 },
        higherIsBetter: true,
      },
    ];

    for (const def of defaults) {
      const kpi: KPIDefinition = {
        id: randomUUID(),
        ...def,
        createdAt: new Date(),
      };
      this.definitions.set(kpi.id, kpi);
    }
  }
}
