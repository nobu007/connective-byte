/**
 * Leaderboard Manager
 * Manages challenge leaderboards and rankings
 */

import { LeaderboardEntry } from './types';

export class LeaderboardManager {
  private entries = new Map<string, LeaderboardEntry>();

  public updateScore(
    userId: string,
    username: string,
    points: number,
    challengeCompleted: boolean
  ): void {
    const existing = this.entries.get(userId);

    if (existing) {
      existing.totalPoints += points;
      if (challengeCompleted) {
        existing.challengesCompleted++;
      }
      existing.score = existing.totalPoints;
    } else {
      this.entries.set(userId, {
        userId,
        username,
        score: points,
        challengesCompleted: challengeCompleted ? 1 : 0,
        totalPoints: points,
        rank: 0,
      });
    }

    this.updateRankings();
  }

  public getLeaderboard(limit = 100): LeaderboardEntry[] {
    const sorted = Array.from(this.entries.values()).sort((a, b) => b.totalPoints - a.totalPoints);

    return sorted.slice(0, limit);
  }

  public getUserRank(userId: string): number {
    const entry = this.entries.get(userId);
    return entry?.rank ?? 0;
  }

  public getChallengeLeaderboard(
    challengeId: string,
    scores: Map<string, { userId: string; username: string; score: number }>
  ): LeaderboardEntry[] {
    const entries = Array.from(scores.values()).map((s, index) => ({
      userId: s.userId,
      username: s.username,
      score: s.score,
      challengesCompleted: 1,
      totalPoints: s.score,
      rank: index + 1,
    }));

    return entries.sort((a, b) => b.score - a.score);
  }

  private updateRankings(): void {
    const sorted = Array.from(this.entries.values()).sort((a, b) => b.totalPoints - a.totalPoints);

    sorted.forEach((entry, index) => {
      entry.rank = index + 1;
    });
  }
}
