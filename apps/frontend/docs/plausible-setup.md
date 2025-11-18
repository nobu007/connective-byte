# Plausible Analytics Setup Guide

This guide explains how to configure Plausible Analytics for the ConnectiveByte website.

## Prerequisites

1. Sign up for a Plausible Analytics account at [plausible.io](https://plausible.io)
2. Add your domain (e.g., `connectivebyte.com`) to your Plausible account

## Environment Variables

Add the following environment variables to your deployment platform (e.g., Netlify):

```bash
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=connectivebyte.com
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io
```

For local development, these are already configured in `.env.local`.

## Dashboard Configuration

### Goals to Configure

Navigate to your site settings in Plausible and add the following custom event goals:

#### Conversion Goals

1. **Contact Form Submission**
   - Event name: `Contact Form Submission`
   - Type: Custom event
   - Description: Tracks successful contact form submissions
   - Priority: High

2. **Newsletter Signup Click**
   - Event name: `Newsletter Signup Click`
   - Type: Custom event
   - Description: Tracks newsletter signup button clicks (for future use)
   - Priority: Medium

#### Engagement Goals

3. **CTA Click**
   - Event name: `CTA Click`
   - Type: Custom event
   - Description: Tracks call-to-action button clicks
   - Properties: `location` (hero, final-cta)
   - Priority: High

4. **Value Props Viewed**
   - Event name: `Value Props Viewed`
   - Type: Custom event
   - Description: Tracks when users scroll to view value propositions section
   - Priority: Medium

5. **Social Proof Viewed**
   - Event name: `Social Proof Viewed`
   - Type: Custom event
   - Description: Tracks when users scroll to view social proof section
   - Priority: Medium

6. **Value Card Click**
   - Event name: `Value Card Click`
   - Type: Custom event
   - Description: Tracks clicks on individual value proposition cards
   - Properties: `card` (Connect, Active, Collective)
   - Priority: Medium

#### Link Tracking Goals

7. **Outbound Link Click**
   - Event name: `Outbound Link Click`
   - Type: Custom event
   - Description: Tracks clicks on external links
   - Properties: `url`
   - Priority: Low

8. **Social Link Click**
   - Event name: `Social Link Click`
   - Type: Custom event
   - Description: Tracks clicks on social media links
   - Properties: `platform` (twitter, threads, facebook, linkedin, instagram)
   - Priority: Medium

9. **Email Link Click**
   - Event name: `Email Link Click`
   - Type: Custom event
   - Description: Tracks clicks on mailto links
   - Priority: Low

10. **Privacy Policy Click**
    - Event name: `Privacy Policy Click`
    - Type: Custom event
    - Description: Tracks clicks on privacy policy link
    - Priority: Low

11. **File Download**
    - Event name: `File Download`
    - Type: Custom event
    - Description: Tracks file downloads
    - Properties: `filename`
    - Priority: Low

#### Error Tracking Goals

12. **Error**
    - Event name: `Error`
    - Type: Custom event
    - Description: Tracks JavaScript errors
    - Properties: `error`, `page`
    - Priority: High

13. **404 Page**
    - Event name: `404 Page`
    - Type: Custom event
    - Description: Tracks 404 page views
    - Properties: `page`
    - Priority: Medium

#### Performance Tracking Goals

14. **Web Vitals**
    - Event name: `Web Vitals`
    - Type: Custom event
    - Description: Tracks Core Web Vitals and performance metrics
    - Properties: `metric` (CLS, LCP, INP, FCP, TTFB), `value`, `page`
    - Priority: High

### Custom Properties

Plausible will automatically detect and track the following custom properties:

- `location`: Location of CTA button (hero, final-cta)
- `card`: Value proposition card name (Connect, Active, Collective)
- `url`: Destination URL for outbound links
- `filename`: Name of downloaded file
- `platform`: Social media platform name
- `error`: Error message
- `page`: Page URL where event occurred
- `metric`: Web Vitals metric name (CLS, LCP, INP, FCP, TTFB)
- `value`: Numeric value for metrics

## Verification

After deploying with the environment variables configured:

1. Visit your website
2. Perform various actions (click CTAs, scroll, submit form, etc.)
3. Check your Plausible dashboard (data appears within 5 minutes)
4. Verify that events are being tracked correctly

## Conversion Funnel

You can create a conversion funnel in Plausible to track the user journey:

1. Page View (Homepage)
2. Value Props Viewed
3. CTA Click
4. Page View (Contact)
5. Contact Form Submission

## Privacy Compliance

Plausible Analytics is privacy-friendly by default:

- No cookies used
- No personal data collected
- GDPR, CCPA, and PECR compliant
- No consent banner required
- IP addresses are hashed before storage
- Data stored in EU (if using EU instance)

## Troubleshooting

### Events not appearing in dashboard

1. Check that environment variables are set correctly
2. Verify that the Plausible script is loading (check browser DevTools Network tab)
3. Check browser console for any errors
4. Ensure ad blockers are not blocking Plausible

### Script blocked by ad blocker

This is expected behavior. Analytics should gracefully degrade when blocked. The website will continue to function normally.

### Testing locally

Set `NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST=true` in `.env.local` to enable tracking in development mode. Note that this will send test data to your production Plausible account.

## Additional Resources

- [Plausible Documentation](https://plausible.io/docs)
- [Custom Events Guide](https://plausible.io/docs/custom-event-goals)
- [Custom Properties Guide](https://plausible.io/docs/custom-props/introduction)
- [Plausible API Documentation](https://plausible.io/docs/stats-api)
