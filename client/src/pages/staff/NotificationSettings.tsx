import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, Mail, CheckCircle2, XCircle, AlertTriangle,
  Phone, Send, Shield, Clock, Settings2, RefreshCw, Info
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotificationSettings() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: status, isLoading, refetch } = trpc.notifications.integrationStatus.useQuery();
  const testSms = trpc.notifications.testSms.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("تم إرسال رسالة SMS تجريبية بنجاح");
      } else {
        toast.error(data.message || "فشل إرسال الرسالة التجريبية");
      }
    },
    onError: () => toast.error("حدث خطأ أثناء إرسال الرسالة التجريبية"),
  });
  const testEmail = trpc.notifications.testEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("تم إرسال بريد إلكتروني تجريبي بنجاح");
      } else {
        toast.error(data.message || "فشل إرسال البريد التجريبي");
      }
    },
    onError: () => toast.error("حدث خطأ أثناء إرسال البريد التجريبي"),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? "إعدادات الإشعارات" : "Notification Settings"}</h1>
          <p className="text-muted-foreground mt-1">
            إدارة خدمات الرسائل القصيرة والبريد الإلكتروني للمنصة
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث الحالة
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الحالة العامة</p>
              <p className="font-semibold">
                {status?.sms.configured || status?.email.configured ? "مُفعّل جزئياً" : "غير مُفعّل"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الرسائل القصيرة</p>
              <p className="font-semibold">
                {status?.sms.configured ? "مُفعّل" : "غير مُفعّل"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isAr ? "البريد الإلكتروني" : "Email"}</p>
              <p className="font-semibold">
                {status?.email.configured ? "مُفعّل" : "غير مُفعّل"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">خدمة الرسائل القصيرة</CardTitle>
                  <CardDescription>Twilio SMS</CardDescription>
                </div>
              </div>
              <Badge variant={status?.sms.configured ? "default" : "secondary"} className={status?.sms.configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : ""}>
                {status?.sms.configured ? (
                  <><CheckCircle2 className="h-3 w-3 ml-1" /> مُفعّل</>
                ) : (
                  <><XCircle className="h-3 w-3 ml-1" /> غير مُفعّل</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Configuration Status */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                حالة الإعداد
              </h4>
              <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                <ConfigItem label="معرّف الحساب" configured={status?.sms.details?.hasAccountSid ?? false} />
                <ConfigItem label="رمز المصادقة" configured={status?.sms.details?.hasAuthToken ?? false} />
                <ConfigItem label="رقم الهاتف" configured={status?.sms.details?.hasPhoneNumber ?? false} value={status?.sms.details?.phoneNumber} />
                <ConfigItem label="الخدمة مُفعّلة" configured={status?.sms.details?.enabled ?? false} />
              </div>
            </div>

            <Separator />

            {/* Capabilities */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Send className="h-4 w-4" />
                الخدمات المتاحة
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <ServiceFeature label="إرسال رمز التحقق (OTP)" active={status?.sms.configured ?? false} />
                <ServiceFeature label="رسالة ترحيب للمستخدمين الجدد" active={status?.sms.configured ?? false} />
                <ServiceFeature label="إعادة تعيين كلمة المرور" active={status?.sms.configured ?? false} />
                <ServiceFeature label="إشعارات استلام الأطفال" active={status?.sms.configured ?? false} />
              </div>
            </div>

            <Separator />

            {/* Test Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">اختبار الخدمة</p>
              <Button
                size="sm"
                variant="outline"
                disabled={!status?.sms.configured || testSms.isPending}
                onClick={() => testSms.mutate()}
                className="gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {testSms.isPending ? "جاري الإرسال..." : "إرسال رسالة تجريبية"}
              </Button>
            </div>

            {/* Setup Instructions */}
            {!status?.sms.configured && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">خطوات التفعيل</p>
                    <ol className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-decimal list-inside">
                      <li>أنشئ حساباً في Twilio (twilio.com)</li>
                      <li>احصل على رقم هاتف سعودي أو دولي</li>
                      <li>أضف المتغيرات التالية في إعدادات المشروع:</li>
                    </ol>
                    <div className="mt-2 bg-amber-100 dark:bg-amber-900/50 rounded p-2 text-xs font-mono direction-ltr text-left space-y-0.5">
                      <div>TWILIO_ACCOUNT_SID</div>
                      <div>TWILIO_AUTH_TOKEN</div>
                      <div>TWILIO_PHONE_NUMBER</div>
                      <div>SMS_ENABLED=true</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">خدمة البريد الإلكتروني</CardTitle>
                  <CardDescription>SendGrid</CardDescription>
                </div>
              </div>
              <Badge variant={status?.email.configured ? "default" : "secondary"} className={status?.email.configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : ""}>
                {status?.email.configured ? (
                  <><CheckCircle2 className="h-3 w-3 ml-1" /> مُفعّل</>
                ) : (
                  <><XCircle className="h-3 w-3 ml-1" /> غير مُفعّل</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Configuration Status */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                حالة الإعداد
              </h4>
              <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                <ConfigItem label="مفتاح API" configured={status?.email.details?.hasApiKey ?? false} />
                <ConfigItem label="عنوان المرسل" configured={status?.email.details?.hasFromAddress ?? false} value={status?.email.details?.fromAddress} />
                <ConfigItem label="اسم المرسل" configured={status?.email.details?.hasFromName ?? false} value={status?.email.details?.fromName} />
                <ConfigItem label="الخدمة مُفعّلة" configured={status?.email.details?.enabled ?? false} />
              </div>
            </div>

            <Separator />

            {/* Capabilities */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Send className="h-4 w-4" />
                الخدمات المتاحة
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <ServiceFeature label="إرسال رمز التحقق (OTP)" active={status?.email.configured ?? false} />
                <ServiceFeature label="رسالة ترحيب للمستخدمين الجدد" active={status?.email.configured ?? false} />
                <ServiceFeature label="إعادة تعيين كلمة المرور" active={status?.email.configured ?? false} />
                <ServiceFeature label="إرسال الفواتير" active={status?.email.configured ?? false} />
              </div>
            </div>

            <Separator />

            {/* Test Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">اختبار الخدمة</p>
              <Button
                size="sm"
                variant="outline"
                disabled={!status?.email.configured || testEmail.isPending}
                onClick={() => testEmail.mutate()}
                className="gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {testEmail.isPending ? "جاري الإرسال..." : "إرسال بريد تجريبي"}
              </Button>
            </div>

            {/* Setup Instructions */}
            {!status?.email.configured && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">خطوات التفعيل</p>
                    <ol className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-decimal list-inside">
                      <li>أنشئ حساباً في SendGrid (sendgrid.com)</li>
                      <li>أنشئ مفتاح API مع صلاحيات الإرسال</li>
                      <li>وثّق عنوان المرسل (Sender Authentication)</li>
                      <li>أضف المتغيرات التالية في إعدادات المشروع:</li>
                    </ol>
                    <div className="mt-2 bg-amber-100 dark:bg-amber-900/50 rounded p-2 text-xs font-mono direction-ltr text-left space-y-0.5">
                      <div>SENDGRID_API_KEY</div>
                      <div>EMAIL_FROM=noreply@naashah.com</div>
                      <div>EMAIL_FROM_NAME=نشأة</div>
                      <div>EMAIL_ENABLED=true</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fallback Behavior Info */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900 dark:text-blue-100">آلية العمل الاحتياطية</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                في حال عدم تفعيل خدمات الرسائل القصيرة أو البريد الإلكتروني، تعمل المنصة بشكل طبيعي مع تسجيل جميع الرسائل في سجل النظام بدلاً من إرسالها فعلياً. هذا يضمن عدم توقف أي وظيفة في المنصة حتى بدون تفعيل الخدمات الخارجية.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900">
                  <Clock className="h-3 w-3 ml-1" />
                  OTP يعمل عبر السجل
                </Badge>
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900">
                  <Shield className="h-3 w-3 ml-1" />
                  لا توقف للخدمات
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function ConfigItem({ label, configured, value }: { label: string; configured: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-mono bg-background px-2 py-0.5 rounded">{value}</span>}
        {configured ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
      </div>
    </div>
  );
}

function ServiceFeature({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
