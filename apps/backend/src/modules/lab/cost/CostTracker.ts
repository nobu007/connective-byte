import { randomUUID } from 'crypto';
import { QueryResultRow } from 'pg';
import { APICallRecord, Experiment } from '../entities';
import { Provider, TokenBreakdown } from '../types';
import { CostBreakdownResult, calculateCost } from './pricing';
import { Queryable, labDb } from '../db/client';

interface APICallRow extends QueryResultRow {
  id: string;
  experiment_id: string;
  session_id: string;
  provider: Provider;
  model: string;
  input_tokens: number;
  output_tokens: number;
  system_tokens: number;
  cost: string;
  latency_ms: number;
  occurred_at: Date;
}

export interface RecordCallParams {
  experimentId: Experiment['id'];
  sessionId: string;
  provider: Provider;
  model: string;
  tokens: TokenBreakdown;
  latencyMs: number;
  timestamp?: Date;
}

export interface CostTrackerRecord extends APICallRecord {
  breakdown: CostBreakdownResult['breakdown'];
}

export interface ExperimentCostSummary {
  experimentId: Experiment['id'];
  callCount: number;
  totalCost: number;
  totalTokens: TokenBreakdown;
  averageLatencyMs: number;
}

interface SummaryRow extends QueryResultRow {
  call_count: number;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_system_tokens: number;
  avg_latency_ms: number;
}

export class CostTracker {
  constructor(private readonly db: Queryable = labDb) {}

  public async recordCall(params: RecordCallParams): Promise<CostTrackerRecord> {
    const occurredAt = params.timestamp ?? new Date();
    const costResult = calculateCost(params.provider, params.model, params.tokens);
    const id = randomUUID();

    const { rows } = await this.db.query<APICallRow>(
      `INSERT INTO lab_api_calls (
        id,
        experiment_id,
        session_id,
        provider,
        model,
        input_tokens,
        output_tokens,
        system_tokens,
        cost,
        latency_ms,
        occurred_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      ) RETURNING *`,
      [
        id,
        params.experimentId,
        params.sessionId,
        params.provider,
        params.model,
        params.tokens.inputTokens,
        params.tokens.outputTokens,
        params.tokens.systemTokens,
        costResult.cost,
        params.latencyMs,
        occurredAt,
      ]
    );

    const row = rows[0];
    return this.mapRow(row, costResult);
  }

  public async getExperimentSummary(
    experimentId: Experiment['id']
  ): Promise<ExperimentCostSummary> {
    const { rows } = await this.db.query<SummaryRow>(
      `SELECT
        COUNT(*)::int AS call_count,
        COALESCE(SUM(cost)::float8, 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COALESCE(SUM(system_tokens), 0) AS total_system_tokens,
        COALESCE(AVG(latency_ms)::float8, 0) AS avg_latency_ms
      FROM lab_api_calls
      WHERE experiment_id = $1`,
      [experimentId]
    );

    const row = rows[0];
    return {
      experimentId,
      callCount: row?.call_count ?? 0,
      totalCost: Number(row?.total_cost ?? 0),
      totalTokens: {
        inputTokens: row?.total_input_tokens ?? 0,
        outputTokens: row?.total_output_tokens ?? 0,
        systemTokens: row?.total_system_tokens ?? 0,
      },
      averageLatencyMs: Math.round(row?.avg_latency_ms ?? 0),
    };
  }

  public async getRecentCalls(
    experimentId: Experiment['id'],
    limit = 50
  ): Promise<CostTrackerRecord[]> {
    const { rows } = await this.db.query<APICallRow>(
      `SELECT *
      FROM lab_api_calls
      WHERE experiment_id = $1
      ORDER BY occurred_at DESC
      LIMIT $2`,
      [experimentId, limit]
    );

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: APICallRow, costResult?: CostBreakdownResult): CostTrackerRecord {
    return {
      id: row.id,
      experimentId: row.experiment_id,
      sessionId: row.session_id,
      provider: row.provider,
      model: row.model,
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      systemTokens: Number(row.system_tokens),
      cost: Number(row.cost),
      latencyMs: row.latency_ms,
      timestamp: row.occurred_at,
      breakdown:
        costResult?.breakdown ??
        calculateCost(row.provider, row.model, {
          inputTokens: Number(row.input_tokens),
          outputTokens: Number(row.output_tokens),
          systemTokens: Number(row.system_tokens),
        }).breakdown,
    };
  }
}
