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

  // ============ EXCEL/CSV IMPORT ENDPOINTS ============
  const uploadImport = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  app.post('/api/import-staff', uploadImport.single('file'), async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!user) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!['super_admin', 'admin', 'principal'].includes(user.role)) { res.status(403).json({ error: 'ليس لديك صلاحية' }); return; }
      const file = (req as any).file;
      if (!file) { res.status(400).json({ error: 'لم يتم إرفاق ملف' }); return; }
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
      if (!rawData.length) { res.status(400).json({ error: 'الملف فارغ' }); return; }

      // Map Arabic headers to field names
      const headerMap: Record<string, string> = {
        'الاسم الكامل (عربي)': 'fullNameAr', 'الاسم الكامل (إنجليزي)': 'fullNameEn',
        'رقم الهوية': 'nationalId', 'رقم الإقامة': 'iqamaNumber',
        'رقم الجوال': 'mobile', 'البريد الإلكتروني': 'email',
        'المسمى الوظيفي': 'jobTitle', 'القسم': 'department', 'الفرع': 'branch',
        'تاريخ التعيين': 'hireDate', 'الحالة': 'status',
        'الجنسية': 'nationality', 'الجنس': 'gender',
        'نوع العقد': 'contractType', 'المؤهل': 'qualification', 'التخصص': 'specialization',
        'سنوات الخبرة': 'yearsOfExperience', 'الراتب': 'salary',
        'اسم جهة الطوارئ': 'emergencyContactName', 'رقم جهة الطوارئ': 'emergencyContactPhone',
        'صلة جهة الطوارئ': 'emergencyContactRelation',
        'العنوان': 'address', 'المدينة': 'city',
        'اسم البنك': 'bankName', 'رقم الآيبان': 'iban',
        'ملاحظات': 'notes',
      };

      const jobTitleMap: Record<string, string> = {
        'معلمة': 'teacher', 'مشرفة': 'supervisor', 'مديرة': 'principal',
        'مساعدة': 'assistant', 'إدارية': 'admin_staff', 'أخصائية': 'specialist',
        'محاسبة': 'accountant', 'استقبال': 'receptionist', 'سائق': 'driver', 'أخرى': 'other',
      };
      const contractMap: Record<string, string> = {
        'دوام كامل': 'full_time', 'دوام جزئي': 'part_time', 'عقد': 'contract', 'مؤقت': 'temporary',
      };
      const genderMap: Record<string, string> = { 'ذكر': 'male', 'أنثى': 'female' };
      const statusMap: Record<string, string> = {
        'نشط': 'active', 'غير نشط': 'inactive', 'إجازة': 'on_leave', 'منتهي': 'terminated', 'مستقيل': 'resigned',
      };

      // Parse and validate rows
      const results: { row: number; data: any; errors: string[] }[] = [];
      for (let i = 0; i < rawData.length; i++) {
        const raw = rawData[i];
        const mapped: any = {};
        const errors: string[] = [];

        // Map headers
        for (const [key, val] of Object.entries(raw)) {
          const fieldName = headerMap[key] || key;
          mapped[fieldName] = val;
        }

        // Validate required fields
        if (!mapped.fullNameAr && !mapped.fullNameEn) errors.push('الاسم مطلوب');
        if (!mapped.mobile) errors.push('رقم الجوال مطلوب');
        if (!mapped.jobTitle) errors.push('المسمى الوظيفي مطلوب');

        // Map enum values
        if (mapped.jobTitle) mapped.jobTitle = jobTitleMap[mapped.jobTitle] || mapped.jobTitle;
        if (mapped.contractType) mapped.contractType = contractMap[mapped.contractType] || mapped.contractType;
        if (mapped.gender) mapped.gender = genderMap[mapped.gender] || mapped.gender;
        if (mapped.status) mapped.status = statusMap[mapped.status] || mapped.status || 'active';

        // Parse dates
        if (mapped.hireDate && !(mapped.hireDate instanceof Date)) {
          const d = new Date(mapped.hireDate);
          mapped.hireDate = isNaN(d.getTime()) ? null : d;
        }

        results.push({ row: i + 2, data: mapped, errors });
      }

      // If mode=preview, just return parsed data
      if (req.query.mode === 'preview') {
        res.json({ total: results.length, rows: results });
        return;
      }

      // Insert valid rows
      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) { res.status(500).json({ error: 'فشل الاتصال بقاعدة البيانات' }); return; }
      const { users: usersTable, staffProfiles } = await import('../../drizzle/schema');
      const bcrypt = await import('bcryptjs');
      let imported = 0;
      const errors: { row: number; error: string }[] = [];
      const orgId = user.organizationId || 1;

      for (const item of results) {
        if (item.errors.length > 0) { errors.push({ row: item.row, error: item.errors.join(', ') }); continue; }
        try {
          const d = item.data;
          // Create user account
          const openId = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const hashedPw = await bcrypt.hash(d.mobile || '123456', 10);
          const roleForUser = d.jobTitle === 'principal' ? 'principal' : d.jobTitle === 'teacher' ? 'teacher' : d.jobTitle === 'assistant' ? 'assistant' : d.jobTitle === 'accountant' ? 'accountant' : d.jobTitle === 'receptionist' ? 'receptionist' : 'teacher';
          const [newUser] = await db.insert(usersTable).values({
            openId,
            name: d.fullNameAr || d.fullNameEn || 'موظف',
            email: d.email || null,
            phone: d.mobile || null,
            role: roleForUser,
            password: hashedPw,
            nationalId: d.nationalId || null,
            organizationId: orgId,
          }).$returningId();

          // Create staff profile
          await db.insert(staffProfiles).values({
            userId: newUser.id,
            organizationId: orgId,
            fullNameAr: d.fullNameAr || null,
            fullNameEn: d.fullNameEn || null,
            nationalId: d.nationalId || null,
            iqamaNumber: d.iqamaNumber || null,
            mobile: d.mobile || null,
            email: d.email || null,
            jobTitle: d.jobTitle || 'teacher',
            department: d.department || null,
            branch: d.branch || null,
            hireDate: d.hireDate || null,
            status: d.status || 'active',
            nationality: d.nationality || null,
            gender: d.gender || null,
            contractType: d.contractType || 'full_time',
            qualification: d.qualification || null,
            specialization: d.specialization || null,
            yearsOfExperience: d.yearsOfExperience ? parseInt(d.yearsOfExperience) : null,
            salary: d.salary ? String(d.salary) : null,
            emergencyContactName: d.emergencyContactName || null,
            emergencyContactPhone: d.emergencyContactPhone || null,
            emergencyContactRelation: d.emergencyContactRelation || null,
            address: d.address || null,
            city: d.city || null,
            bankName: d.bankName || null,
            iban: d.iban || null,
            notes: d.notes || null,
          });
          imported++;
        } catch (e: any) {
          errors.push({ row: item.row, error: e.message || 'خطأ غير متوقع' });
        }
      }
      res.json({ success: true, imported, failed: errors.length, errors });
    } catch (error: any) {
      console.error('Staff import error:', error);
      res.status(500).json({ error: 'فشل استيراد الملف: ' + (error.message || '') });
    }
  });

  app.post('/api/import-children', uploadImport.single('file'), async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!user) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!['super_admin', 'admin', 'principal'].includes(user.role)) { res.status(403).json({ error: 'ليس لديك صلاحية' }); return; }
      const file = (req as any).file;
      if (!file) { res.status(400).json({ error: 'لم يتم إرفاق ملف' }); return; }
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
      if (!rawData.length) { res.status(400).json({ error: 'الملف فارغ' }); return; }

      const headerMap: Record<string, string> = {
        'الاسم الأول': 'firstName', 'اسم العائلة': 'lastName',
        'الاسم بالعربية': 'arabicName',
        'تاريخ الميلاد': 'dateOfBirth', 'الجنس': 'gender',
        'الجنسية': 'nationality', 'رقم الهوية': 'childNationalId',
        'الفصل': 'className',
        'اسم الأب': 'fatherName', 'اسم الأم': 'motherName',
        'بريد ولي الأمر': 'parentEmail', 'جوال ولي الأمر': 'parentMobile',
        'جوال بديل': 'altPhone', 'العنوان': 'homeAddress',
        'الحساسية': 'allergies', 'الحالات الطبية': 'medicalConditions',
        'الأدوية': 'medications', 'الاحتياجات الخاصة': 'specialNeeds',
        'اسم الطبيب': 'doctorName', 'فصيلة الدم': 'bloodType',
        'ملاحظات طبية': 'medicalNotes',
        'يحتاج نقل': 'busRequired', 'ملاحظات': 'notes',
        'الحالة': 'status', 'تاريخ التسجيل': 'enrollmentDate',
      };
      const genderMap: Record<string, string> = { 'ذكر': 'male', 'أنثى': 'female' };
      const statusMap: Record<string, string> = {
        'نشط': 'active', 'غير نشط': 'inactive', 'متخرج': 'graduated', 'قائمة انتظار': 'waitlist',
      };

      const results: { row: number; data: any; errors: string[] }[] = [];
      for (let i = 0; i < rawData.length; i++) {
        const raw = rawData[i];
        const mapped: any = {};
        const errors: string[] = [];
        for (const [key, val] of Object.entries(raw)) {
          const fieldName = headerMap[key] || key;
          mapped[fieldName] = val;
        }
        if (!mapped.firstName && !mapped.arabicName) errors.push('اسم الطفل مطلوب');
        if (!mapped.dateOfBirth) errors.push('تاريخ الميلاد مطلوب');
        if (!mapped.gender) errors.push('الجنس مطلوب');
        if (mapped.gender) mapped.gender = genderMap[mapped.gender] || mapped.gender;
        if (mapped.status) mapped.status = statusMap[mapped.status] || mapped.status || 'active';
        if (mapped.dateOfBirth && !(mapped.dateOfBirth instanceof Date)) {
          const d = new Date(mapped.dateOfBirth);
          mapped.dateOfBirth = isNaN(d.getTime()) ? null : d;
        }
        if (mapped.enrollmentDate && !(mapped.enrollmentDate instanceof Date)) {
          const d = new Date(mapped.enrollmentDate);
          mapped.enrollmentDate = isNaN(d.getTime()) ? null : d;
        }
        if (mapped.busRequired) mapped.busRequired = mapped.busRequired === 'نعم' || mapped.busRequired === true;
        results.push({ row: i + 2, data: mapped, errors });
      }

      if (req.query.mode === 'preview') {
        res.json({ total: results.length, rows: results });
        return;
      }

      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) { res.status(500).json({ error: 'فشل الاتصال بقاعدة البيانات' }); return; }
      const { children: childrenTable, classes } = await import('../../drizzle/schema');
      let imported = 0;
      const importErrors: { row: number; error: string }[] = [];
      const orgId = user.organizationId || 1;

      // Get classes for mapping
      const allClasses: any[] = await db.select().from(classes);

      for (const item of results) {
        if (item.errors.length > 0) { importErrors.push({ row: item.row, error: item.errors.join(', ') }); continue; }
        try {
          const d = item.data;
          let classId = null;
          if (d.className) {
            const cls = allClasses.find(c => c.name === d.className);
            if (cls) classId = cls.id;
          }
          // Parse name from arabicName if firstName/lastName not provided
          let firstName = d.firstName;
          let lastName = d.lastName;
          if (!firstName && d.arabicName) {
            const parts = d.arabicName.trim().split(/\s+/);
            firstName = parts[0];
            lastName = parts.slice(1).join(' ') || '';
          }
          await db.insert(childrenTable).values({
            firstName: firstName || 'طفل',
            lastName: lastName || '',
            arabicName: d.arabicName || null,
            dateOfBirth: d.dateOfBirth || new Date(),
            gender: d.gender || 'male',
            nationality: d.nationality || null,
            childNationalId: d.childNationalId || null,
            classId,
            enrollmentDate: d.enrollmentDate || new Date(),
            fatherName: d.fatherName || null,
            motherName: d.motherName || null,
            parentEmail: d.parentEmail || null,
            parentMobile: d.parentMobile || null,
            altPhone: d.altPhone || null,
            homeAddress: d.homeAddress || null,
            allergies: d.allergies || null,
            medicalConditions: d.medicalConditions || null,
            medications: d.medications || null,
            specialNeeds: d.specialNeeds || null,
            doctorName: d.doctorName || null,
            bloodType: d.bloodType || null,
            medicalNotes: d.medicalNotes || null,
            busRequired: d.busRequired || false,
            notes: d.notes || null,
            status: d.status || 'active',
            organizationId: orgId,
          });
          imported++;
        } catch (e: any) {
          importErrors.push({ row: item.row, error: e.message || 'خطأ غير متوقع' });
        }
      }
      res.json({ success: true, imported, failed: importErrors.length, errors: importErrors });
    } catch (error: any) {
      console.error('Children import error:', error);
      res.status(500).json({ error: 'فشل استيراد الملف: ' + (error.message || '') });
    }
  });

  // Download template endpoints
  app.get('/api/download-template/staff', async (req, res) => {
    const XLSX = await import('xlsx');
    const headers = [
      'الاسم الكامل (عربي)', 'الاسم الكامل (إنجليزي)', 'رقم الهوية', 'رقم الإقامة',
      'رقم الجوال', 'البريد الإلكتروني', 'المسمى الوظيفي', 'القسم', 'الفرع',
      'تاريخ التعيين', 'الحالة', 'الجنسية', 'الجنس', 'نوع العقد',
      'المؤهل', 'التخصص', 'سنوات الخبرة', 'الراتب',
      'اسم جهة الطوارئ', 'رقم جهة الطوارئ', 'صلة جهة الطوارئ',
      'العنوان', 'المدينة', 'اسم البنك', 'رقم الآيبان', 'ملاحظات'
    ];
    const sampleRow = [
      'فاطمة أحمد العلي', 'Fatima Ahmad', '1234567890', '',
      '0501234567', 'fatima@example.com', 'معلمة', 'التعليم', 'الفرع الرئيسي',
      '2024-01-15', 'نشط', 'سعودية', 'أنثى', 'دوام كامل',
      'بكالوريوس تربية', 'رياض أطفال', '5', '8000',
      'محمد أحمد', '0559876543', 'أخ',
      'الرياض - حي النزهة', 'الرياض', 'بنك الراجحي', 'SA1234567890123456789012', ''
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الموظفين');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="staff_template.xlsx"');
    res.send(buf);
  });

  app.get('/api/download-template/children', async (req, res) => {
    const XLSX = await import('xlsx');
    const headers = [
      'الاسم الأول', 'اسم العائلة', 'الاسم بالعربية', 'تاريخ الميلاد', 'الجنس',
      'الجنسية', 'رقم الهوية', 'الفصل',
      'اسم الأب', 'اسم الأم', 'بريد ولي الأمر', 'جوال ولي الأمر', 'جوال بديل', 'العنوان',
      'الحساسية', 'الحالات الطبية', 'الأدوية', 'الاحتياجات الخاصة',
      'اسم الطبيب', 'فصيلة الدم', 'ملاحظات طبية',
      'يحتاج نقل', 'ملاحظات', 'الحالة', 'تاريخ التسجيل'
    ];
    const sampleRow = [
      'محمد', 'العلي', 'محمد عبدالله العلي', '2021-03-15', 'ذكر',
      'سعودي', '1234567890', 'روضة 1',
      'عبدالله العلي', 'نورة العلي', 'parent@example.com', '0501234567', '0559876543', 'الرياض',
      '', '', '', '',
      'د. أحمد', 'A+', '',
      'لا', '', 'نشط', '2024-09-01'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأطفال');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="children_template.xlsx"');
    res.send(buf);
  });

  // ============ EXPORT ENDPOINTS ============
  app.get('/api/export-staff', async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!user) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!['super_admin', 'admin', 'principal'].includes(user.role)) { res.status(403).json({ error: 'ليس لديك صلاحية' }); return; }

      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) { res.status(500).json({ error: 'فشل الاتصال بقاعدة البيانات' }); return; }
      const { staffProfiles, users: usersTable } = await import('../../drizzle/schema');
      const { eq, and, like } = await import('drizzle-orm');

      // Build filter conditions
      const conditions: any[] = [eq(staffProfiles.organizationId, user.organizationId || 1)];
      const { status, jobTitle, contractType, department } = req.query as any;
      if (status) conditions.push(eq(staffProfiles.status, status));
      if (jobTitle) conditions.push(eq(staffProfiles.jobTitle, jobTitle));
      if (contractType) conditions.push(eq(staffProfiles.contractType, contractType));
      if (department) conditions.push(like(staffProfiles.department, `%${department}%`));

      const staffData = await db.select({
        fullNameAr: staffProfiles.fullNameAr,
        fullNameEn: staffProfiles.fullNameEn,
        nationalId: staffProfiles.nationalId,
        iqamaNumber: staffProfiles.iqamaNumber,
        mobile: staffProfiles.mobile,
        email: staffProfiles.email,
        jobTitle: staffProfiles.jobTitle,
        department: staffProfiles.department,
        branch: staffProfiles.branch,
        hireDate: staffProfiles.hireDate,
        status: staffProfiles.status,
        nationality: staffProfiles.nationality,
        gender: staffProfiles.gender,
        contractType: staffProfiles.contractType,
        qualification: staffProfiles.qualification,
        specialization: staffProfiles.specialization,
        yearsOfExperience: staffProfiles.yearsOfExperience,
        salary: staffProfiles.salary,
        emergencyContactName: staffProfiles.emergencyContactName,
        emergencyContactPhone: staffProfiles.emergencyContactPhone,
        emergencyContactRelation: staffProfiles.emergencyContactRelation,
        address: staffProfiles.address,
        city: staffProfiles.city,
        bankName: staffProfiles.bankName,
        iban: staffProfiles.iban,
        notes: staffProfiles.notes,
      }).from(staffProfiles).where(and(...conditions));

      // Map enum values to Arabic
      const jobTitleMapReverse: Record<string, string> = {
        'teacher': 'معلمة', 'supervisor': 'مشرفة', 'principal': 'مديرة',
        'assistant': 'مساعدة', 'admin_staff': 'إدارية', 'specialist': 'أخصائية',
        'accountant': 'محاسبة', 'receptionist': 'استقبال', 'driver': 'سائق', 'other': 'أخرى',
      };
      const contractMapReverse: Record<string, string> = {
        'full_time': 'دوام كامل', 'part_time': 'دوام جزئي', 'contract': 'عقد', 'temporary': 'مؤقت',
      };
      const genderMapReverse: Record<string, string> = { 'male': 'ذكر', 'female': 'أنثى' };
      const statusMapReverse: Record<string, string> = {
        'active': 'نشط', 'inactive': 'غير نشط', 'on_leave': 'إجازة', 'terminated': 'منتهي', 'resigned': 'مستقيل',
      };

      const headers = [
        'الاسم الكامل (عربي)', 'الاسم الكامل (إنجليزي)', 'رقم الهوية', 'رقم الإقامة',
        'رقم الجوال', 'البريد الإلكتروني', 'المسمى الوظيفي', 'القسم', 'الفرع',
        'تاريخ التعيين', 'الحالة', 'الجنسية', 'الجنس',
        'نوع العقد', 'المؤهل', 'التخصص', 'سنوات الخبرة', 'الراتب',
        'اسم جهة الطوارئ', 'رقم جهة الطوارئ', 'صلة جهة الطوارئ',
        'العنوان', 'المدينة', 'اسم البنك', 'رقم الآيبان', 'ملاحظات'
      ];

      const rows = staffData.map(s => [
        s.fullNameAr || '', s.fullNameEn || '', s.nationalId || '', s.iqamaNumber || '',
        s.mobile || '', s.email || '', jobTitleMapReverse[s.jobTitle] || s.jobTitle || '', s.department || '', s.branch || '',
        s.hireDate ? new Date(s.hireDate).toISOString().split('T')[0] : '', statusMapReverse[s.status] || s.status || '',
        s.nationality || '', genderMapReverse[s.gender || ''] || s.gender || '',
        contractMapReverse[s.contractType || ''] || s.contractType || '', s.qualification || '', s.specialization || '',
        s.yearsOfExperience?.toString() || '', s.salary?.toString() || '',
        s.emergencyContactName || '', s.emergencyContactPhone || '', s.emergencyContactRelation || '',
        s.address || '', s.city || '', s.bankName || '', s.iban || '', s.notes || '',
      ]);

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الموظفين');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="staff_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (error: any) {
      console.error('Export staff error:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء التصدير' });
    }
  });

  app.get('/api/export-children', async (req, res) => {
    try {
      const { sdk } = await import('./sdk');
      let user;
      try { user = await sdk.authenticateRequest(req); } catch (e) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!user) { res.status(401).json({ error: 'يجب تسجيل الدخول' }); return; }
      if (!['super_admin', 'admin', 'principal', 'teacher'].includes(user.role)) { res.status(403).json({ error: 'ليس لديك صلاحية' }); return; }

      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) { res.status(500).json({ error: 'فشل الاتصال بقاعدة البيانات' }); return; }
      const { children, classes } = await import('../../drizzle/schema');
      const { eq, and, like } = await import('drizzle-orm');

      // Build filter conditions
      const conditions: any[] = [eq(children.organizationId, user.organizationId || 1)];
      const { status: statusFilter, classId, gender: genderFilter, ageGroup } = req.query as any;
      if (statusFilter) conditions.push(eq(children.status, statusFilter));
      if (classId) conditions.push(eq(children.classId, parseInt(classId)));
      if (genderFilter) conditions.push(eq(children.gender, genderFilter));

      // Get classes for name mapping
      const allClasses = await db.select({ id: classes.id, name: classes.name, nameAr: classes.nameAr }).from(classes);
      const classMap = new Map(allClasses.map(c => [c.id, c.nameAr || c.name]));

      const childrenData = await db.select().from(children).where(and(...conditions));

      // Filter by age group if specified
      let filteredChildren = childrenData;
      if (ageGroup) {
        const now = new Date();
        filteredChildren = childrenData.filter(c => {
          const age = (now.getTime() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (ageGroup === 'infant') return age < 1;
          if (ageGroup === 'toddler') return age >= 1 && age < 2;
          if (ageGroup === 'preschool') return age >= 2 && age < 4;
          if (ageGroup === 'kg') return age >= 4 && age < 6;
          return true;
        });
      }

      const genderMapReverse: Record<string, string> = { 'male': 'ذكر', 'female': 'أنثى' };
      const statusMapReverse: Record<string, string> = {
        'active': 'نشط', 'inactive': 'غير نشط', 'graduated': 'متخرج', 'waitlist': 'قائمة انتظار',
      };

      const headers = [
        'الاسم الأول', 'اسم العائلة', 'الاسم بالعربية', 'تاريخ الميلاد', 'الجنس',
        'الجنسية', 'رقم الهوية', 'الفصل',
        'اسم الأب', 'اسم الأم', 'بريد ولي الأمر', 'جوال ولي الأمر', 'جوال بديل', 'العنوان',
        'الحساسية', 'الحالات الطبية', 'الأدوية', 'الاحتياجات الخاصة',
        'اسم الطبيب', 'فصيلة الدم', 'ملاحظات طبية',
        'يحتاج نقل', 'ملاحظات', 'الحالة', 'تاريخ التسجيل'
      ];

      const rows = filteredChildren.map(c => [
        c.firstName || '', c.lastName || '', c.arabicName || '',
        c.dateOfBirth ? new Date(c.dateOfBirth).toISOString().split('T')[0] : '',
        genderMapReverse[c.gender] || c.gender || '',
        c.nationality || '', c.childNationalId || '',
        c.classId ? (classMap.get(c.classId) || '') : '',
        c.fatherName || '', c.motherName || '', c.parentEmail || '', c.parentMobile || '', c.altPhone || '', c.homeAddress || '',
        c.allergies || '', c.medicalConditions || '', c.medications || '', c.specialNeeds || '',
        c.doctorName || '', c.bloodType || '', c.medicalNotes || '',
        c.busRequired ? 'نعم' : 'لا', c.notes || '', statusMapReverse[c.status] || c.status || '',
        c.enrollmentDate ? new Date(c.enrollmentDate).toISOString().split('T')[0] : '',
      ]);

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = headers.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الأطفال');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="children_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (error: any) {
      console.error('Export children error:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء التصدير' });
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

// ============ GRACEFUL SHUTDOWN ============
import { closeDb } from "../db";

function gracefulShutdown(signal: string) {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  closeDb().then(() => {
    console.log("[Server] Cleanup complete. Exiting.");
    process.exit(0);
  }).catch((err) => {
    console.error("[Server] Error during shutdown:", err);
    process.exit(1);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
