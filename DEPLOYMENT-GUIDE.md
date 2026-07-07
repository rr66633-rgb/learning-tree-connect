# دليل نشر تطبيق نشأة على استضافة خارجية

## نظرة عامة

هذا الدليل يشرح كيفية نشر تطبيق **نشأة** (Learning Tree Connect) على استضافة خارجية مستقلة. التطبيق مبني بتقنية Node.js مع React وقاعدة بيانات MySQL، ويمكن نشره على أي منصة تدعم Node.js.

---

## المتطلبات التقنية

| المكون | المتطلب |
|--------|---------|
| Node.js | الإصدار 20 أو أحدث |
| قاعدة البيانات | MySQL 8.0 أو TiDB أو PlanetScale |
| التخزين | S3-compatible (AWS S3, DigitalOcean Spaces, MinIO) |
| الذاكرة | 512 MB RAM كحد أدنى |
| المساحة | 500 MB كحد أدنى |

---

## الخطوة 1: تحميل الكود المصدري

يمكنك تحميل الكود من GitHub (المشروع متصل بالفعل):

```bash
git clone https://github.com/YOUR_REPO/learning-tree-connect.git
cd learning-tree-connect
```

أو تحميل ZIP من واجهة المشروع (قائمة ⋯ → Download as ZIP).

---

## الخطوة 2: إعداد قاعدة البيانات

التطبيق يستخدم **MySQL** مع Drizzle ORM. تحتاج إنشاء قاعدة بيانات MySQL:

### الخيار أ: PlanetScale (مُدار - مُوصى به)
1. أنشئ حساب على [PlanetScale](https://planetscale.com)
2. أنشئ قاعدة بيانات جديدة
3. احصل على connection string

### الخيار ب: AWS RDS MySQL
1. أنشئ RDS instance من نوع MySQL 8.0
2. اختر حجم مناسب (db.t3.micro للبداية)
3. احصل على endpoint و credentials

### الخيار ج: DigitalOcean Managed MySQL
1. أنشئ Managed Database من نوع MySQL
2. احصل على connection string

### تطبيق Schema

بعد إنشاء قاعدة البيانات، طبّق الـ migrations:

```bash
# ضع DATABASE_URL في .env أولاً
export DATABASE_URL="mysql://user:password@host:3306/database_name?ssl=true"

# تطبيق migrations
pnpm drizzle-kit migrate
```

---

## الخطوة 3: إعداد التخزين (S3)

التطبيق يستخدم S3 لتخزين الملفات (صور الأطفال، المستندات، الفواتير). تحتاج استبدال storage helper الحالي بـ S3 مباشر.

### إنشاء S3 Bucket

```bash
# AWS CLI
aws s3 mb s3://naashah-storage --region me-south-1
```

### تعديل server/storage.ts

استبدل محتوى `server/storage.ts` بالكود التالي:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "me-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET || "naashah-storage";

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType?: string
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(relKey);
  
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: data,
    ContentType: contentType || "application/octet-stream",
  }));

  const url = `/storage/${key}`;
  return { key, url };
}

export async function storageGet(
  key: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return { key, url };
}
```

### إضافة route لتقديم الملفات

في `server/_core/index.ts`، أضف route لتقديم الملفات من S3:

```typescript
app.get("/storage/:key(*)", async (req, res) => {
  const { key } = req.params;
  const { url } = await storageGet(key);
  res.redirect(307, url);
});
```

---

## الخطوة 4: إعداد نظام المصادقة (Authentication)

التطبيق حالياً يستخدم OAuth. لنشره بشكل مستقل، لديك خياران:

### الخيار أ: استخدام نظام تسجيل دخول مخصص (مُوصى به)

أضف نظام تسجيل دخول بالبريد الإلكتروني وكلمة المرور:

1. أنشئ ملف `server/auth-local.ts`:

```typescript
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail, createUser } from "./db";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function loginWithEmail(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) throw new Error("Invalid credentials");
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials");
  
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return { token, user };
}

