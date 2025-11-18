'use client';

import { useEffect, useRef } from 'react';
import { useTrackEvent } from './useTrackEvent';

interface ScrollTrackingOptions {
  eventName: 'Value Props Viewed' | 'Social Proof Viewed';
  threshold?: number; // Percentage of element visible (0-1)
  once?: boolean; // Track only once
}

export function useScrollTracking(options: ScrollTrackingOptions) {
  const { eventName, threshold = 0.5, once = true } = options;
  const trackEvent = useTrackEvent();
  const hasTracked = useRef(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            if (!once || !hasTracked.current) {
              trackEvent(eventName);
              hasTracked.current = true;

              if (once) {
                observer.disconnect();
              }
            }
          }
        });
      },
      { threshold },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [eventName, threshold, once, trackEvent]);

  return elementRef;
}
