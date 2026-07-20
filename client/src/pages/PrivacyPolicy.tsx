export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/assets/logo.webp"
            alt="نشأة"
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-800">نشأة</h1>
        </div>

        <article className="prose prose-sm max-w-none text-gray-800" dir="rtl">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">سياسة الخصوصية</h1>
          <p className="text-sm text-gray-500 mb-8">آخر تحديث: يوليو 2026</p>

          <p>
            تقوم منصة نشأة ("نحن" أو "لنا") بتشغيل تطبيق نشأة للهواتف المحمولة ("التطبيق").
            توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك عند استخدامك للتطبيق.
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">المعلومات التي نجمعها</h2>

          <h3 className="text-lg font-medium mt-6 mb-3">المعلومات الشخصية</h3>
          <p>
            عند إنشاء حسابك من قبل إدارة الحضانة، قد يتم جمع المعلومات التالية:
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>
              <strong>معلومات التواصل:</strong> الاسم الكامل، البريد الإلكتروني، رقم الجوال
            </li>
            <li>
              <strong>معلومات الطفل:</strong> اسم الطفل، تاريخ الميلاد، الفصل الدراسي،
              المعلومات الطبية (الحساسية، الحالات الصحية، الأدوية)، جهات الاتصال الطارئة،
              الأشخاص المصرح لهم بالاستلام
            </li>
            <li>
              <strong>بيانات المصادقة:</strong> بيانات تسجيل الدخول، تفضيلات المصادقة البيومترية
              (بيانات البصمة/الوجه لا تغادر جهازك أبداً)
            </li>
            <li>
              <strong>معلومات الجهاز:</strong> رموز الإشعارات لتوصيل التنبيهات
            </li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-3">المعلومات المجمعة تلقائياً</h3>
          <ul className="list-disc pr-6 space-y-1">
            <li>
              <strong>بيانات الاستخدام:</strong> سجلات الحضور، أوقات الاستلام، إيصالات قراءة الرسائل
            </li>
            <li>
              <strong>معرفات الجهاز:</strong> رموز جهاز الإشعارات
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            كيف نستخدم معلوماتك
          </h2>
          <p>نستخدم المعلومات المجمعة للأغراض التالية فقط:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>تقديم خدمات إدارة الحضانة (الحضور، التقارير اليومية، إدارة الاستلام)</li>
            <li>تسهيل التواصل بين أولياء الأمور والمعلمات</li>
            <li>إرسال إشعارات للأحداث المهمة (تنبيهات الاستلام، الرسائل الجديدة، التقارير اليومية)</li>
            <li>ضمان سلامة الطفل من خلال التحقق من الأشخاص المصرح لهم بالاستلام</li>
            <li>إنشاء تقارير الحضور والأنشطة</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">مشاركة البيانات</h2>
          <p>
            نحن <strong>لا</strong> نشارك معلوماتك الشخصية مع أي أطراف ثالثة. تحديداً:
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>لا يتم بيع البيانات للمعلنين أو وسطاء البيانات</li>
            <li>لا يتم دمج أي أدوات إعلانية</li>
            <li>لا يتم التتبع عبر التطبيقات</li>
            <li>لا يتم استخدام خدمات تحليلية تحدد هوية المستخدمين الفرديين</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">أمان البيانات</h2>
          <p>
            نطبق إجراءات تقنية وتنظيمية مناسبة لحماية بياناتك:
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>جميع عمليات نقل البيانات مشفرة باستخدام HTTPS/TLS 1.3</li>
            <li>المصادقة تتم عبر رموز OAuth 2.0 آمنة</li>
            <li>التحكم في الوصول المبني على الأدوار يضمن أن أولياء الأمور يرون بيانات أطفالهم فقط</li>
            <li>البيانات المخزنة على الخوادم مشفرة</li>
            <li>البيانات البيومترية (بصمة الوجه/الإصبع) تُعالج محلياً على جهازك ولا تُنقل إلى خوادمنا أبداً</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">خصوصية الأطفال</h2>
          <p>يتعامل تطبيقنا مع معلومات الأطفال، ولكن:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>التطبيق يُستخدم حصرياً من قبل البالغين (أولياء الأمور وموظفي الحضانة)</li>
            <li>الأطفال لا يستخدمون التطبيق أو يتفاعلون معه مباشرة</li>
            <li>بيانات الأطفال يتم إدخالها وإدارتها فقط من قبل البالغين المصرح لهم</li>
            <li>نلتزم بأنظمة خصوصية الأطفال المعمول بها</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">الاحتفاظ بالبيانات</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>يتم الاحتفاظ ببيانات الحساب طالما الحساب نشط</li>
            <li>يتم الاحتفاظ بسجل الحضور والتقارير للعام الدراسي</li>
            <li>يتم الاحتفاظ بالرسائل حتى يتم أرشفتها أو حذفها من قبل الإدارة</li>
            <li>عند إلغاء تنشيط الحساب، يتم حذف البيانات الشخصية خلال 30 يوماً</li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">حذف الحساب واستعادته</h2>
          <p>
            يمكنك طلب حذف حسابك في أي وقت من خلال إعدادات الحساب في التطبيق. عند تقديم طلب الحذف:
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>
              <strong>فترة السماح:</strong> يتم منحك فترة سماح مدتها 30 يوماً قبل الحذف النهائي
            </li>
            <li>
              <strong>استعادة الحساب:</strong> يمكنك استعادة حسابك خلال فترة الـ 30 يوم من خلال صفحة تسجيل الدخول
            </li>
            <li>
              <strong>ما يتم حذفه:</strong> بياناتك الشخصية (الاسم، البريد الإلكتروني، رقم الجوال، كلمة المرور)، إشعاراتك، واشتراكات الدفع
            </li>
            <li>
              <strong>ما يبقى محفوظاً:</strong> بيانات طفلك التعليمية (سجلات الحضور، التقارير اليومية، التقييمات) تبقى محفوظة لدى الحضانة لأغراض الأرشفة التعليمية
            </li>
            <li>
              <strong>بريد التأكيد:</strong> سيتم إرسال بريد إلكتروني يؤكد طلب الحذف ويوضح تاريخ الحذف النهائي
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">حقوقك</h2>
          <p>لديك الحق في:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>الوصول إلى بياناتك الشخصية المحفوظة لدينا</li>
            <li>طلب تصحيح البيانات غير الدقيقة</li>
            <li>طلب حذف بياناتك (مع فترة سماح 30 يوم)</li>
            <li>سحب الموافقة على الإشعارات في أي وقت</li>
            <li>استعادة حسابك خلال فترة السماح بعد طلب الحذف</li>
          </ul>
          <p className="mt-3">
            لممارسة هذه الحقوق، يمكنك استخدام إعدادات الحساب في التطبيق أو التواصل مع إدارة الحضانة.
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            التغييرات على هذه السياسة
          </h2>
          <p>
            قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإعلامك بأي تغييرات
            من خلال تحديث تاريخ "آخر تحديث".
          </p>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">تواصل معنا</h2>
          <p>إذا كانت لديك أسئلة حول سياسة الخصوصية هذه، يرجى التواصل:</p>
          <ul className="list-none pr-0 space-y-1">
            <li>
              <strong>البريد الإلكتروني:</strong> info@naashah.com
            </li>
            <li>
              <strong>الموقع:</strong>{" "}
              <a href="https://naashah.com" className="text-primary hover:underline">
                https://naashah.com
              </a>
            </li>
          </ul>

          <hr className="my-6" />

          <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">
            شفافية التتبع
          </h2>
          <p>
            هذا التطبيق <strong>لا</strong> يستخدم إطار عمل شفافية تتبع التطبيقات. نحن لا
            نتتبع المستخدمين عبر التطبيقات أو المواقع المملوكة لشركات أخرى.
          </p>
        </article>

        <footer className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
          <p>&copy; 2026 نشأة. جميع الحقوق محفوظة.</p>
          <div className="mt-2 space-x-4 space-x-reverse">
            <a href="/terms" className="text-primary hover:underline">
              شروط الاستخدام
            </a>
            <a href="/privacy" className="text-primary hover:underline font-medium">
              سياسة الخصوصية
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
