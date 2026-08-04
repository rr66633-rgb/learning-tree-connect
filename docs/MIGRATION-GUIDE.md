# Migration Guide: Moving to Self-Hosted Deployment

This guide explains how to switch from the current platform-hosted setup to a fully independent deployment.

## What Needs to Change

The application currently uses a "Forge API" for three services. Below is how to replace each one.

### 1. File Storage

**Current**: Uses Forge presigned URLs for S3 upload/download
**Replacement**: Direct AWS S3 (or compatible) integration

**Files to swap:**
```
server/storage.ts          → server/storage-standalone.ts
server/_core/storageProxy.ts → server/storageProxy-standalone.ts
```

**Steps:**
1. In `server/_core/index.ts`, replace:
   ```typescript
   import { registerStorageProxy } from "./storageProxy";
   ```
   with:
   ```typescript
   import { registerStorageProxyStandalone as registerStorageProxy } from "../storageProxy-standalone";
   ```

2. In all files that import from `../storage` or `./storage`, change to:
   ```typescript
   import { storagePut, storageGet } from "../storage-standalone";
   ```

3. Update the frontend URLs from `/manus-storage/` to `/storage/`:
   ```bash
   # Find and replace in client code:
   grep -rn "manus-storage" client/src/
   # Replace /manus-storage/ with /storage/ in all matches
   ```

4. Set S3 environment variables (see `docs/environment-variables.md`)

### 2. LLM/AI Integration

**Current**: Uses Forge API as OpenAI-compatible proxy
**Replacement**: Direct OpenAI API (or any compatible provider)

**File**: `server/_core/llm.ts`

The LLM module already uses the OpenAI API format. Simply point the environment variables to your preferred provider:

```
BUILT_IN_FORGE_API_URL=https://api.openai.com    # or https://api.anthropic.com, etc.
BUILT_IN_FORGE_API_KEY=sk-your-api-key
```

No code changes needed - the module is already provider-agnostic.

### 3. Scheduled Tasks (Heartbeat/Cron)

**Current**: Uses Forge Heartbeat API for cron jobs
**Replacement**: System cron, Railway cron, or Render cron jobs

**File**: `server/_core/heartbeat.ts`

The heartbeat system registers HTTP endpoints that get called on a schedule. For self-hosted:

1. Keep the HTTP endpoints as-is (they're just Express routes under `/api/scheduled/`)
2. Use an external cron service to call them:

```bash
# Example crontab entries:
# Daily backup at 3:00 AM UTC
0 3 * * * curl -X POST http://localhost:3000/api/scheduled/daily-backup -H "Authorization: Bearer $CRON_SECRET"

# Enrollment expiry check at 8:00 AM UTC  
0 8 * * * curl -X POST http://localhost:3000/api/scheduled/check-enrollment-expiry -H "Authorization: Bearer $CRON_SECRET"
```

Or use `node-cron` package for in-process scheduling:
```typescript
import cron from 'node-cron';
// Add to server startup:
cron.schedule('0 3 * * *', () => { /* backup logic */ });
```

### 4. OAuth/Authentication

**Current**: Uses platform OAuth for login (exchangeCodeForToken, getUserInfo)
**Replacement**: The app already has independent auth (OTP, email/password)

The OAuth flow in `server/_core/sdk.ts` and `server/_core/oauth.ts` is used for SSO login. If you don't need SSO:

1. Remove the OAuth routes from `server/_core/index.ts`
2. Use only the independent auth system (OTP + password login)
3. The JWT session management is already self-contained (uses `jose` library)

If you want to keep OAuth, replace with:
- **Auth0**: Change `OAUTH_SERVER_URL` to your Auth0 domain
- **Clerk**: Use Clerk's SDK
- **NextAuth**: If migrating to Next.js
- **Custom**: The SDK already handles JWT signing/verification independently

### 5. Owner Notifications

**Current**: Uses Forge notification API
**Replacement**: Email notifications or webhook

**File**: `server/_core/notification.ts`

Replace the Forge notification call with email:
```typescript
import { sendEmail } from '../services/emailService';

export async function notifyOwner({ title, content }) {
  await sendEmail({
    to: process.env.OWNER_EMAIL,
    subject: title,
    html: content,
  });
}
```

---

## Quick Migration Checklist

- [ ] Set up MySQL database (Railway/PlanetScale/TiDB)
- [ ] Set up S3 bucket (AWS/DigitalOcean Spaces/Cloudflare R2)
- [ ] Swap storage imports (see section 1 above)
- [ ] Replace `/manus-storage/` with `/storage/` in frontend code
- [ ] Set all environment variables
- [ ] Run `node scripts/db-setup.mjs` to apply migrations
- [ ] Set up cron jobs for scheduled tasks
- [ ] Test login flow (OTP or OAuth)
- [ ] Test file upload and display
- [ ] Set up automated database backups
- [ ] Configure custom domain and SSL

## Database Export

To export your current database for migration:

```bash
# Export schema + data
mysqldump -h <current-host> -u <user> -p <database> > naashah-backup.sql

# Import to new database
mysql -h <new-host> -u <user> -p <database> < naashah-backup.sql
```

## File Storage Export

If you have files in the current S3 bucket that need to be migrated:

```bash
# Using AWS CLI to sync between buckets
aws s3 sync s3://old-bucket s3://new-bucket --source-region old-region --region new-region
```

---

## Support

For questions about the migration, refer to:
- `docs/environment-variables.md` - All environment variables
- `docs/DEPLOYMENT.md` - Deployment instructions for Railway/Render
- `drizzle/schema.ts` - Database schema reference
