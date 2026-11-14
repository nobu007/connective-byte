/**
 * Maintenance Service
 * Cron Trigger（apps/backend/wrangler.toml の [triggers] crons）から日次実行される
 * 整理処理。worker.ts の scheduled ハンドラ経由で呼ばれる。
 */

import { UserRepository } from '../interfaces/user-repository';
import { EmailService } from '../interfaces/email-service';

export interface MaintenanceResult {
  /** 期限切れセッションの削除件数 */
  expiredSessions: number;
  /** 保持期間（90日）超過の監査ログ削除件数 */
  oldAuthLogs: number;
  /** 期限到達したアカウント削除の処理件数 */
  processedDeletions: number;
}

/** 監査ログの保持期間（requirements.md: 90日） */
export const AUTH_LOG_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export class MaintenanceService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
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

    // 4. 期限到達したアカウント削除の実行（匿名化）
    const processedDeletions = await this.processDueDeletions(now);

    return { expiredSessions, oldAuthLogs, processedDeletions };
  }

  /**
   * 削除予約日を過ぎたユーザーを匿名化する。
   * 完了メールは匿名化前（email が無効値になる前）に送る。
   * メール送信失敗が匿名化を妨げないよう、送信は best-effort。
   */
  private async processDueDeletions(now: Date): Promise<number> {
    const users = await this.userRepository.findUsersDueForDeletion(now);
    let processed = 0;

    for (const user of users) {
      try {
        try {
          await this.emailService.sendAccountDeletionCompletedNotification(user.email);
        } catch (err) {
          console.error(`[MAINTENANCE] deletion completion email failed for ${user.id}`, err);
        }

        await this.userRepository.markUserDeletedAndAnonymize(user.id);
        await this.userRepository.revokeAllSessionsForUser(user.id);
        await this.userRepository.unlinkAllOAuthAccountsForUser(user.id);
        await this.userRepository.recordAuthLog({
          eventType: 'account_deleted',
          userId: user.id,
          email: user.email,
          success: true,
        });
        processed += 1;
      } catch (err) {
        // 1ユーザーの失敗が他ユーザーの処理を止めない
        console.error(`[MAINTENANCE] account deletion failed for ${user.id}`, err);
      }
    }

    return processed;
  }
}
