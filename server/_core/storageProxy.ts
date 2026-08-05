import type { Express } from "express";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!S3_BUCKET || !S3_ACCESS_KEY_ID) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const client = getS3Client();
      const result = await client.send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
      );

      if (!result.Body) {
        res.status(404).send("File not found");
        return;
      }

      if (result.ContentType) {
        res.set("Content-Type", result.ContentType);
      }
      if (result.ContentLength) {
        res.set("Content-Length", String(result.ContentLength));
      }
      // Cache for 1 hour on the client, revalidate after -- files are
      // content-hashed on upload (see storagePut's appendHashSuffix), so a
      // given key's content never changes underneath a cached copy.
      res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.set("Access-Control-Allow-Origin", "*");

      // Stream the S3 object directly to the response (not a redirect --
      // avoids cross-origin/CloudFront redirect issues some clients hit).
      const nodeStream = result.Body as NodeJS.ReadableStream;
      nodeStream.pipe(res);
      nodeStream.on("error", (err) => {
        console.error("[StorageProxy] stream error:", err);
        if (!res.headersSent) {
          res.status(500).send("Stream error");
        } else {
          res.end();
        }
      });
    } catch (err: any) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
        res.status(404).send("File not found");
        return;
      }
      console.error("[StorageProxy] failed:", err);
      if (!res.headersSent) {
        res.status(502).send("Storage proxy error");
      }
    }
  });
}
