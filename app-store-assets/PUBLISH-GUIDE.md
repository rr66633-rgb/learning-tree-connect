# دليل نشر تطبيق نشأة على App Store و Google Play

## نظرة عامة

هذا الدليل يشرح خطوات نشر تطبيق نشأة على متجري Apple App Store و Google Play Store. التطبيق مبني باستخدام Capacitor الذي يغلف تطبيق الويب في WebView أصلي مع إمكانية الوصول لميزات الجهاز الأصلية.

---

## المتطلبات الأساسية

| المتطلب | App Store | Google Play |
|---------|-----------|-------------|
| حساب مطور | Apple Developer ($99/سنة) | Google Play Console ($25 مرة واحدة) |
| جهاز | Mac مع Xcode 15+ | أي نظام تشغيل |
| أدوات | Xcode, CocoaPods | Android Studio, JDK 17+ |
| التوقيع | Apple Certificates + Provisioning Profile | Keystore (.jks) |

---

## الجزء الأول: التحضير المشترك

### 1. استنساخ المشروع وبناء التطبيق

```bash
# استنساخ المشروع
git clone <repository-url> naashah-app
cd naashah-app

# تثبيت التبعيات
pnpm install

# بناء التطبيق للإنتاج
pnpm build

# التحقق من وجود مجلد dist/public
ls dist/public/
```

### 2. مزامنة المنصات

```bash
# مزامنة iOS
npx cap sync ios

# مزامنة Android
npx cap sync android
```

---

## الجزء الثاني: النشر على App Store

### الخطوة 1: فتح المشروع في Xcode

```bash
npx cap open ios
```

### الخطوة 2: إعداد التوقيع (Code Signing)

في Xcode، اتبع الخطوات التالية:

1. اختر المشروع **App** من الشريط الجانبي
2. اختر target **App**
3. انتقل إلى تبويب **Signing & Capabilities**
4. فعّل **Automatically manage signing**
5. اختر **Team** (حساب Apple Developer الخاص بك)
6. تأكد من أن **Bundle Identifier** هو `com.naashah.app`

### الخطوة 3: تحديث إعدادات المشروع

| الإعداد | القيمة |
|---------|--------|
| Display Name | نشأة |
| Bundle Identifier | com.naashah.app |
| Version | 1.0.0 |
| Build | 1 |
| Deployment Target | iOS 16.0 |
| Device | iPhone + iPad |

### الخطوة 4: إضافة الأيقونات

الأيقونات جاهزة في مجلد `app-store-assets/app-icons/`. في Xcode:

1. افتح **Assets.xcassets** → **AppIcon**
2. اسحب الأيقونة `AppStore-1024x1024.png` إلى خانة 1024x1024
3. باقي المقاسات ستُولّد تلقائياً (أو استخدم الملفات الجاهزة)

### الخطوة 5: بناء Archive

1. اختر **Any iOS Device (arm64)** كجهاز هدف
2. اذهب إلى **Product** → **Archive**
3. انتظر اكتمال البناء

### الخطوة 6: رفع إلى App Store Connect

1. بعد اكتمال Archive، ستظهر نافذة **Organizer**
2. اضغط **Distribute App**
3. اختر **App Store Connect**
4. اختر **Upload**
5. اتبع الخطوات حتى اكتمال الرفع

### الخطوة 7: إعداد App Store Connect

