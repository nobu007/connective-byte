'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';

interface PlausibleConfig {
  domain: string;
  apiHost?: string;
  trackLocalhost?: boolean;
  enabled: boolean;
}

interface PlausibleContextValue {
  trackEvent: (eventName: string, props?: Record<string, string | number>) => void;
  trackPageView: (url?: string) => void;
}

const PlausibleContext = createContext<PlausibleContextValue | null>(null);

// Extend Window interface to include plausible
declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string | number>; u?: string }) => void;
  }
}

export function PlausibleProvider({ children, config }: { children: ReactNode; config: PlausibleConfig }) {
  useEffect(() => {
    if (!config.enabled) return;

    // Load Plausible script
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = config.domain;
    script.src = `${config.apiHost || 'https://plausible.io'}/js/script.js`;

    // Handle script load errors gracefully
    script.onerror = () => {
      console.warn('Plausible Analytics: Failed to load script');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [config]);

  const trackEvent = (eventName: string, props?: Record<string, string | number>) => {
    if (!config.enabled) return;

    try {
      if (typeof window !== 'undefined' && window.plausible) {
        window.plausible(eventName, { props });
      }
    } catch (error) {
      // Silently fail - analytics should never break the app
      console.warn('Plausible Analytics: Failed to track event', error);
    }
  };

  const trackPageView = (url?: string) => {
    if (!config.enabled) return;

    try {
      if (typeof window !== 'undefined' && window.plausible) {
        window.plausible('pageview', { u: url });
      }
    } catch (error) {
      console.warn('Plausible Analytics: Failed to track page view', error);
    }
  };

  return <PlausibleContext.Provider value={{ trackEvent, trackPageView }}>{children}</PlausibleContext.Provider>;
}

export function usePlausible() {
  const context = useContext(PlausibleContext);
  if (!context) {
    throw new Error('usePlausible must be used within PlausibleProvider');
  }
  return context;
}
