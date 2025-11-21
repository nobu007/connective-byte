/**
 * Challenge Manager
 * Manages challenges and challenge sessions
 */

import { randomUUID } from 'crypto';
import { Challenge, ChallengeSession, ChallengeResult, ChallengeStatus } from './types';

export class ChallengeManager {
  private challenges = new Map<string, Challenge>();
  private sessions = new Map<string, ChallengeSession>();

  public registerChallenge(challenge: Challenge): void {
    this.challenges.set(challenge.id, challenge);
  }

  public getChallenge(id: string): Challenge | undefined {
    return this.challenges.get(id);
  }

  public listChallenges(userId: string): Challenge[] {
    const completed = this.getCompletedChallenges(userId);
    return Array.from(this.challenges.values()).map((challenge) => ({
      ...challenge,
      status: this.determineChallengeStatus(challenge, completed),
    })) as Challenge[];
  }

  public startChallenge(challengeId: string, userId: string): ChallengeSession {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    const session: ChallengeSession = {
      id: randomUUID(),
      challengeId,
      userId,
      status: 'in-progress',
      startedAt: new Date(),
      attempts: 0,
      hintsUsed: [],
      score: 0,
      metrics: {
        actualCost: 0,
        actualTokens: 0,
        costReduction: 0,
        latency: 0,
      },
    };

    this.sessions.set(session.id, session);
    return session;
  }

  public submitSolution(sessionId: string, metrics: ChallengeSession['metrics']): ChallengeResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const challenge = this.challenges.get(session.challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${session.challengeId}`);
    }

    session.attempts++;
    session.metrics = metrics;

    const result = this.evaluateSolution(session, challenge);

    if (result.success) {
      session.status = 'completed';
      session.completedAt = new Date();
      session.score = result.score;
    }

    return result;
  }

  public useHint(sessionId: string, hintId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.hintsUsed.includes(hintId)) {
      session.hintsUsed.push(hintId);
    }
  }

  public getSession(sessionId: string): ChallengeSession | undefined {
    return this.sessions.get(sessionId);
  }

  private evaluateSolution(session: ChallengeSession, challenge: Challenge): ChallengeResult {
    const feedback: string[] = [];
    const badgesEarned: string[] = [];

    // Check metrics
    const metricsAchieved =
      session.metrics.actualCost <= challenge.targetMetrics.maxCost &&
      session.metrics.actualTokens <= challenge.targetMetrics.maxTokens &&
      session.metrics.costReduction >= challenge.targetMetrics.minCostReduction &&
      session.metrics.latency <= challenge.targetMetrics.maxLatency;

    if (!metricsAchieved) {
      if (session.metrics.actualCost > challenge.targetMetrics.maxCost) {
        feedback.push(
          `コストが目標を超過しています（${session.metrics.actualCost} > ${challenge.targetMetrics.maxCost}）`
        );
      }
      if (session.metrics.actualTokens > challenge.targetMetrics.maxTokens) {
        feedback.push(
          `トークン数が目標を超過しています（${session.metrics.actualTokens} > ${challenge.targetMetrics.maxTokens}）`
        );
      }
      if (session.metrics.costReduction < challenge.targetMetrics.minCostReduction) {
        feedback.push(
          `コスト削減率が不足しています（${session.metrics.costReduction}% < ${challenge.targetMetrics.minCostReduction}%）`
        );
      }
    }

    // Calculate score
    let score = challenge.points;

    // Deduct points for hints used
    for (const hintId of session.hintsUsed) {
      const hint = challenge.hints.find((h) => h.id === hintId);
      if (hint) {
        score -= hint.pointsPenalty;
      }
    }

    // Deduct points for multiple attempts
    if (session.attempts > 1) {
      score -= (session.attempts - 1) * 10;
    }

    // Bonus for exceptional performance
    if (session.metrics.costReduction > challenge.targetMetrics.minCostReduction * 1.5) {
      score += 50;
      badgesEarned.push('cost-optimizer');
      feedback.push('素晴らしい！期待を大きく上回るコスト削減を達成しました！');
    }

    score = Math.max(0, score);

    const objectivesCompleted = challenge.objectives.filter((o) => o.required).length;

    return {
      success: metricsAchieved,
      score,
      objectivesCompleted,
      totalObjectives: challenge.objectives.length,
      metricsAchieved,
      feedback,
      badgesEarned,
    };
  }

  private getCompletedChallenges(userId: string): Set<string> {
    const completed = new Set<string>();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.status === 'completed') {
        completed.add(session.challengeId);
      }
    }
    return completed;
  }

  private determineChallengeStatus(challenge: Challenge, completed: Set<string>): ChallengeStatus {
    if (completed.has(challenge.id)) {
      return 'completed';
    }

    // Check prerequisites
    for (const prereqId of challenge.prerequisites) {
      if (!completed.has(prereqId)) {
        return 'locked';
      }
    }

    return 'available';
  }
}
