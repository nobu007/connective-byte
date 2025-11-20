import { TokenAnalyzer } from '../cost/TokenAnalyzer';
import { APICallRecord } from '../entities';

function createCall(partial: Partial<APICallRecord>): APICallRecord {
  return {
    id: partial.id ?? 'call-1',
    experimentId: partial.experimentId ?? 'exp-1',
    sessionId: partial.sessionId ?? 'session-1',
    provider: partial.provider ?? 'openai',
    model: partial.model ?? 'gpt-4o-mini',
    inputTokens: partial.inputTokens ?? 0,
    outputTokens: partial.outputTokens ?? 0,
    systemTokens: partial.systemTokens ?? 0,
    cost: partial.cost ?? 0,
    latencyMs: partial.latencyMs ?? 100,
    timestamp: partial.timestamp ?? new Date('2024-01-01T00:00:00Z'),
  };
}

describe('TokenAnalyzer', () => {
  it('returns empty analysis when no calls provided', () => {
    const analyzer = new TokenAnalyzer();
    const result = analyzer.analyze([]);

    expect(result.callCount).toBe(0);
    expect(result.totals.totalTokens).toBe(0);
    expect(result.highCostCalls).toHaveLength(0);
    expect(result.highTokenCalls).toHaveLength(0);
    expect(result.flags).toEqual({ excessiveSystemTokens: false, highAverageTokens: false });
  });

  it('calculates totals, distribution, and identifies high cost/token calls', () => {
    const analyzer = new TokenAnalyzer({ highCostThreshold: 0.2, highTokenThreshold: 100 });
    const calls: APICallRecord[] = [
      createCall({
        id: 'call-1',
        inputTokens: 50,
        outputTokens: 30,
        systemTokens: 20,
        cost: 0.15,
        latencyMs: 120,
      }),
      createCall({
        id: 'call-2',
        inputTokens: 80,
        outputTokens: 40,
        systemTokens: 30,
        cost: 0.25,
        latencyMs: 150,
      }),
    ];

    const result = analyzer.analyze(calls);

    expect(result.callCount).toBe(2);
    expect(result.totals).toMatchObject({
      inputTokens: 130,
      outputTokens: 70,
      systemTokens: 50,
      totalTokens: 250,
      totalCost: 0.4,
      averageCostPerCall: 0.2,
      averageLatencyMs: 135,
    });
    expect(result.distribution).toMatchObject({
      inputPercentage: 0.52,
      outputPercentage: 0.28,
      systemPercentage: 0.2,
    });
    expect(result.highCostCalls.map((call) => call.id)).toEqual(['call-2']);
    expect(result.highTokenCalls.map((call) => call.id)).toEqual(['call-1', 'call-2']);
  });

  it('sets flags when average tokens or system token ratio exceed thresholds', () => {
    const analyzer = new TokenAnalyzer({ highTokenThreshold: 150, systemTokenRatioWarning: 0.25 });
    const calls: APICallRecord[] = [
      createCall({ inputTokens: 100, outputTokens: 50, systemTokens: 75, cost: 1 }),
      createCall({ inputTokens: 120, outputTokens: 40, systemTokens: 60, cost: 1 }),
    ];

    const result = analyzer.analyze(calls);

    expect(result.flags.highAverageTokens).toBe(true);
    expect(result.flags.excessiveSystemTokens).toBe(true);
  });
});
