/**
 * Maintenance Service
 * Cron Trigger（apps/backend/wrangler.toml の [triggers] crons）から日次実行される
 * 整理処理。worker.ts の scheduled ハンドラ経由で呼ばれる。
 */

import { UserRepository } from '../interfaces/user-repository';

export interface MaintenanceResult {
  /** 期限切れセッションの削除件数 */
  expiredSessions: number;
  /** 保持期間（90日）超過の監査ログ削除件数 */
  oldAuthLogs: number;
  /** 期限到達したアカウント削除の処理件数（Phase 3 で実装） */
  processedDeletions: number;
}

/** 監査ログの保持期間（requirements.md: 90日） */
export const AUTH_LOG_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export class MaintenanceService {
  constructor(
    private userRepository: UserRepository,
    /** 期限計算をテストで制御可能にする（デフォルトは実時間） */
    private clock: () => Date = () => new Date()
  ) {}

  async run(): Promise<MaintenanceResult> {
    const now = this.clock();

    // 1. 期限切れセッション
    const expiredSessions = await this.userRepository.deleteExpiredSessions(now);

    // 2. 検証/リセットトークンの掃除
    await this.userRepository.cleanExpiredTokens();

    // 3. 保持期間超過の監査ログ
    const oldAuthLogs = await this.userRepository.deleteAuthLogsOlderThan(
      new Date(now.getTime() - AUTH_LOG_RETENTION_MS)
    );

    return { expiredSessions, oldAuthLogs, processedDeletions: 0 };
  }
}
