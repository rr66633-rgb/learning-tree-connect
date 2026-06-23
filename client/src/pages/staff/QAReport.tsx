import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Database,
  Globe,
  Key,
  FileWarning,
  Server,
  Timer,
  HardDrive,
  Activity,
} from "lucide-react";

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium";
  status: "open" | "in-progress" | "resolved";
  impact: string;
  steps: string[];
  fix: string;
  codeExample?: string;
  file?: string;
}

const securityIssues: Issue[] = [
  {
    id: "SEC-01",
    title: "إعداد SameSite=None للكوكيز",
    description:
      "ملف تعريف الارتباط للجلسة يستخدم sameSite: \"none\" مما يسمح بإرساله مع طلبات من مواقع خارجية. هذا يزيد من سطح الهجوم لـ CSRF خاصة مع عدم وجود حماية CSRF إضافية.",
    severity: "high",
    status: "open",
    impact: "إمكانية تنفيذ عمليات غير مصرح بها نيابة عن المستخدم من مواقع خارجية",
    steps: [
      "فتح أدوات المطور في المتصفح",
      "الانتقال إلى تبويب Application > Cookies",
      "ملاحظة أن كوكي الجلسة يحمل SameSite=None",
      "إنشاء صفحة خارجية ترسل طلب POST إلى API المنصة",
      "الطلب سينجح لأن الكوكي يُرسل تلقائياً",
    ],
    fix: "تنفيذ نمط Double Submit Cookie أو استخدام رموز CSRF مخصصة للعمليات الحساسة. إضافة middleware يتحقق من وجود رمز CSRF صالح في رأس الطلب لجميع عمليات التعديل (POST, PUT, DELETE).",
    codeExample: `// إضافة middleware للتحقق من CSRF
import crypto from 'crypto';

// توليد رمز CSRF عند تسجيل الدخول
const csrfToken = crypto.randomBytes(32).toString('hex');
res.cookie('csrf-token', csrfToken, { 
  httpOnly: false, // يجب أن يكون قابلاً للقراءة من JavaScript
  sameSite: 'none',
  secure: true 
});

// التحقق في كل طلب تعديل
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    const cookie = req.cookies['csrf-token'];
    if (!token || token !== cookie) {
      return res.status(403).json({ error: 'CSRF token invalid' });
    }
  }
  next();
});`,
    file: "server/_core/cookies.ts",
  },
  {
    id: "SEC-02",
    title: "عدم وجود تشفير للبيانات الحساسة في قاعدة البيانات",
    description:
      "البيانات الطبية للأطفال (الحساسية، الأدوية، الحالات الصحية) مخزنة كنص عادي في قاعدة البيانات. وفقاً لأنظمة حماية البيانات الشخصية السعودية (PDPL)، يجب تشفير البيانات الصحية.",
    severity: "high",
    status: "open",
    impact: "في حال اختراق قاعدة البيانات، ستكون البيانات الطبية للأطفال مكشوفة بالكامل",
    steps: [
      "الاتصال بقاعدة البيانات مباشرة",
      "تنفيذ استعلام SELECT على جدول children",
      "ملاحظة أن حقول allergies و medicalNotes مخزنة كنص عادي",
      "نفس الأمر لجدول medical_info",
    ],
    fix: "تشفير الحقول الطبية الحساسة باستخدام AES-256-GCM على مستوى التطبيق قبل التخزين، وفك التشفير عند القراءة.",
    codeExample: `import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm', 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}`,
    file: "drizzle/schema.ts",
  },
  {
    id: "SEC-03",
    title: "عدم وجود سياسة قوة كلمة المرور",
    description:
      "التحقق من كلمة المرور يشترط فقط حد أدنى 6 أحرف دون اشتراط تعقيد (أرقام، رموز، أحرف كبيرة). هذا يسمح بكلمات مرور ضعيفة جداً مثل '123456'.",
    severity: "medium",
    status: "open",
    impact: "سهولة تخمين كلمات المرور واختراق الحسابات",
    steps: [
      "الانتقال إلى صفحة التسجيل",
      "إدخال كلمة مرور بسيطة مثل '123456'",
      "سيتم قبول كلمة المرور بنجاح",
      "لا يوجد تحذير بشأن ضعف كلمة المرور",
    ],
    fix: "فرض سياسة كلمة مرور قوية: 8 أحرف على الأقل، حرف كبير واحد، رقم واحد، ورمز خاص واحد. مع إضافة مؤشر قوة كلمة المرور في الواجهة.",
    codeExample: `import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل')
  .regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص واحد على الأقل');

// استخدام في إجراء التسجيل
register: publicProcedure
  .input(z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: passwordSchema,
    phone: z.string().min(10),
  }))
  .mutation(async ({ input }) => { /* ... */ });`,
    file: "server/routers.ts",
  },
  {
    id: "SEC-04",
    title: "عدم وجود تسجيل لمحاولات الوصول غير المصرح بها",
    description:
      "عند رفض الوصول (FORBIDDEN أو UNAUTHORIZED)، لا يتم تسجيل المحاولة في سجل الأمان. هذا يمنع اكتشاف محاولات الاختراق أو الوصول غير المشروع.",
    severity: "medium",
    status: "open",
    impact: "عدم القدرة على اكتشاف محاولات الاختراق أو الأنشطة المشبوهة",
    steps: [
      "محاولة الوصول إلى endpoint محمي بدون مصادقة",
      "محاولة الوصول إلى بيانات مؤسسة أخرى",
      "لا يتم تسجيل أي من هذه المحاولات في سجل الأمان",
    ],
    fix: "إضافة middleware يسجل جميع محاولات الوصول المرفوضة مع عنوان IP والمستخدم والمورد المطلوب والوقت.",
    codeExample: `// middleware لتسجيل محاولات الوصول المرفوضة
import { TRPCError } from '@trpc/server';

const securityLogger = t.middleware(async ({ ctx, next, path }) => {
  try {
    return await next({ ctx });
  } catch (error) {
    if (error instanceof TRPCError && 
        ['UNAUTHORIZED', 'FORBIDDEN'].includes(error.code)) {
      await db.createAuditLog({
        userId: ctx.user?.id || null,
        action: 'access_denied',
        resource: path,
        details: JSON.stringify({
          code: error.code,
          ip: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
          timestamp: new Date().toISOString(),
        }),
        ipAddress: ctx.req.ip || '',
      });
    }
    throw error;
  }
});`,
    file: "server/_core/trpc.ts",
  },
  {
    id: "SEC-05",
    title: "نقاط نهاية التصدير لا تحد من حجم البيانات",
    description:
      "نقاط نهاية تصدير Excel (/api/export-staff و /api/export-children) لا تفرض حداً على عدد السجلات المُصدّرة. مستخدم مصرح له يمكنه تصدير جميع بيانات المنصة دفعة واحدة.",
    severity: "medium",
    status: "open",
    impact: "إمكانية تسريب بيانات ضخمة في عملية واحدة، خاصة بيانات الأطفال الحساسة",
    steps: [
      "تسجيل الدخول كمدير",
      "استدعاء /api/export-children بدون أي فلاتر",
      "سيتم تصدير جميع بيانات الأطفال في ملف واحد",
      "لا يتم تسجيل عملية التصدير في سجل التدقيق",
    ],
    fix: "إضافة حد أقصى للتصدير (1000 سجل)، تسجيل عمليات التصدير في سجل التدقيق، وإضافة تأخير بين عمليات التصدير المتتالية.",
    codeExample: `// إضافة حد وتسجيل لعمليات التصدير
app.get('/api/export-children', async (req, res) => {
  const MAX_EXPORT_RECORDS = 1000;
  
  // تسجيل عملية التصدير
  await db.createAuditLog({
    userId: req.user.id,
    action: 'export_data',
    resource: 'children',
    details: JSON.stringify({ filters: req.query }),
    ipAddress: req.ip,
  });
  
  // تطبيق الحد الأقصى
  const children = await db.getChildren({
    ...filters,
    limit: MAX_EXPORT_RECORDS,
  });
  
  if (children.length >= MAX_EXPORT_RECORDS) {
    // إضافة تحذير في الملف
    // أو إرجاع خطأ يطلب تضييق الفلاتر
  }
  
  // ... إنشاء ملف Excel
});`,
    file: "server/_core/index.ts",
  },
];

