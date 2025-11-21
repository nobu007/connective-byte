import { randomUUID } from 'crypto';
import { APICallRecord, Baseline, Experiment } from '../entities';
import { Queryable, labDb } from '../db/client';

interface BaselineRow {
  id: string;
  experiment_id: Experiment['id'];
  scenario: string;
  average_cost: string;
  total_tokens: string;
  average_latency_ms: number;
  call_count: number;
  created_at: Date;
}

export interface BaselineCreationParams {
  experimentId: Experiment['id'];
  scenario?: string;
  calls: Array<
    Pick<APICallRecord, 'cost' | 'inputTokens' | 'outputTokens' | 'systemTokens' | 'latencyMs'>
  >;
}

export class BaselineManager {
  constructor(private readonly db: Queryable = labDb) {}

  public async createBaseline(params: BaselineCreationParams): Promise<Baseline> {
    if (!params.calls.length) {
      throw new Error('At least one API call is required to create a baseline');
    }

    const scenario = this.normalizeScenario(params.scenario);
    const { averageCost, totalTokens, averageLatencyMs, callCount } = this.calculateMetrics(
      params.calls
    );

    const baselineId = randomUUID();

    const insertResult = await this.db.query<BaselineRow>(
      `INSERT INTO lab_baselines (
        id,
        experiment_id,
        scenario,
        average_cost,
        total_tokens,
        average_latency_ms,
        call_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      ON CONFLICT (experiment_id, scenario)
      DO UPDATE SET
        average_cost = EXCLUDED.average_cost,
        total_tokens = EXCLUDED.total_tokens,
        average_latency_ms = EXCLUDED.average_latency_ms,
        call_count = EXCLUDED.call_count,
        created_at = NOW()
      RETURNING *`,
      [
        baselineId,
        params.experimentId,
        scenario,
        averageCost,
        totalTokens,
        averageLatencyMs,
        callCount,
      ]
    );

    const row = insertResult.rows[0];

    if (scenario === 'default') {
      await this.db.query(`UPDATE lab_experiments SET baseline_id = $1 WHERE id = $2`, [
        row.id,
        params.experimentId,
      ]);
    }

    return this.mapRow(row);
  }

  public async getBaseline(
    experimentId: Experiment['id'],
    scenario = 'default'
  ): Promise<Baseline | null> {
    const normalized = this.normalizeScenario(scenario);
    const { rows } = await this.db.query<BaselineRow>(
      `SELECT * FROM lab_baselines WHERE experiment_id = $1 AND scenario = $2 LIMIT 1`,
      [experimentId, normalized]
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  public async listBaselines(experimentId: Experiment['id']): Promise<Baseline[]> {
    const { rows } = await this.db.query<BaselineRow>(
      `SELECT * FROM lab_baselines WHERE experiment_id = $1 ORDER BY created_at DESC`,
      [experimentId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  private calculateMetrics(calls: BaselineCreationParams['calls']): {
    averageCost: number;
    totalTokens: number;
    averageLatencyMs: number;
    callCount: number;
  } {
    const callCount = calls.length;
    const totals = calls.reduce(
      (acc, call) => {
        acc.cost += call.cost;
        acc.tokens += call.inputTokens + call.outputTokens + call.systemTokens;
        acc.latency += call.latencyMs;
        return acc;
      },
      { cost: 0, tokens: 0, latency: 0 }
    );

    const averageCost = Number((totals.cost / callCount).toFixed(6));
    const averageLatencyMs = Math.round(totals.latency / callCount);

    return {
      averageCost,
      totalTokens: totals.tokens,
      averageLatencyMs,
      callCount,
    };
  }

  private mapRow(row: BaselineRow): Baseline {
    return {
      id: row.id,
      experimentId: row.experiment_id,
      scenario: row.scenario,
      averageCost: Number(row.average_cost),
      totalTokens: Number(row.total_tokens),
      averageLatencyMs: row.average_latency_ms,
      callCount: row.call_count,
      createdAt: row.created_at,
    };
  }

  private normalizeScenario(scenario?: string): string {
    const normalized = scenario?.trim().toLowerCase() || 'default';
    if (normalized.length === 0 || normalized.length > 64) {
      throw new Error('Scenario names must be between 1 and 64 characters');
    }
    return normalized;
  }
}
