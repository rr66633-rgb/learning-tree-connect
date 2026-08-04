// Storage helpers - Amazon S3 (or any S3-compatible provider: Cloudflare R2,
// Backblaze B2, MinIO, etc).
// Uploads go directly to the bucket via the AWS SDK.
// Downloads return /manus-storage/{key} paths (path kept unchanged for
// backward compatibility with an existing hardcoded reference in the client),
// served via a 307 redirect to a short-lived signed URL -- see
// server/_core/storageProxy.ts.
//
// This replaces the Manus-proprietary "Forge" storage backend this project
// used while hosted on Manus. @aws-sdk/client-s3 and
// @aws-sdk/s3-request-presigner were already declared as dependencies but
// unused; this file is now what actually uses them.

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let _client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_client) return _client;

  if (
    !ENV.s3Bucket ||
    !ENV.s3Region ||
    !ENV.s3AccessKeyId ||
    !ENV.s3SecretAccessKey
  ) {
    throw new Error(
      "Storage config missing: set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY",
    );
  }

  _client = new S3Client({
    region: ENV.s3Region,
    endpoint: ENV.s3Endpoint || undefined,
    forcePathStyle: ENV.s3ForcePathStyle,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
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
      Bucket: ENV.s3Bucket,
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
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: 300 }, // 5 minutes -- matches the short-lived nature of the old Forge presign
  );
}
