# Email Service Setup Guide

This guide explains how to set up the Resend email service for the ConnectiveByte contact form.

## Overview

The contact form uses [Resend](https://resend.com) to send email notifications when users submit the form. The implementation is already complete in the codebase - you just need to configure the API key.

## Setup Steps

### 1. Sign Up for Resend

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "ConnectiveByte Production")
5. Copy the API key (it starts with `re_`)

### 3. Configure Domain (Optional but Recommended)

For production use, you should verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `connectivebyte.com`
4. Follow the DNS configuration instructions
5. Wait for verification (usually takes a few minutes)

Once verified, you can send emails from `contact@connectivebyte.com` or any other address at your domain.

### 4. Add API Key to Environment Variables

#### For Local Development

1. Create a `.env.local` file in `apps/frontend/` directory:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
NEXT_PUBLIC_CONTACT_EMAIL=info@connectivebyte.com
```

2. Restart your development server

#### For Netlify Production

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:
   - `RESEND_API_KEY`: Your Resend API key
   - `NEXT_PUBLIC_CONTACT_EMAIL`: The email address to receive contact form submissions (e.g., `info@connectivebyte.com`)

4. Redeploy your site for changes to take effect

### 5. Test the Contact Form

#### Local Testing

1. Start your development server: `npm run dev`
2. Navigate to `/contact`
3. Fill out and submit the form
4. Check your email inbox for the notification

#### Production Testing

1. After deploying to Netlify with the API key configured
2. Visit your production site's contact page
3. Submit a test form
4. Verify the email is received

## Email Template

The contact form sends a beautifully formatted HTML email with:

- **From**: `ConnectiveByte <contact@connectivebyte.com>`
- **Reply-To**: The user's email address (so you can reply directly)
- **Subject**: `新しいお問い合わせ: [Name]様より`
- **Content**: Formatted with your brand colors and includes:
  - User's name
  - User's email address
  - Message content
  - Submission timestamp

## Fallback Behavior

If `RESEND_API_KEY` is not configured:

- The form will still work and show success message
- Submissions will be logged to the console
- A warning message will appear in the logs
- This is useful for development without needing API keys

## Troubleshooting

### Email Not Received

1. **Check spam folder**: Resend emails might be filtered initially
2. **Verify API key**: Make sure it's correctly set in environment variables
3. **Check Resend dashboard**: View logs in the Resend dashboard to see if emails were sent
4. **Domain verification**: If using a custom domain, ensure it's verified

### API Key Errors

- Make sure the API key starts with `re_`
- Verify it's not expired or revoked
- Check that it has the correct permissions

### Rate Limits

Resend free tier includes:

- 100 emails per day
- 3,000 emails per month

For higher volume, upgrade to a paid plan.

## Cost Estimate

- **Free tier**: 100 emails/day, 3,000 emails/month - Perfect for MVP
- **Pro tier**: $20/month for 50,000 emails - Scales with your needs

For a new website, the free tier should be sufficient for several months.

## Alternative: SendGrid

If you prefer SendGrid instead of Resend, you'll need to:

1. Install SendGrid SDK: `npm install @sendgrid/mail`
2. Update `apps/frontend/app/api/contact/route.ts` to use SendGrid API
3. Configure `SENDGRID_API_KEY` instead of `RESEND_API_KEY`

The current implementation uses Resend as it's simpler and more modern.

## Support

- **Resend Documentation**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **ConnectiveByte Issues**: Check the repository issues or contact the development team