const performanceIssues: Issue[] = [
  {
    id: "PF-01",
    title: "تسرب اتصالات قاعدة البيانات",
    description:
      "ثلاثة ملفات في الخادم (brandingRouter, onboardingRouter, superAdminRouter) تُنشئ اتصالاً جديداً بقاعدة البيانات عند كل طلب دون تخزين مؤقت. هذا يستنزف حد الاتصالات المتاحة ويسبب تعطل الخدمة.",
    severity: "critical",
    status: "open",
    impact: "تعطل كامل للخدمة تحت الحمل المتوسط إلى العالي بسبب نفاد اتصالات قاعدة البيانات",
    steps: [
      "إرسال 50 طلب متزامن إلى /api/trpc/branding.getMyBranding",
      "مراقبة عدد الاتصالات النشطة في قاعدة البيانات",
      "سيزداد العدد إلى 50 اتصال دون إغلاق أي منها",
      "تكرار العملية حتى الوصول إلى حد الاتصالات (عادة 100)",
      "ستبدأ الطلبات بالفشل مع خطأ 'Too many connections'",
    ],
    fix: "استخدام نمط Singleton مع تخزين مؤقت للاتصال كما هو مُطبّق في server/db.ts. إعادة استخدام نفس الاتصال لجميع الطلبات.",
    codeExample: `// ❌ الطريقة الحالية (خاطئة) - اتصال جديد كل مرة
async function getDb() {
  return drizzle(process.env.DATABASE_URL); // اتصال جديد!
}

// ✅ الطريقة الصحيحة - Singleton pattern
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

// أو الأفضل: استيراد من server/db.ts المركزي
import { getDb } from '../db';`,
    file: "server/brandingRouter.ts, server/onboardingRouter.ts, server/superAdminRouter.ts",
  },
  {
    id: "PF-02",
    title: "استعلامات N+1 في وحدة الحضور",
    description:
      "دالة إثراء بيانات الحضور تُنفّذ استعلامين إضافيين لكل سجل حضور (واحد للفصل وآخر للمعلم) داخل حلقة Promise.all. مع 30 طفلاً، يعني ذلك 60 استعلاماً إضافياً بدلاً من استعلام واحد.",
    severity: "high",
    status: "open",
    impact: "بطء ملحوظ في تحميل صفحة الحضور (2-5 ثوانٍ بدلاً من أقل من 500 مللي ثانية)",
    steps: [
      "فتح صفحة الحضور مع فصل يحتوي 30 طفلاً",
      "مراقبة وقت الاستجابة في أدوات المطور",
      "ملاحظة أن الطلب يستغرق وقتاً طويلاً",
      "تفعيل تسجيل الاستعلامات في قاعدة البيانات",
      "ملاحظة 60+ استعلام SELECT لطلب واحد",
    ],
    fix: "استخدام LEFT JOIN في الاستعلام الأصلي لجلب بيانات الفصل والمعلم مرة واحدة بدلاً من استعلام منفصل لكل سجل.",
    codeExample: `// ❌ الطريقة الحالية (N+1)
const enriched = await Promise.all(results.map(async (r) => {
  let teacherName = '';
  if (r.childClassId) {
    const classInfo = await db.select({ teacherId: classes.teacherId })
      .from(classes).where(eq(classes.id, r.childClassId)).limit(1);
    if (classInfo[0]?.teacherId) {
      const teacher = await db.select({ name: users.name })
        .from(users).where(eq(users.id, classInfo[0].teacherId)).limit(1);
      teacherName = teacher[0]?.name || '';
    }
  }
  return { ...r, teacherName };
}));

// ✅ الطريقة الصحيحة (JOIN واحد)
const results = await db
  .select({
    // حقول الحضور
    id: attendance.id,
    childId: attendance.childId,
    status: attendance.status,
    date: attendance.date,
    // حقول الفصل والمعلم
    className: classes.name,
    teacherName: users.name,
  })
  .from(attendance)
  .leftJoin(children, eq(attendance.childId, children.id))
  .leftJoin(classes, eq(children.classId, classes.id))
  .leftJoin(users, eq(classes.teacherId, users.id))
  .where(eq(attendance.date, targetDate));`,
    file: "server/db.ts",
  },
  {
    id: "PF-03",
    title: "عدم وجود فهارس قاعدة بيانات",
    description:
      "مخطط قاعدة البيانات لا يُعرّف أي فهارس على الأعمدة المُستعلم عنها بكثرة. هذا يعني أن كل استعلام يتطلب مسح كامل للجدول (Full Table Scan) مما يتدهور أداؤه مع نمو البيانات.",
    severity: "high",
    status: "open",
    impact: "تدهور تدريجي في الأداء مع نمو البيانات. عند 10,000 سجل، ستصبح الاستعلامات بطيئة بشكل ملحوظ",
    steps: [
      "تنفيذ EXPLAIN على استعلام حضور يومي",
      "ملاحظة type: ALL (مسح كامل) بدلاً من type: ref (استخدام فهرس)",
      "إضافة 10,000 سجل حضور تجريبي",
      "قياس وقت الاستعلام - سيكون أبطأ بـ 10-50 مرة",
    ],
    fix: "إضافة فهارس على جميع الأعمدة المُستعلم عنها بكثرة في مخطط Drizzle وتطبيقها عبر migration.",
    codeExample: `// إضافة فهارس في drizzle/schema.ts
import { index } from 'drizzle-orm/mysql-core';

export const children = mysqlTable('children', {
  id: int('id').primaryKey().autoincrement(),
  organizationId: int('organization_id'),
  parentId: int('parent_id'),
  classId: int('class_id'),
  // ...
}, (table) => ({
  orgIdx: index('idx_children_org').on(table.organizationId),
  parentIdx: index('idx_children_parent').on(table.parentId),
  classIdx: index('idx_children_class').on(table.classId),
}));

export const attendance = mysqlTable('attendance', {
  id: int('id').primaryKey().autoincrement(),
  childId: int('child_id'),
  date: date('date'),
  // ...
}, (table) => ({
  childDateIdx: index('idx_attendance_child_date')
    .on(table.childId, table.date),
  dateIdx: index('idx_attendance_date').on(table.date),
}));

export const notifications = mysqlTable('notifications', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id'),
  isRead: boolean('is_read'),
  // ...
}, (table) => ({
  userReadIdx: index('idx_notifications_user_read')
    .on(table.userId, table.isRead),
}));

// SQL المطلوب تنفيذه:
// CREATE INDEX idx_children_org ON children(organization_id);
// CREATE INDEX idx_children_parent ON children(parent_id);
// CREATE INDEX idx_children_class ON children(class_id);
// CREATE INDEX idx_attendance_child_date ON attendance(child_id, date);
// CREATE INDEX idx_attendance_date ON attendance(date);
// CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
// CREATE INDEX idx_daily_reports_child ON daily_reports(child_id);
// CREATE INDEX idx_messages_conversation ON messages(conversation_id);`,
    file: "drizzle/schema.ts",
  },
  {
    id: "PF-04",
    title: "تحميل جميع الإشعارات دفعة واحدة",
    description:
      "إجراء notifications.list يُرجع جميع إشعارات المستخدم دون تقسيم صفحات (pagination). مع مرور الوقت، قد يتراكم آلاف الإشعارات مما يؤثر على الأداء وزمن الاستجابة.",
    severity: "medium",
    status: "open",
    impact: "بطء في تحميل صفحة الإشعارات وزيادة استهلاك الذاكرة على الخادم والعميل",
    steps: [
      "إنشاء 1000 إشعار لمستخدم واحد",
      "فتح صفحة الإشعارات",
      "قياس وقت التحميل وحجم الاستجابة",
      "ملاحظة أن جميع الإشعارات تُحمّل دفعة واحدة",
    ],
    fix: "إضافة pagination مع حد افتراضي (50 إشعاراً) وتحميل تدريجي (infinite scroll) في الواجهة.",
    codeExample: `// Backend: إضافة pagination
notifications: router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(10).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;
      
      const [items, countResult] = await Promise.all([
        db.getNotifications(ctx.user!.id, { limit, offset }),
        db.getNotificationsCount(ctx.user!.id),
      ]);
      
      return {
        items,
        total: countResult,
        page,
        totalPages: Math.ceil(countResult / limit),
        hasMore: offset + items.length < countResult,
      };
    }),
}),

// Frontend: تحميل تدريجي
function NotificationsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.notifications.list.useQuery({ page, limit: 50 });
  
  return (
    <div>
      {data?.items.map(n => <NotificationItem key={n.id} {...n} />)}
      {data?.hasMore && (
        <button onClick={() => setPage(p => p + 1)}>
          تحميل المزيد
        </button>
      )}
    </div>
  );
}`,
    file: "server/routers.ts",
  },
];

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    critical: { label: "حرج", className: "bg-red-100 text-red-800 border-red-200" },
    high: { label: "عالي", className: "bg-orange-100 text-orange-800 border-orange-200" },
    medium: { label: "متوسط", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  };
  const { label, className } = config[severity as keyof typeof config] || config.medium;
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    open: { label: "مفتوح", className: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
    "in-progress": { label: "قيد العمل", className: "bg-blue-50 text-blue-700 border-blue-200", icon: Activity },
    resolved: { label: "تم الحل", className: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  };
  const { label, className, icon: Icon } = config[status as keyof typeof config] || config.open;
  return (
    <Badge variant="outline" className={`${className} gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function IssueCard({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const severityIcon = {
    critical: <AlertTriangle className="h-5 w-5 text-red-500" />,
    high: <AlertTriangle className="h-5 w-5 text-orange-500" />,
    medium: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  };

  return (
    <Card className={`transition-all duration-200 ${expanded ? "ring-2 ring-primary/20" : "hover:shadow-md"}`}>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">{severityIcon[issue.severity]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">{issue.id}</span>
                <SeverityBadge severity={issue.severity} />
                <StatusBadge status={issue.status} />
              </div>
              <CardTitle className="text-base leading-relaxed">{issue.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{issue.description}</p>
            </div>
          </div>
          <div className="mt-1">
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* التأثير */}
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-red-800 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              التأثير
            </h4>
            <p className="text-sm text-red-700">{issue.impact}</p>
          </div>

          {/* خطوات إعادة الإنتاج */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <FileWarning className="h-4 w-4 text-muted-foreground" />
              خطوات إعادة الإنتاج
            </h4>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
              {issue.steps.map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>

          {/* الملف المتأثر */}
          {issue.file && (
            <div className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الملف:</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{issue.file}</code>
            </div>
          )}

          {/* الحل المقترح */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              الحل المقترح
            </h4>
            <p className="text-sm text-green-700">{issue.fix}</p>
          </div>

          {/* مثال الكود */}
          {issue.codeExample && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Database className="h-4 w-4 text-muted-foreground" />
                مثال التنفيذ
              </h4>
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed" dir="ltr">
                <code>{issue.codeExample}</code>
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function QAReport() {
  const totalIssues = securityIssues.length + performanceIssues.length;
  const criticalCount = [...securityIssues, ...performanceIssues].filter(i => i.severity === "critical").length;
  const highCount = [...securityIssues, ...performanceIssues].filter(i => i.severity === "high").length;
  const mediumCount = [...securityIssues, ...performanceIssues].filter(i => i.severity === "medium").length;
  const resolvedCount = [...securityIssues, ...performanceIssues].filter(i => i.status === "resolved").length;
  const progressPercent = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* العنوان */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          تقرير المشاكل الأمنية والأداء
        </h1>
        <p className="text-muted-foreground">
          تقرير شامل بالمشاكل المكتشفة مع الحلول المقترحة وأمثلة التنفيذ - تاريخ التدقيق: 23 يونيو 2026
        </p>
      </div>

      {/* ملخص الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{totalIssues}</div>
          <div className="text-xs text-muted-foreground mt-1">إجمالي المشاكل</div>
        </Card>
        <Card className="p-4 text-center border-red-200 bg-red-50">
          <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
          <div className="text-xs text-red-600 mt-1">حرج</div>
        </Card>
        <Card className="p-4 text-center border-orange-200 bg-orange-50">
          <div className="text-2xl font-bold text-orange-700">{highCount}</div>
          <div className="text-xs text-orange-600 mt-1">عالي</div>
        </Card>
        <Card className="p-4 text-center border-yellow-200 bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-700">{mediumCount}</div>
          <div className="text-xs text-yellow-600 mt-1">متوسط</div>
        </Card>
        <Card className="p-4 text-center border-green-200 bg-green-50">
          <div className="text-2xl font-bold text-green-700">{resolvedCount}</div>
          <div className="text-xs text-green-600 mt-1">تم الحل</div>
        </Card>
      </div>

      {/* شريط التقدم */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">تقدم الإصلاح</span>
          <span className="text-sm text-muted-foreground">{resolvedCount} من {totalIssues} ({progressPercent}%)</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </Card>

      {/* التبويبات */}
      <Tabs defaultValue="security" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            المشاكل الأمنية ({securityIssues.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Zap className="h-4 w-4" />
            مشاكل الأداء ({performanceIssues.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800 text-sm">تنبيه أمني</h3>
              <p className="text-sm text-red-700 mt-1">
                هذه المشاكل تُعرّض بيانات المستخدمين والأطفال للخطر. يجب حل المشاكل ذات الأولوية العالية والحرجة قبل النشر على متاجر التطبيقات.
              </p>
            </div>
          </div>
          {securityIssues.map((issue, index) => (
            <IssueCard key={issue.id} issue={issue} index={index} />
          ))}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
            <Zap className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-800 text-sm">تنبيه أداء</h3>
              <p className="text-sm text-orange-700 mt-1">
                هذه المشاكل ستؤثر على تجربة المستخدم وقد تسبب تعطل الخدمة تحت الحمل. المشكلة الحرجة (تسرب الاتصالات) يجب حلها فوراً.
              </p>
            </div>
          </div>
          {performanceIssues.map((issue, index) => (
            <IssueCard key={issue.id} issue={issue} index={index} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
