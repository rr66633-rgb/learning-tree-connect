import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  MessageSquare, Mail, CheckCircle2, XCircle, AlertTriangle,
  Phone, Send, Shield, Clock, Info, Eye, EyeOff, Save, Loader2, RefreshCw
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotificationSettings() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: status, isLoading, refetch } = trpc.notifications.integrationStatus.useQuery();
  const { data: savedConfig, isLoading: configLoading } = trpc.notifications.getConfig.useQuery();

  const testSms = trpc.notifications.testSms.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(isAr ? "تم إرسال رسالة SMS تجريبية بنجاح" : "Test SMS sent successfully");
      else toast.error(data.message || (isAr ? "فشل إرسال الرسالة التجريبية" : "Failed to send test message"));
    },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء إرسال الرسالة التجريبية" : "Error sending test message"),
  });
  const testEmail = trpc.notifications.testEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(isAr ? "تم إرسال بريد إلكتروني تجريبي بنجاح" : "Test email sent successfully");
      else toast.error(data.message || (isAr ? "فشل إرسال البريد التجريبي" : "Failed to send test email"));
    },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء إرسال البريد التجريبي" : "Error sending test email"),
  });
  const saveConfig = trpc.notifications.saveConfig.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
      refetch();
    },
    onError: () => toast.error(isAr ? "فشل حفظ الإعدادات" : "Failed to save settings"),
  });

  // SMS (Twilio) form state
  const [smsAccountSid, setSmsAccountSid] = useState("");
  const [smsAuthToken, setSmsAuthToken] = useState("");
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [showSmsToken, setShowSmsToken] = useState(false);

  // Email (SendGrid) form state
  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [showEmailKey, setShowEmailKey] = useState(false);

  // Load saved config into form
  useEffect(() => {
    if (savedConfig) {
      if (savedConfig.twilio) {
        setSmsAccountSid(savedConfig.twilio.account_sid || "");
        setSmsAuthToken(savedConfig.twilio.auth_token || "");
        setSmsPhoneNumber(savedConfig.twilio.phone_number || "");
        setSmsEnabled(savedConfig.twilio.enabled === "true");
      }
      if (savedConfig.sendgrid) {
        setEmailApiKey(savedConfig.sendgrid.api_key || "");
        setEmailFromAddress(savedConfig.sendgrid.from_address || "");
        setEmailFromName(savedConfig.sendgrid.from_name || "");
        setEmailEnabled(savedConfig.sendgrid.enabled === "true");
      }
    }
  }, [savedConfig]);

  const handleSaveSms = () => {
    saveConfig.mutate({
      provider: 'twilio',
      settings: {
        account_sid: smsAccountSid,
        auth_token: smsAuthToken,
        phone_number: smsPhoneNumber,
        enabled: smsEnabled ? "true" : "false",
      },
    });
  };

  const handleSaveEmail = () => {
    saveConfig.mutate({
      provider: 'sendgrid',
      settings: {
        api_key: emailApiKey,
        from_address: emailFromAddress,
        from_name: emailFromName,
        enabled: emailEnabled ? "true" : "false",
      },
    });
  };

  if (isLoading || configLoading) {
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
            {isAr ? "إدارة خدمات الرسائل القصيرة والبريد الإلكتروني" : "Manage SMS & Email Services"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {isAr ? "تحديث" : "Refresh"}
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
              <p className="text-sm text-muted-foreground">{isAr ? "الحالة العامة" : "Status"}</p>
              <p className="font-semibold">
                {status?.sms.configured && status?.email.configured
                  ? (isAr ? "مُفعّل بالكامل" : "Fully Active")
                  : status?.sms.configured || status?.email.configured
                    ? (isAr ? "مُفعّل جزئياً" : "Partial")
                    : (isAr ? "غير مُفعّل" : "Inactive")}
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
              <p className="text-sm text-muted-foreground">SMS</p>
              <p className="font-semibold">
                {status?.sms.configured ? (isAr ? "مُفعّل" : "Active") : (isAr ? "غير مُفعّل" : "Inactive")}
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
              <p className="text-sm text-muted-foreground">{isAr ? "البريد" : "Email"}</p>
              <p className="font-semibold">
                {status?.email.configured ? (isAr ? "مُفعّل" : "Active") : (isAr ? "غير مُفعّل" : "Inactive")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS (Twilio) Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{isAr ? "الرسائل القصيرة" : "SMS Service"}</CardTitle>
                  <CardDescription>Twilio</CardDescription>
                </div>
              </div>
              <Badge variant={status?.sms.configured ? "default" : "secondary"} className={status?.sms.configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : ""}>
                {status?.sms.configured ? (
                  <><CheckCircle2 className="h-3 w-3 ml-1" />{isAr ? " مُفعّل" : " Active"}</>
                ) : (
                  <><XCircle className="h-3 w-3 ml-1" />{isAr ? " غير مُفعّل" : " Inactive"}</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-enabled" className="text-sm font-medium">
                {isAr ? "تفعيل الخدمة" : "Enable Service"}
              </Label>
              <Switch id="sms-enabled" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
            </div>
            <Separator />
            {/* Credentials */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="twilio-sid" className="text-sm">Account SID</Label>
                <Input
                  id="twilio-sid"
                  value={smsAccountSid}
                  onChange={(e) => setSmsAccountSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="font-mono text-sm direction-ltr text-left"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="twilio-token" className="text-sm">Auth Token</Label>
                <div className="relative">
                  <Input
                    id="twilio-token"
                    type={showSmsToken ? "text" : "password"}
                    value={smsAuthToken}
                    onChange={(e) => setSmsAuthToken(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="font-mono text-sm direction-ltr text-left pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmsToken(!showSmsToken)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSmsToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="twilio-phone" className="text-sm">{isAr ? "رقم الهاتف" : "Phone Number"}</Label>
                <Input
                  id="twilio-phone"
                  value={smsPhoneNumber}
                  onChange={(e) => setSmsPhoneNumber(e.target.value)}
                  placeholder="+966xxxxxxxxx"
                  className="font-mono text-sm direction-ltr text-left"
                />
              </div>
            </div>
            <Separator />
            {/* Services */}
            <div className="space-y-2">
              <h4 className="font-medium text-xs text-muted-foreground">{isAr ? "الخدمات المتاحة عند التفعيل:" : "Available when active:"}</h4>
              <div className="grid grid-cols-1 gap-1">
                <ServiceFeature label={isAr ? "رمز التحقق (OTP)" : "OTP Verification"} active={status?.sms.configured ?? false} />
                <ServiceFeature label={isAr ? "إعادة تعيين كلمة المرور" : "Password Reset"} active={status?.sms.configured ?? false} />
                <ServiceFeature label={isAr ? "إشعارات الاستلام" : "Pickup Notifications"} active={status?.sms.configured ?? false} />
              </div>
            </div>
            <Separator />
            {/* Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button size="sm" onClick={handleSaveSms} disabled={saveConfig.isPending} className="gap-2">
                {saveConfig.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isAr ? "حفظ" : "Save"}
              </Button>
              <Button
                size="sm" variant="outline"
                disabled={!status?.sms.configured || testSms.isPending}
                onClick={() => testSms.mutate()}
                className="gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {testSms.isPending ? (isAr ? "جاري..." : "...") : (isAr ? "رسالة تجريبية" : "Test")}
              </Button>
            </div>
            {/* Help */}
            {!status?.sms.configured && !smsAccountSid && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{isAr ? "كيفية التفعيل:" : "How to activate:"}</p>
                    <ol className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-0.5 list-decimal list-inside">
                      <li>{isAr ? "أنشئ حساب في" : "Create account at"} <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="underline">twilio.com</a></li>
                      <li>{isAr ? "انسخ Account SID و Auth Token" : "Copy Account SID & Auth Token"}</li>
                      <li>{isAr ? "اشترِ رقم هاتف" : "Purchase a phone number"}</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email (SendGrid) Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{isAr ? "البريد الإلكتروني" : "Email Service"}</CardTitle>
                  <CardDescription>SendGrid</CardDescription>
                </div>
              </div>
              <Badge variant={status?.email.configured ? "default" : "secondary"} className={status?.email.configured ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : ""}>
                {status?.email.configured ? (
                  <><CheckCircle2 className="h-3 w-3 ml-1" />{isAr ? " مُفعّل" : " Active"}</>
                ) : (
                  <><XCircle className="h-3 w-3 ml-1" />{isAr ? " غير مُفعّل" : " Inactive"}</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled" className="text-sm font-medium">
                {isAr ? "تفعيل الخدمة" : "Enable Service"}
              </Label>
              <Switch id="email-enabled" checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>
            <Separator />
            {/* Credentials */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sendgrid-key" className="text-sm">API Key</Label>
                <div className="relative">
                  <Input
                    id="sendgrid-key"
                    type={showEmailKey ? "text" : "password"}
                    value={emailApiKey}
                    onChange={(e) => setEmailApiKey(e.target.value)}
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="font-mono text-sm direction-ltr text-left pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailKey(!showEmailKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showEmailKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-from" className="text-sm">{isAr ? "عنوان المرسل" : "From Email"}</Label>
                <Input
                  id="email-from"
                  type="email"
                  value={emailFromAddress}
                  onChange={(e) => setEmailFromAddress(e.target.value)}
                  placeholder="noreply@example.com"
                  className="font-mono text-sm direction-ltr text-left"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-from-name" className="text-sm">{isAr ? "اسم المرسل" : "From Name"}</Label>
                <Input
                  id="email-from-name"
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                  placeholder={isAr ? "اسم المركز" : "Center Name"}
                  className="text-sm"
                />
              </div>
            </div>
            <Separator />
            {/* Services */}
            <div className="space-y-2">
              <h4 className="font-medium text-xs text-muted-foreground">{isAr ? "الخدمات المتاحة عند التفعيل:" : "Available when active:"}</h4>
              <div className="grid grid-cols-1 gap-1">
                <ServiceFeature label={isAr ? "رمز التحقق (OTP)" : "OTP Verification"} active={status?.email.configured ?? false} />
                <ServiceFeature label={isAr ? "إعادة تعيين كلمة المرور" : "Password Reset"} active={status?.email.configured ?? false} />
                <ServiceFeature label={isAr ? "تنبيه جهاز جديد" : "New Device Alert"} active={status?.email.configured ?? false} />
                <ServiceFeature label={isAr ? "إشعارات الفواتير" : "Invoice Notifications"} active={status?.email.configured ?? false} />
              </div>
            </div>
            <Separator />
            {/* Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button size="sm" onClick={handleSaveEmail} disabled={saveConfig.isPending} className="gap-2">
                {saveConfig.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isAr ? "حفظ" : "Save"}
              </Button>
              <Button
                size="sm" variant="outline"
                disabled={!status?.email.configured || testEmail.isPending}
                onClick={() => testEmail.mutate()}
                className="gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {testEmail.isPending ? (isAr ? "جاري..." : "...") : (isAr ? "بريد تجريبي" : "Test")}
              </Button>
            </div>
            {/* Help */}
            {!status?.email.configured && !emailApiKey && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{isAr ? "كيفية التفعيل:" : "How to activate:"}</p>
                    <ol className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-0.5 list-decimal list-inside">
                      <li>{isAr ? "أنشئ حساب في" : "Create account at"} <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="underline">sendgrid.com</a></li>
                      <li>{isAr ? "أنشئ مفتاح API" : "Create an API key"}</li>
                      <li>{isAr ? "وثّق عنوان المرسل" : "Verify sender address"}</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900 dark:text-blue-100">{isAr ? "ملاحظة مهمة" : "Important Note"}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {isAr ? "في حال عدم تفعيل الخدمات، تعمل المنصة بشكل طبيعي مع تسجيل جميع الرسائل في سجل النظام. رموز التحقق (OTP) تظهر في سجل الخادم للتطوير والاختبار." : "If services are not activated, the platform works normally with all messages logged. OTP codes appear in server logs for development and testing."}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900">
                  <Clock className="h-3 w-3 ml-1" />
                  {isAr ? "OTP يعمل عبر السجل" : "OTP via logs"}
                </Badge>
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900">
                  <Shield className="h-3 w-3 ml-1" />
                  {isAr ? "لا توقف للخدمات" : "No interruptions"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
