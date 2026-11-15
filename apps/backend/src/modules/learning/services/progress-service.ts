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
import { EntitlementChecker, allowAllEntitlement } from '../interfaces/entitlement-checker';
import { FREE_WEEKS } from './learning-service';

export class ProgressService {
  constructor(
    private readonly repository: LearningRepository,
    // 既定は常に許可（既存テスト後方互換。本番は container で PaymentService を注入）
    private readonly entitlement: EntitlementChecker = allowAllEntitlement
  ) {}

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

    // 有料週の進捗記録も本文閲覧と同じ資格判定で保護（403 + PAYMENT_001）
    if (
      session.moduleWeekNumber > FREE_WEEKS &&
      !(await this.entitlement.hasEntitlement(learnerId))
    ) {
      throw new LearningError('PAYMENT_001', 'このセッションは受講登録（購入）が必要です', 403);
    }

    return this.repository.upsertProgress(learnerId, sessionId, status);
  }

  getOverview(learnerId: string): Promise<ProgressOverview> {
    return this.repository.getProgressOverview(learnerId);
  }
}
