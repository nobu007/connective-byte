/**
 * Progress Service
 *
 * 学習進捗の記録とサマリ。集計の分母は「公開モジュール × 公開セッション」のみ
 * （未公開コンテンツで学習者の達成率が落ちないようにする）。
 */

import {
  LearningRepository,
  SessionProgressRecord,
  SessionProgressStatus,
  ProgressOverview,
} from '../interfaces/learning-repository';
import { LearningError } from '../errors';

export class ProgressService {
  constructor(private readonly repository: LearningRepository) {}

  async setProgress(
    learnerId: string,
    sessionId: string,
    status: SessionProgressStatus
  ): Promise<SessionProgressRecord> {
    // 進捗記録は公開中のセッションに限る（未公開は学習対象外）
    const session = await this.repository.findSessionById(sessionId);
    if (!session || !session.isPublished) {
      throw new LearningError(
        'LEARNING_PROGRESS_001',
        '対象セッションが存在しないか公開されていません',
        404
      );
    }

    return this.repository.upsertProgress(learnerId, sessionId, status);
  }

  getOverview(learnerId: string): Promise<ProgressOverview> {
    return this.repository.getProgressOverview(learnerId);
  }
}
