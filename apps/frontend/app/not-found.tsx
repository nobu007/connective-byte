'use client';

import { useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { useTrackEvent } from '@/lib/analytics/useTrackEvent';

export default function NotFound() {
  const trackEvent = useTrackEvent();

  useEffect(() => {
    trackEvent('404 Page', { page: window.location.pathname });
  }, [trackEvent]);

  return (
    <main className="pt-24 pb-16">
      <Container>
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-[#111827] mb-4">404</h1>
          <h2 className="text-3xl font-bold text-[#111827] mb-6">ページが見つかりません</h2>
          <p className="text-lg text-[#4b5563] mb-8 leading-relaxed">
            お探しのページは存在しないか、移動した可能性があります。
          </p>
          <Button href="/" size="lg">
            ホームに戻る
          </Button>
        </div>
      </Container>
    </main>
  );
}
