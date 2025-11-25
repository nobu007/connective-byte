import { calculateCost } from '../cost/pricing';
import { CostTracker, RecordCallParams } from '../cost/CostTracker';
import { Queryable } from '../db/client';
import { Provider } from '../types';

function createMockDb() {
  const query = jest.fn();
  return { query } as unknown as Queryable & { query: jest.Mock };
}

describe('Cost calculation pricing table', () => {
  it('calculates prompt, completion, and system costs with rounding', () => {
    const result = calculateCost('openai', 'gpt-4o-mini', {
      inputTokens: 750,
      outputTokens: 250,
      systemTokens: 100,
    });

    // prompt: 0.75 * 0.15 = 0.1125
    // completion: 0.25 * 0.6 = 0.15
    // system defaults to prompt rate: 0.1 * 0.15 = 0.015
    expect(result.cost).toBeCloseTo(0.2775, 6);
    expect(result.breakdown).toEqual({
      prompt: 0.1125,
      completion: 0.15,
      system: 0.015,
    });
  });

  it('falls back to default tier when model not explicitly priced', () => {
    const result = calculateCost('google', 'unknown-model', {
      inputTokens: 1000,
      outputTokens: 1000,
      systemTokens: 0,
    });

    // default prompt 0.25, completion 0.75
    expect(result.cost).toBe(1);
    expect(result.breakdown.prompt).toBe(0.25);
    expect(result.breakdown.completion).toBe(0.75);
  });
});

describe('CostTracker', () => {
  const baseRow = {
    id: 'call-1',
    experiment_id: 'exp-1',
    session_id: 'session-1',
    provider: 'openai' as Provider,
    model: 'gpt-4o-mini',
    input_tokens: 100,
    output_tokens: 50,
    system_tokens: 0,
    cost: '0.045',
    latency_ms: 210,
    occurred_at: new Date('2024-05-01T00:00:00Z'),
  };

  it('records API calls with accurate token counting and cost breakdown', async () => {
    const mockDb = createMockDb();
    mockDb.query.mockResolvedValueOnce({ rows: [baseRow] });

    const tracker = new CostTracker(mockDb);
    const params: RecordCallParams = {
      experimentId: 'exp-1',
      sessionId: 'session-1',
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokens: {
        inputTokens: 100,
        outputTokens: 50,
        systemTokens: 0,
      },
      latencyMs: 210,
      timestamp: baseRow.occurred_at,
    };

    const record = await tracker.recordCall(params);

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO lab_api_calls'),
      expect.arrayContaining([
        expect.any(String),
        params.experimentId,
        params.sessionId,
        params.provider,
        params.model,
        params.tokens.inputTokens,
        params.tokens.outputTokens,
        params.tokens.systemTokens,
        expect.closeTo(0.045, 6),
        params.latencyMs,
        baseRow.occurred_at,
      ])
    );

    expect(record.inputTokens).toBe(100);
    expect(record.outputTokens).toBe(50);
    expect(record.cost).toBeCloseTo(0.045, 6);
    expect(record.breakdown).toEqual({ prompt: 0.015, completion: 0.03, system: 0 });
  });

  it('summarizes experiments with aggregated token counts and latency', async () => {
    const mockDb = createMockDb();
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          call_count: 3,
          total_cost: 1.25,
          total_input_tokens: 900,
          total_output_tokens: 450,
          total_system_tokens: 60,
          avg_latency_ms: 180,
        },
      ],
    });

    const tracker = new CostTracker(mockDb);
    const summary = await tracker.getExperimentSummary('exp-2');

    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['exp-2']);
    expect(summary.totalTokens).toEqual({
      inputTokens: 900,
      outputTokens: 450,
      systemTokens: 60,
    });
    expect(summary.callCount).toBe(3);
    expect(summary.averageLatencyMs).toBe(180);
    expect(summary.totalCost).toBe(1.25);
  });
});
