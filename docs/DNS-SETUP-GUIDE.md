# دليل إعداد النطاق المخصص - portal.learningtreeco.com

## نظرة عامة

هذا الدليل يشرح خطوات ربط النطاق المخصص `portal.learningtreeco.com` بمنصة Learning Tree Connect المستضافة على Manus.

---

## المتطلبات المسبقة

| المتطلب | الوصف |
|---------|-------|
| ملكية النطاق | يجب أن تكون مالكاً لنطاق `learningtreeco.com` |
| الوصول إلى DNS | صلاحية تعديل سجلات DNS عبر مسجل النطاق أو مزود DNS |
| نشر المشروع | يجب نشر المشروع أولاً عبر زر Publish في واجهة الإدارة |

---

## الخطوة الأولى: نشر المشروع

1. افتح واجهة المحادثة (Chatbox) في Manus
2. اضغط على أيقونة **Management UI** في أعلى المحادثة
3. اضغط زر **Publish** في أعلى يمين واجهة الإدارة
4. انتظر حتى يكتمل النشر بنجاح

---

## الخطوة الثانية: إضافة النطاق في واجهة الإدارة

1. افتح **Management UI**
2. اذهب إلى **Settings** من القائمة الجانبية
3. اختر **Domains** من القائمة الفرعية
4. اضغط على زر إضافة نطاق مخصص
5. أدخل: `portal.learningtreeco.com`
6. اضغط **Add Domain**

ستظهر لك سجلات DNS المطلوبة. عادةً ستكون كالتالي:

---

## الخطوة الثالثة: إعداد سجلات DNS

### السجل المطلوب (CNAME Record)

| النوع | الاسم (Host) | القيمة (Value/Target) | TTL |
|-------|-------------|----------------------|-----|
| CNAME | portal | cname.manus.space | 3600 |

> **ملاحظة مهمة:** القيمة الدقيقة للـ CNAME ستظهر في واجهة Domains بعد إضافة النطاق. استخدم القيمة المعروضة هناك إذا اختلفت عما هو مذكور أعلاه.

### خطوات الإعداد حسب مزود DNS:

---

### إذا كنت تستخدم Cloudflare:

1. سجّل الدخول إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. اختر نطاق `learningtreeco.com`
3. اذهب إلى **DNS** من القائمة الجانبية
4. اضغط **Add Record**
5. أدخل البيانات التالية:

| الحقل | القيمة |
|-------|--------|
| Type | CNAME |
| Name | portal |
| Target | cname.manus.space |
| Proxy status | **DNS only** (أطفئ السحابة البرتقالية) |
| TTL | Auto |

6. اضغط **Save**

> **تنبيه:** يجب إيقاف Proxy (السحابة البرتقالية) وتحويلها إلى DNS only (سحابة رمادية) لكي يعمل SSL بشكل صحيح مع Manus.

---

### إذا كنت تستخدم GoDaddy:

1. سجّل الدخول إلى [GoDaddy](https://dcc.godaddy.com)
2. اذهب إلى **My Products** ثم اختر النطاق
3. اضغط **DNS** أو **Manage DNS**
4. اضغط **Add New Record**
5. أدخل:

| الحقل | القيمة |
|-------|--------|
| Type | CNAME |
| Host | portal |
| Points to | cname.manus.space |
| TTL | 1 Hour |

6. اضغط **Save**

---

### إذا كنت تستخدم Namecheap:

1. سجّل الدخول إلى [Namecheap](https://www.namecheap.com)
2. اذهب إلى **Domain List** ثم اضغط **Manage** بجانب النطاق
3. اختر تبويب **Advanced DNS**
4. اضغط **Add New Record**
5. أدخل:

| الحقل | القيمة |
|-------|--------|
| Type | CNAME Record |
| Host | portal |
| Value | cname.manus.space |
| TTL | Automatic |

6. اضغط علامة الصح لحفظ السجل

---

### إذا كنت تستخدم Saudi NIC (nic.sa):

1. سجّل الدخول إلى لوحة تحكم النطاق
2. اذهب إلى إدارة DNS
3. أضف سجل CNAME جديد:
   - الاسم: `portal`
   - القيمة: `cname.manus.space`
4. احفظ التغييرات

---

## الخطوة الرابعة: التحقق من الإعداد

### التحقق الفوري (بعد إضافة السجل):

```bash
# تحقق من انتشار DNS (قد يستغرق 5 دقائق إلى 48 ساعة)
nslookup portal.learningtreeco.com

# أو باستخدام dig
dig portal.learningtreeco.com CNAME
```

### النتيجة المتوقعة:

```
portal.learningtreeco.com.  3600  IN  CNAME  cname.manus.space.
```

### أدوات التحقق عبر الإنترنت:

| الأداة | الرابط |
|--------|--------|
| DNS Checker | https://dnschecker.org |
| WhatsMyDNS | https://www.whatsmydns.net |
| MXToolbox | https://mxtoolbox.com/DNSLookup.aspx |

---

## الخطوة الخامسة: تأكيد الربط في Manus

1. بعد إضافة سجل DNS وانتشاره، ارجع إلى **Settings > Domains** في واجهة الإدارة
2. يجب أن يظهر النطاق بحالة **Connected** أو **Active**
3. شهادة SSL ستُصدر تلقائياً خلال دقائق
4. جرّب الوصول إلى: `https://portal.learningtreeco.com`

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| النطاق لا يعمل بعد 48 ساعة | تأكد أن سجل CNAME مضاف بشكل صحيح وأن Proxy معطل في Cloudflare |
| خطأ SSL/شهادة غير صالحة | انتظر 10-15 دقيقة بعد تأكيد DNS لإصدار الشهادة تلقائياً |
| الصفحة تظهر خطأ 404 | تأكد أن المشروع منشور (Published) قبل ربط النطاق |
| DNS_PROBE_FINISHED_NXDOMAIN | السجل لم ينتشر بعد، انتظر أو جرّب تغيير DNS resolver |

---

## ملاحظات أمنية

- شهادة SSL تُصدر وتُجدد تلقائياً من المنصة
- لا تحتاج لشراء شهادة SSL منفصلة
- جميع الاتصالات مشفرة عبر HTTPS تلقائياً
- HTTP يُعاد توجيهه تلقائياً إلى HTTPS

---

## الجدول الزمني المتوقع

| الخطوة | الوقت المتوقع |
|--------|--------------|
| إضافة سجل DNS | 5 دقائق |
| انتشار DNS | 5 دقائق - 48 ساعة (عادة أقل من ساعة) |
| إصدار شهادة SSL | 5-15 دقيقة بعد تأكيد DNS |
| **الإجمالي** | **عادة أقل من ساعة** |
