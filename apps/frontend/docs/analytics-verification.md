# Analytics Implementation Verification Guide

This document provides a checklist for verifying that the analytics implementation is working correctly.

## Pre-Deployment Verification

### 1. Environment Configuration

- [ ] `.env.local` contains `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- [ ] `.env.local` contains `NEXT_PUBLIC_PLAUSIBLE_API_HOST`
- [ ] `.env.local` contains `NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST=true` (for testing)
- [ ] `.env.example` is updated with analytics variables
- [ ] `netlify.toml` includes analytics environment variables

### 2. Code Integration

- [ ] `PlausibleProvider` is added to `app/layout.tsx`
- [ ] `ErrorTracker` is added to `app/layout.tsx`
- [ ] Homepage uses `useOutboundLinkTracking` hook
- [ ] Homepage uses `useWebVitals` hook
- [ ] Value Propositions section uses `useScrollTracking`
- [ ] Social Proof section uses `useScrollTracking`
- [ ] Hero CTA button tracks clicks
- [ ] Final CTA section button tracks clicks
- [ ] Contact form tracks successful submissions
- [ ] Value cards track clicks
- [ ] 404 page tracks views

### 3. Type Checking

```bash
npm run type-check -w apps/frontend
```

- [ ] No TypeScript errors
- [ ] All analytics imports resolve correctly

### 4. Build Verification

```bash
npm run build -w apps/frontend
```

- [ ] Build completes successfully
- [ ] No analytics-related warnings or errors
- [ ] Bundle size is reasonable (<200KB for initial JS)

## Local Testing

### 1. Start Development Server

```bash
npm run dev -w apps/frontend
```

### 2. Open Browser DevTools

- Open Chrome/Firefox DevTools (F12)
- Go to Console tab
- Go to Network tab

### 3. Test Page View Tracking

- [ ] Navigate to homepage
- [ ] Check Network tab for Plausible script load
- [ ] Verify script URL: `https://plausible.io/js/script.js`
- [ ] Check for POST request to `/api/event` (if tracking localhost)
- [ ] No errors in Console

### 4. Test CTA Click Tracking

- [ ] Click Hero CTA button
- [ ] Check Network tab for POST to `/api/event`
- [ ] Verify payload contains `"n":"CTA Click"`
- [ ] Verify payload contains `"props":{"location":"hero"}`
- [ ] Click Final CTA button
- [ ] Verify payload contains `"props":{"location":"final-cta"}`

### 5. Test Scroll Tracking

- [ ] Scroll to Value Propositions section
- [ ] Check Network tab for POST to `/api/event`
- [ ] Verify payload contains `"n":"Value Props Viewed"`
- [ ] Scroll to Social Proof section
- [ ] Verify payload contains `"n":"Social Proof Viewed"`
- [ ] Scroll back up and down - events should only fire once

### 6. Test Value Card Click Tracking

- [ ] Click on "Connect" value card
- [ ] Check Network tab for POST to `/api/event`
- [ ] Verify payload contains `"n":"Value Card Click"`
- [ ] Verify payload contains `"props":{"card":"Connect"}`
- [ ] Repeat for "Active" and "Collective" cards

### 7. Test Contact Form Tracking

- [ ] Navigate to `/contact`
- [ ] Fill out contact form with valid data
- [ ] Submit form
- [ ] Wait for success message
- [ ] Check Network tab for POST to `/api/event`
- [ ] Verify payload contains `"n":"Contact Form Submission"`

### 8. Test Outbound Link Tracking

- [ ] Click on social media links in footer
- [ ] Check Network tab for POST to `/api/event`
- [ ] Verify payload contains `"n":"Social Link Click"`
- [ ] Verify payload contains `"props":{"platform":"twitter"}` (or other platform)
- [ ] Click on privacy policy link
- [ ] Verify payload contains `"n":"Privacy Policy Click"`

### 9. Test Error Tracking

- [ ] Open Console
- [ ] Type: `throw new Error('Test error')`
- [ ] Press Enter
- [ ] Check Network tab for POST to `/api/event`
- [ ] Verify payload contains `"n":"Error"`
- [ ] Verify payload contains error message in props

### 10. Test 404 Page Tracking

- [ ] Navigate to `/nonexistent-page`
- [ ] Check Network tab for POST to `/api/event`
- [ ] Verify payload contains `"n":"404 Page"`
- [ ] Verify payload contains page path in props

### 11. Test Web Vitals Tracking

- [ ] Reload homepage
- [ ] Wait for page to fully load
- [ ] Check Network tab for multiple POST requests to `/api/event`
- [ ] Verify payloads contain `"n":"Web Vitals"`
- [ ] Verify payloads contain metrics: CLS, LCP, INP, FCP, TTFB
- [ ] Verify each metric has a numeric value

### 12. Test Ad Blocker Behavior

- [ ] Enable ad blocker (uBlock Origin, AdBlock Plus, etc.)
- [ ] Reload page
- [ ] Verify website still functions normally
- [ ] Check Console for warnings (expected)
- [ ] Verify no JavaScript errors
- [ ] Disable ad blocker

## Post-Deployment Verification

