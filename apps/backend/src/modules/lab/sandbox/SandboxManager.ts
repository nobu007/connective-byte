import { randomUUID } from 'crypto';
import { Experiment } from '../entities';
import { SessionNotFoundError } from '../errors';
import { DEFAULT_RESOURCE_LIMITS } from '../constants';
import { ExperimentSessionSnapshot, ResourceLimits, SessionConfig, SessionMetrics } from '../types';
import { ExperimentSession } from './ExperimentSession';

interface SandboxManagerOptions {
  resourceLimits?: ResourceLimits;
}

export class SandboxManager {
  private readonly resourceLimits: ResourceLimits;
  private readonly sessions = new Map<string, ExperimentSession>();

  constructor(options: SandboxManagerOptions = {}) {
    this.resourceLimits = options.resourceLimits ?? DEFAULT_RESOURCE_LIMITS;
  }

  public createSession(params: {
    userId: string;
    experimentId?: Experiment['id'];
    config: SessionConfig;
  }): ExperimentSessionSnapshot {
    const sessionId = randomUUID();
    const session = new ExperimentSession({
      id: sessionId,
      userId: params.userId,
      experimentId: params.experimentId,
      config: params.config,
      resourceLimits: this.resourceLimits,
    });

    this.sessions.set(sessionId, session);
    return session.toSnapshot();
  }

  public terminateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError({ sessionId });
    }

    session.terminate();
    this.sessions.delete(sessionId);
  }

  public getSession(sessionId: string): ExperimentSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError({ sessionId });
    }
    session.ensureActive();
    return session;
  }

  public getSessionMetrics(sessionId: string): SessionMetrics {
    return this.getSession(sessionId).toMetrics();
  }

  public purgeExpiredSessions(now: Date = new Date()): number {
    let removed = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.isExpired(now)) {
        this.sessions.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}
