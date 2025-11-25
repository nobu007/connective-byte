# Newsletter Signup - Deployment Verification Guide

This document provides step-by-step instructions for deploying and verifying the newsletter signup feature in production.

## Prerequisites

Before deploying, ensure you have:

- ✅ Resend account with verified domain (info@connectivebyte.com)
- ✅ Resend API key
- ✅ Resend audience created for newsletter subscribers
- ✅ Plausible Analytics account configured
- ✅ Access to Netlify dashboard

## Step 1: Configure Resend Audience

### 1.1 Create Audience in Resend Dashboard

1. Log in to [Resend Dashboard](https://resend.com/audiences)
2. Click "Create Audience"
3. Name: "ConnectiveByte Newsletter"
4. Description: "Newsletter subscribers for ConnectiveByte platform"
5. Copy the Audience ID (format: `aud_xxxxxxxxxxxxx`)

### 1.2 Verify Sender Domain

1. Go to [Resend Domains](https://resend.com/domains)
2. Ensure `connectivebyte.com` is verified
3. Confirm sender address `info@connectivebyte.com` is active

## Step 2: Add Environment Variables to Netlify

### 2.1 Navigate to Environment Variables

1. Open [Netlify Dashboard](https://app.netlify.com/)
2. Select your ConnectiveByte site
3. Go to "Site settings" → "Environment variables"

### 2.2 Add RESEND_AUDIENCE_ID

1. Click "Add a variable"
2. Key: `RESEND_AUDIENCE_ID`
3. Value: `aud_xxxxxxxxxxxxx` (from Step 1.1)
4. Scopes: Select "All" or "Production"
5. Click "Create variable"

### 2.3 Verify Other Required Variables

Ensure these variables are already set:

- ✅ `RESEND_API_KEY` - Your Resend API key
- ✅ `NEXT_PUBLIC_SITE_URL` - https://connectivebyte.com
- ✅ `NEXT_PUBLIC_CONTACT_EMAIL` - info@connectivebyte.com
- ✅ `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` - connectivebyte.com

## Step 3: Deploy to Production

### 3.1 Trigger Deployment

Option A - Automatic (Recommended):

```bash
git add .
git commit -m "feat: add newsletter signup feature"
git push origin main
```

Option B - Manual:

1. Go to Netlify Dashboard → "Deploys"
2. Click "Trigger deploy" → "Deploy site"

### 3.2 Monitor Build

1. Watch the build log in Netlify
2. Ensure no errors occur
3. Wait for "Site is live" message
4. Note the deployment URL

## Step 4: Test Newsletter Signup on Production

### 4.1 Access Production Site

1. Navigate to https://connectivebyte.com
2. Scroll to footer section
3. Locate "ニュースレター登録" section

### 4.2 Test Valid Submission

1. Enter test email: `test+newsletter@yourdomain.com`
2. Check consent checkbox
3. Click "登録する" button
4. **Expected Result**: Success message displays within 2 seconds
   - Message: "ご登録ありがとうございます！ウェルカムメールをお送りしました。"

### 4.3 Test Form Validation

Test invalid email:

1. Enter: `invalid-email`
2. **Expected Result**: Error message "有効なメールアドレスを入力してください"

Test missing consent:

1. Enter valid email
2. Don't check consent checkbox
3. Click submit
4. **Expected Result**: Error message "プライバシーポリシーに同意してください"

### 4.4 Test Rate Limiting

1. Submit form 3 times with different emails
2. Try 4th submission
3. **Expected Result**: Error message "送信回数が上限に達しました。しばらく待ってから再度お試しください。"

## Step 5: Verify Welcome Email Delivery

### 5.1 Check Email Inbox

1. Open inbox for test email used in Step 4.2
2. Wait up to 5 minutes for email arrival
3. **Expected Result**: Email received with subject "ConnectiveByteニュースレターへようこそ"

### 5.2 Verify Email Content

Check the welcome email contains:

- ✅ Personalized greeting (if name provided)
- ✅ Welcome message
- ✅ Newsletter content description
- ✅ Expected frequency (月1-2回程度)
- ✅ Unsubscribe link at bottom
- ✅ Sender: ConnectiveByte <info@connectivebyte.com>

### 5.3 Test Email Rendering

1. Check email displays correctly on:
   - Desktop email client
   - Mobile email client
   - Webmail (Gmail, Outlook, etc.)
2. Verify images and formatting are correct

## Step 6: Check Resend Audience for New Subscriber

### 6.1 Access Resend Dashboard

1. Log in to [Resend Dashboard](https://resend.com/audiences)
2. Click on "ConnectiveByte Newsletter" audience

### 6.2 Verify Subscriber Added

1. Check subscriber list
2. **Expected Result**: Test email appears in list
3. Verify subscriber details:
   - Email address matches
   - Name (if provided)
   - Status: "Active"
   - Subscription date/time

### 6.3 Check Email Logs

1. Go to [Resend Logs](https://resend.com/logs)
2. Filter by recipient email
3. **Expected Result**: Two entries
   - Contact creation (audience add)
   - Welcome email sent
4. Verify both show "Delivered" status

## Step 7: Verify Analytics Events in Plausible

### 7.1 Access Plausible Dashboard

1. Log in to [Plausible Analytics](https://plausible.io/)
2. Select "connectivebyte.com" site

### 7.2 Check Newsletter Signup Goal

1. Navigate to "Goals" section
2. **Expected Result**: "Newsletter Signup Click" goal exists
3. Check recent conversions show test submission

### 7.3 Verify Event Properties

1. Click on "Newsletter Signup Click" goal
2. Check custom properties
3. **Expected Result**: Property "location" = "footer"

### 7.4 Monitor Real-Time Events

1. Go to "Realtime" view
2. Submit another test signup
3. **Expected Result**: Event appears within seconds

## Step 8: Test Unsubscribe Link in Welcome Email

### 8.1 Click Unsubscribe Link

1. Open welcome email from Step 5
2. Scroll to footer
3. Click unsubscribe link
4. **Expected Result**: Redirected to unsubscribe page

### 8.2 Verify Unsubscribe Page

Check the page displays:

- ✅ Confirmation message
- ✅ Explanation of unsubscribe process
- ✅ Contact information for issues
- ✅ Link back to homepage

### 8.3 Verify Unsubscribe in Resend

1. Return to Resend Dashboard → Audience
2. Find the test subscriber
3. **Expected Result**: Status changed to "Unsubscribed"
4. Verify timestamp of unsubscribe action

## Step 9: Performance Verification

### 9.1 Test Form Submission Speed

1. Use browser DevTools Network tab
2. Submit newsletter form
3. **Expected Result**: API response within 2 seconds

### 9.2 Run Lighthouse Audit

1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Run audit on homepage
4. **Expected Result**:
   - Performance: > 90
   - Accessibility: > 95
   - Best Practices: > 90

## Step 10: Accessibility Verification

### 10.1 Keyboard Navigation

1. Use Tab key to navigate to newsletter form
2. Fill form using keyboard only
3. Submit with Enter key
4. **Expected Result**: All actions work without mouse

### 10.2 Screen Reader Test

1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to newsletter form
3. **Expected Result**:
   - Form labels are announced
   - Error messages are announced
   - Success message is announced

### 10.3 ARIA Attributes

1. Inspect form elements in DevTools
2. **Expected Result**: Proper ARIA attributes present
   - `aria-label` on inputs
   - `aria-describedby` for errors
   - `aria-live` for status messages

## Verification Checklist

Use this checklist to track verification progress:

### Configuration

- [x] Resend audience created
- [x] RESEND_AUDIENCE_ID added to Netlify
- [x] All environment variables verified
- [x] Domain verified in Resend

### Deployment

- [ ] Code deployed to production
- [ ] Build completed successfully
- [ ] Site is live and accessible

### Functionality

- [ ] Newsletter form displays in footer
- [ ] Valid submission succeeds
- [ ] Form validation works correctly
- [ ] Rate limiting enforces limits
- [ ] Success message displays

### Email Delivery

- [ ] Welcome email received within 5 minutes
- [ ] Email content is correct
- [ ] Email renders properly on all clients
- [ ] Sender address is correct

### Data Management

- [ ] Subscriber added to Resend audience
- [ ] Subscriber status is "Active"
- [ ] Email logs show delivery
- [ ] Unsubscribe link works
- [ ] Unsubscribe updates status

### Analytics

- [ ] Newsletter Signup Click goal configured
- [ ] Events tracked in Plausible
- [ ] Custom properties captured
- [ ] Real-time tracking works

### Performance

- [ ] Form submission < 2 seconds
- [ ] Lighthouse scores meet targets
- [ ] No console errors

### Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA attributes present
- [ ] Error messages accessible

## Troubleshooting

### Issue: Welcome Email Not Received

**Possible Causes:**

1. RESEND_API_KEY not set correctly
2. RESEND_AUDIENCE_ID incorrect
3. Domain not verified in Resend
4. Email in spam folder

**Solutions:**

1. Verify environment variables in Netlify
2. Check Resend logs for errors
3. Verify domain in Resend dashboard
4. Check spam/junk folder

### Issue: Subscriber Not Added to Audience

**Possible Causes:**

1. RESEND_AUDIENCE_ID incorrect
2. API rate limit exceeded
3. Network error

**Solutions:**

1. Verify audience ID matches Resend dashboard
2. Check Resend API logs
3. Check Netlify function logs

### Issue: Analytics Events Not Tracking

**Possible Causes:**

1. NEXT_PUBLIC_PLAUSIBLE_DOMAIN not set
2. Goal not configured in Plausible
3. Ad blocker interfering

**Solutions:**

1. Verify environment variable
2. Configure goal in Plausible dashboard
3. Test with ad blocker disabled

### Issue: Rate Limiting Not Working

**Possible Causes:**

1. In-memory store reset on deployment
2. Multiple server instances

**Solutions:**

1. Expected behavior for serverless functions
2. Consider Redis for persistent rate limiting

## Success Criteria

The newsletter signup feature is successfully deployed when:

✅ All items in verification checklist are complete
✅ Test submissions work end-to-end
✅ Welcome emails are delivered reliably
✅ Analytics events are tracked correctly
✅ Unsubscribe process works smoothly
✅ Performance meets targets (< 2s submission)
✅ Accessibility requirements met

## Next Steps

After successful verification:

1. Monitor analytics for real user signups
2. Track email open rates in Resend
3. Monitor error rates in logs
4. Collect user feedback
5. Plan Phase 2 enhancements (double opt-in, preferences, etc.)

## Support

For issues during deployment:

- **Resend Support**: support@resend.com
- **Netlify Support**: https://answers.netlify.com/
- **Plausible Support**: https://plausible.io/contact

## References

- [Resend Documentation](https://resend.com/docs)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Plausible Goals](https://plausible.io/docs/goal-conversions)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
