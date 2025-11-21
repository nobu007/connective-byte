import { OptimizationSuggester } from '../cost/OptimizationSuggester';
import { TokenAnalysisResult } from '../cost/TokenAnalyzer';

describe('OptimizationSuggester', () => {
  const baseAnalysis = (): TokenAnalysisResult => ({
    callCount: 2,
    totals: {
      inputTokens: 100,
      outputTokens: 50,
      systemTokens: 25,
      totalTokens: 175,
      totalCost: 0.5,
      averageCostPerCall: 0.25,
      averageLatencyMs: 100,
    },
    distribution: {
      inputPercentage: 0.57,
      outputPercentage: 0.29,
      systemPercentage: 0.14,
    },
    highCostCalls: [],
    highTokenCalls: [],
    flags: {
      excessiveSystemTokens: false,
      highAverageTokens: false,
    },
  });

  it('returns prompt/system suggestions when flags are set', () => {
    const analysis = baseAnalysis();
    analysis.flags.highAverageTokens = true;
    analysis.flags.excessiveSystemTokens = true;

    const suggester = new OptimizationSuggester({ costPerThousandTokens: 1 });
    const suggestions = suggester.suggest(analysis);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].id).toBe('prompt-compression');
    expect(suggestions[1].id).toBe('system-trim');
  });

  it('creates prioritized suggestions for high cost/token calls respecting max limit', () => {
    const analysis = baseAnalysis();
    analysis.highCostCalls = [
      {
        id: 'cost-1',
        experimentId: 'exp',
        sessionId: 'session',
        provider: 'openai',
        model: 'gpt-4o-mini',
        timestamp: new Date(),
        totalTokens: 2000,
        cost: 5,
        latencyMs: 200,
        tokenBreakdown: { input: 1000, output: 800, system: 200 },
      },
    ];
    analysis.highTokenCalls = [
      {
        id: 'token-1',
        experimentId: 'exp',
        sessionId: 'session',
        provider: 'openai',
        model: 'gpt-4o',
        timestamp: new Date(),
        totalTokens: 5000,
        cost: 10,
        latencyMs: 300,
        tokenBreakdown: { input: 2500, output: 2000, system: 500 },
      },
      {
        id: 'token-2',
        experimentId: 'exp',
        sessionId: 'session',
        provider: 'openai',
        model: 'gpt-4.1',
        timestamp: new Date(),
        totalTokens: 4000,
        cost: 8,
        latencyMs: 280,
        tokenBreakdown: { input: 2000, output: 1500, system: 500 },
      },
    ];

    const suggester = new OptimizationSuggester({ maxSuggestions: 2, costPerThousandTokens: 0.5 });
    const suggestions = suggester.suggest(analysis);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].priority).toBe('high');
    expect(suggestions[0].relatedCallIds).toEqual(['cost-1']);
    expect(suggestions[1].relatedCallIds).toEqual(['token-1']);
  });

  it('returns empty list when no calls present', () => {
    const suggester = new OptimizationSuggester();
    const emptyAnalysis: TokenAnalysisResult = {
      callCount: 0,
      totals: {
        inputTokens: 0,
        outputTokens: 0,
        systemTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        averageCostPerCall: 0,
        averageLatencyMs: 0,
      },
      distribution: {
        inputPercentage: 0,
        outputPercentage: 0,
        systemPercentage: 0,
      },
      highCostCalls: [],
      highTokenCalls: [],
      flags: {
        excessiveSystemTokens: false,
        highAverageTokens: false,
      },
    };

    expect(suggester.suggest(emptyAnalysis)).toEqual([]);
  });
});
