'use client';

import { useCallback } from 'react';
import { usePlausible } from './PlausibleProvider';

export type EventName =
  | 'Contact Form Submission'
  | 'CTA Click'
  | 'Newsletter Signup Click'
  | 'Value Props Viewed'
  | 'Social Proof Viewed'
  | 'Value Card Click'
  | 'Outbound Link Click'
  | 'File Download'
  | 'Social Link Click'
  | 'Email Link Click'
  | 'Privacy Policy Click'
  | 'Error'
  | '404 Page'
  | 'Web Vitals';

export interface EventProperties {
  location?: string;
  card?: string;
  url?: string;
  filename?: string;
  platform?: string;
  error?: string;
  page?: string;
  metric?: string;
  value?: number;
  [key: string]: string | number | undefined;
}

export function useTrackEvent() {
  const { trackEvent } = usePlausible();

  const track = useCallback(
    (eventName: EventName, properties?: EventProperties) => {
      // Filter out undefined values
      const cleanProps = properties
        ? Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined))
        : undefined;

      trackEvent(eventName, cleanProps as Record<string, string | number>);
    },
    [trackEvent],
  );

  return track;
}
