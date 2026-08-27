/**
 * Auth モジュールの DI コンテナ
 *
 * 実装の選択（Postgres+Resend / Json+Console）をここに集約し、
 * HTTP controller と Workers の scheduled ハンドラで同一の wiring を共有する。
 * （旧: auth.controller.ts のモジュールロード時分岐）
 */

import { UserRepository } from './interfaces/user-repository';
import { EmailService } from './interfaces/email-service';
import { JsonUserRepository } from './implementations/json-user-repository';
import { PostgresUserRepository } from './implementations/postgres-user-repository';
import { ConsoleEmailService } from './services/console-email-service';
import { ResendEmailService } from './services/resend-email-service';
import { AuthService } from './services/auth-service';
import { MaintenanceService } from './services/maintenance-service';

export interface AuthContainer {
  userRepository: UserRepository;
  emailService: EmailService;
  authService: AuthService;
  /** Cron Trigger（scheduled）から日次実行 */
  maintenanceService: MaintenanceService;
}

export function buildAuthContainer(): AuthContainer {
  // 本番（DATABASE_URL = Neon Postgres 設定時）は Postgres + Resend、
  // 未設定（ローカル開発・テスト）は Json + Console を使用
  const usePostgres = Boolean(process.env.DATABASE_URL);
  const userRepository: UserRepository = usePostgres
    ? new PostgresUserRepository()
    : new JsonUserRepository();
  const emailService: EmailService = usePostgres
    ? new ResendEmailService()
    : new ConsoleEmailService();

  return {
    userRepository,
    emailService,
    authService: new AuthService(userRepository, emailService),
    maintenanceService: new MaintenanceService(userRepository),
  };
}

/** アプリ全体で共有するシングルトン（モジュールロード時に1回だけ構築） */
export const authContainer = buildAuthContainer();
