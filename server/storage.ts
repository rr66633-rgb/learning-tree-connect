// Storage helpers - Cloudflare R2 (S3-compatible)
import { randomUUID } from "node:crypto";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_BUCKET = process.env.S3_BUCKET!;
const S3_REGION = process.env.S3_REGION || "auto";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID!;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY!;
const S3_ENDPOINT = process.env.S3_ENDPOINT!;

export const MEDIA_UPLOAD_LIMITS = {
  photo: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
} as const;

export const MEDIA_CONTENT_TYPES = {
  "image/jpeg": { type: "photo", extension: "jpg" },
  "image/png": { type: "photo", extension: "png" },
  "image/gif": { type: "photo", extension: "gif" },
  "image/webp": { type: "photo", extension: "webp" },
  "image/heic": { type: "photo", extension: "heic" },
  "image/heif": { type: "photo", extension: "heif" },
  "video/mp4": { type: "video", extension: "mp4" },
  "video/quicktime": { type: "video", extension: "mov" },
  "video/webm": { type: "video", extension: "webm" },
} as const;

export type MediaUploadType = "photo" | "video";
export type MediaContentType = keyof typeof MEDIA_CONTENT_TYPES;

export const DIRECT_ASSET_PURPOSES = [
  "photo",
  "document",
  "logo",
  "media",
  "curriculum",
] as const;

export type DirectAssetPurpose = typeof DIRECT_ASSET_PURPOSES[number];

const DIRECT_ASSET_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

const DIRECT_ASSET_LIMITS: Record<DirectAssetPurpose, number> = {
  photo: 10 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  logo: 10 * 1024 * 1024,
  media: 50 * 1024 * 1024,
  curriculum: 20 * 1024 * 1024,
};

export function validateDirectAssetUpload(
  purpose: DirectAssetPurpose,
  contentType: string,
  fileSize: number,
) {
  const extension = DIRECT_ASSET_CONTENT_TYPES[
    contentType as keyof typeof DIRECT_ASSET_CONTENT_TYPES
  ];
  const isImage = contentType.startsWith("image/");
  const isVideo = contentType.startsWith("video/");
  const isDocument = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(contentType);
  const allowedForPurpose =
    (purpose === "photo" && isImage && contentType !== "image/svg+xml") ||
    (purpose === "logo" && isImage) ||
    (purpose === "media" && (isImage || isVideo)) ||
    (purpose === "document" && (isImage || isDocument)) ||
    (purpose === "curriculum" && contentType === "application/pdf");

  if (!extension || !allowedForPurpose) {
    throw new Error("UNSUPPORTED_ASSET_TYPE");
  }
  const maxBytes = DIRECT_ASSET_LIMITS[purpose];
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxBytes) {
    throw new Error("INVALID_ASSET_SIZE");
  }
  return { extension, maxBytes };
}

let _client: S3Client | null = null;
function getS3Client(): S3Client {
  if (_client) return _client;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_ENDPOINT) {
    throw new Error("Storage config missing: set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT");
  }
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

export function getStorageUrl(key: string): string {
  return `/manus-storage/${normalizeKey(key)}`;
}

export function getStorageKey(url: string, fileKey?: string | null): string | null {
  if (fileKey) return normalizeKey(fileKey);
  const prefix = "/manus-storage/";
  if (url.startsWith(prefix)) return normalizeKey(url.slice(prefix.length));

  // Older rows may contain the application's absolute URL instead of the
  // canonical relative path. Recover the R2 key so those files can also be
  // served by a fresh direct signed URL rather than disappearing after a
  // domain/deployment change.
  try {
    const pathname = new URL(url).pathname;
    return pathname.startsWith(prefix)
      ? normalizeKey(pathname.slice(prefix.length))
      : null;
  } catch {
    return null;
  }
}

function appendHashSuffix(relKey: string): string {
  const hash = Math.random().toString(36).slice(2, 10);
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
  const body = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { key, url: getStorageUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: getStorageUrl(key) };
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const key = normalizeKey(relKey);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

export async function storageDelete(relKey: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: normalizeKey(relKey),
  }));
}

export function validateMediaUpload(
  type: MediaUploadType,
  contentType: string,
  fileSize: number,
): { contentType: MediaContentType; extension: string; maxBytes: number } {
  const definition = MEDIA_CONTENT_TYPES[contentType as MediaContentType];
  if (!definition || definition.type !== type) {
    throw new Error("UNSUPPORTED_MEDIA_TYPE");
  }

  const maxBytes = MEDIA_UPLOAD_LIMITS[type];
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxBytes) {
    throw new Error("INVALID_MEDIA_SIZE");
  }

  return {
    contentType: contentType as MediaContentType,
    extension: definition.extension,
    maxBytes,
  };
}

