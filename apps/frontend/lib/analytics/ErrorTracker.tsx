'use client';

import { useEffect, useRef } from 'react';
import { useTrackEvent } from './useTrackEvent';

export function ErrorTracker() {
  const trackEvent = useTrackEvent();
  const errorCount = useRef(0);
  const MAX_ERRORS_PER_SESSION = 10;

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (errorCount.current >= MAX_ERRORS_PER_SESSION) return;

      // Ignore third-party script errors
      if (event.filename && !event.filename.includes(window.location.hostname)) {
        return;
      }

      errorCount.current++;

      trackEvent('Error', {
        error: event.message,
        page: window.location.pathname,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (errorCount.current >= MAX_ERRORS_PER_SESSION) return;

      errorCount.current++;

      trackEvent('Error', {
        error: `Unhandled Promise Rejection: ${event.reason}`,
        page: window.location.pathname,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackEvent]);

  return null;
}
