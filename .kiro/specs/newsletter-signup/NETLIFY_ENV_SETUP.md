# Netlify Environment Variable Setup - RESEND_AUDIENCE_ID

## Task: Add RESEND_AUDIENCE_ID to Netlify

This guide provides step-by-step instructions for adding the `RESEND_AUDIENCE_ID` environment variable to your Netlify deployment.

## Prerequisites

- ✅ Resend account created
- ✅ Resend audience created (you should have an audience ID like `aud_xxxxxxxxxxxxx`)
- ✅ Access to Netlify dashboard

## Steps to Add RESEND_AUDIENCE_ID

### 1. Get Your Resend Audience ID

If you haven't created an audience yet:

1. Log in to [Resend Dashboard](https://resend.com/audiences)
2. Click "Create Audience"
3. Name: "ConnectiveByte Newsletter"
4. Description: "Newsletter subscribers for ConnectiveByte platform"
5. Click "Create"
6. **Copy the Audience ID** (format: `aud_xxxxxxxxxxxxx`)

If you already have an audience:

1. Log in to [Resend Dashboard](https://resend.com/audiences)
2. Click on your "ConnectiveByte Newsletter" audience
3. **Copy the Audience ID** from the audience details page

### 2. Add Environment Variable to Netlify

1. Open [Netlify Dashboard](https://app.netlify.com/)
2. Select your ConnectiveByte site
3. Go to **"Site settings"** (in the top navigation)
4. In the left sidebar, click **"Environment variables"**
5. Click **"Add a variable"** button
6. Fill in the details:
   - **Key**: `RESEND_AUDIENCE_ID`
   - **Value**: `aud_xxxxxxxxxxxxx` (paste your audience ID from step 1)
   - **Scopes**: Select **"All"** or **"Production"** (recommended: All)
7. Click **"Create variable"**

### 3. Verify Environment Variable

After adding the variable:

1. You should see `RESEND_AUDIENCE_ID` in your environment variables list
2. The value should be masked (showing only the last few characters)
3. The scope should show "All" or "Production"

### 4. Trigger a New Deployment

The environment variable will only be available after a new deployment:

**Option A - Automatic (Recommended):**

```bash
git commit --allow-empty -m "chore: trigger deployment for RESEND_AUDIENCE_ID"
git push origin main
```

**Option B - Manual:**

1. In Netlify Dashboard, go to **"Deploys"** tab
2. Click **"Trigger deploy"** dropdown
3. Select **"Deploy site"**

### 5. Verify Deployment

1. Wait for the deployment to complete (usually 2-5 minutes)
2. Check the deploy log for any errors
3. Once deployed, the newsletter signup feature will use the audience ID

## Verification Checklist

- [ ] Resend audience created
- [ ] Audience ID copied (format: `aud_xxxxxxxxxxxxx`)
- [ ] Logged into Netlify dashboard
- [ ] Navigated to Site settings → Environment variables
- [ ] Added `RESEND_AUDIENCE_ID` variable
- [ ] Variable value is correct audience ID
- [ ] Variable scope is set to "All" or "Production"
- [ ] New deployment triggered
- [ ] Deployment completed successfully

## Testing After Setup

Once the deployment is complete, test the newsletter signup:

1. Visit your production site: https://connectivebyte.com
2. Scroll to the footer
3. Enter a test email in the newsletter signup form
4. Submit the form
5. Check Resend dashboard → Audiences to verify the subscriber was added

## Troubleshooting

### Variable Not Working After Adding

**Solution**: Trigger a new deployment. Environment variables are only loaded during build time.

### Subscriber Not Added to Audience

**Possible causes**:

- Incorrect audience ID format
- Typo in variable name (must be exactly `RESEND_AUDIENCE_ID`)
- Variable not set to correct scope

**Solution**:

1. Double-check the audience ID in Resend dashboard
2. Verify the variable name in Netlify (case-sensitive)
3. Ensure scope includes your deployment environment

### How to Update the Variable

If you need to change the audience ID:

1. Go to Netlify Dashboard → Site settings → Environment variables
2. Find `RESEND_AUDIENCE_ID`
3. Click the "..." menu → "Edit"
4. Update the value
5. Click "Save"
6. Trigger a new deployment

## Related Documentation

- [Netlify Environment Variables Guide](../../../NETLIFY_DEPLOY.md)
- [Newsletter Setup Guide](../../../docs/newsletter-setup.md)
- [Deployment Verification Guide](./deployment-verification.md)

## Next Steps

After successfully adding `RESEND_AUDIENCE_ID`:

1. ✅ Proceed to full deployment verification (see `deployment-verification.md`)
2. ✅ Test newsletter signup end-to-end
3. ✅ Verify welcome email delivery
4. ✅ Check analytics tracking

## Support

If you encounter issues:

- **Netlify Support**: https://answers.netlify.com/
- **Resend Support**: support@resend.com
- **Documentation**: See related documentation links above
