/**
 * Usage Pattern Replicator
 * Replicates production usage patterns in sandbox
 */

import { UsagePatternConfig, RequestTypeDistribution } from './types';

export interface ReplicatedRequest {
  type: string;
  prompt: string;
  estimatedTokens: number;
  timestamp: Date;
}

export class UsagePatternReplicator {
  public generateRequests(
    pattern: UsagePatternConfig,
    durationMinutes: number
  ): ReplicatedRequest[] {
    const requests: ReplicatedRequest[] = [];
    const totalRequests = Math.round((pattern.requestFrequency * durationMinutes) / 60);

    for (let i = 0; i < totalRequests; i++) {
      const requestType = this.selectRequestType(pattern.requestTypes);
      const timestamp = this.generateTimestamp(
        i,
        totalRequests,
        durationMinutes,
        pattern.timingDistribution
      );

      requests.push({
        type: requestType.type,
        prompt: requestType.examplePrompt,
        estimatedTokens: requestType.averageTokens,
        timestamp,
      });
    }

    return requests.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private selectRequestType(types: RequestTypeDistribution[]): RequestTypeDistribution {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const type of types) {
      cumulative += type.percentage;
      if (random <= cumulative) {
        return type;
      }
    }

    return types[types.length - 1];
  }

  private generateTimestamp(
    index: number,
    total: number,
    durationMinutes: number,
    distribution: 'uniform' | 'poisson' | 'burst'
  ): Date {
    const now = Date.now();
    const durationMs = durationMinutes * 60 * 1000;

    switch (distribution) {
      case 'uniform':
        return new Date(now + (index / total) * durationMs);

      case 'poisson':
        // Exponential inter-arrival times
        const lambda = total / durationMs;
        const interArrival = -Math.log(1 - Math.random()) / lambda;
        return new Date(now + index * interArrival);

      case 'burst':
        // Clustered requests
        const burstSize = Math.ceil(total / 10);
        const burstIndex = Math.floor(index / burstSize);
        const withinBurst = index % burstSize;
        const burstStart = (burstIndex / 10) * durationMs;
        const burstDuration = durationMs / 20;
        return new Date(now + burstStart + (withinBurst / burstSize) * burstDuration);

      default:
        return new Date(now + (index / total) * durationMs);
    }
  }

  public analyzePattern(requests: ReplicatedRequest[]): {
    totalRequests: number;
    totalEstimatedTokens: number;
    requestsPerHour: number;
    typeDistribution: Record<string, number>;
  } {
    if (requests.length === 0) {
      return {
        totalRequests: 0,
        totalEstimatedTokens: 0,
        requestsPerHour: 0,
        typeDistribution: {},
      };
    }

    const totalTokens = requests.reduce((sum, req) => sum + req.estimatedTokens, 0);
    const typeDistribution: Record<string, number> = {};

    for (const req of requests) {
      typeDistribution[req.type] = (typeDistribution[req.type] || 0) + 1;
    }

    const firstTime = requests[0].timestamp.getTime();
    const lastTime = requests[requests.length - 1].timestamp.getTime();
    const durationHours = (lastTime - firstTime) / (1000 * 60 * 60);
    const requestsPerHour = durationHours > 0 ? requests.length / durationHours : 0;

    return {
      totalRequests: requests.length,
      totalEstimatedTokens: totalTokens,
      requestsPerHour: Number(requestsPerHour.toFixed(2)),
      typeDistribution,
    };
  }
}
