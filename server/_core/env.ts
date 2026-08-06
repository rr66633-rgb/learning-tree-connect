export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Object storage (Amazon S3 or any S3-compatible provider: Cloudflare R2,
  // Backblaze B2, MinIO, etc). Replaces the Manus-proprietary "Forge" API
  // this project used while hosted on Manus.
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  // Optional: only needed for S3-compatible providers other than AWS itself
  // (Cloudflare R2, Backblaze B2, MinIO). Leave unset for real AWS S3.
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  // Fallback destination for new-registration/demo-request alerts (see
  // server/_core/notification.ts) when the Manus "Forge" owner-notification
  // service isn't available, e.g. once running outside Manus.
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL ?? "",
  // Shared secret for the /api/scheduled/* cron callback routes (see
  // server/_core/index.ts). While hosted on Manus, only Manus's own
  // internal heartbeat scheduler could reach these; on a public host they
  // need their own auth, or anyone who finds the URL can trigger them.
  cronSecret: process.env.CRON_SECRET ?? "",
  // Optional legacy Manus-compatible fallbacks. Keeping these properties
  // explicit lets callers detect that the fallback is unavailable while real
  // OpenAI/R2 integrations remain the primary path.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // AI chat features (server/_core/llm.ts: weekly plans, development/
  // engagement suggestions, marketing content) previously went through
  // Manus's "Forge" LLM proxy. Set a real OpenAI-compatible key here to run
  // outside Manus -- the request/response shape was already OpenAI's, so
  // this is a drop-in replacement. OPENAI_API_URL defaults to real OpenAI;
  // override to point at any other OpenAI-compatible provider.
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiApiUrl: process.env.OPENAI_API_URL || "https://api.openai.com",
  openaiDefaultModel: process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
};
