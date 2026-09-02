/**
 * Learning モジュールの DI コンテナ
 *
 * auth の auth.container と同じ役割: 実装の選択（Postgres / Json）をここに集約し、
 * HTTP controller と worker.ts で同一の wiring を共有する。
 */

import { LearningRepository } from './interfaces/learning-repository';
import { JsonLearningRepository } from './implementations/json-learning-repository';
import { PostgresLearningRepository } from './implementations/postgres-learning-repository';
import { LearningService } from './services/learning-service';
import { ProgressService } from './services/progress-service';
import { paymentsContainer } from '../payments/payments.container';

export interface LearningContainer {
  learningRepository: LearningRepository;
  /** カリキュラム読み取り・管理CRUD */
  learningService: LearningService;
  /** 学習進捗 */
  progressService: ProgressService;
}

export function buildLearningContainer(): LearningContainer {
  // 本番（DATABASE_URL = Neon Postgres 設定時）は Postgres、
  // 未設定（ローカル開発・テスト）は Json を使用
  const usePostgres = Boolean(process.env.DATABASE_URL);
  const learningRepository: LearningRepository = usePostgres
    ? new PostgresLearningRepository()
    : new JsonLearningRepository();

  // Weeks 2-12 の閲覧資格判定は PaymentService に委譲（依存方向: learning → payments）
  return {
    learningRepository,
    learningService: new LearningService(learningRepository, paymentsContainer.paymentService),
    progressService: new ProgressService(learningRepository, paymentsContainer.paymentService),
  };
}

/** アプリ全体で共有するシングルトン（モジュールロード時に1回だけ構築） */
export const learningContainer = buildLearningContainer();
