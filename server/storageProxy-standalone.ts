/**
 * Standalone Storage Proxy
 * Serves files from S3 directly without any external Forge dependency.
 * Replaces server/_core/storageProxy.ts for self-hosted deployments.
 * 
 * Mount this on your Express app:
 *   import { registerStorageProxyStandalone } from "./storageProxy-standalone";
 *   registerStorageProxyStandalone(app);
 */
import type { Express, Request, Response } from "express";
import { storageGetStream } from "./storage-standalone";

const STORAGE_PREFIX = "/storage/";

// Content-type mapping by extension
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function getMimeType(key: string): string {
  const ext = key.substring(key.lastIndexOf(".")).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

export function registerStorageProxyStandalone(app: Express) {
  app.get(`${STORAGE_PREFIX}*`, async (req: Request, res: Response) => {
    const key = req.path.slice(STORAGE_PREFIX.length);
    if (!key) {
      res.status(400).json({ error: "Missing storage key" });
      return;
    }

    try {
      const result = await storageGetStream(key);
      if (!result) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const { stream, contentType, contentLength } = result;

      res.setHeader("Content-Type", contentType || getMimeType(key));
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Pipe the S3 stream to the response
      const nodeStream = stream as NodeJS.ReadableStream;
      nodeStream.pipe(res);
      nodeStream.on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Stream error" });
        }
      });
    } catch (error: any) {
      console.error(`[StorageProxy] Error for key: ${key}`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Storage error" });
      }
    }
  });
}
