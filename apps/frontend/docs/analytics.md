# Analytics Developer Documentation

This document provides guidance for developers working with the analytics system in the ConnectiveByte website.

## Overview

The ConnectiveByte website uses Plausible Analytics, a privacy-friendly analytics solution that tracks user behavior without cookies or personal data collection. The implementation is built with React hooks and context providers for easy integration throughout the application.

## Architecture

### Core Components

1. **PlausibleProvider** (`lib/analytics/PlausibleProvider.tsx`)
   - Context provider that loads the Plausible script
   - Provides `trackEvent` and `trackPageView` functions
   - Handles script loading errors gracefully

2. **useTrackEvent** (`lib/analytics/useTrackEvent.ts`)
   - Hook for tracking custom events
   - Type-safe event names and properties
   - Automatically filters undefined values

3. **useScrollTracking** (`lib/analytics/useScrollTracking.ts`)
   - Hook for tracking scroll-based engagement
   - Uses IntersectionObserver for efficient tracking
   - Configurable threshold and one-time tracking

4. **useOutboundLinkTracking** (`lib/analytics/useOutboundLinkTracking.ts`)
   - Global click handler for link tracking
   - Automatically categorizes links (outbound, social, email, download)
   - No manual tracking code needed for links

5. **useWebVitals** (`lib/analytics/useWebVitals.ts`)
   - Tracks Core Web Vitals (CLS, LCP, INP)
   - Additional metrics (FCP, TTFB)
   - Dynamic import to avoid SSR issues

6. **ErrorTracker** (`lib/analytics/ErrorTracker.tsx`)
   - Automatic error tracking
   - Rate limiting (max 10 errors per session)
   - Filters third-party script errors

7. **ConversionTracker** (`components/analytics/ConversionTracker.tsx`)
   - Declarative conversion tracking
   - Renders null, only tracks event

## Configuration

### Environment Variables

```bash
# Required for production
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=connectivebyte.com

# Optional (defaults to https://plausible.io)
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io

# Development only (enables tracking on localhost)
NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST=true
```

### Analytics Config

The analytics configuration is managed in `lib/analytics/config.ts`:

```typescript
export function getAnalyticsConfig(): AnalyticsConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || '';

  // Analytics is automatically disabled if:
  // - Not in production mode
  // - Domain is not configured
  const enabled = isProduction && !!domain;

  return {
    plausible: {
      domain,
      apiHost: process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || 'https://plausible.io',
      enabled,
      trackLocalhost: process.env.NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST === 'true',
    },
  };
}
```

## How to Track Custom Events

### Basic Event Tracking

```typescript
'use client';

import { useTrackEvent } from '@/lib/analytics/useTrackEvent';

export function MyComponent() {
  const trackEvent = useTrackEvent();

  const handleClick = () => {
    trackEvent('CTA Click', { location: 'hero' });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Available Event Names

The following event names are predefined and type-safe:

- `'Contact Form Submission'` - Successful form submissions
- `'CTA Click'` - Call-to-action button clicks
- `'Newsletter Signup Click'` - Newsletter signup interactions
- `'Value Props Viewed'` - Value propositions section viewed
- `'Social Proof Viewed'` - Social proof section viewed
- `'Value Card Click'` - Individual value card clicks
- `'Outbound Link Click'` - External link clicks
- `'File Download'` - File download initiations
- `'Social Link Click'` - Social media link clicks
- `'Email Link Click'` - Mailto link clicks
- `'Privacy Policy Click'` - Privacy policy link clicks
- `'Error'` - JavaScript errors
- `'404 Page'` - 404 page views
- `'Web Vitals'` - Performance metrics

### Event Properties

Common properties you can attach to events:

```typescript
interface EventProperties {
  location?: string; // Button/CTA location (e.g., 'hero', 'final-cta')
  card?: string; // Value card name (e.g., 'Connect', 'Active')
  url?: string; // Destination URL for outbound links
  filename?: string; // Downloaded file name
  platform?: string; // Social media platform
  error?: string; // Error message
  page?: string; // Page URL where event occurred
  metric?: string; // Web Vitals metric name
  value?: number; // Numeric value for metrics
}
```

### Scroll Tracking

Track when users scroll to view specific sections:

```typescript
'use client';

import { useScrollTracking } from '@/lib/analytics/useScrollTracking';

export function MySection() {
  const sectionRef = useScrollTracking({
    eventName: 'Value Props Viewed',
    threshold: 0.5,  // 50% of element must be visible
    once: true       // Track only once per session
  });

  return (
    <section ref={sectionRef}>
      {/* Section content */}
    </section>
  );
}
```

### Conversion Tracking

Track conversions declaratively:

```typescript
'use client';

import { useState } from 'react';
import { ConversionTracker } from '@/components/analytics/ConversionTracker';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data) => {
    // Submit form...
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <ConversionTracker event="Contact Form Submission" />
        <div>Thank you for your submission!</div>
      </>
    );
  }

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

### Automatic Tracking

Some events are tracked automatically:

1. **Page Views** - Tracked automatically by Plausible script
2. **Outbound Links** - Tracked by `useOutboundLinkTracking` hook
3. **Errors** - Tracked by `ErrorTracker` component
4. **Web Vitals** - Tracked by `useWebVitals` hook
5. **404 Pages** - Tracked in `app/not-found.tsx`

