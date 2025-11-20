import { Experiment } from '../entities';
import {
  APIResponse,
  ExperimentSessionSnapshot,
  ResourceLimits,
  SessionConfig,
  SessionMetrics,
  TokenBreakdown,
} from '../types';
import { DEFAULT_RESOURCE_LIMITS, SESSION_EXPIRY_GRACE_MS } from '../constants';
import { ResourceLimitError } from '../errors';

interface ExperimentSessionProps {
  id: string;
  userId: string;
  experimentId?: Experiment['id'];
  config: SessionConfig;
  resourceLimits?: ResourceLimits;
  createdAt?: Date;
}

const ZERO_TOKENS: TokenBreakdown = {
  inputTokens: 0,
  outputTokens: 0,
  systemTokens: 0,
};

export class ExperimentSession {
  public readonly id: string;
  public readonly userId: string;
  public readonly experimentId?: Experiment['id'];
  public readonly config: SessionConfig;

  private readonly createdAt: Date;
  private readonly resourceLimits: ResourceLimits;
  private lastActivityAt: Date;
  private totalTokens: TokenBreakdown = { ...ZERO_TOKENS };
  private totalCost = 0;
  private totalCalls = 0;
  private totalLatency = 0;
  private resourceLimitBreached = false;
  private terminated = false;

  constructor(props: ExperimentSessionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.experimentId = props.experimentId;
    this.config = props.config;
    this.resourceLimits = props.resourceLimits ?? DEFAULT_RESOURCE_LIMITS;
    this.createdAt = props.createdAt ?? new Date();
    this.lastActivityAt = this.createdAt;
  }

  public get isTerminated(): boolean {
    return this.terminated;
  }

  public isExpired(now: Date = new Date()): boolean {
    const elapsed = now.getTime() - this.createdAt.getTime();
    return elapsed > this.resourceLimits.maxSessionDurationMs + SESSION_EXPIRY_GRACE_MS;
  }

  public ensureActive(now: Date = new Date()): void {
    if (this.terminated) {
      throw new ResourceLimitError('Session already terminated', {
        sessionId: this.id,
        userId: this.userId,
      });
    }

    if (this.isExpired(now)) {
      this.resourceLimitBreached = true;
      throw new ResourceLimitError('Session has expired', {
        sessionId: this.id,
        elapsedMs: now.getTime() - this.createdAt.getTime(),
        maxSessionDurationMs: this.resourceLimits.maxSessionDurationMs,
      });
    }
  }

  public ensureCapacity(nextTokens: TokenBreakdown): void {
    if (this.totalCalls >= this.resourceLimits.maxCallsPerSession) {
      this.resourceLimitBreached = true;
      throw new ResourceLimitError('Maximum call count exceeded for session', {
        sessionId: this.id,
        maxCallsPerSession: this.resourceLimits.maxCallsPerSession,
      });
    }

    const projectedTokens =
      this.totalTokens.inputTokens + this.totalTokens.outputTokens + this.totalTokens.systemTokens;
    const incomingTokens =
      nextTokens.inputTokens + nextTokens.outputTokens + nextTokens.systemTokens;
    if (projectedTokens + incomingTokens > this.resourceLimits.maxTokensPerSession) {
      this.resourceLimitBreached = true;
      throw new ResourceLimitError('Maximum token allowance exceeded for session', {
        sessionId: this.id,
        maxTokensPerSession: this.resourceLimits.maxTokensPerSession,
      });
    }
  }

  public trackResponse(response: APIResponse): void {
    this.ensureCapacity(response.tokens);

    this.totalCalls += 1;
    this.totalCost += response.cost;
    this.totalLatency += response.latencyMs;
    this.totalTokens.inputTokens += response.tokens.inputTokens;
    this.totalTokens.outputTokens += response.tokens.outputTokens;
    this.totalTokens.systemTokens += response.tokens.systemTokens;
    this.lastActivityAt = response.timestamp;
  }

  public terminate(): void {
    this.terminated = true;
  }

  public toMetrics(): SessionMetrics {
    return {
      sessionId: this.id,
      experimentId: this.experimentId,
      userId: this.userId,
      provider: this.config.provider,
      totalCalls: this.totalCalls,
      totalTokens: { ...this.totalTokens },
      totalCost: Number(this.totalCost.toFixed(6)),
      averageLatencyMs: this.totalCalls === 0 ? 0 : Math.round(this.totalLatency / this.totalCalls),
      startedAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      resourceLimitBreached: this.resourceLimitBreached,
    };
  }

  public toSnapshot(): ExperimentSessionSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      experimentId: this.experimentId,
      config: this.config,
      createdAt: this.createdAt,
      expiresAt: new Date(this.createdAt.getTime() + this.resourceLimits.maxSessionDurationMs),
      totalCalls: this.totalCalls,
    };
  }
}