export async function registerUser(data: { name: string; email: string; password: string; role?: string }) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await createUser({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role || "parent",
  });
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return { token, user };
}
```

2. أضف `passwordHash` column إلى جدول users:

```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL;
```

### الخيار ب: استخدام Auth0 أو Firebase Auth

يمكنك استبدال OAuth بـ Auth0 أو Firebase Authentication. هذا يتطلب تعديل `server/_core/context.ts` لقراءة JWT من Auth0/Firebase بدلاً من OAuth الحالي.

---

## الخطوة 5: إعداد متغيرات البيئة

أنشئ ملف `.env` في جذر المشروع:

```env
# === أساسي ===
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# === قاعدة البيانات ===
DATABASE_URL=mysql://user:password@host:3306/naashah?ssl=true

# === التخزين (S3) ===
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=me-south-1
S3_BUCKET=naashah-storage

# === الدفع (Moyasar) ===
MOYASAR_SECRET_KEY=sk_live_xxxxx
VITE_MOYASAR_PUBLISHABLE_KEY=pk_live_xxxxx

# === البريد الإلكتروني ===
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@naashah.com
SMTP_PASS=your-email-password
EMAIL_FROM=info@naashah.com
EMAIL_FROM_NAME=نشأة

# === إشعارات Push (اختياري) ===
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# === Meta CAPI (اختياري - تتبع الإعلانات) ===
META_CAPI_ACCESS_TOKEN=your-meta-token

# === Twilio SMS (اختياري) ===
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+966xxxxxxx

# === Frontend (يُبنى في وقت البناء) ===
VITE_APP_TITLE=نشأة
VITE_MOYASAR_PUBLISHABLE_KEY=pk_live_xxxxx
```

---

## الخطوة 6: البناء والتشغيل

### البناء

```bash
# تثبيت الحزم
pnpm install

# بناء التطبيق (Frontend + Backend)
pnpm build
```

هذا ينتج:
- `dist/` - ملفات الخادم المجمعة
- `dist/public/` - ملفات الفرونت إند المجمعة

### التشغيل

```bash
# تشغيل في الإنتاج
NODE_ENV=production node dist/index.js
```

---

## الخطوة 7: النشر على منصة استضافة

### الخيار أ: Railway (الأسهل)

1. أنشئ حساب على [Railway](https://railway.app)
2. أنشئ مشروع جديد → Deploy from GitHub
3. أضف MySQL database من Railway marketplace
4. أضف متغيرات البيئة في Settings → Variables
5. Railway سيبني وينشر تلقائياً

**إعدادات Railway:**
```
Build Command: pnpm install && pnpm build
Start Command: node dist/index.js
```

### الخيار ب: DigitalOcean App Platform

1. أنشئ App جديد → GitHub repository
2. اختر Node.js كـ runtime
3. أضف Managed MySQL database
4. أضف متغيرات البيئة
5. Deploy

**إعدادات:**
```
Build Command: pnpm install && pnpm build
Run Command: node dist/index.js
HTTP Port: 3000
```

### الخيار ج: VPS (DigitalOcean Droplet / AWS EC2)

```bash
# 1. إعداد الخادم
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm pm2

# 2. نسخ الكود
git clone https://github.com/YOUR_REPO/learning-tree-connect.git
cd learning-tree-connect

# 3. تثبيت وبناء
pnpm install
pnpm build

# 4. إعداد .env
cp .env.example .env
nano .env  # عدّل المتغيرات

# 5. تشغيل مع PM2
pm2 start dist/index.js --name naashah
pm2 save
pm2 startup

