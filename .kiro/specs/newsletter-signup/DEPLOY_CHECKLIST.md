# Newsletter Signup - Quick Deploy Checklist

Use this quick reference checklist for deploying the newsletter signup feature.

## Pre-Deployment

- [ ] Resend account active
- [ ] Domain `connectivebyte.com` verified in Resend
- [ ] Sender address `info@connectivebyte.com` verified
- [ ] Resend audience "ConnectiveByte Newsletter" created
- [ ] Audience ID copied (format: `aud_xxxxxxxxxxxxx`)

## Netlify Configuration

- [ ] Navigate to Site settings → Environment variables
- [ ] Add `RESEND_AUDIENCE_ID` = `aud_xxxxxxxxxxxxx`
- [ ] Verify `RESEND_API_KEY` is set
- [ ] Verify `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set

## Deploy

- [ ] Push code to main branch OR trigger manual deploy
- [ ] Monitor build log for errors
- [ ] Wait for "Site is live" confirmation

## Quick Verification (5 minutes)

### 1. Form Submission Test

- [ ] Go to https://connectivebyte.com
- [ ] Scroll to footer
- [ ] Enter test email: `test+newsletter@yourdomain.com`
- [ ] Check consent checkbox
- [ ] Click submit
- [ ] Success message appears

### 2. Email Delivery Test

- [ ] Check inbox (wait up to 5 minutes)
- [ ] Welcome email received
- [ ] Subject: "ConnectiveByteニュースレターへようこそ"
- [ ] Unsubscribe link present

### 3. Resend Dashboard Check

- [ ] Log in to Resend
- [ ] Open "ConnectiveByte Newsletter" audience
- [ ] Test email appears in subscriber list
- [ ] Status: "Active"

### 4. Analytics Check

- [ ] Log in to Plausible
- [ ] Check "Newsletter Signup Click" goal
- [ ] Test event appears in recent conversions

### 5. Unsubscribe Test

- [ ] Click unsubscribe link in email
- [ ] Unsubscribe page displays
- [ ] Check Resend: status changed to "Unsubscribed"

## Issues?

See detailed troubleshooting in `deployment-verification.md`

## Done! ✅

Newsletter signup feature is live and verified.
