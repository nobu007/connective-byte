/**
 * Digital Twin Manager
 * Creates and manages digital twins of production systems
 */

import { randomUUID } from 'crypto';
import { DigitalTwin, DigitalTwinConfig, TwinMetrics } from './types';

export class DigitalTwinManager {
  private twins = new Map<string, DigitalTwin>();

  public createTwin(config: DigitalTwinConfig): DigitalTwin {
    const twin: DigitalTwin = {
      id: randomUUID(),
      config,
      createdAt: new Date(),
      metrics: {
        totalRuns: 0,
        totalCost: 0,
        averageCostPerRun: 0,
      },
    };

    this.twins.set(twin.id, twin);
    return twin;
  }

  public getTwin(id: string): DigitalTwin | undefined {
    return this.twins.get(id);
  }

  public listTwins(): DigitalTwin[] {
    return Array.from(this.twins.values());
  }

  public updateMetrics(twinId: string, runCost: number, optimizationSavings?: number): void {
    const twin = this.twins.get(twinId);
    if (!twin) {
      throw new Error(`Twin not found: ${twinId}`);
    }

    twin.metrics.totalRuns++;
    twin.metrics.totalCost += runCost;
    twin.metrics.averageCostPerRun = twin.metrics.totalCost / twin.metrics.totalRuns;
    twin.metrics.lastOptimizationSavings = optimizationSavings;
    twin.lastRunAt = new Date();
  }

  public deleteTwin(id: string): boolean {
    return this.twins.delete(id);
  }

  public cloneTwin(sourceId: string, newName: string): DigitalTwin {
    const source = this.twins.get(sourceId);
    if (!source) {
      throw new Error(`Source twin not found: ${sourceId}`);
    }

    const clonedConfig: DigitalTwinConfig = {
      ...source.config,
      name: newName,
      description: `${source.config.description} (cloned)`,
    };

    return this.createTwin(clonedConfig);
  }
}
