import { useTranslation } from "react-i18next";
export default function PrivacyPolicy() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/assets/logo.webp"
            alt={isAr ? "نشأة" : "Nasha\'a"}
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-800">{isAr ? "نشأة" : "Nasha\'a"}</h1>
        </div>

        <article className="prose prose-sm max-w-none text-gray-800" dir="rtl">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
          <p className="text-sm text-gray-500 mb-8">{isAr ? "آخر تحديث: يوليو 2026" : "Last Updated: July 2026"}</p>

          <p>
            تقوم منصة نشأة (isAr ? "نحن" : "We" أو isAr ? "لنا" : "For us") بتشغيل تطبيق نشأة للهواتف المحمولة (isAr ? "التطبيق" : "Application").
            {isAr ? "توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك عند استخدامك للتطبيق." : "This Privacy Policy explains how your information is collected, used, and protected when you use the app."}
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "المعلومات التي نجمعها" : "Information We Collect"}</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">{isAr ? "المعلومات الشخصية" : "Personal Information"}</h3>
          <p>
            {isAr ? "عند إنشاء حسابك من قبل إدارة الحضانة، قد يتم جمع المعلومات التالية:" : "When your account is created by nursery management, the following information may be collected:"}
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>
              <strong>{isAr ? "معلومات التواصل:" : "Contact Information:"}</strong> الاسم الكامل، البريد الإلكتروني، رقم الجوال
            </li>
            <li>
              <strong>{isAr ? "معلومات الطفل:" : "Child Information:"}</strong> اسم الطفل، تاريخ الميلاد، الفصل الدراسي،
              {isAr ? "المعلومات الطبية (الحساسية، الحالات الصحية، الأدوية)، جهات الاتصال الطارئة،" : "Medical information (allergies, health conditions, medications), emergency contacts,"}
              {isAr ? "الأشخاص المصرح لهم بالاستلام" : "Authorized Pick-up Persons"}
            </li>
            <li>
              <strong>{isAr ? "بيانات المصادقة:" : "Authentication Data:"}</strong> بيانات تسجيل الدخول، تفضيلات المصادقة البيومترية
              (بيانات البصمة/الوجه لا تغادر جهازك أبداً)
            </li>
            <li>
              <strong>{isAr ? "معلومات الجهاز:" : "Device Information:"}</strong> رموز الإشعارات لتوصيل التنبيهات
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">{isAr ? "المعلومات المجمعة تلقائياً" : "Automatically Collected Information"}</h3>
          <ul className="list-disc pr-6 space-y-1">
            <li>
              <strong>{isAr ? "بيانات الاستخدام:" : "Usage Data:"}</strong> سجلات الحضور، أوقات الاستلام، إيصالات قراءة الرسائل
            </li>
            <li>
              <strong>{isAr ? "معرفات الجهاز:" : "Device IDs:"}</strong> رموز جهاز الإشعارات
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            {isAr ? "كيف نستخدم معلوماتك" : "How we use your information"}
          </h2>
          <p>{isAr ? "نستخدم المعلومات المجمعة للأغراض التالية فقط:" : "We use the collected information for the following purposes only:"}</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>{isAr ? "تقديم خدمات إدارة الحضانة (الحضور، التقارير اليومية، إدارة الاستلام)" : "Provide nursery management services (attendance, daily reports, pickup management)"}</li>
            <li>{isAr ? "تسهيل التواصل بين أولياء الأمور والمعلمات" : "Facilitate communication between parents and teachers"}</li>
            <li>{isAr ? "إرسال إشعارات للأحداث المهمة (تنبيهات الاستلام، الرسائل الجديدة، التقارير اليومية)" : "Send notifications for important events (pickup alerts, new messages, daily reports)"}</li>
            <li>{isAr ? "ضمان سلامة الطفل من خلال التحقق من الأشخاص المصرح لهم بالاستلام" : "Ensure child safety by verifying authorized pick-up persons"}</li>
            <li>{isAr ? "إنشاء تقارير الحضور والأنشطة" : "Generate Attendance and Activity Reports"}</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "مشاركة البيانات" : "Data Sharing"}</h2>
          <p>
            نحن <strong>{isAr ? "لا" : "No"}</strong> نشارك معلوماتك الشخصية مع أي أطراف ثالثة. تحديداً:
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>{isAr ? "لا يتم بيع البيانات للمعلنين أو وسطاء البيانات" : "Data is not sold to advertisers or data brokers"}</li>
            <li>{isAr ? "لا يتم دمج أي أدوات إعلانية" : "No advertising tools integrated"}</li>
            <li>{isAr ? "لا يتم التتبع عبر التطبيقات" : "No cross-app tracking"}</li>
            <li>{isAr ? "لا يتم استخدام خدمات تحليلية تحدد هوية المستخدمين الفرديين" : "No analytics services identifying individual users are used"}</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "أمان البيانات" : "Data Security"}</h2>
          <p>
            {isAr ? "نطبق إجراءات تقنية وتنظيمية مناسبة لحماية بياناتك:" : "We apply appropriate technical and organizational measures to protect your data:"}
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>جميع عمليات نقل البيانات مشفرة باستخدام HTTPS/TLS 1.3</li>
            <li>المصادقة تتم عبر رموز OAuth 2.0 آمنة</li>
            <li>{isAr ? "التحكم في الوصول المبني على الأدوار يضمن أن أولياء الأمور يرون بيانات أطفالهم فقط" : "Role-based access control ensures parents only see their children\'s data"}</li>
            <li>{isAr ? "البيانات المخزنة على الخوادم مشفرة" : "Data stored on servers is encrypted"}</li>
            <li>{isAr ? "البيانات البيومترية (بصمة الوجه/الإصبع) تُعالج محلياً على جهازك ولا تُنقل إلى خوادمنا أبداً" : "Biometric data (face/fingerprint) is processed locally on your device and never transferred to our servers"}</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "خصوصية الأطفال" : "Children\'s Privacy"}</h2>
          <p>{isAr ? "يتعامل تطبيقنا مع معلومات الأطفال، ولكن:" : "Our app handles children\'s information, but:"}</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>{isAr ? "التطبيق يُستخدم حصرياً من قبل البالغين (أولياء الأمور وموظفي الحضانة)" : "The application is exclusively used by adults (parents and nursery staff)"}</li>
            <li>{isAr ? "الأطفال لا يستخدمون التطبيق أو يتفاعلون معه مباشرة" : "Children do not use or interact directly with the app"}</li>
            <li>{isAr ? "بيانات الأطفال يتم إدخالها وإدارتها فقط من قبل البالغين المصرح لهم" : "Child data is entered and managed only by authorized adults"}</li>
            <li>{isAr ? "نلتزم بأنظمة خصوصية الأطفال المعمول بها" : "We adhere to applicable child privacy regulations"}</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "الاحتفاظ بالبيانات" : "Data Retention"}</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>{isAr ? "يتم الاحتفاظ ببيانات الحساب طالما الحساب نشط" : "Account data is retained as long as the account is active"}</li>
            <li>{isAr ? "يتم الاحتفاظ بسجل الحضور والتقارير للعام الدراسي" : "Attendance records and reports are kept for the academic year"}</li>
            <li>{isAr ? "يتم الاحتفاظ بالرسائل حتى يتم أرشفتها أو حذفها من قبل الإدارة" : "Messages are kept until archived or deleted by administration"}</li>
            <li>{isAr ? "عند إلغاء تنشيط الحساب، يتم حذف البيانات الشخصية خلال 30 يوماً" : "Upon account deactivation, personal data will be deleted within 30 days"}</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "حذف الحساب واستعادته" : "Delete and Restore Account"}</h2>
          <p>
            {isAr ? "يمكنك طلب حذف حسابك في أي وقت من خلال إعدادات الحساب في التطبيق. عند تقديم طلب الحذف:" : "You can request to delete your account at any time through the account settings in the app. When submitting a deletion request:"}
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>
              <strong>{isAr ? "فترة السماح:" : "Grace Period:"}</strong> يتم منحك فترة سماح مدتها 30 يوماً قبل الحذف النهائي
            </li>
            <li>
              <strong>{isAr ? "استعادة الحساب:" : "Account Recovery:"}</strong> يمكنك استعادة حسابك خلال فترة الـ 30 يوم من خلال صفحة تسجيل الدخول
            </li>
            <li>
              <strong>{isAr ? "ما يتم حذفه:" : "What is deleted:"}</strong> بياناتك الشخصية (الاسم، البريد الإلكتروني، رقم الجوال، كلمة المرور)، إشعاراتك، واشتراكات الدفع
            </li>
            <li>
              <strong>{isAr ? "ما يبقى محفوظاً:" : "What is saved:"}</strong> بيانات طفلك التعليمية (سجلات الحضور، التقارير اليومية، التقييمات) تبقى محفوظة لدى الحضانة لأغراض الأرشفة التعليمية
            </li>
            <li>
              <strong>{isAr ? "بريد التأكيد:" : "Confirmation Email:"}</strong> سيتم إرسال بريد إلكتروني يؤكد طلب الحذف ويوضح تاريخ الحذف النهائي
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "حقوقك" : "Your Rights"}</h2>
          <p>{isAr ? "لديك الحق في:" : "You have the right to:"}</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>{isAr ? "الوصول إلى بياناتك الشخصية المحفوظة لدينا" : "Access your personal data saved with us"}</li>
            <li>{isAr ? "طلب تصحيح البيانات غير الدقيقة" : "Request to correct inaccurate data"}</li>
            <li>{isAr ? "طلب حذف بياناتك (مع فترة سماح 30 يوم)" : "Request to delete your data (with a 30-day grace period)"}</li>
            <li>{isAr ? "سحب الموافقة على الإشعارات في أي وقت" : "Withdraw consent for notifications at any time"}</li>
            <li>{isAr ? "استعادة حسابك خلال فترة السماح بعد طلب الحذف" : "Restore your account during the grace period after deletion request"}</li>
          </ul>
          <p className="mt-3">
            {isAr ? "لممارسة هذه الحقوق، يمكنك استخدام إعدادات الحساب في التطبيق أو التواصل مع إدارة الحضانة." : "To exercise these rights, you can use the account settings in the app or contact the nursery administration."}
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            {isAr ? "التغييرات على هذه السياسة" : "Changes to this policy"}
          </h2>
          <p>
            {isAr ? "قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإعلامك بأي تغييرات" : "We may update this privacy policy from time to time. We will notify you of any changes"}
            من خلال تحديث تاريخ isAr ? "آخر تحديث" : "Last Updated".
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">{isAr ? "تواصل معنا" : "Contact Us"}</h2>
          <p>{isAr ? "إذا كانت لديك أسئلة حول سياسة الخصوصية هذه، يرجى التواصل:" : "If you have questions about this privacy policy, please contact:"}</p>
          <ul className="list-none pr-0 space-y-1">
            <li>
              <strong>{isAr ? "البريد الإلكتروني:" : "Email:"}</strong> info@naashah.com
            </li>
            <li>
              <strong>{isAr ? "الموقع:" : "Location:"}</strong>{" "}
              <a href="https://naashah.com" className="text-primary hover:underline">
                https://naashah.com
              </a>
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            {isAr ? "شفافية التتبع" : "Tracking Transparency"}
          </h2>
          <p>
            هذا التطبيق <strong>{isAr ? "لا" : "No"}</strong> يستخدم إطار عمل شفافية تتبع التطبيقات. نحن لا
            {isAr ? "نتتبع المستخدمين عبر التطبيقات أو المواقع المملوكة لشركات أخرى." : "We track users across apps or websites owned by other companies."}
          </p>
        </article>

        <footer className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
          <p>&copy; 2026 نشأة. جميع الحقوق محفوظة.</p>
          <div className="mt-2 space-x-4 space-x-reverse">
            <a href="/terms" className="text-primary hover:underline">
              {isAr ? "شروط الاستخدام" : "Terms of Use"}
            </a>
            <a href="/privacy" className="text-primary hover:underline font-medium">
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
