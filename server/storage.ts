// Storage helpers - Cloudflare R2 (S3-compatible)
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Use process.env directly with hardcoded fallbacks for R2
const S3_BUCKET = process.env.S3_BUCKET || "naashah-storage";
const S3_REGION = process.env.S3_REGION || "auto";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "0124dd1c7734d75bd7e304bdf980a23a";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "a3e9a76e03376b98da7d31fa1bf0d67aa87d3a881f1be857d2500c04f6e3d0f5";
const S3_ENDPOINT = process.env.S3_ENDPOINT || "https://12f27c10f3facdef54519307c717b23f.r2.cloudflarestorage.com";

let _client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = appendHashSuffix(normalizeKey(relKey));

  const body =
    typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const client = getS3Client();
  const key = normalizeKey(relKey);

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: 300 }, // 5 minutes -- matches the short-lived nature of the old Forge presign
  );
}
