import { SandboxManager } from '../sandbox/SandboxManager';
import { ExperimentSession } from '../sandbox/ExperimentSession';
import { ResourceLimitError, APIKeyError } from '../errors';
import { APIKeyManager } from '../security/APIKeyManager';
import { GatewayResponse, ResourceLimits } from '../types';
import { LabEnvironmentConfig } from '../config';
import { SESSION_EXPIRY_GRACE_MS } from '../constants';

const BASE_LIMITS: ResourceLimits = {
  maxConcurrentSessions: 5,
  maxCallsPerSession: 10,
  maxTokensPerSession: 5000,
  maxSessionDurationMs: 1000 * 60,
};

const SHORT_LIMITS: ResourceLimits = {
  maxConcurrentSessions: 1,
  maxCallsPerSession: 1,
  maxTokensPerSession: 40,
  maxSessionDurationMs: 10,
};

function createResponse(overrides: Partial<GatewayResponse> = {}): GatewayResponse {
  return {
    provider: 'openai',
    model: 'gpt-4o-mini',
    content: 'ok',
    tokens: {
      inputTokens: 10,
      outputTokens: 5,
      systemTokens: 0,
      ...(overrides.tokens ?? {}),
    },
    cost: 0.00042,
    latencyMs: 120,
    timestamp: new Date(),
    ...overrides,
  };
}

describe('SandboxManager', () => {
  it('maintains isolated state per session', () => {
    const manager = new SandboxManager({ resourceLimits: BASE_LIMITS });
    const sessionA = manager.createSession({
      userId: 'user-a',
      config: { provider: 'openai', isolationLevel: 'user' },
    });
    const sessionB = manager.createSession({
      userId: 'user-b',
      config: { provider: 'openai', isolationLevel: 'user' },
    });

    const sessionInstanceA = manager.getSession(sessionA.id);
    sessionInstanceA.trackResponse(createResponse());

    const metricsB = manager.getSession(sessionB.id).toMetrics();
    expect(metricsB.totalCalls).toBe(0);
  });

  it('purges expired sessions to preserve isolation guarantees', () => {
    const manager = new SandboxManager({ resourceLimits: SHORT_LIMITS });
    manager.createSession({
      userId: 'user-exp',
      config: { provider: 'openai', isolationLevel: 'user' },
    });

    const future = new Date(
      Date.now() + SHORT_LIMITS.maxSessionDurationMs + SESSION_EXPIRY_GRACE_MS + 1
    );
    const removed = manager.purgeExpiredSessions(future);
    expect(removed).toBe(1);
  });
});

describe('ExperimentSession resource limits', () => {
  it('rejects calls that exceed the maximum allowed invocations', () => {
    const session = new ExperimentSession({
      id: 'sess-limit-calls',
      userId: 'user',
      config: { provider: 'openai', isolationLevel: 'user' },
      resourceLimits: { ...SHORT_LIMITS, maxTokensPerSession: 100 },
    });

    session.trackResponse(createResponse());
    expect(() => session.trackResponse(createResponse())).toThrow(ResourceLimitError);
  });

  it('rejects calls that exceed token allowance', () => {
    const session = new ExperimentSession({
      id: 'sess-limit-tokens',
      userId: 'user',
      config: { provider: 'openai', isolationLevel: 'user' },
      resourceLimits: { ...BASE_LIMITS, maxTokensPerSession: 20 },
    });

    session.trackResponse(
      createResponse({ tokens: { inputTokens: 10, outputTokens: 5, systemTokens: 0 } })
    );
    expect(() =>
      session.trackResponse(
        createResponse({ tokens: { inputTokens: 8, outputTokens: 5, systemTokens: 0 } })
      )
    ).toThrow(ResourceLimitError);
  });
});

describe('APIKeyManager security', () => {
  const config: LabEnvironmentConfig = {
    databaseUrl: 'postgres://example',
    encryptionKey: 'a'.repeat(64),
  };

  it('allows owners to store and retrieve encrypted keys', () => {
    const manager = new APIKeyManager(config);
    const record = manager.storeKey({ userId: 'owner', provider: 'openai', key: 'sk-test-key' });

    expect(manager.getKey(record.id, 'owner')).toBe('sk-test-key');
  });

  it('prevents other users from retrieving private keys', () => {
    const manager = new APIKeyManager(config);
    const record = manager.storeKey({ userId: 'owner', provider: 'openai', key: 'sk-secret-key' });

    expect(() => manager.getKey(record.id, 'intruder')).toThrow(APIKeyError);
  });
});