# 6. إعداد Nginx كـ reverse proxy
sudo apt install -y nginx
```

**إعداد Nginx:**

```nginx
server {
    listen 80;
    server_name naashah.com www.naashah.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 7. SSL مع Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d naashah.com -d www.naashah.com
```

### الخيار د: Docker

أنشئ `Dockerfile` في جذر المشروع:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

```bash
# بناء وتشغيل
docker build -t naashah .
docker run -p 3000:3000 --env-file .env naashah
```

---

## الخطوة 8: إعداد الدومين و SSL

1. اربط الدومين `naashah.com` بعنوان IP الخادم (A Record)
2. أضف www.naashah.com كـ CNAME يشير إلى naashah.com
3. فعّل SSL (Let's Encrypt مجاني أو Cloudflare)

---

## الخطوة 9: النسخ الاحتياطي

### نسخ احتياطي لقاعدة البيانات

```bash
#!/bin/bash
# backup.sh - شغّله يومياً عبر cron
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME | gzip > /backups/naashah_$DATE.sql.gz

# رفع إلى S3
aws s3 cp /backups/naashah_$DATE.sql.gz s3://naashah-backups/db/

# حذف النسخ الأقدم من 30 يوم
find /backups -name "*.sql.gz" -mtime +30 -delete
```

```bash
# إضافة إلى cron (يومياً الساعة 3 صباحاً)
crontab -e
# أضف:
0 3 * * * /path/to/backup.sh
```

---

## الخطوة 10: التعديلات المطلوبة للاستقلالية

### ملخص ما يحتاج تعديل

| المكون | الوضع الحالي | البديل المطلوب |
|--------|-------------|---------------|
| المصادقة | OAuth عبر المنصة | تسجيل دخول محلي (email/password) أو Auth0 |
| التخزين | Forge API → S3 | AWS S3 مباشر (الكود أعلاه) |
| LLM (AI) | Forge API | OpenAI API مباشر أو إزالته |
| الإشعارات | Forge notification | VAPID Web Push مباشر (موجود بالفعل) |
| Heartbeat/Cron | Forge heartbeat | cron job عادي أو node-cron |

### استبدال LLM (اختياري)

إذا كنت تستخدم ميزة AI في التطبيق، استبدل `server/_core/llm.ts`:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function invokeLLM(params: { messages: any[]; model?: string }) {
  const response = await openai.chat.completions.create({
    model: params.model || "gpt-4o-mini",
    messages: params.messages,
  });
  return response;
}
```

### استبدال Heartbeat/Cron

استبدل `server/_core/heartbeat.ts` بـ node-cron:

```typescript
import cron from "node-cron";

// نسخ احتياطي يومي
cron.schedule("0 3 * * *", async () => {
  // كود النسخ الاحتياطي
});

// تذكيرات الأحداث
cron.schedule("0 8 * * *", async () => {
  // كود تذكيرات الأحداث
});
```

---

## الخطوة 11: مراقبة التطبيق

### PM2 Monitoring

```bash
pm2 monit          # مراقبة مباشرة
pm2 logs naashah   # عرض logs
pm2 status         # حالة التطبيق
```

### Health Check

أضف endpoint بسيط للمراقبة:

```typescript
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});
```

### خدمات مراقبة خارجية (مُوصى بها)

- [UptimeRobot](https://uptimerobot.com) - مجاني - يراقب أن الموقع يعمل
- [BetterStack](https://betterstack.com) - مراقبة + logs

---

## تقدير التكاليف الشهرية

| الخدمة | المنصة | التكلفة التقريبية |
|--------|--------|-----------------|
| الخادم | DigitalOcean Droplet (2GB) | $12/شهر |
| قاعدة البيانات | PlanetScale Hobby | مجاني (حتى 5GB) |
| التخزين | DigitalOcean Spaces | $5/شهر (250GB) |
| الدومين | naashah.com | $12/سنة |
| SSL | Let's Encrypt | مجاني |
| البريد | Zoho Mail | مجاني (حتى 5 مستخدمين) |
| **الإجمالي** | | **~$18/شهر** |

### بديل أرخص (Railway)

| الخدمة | التكلفة |
|--------|---------|
| Railway (Server + DB) | $5-20/شهر حسب الاستخدام |
| S3 Storage | $5/شهر |
| **الإجمالي** | **~$10-25/شهر** |

---

## ملاحظات مهمة

1. **قبل النشر**: تأكد من تغيير كل مفاتيح API من test إلى live (خاصة Moyasar)
2. **Apple Pay**: يجب تسجيل الدومين الجديد في Moyasar Dashboard ورفع ملف التحقق
3. **النسخ الاحتياطي**: فعّل النسخ الاحتياطي التلقائي من اليوم الأول
4. **SSL**: إلزامي لعمل Apple Pay و Moyasar
5. **CORS**: قد تحتاج تعديل إعدادات CORS إذا كان الفرونت إند على دومين مختلف
6. **DNS**: بعد تغيير الاستضافة، حدّث A Record للدومين naashah.com

---

## الدعم

إذا واجهت أي مشكلة أثناء النشر، الملفات المهمة هي:
- `package.json` - الحزم والأوامر
- `server/_core/index.ts` - نقطة الدخول الرئيسية
- `server/_core/env.ts` - متغيرات البيئة
- `drizzle/schema.ts` - هيكل قاعدة البيانات
- `server/storage.ts` - التخزين
- `server/_core/oauth.ts` - المصادقة
