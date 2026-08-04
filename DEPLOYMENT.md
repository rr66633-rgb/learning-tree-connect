# Deploying Nashaa outside Manus

This covers moving `learning-tree-connect` (naashah.com) off Manus to Railway
or Render, running independently.

**Note:** `pnpm-lock.yaml` was intentionally left untouched by this change
(the live repo's dependencies have moved on since this guide was written --
e.g. Firebase was added independently -- and hand-editing a lockfile you
haven't just generated risks corrupting it). After pulling these changes,
run `pnpm install` once to regenerate the lockfile cleanly; it will drop the
two removed devDependencies (`@builder.io/vite-plugin-jsx-loc`,
`vite-plugin-manus-runtime`) and leave everything else as-is.

## What changed to make this possible

The app talked to Manus's own infrastructure in more places than just file
storage. Here's everything that was Manus-only, and what replaced it:

1. **File storage** (photos, logos, documents). Went through Manus's
   proprietary "Forge" API (`BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY`).
   Replaced with real S3-compatible storage (`server/storage.ts`,
   `server/_core/storageProxy.ts`) using `@aws-sdk/client-s3` /
   `@aws-sdk/s3-request-presigner` -- both were already in `package.json`
   but unused. Works with Amazon S3, Cloudflare R2, Backblaze B2, or MinIO.
   **Fully fixed, no limitation.**
2. **AI features** (weekly plans, development/engagement suggestions,
   marketing content -- `server/_core/llm.ts`). Went through Manus's LLM
   proxy, which is OpenAI-compatible, so this now uses a real `OPENAI_API_KEY`
   directly when set. **Fixed** -- just add a real OpenAI key.
3. **New-registration / demo-request owner alerts**
   (`server/_core/notification.ts`). Previously *required* Forge and would
   throw an error blocking the whole registration if Forge wasn't
   configured -- a real bug, not just a Manus dependency, since it
   contradicted its own documented "fail gracefully" contract. Now falls
   back to emailing `ADMIN_NOTIFICATION_EMAIL`. **Fixed.**
4. **Scheduled/cron tasks** (`/api/scheduled/*`: daily backup, pickup
   escalation, event reminders, account cleanup, enrollment expiry,
   evaluation reminders). Manus's own internal scheduler called these on a
   cron; nothing calls them once you leave Manus, and -- this part isn't a
   Manus dependency, it's a genuine gap -- they had **no authentication at
   all**, meaning anyone who found the URL could trigger them once exposed
   on a public domain. Added a `CRON_SECRET` bearer-token check. **You need
   to set up your own external cron caller** -- see below.
5. **AI poster background generation** (`server/posterGenerator.ts` via
   `server/_core/imageGeneration.ts`). Uses a Manus-specific
   image-generation protocol with no drop-in replacement (unlike the chat
   endpoint, this one isn't OpenAI-compatible). **Not fixed** -- this one
   optional feature will error out unless you still have Forge access. Not
   used anywhere else in the app.
6. **Google Maps proxy and voice transcription**
   (`server/_core/map.ts`, `server/_core/voiceTranscription.ts`). Also went
   through Forge, but neither is actually called from anywhere in the app
   today -- confirmed via a full repo search. **No action needed**; if you
   ever wire either up, it'll need a real Google Maps key / Whisper-compatible
   key respectively at that point.
7. **Vite editor plugins** (`vite-plugin-manus-runtime`, a local "Manus
   debug collector"). Only useful inside Manus's own web editor. Removed
   from `vite.config.ts`; the build is unaffected. **Fixed.**

Everything else -- login (JWT session cookies, not Manus OAuth --
`registerOAuthRoutes` was already dead code), the MySQL schema, the tRPC
API, the React frontend -- has no Manus dependency and needed no changes.

A `/api/health` endpoint was added for the platforms' health checks.

## Prerequisites

- The domain `naashah.com` (you already own this).
- A MySQL database. **Note:** Render's managed database product is
  PostgreSQL only -- it does not offer managed MySQL. Railway does, natively.
  See the two options below.
- An S3-compatible storage bucket for uploaded files (Cloudflare R2's free
  tier is generous and has no egress fees; plain AWS S3 also works).
- This repository, with `Dockerfile`, `.env.example`, `railway.json`, and
  `render.yaml` at the root (already included).

## Option A: Railway (simplest -- one platform for app + database)

1. Create a new Railway project, then **+ New → Deploy from GitHub repo**
   (push this repo to GitHub first if you haven't).
2. **+ New → Database → Add MySQL** in the same project. Railway deploys it
   from the official `mysql` Docker image and exposes `MYSQL_URL` and
   friends automatically.
3. On the app service, open **Variables** and add everything from
   `.env.example`. For `DATABASE_URL`, reference the MySQL service's
   `MYSQL_URL` variable (Railway lets you reference another service's
   variable directly instead of retyping it).
4. Railway auto-detects `Dockerfile` and `railway.json` at the repo root --
   no extra build configuration needed. It also reads `healthcheckPath` from
   `railway.json` for zero-downtime deploys.
5. Add a **Pre-Deploy Command**: `pnpm run db:push` -- this runs the Drizzle
   migrations against the database before each deploy goes live, so schema
   changes ship automatically.
6. Add your custom domain: service **Settings → Networking → Custom Domain**,
   enter `naashah.com` and `www.naashah.com`, then create the CNAME record
   Railway gives you at your DNS provider.

## Option B: Render (app on Render, MySQL elsewhere)

Render only offers managed PostgreSQL, so provision MySQL separately first,
for example PlanetScale (MySQL-compatible, generous free tier) or any VPS/
managed MySQL host. Copy its connection string for the next step.

1. Push this repo to GitHub, then in Render: **New → Blueprint**, point it at
   the repo. Render reads `render.yaml` automatically and creates the web
   service using the `Dockerfile`.
2. Render will prompt for every variable marked `sync: false` in
   `render.yaml` (DATABASE_URL, the S3 credentials, email/SMS/payment keys).
   Paste in your MySQL connection string and the rest from `.env.example`.
   `JWT_SECRET` is auto-generated by the blueprint.
3. Add a **Pre-Deploy Command** in the service settings: `pnpm run db:push`.
4. Custom domain: service **Settings → Custom Domains**, add `naashah.com`,
   then create the CNAME/A records Render shows you at your DNS provider.

## Object storage setup (either platform)

1. Create a bucket (S3, R2, or B2). Note the bucket name, region (R2 uses
   `auto`), and endpoint URL if not real AWS S3.
2. Create an access key with read/write permissions scoped to that bucket.
3. Set `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
   For R2/B2/MinIO, also set `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE=true`.
4. No bucket CORS configuration is needed -- uploads go server-to-bucket
   (never directly from the browser), and downloads are plain `<img>` tags
   following a redirect, which don't trigger CORS preflight requests.
5. The bucket can stay private. `server/_core/storageProxy.ts` issues
   short-lived (5 minute) signed URLs on every request, so files are never
   permanently public.

## Scheduled tasks (cron) setup

Set `CRON_SECRET` to a long random value, then configure something to POST
to each of these six URLs on the schedule you want, with header
`Authorization: Bearer <CRON_SECRET>`:

- `/api/scheduled/daily-backup` -- daily
- `/api/scheduled/pickup-escalation` -- frequently, e.g. every 5-15 minutes
- `/api/scheduled/event-reminders` -- daily
- `/api/scheduled/account-cleanup` -- daily
- `/api/scheduled/enrollment-expiry` -- daily
- `/api/scheduled/evaluation-reminder` -- daily

Options for the caller: Railway's built-in [cron jobs](https://docs.railway.com/guides/cron-jobs)
(a service running on a schedule that just does `curl`), Render's
[cron jobs](https://render.com/docs/cronjobs) service type, or a free
external service like cron-job.org pointed at your public URL. If
`CRON_SECRET` is left unset the routes still work unauthenticated -- fine
for an initial test, but set it before real users are on the system.

## First deploy checklist

1. Set every variable from `.env.example` relevant to your setup (the
   email/SMS/payment ones are optional -- leave them blank if unused, the
   app degrades gracefully and just skips that feature).
2. Deploy. Watch the build logs; `pnpm run db:push` should run and create
   all tables from `drizzle/` from scratch against the fresh database.
3. Visit `https://naashah.com/api/health` -- should return
   `{"status":"ok"}`.
4. Create a test admin account, log in, create a calendar event, and upload
   a child photo or the center logo to confirm both the database and
   storage are wired up correctly end to end.
5. Submit a test nursery registration or demo request and confirm you
   receive the owner alert email at `ADMIN_NOTIFICATION_EMAIL` (only if you
   set it -- otherwise the registration still succeeds, you just won't get
   pinged).
6. If you set `OPENAI_API_KEY`, try an AI feature (e.g. generating a weekly
   plan) to confirm it responds. The poster generator's AI image background
   feature will still error out (see above) unless you kept Forge access.
7. Set up the six scheduled-task cron calls (previous section).
8. Once confirmed working, point `naashah.com`'s DNS fully at the new
   platform and decommission the Manus deployment.
