/**
 * Payments モジュールの DI コンテナ
 *
 * learning / auth と同じ役割: 実装の選択（Postgres / Json）をここに集約する。
 *
 * 依存方向（循環なし）:
 * - payments → auth（ユーザー照会・purchasedAt ミラー更新のため userRepository を共有）
 * - learning → payments（ゲーティングのために paymentService を注入 — Phase 4 で接続）
 */

import { PurchaseRepository } from './interfaces/purchase-repository';
import { JsonPurchaseRepository } from './implementations/json-purchase-repository';
import { PostgresPurchaseRepository } from './implementations/postgres-purchase-repository';
import { PaymentService } from './services/payment-service';
import { authContainer } from '../auth/auth.container';

export interface PaymentsContainer {
  purchaseRepository: PurchaseRepository;
  paymentService: PaymentService;
}

export function buildPaymentsContainer(): PaymentsContainer {
  // 本番（DATABASE_URL = Neon Postgres 設定時）は Postgres、
  // 未設定（ローカル開発・テスト）は Json を使用
  const usePostgres = Boolean(process.env.DATABASE_URL);
  const purchaseRepository: PurchaseRepository = usePostgres
    ? new PostgresPurchaseRepository()
    : new JsonPurchaseRepository();

  return {
    purchaseRepository,
    paymentService: new PaymentService(purchaseRepository, authContainer.userRepository),
  };
}

/** アプリ全体で共有するシングルトン（モジュールロード時に1回だけ構築） */
export const paymentsContainer = buildPaymentsContainer();
