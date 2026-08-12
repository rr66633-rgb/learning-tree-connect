import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Shield, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function EmailSettings() {
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");

  const emailStatus = trpc.superAdmin.emailStatus.useQuery();

  const sendTestEmail = trpc.superAdmin.sendTestEmail.useMutation({
    onSuccess: (data) => {
      if (data.sent) {
        toast.success("تم إرسال إيميل الاختبار بنجاح");
      } else {
        toast.error(data.error || "فشل إرسال الإيميل");
      }
      setIsTesting(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
      setIsTesting(false);
    },
  });

  const verifyConnection = trpc.superAdmin.verifyEmailConnection.useMutation({
    onSuccess: (data) => {
      if (data.connected) {
        setConnectionStatus("connected");
        toast.success("الاتصال بـ Postmark ناجح");
      } else {
        setConnectionStatus("error");
        toast.error(data.error || "فشل الاتصال");
      }
      setIsVerifying(false);
    },
    onError: (error) => {
      setConnectionStatus("error");
      toast.error(error.message || "حدث خطأ");
      setIsVerifying(false);
    },
  });

  const handleTestEmail = () => {
    if (!testEmail) {
      toast.error("أدخل البريد الإلكتروني");
      return;
    }
    setIsTesting(true);
    sendTestEmail.mutate({ email: testEmail });
  };

  const handleVerifyConnection = () => {
    setIsVerifying(true);
    verifyConnection.mutate();
  };

  if (emailStatus.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const status = emailStatus.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات البريد الإلكتروني</h1>
        <p className="text-muted-foreground mt-1">إدارة خدمة إرسال البريد الإلكتروني (Postmark)</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            حالة الخدمة
          </CardTitle>
          <CardDescription>معلومات الاتصال بخدمة Postmark Email API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">المزوّد</span>
              <Badge variant="outline">Postmark</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">الحالة</span>
              {status?.configured ? (
                <Badge className="bg-green-100 text-green-800">مُعدّ</Badge>
              ) : (
                <Badge variant="destructive">غير مُعدّ</Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">البريد المرسل</span>
              <span className="text-sm text-muted-foreground">{status?.fromEmail || "—"}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Message Stream</span>
              <Badge variant="outline">outbound</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Server Token</span>
              {status?.configured ? (
                <span className="text-sm text-muted-foreground font-mono">****{status.tokenLast4}</span>
              ) : (
                <span className="text-sm text-red-500">غير مُعدّ</span>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">الخدمة مفعّلة</span>
              {status?.enabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyConnection}
              disabled={isVerifying || !status?.configured}
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isVerifying ? "animate-spin" : ""}`} />
              فحص الاتصال
            </Button>
            {connectionStatus === "connected" && (
              <Badge className="bg-green-100 text-green-800">متصل</Badge>
            )}
            {connectionStatus === "error" && (
              <Badge variant="destructive">خطأ في الاتصال</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Email Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إرسال إيميل اختبار
          </CardTitle>
          <CardDescription>أرسل إيميل تجريبي للتأكد من عمل الخدمة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="test-email" className="sr-only">البريد الإلكتروني</Label>
              <Input
                id="test-email"
                type="text"
                placeholder="أدخل البريد الإلكتروني للاختبار"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                dir="ltr"
              />
            </div>
            <Button
              onClick={handleTestEmail}
              disabled={isTesting || !status?.configured}
            >
              {isTesting ? "جاري الإرسال..." : "إرسال اختبار"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            سيتم إرسال رسالة اختبار من {status?.fromEmail || "info@naashah.com"} إلى البريد المحدد.
          </p>
        </CardContent>
      </Card>

      {/* Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>دليل الإعداد</CardTitle>
          <CardDescription>كيفية تغيير إعدادات Postmark</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>لتغيير إعدادات البريد الإلكتروني، عدّل المتغيرات التالية في Railway:</p>
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs space-y-2" dir="ltr">
            <p><span className="text-green-600">POSTMARK_SERVER_TOKEN</span> = Server API Token من Postmark</p>
            <p><span className="text-green-600">EMAIL_FROM</span> = البريد المرسل (مثل info@naashah.com)</p>
            <p><span className="text-green-600">EMAIL_FROM_NAME</span> = اسم المرسل (مثل نشأة)</p>
            <p><span className="text-green-600">EMAIL_ENABLED</span> = true أو false لتفعيل/تعطيل الخدمة</p>
          </div>
          <p className="text-amber-600 font-medium">
            تنبيه: لا تضع Server Token داخل الكود أو Git — استخدم Environment Variables فقط.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
