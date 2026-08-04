/**
 * Standalone S3 Storage Module
 * Replaces the Forge-based storage with direct AWS S3 integration.
 * Works with any S3-compatible service (AWS, DigitalOcean Spaces, MinIO, etc.)
 * 
 * Required env vars:
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 * Optional:
 *   S3_ENDPOINT (for non-AWS S3-compatible services)
 *   S3_PUBLIC_URL (custom CDN/public URL prefix)
 */
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT; // Optional: for DigitalOcean Spaces, MinIO, etc.

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 config missing: set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
    );
  }

  return { bucket, region, accessKeyId, secretAccessKey, endpoint };
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    const { region, accessKeyId, secretAccessKey, endpoint } = getS3Config();
    _client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }
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

/**
 * Upload a file to S3
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { bucket } = getS3Config();
  const client = getClient();
  const key = appendHashSuffix(normalizeKey(relKey));

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: `/storage/${key}` };
}

/**
 * Get a presigned URL for downloading a file from S3
 */
export async function storageGetSignedUrl(relKey: string, expiresIn = 3600): Promise<string> {
  const { bucket } = getS3Config();
  const client = getClient();
  const key = normalizeKey(relKey);

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Check if a file exists in S3
 */
export async function storageExists(relKey: string): Promise<boolean> {
  const { bucket } = getS3Config();
  const client = getClient();
  const key = normalizeKey(relKey);

  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file content from S3 as a stream
 */
export async function storageGetStream(relKey: string): Promise<{
  stream: ReadableStream | NodeJS.ReadableStream;
  contentType: string;
  contentLength: number;
} | null> {
  const { bucket } = getS3Config();
  const client = getClient();
  const key = normalizeKey(relKey);

  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    if (!response.Body) return null;
    return {
      stream: response.Body as NodeJS.ReadableStream,
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength || 0,
    };
  } catch {
    return null;
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}
