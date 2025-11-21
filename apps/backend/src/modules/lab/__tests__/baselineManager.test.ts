import { BaselineManager, BaselineCreationParams } from '../cost/BaselineManager';
import { Queryable } from '../db/client';

function createMockDb() {
  const query = jest.fn();
  return { query } as unknown as Queryable & { query: jest.Mock };
}

describe('BaselineManager', () => {
  const defaultCalls: BaselineCreationParams['calls'] = [
    { cost: 0.12, inputTokens: 20, outputTokens: 10, systemTokens: 0, latencyMs: 100 },
    { cost: 0.18, inputTokens: 15, outputTokens: 5, systemTokens: 0, latencyMs: 150 },
  ];

  it('calculates metrics and upserts default baseline, updating experiment baseline_id', async () => {
    const mockDb = createMockDb();
    const createdAt = new Date('2024-01-01T00:00:00Z');
    mockDb.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'baseline-123',
            experiment_id: 'exp-1',
            scenario: 'default',
            average_cost: '0.150000',
            total_tokens: '50',
            average_latency_ms: 125,
            call_count: 2,
            created_at: createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const manager = new BaselineManager(mockDb);
    const baseline = await manager.createBaseline({ experimentId: 'exp-1', calls: defaultCalls });

    expect(mockDb.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO lab_baselines'),
      expect.arrayContaining([
        expect.any(String), // UUID
        'exp-1',
        'default',
        0.15,
        50,
        125,
        2,
      ])
    );
    expect(mockDb.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE lab_experiments SET baseline_id'),
      ['baseline-123', 'exp-1']
    );

    expect(baseline).toEqual({
      id: 'baseline-123',
      experimentId: 'exp-1',
      scenario: 'default',
      averageCost: 0.15,
      totalTokens: 50,
      averageLatencyMs: 125,
      callCount: 2,
      createdAt,
    });
  });

  it('supports named scenarios without updating experiment baseline reference', async () => {
    const mockDb = createMockDb();
    const createdAt = new Date('2024-02-01T00:00:00Z');
    mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'baseline-peak',
          experiment_id: 'exp-peak',
          scenario: 'peak-load',
          average_cost: '0.300000',
          total_tokens: '100',
          average_latency_ms: 200,
          call_count: 2,
          created_at: createdAt,
        },
      ],
    });

    const manager = new BaselineManager(mockDb);
    const baseline = await manager.createBaseline({
      experimentId: 'exp-peak',
      scenario: ' Peak-Load ',
      calls: defaultCalls,
    });

    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect(baseline.scenario).toBe('peak-load');
  });

  it('lists baselines ordered by creation time', async () => {
    const mockDb = createMockDb();
    const rows = [
      {
        id: 'b2',
        experiment_id: 'exp',
        scenario: 'optimized',
        average_cost: '0.12',
        total_tokens: '80',
        average_latency_ms: 110,
        call_count: 3,
        created_at: new Date('2024-03-02T00:00:00Z'),
      },
      {
        id: 'b1',
        experiment_id: 'exp',
        scenario: 'default',
        average_cost: '0.2',
        total_tokens: '120',
        average_latency_ms: 140,
        call_count: 3,
        created_at: new Date('2024-03-01T00:00:00Z'),
      },
    ];
    mockDb.query.mockResolvedValueOnce({ rows });

    const manager = new BaselineManager(mockDb);
    const result = await manager.listBaselines('exp');

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM lab_baselines WHERE experiment_id = $1'),
      ['exp']
    );
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('b2');
  });

  it('returns null when baseline not found', async () => {
    const mockDb = createMockDb();
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    const manager = new BaselineManager(mockDb);
    const result = await manager.getBaseline('exp', 'non-existent');

    expect(result).toBeNull();
  });

  it('throws if no calls provided when creating baseline', async () => {
    const manager = new BaselineManager(createMockDb());
    await expect(manager.createBaseline({ experimentId: 'exp', calls: [] })).rejects.toThrow(
      'At least one API call is required'
    );
  });
});
