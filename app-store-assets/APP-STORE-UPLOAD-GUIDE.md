# دليل رفع تطبيق Learning Tree إلى App Store Connect

## المتطلبات الأساسية

قبل البدء في عملية الرفع، تأكد من توفر المتطلبات التالية:

| المتطلب | التفاصيل |
|---------|----------|
| حساب Apple Developer | مطلوب ($99/سنة) - سجل في [developer.apple.com](https://developer.apple.com) |
| جهاز Mac | مطلوب لتشغيل Xcode وتوقيع التطبيق |
| Xcode 15+ | حمّله من Mac App Store |
| Apple ID مرتبط | يجب ربط Apple ID بحساب المطور |

---

## الخطوة 1: إعداد بيئة التطوير على Mac

افتح Terminal على جهاز Mac ونفّذ الأوامر التالية:

```bash
# 1. استنساخ المشروع
git clone <repository-url> learning-tree-connect
cd learning-tree-connect

# 2. تثبيت التبعيات
pnpm install

# 3. بناء التطبيق للإنتاج
pnpm build

# 4. مزامنة مع iOS
npx cap sync ios
```

---

## الخطوة 2: فتح المشروع في Xcode

```bash
npx cap open ios
```

سيفتح هذا الأمر مشروع `ios/App/App.xcodeproj` في Xcode تلقائياً.

---

## الخطوة 3: إعداد التوقيع (Code Signing)

في Xcode، اتبع الخطوات التالية:

1. اختر مشروع **App** من الشريط الجانبي الأيسر
2. انتقل إلى تبويب **Signing & Capabilities**
3. فعّل خيار **Automatically manage signing**
4. اختر **Team** (حساب المطور الخاص بك)
5. تأكد من أن **Bundle Identifier** هو `com.learningtree.connect`

### إعداد Push Notifications:

1. في تبويب **Signing & Capabilities**، اضغط **+ Capability**
2. أضف **Push Notifications**
3. أضف **Associated Domains** (إذا لم يكن موجوداً)

### إنشاء APNs Key:

1. اذهب إلى [developer.apple.com/account/resources/authkeys](https://developer.apple.com/account/resources/authkeys)
2. أنشئ مفتاح جديد واختر **Apple Push Notifications service (APNs)**
3. حمّل ملف `.p8` واحتفظ بـ Key ID و Team ID

---

## الخطوة 4: إعداد App Store Connect

1. اذهب إلى [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. اضغط **My Apps** ثم **+** لإنشاء تطبيق جديد

### معلومات التطبيق:

| الحقل | القيمة |
|-------|--------|
| Platform | iOS |
| Name | Learning Tree Kids Center |
| Primary Language | Arabic |
| Bundle ID | com.learningtree.connect |
| SKU | LTREE-CONNECT-001 |

---

## الخطوة 5: ملء بيانات الإصدار

### App Information:

| الحقل | القيمة |
|-------|--------|
| Subtitle | Nursery Management & Parent Portal |
| Category | Education |
| Secondary Category | Lifestyle |
| Content Rating | 4+ |
| Price | Free |

### Version Information:

| الحقل | القيمة |
|-------|--------|
| Version | 1.0.0 |
| Copyright | 2024 Learning Tree Kids Center |
| Support URL | https://portal.learningtreeco.com/support |
| Privacy Policy URL | https://portal.learningtreeco.com/privacy |
| Marketing URL | https://portal.learningtreeco.com |

### الوصف (Arabic - Primary):

```
تطبيق Learning Tree Kids Center هو نظام متكامل لإدارة الحضانة والتواصل بين المعلمات وأولياء الأمور. يوفر التطبيق تجربة سلسة وآمنة لمتابعة أطفالكم يومياً.

المميزات الرئيسية:

لأولياء الأمور:
• متابعة حضور وانصراف الأطفال يومياً
• استلام التقارير اليومية والملاحظات
• نظام استلام الأطفال الذكي مع إشعارات فورية
• التواصل المباشر مع المعلمات
• عرض الصور والفيديوهات
• متابعة الفواتير والمدفوعات

للمعلمات والإدارة:
• إدارة الحضور والانصراف
• كتابة التقارير اليومية
• نظام الرسائل الآمن
• إدارة طلبات الاستلام
• متابعة الفصول والأطفال

الأمان:
• تسجيل دخول آمن بالبصمة أو Face ID
• تشفير جميع البيانات
• صلاحيات محددة لكل مستخدم
```

### الوصف (English - Localization):

```
Learning Tree Kids Center is a comprehensive nursery management and parent communication platform. The app provides a seamless and secure experience for parents to stay connected with their children's daily activities.

Key Features:

For Parents:
• Real-time attendance tracking
• Daily reports and observations
• Smart pickup system with instant notifications
• Direct messaging with teachers
• Invoice and payment tracking

For Teachers & Admin:
• Attendance management
• Daily report writing
• Secure messaging system
• Pickup request management
• Classroom and child management

Security:
• Biometric authentication (Face ID / Touch ID)
• End-to-end data encryption
• Role-based access control
```

### Keywords:

```
حضانة,أطفال,تعليم,أولياء أمور,معلمات,حضور,تقارير,رسائل,استلام,nursery,kids,education
```

### What's New:

```
الإصدار الأول من تطبيق Learning Tree Kids Center يتضمن:
- نظام إدارة الحضور والانصراف
- التقارير اليومية التفصيلية
- نظام الرسائل الآمن
- نظام استلام الأطفال الذكي
- إشعارات فورية لجميع الأحداث المهمة
- دعم Face ID و Touch ID
- العمل بدون إنترنت
```

---

## الخطوة 6: رفع لقطات الشاشة

### iPhone 6.7" (مطلوب - iPhone 15 Pro Max):

ارفع الملفات التالية بالترتيب من مجلد `app-store-assets/screenshots-appstore/`:

1. `01-dashboard-6.7inch.png` - لوحة التحكم
2. `02-pickup-6.7inch.png` - نظام الاستلام
3. `03-messages-6.7inch.png` - الرسائل
4. `04-children-6.7inch.png` - إدارة الأطفال
5. `05-attendance-6.7inch.png` - الحضور

### iPhone 6.1" (مطلوب - iPhone 15 Pro):

ارفع الملفات التالية من نفس المجلد:

1. `01-dashboard-6.1inch.png`
2. `02-pickup-6.1inch.png`
3. `03-messages-6.1inch.png`
4. `04-children-6.1inch.png`
5. `05-attendance-6.1inch.png`

---

## الخطوة 7: ملء معلومات المراجعة (App Review Information)

| الحقل | القيمة |
|-------|--------|
| Contact First Name | Learning Tree |
| Contact Last Name | Admin |
| Contact Phone | +966-XX-XXX-XXXX (رقمك) |
| Contact Email | admin@learningtreeco.com |
| Demo Account Username | demo@learningtree.com |
| Demo Account Password | (أنشئ حساب تجريبي) |

### Notes for Reviewer:

```
This app is a nursery management system used by Learning Tree Kids Center staff and parents in Saudi Arabia. It requires an account created by the nursery administration. A demo account is provided for review purposes.

The app uses Face ID/Touch ID for quick re-authentication after initial login. Push notifications are used for pickup alerts, messages, and daily reports.

Native features include: APNs push notifications, Face ID/Touch ID biometric authentication, haptic feedback, offline data caching, native share sheet, and status bar management.

Demo account has pre-populated data including sample children, attendance records, and messages to demonstrate full functionality.
```

---

## الخطوة 8: ملء App Privacy (Privacy Nutrition Labels)

في قسم **App Privacy** في App Store Connect، أجب كالتالي:

### هل يجمع التطبيق بيانات؟ **نعم**

### أنواع البيانات المجمعة:

| نوع البيانات | مرتبط بالهوية | يُستخدم للتتبع | الغرض |
|-------------|--------------|----------------|-------|
| Contact Info (Name, Email, Phone) | نعم | لا | App Functionality |
| Health & Fitness (Allergies) | نعم | لا | App Functionality |
| Photos | نعم | لا | App Functionality |
| Identifiers (User ID, Device ID) | نعم | لا | App Functionality |
| Usage Data (Product Interaction) | نعم | لا | App Functionality |

### بيانات لا يجمعها التطبيق:
- Financial Info
- Location
- Browsing History
- Search History
- Contacts
- Diagnostics
- Advertising Data

---

## الخطوة 9: Export Compliance

| السؤال | الإجابة |
|--------|---------|
| Does your app use encryption? | Yes (HTTPS/TLS only) |
| Does it qualify for exemption? | Yes |
| Is it available in France? | Yes |
| ITSAppUsesNonExemptEncryption | NO (already in Info.plist) |

---

## الخطوة 10: بناء وأرشفة التطبيق

في Xcode:

1. اختر **Any iOS Device (arm64)** كهدف البناء
2. اذهب إلى **Product → Archive**
3. انتظر حتى يكتمل البناء
4. في نافذة **Organizer**، اختر الأرشيف واضغط **Distribute App**
5. اختر **App Store Connect**
6. اختر **Upload**
7. انتظر حتى يكتمل الرفع

---

## الخطوة 11: إرسال للمراجعة

1. عد إلى App Store Connect
2. في صفحة الإصدار، اختر البناء المرفوع
3. تأكد من اكتمال جميع الحقول (ستظهر علامة خضراء)
4. اضغط **Submit for Review**

---

## الجدول الزمني المتوقع

| المرحلة | المدة المتوقعة |
|---------|---------------|
| إعداد حساب المطور | 1-2 يوم |
| إعداد التوقيع والشهادات | 1-2 ساعة |
| بناء وأرشفة التطبيق | 30-60 دقيقة |
| رفع إلى App Store Connect | 15-30 دقيقة |
| مراجعة Apple | 24-48 ساعة (عادةً) |

---

## ملاحظات مهمة

1. **حساب تجريبي:** أنشئ حساب تجريبي مع بيانات مسبقة (أطفال، حضور، رسائل) قبل الإرسال للمراجعة.

2. **سياسة الخصوصية:** تأكد من نشر صفحة سياسة الخصوصية على الرابط المحدد قبل الإرسال.

3. **اختبار على جهاز حقيقي:** اختبر Face ID والإشعارات على iPhone حقيقي قبل الرفع.

4. **الإشعارات:** تأكد من إعداد APNs Key في App Store Connect قبل الإرسال.

5. **الإصدار الأول:** Apple أكثر صرامة مع الإصدارات الأولى من مطورين جدد. تأكد من اكتمال جميع المعلومات.

---

## هيكل ملفات المشروع المطلوبة

```
learning-tree-connect/
├── capacitor.config.ts          ← إعدادات Capacitor
├── ios/                         ← مشروع iOS الكامل
│   ├── App/
│   │   ├── App.xcodeproj/      ← مشروع Xcode
│   │   ├── App/
│   │   │   ├── AppDelegate.swift
│   │   │   ├── App.entitlements
│   │   │   ├── Info.plist
│   │   │   ├── NativeBiometricPlugin.swift
│   │   │   ├── Assets.xcassets/
│   │   │   │   ├── AppIcon.appiconset/
│   │   │   │   └── Splash.imageset/
│   │   │   ├── Base.lproj/
│   │   │   │   └── LaunchScreen.storyboard
│   │   │   └── public/         ← Web assets المبنية
│   │   └── CapApp-SPM/
│   │       └── Package.swift   ← تبعيات Swift Package Manager
│   └── capacitor-cordova-ios-plugins/
├── app-store-assets/
│   ├── metadata.md             ← بيانات App Store
│   ├── privacy-information.md  ← معلومات الخصوصية
│   ├── compliance-audit.md     ← تقرير الامتثال
│   ├── APP-STORE-UPLOAD-GUIDE.md ← هذا الدليل
│   ├── screenshots-appstore/   ← لقطات الشاشة
│   │   ├── *-6.7inch.png      ← iPhone 15 Pro Max
│   │   └── *-6.1inch.png      ← iPhone 15 Pro
│   └── app-icons/             ← أيقونات بجميع الأحجام
├── client/src/lib/native.ts    ← طبقة التكامل الأصلي
├── client/src/hooks/useNativeInit.ts
└── client/src/hooks/useOfflineCache.ts
```
