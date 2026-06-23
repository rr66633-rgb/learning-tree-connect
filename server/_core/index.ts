import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { rateLimit } from "express-rate-limit";
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
  // Trust proxy for correct IP detection behind reverse proxy
  app.set('trust proxy', 1);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Rate limiting for auth-related tRPC procedures
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 login attempts per 15 min per IP
    message: { error: "تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار 15 دقيقة." },
    standardHeaders: true,
    legacyHeaders: false,
    // Use default keyGenerator (req.ip) which handles IPv6 properly
  });

  // Apply rate limit to auth endpoints
  app.use('/api/trpc/auth.login', authRateLimit);
  app.use('/api/trpc/auth.register', authRateLimit);
  app.use('/api/trpc/auth.requestPasswordReset', authRateLimit);
  app.use('/api/trpc/auth.verifyOtp', authRateLimit);

  // General API rate limit (more permissive)
  const generalRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', generalRateLimit);

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
      
      // Auto-resize and optimize profile photos
      const sharp = (await import('sharp')).default;
      const optimizedBuffer = await sharp(fileBuffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      
      const fileName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { url } = await storagePut(fileName, optimizedBuffer, 'image/jpeg');
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
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
      if (!allowedTypes.includes(file.mimetype)) { res.status(400).json({ error: 'نوع الملف غير مدعوم' }); return; }
      const { storagePut } = await import('../storage');
      const sharp = (await import('sharp')).default;
      
      // Auto-resize and optimize: max 800x800, JPEG quality 85, auto-rotate based on EXIF
      const optimizedBuffer = await sharp(file.buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      
      const fileName = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { url } = await storagePut(fileName, optimizedBuffer, 'image/jpeg');
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

  // Logo upload endpoint - preserves transparency (PNG), optimized for logos
  app.post('/api/upload-logo', upload.single('file'), async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!user) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      const file = (req as any).file;
      if (!file) { res.status(400).json({ error: 'لم يتم إرفاق ملف' }); return; }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.mimetype)) { res.status(400).json({ error: 'نوع الملف غير مدعوم. يرجى رفع صور PNG أو JPG أو SVG' }); return; }
      const { storagePut } = await import('../storage');
      
      let finalBuffer = file.buffer;
      let finalMime = file.mimetype;
      let ext = 'png';
      
      // For SVG, store as-is
      if (file.mimetype === 'image/svg+xml') {
        ext = 'svg';
        finalMime = 'image/svg+xml';
      } else {
        // For raster images, optimize with sharp - preserve transparency
        const sharp = (await import('sharp')).default;
        finalBuffer = await sharp(file.buffer)
          .rotate()
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .png({ quality: 90, compressionLevel: 6 })
          .toBuffer();
        finalMime = 'image/png';
        ext = 'png';
      }
      
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(fileName, finalBuffer, finalMime);
      res.json({ url });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ error: 'فشل رفع الشعار' });
    }
  });

  // Media upload endpoint (photos + videos with larger size limit)
  const uploadMedia = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
  app.post('/api/upload-media', uploadMedia.single('file'), async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: '\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' }); return; }
      if (!user) { res.status(401).json({ error: '\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' }); return; }
      const file = (req as any).file;
      if (!file) { res.status(400).json({ error: '\u0644\u0645 \u064a\u062a\u0645 \u0625\u0631\u0641\u0627\u0642 \u0645\u0644\u0641' }); return; }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'];
      if (!allowedTypes.includes(file.mimetype)) { res.status(400).json({ error: '\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 \u063a\u064a\u0631 \u0645\u062f\u0639\u0648\u0645. \u064a\u0631\u062c\u0649 \u0631\u0641\u0639 \u0635\u0648\u0631 (JPG, PNG, HEIC) \u0623\u0648 \u0641\u064a\u062f\u064a\u0648 (MP4, MOV)' }); return; }
      const { storagePut } = await import('../storage');
      const ext = file.originalname.split('.').pop() || 'jpg';
      const isVideo = file.mimetype.startsWith('video/');
      const folder = isVideo ? 'videos' : 'photos';
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(fileName, file.buffer, file.mimetype);
      res.json({ url, mimeType: file.mimetype, fileSize: file.size, type: isVideo ? 'video' : 'photo' });
    } catch (error) {
      console.error('Media upload error:', error);
      res.status(500).json({ error: '\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641' });
    }
  });

  // Multiple media upload endpoint
  app.post('/api/upload-media-batch', uploadMedia.array('files', 20), async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: '\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' }); return; }
      if (!user) { res.status(401).json({ error: '\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' }); return; }
      const files = (req as any).files as any[];
      if (!files || files.length === 0) { res.status(400).json({ error: '\u0644\u0645 \u064a\u062a\u0645 \u0625\u0631\u0641\u0627\u0642 \u0645\u0644\u0641\u0627\u062a' }); return; }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'];
      const { storagePut } = await import('../storage');
      const results = [];
      for (const file of files) {
        if (!allowedTypes.includes(file.mimetype)) continue;
        const ext = file.originalname.split('.').pop() || 'jpg';
        const isVideo = file.mimetype.startsWith('video/');
        const folder = isVideo ? 'videos' : 'photos';
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(fileName, file.buffer, file.mimetype);
        results.push({ url, mimeType: file.mimetype, fileSize: file.size, type: isVideo ? 'video' : 'photo' });
      }
      res.json({ files: results });
    } catch (error) {
      console.error('Batch media upload error:', error);
      res.status(500).json({ error: '\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641\u0627\u062a' });
    }
  });

  // Scheduled tasks (Heartbeat cron callbacks)
  app.post('/api/scheduled/daily-backup', async (req, res) => {
    const { dailyBackupHandler } = await import('../backup');
    await dailyBackupHandler(req, res);
  });

  app.post('/api/scheduled/pickup-escalation', async (req, res) => {
    const { pickupEscalationHandler } = await import('../pickup-escalation');
    await pickupEscalationHandler(req, res);
  });

  app.post('/api/scheduled/event-reminders', async (req, res) => {
    const { eventRemindersHandler } = await import('../event-reminders-handler');
    await eventRemindersHandler(req, res);
  });

  // PDF Generation API
  // PDF generation is now handled client-side using browser's native print-to-PDF
  // No server-side endpoint needed

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
