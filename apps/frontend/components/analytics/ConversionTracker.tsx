'use client';

import { useEffect } from 'react';
import { useTrackEvent } from '@/lib/analytics/useTrackEvent';

interface ConversionTrackerProps {
  event: 'Contact Form Submission' | 'Newsletter Signup Click';
  properties?: Record<string, string | number>;
}

export function ConversionTracker({ event, properties }: ConversionTrackerProps) {
  const trackEvent = useTrackEvent();

  useEffect(() => {
    trackEvent(event, properties);
  }, [event, properties, trackEvent]);

  return null;
}
