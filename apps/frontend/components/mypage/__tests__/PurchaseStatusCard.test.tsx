/**
 * PurchaseStatusCard のテスト
 *
 * - 未登録: Stripe Payment Link CTA（環境変数未設定なら CTA を伏せる）
 * - 登録済み: 付与日 + Weeks 2-12 閲覧案内
 * - poll=true: getStatus をポーリングし、反映されたら onPurchased（1回だけ）
 */

import React from 'react';
import { screen, act } from '@testing-library/react';
import { render } from '../../../test/test-utils';
import { rest } from 'msw';
import { server } from '../../../mocks/server';
import { PurchaseStatusCard } from '../PurchaseStatusCard';
import { paymentsApi, buildPaymentLink, type PaymentStatus } from '@/lib/api/payments-api';
import type { AuthUser } from '@/lib/api/auth-api';

const user: AuthUser = {
  id: 'user-1',
  email: 'learner@example.com',
  fullName: 'Learner',
  role: 'learner',
  isVerified: true,
  purchasedAt: null,
  bio: null,
  timezone: 'UTC',
  githubUsername: null,
  deletionScheduledAt: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const unpurchased: PaymentStatus = { purchased: false, purchasedAt: null, purchase: null };
const purchased: PaymentStatus = {
  purchased: true,
  purchasedAt: '2026-08-30T00:00:00Z',
  purchase: { grantedAt: '2026-08-30T00:00:00Z', amountTotal: 29800, currency: 'jpy' },
};

function mockStatus(body: PaymentStatus) {
  server.use(
    rest.get('**/api/payments/status', (_req, res, ctx) =>
      res(ctx.status(200), ctx.json({ success: true, data: body })),
    ),
  );
}

describe('buildPaymentLink', () => {
  it('未設定なら null（壊れた導線を出さない）', () => {
    const prev = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    expect(buildPaymentLink('user-1', 'learner@example.com')).toBeNull();
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = prev;
  });
});

describe('PurchaseStatusCard', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_link';
  });

  it('未登録: Payment Link CTA（client_reference_id / prefilled_email 付き・新規タブ）', async () => {
    mockStatus(unpurchased);
    render(<PurchaseStatusCard user={user} onPurchased={jest.fn()} />);

    expect(await screen.findByText('12週間カリキュラムの受講登録')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: '受講登録する' });
    expect(cta).toHaveAttribute(
      'href',
      'https://buy.stripe.com/test_link?client_reference_id=user-1&prefilled_email=learner%40example.com',
    );
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('未登録 & リンク未設定: CTA を伏せて「準備中」', async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    mockStatus(unpurchased);

    render(<PurchaseStatusCard user={user} onPurchased={jest.fn()} />);
    await screen.findByText('12週間カリキュラムの受講登録');

    expect(screen.getByText('受講登録は準備中です')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '受講登録する' })).not.toBeInTheDocument();
  });

  it('登録済み: 付与日と Weeks 2-12 の閲覧案内（CTA なし）', async () => {
    mockStatus(purchased);

    render(<PurchaseStatusCard user={user} onPurchased={jest.fn()} />);

    expect(await screen.findByText('受講登録済み（29,800円（税込））')).toBeInTheDocument();
    expect(screen.getByText(/Weeks 2-12 の全セッションが閲覧できます/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /カリキュラムへ進む/ })).toHaveAttribute('href', '/learning');
    expect(screen.queryByRole('link', { name: '受講登録する' })).not.toBeInTheDocument();
  });

  describe('poll（決済リターン直後の反映待ち）', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('初回取得で既に purchased なら待たずに onPurchased（スピナーを出さない）', async () => {
      // Webhook がポーリング開始前に間に合った場合
      const spy = jest.spyOn(paymentsApi, 'getStatus').mockResolvedValue(purchased);
      const onPurchased = jest.fn();

      render(<PurchaseStatusCard user={user} onPurchased={onPurchased} poll />);

      await act(async () => {
        await Promise.resolve();
      });
      expect(onPurchased).toHaveBeenCalledTimes(1);
      expect(screen.getByText('受講登録済み（29,800円（税込））')).toBeInTheDocument();
      expect(screen.queryByText('決済の反映を確認しています…')).not.toBeInTheDocument();

      // ポーリングは始まっていないため、時間が経っても onPurchased は重複しない
      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });
      expect(onPurchased).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('ポーリング中はスピナー+CTAなし → 反映されたら onPurchased（1回）→ 登録済みビュー', async () => {
      // 初回と1回目のポーリングは未購入、2回目で Webhook 付与が反映される
      const statuses = [unpurchased, unpurchased, purchased];
      let call = 0;
      const spy = jest
        .spyOn(paymentsApi, 'getStatus')
        .mockImplementation(async () => statuses[Math.min(call++, statuses.length - 1)]);
      const onPurchased = jest.fn();

      render(<PurchaseStatusCard user={user} onPurchased={onPurchased} poll />);

      // 初回取得（未購入）: 反映待ちスピナーで CTA は出さない
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByText('決済の反映を確認しています…')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: '受講登録する' })).not.toBeInTheDocument();

      // 1回目のポーリング（3秒後）: まだ未購入
      await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });
      expect(onPurchased).not.toHaveBeenCalled();

      // 2回目のポーリング: purchased=true → onPurchased で登録済みビューへ
      await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });
      expect(onPurchased).toHaveBeenCalledTimes(1);
      expect(screen.getByText('受講登録済み（29,800円（税込））')).toBeInTheDocument();
      expect(screen.queryByText('決済の反映を確認しています…')).not.toBeInTheDocument();

      // ポーリング終了後は onPurchased が重複呼び出されない
      await act(async () => {
        jest.advanceTimersByTime(6000);
        await Promise.resolve();
      });
      expect(onPurchased).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });
});
