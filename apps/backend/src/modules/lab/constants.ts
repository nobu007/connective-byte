import { ResourceLimits } from './types';

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxConcurrentSessions: 3,
  maxCallsPerSession: 200,
  maxTokensPerSession: 200_000,
  maxSessionDurationMs: 1000 * 60 * 30, // 30 minutes
};

export const SESSION_EXPIRY_GRACE_MS = 1000 * 60 * 5; // 5 minutes grace window before cleanup
