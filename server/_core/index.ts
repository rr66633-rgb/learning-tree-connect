import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // File upload endpoint
  app.post('/api/upload', async (req, res) => {
    try {
      const { storagePut } = await import('../storage');
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        const body = Buffer.concat(chunks);
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
          // Handle base64 JSON upload
          try {
            const jsonBody = JSON.parse(body.toString());
            const fileBuffer = Buffer.from(jsonBody.data, 'base64');
            const fileName = jsonBody.fileName || `upload-${Date.now()}.jpg`;
            const contentType = jsonBody.contentType || 'image/jpeg';
            const { url } = await storagePut(`uploads/${fileName}`, fileBuffer, contentType);
            res.json({ url });
          } catch (e) {
            res.status(400).json({ error: 'Invalid upload format' });
          }
          return;
        }
        // Simple multipart parser
        const boundaryBuffer = Buffer.from(`--${boundary}`);
        const parts = [];
        let start = body.indexOf(boundaryBuffer) + boundaryBuffer.length;
        while (start < body.length) {
          const end = body.indexOf(boundaryBuffer, start);
          if (end === -1) break;
          parts.push(body.slice(start, end));
          start = end + boundaryBuffer.length;
        }
        if (parts.length === 0) {
          res.status(400).json({ error: 'No file found' });
          return;
        }
        const part = parts[0];
        const headerEnd = part.indexOf('\r\n\r\n');
        const fileData = part.slice(headerEnd + 4, part.length - 2);
        const headers = part.slice(0, headerEnd).toString();
        const nameMatch = headers.match(/filename="([^"]+)"/);
        const fileName = nameMatch?.[1] || `upload-${Date.now()}.jpg`;
        const ctMatch = headers.match(/Content-Type:\s*(.+)/i);
        const contentType = ctMatch?.[1]?.trim() || 'image/jpeg';
        const { url } = await storagePut(`uploads/${fileName}`, fileData, contentType);
        res.json({ url });
      });
    } catch (error) {
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
