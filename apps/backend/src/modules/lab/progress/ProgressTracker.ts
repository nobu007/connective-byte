/**
 * Progress Tracker
 * Tracks user progress and achievements
 */

import { UserProgress } from '../entities';
import { Queryable, labDb } from '../db/client';
import { Badge } from '../challenges/types';

interface ProgressRow {
  user_id: string;
  experiments_completed: number;
  total_cost_savings: string;
  badges_earned: string;
  challenges_completed: string;
  skill_level: number;
  last_activity: Date;
}

export class ProgressTracker {
  constructor(private readonly db: Queryable = labDb) {}

  public async getProgress(userId: string): Promise<UserProgress> {
    const { rows } = await this.db.query<ProgressRow>(
      `SELECT * FROM lab_user_progress WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return this.initializeProgress(userId);
    }

    return this.mapRow(rows[0]);
  }

  public async updateExperimentCompleted(
    userId: string,
    costSavings: number
  ): Promise<UserProgress> {
    await this.db.query(
      `INSERT INTO lab_user_progress (user_id, experiments_completed, total_cost_savings, last_activity)
       VALUES ($1, 1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         experiments_completed = lab_user_progress.experiments_completed + 1,
         total_cost_savings = lab_user_progress.total_cost_savings + $2,
         last_activity = NOW()`,
      [userId, costSavings]
    );

    return this.getProgress(userId);
  }

  public async awardBadge(userId: string, badgeId: string): Promise<UserProgress> {
    const progress = await this.getProgress(userId);

    if (!progress.badgesEarned.includes(badgeId)) {
      progress.badgesEarned.push(badgeId);

      await this.db.query(
        `UPDATE lab_user_progress
         SET badges_earned = $1, last_activity = NOW()
         WHERE user_id = $2`,
        [JSON.stringify(progress.badgesEarned), userId]
      );
    }

    return this.getProgress(userId);
  }

  public async completeChallenge(userId: string, challengeId: string): Promise<UserProgress> {
    const progress = await this.getProgress(userId);

    if (!progress.challengesCompleted.includes(challengeId)) {
      progress.challengesCompleted.push(challengeId);

      await this.db.query(
        `UPDATE lab_user_progress
         SET challenges_completed = $1, last_activity = NOW()
         WHERE user_id = $2`,
        [JSON.stringify(progress.challengesCompleted), userId]
      );
    }

    return this.getProgress(userId);
  }

  public async updateSkillLevel(userId: string, level: number): Promise<UserProgress> {
    await this.db.query(
      `UPDATE lab_user_progress
       SET skill_level = $1, last_activity = NOW()
       WHERE user_id = $2`,
      [level, userId]
    );

    return this.getProgress(userId);
  }

  public async getRecommendations(userId: string): Promise<string[]> {
    const progress = await this.getProgress(userId);
    const recommendations: string[] = [];

    if (progress.experimentsCompleted === 0) {
      recommendations.push('最初の実験を開始して、APIコスト最適化の基礎を学びましょう');
    }

    if (progress.experimentsCompleted > 0 && progress.challengesCompleted.length === 0) {
      recommendations.push('チャレンジに挑戦して、スキルを試してみましょう');
    }

    if (progress.totalCostSavings < 10) {
      recommendations.push('プロンプト圧縮戦略を試して、コスト削減を実現しましょう');
    }

    if (progress.badgesEarned.length < 3) {
      recommendations.push('バッジを獲得して、専門性を証明しましょう');
    }

    if (progress.skillLevel < 5) {
      recommendations.push('より高度な最適化技術を学んで、スキルレベルを上げましょう');
    }

    return recommendations;
  }

  private async initializeProgress(userId: string): Promise<UserProgress> {
    await this.db.query(
      `INSERT INTO lab_user_progress (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    return {
      userId,
      experimentsCompleted: 0,
      totalCostSavings: 0,
      badgesEarned: [],
      challengesCompleted: [],
      skillLevel: 1,
      lastActivity: new Date(),
    };
  }

  private mapRow(row: ProgressRow): UserProgress {
    return {
      userId: row.user_id,
      experimentsCompleted: row.experiments_completed,
      totalCostSavings: Number(row.total_cost_savings),
      badgesEarned: JSON.parse(row.badges_earned),
      challengesCompleted: JSON.parse(row.challenges_completed),
      skillLevel: row.skill_level,
      lastActivity: row.last_activity,
    };
  }
}
