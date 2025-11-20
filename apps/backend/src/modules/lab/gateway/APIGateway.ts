import { randomUUID } from 'crypto';
import { ProviderUnavailableError } from '../errors';
import {
  GatewayRequest,
  GatewayResponse,
  Provider,
  ProviderAdapter,
  TokenBreakdown,
} from '../types';

const SUPPORTED_PROVIDERS: Provider[] = ['openai', 'anthropic', 'google'];

export interface GatewayRequestLogEntry {
  correlationId: string;
  provider: Provider;
  model: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface GatewayResponseLogEntry {
  correlationId: string;
  provider: Provider;
  model: string;
  latencyMs: number;
  cost: number;
  tokens: TokenBreakdown;
  timestamp: Date;
}

export interface GatewayErrorLogEntry {
  correlationId: string;
  provider: Provider;
  model: string;
  message: string;
  timestamp: Date;
}

export interface GatewayLogger {
  request(entry: GatewayRequestLogEntry): void;
  response(entry: GatewayResponseLogEntry): void;
  error(entry: GatewayErrorLogEntry): void;
}

export interface GatewayMetricsSnapshot {
  totals: {
    requests: number;
    failures: number;
  };
  providers: ProviderMetricsSnapshot[];
}

export interface ProviderMetricsSnapshot {
  provider: Provider;
  totalRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  totalCost: number;
  totalTokens: TokenBreakdown;
  successRate: number;
}

interface ProviderMetricState {
  totalRequests: number;
  failedRequests: number;
  totalLatencyMs: number;
  totalCost: number;
  totalTokens: TokenBreakdown;
}

export class GatewayMetricsCollector {
  private readonly state = new Map<Provider, ProviderMetricState>();

  public recordSuccess(provider: Provider, response: GatewayResponse): void {
    const metric = this.ensureState(provider);
    metric.totalRequests += 1;
    metric.totalLatencyMs += response.latencyMs;
    metric.totalCost += response.cost;
    metric.totalTokens.inputTokens += response.tokens.inputTokens;
    metric.totalTokens.outputTokens += response.tokens.outputTokens;
    metric.totalTokens.systemTokens += response.tokens.systemTokens;
  }

  public recordFailure(provider: Provider): void {
    const metric = this.ensureState(provider);
    metric.totalRequests += 1;
    metric.failedRequests += 1;
  }

  public snapshot(): GatewayMetricsSnapshot {
    let totalRequests = 0;
    let totalFailures = 0;

    const providers = SUPPORTED_PROVIDERS.map((provider) => {
      const metric = this.state.get(provider);
      if (!metric) {
        return {
          provider,
          totalRequests: 0,
          failedRequests: 0,
          averageLatencyMs: 0,
          totalCost: 0,
          totalTokens: { inputTokens: 0, outputTokens: 0, systemTokens: 0 },
          successRate: 0,
        } satisfies ProviderMetricsSnapshot;
      }

      totalRequests += metric.totalRequests;
      totalFailures += metric.failedRequests;
      const successful = metric.totalRequests - metric.failedRequests;
      const averageLatencyMs =
        successful === 0 ? 0 : Math.round(metric.totalLatencyMs / successful);
      const successRate =
        metric.totalRequests === 0 ? 0 : Number((successful / metric.totalRequests).toFixed(4));

      return {
        provider,
        totalRequests: metric.totalRequests,
        failedRequests: metric.failedRequests,
        averageLatencyMs,
        totalCost: Number(metric.totalCost.toFixed(6)),
        totalTokens: { ...metric.totalTokens },
        successRate,
      } satisfies ProviderMetricsSnapshot;
    });

    return {
      totals: {
        requests: totalRequests,
        failures: totalFailures,
      },
      providers,
    };
  }

  private ensureState(provider: Provider): ProviderMetricState {
    if (!this.state.has(provider)) {
      this.state.set(provider, {
        totalRequests: 0,
        failedRequests: 0,
        totalLatencyMs: 0,
        totalCost: 0,
        totalTokens: { inputTokens: 0, outputTokens: 0, systemTokens: 0 },
      });
    }
    return this.state.get(provider)!;
  }
}

class ConsoleGatewayLogger implements GatewayLogger {
  public request(entry: GatewayRequestLogEntry): void {
    // eslint-disable-next-line no-console
    console.debug('[LabGateway][request]', entry);
  }

  public response(entry: GatewayResponseLogEntry): void {
    // eslint-disable-next-line no-console
    console.debug('[LabGateway][response]', entry);
  }

  public error(entry: GatewayErrorLogEntry): void {
    // eslint-disable-next-line no-console
    console.warn('[LabGateway][error]', entry);
  }
}

interface APIGatewayOptions {
  logger?: GatewayLogger;
  metricsCollector?: GatewayMetricsCollector;
}

export class APIGateway {
  private readonly adapters = new Map<Provider, ProviderAdapter>();
  private readonly logger: GatewayLogger;
  private readonly metrics: GatewayMetricsCollector;

  constructor(adapters: ProviderAdapter[] = [], options: APIGatewayOptions = {}) {
    this.logger = options.logger ?? new ConsoleGatewayLogger();
    this.metrics = options.metricsCollector ?? new GatewayMetricsCollector();
    adapters.forEach((adapter) => this.registerAdapter(adapter));
  }

  public registerAdapter(adapter: ProviderAdapter): void {
    SUPPORTED_PROVIDERS.forEach((provider) => {
      if (adapter.supports(provider)) {
        this.adapters.set(provider, adapter);
      }
    });
  }

  public async execute(request: GatewayRequest): Promise<GatewayResponse> {
    const adapter = this.adapters.get(request.provider);
    if (!adapter) {
      throw new ProviderUnavailableError('No adapter registered for provider', {
        provider: request.provider,
      });
    }

    const correlationId = randomUUID();
    const startedAt = Date.now();
    const requestLog: GatewayRequestLogEntry = {
      correlationId,
      provider: request.provider,
      model: request.model,
      sessionId: (request.metadata as { sessionId?: string } | undefined)?.sessionId,
      timestamp: new Date(),
      metadata: request.metadata,
    };
    this.logger.request(requestLog);

    try {
      const response = await adapter.execute(request);
      const latencyMs = response.latencyMs ?? Date.now() - startedAt;
      const normalizedResponse: GatewayResponse = {
        ...response,
        latencyMs,
        timestamp: response.timestamp ?? new Date(),
      };

      this.metrics.recordSuccess(request.provider, normalizedResponse);
      this.logger.response({
        correlationId,
        provider: request.provider,
        model: request.model,
        latencyMs,
        cost: normalizedResponse.cost,
        tokens: normalizedResponse.tokens,
        timestamp: normalizedResponse.timestamp,
      });

      return normalizedResponse;
    } catch (error) {
      this.metrics.recordFailure(request.provider);
      this.logger.error({
        correlationId,
        provider: request.provider,
        model: request.model,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  public getMetricsSnapshot(): GatewayMetricsSnapshot {
    return this.metrics.snapshot();
  }
}
