import type { Express } from "express";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "./env";

let _client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_client) return _client;
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

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (
      !ENV.s3Bucket ||
      !ENV.s3Region ||
      !ENV.s3AccessKeyId ||
      !ENV.s3SecretAccessKey
    ) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const client = getS3Client();
      const result = await client.send(
        new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
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