## Testing Analytics Locally

### Enable Local Tracking

Set the environment variable in `.env.local`:

```bash
NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST=true
```

**Warning**: This will send test data to your production Plausible account.

### Verify Events in Browser Console

The analytics system logs warnings to the console when:

- Script fails to load
- Event tracking fails
- Configuration is missing

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "plausible"
4. Perform actions that should trigger events
5. Verify POST requests to `/api/event`

### Disable Analytics in Development

Analytics is automatically disabled in development mode unless `NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST=true` is set.

## Troubleshooting

### Events Not Appearing in Dashboard

**Possible causes:**

1. **Environment variables not set**
   - Check that `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is configured
   - Verify in browser console: `console.log(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN)`

2. **Script blocked by ad blocker**
   - This is expected behavior
   - Analytics should gracefully degrade
   - Test with ad blocker disabled

3. **Script failed to load**
   - Check browser console for errors
   - Verify Plausible API host is accessible
   - Check network tab for failed requests

4. **Wrong domain configured**
   - Ensure domain matches exactly (no protocol, no trailing slash)
   - Example: `connectivebyte.com` not `https://connectivebyte.com/`

### TypeScript Errors

If you get TypeScript errors when using analytics hooks:

1. **"Cannot find module" error**

   ```bash
   npm run type-check
   ```

2. **"Property does not exist" error**
   - Check that you're using predefined event names
   - Verify event properties match the `EventProperties` interface

### Performance Issues

If analytics is impacting performance:

1. **Check script size**
   - Plausible script should be <1KB
   - Verify in Network tab

2. **Check event frequency**
   - Ensure scroll tracking uses `once: true`
   - Verify error tracking rate limiting is working

3. **Check Web Vitals impact**
   - Web Vitals tracking uses dynamic import
   - Should not block initial page load

## Best Practices

### 1. Use Type-Safe Event Names

Always use the predefined event names from `useTrackEvent`:

```typescript
// ✅ Good
trackEvent('CTA Click', { location: 'hero' });

// ❌ Bad (not type-safe)
trackEvent('cta-click', { location: 'hero' });
```

### 2. Provide Meaningful Properties

Include context that helps understand user behavior:

```typescript
// ✅ Good
trackEvent('CTA Click', { location: 'hero' });

// ❌ Bad (missing context)
trackEvent('CTA Click');
```

### 3. Track Conversions, Not Just Clicks

Focus on meaningful user actions:

```typescript
// ✅ Good - tracks successful submission
if (response.ok) {
  trackEvent('Contact Form Submission');
}

// ❌ Bad - tracks button click, not outcome
<button onClick={() => trackEvent('Submit Click')}>
```

### 4. Use Scroll Tracking Sparingly

Only track important sections:

```typescript
// ✅ Good - track key value propositions
useScrollTracking({ eventName: 'Value Props Viewed' });

// ❌ Bad - tracking every section
useScrollTracking({ eventName: 'Footer Viewed' });
```

### 5. Handle Errors Gracefully

Analytics should never break the app:

```typescript
// ✅ Good - errors are caught internally
trackEvent('CTA Click', { location: 'hero' });

// ❌ Bad - wrapping in try-catch is unnecessary
try {
  trackEvent('CTA Click', { location: 'hero' });
} catch (error) {
  // Analytics already handles errors
}
```

## Adding New Event Types

To add a new event type:

1. **Update the EventName type** in `lib/analytics/useTrackEvent.ts`:

```typescript
export type EventName =
  | 'Contact Form Submission'
  | 'CTA Click'
  // ... existing events
  | 'My New Event'; // Add your event
```

2. **Update EventProperties if needed**:

```typescript
export interface EventProperties {
  location?: string;
  // ... existing properties
  myNewProperty?: string; // Add your property
}
```

3. **Configure goal in Plausible dashboard**:
   - Go to Site Settings → Goals
   - Add custom event goal with your event name
   - Configure any custom properties

4. **Document the new event** in this file and in `docs/plausible-setup.md`

## Privacy Considerations

### What is Tracked

- Page views and navigation patterns
- Custom events (button clicks, form submissions, etc.)
- Referrer sources
- Device type and browser
- Geographic location (country level only)
- Performance metrics (Web Vitals)

### What is NOT Tracked

- Personal information (names, emails, etc.)
- IP addresses (hashed before storage)
- Cross-site behavior
- Individual user sessions
- Cookies or local storage

### GDPR/CCPA Compliance

Plausible Analytics is compliant by default:

- No cookies used
- No personal data collected
- No consent banner required
- Data stored in EU (if using EU instance)
- Users can request data deletion

## Additional Resources

- [Plausible Documentation](https://plausible.io/docs)
- [Custom Events Guide](https://plausible.io/docs/custom-event-goals)
- [Custom Properties Guide](https://plausible.io/docs/custom-props/introduction)
- [Web Vitals Documentation](https://web.dev/vitals/)
- [Plausible Setup Guide](./plausible-setup.md)

## Support

For questions or issues:

1. Check this documentation
2. Review [Plausible Setup Guide](./plausible-setup.md)
3. Check browser console for errors
4. Contact the development team
