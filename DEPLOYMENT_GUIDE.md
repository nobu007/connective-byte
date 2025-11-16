# Deployment Guide

This guide provides step-by-step instructions for deploying the ConnectiveByte platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Frontend Deployment (Netlify)](#frontend-deployment-netlify)
- [Backend Deployment](#backend-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Health Monitoring](#health-monitoring)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Accounts

- GitHub account with repository access
- Netlify account (for frontend hosting)
- Production server or cloud platform account (for backend)

### Required Tools

- Node.js 20.x or higher
- npm 10.x or higher
- Git

## Environment Configuration

### 1. GitHub Secrets

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

#### Required Secrets

```
NETLIFY_AUTH_TOKEN=<your-netlify-auth-token>
NETLIFY_SITE_ID=<your-netlify-site-id>
```

#### Optional Secrets (for backend deployment)

```
PRODUCTION_API_URL=https://api.connectivebyte.com
PRODUCTION_FRONTEND_URL=https://connectivebyte.netlify.app
STAGING_API_URL=https://staging-api.connectivebyte.com
STAGING_FRONTEND_URL=https://staging--connectivebyte.netlify.app
```

### 2. Environment Variables

#### Frontend (.env.production)

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.connectivebyte.com
```

#### Backend (.env.production)

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/connectivebyte
JWT_SECRET=<your-secure-jwt-secret>
JWT_EXPIRES_IN=1d
```

## Frontend Deployment (Netlify)

### Automatic Deployment (Recommended)

The frontend is automatically deployed to Netlify when you push to the `main` branch.

1. **Push to main branch:**

   ```bash
   git push origin main
   ```

2. **Monitor deployment:**
   - Check GitHub Actions: https://github.com/your-org/connective-byte/actions
   - Check Netlify dashboard: https://app.netlify.com

3. **Verify deployment:**
   - Visit your production URL
   - Check health status indicator
   - Verify API connectivity

### Manual Deployment

If you need to deploy manually:

```bash
# Build the frontend
npm run build:frontend

# Deploy to Netlify using CLI
cd apps/frontend
npx netlify deploy --prod --dir=out
```

### Netlify Configuration

The `netlify.toml` file is already configured with:

- Build settings
- Redirects for SPA routing
- Security headers
- Node.js version

## Backend Deployment

### Option 1: AWS Elastic Beanstalk

1. **Install EB CLI:**

   ```bash
   pip install awsebcli
   ```

2. **Initialize EB application:**

   ```bash
   cd apps/backend
   eb init -p node.js-20 connective-byte-backend
   ```

3. **Create environment:**

   ```bash
   eb create production-env
   ```

4. **Deploy:**

   ```bash
   eb deploy
   ```

5. **Set environment variables:**
   ```bash
   eb setenv NODE_ENV=production PORT=3001 DATABASE_URL=<your-db-url>
   ```

### Option 2: Docker Container

1. **Create Dockerfile:**

   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --production
   COPY dist ./dist
   EXPOSE 3001
   CMD ["node", "dist/index.js"]
   ```

2. **Build and push:**

   ```bash
   docker build -t connective-byte-backend .
   docker tag connective-byte-backend:latest your-registry/connective-byte-backend:latest
   docker push your-registry/connective-byte-backend:latest
   ```

3. **Deploy to your container platform:**
   - AWS ECS/Fargate
   - Google Cloud Run
   - Azure Container Instances
   - DigitalOcean App Platform

### Option 3: Traditional Server

1. **Download deployment artifact from GitHub Actions**

2. **Extract on server:**

   ```bash
   tar -xzf backend-deployment.tar.gz
   cd backend
   ```

3. **Install dependencies:**

   ```bash
   npm ci --production
   ```

4. **Set environment variables:**

   ```bash
   export NODE_ENV=production
   export PORT=3001
   export DATABASE_URL=<your-db-url>
   export JWT_SECRET=<your-jwt-secret>
   ```

5. **Start with PM2:**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name connective-byte-backend
   pm2 save
   pm2 startup
   ```

## CI/CD Pipeline

### Workflows

The project includes three GitHub Actions workflows:

#### 1. CI/CD Pipeline (`ci.yml`)

- Runs on: Push to main/develop, Pull requests
- Jobs:
  - Lint code
  - Run backend tests with coverage
  - Run frontend tests with coverage
  - Run E2E tests
  - Build applications
- Artifacts: Build outputs, test reports

#### 2. Production Deployment (`deploy.yml`)

- Runs on: Push to main, Manual trigger
- Jobs:
  - Deploy frontend to Netlify
  - Create backend deployment package
  - Run production health checks
- Notifications: Deployment status

#### 3. Staging Deployment (`staging.yml`)

- Runs on: Push to develop
- Jobs:
  - Deploy to staging environment
  - Run smoke tests
  - Comment on PR with preview URL

#### 4. Security Scan (`security.yml`)

- Runs on: Push, Pull requests, Weekly schedule
- Jobs:
  - Dependency vulnerability scan
  - CodeQL security analysis
  - Secret scanning

### Triggering Deployments

#### Automatic Deployment

```bash
# Deploy to production
git push origin main

# Deploy to staging
git push origin develop
```

#### Manual Deployment

1. Go to GitHub Actions
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select branch and confirm

## Health Monitoring

### Production Health Checks

The deployment workflow automatically checks:

- Frontend accessibility (HTTP 200)
- Backend health endpoint (`/api/health`)
- System status (ok/degraded/error)

### Manual Health Check

```bash
# Check frontend
curl https://connectivebyte.netlify.app

# Check backend
curl https://api.connectivebyte.com/api/health
```

### Expected Response

```json
{
  "status": "ok",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "uptime": 3600,
  "checks": [
    {
      "name": "uptime",
      "status": "pass",
      "duration": 1
    },
    {
      "name": "memory",
      "status": "pass",
      "duration": 2
    }
  ],
  "version": "1.0.0"
}
```

## Rollback Procedures

### Frontend Rollback (Netlify)

1. **Via Netlify Dashboard:**
   - Go to Deploys tab
   - Find previous successful deployment
   - Click "Publish deploy"

2. **Via CLI:**
   ```bash
   netlify rollback
   ```

### Backend Rollback

#### Using PM2

```bash
pm2 stop connective-byte-backend
# Deploy previous version
pm2 start dist/index.js --name connective-byte-backend
```

#### Using Docker

```bash
docker pull your-registry/connective-byte-backend:previous-tag
docker stop connective-byte-backend
docker run -d --name connective-byte-backend your-registry/connective-byte-backend:previous-tag
```

#### Using Git

```bash
git revert <commit-hash>
git push origin main
# Wait for automatic deployment
```

## Monitoring and Alerts

### Recommended Monitoring Tools

1. **Uptime Monitoring:**
   - UptimeRobot
   - Pingdom
   - StatusCake

2. **Application Performance:**
   - New Relic
   - Datadog
   - Sentry

3. **Log Aggregation:**
   - Loggly
   - Papertrail
   - CloudWatch Logs

### Setting Up Alerts

Configure alerts for:

- HTTP 5xx errors
- Response time > 1000ms
- Health check failures
- High memory usage (>90%)
- High CPU usage (>80%)

## Troubleshooting

### Common Issues

#### Frontend not loading

1. Check Netlify deployment logs
2. Verify environment variables
3. Check browser console for errors
4. Verify API URL configuration

#### Backend not responding

1. Check server logs
2. Verify environment variables
3. Check database connectivity
4. Verify port configuration

#### Health check failing

1. Check backend server status
2. Verify health endpoint accessibility
3. Check system resources (memory, CPU)
4. Review application logs

### Support

For deployment issues:

1. Check GitHub Actions logs
2. Review deployment artifacts
3. Check platform-specific logs (Netlify, AWS, etc.)
4. Contact platform support if needed

## Security Checklist

Before deploying to production:

- [ ] All secrets are stored in GitHub Secrets
- [ ] Environment variables are properly configured
- [ ] HTTPS is enabled for all endpoints
- [ ] Security headers are configured
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies are up to date
- [ ] Security scan passes

## Post-Deployment Checklist

After deployment:

- [ ] Frontend is accessible
- [ ] Backend health check passes
- [ ] All API endpoints respond correctly
- [ ] Database connectivity works
- [ ] Monitoring is active
- [ ] Alerts are configured
- [ ] Backup procedures are in place
- [ ] Documentation is updated
- [ ] Team is notified

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