export async function createDirectMediaUpload(input: {
  organizationId: number;
  userId: number;
  type: MediaUploadType;
  contentType: string;
  fileSize: number;
}) {
  const { contentType, extension } = validateMediaUpload(
    input.type,
    input.contentType,
    input.fileSize,
  );
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const folder = input.type === "video" ? "videos" : "photos";
  const key = [
    "media-staging",
    String(input.organizationId),
    folder,
    `${now.getUTCFullYear()}-${month}`,
    `${input.userId}-${randomUUID()}.${extension}`,
  ].join("/");
  const expiresIn = 10 * 60;

  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );

  return {
    uploadUrl,
    fileKey: key,
    storageUrl: getStorageUrl(key),
    viewUrl: await storageGetSignedUrl(key, 60 * 60),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

export async function verifyDirectMediaUpload(input: {
  organizationId: number;
  type: MediaUploadType;
  fileKey: string;
}) {
  const key = normalizeKey(input.fileKey);
  const folder = input.type === "video" ? "videos" : "photos";
  const expectedPrefix = `media-staging/${input.organizationId}/${folder}/`;
  if (!key.startsWith(expectedPrefix) || key.includes("..")) {
    throw new Error("INVALID_MEDIA_KEY");
  }

  const result = await getS3Client().send(new HeadObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  }));
  const contentType = result.ContentType || "";
  const fileSize = result.ContentLength || 0;
  validateMediaUpload(input.type, contentType, fileSize);

  // Promote the verified staging object to an immutable final key inside R2.
  // The bytes never pass through this process; R2 performs the copy internally.
  // A presigned PUT URL can be reused until it expires, so keeping the database
  // pointed at the staging key would let the uploader replace already-published
  // media after verification. Publishing to a separate key closes that window.
  const finalKey = key.replace(/^media-staging\//, "media/");
  const copySource = encodeURIComponent(`${S3_BUCKET}/${key}`).replace(/%2F/g, "/");
  await getS3Client().send(new CopyObjectCommand({
    Bucket: S3_BUCKET,
    Key: finalKey,
    CopySource: copySource,
  }));
  await storageDelete(key);

  return {
    fileKey: finalKey,
    url: getStorageUrl(finalKey),
    mimeType: contentType,
    fileSize,
  };
}

/**
 * Creates a short-lived upload URL for every non-gallery asset in the app.
 * The browser sends the bytes directly to R2; the application server only
 * signs the request and later verifies metadata before publishing the object.
 */
export async function createDirectAssetUpload(input: {
  organizationId: number;
  userId: number;
  purpose: DirectAssetPurpose;
  contentType: string;
  fileSize: number;
}) {
  const { extension } = validateDirectAssetUpload(
    input.purpose,
    input.contentType,
    input.fileSize,
  );
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = [
    "assets-staging",
    String(input.organizationId),
    input.purpose,
    String(input.userId),
    month,
    `${randomUUID()}.${extension}`,
  ].join("/");
  const expiresIn = 10 * 60;
  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn },
  );

  return {
    uploadUrl,
    fileKey: key,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

export async function verifyDirectAssetUpload(input: {
  organizationId: number;
  userId: number;
  purpose: DirectAssetPurpose;
  fileKey: string;
}) {
  const key = normalizeKey(input.fileKey);
  const expectedPrefix = [
    "assets-staging",
    String(input.organizationId),
    input.purpose,
    String(input.userId),
    "",
  ].join("/");
  if (!key.startsWith(expectedPrefix) || key.includes("..") || key.includes("\\")) {
    throw new Error("INVALID_ASSET_KEY");
  }

  const result = await getS3Client().send(new HeadObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  }));
  const contentType = result.ContentType || "";
  const fileSize = result.ContentLength || 0;
  validateDirectAssetUpload(input.purpose, contentType, fileSize);

  // Presigned PUT links remain reusable until expiry. Promote to a different,
  // immutable key so a published child photo/document cannot be replaced by
  // replaying an old upload URL.
  const finalKey = key.replace(/^assets-staging\//, "assets/");
  const copySource = encodeURIComponent(`${S3_BUCKET}/${key}`).replace(/%2F/g, "/");
  await getS3Client().send(new CopyObjectCommand({
    Bucket: S3_BUCKET,
    Key: finalKey,
    CopySource: copySource,
    ContentType: contentType,
    MetadataDirective: "REPLACE",
  }));
  await storageDelete(key);

  return {
    fileKey: finalKey,
    url: getStorageUrl(finalKey),
    mimeType: contentType,
    fileSize,
    type: contentType.startsWith("video/") ? "video" as const : "photo" as const,
  };
}
