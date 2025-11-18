'use client';

import { useEffect } from 'react';
import { useTrackEvent } from './useTrackEvent';

export function useOutboundLinkTracking() {
  const trackEvent = useTrackEvent();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (!link || !link.href) return;

      try {
        const url = new URL(link.href, window.location.href);
        const isOutbound = url.hostname !== window.location.hostname;
        const isDownload = link.hasAttribute('download');
        const isSocial = ['twitter.com', 'threads.net', 'facebook.com', 'linkedin.com', 'instagram.com'].some(
          (domain) => url.hostname.includes(domain),
        );
        const isEmail = link.href.startsWith('mailto:');

        if (isDownload) {
          trackEvent('File Download', {
            filename: link.getAttribute('download') || url.pathname.split('/').pop() || 'unknown',
          });
        } else if (isEmail) {
          trackEvent('Email Link Click');
        } else if (isSocial) {
          const platform = url.hostname.replace('www.', '').split('.')[0];
          trackEvent('Social Link Click', { platform });
        } else if (isOutbound) {
          trackEvent('Outbound Link Click', { url: url.href });
        } else if (link.href.includes('/privacy')) {
          trackEvent('Privacy Policy Click');
        }
      } catch (error) {
        // Invalid URL, ignore
        console.warn('Invalid URL for tracking:', link.href);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [trackEvent]);
}
