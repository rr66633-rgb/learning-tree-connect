# Naashah - Deployment Guide

This guide covers deploying Naashah as a standalone application on Railway or Render.

## Architecture Overview

Naashah is a full-stack Node.js application:

- **Frontend**: React 19 + Vite (built to static files, served by Express)
- **Backend**: Express + tRPC + Drizzle ORM
- **Database**: MySQL 8+ (or TiDB/PlanetScale)
- **Storage**: Any S3-compatible service (AWS S3, DigitalOcean Spaces, Cloudflare R2, MinIO)
- **Runtime**: Node.js 20+

## Prerequisites

1. A MySQL 8+ database (Railway provides one, or use PlanetScale/TiDB Cloud)
2. An S3-compatible storage bucket
3. SMTP credentials for email (Gmail App Password, SendGrid, etc.)
4. Node.js 20+ and pnpm 9+

---

## Option A: Deploy on Railway

### Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository (`rr66633-rgb/learning-tree-connect`)
3. Railway will auto-detect the Node.js project

### Step 2: Add a MySQL Database

1. In your Railway project, click "New" > "Database" > "MySQL"
2. Copy the `DATABASE_URL` from the MySQL service's "Connect" tab

### Step 3: Configure Environment Variables

In the Railway service settings, add all required environment variables from `docs/environment-variables.md`.

Key variables to set:
```
DATABASE_URL=<from Railway MySQL>
JWT_SECRET=<generate with: openssl rand -hex 32>
APP_URL=https://your-app.up.railway.app
PORT=3000
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-app-password
```

### Step 4: Configure Build Settings

In Railway service settings:
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `node scripts/db-setup.mjs && pnpm start`
- **Root Directory**: `/` (leave default)

### Step 5: Deploy

Push to your `main` branch. Railway will automatically build and deploy.

### Step 6: Custom Domain (Optional)

1. In Railway service settings > "Networking"
2. Add your custom domain (e.g., `naashah.com`)
3. Update DNS records as instructed

---

## Option B: Deploy on Render

### Step 1: Create a Render Web Service

1. Go to [render.com](https://render.com) and create a new "Web Service"
2. Connect your GitHub repository
3. Select the `main` branch

### Step 2: Configure Build Settings

- **Environment**: Node
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `node scripts/db-setup.mjs && pnpm start`
- **Node Version**: `20`

### Step 3: Add a MySQL Database

Render doesn't provide MySQL natively. Options:
- **PlanetScale** (free tier available): Create a database and get the connection URL
- **TiDB Cloud** (free tier): Create a serverless cluster
- **Railway MySQL**: Use Railway just for the database

### Step 4: Configure Environment Variables

In Render service > "Environment", add all variables from `docs/environment-variables.md`.

### Step 5: Deploy

Push to `main`. Render will build and deploy automatically.

---

## Option C: Deploy with Docker

A `Dockerfile` is included for containerized deployments.

```bash
# Build the image
docker build -t naashah .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="..." \
  -e S3_BUCKET="..." \
  -e S3_ACCESS_KEY_ID="..." \
  -e S3_SECRET_ACCESS_KEY="..." \
  naashah
```

### Docker Compose (with MySQL)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://naashah:password@db:3306/naashah
      - JWT_SECRET=your-secret-here
      - S3_BUCKET=your-bucket
      - S3_ACCESS_KEY_ID=your-key
      - S3_SECRET_ACCESS_KEY=your-secret
    depends_on:
      db:
        condition: service_healthy

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: naashah
      MYSQL_USER: naashah
      MYSQL_PASSWORD: password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
```

---

## Database Migration

### First Deployment

The start command includes `node scripts/db-setup.mjs` which automatically applies all migrations. No manual steps needed.

### Manual Migration

If you need to run migrations manually:

```bash
DATABASE_URL="mysql://..." node scripts/db-setup.mjs
```

### Adding New Migrations

```bash
# After modifying drizzle/schema.ts:
pnpm drizzle-kit generate
# This creates a new .sql file in drizzle/
# Commit it and redeploy - it will be applied automatically
```

---

## Storage Migration

### Moving from Forge Storage to Direct S3

If you have existing files in the previous storage system:

1. Set up your S3 bucket with the same file structure
2. Upload existing files maintaining the same key paths
3. Update the storage proxy path in your code:
   - Current: `/manus-storage/{key}` 
   - Standalone: `/storage/{key}`

### Switching to Standalone Storage

Replace the import in your server code:

```typescript
// Before (platform-dependent):
import { storagePut } from "./storage";
import { registerStorageProxy } from "./_core/storageProxy";

// After (standalone):
import { storagePut } from "./storage-standalone";
import { registerStorageProxyStandalone } from "./storageProxy-standalone";
```

Then update the Express app setup to use `registerStorageProxyStandalone(app)` instead.

---

## Scheduled Tasks (Cron Jobs)

The application uses scheduled tasks for:
- Daily database backups (3:00 AM UTC)
- Enrollment expiry checks
- Notification cleanup

### On Railway

Use Railway's built-in cron service or add a cron job service.

### On Render

Use Render's "Cron Jobs" feature:
1. Create a new Cron Job service
2. Set the schedule and command:
   - Backup: `0 3 * * *` → `node scripts/db-backup.mjs`
   - Enrollment check: `0 8 * * *` → `node scripts/check-enrollment-expiry.mjs`

### Self-hosted

Use system cron or a process manager like PM2:

```bash
# crontab -e
0 3 * * * cd /app && DATABASE_URL="..." node scripts/db-backup.mjs
```

---

## SSL/TLS

- **Railway**: Automatic SSL on `*.up.railway.app` and custom domains
- **Render**: Automatic SSL on `*.onrender.com` and custom domains
- **Self-hosted**: Use Let's Encrypt with Caddy or nginx reverse proxy

---

## Monitoring & Logs

### Railway
- Built-in log viewer in the dashboard
- Add Sentry for error tracking:
  ```
  SENTRY_DSN=https://xxx@sentry.io/xxx
  ```

### Render
- Built-in log viewer
- Health check endpoint: `GET /api/trpc/health`

---

## Performance Recommendations

1. **Database**: Use connection pooling (already configured, limit: 10)
2. **Storage**: Use a CDN in front of S3 for faster image delivery
3. **Memory**: The app runs comfortably with 512MB RAM
4. **CPU**: 1 vCPU is sufficient for up to ~100 concurrent users

---

## Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Verify `DATABASE_URL` format: `mysql://user:pass@host:port/dbname`
- Ensure SSL is enabled if required: append `?ssl={"rejectUnauthorized":true}`
- Check that the database allows connections from your server's IP

**"Storage upload failed"**
- Verify S3 credentials and bucket permissions
- Ensure the bucket has CORS configured for your domain
- Check that `S3_ENDPOINT` is set correctly for non-AWS services

**"JWT verification failed"**
- Ensure `JWT_SECRET` is the same across all instances
- If you changed the secret, all existing sessions will be invalidated

**"Build failed: out of memory"**
- Increase the build memory limit: `NODE_OPTIONS=--max-old-space-size=2048 pnpm build`
- Railway/Render provide sufficient memory by default

---

## Security Checklist

- [ ] Set a strong `JWT_SECRET` (min 32 characters)
- [ ] Enable SSL on database connection
- [ ] Restrict database access to your server's IP only
- [ ] Use environment variables for all secrets (never commit them)
- [ ] Enable CORS only for your domain in production
- [ ] Set up automated backups for the database
- [ ] Monitor error logs for security issues