1. ادخل إلى [App Store Connect](https://appstoreconnect.apple.com)
2. أنشئ تطبيق جديد بالمعلومات التالية:

| الحقل | القيمة |
|-------|--------|
| الاسم | نشأة |
| اللغة الأساسية | العربية |
| Bundle ID | com.naashah.app |
| SKU | NAASHAH-APP-001 |

3. أضف الوصف والكلمات المفتاحية من ملف `metadata.md`
4. ارفع لقطات الشاشة من مجلد `screenshots-appstore/`
5. حدد تصنيف المحتوى (+4)
6. أضف معلومات الخصوصية
7. اختر البناء المرفوع
8. اضغط **Submit for Review**

### ملاحظات مهمة لمراجعة Apple:

- تأكد من توفير حساب تجريبي يعمل
- التطبيق يستخدم Push Notifications - تأكد من إعداد APNs Certificate
- التطبيق يطلب صلاحيات الكاميرا والموقع - تأكد من وجود أسباب واضحة في Info.plist
- `ITSAppUsesNonExemptEncryption` مضبوط على `false` (لا يستخدم تشفير مخصص)

---

## الجزء الثالث: النشر على Google Play

### الخطوة 1: فتح المشروع في Android Studio

```bash
npx cap open android
```

أو افتح مجلد `android/` في Android Studio يدوياً.

### الخطوة 2: إنشاء Keystore للتوقيع

```bash
keytool -genkey -v -keystore naashah-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias naashah \
  -storepass <YOUR_STORE_PASSWORD> \
  -keypass <YOUR_KEY_PASSWORD> \
  -dname "CN=Naashah, OU=Mobile, O=Naashah, L=Riyadh, ST=Riyadh, C=SA"
```

**تحذير:** احفظ ملف Keystore وكلمات المرور في مكان آمن. فقدانها يعني عدم القدرة على تحديث التطبيق مستقبلاً.

### الخطوة 3: إعداد التوقيع في build.gradle

أنشئ ملف `android/keystore.properties`:

```properties
storePassword=<YOUR_STORE_PASSWORD>
keyPassword=<YOUR_KEY_PASSWORD>
keyAlias=naashah
storeFile=../naashah-release.jks
```

ثم عدّل `android/app/build.gradle`:

```gradle
// أضف في أعلى الملف
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### الخطوة 4: بناء AAB (Android App Bundle)

```bash
cd android
./gradlew bundleRelease
```

الملف الناتج: `android/app/build/outputs/bundle/release/app-release.aab`

### الخطوة 5: إعداد Google Play Console

1. ادخل إلى [Google Play Console](https://play.google.com/console)
2. أنشئ تطبيق جديد:

| الحقل | القيمة |
|-------|--------|
| اسم التطبيق | نشأة |
| اللغة الافتراضية | العربية |
| نوع التطبيق | تطبيق |
| مجاني/مدفوع | مدفوع |

3. أكمل إعداد المتجر:
   - **الوصف القصير:** نظام متكامل لإدارة الحضانات والتواصل مع أولياء الأمور
   - **الوصف الكامل:** (من ملف metadata.md)
   - **أيقونة التطبيق:** 512x512 بصيغة PNG
   - **صورة الميزة:** 1024x500 بصيغة PNG
   - **لقطات الشاشة:** 2-8 لقطات لكل نوع جهاز

### الخطوة 6: رفع AAB

1. اذهب إلى **Release** → **Production**
2. اضغط **Create new release**
3. ارفع ملف `.aab`
4. أضف ملاحظات الإصدار
5. اضغط **Review release** ثم **Start rollout**

### الخطوة 7: إكمال متطلبات Google Play

| المتطلب | الإجراء |
|---------|---------|
| سياسة الخصوصية | أضف رابط https://naashah.com/privacy |
| تصنيف المحتوى | أكمل استبيان IARC |
| إعلانات | حدد "لا يحتوي على إعلانات" |
| الجمهور المستهدف | البالغون (18+) - لأنه للموظفين وأولياء الأمور |
| أمان البيانات | أكمل نموذج Data Safety |
| تصريح الأذونات | اشرح سبب كل إذن مطلوب |

---

## الجزء الرابع: إعداد Push Notifications

### iOS (APNs)

1. في [Apple Developer Portal](https://developer.apple.com):
   - اذهب إلى **Certificates, Identifiers & Profiles**
   - اختر **Keys** → **Create a Key**
   - فعّل **Apple Push Notifications service (APNs)**
   - حمّل ملف `.p8`

2. احفظ المعلومات التالية:
   - Key ID
   - Team ID
   - ملف .p8

### Android (FCM)

1. في [Firebase Console](https://console.firebase.google.com):
   - أنشئ مشروع جديد باسم "Naashah"
   - أضف تطبيق Android بـ package name: `com.naashah.app`
   - حمّل `google-services.json` وضعه في `android/app/`

2. في Firebase Console:
   - اذهب إلى **Project Settings** → **Cloud Messaging**
   - احصل على Server Key

---

## الجزء الخامس: قائمة التحقق النهائية

### قبل الرفع لـ App Store:

- [ ] Bundle ID صحيح: `com.naashah.app`
- [ ] اسم التطبيق: "نشأة"
- [ ] الإصدار والبناء محدّثان
- [ ] أيقونات بجميع المقاسات
- [ ] لقطات شاشة لـ iPhone 6.7" و 6.1"
- [ ] وصف التطبيق بالعربية والإنجليزية
- [ ] سياسة الخصوصية مرفوعة
- [ ] حساب تجريبي يعمل
- [ ] APNs Key مُعد
- [ ] اختبار على جهاز حقيقي

### قبل الرفع لـ Google Play:

- [ ] Package name صحيح: `com.naashah.app`
- [ ] Keystore محفوظ بأمان
- [ ] AAB مبني بنجاح
- [ ] أيقونة 512x512
- [ ] صورة الميزة 1024x500
- [ ] لقطات شاشة (حد أدنى 2)
- [ ] وصف التطبيق
- [ ] سياسة الخصوصية
- [ ] استبيان تصنيف المحتوى مكتمل
- [ ] نموذج Data Safety مكتمل
- [ ] google-services.json في مكانه
- [ ] اختبار على جهاز حقيقي

---

## الجزء السادس: التحديثات المستقبلية

عند إصدار تحديث جديد:

```bash
# 1. تحديث الكود وبناء التطبيق
pnpm build

# 2. مزامنة المنصات
npx cap sync

# 3. زيادة رقم الإصدار
# iOS: في Xcode → General → Version & Build
# Android: في android/app/build.gradle → versionCode & versionName

# 4. بناء ورفع
# iOS: Product → Archive → Distribute
# Android: ./gradlew bundleRelease
```

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| خطأ في التوقيع (iOS) | تأكد من اختيار Team صحيح وأن Provisioning Profile محدّث |
| فشل البناء (Android) | تأكد من JDK 17+ وأن Gradle wrapper محدّث |
| الإشعارات لا تعمل | تأكد من إعداد APNs (iOS) أو FCM (Android) |
| شاشة بيضاء بعد التثبيت | تأكد من أن `dist/public` يحتوي على ملفات البناء |
| رفض من Apple | راجع رسالة الرفض وأصلح المشكلة المحددة |
| رفض من Google | عادة بسبب سياسة الخصوصية أو الأذونات غير المبررة |

---

## ملفات المشروع المهمة

```
capacitor.config.ts          → إعدادات Capacitor الرئيسية
ios/App/App/Info.plist       → إعدادات iOS والأذونات
android/app/build.gradle     → إعدادات Android والتوقيع
android/app/src/main/AndroidManifest.xml → أذونات Android
app-store-assets/            → أيقونات ولقطات شاشة وبيانات المتجر
```