### 1. Plausible Dashboard Setup

- [ ] Sign up for Plausible account at [plausible.io](https://plausible.io)
- [ ] Add domain to Plausible (e.g., `connectivebyte.com`)
- [ ] Configure custom event goals (see `docs/plausible-setup.md`)
- [ ] Configure custom properties

### 2. Environment Variables in Netlify

- [ ] Go to Netlify Site Settings → Environment Variables
- [ ] Add `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=connectivebyte.com`
- [ ] Add `NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io`
- [ ] Trigger new deployment

### 3. Production Testing

Wait 5-10 minutes after deployment, then:

- [ ] Visit production URL
- [ ] Perform various actions (click CTAs, scroll, submit form)
- [ ] Wait 5 minutes
- [ ] Check Plausible dashboard for events
- [ ] Verify page views appear
- [ ] Verify custom events appear

### 4. Verify Event Tracking

In Plausible dashboard:

- [ ] Page views are being tracked
- [ ] "Contact Form Submission" events appear
- [ ] "CTA Click" events appear with location property
- [ ] "Value Props Viewed" events appear
- [ ] "Social Proof Viewed" events appear
- [ ] "Value Card Click" events appear with card property
- [ ] "Outbound Link Click" events appear
- [ ] "Social Link Click" events appear with platform property
- [ ] "Privacy Policy Click" events appear
- [ ] "Web Vitals" events appear with metric and value properties

### 5. Verify Traffic Sources

- [ ] Direct traffic is tracked
- [ ] Referrer sources are identified
- [ ] UTM parameters are tracked (if using marketing campaigns)

### 6. Verify No Cookies

- [ ] Open browser DevTools
- [ ] Go to Application/Storage tab
- [ ] Check Cookies
- [ ] Verify no Plausible cookies are set
- [ ] Verify no tracking cookies from other sources

### 7. Verify Privacy Compliance

- [ ] No consent banner is required
- [ ] Privacy policy mentions Plausible
- [ ] Privacy policy links to Plausible's data policy
- [ ] No personal data is collected

## Performance Verification

### 1. Script Load Performance

- [ ] Open Network tab
- [ ] Reload page
- [ ] Find Plausible script request
- [ ] Verify size is <1KB
- [ ] Verify script loads asynchronously (doesn't block rendering)
- [ ] Verify script is cached (check Cache-Control header)

### 2. Page Load Impact

Run Lighthouse audit:

```bash
# Install Lighthouse CLI (if not installed)
npm install -g lighthouse

# Run audit
lighthouse https://connectivebyte.com --view
```

- [ ] Performance score >90 (desktop)
- [ ] Performance score >80 (mobile)
- [ ] First Contentful Paint <1.5s
- [ ] Largest Contentful Paint <2.5s
- [ ] Time to Interactive <3.5s
- [ ] Total Blocking Time <200ms
- [ ] Cumulative Layout Shift <0.1

### 3. Analytics Impact

Compare metrics with and without analytics:

- [ ] Page load time increase <50ms
- [ ] No layout shifts caused by analytics
- [ ] No JavaScript errors
- [ ] No console warnings (except when ad blocker is enabled)

## Troubleshooting

### Events Not Appearing in Dashboard

1. **Check environment variables**

   ```bash
   # In browser console
   console.log(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN)
   ```

2. **Check Plausible script**
   - Network tab → Filter "plausible"
   - Verify script loads successfully
   - Check for 404 or CORS errors

3. **Check domain configuration**
   - Ensure domain matches exactly in Plausible dashboard
   - No protocol (http/https)
   - No trailing slash
   - Example: `connectivebyte.com` not `https://connectivebyte.com/`

4. **Wait for data**
   - Plausible updates every 5 minutes
   - Check "Last 30 minutes" view in dashboard

### Script Blocked by Ad Blocker

This is expected behavior:

- [ ] Website continues to function normally
- [ ] No JavaScript errors
- [ ] Console shows warning (expected)
- [ ] Analytics gracefully degrades

### High Error Count

If seeing many error events:

1. **Check error messages**
   - Go to Plausible dashboard
   - Filter by "Error" event
   - Check error property values

2. **Verify error filtering**
   - Third-party errors should be filtered
   - Only application errors should be tracked

3. **Check rate limiting**
   - Maximum 10 errors per session
   - Verify in ErrorTracker component

## Verification Checklist Summary

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Code integration complete
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Local testing complete

### Post-Deployment

- [ ] Plausible dashboard configured
- [ ] Netlify environment variables set
- [ ] Production events appearing
- [ ] All event types working
- [ ] Traffic sources tracked
- [ ] No cookies set
- [ ] Privacy compliant

### Performance

- [ ] Script size <1KB
- [ ] Page load impact <50ms
- [ ] Lighthouse scores meet targets
- [ ] No layout shifts
- [ ] No JavaScript errors

## Sign-Off

Once all checks are complete:

- [ ] Analytics implementation verified
- [ ] Documentation reviewed
- [ ] Team notified
- [ ] Plausible dashboard access shared

**Verified by**: ******\_\_\_******  
**Date**: ******\_\_\_******  
**Notes**: ******\_\_\_******
