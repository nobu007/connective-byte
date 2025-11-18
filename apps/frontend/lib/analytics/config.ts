export interface AnalyticsConfig {
  plausible: {
    domain: string;
    apiHost: string;
    enabled: boolean;
    trackLocalhost: boolean;
  };
}

export function getAnalyticsConfig(): AnalyticsConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || '';
  const apiHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || 'https://plausible.io';

  // Enable analytics in production if domain is configured
  const enabled = isProduction && !!domain;

  // Warn if not configured
  if (isProduction && !domain) {
    console.warn('Plausible Analytics: NEXT_PUBLIC_PLAUSIBLE_DOMAIN not configured');
  }

  return {
    plausible: {
      domain,
      apiHost,
      enabled,
      trackLocalhost: process.env.NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST === 'true',
    },
  };
}

export function validateAnalyticsConfig(config: AnalyticsConfig): boolean {
  if (!config.plausible.enabled) return true;

  if (!config.plausible.domain) {
    console.error('Analytics validation failed: domain is required');
    return false;
  }

  return true;
}
