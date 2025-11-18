'use client';

import { useEffect } from 'react';
import { useTrackEvent } from './useTrackEvent';

export function useWebVitals() {
  const trackEvent = useTrackEvent();

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('web-vitals').then(({ onCLS, onLCP, onINP, onFCP, onTTFB }) => {
      // Core Web Vitals
      onCLS((metric) => {
        trackEvent('Web Vitals', {
          metric: 'CLS',
          value: Math.round(metric.value * 1000) / 1000,
          page: window.location.pathname,
        });
      });

      onLCP((metric) => {
        trackEvent('Web Vitals', {
          metric: 'LCP',
          value: Math.round(metric.value),
          page: window.location.pathname,
        });
      });

      // INP replaces FID as the recommended interaction metric
      onINP((metric) => {
        trackEvent('Web Vitals', {
          metric: 'INP',
          value: Math.round(metric.value),
          page: window.location.pathname,
        });
      });

      // Additional metrics for comprehensive monitoring
      onFCP((metric) => {
        trackEvent('Web Vitals', {
          metric: 'FCP',
          value: Math.round(metric.value),
          page: window.location.pathname,
        });
      });

      onTTFB((metric) => {
        trackEvent('Web Vitals', {
          metric: 'TTFB',
          value: Math.round(metric.value),
          page: window.location.pathname,
        });
      });
    });
  }, [trackEvent]);
}
