import { SandboxManager } from '../sandbox/SandboxManager';
import { ExperimentSession } from '../sandbox/ExperimentSession';
import { APIKeyManager } from '../security/APIKeyManager';
import { APIKeyError, ResourceLimitError } from '../errors';
import { APIResponse, Provider, ResourceLimits } from '../types';

const createResponse = (overrides: Partial<APIResponse> = {}): APIResponse => ({
  content: 'ok',
  model: 'gpt-4o-mini',
  tokens: {
    inputTokens: 1,
    outputTokens: 0,
    systemTokens: 0,
  },
  cost: 0.0005,
  latencyMs: 120,
  timestamp: new Date(),
  provider: 'openai',
  ...overrides,
});

const defaultConfig = {
  provider: 'openai' as Provider,
  isolationLevel: 'user' as const,
  useSharedKey: true,
};

describe('Sandbox isolation', () => {
  it('tracks session metrics independently per user', () => {
    const manager = new SandboxManager();

    const sessionA = manager.createSession({
      userId: 'user-a',
      experimentId: 'exp-a',
      config: defaultConfig,
    });

    const sessionB = manager.createSession({
      userId: 'user-b',
      experimentId: 'exp-b',
      config: defaultConfig,
    });

    manager.getSession(sessionA.id).trackResponse(createResponse());

    const metricsA = manager.getSessionMetrics(sessionA.id);
    const metricsB = manager.getSessionMetrics(sessionB.id);

    expect(metricsA.userId).toBe('user-a');
    expect(metricsA.totalCalls).toBe(1);
    expect(metricsB.userId).toBe('user-b');
    expect(metricsB.totalCalls).toBe(0);
  });
});

describe('ExperimentSession resource limits', () => {
  it('throws ResourceLimitError when exceeding max calls', () => {
    const tightLimits: ResourceLimits = {
      maxConcurrentSessions: 1,
      maxCallsPerSession: 1,
      maxTokensPerSession: 10,
      maxSessionDurationMs: 1_000,
    };

    const session = new ExperimentSession({
      id: 'session-1',
      userId: 'user-a',
      experimentId: 'exp-a',
      config: defaultConfig,
      resourceLimits: tightLimits,
    });

    session.trackResponse(createResponse());

    expect(() => session.trackResponse(createResponse())).toThrow(ResourceLimitError);
  });
});

describe('APIKeyManager security', () => {
  it('prevents unauthorized access to stored keys', () => {
    const manager = new APIKeyManager({
      databaseUrl: 'postgres://test-db',
      encryptionKey: 'a'.repeat(64),
    });

    const record = manager.storeKey({
      userId: 'owner',
      provider: 'openai',
      key: 'sk-test-owner',
      alias: 'primary',
    });

    expect(manager.getKey(record.id, 'owner')).toBe('sk-test-owner');
    expect(() => manager.getKey(record.id, 'intruder')).toThrow(APIKeyError);
  });
});
