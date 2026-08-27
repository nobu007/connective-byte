'use client';

/**
 * 認証ガード（静的エクスポートのためクライアント側でガイド）
 *
 * loading → スピナー、未認証 → /login/?next=<path> へリダイレクト。
 */

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login/?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="pt-24 pb-16 flex justify-center" role="status" aria-label="読み込み中">
        <Loader2 size={40} className="text-[#1e3a8a] animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}
