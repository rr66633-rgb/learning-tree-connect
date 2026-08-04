import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Stream the file directly instead of 307 redirect
      // This avoids cross-origin issues with CloudFront signed URLs
      const fileResp = await fetch(url);
      if (!fileResp.ok) {
        console.error(`[StorageProxy] S3/CloudFront error: ${fileResp.status} for key: ${key}`);
        res.status(404).send("File not found");
        return;
      }

      // Forward content-type and cache headers
      const contentType = fileResp.headers.get("content-type");
      if (contentType) {
        res.set("Content-Type", contentType);
      }
      const contentLength = fileResp.headers.get("content-length");
      if (contentLength) {
        res.set("Content-Length", contentLength);
      }
      // Cache for 1 hour on the client, revalidate after
      res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.set("Access-Control-Allow-Origin", "*");

      // Pipe the response body to the client
      if (fileResp.body) {
        const reader = fileResp.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        pump().catch((err) => {
          console.error("[StorageProxy] stream error:", err);
          if (!res.headersSent) {
            res.status(500).send("Stream error");
          } else {
            res.end();
          }
        });
      } else {
        // Fallback: read as buffer
        const buffer = await fileResp.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      if (!res.headersSent) {
        res.status(502).send("Storage proxy error");
      }
    }
  });
}
