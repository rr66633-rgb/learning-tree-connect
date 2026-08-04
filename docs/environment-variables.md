# Environment Variables Reference

This document lists all environment variables required to run Naashah independently.

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/naashah?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | Session cookie signing secret (min 32 chars) | Generate with: `openssl rand -hex 32` |
| `APP_URL` | Public URL of the application | `https://naashah.com` |
| `PORT` | Server port (default: 3000) | `3000` |

## Storage (S3-Compatible)

| Variable | Description | Example |
|----------|-------------|---------|
| `S3_BUCKET` | S3 bucket name | `naashah-storage` |
| `S3_REGION` | AWS region | `us-east-1` |
| `S3_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `S3_SECRET_ACCESS_KEY` | AWS secret key | `wJal...` |
| `S3_ENDPOINT` | (Optional) Custom endpoint for non-AWS | `https://sgp1.digitaloceanspaces.com` |

## Authentication

| Variable | Description | Example |
|----------|-------------|---------|
| `OAUTH_SERVER_URL` | OAuth provider base URL | `https://api.your-auth.com` |
| `VITE_APP_ID` | OAuth application ID | `app_xxxxx` |
| `VITE_OAUTH_PORTAL_URL` | OAuth login page URL | `https://login.your-auth.com` |
| `OWNER_OPEN_ID` | First admin user's openId | `user_xxxxx` |

## Email

| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_ENABLED` | Enable email sending | `true` |
| `EMAIL_PROVIDER` | Provider: `smtp` or `sendgrid` | `smtp` |
| `EMAIL_FROM` | Sender email address | `noreply@naashah.com` |
| `EMAIL_FROM_NAME` | Sender display name | `Naashah` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS | `false` |
| `SMTP_USER` | SMTP username | `user@gmail.com` |
| `SMTP_PASS` | SMTP password/app password | `xxxx xxxx xxxx xxxx` |
| `SENDGRID_API_KEY` | (If using SendGrid) | `SG.xxxxx` |

## SMS (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMS_ENABLED` | Enable SMS sending | `false` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `xxxxx` |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | `+1234567890` |

## Push Notifications (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `VAPID_PUBLIC_KEY` | Web Push public key | Generate with: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web Push private key | (same command as above) |
| `VITE_VAPID_PUBLIC_KEY` | Same as VAPID_PUBLIC_KEY (for frontend) | Same value |
| `FIREBASE_PRIVATE_KEY` | Firebase service account JSON | `{"type":"service_account",...}` |

## Payments (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `MOYASAR_SECRET_KEY` | Moyasar secret key | `sk_test_xxxxx` |
| `VITE_MOYASAR_PUBLISHABLE_KEY` | Moyasar publishable key | `pk_test_xxxxx` |

## AI/LLM (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `BUILT_IN_FORGE_API_URL` | OpenAI-compatible API URL | `https://api.openai.com` |
| `BUILT_IN_FORGE_API_KEY` | API key for LLM | `sk-xxxxx` |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend LLM API URL | Same as above |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend LLM API key | Same as above |

## Analytics (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_ANALYTICS_ENDPOINT` | Analytics server URL | `https://analytics.naashah.com` |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID | `xxxxx` |

## Meta/Facebook (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `META_CAPI_ACCESS_TOKEN` | Meta Conversions API token | `xxxxx` |

## Frontend Branding

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_TITLE` | Application title | `Naashah` |
| `VITE_APP_LOGO` | Logo path | `/logo.webp` |
