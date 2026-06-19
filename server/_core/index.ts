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

  // File upload endpoint - handles base64 JSON uploads (requires authentication)
  app.post('/api/upload', async (req, res) => {
    try {
      // Verify authentication
      const { sdk } = await import('./sdk');
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch (e) {
        res.status(401).json({ error: 'يجب تسجيل الدخول لرفع الملفات' });
        return;
      }
      if (!user) {
        res.status(401).json({ error: 'يجب تسجيل الدخول لرفع الملفات' });
        return;
      }
      const { storagePut } = await import('../storage');
      const jsonBody = req.body;
      if (!jsonBody || !jsonBody.data) {
        res.status(400).json({ error: 'Missing data field' });
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
      const contentType = jsonBody.contentType || 'image/jpeg';
      if (!allowedTypes.includes(contentType)) {
        res.status(400).json({ error: 'نوع الملف غير مدعوم' });
        return;
      }
      // Decode and validate file size (max 10MB)
      const fileBuffer = Buffer.from(jsonBody.data, 'base64');
      if (fileBuffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)' });
        return;
      }
      const fileName = jsonBody.fileName || `upload-${Date.now()}.jpg`;
      const { url } = await storagePut(`uploads/${fileName}`, fileBuffer, contentType);
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'فشل رفع الملف' });
    }
  });

  // FormData file upload endpoint for photos
  const multer = (await import('multer')).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post('/api/upload-photo', upload.single('file'), async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!user) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      const file = (req as any).file;
      if (!file) { res.status(400).json({ error: 'لم يتم إرفاق ملف' }); return; }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) { res.status(400).json({ error: 'نوع الملف غير مدعوم' }); return; }
      const { storagePut } = await import('../storage');
      const ext = file.originalname.split('.').pop() || 'jpg';
      const fileName = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(fileName, file.buffer, file.mimetype);
      res.json({ url });
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ error: 'فشل رفع الصورة' });
    }
  });

  app.post('/api/upload-document', upload.single('file'), async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!user) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      const file = (req as any).file;
      if (!file) { res.status(400).json({ error: 'لم يتم إرفاق ملف' }); return; }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.mimetype)) { res.status(400).json({ error: 'نوع الملف غير مدعوم. يرجى رفع صور أو PDF أو Word' }); return; }
      const { storagePut } = await import('../storage');
      const ext = file.originalname.split('.').pop() || 'pdf';
      const key = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, file.buffer, file.mimetype);
      res.json({ url, key, mimeType: file.mimetype });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'فشل رفع المستند' });
    }
  });

  // Scheduled tasks (Heartbeat cron callbacks)
  app.post('/api/scheduled/daily-backup', async (req, res) => {
    const { dailyBackupHandler } = await import('../backup');
    await dailyBackupHandler(req, res);
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
