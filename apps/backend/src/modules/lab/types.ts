import { Experiment } from './entities';

export type Provider = 'openai' | 'anthropic' | 'google';

export interface TokenBreakdown {
  inputTokens: number;
  outputTokens: number;
  systemTokens: number;
}

export interface SessionConfig {
  provider: Provider;
  apiKeyId?: string;
  apiKeyPlaintext?: string;
  useSharedKey?: boolean;
  isolationLevel: 'user' | 'experiment';
}

export interface SessionMetrics {
  sessionId: string;
  experimentId?: string;
  userId: string;
  provider: Provider;
  totalCalls: number;
  totalTokens: TokenBreakdown;
  totalCost: number;
  averageLatencyMs: number;
  startedAt: Date;
  lastActivityAt: Date;
  resourceLimitBreached: boolean;
}

export interface APIRequest {
  model: string;
  prompt: string;
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface APIResponse {
  content: string;
  model: string;
  tokens: TokenBreakdown;
  cost: number;
  latencyMs: number;
  timestamp: Date;
  provider: Provider;
}

export interface ExperimentSessionSnapshot {
  id: string;
  userId: string;
  experimentId?: Experiment['id'];
  config: SessionConfig;
  createdAt: Date;
  expiresAt: Date;
  totalCalls: number;
}

export interface ResourceLimits {
  maxConcurrentSessions: number;
  maxCallsPerSession: number;
  maxTokensPerSession: number;
  maxSessionDurationMs: number;
}

export interface GatewayRequest extends APIRequest {
  provider: Provider;
  apiKey: string;
}

export interface GatewayResponse extends APIResponse {}

export interface ProviderAdapter {
  supports(provider: Provider): boolean;
  execute(request: GatewayRequest): Promise<GatewayResponse>;
}

export interface APIKeyRecord {
  id: string;
  userId: string;
  alias?: string;
  provider: Provider;
  isShared: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}
