import type { Express } from "express";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { sdk } from "./sdk";

const S3_BUCKET = process.env.S3_BUCKET !;
const S3_REGION = process.env.S3_REGION || "auto";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID !;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY !;
const S3_ENDPOINT = process.env.S3_ENDPOINT !;

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
      res.status(400).json({ error: "الملف غير موجود" });
      return;
    }

    // SECURITY FIX: this route had NO authentication of any kind. Verified
    // against the running app by uploading an image and then fetching its URL
    // with no session at all -- it returned HTTP 200 and the full image. Every
    // child photo, medical document and signed form was therefore readable by
    // anyone holding (or guessing) the URL, forever, with no login. The
    // `Access-Control-Allow-Origin: *` header below made it embeddable from any
    // website too.
    //
    // Uploaded content belongs to a specific nursery and must never be public,
    // so a valid session is now required. Same-origin <img src="/manus-storage/…">
    // requests send the session cookie automatically, so the app's own pages are
    // unaffected.
    let viewer = null;
    try {
      viewer = await sdk.authenticateRequest(req as never);
    } catch {
      viewer = null;
    }
    if (!viewer) {
      res.status(401).json({ error: "يجب تسجيل الدخول" });
      return;
    }

    if (!S3_BUCKET || !S3_ACCESS_KEY_ID) {
      // Never surface storage-provider details to the client.
      console.error("[StorageProxy] storage is not configured (missing bucket/credentials)");
      res.status(503).json({ error: "تعذّر عرض الملف حالياً" });
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
      // `private` (not `public`): the response is tied to one authenticated
      // viewer, so only that viewer's own browser may cache it -- never a shared
      // proxy/CDN, which would otherwise hand one nursery's photo to the next
      // requester. immutable: keys are content-suffixed on upload (see
      // storagePut's appendHashSuffix), so a key's bytes never change and the
      // browser can reuse its copy without revalidating.
      res.set("Cache-Control", "private, max-age=86400, immutable");
      // Deliberately NOT sending Access-Control-Allow-Origin: * -- these are
      // children's photos and documents; they must not be embeddable by
      // arbitrary third-party sites. Same-origin app pages need no CORS header.
      res.set("Cross-Origin-Resource-Policy", "same-origin");
      res.set("X-Content-Type-Options", "nosniff");

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
        res.status(404).json({ error: "الملف غير موجود" });
        return;
      }
      // The underlying SDK error text contains the storage endpoint hostname
      // and provider-specific codes. Log it server-side, return a plain
      // user-facing message -- the client must never learn what the storage
      // backend is.
      console.error("[StorageProxy] failed:", err);
      if (!res.headersSent) {
        res.status(502).json({ error: "تعذّر عرض الملف حالياً" });
      }
    }
  });
}
