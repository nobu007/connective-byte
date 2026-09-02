'use client';

/**
 * マイページ: 受講登録 / プロフィール / セキュリティ / セッション / アカウント
 *
 * ?purchase=success（Stripe Payment Link からのリターン）では Webhook 付与の
 * 反映を PurchaseStatusCard がポーリングする。useSearchParams 使用のため
 * <Suspense> 内にコンテンツを置く（静的exportのビルド要件）。
 */

import React, { Suspense, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { authApi } from '@/lib/api/auth-api';
import { ProfileForm } from '@/components/mypage/ProfileForm';
import { PasswordChangeForm } from '@/components/mypage/PasswordChangeForm';
import { SessionList } from '@/components/mypage/SessionList';
import { AccountDeletion } from '@/components/mypage/AccountDeletion';
import { PurchaseStatusCard } from '@/components/mypage/PurchaseStatusCard';

type Tab = 'profile' | 'security' | 'sessions' | 'account';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'profile', label: 'プロフィール' },
  { key: 'security', label: 'セキュリティ' },
  { key: 'sessions', label: 'セッション' },
  { key: 'account', label: 'アカウント' },
];

function MyPageContent() {
  const { user, setUser, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('profile');
  const [bannerError, setBannerError] = useState('');
  const [bannerBusy, setBannerBusy] = useState(false);
  // 決済リターン直後のみポーリング（通常時は1回の取得で十分）
  const pollPurchase = searchParams.get('purchase') === 'success';

  if (!user) {
    return (
      <div className="pt-24 pb-16 flex justify-center" role="status" aria-label="読み込み中">
        <Loader2 size={40} className="text-[#1e3a8a] animate-spin" />
      </div>
    );
  }

  const handleCancelDeletion = async () => {
    try {
      setBannerBusy(true);
      setBannerError('');
      await authApi.cancelAccountDeletion();
      await refreshUser();
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : '取消に失敗しました。');
    } finally {
      setBannerBusy(false);
    }
  };

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">マイページ</h1>
          <p className="text-gray-600">{user.email}</p>
          {!user.isVerified && (
            <p className="mt-2 text-sm text-[#b45309]">
              メールアドレスが未確認です。送信された確認メールのリンクを開いてください。
            </p>
          )}
        </div>

        {user.deletionScheduledAt && (
          <div className="mb-8 p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg flex items-start justify-between gap-4">
            <p className="flex items-start text-sm text-gray-800">
              <AlertTriangle size={18} className="text-[#f59e0b] mr-2 flex-shrink-0 mt-0.5" />
              アカウント削除が予約されています（
              {new Date(user.deletionScheduledAt).toLocaleDateString('ja-JP')} に削除）。
              「アカウント」タブまたは下のボタンから取り消せます。
            </p>
            <button
              onClick={() => void handleCancelDeletion()}
              disabled={bannerBusy}
              className="flex-shrink-0 text-sm font-medium text-[#1e3a8a] hover:underline disabled:opacity-50"
            >
              {bannerBusy ? '処理中…' : '取消'}
            </button>
          </div>
        )}
        {bannerError && <p className="mb-4 text-sm text-[#ef4444]">{bannerError}</p>}

        <PurchaseStatusCard user={user} onPurchased={refreshUser} poll={pollPurchase} />

        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto" role="tablist" aria-label="マイページ">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === key ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'profile' && <ProfileForm user={user} onUpdated={setUser} />}
        {tab === 'security' && <PasswordChangeForm />}
        {tab === 'sessions' && <SessionList />}
        {tab === 'account' && (
          <AccountDeletion deletionScheduledAt={user.deletionScheduledAt} onChanged={refreshUser} />
        )}
      </div>
    </main>
  );
}

export default function MyPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="pt-24 pb-16 flex justify-center" role="status" aria-label="読み込み中">
            <Loader2 size={40} className="text-[#1e3a8a] animate-spin" />
          </div>
        }
      >
        <MyPageContent />
      </Suspense>
    </RequireAuth>
  );
}
