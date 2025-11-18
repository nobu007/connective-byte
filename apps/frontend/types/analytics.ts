export interface PageViewEvent {
  type: 'pageview';
  url: string;
  referrer: string;
  timestamp: number;
  userAgent: string;
}

export interface CustomEvent {
  type: 'event';
  name: string;
  url: string;
  timestamp: number;
  properties?: Record<string, string | number>;
}

export interface ConversionGoal {
  name: string;
  eventName: string;
  value?: number;
}

export interface AnalyticsMetrics {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  topPages: Array<{ url: string; views: number }>;
  topReferrers: Array<{ source: string; visits: number }>;
  goals: Array<{ name: string; completions: number; conversionRate: number }>;
}
