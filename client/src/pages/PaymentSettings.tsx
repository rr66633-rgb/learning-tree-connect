import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, Shield, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function PaymentSettings() {
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  const [secretKeyLast4, setSecretKeyLast4] = useState('');

  const { data: settings, isLoading } = trpc.paymentSettings.get.useQuery();
  const updateMutation = trpc.paymentSettings.update.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ إعدادات الدفع بنجاح');
    },
    onError: (err) => {
      toast.error('فشل حفظ الإعدادات: ' + err.message);
    },
  });
  const testMutation = trpc.paymentSettings.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: () => {
      toast.error('فشل اختبار الاتصال');
    },
  });

  useEffect(() => {
    if (settings) {
      setPaymentEnabled(settings.paymentEnabled);
      setPublishableKey(settings.moyasarPublishableKey);
      setHasExistingSecret(settings.hasMoyasarSecretKey);
      setSecretKeyLast4(settings.moyasarSecretKeyLast4);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      paymentEnabled,
      moyasarPublishableKey: publishableKey,
      moyasarSecretKey: secretKey || undefined,
    });
  };

  const handleTest = () => {
    if (!publishableKey || (!secretKey && !hasExistingSecret)) {
      toast.error('أدخل المفاتيح أولاً');
      return;
    }
    if (!secretKey && hasExistingSecret) {
      toast.error('أدخل المفتاح السري للاختبار');
      return;
    }
    testMutation.mutate({
      publishableKey,
      secretKey,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">جاري التحميل...</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          إعدادات الدفع الإلكتروني
        </h1>
        <p className="text-muted-foreground mt-1">
          اربط حسابك في مُيسّر (Moyasar) لتفعيل الدفع الإلكتروني لأولياء الأمور
        </p>
      </div>

      {/* Enable/Disable */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">تفعيل الدفع الإلكتروني</CardTitle>
          <CardDescription>
            عند التفعيل، سيتمكن أولياء الأمور من دفع الفواتير إلكترونياً عبر Apple Pay و مدى وبطاقات الائتمان
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={paymentEnabled}
              onCheckedChange={setPaymentEnabled}
            />
            <span className={paymentEnabled ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {paymentEnabled ? "مفعّل" : "معطّل"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Moyasar Keys */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            مفاتيح مُيسّر (Moyasar)
          </CardTitle>
          <CardDescription>
            احصل على المفاتيح من لوحة تحكم مُيسّر: moyasar.com/dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="publishableKey">المفتاح العام (Publishable Key)</Label>
            <Input
              id="publishableKey"
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              placeholder="pk_live_..."
              className="mt-1 font-mono text-sm"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">يبدأ بـ pk_live_ أو pk_test_</p>
          </div>

          <div>
            <Label htmlFor="secretKey">المفتاح السري (Secret Key)</Label>
            <div className="relative mt-1">
              <Input
                id="secretKey"
                type={showSecretKey ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={hasExistingSecret ? secretKeyLast4 : "sk_live_..."}
                className="font-mono text-sm pe-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              يبدأ بـ sk_live_ أو sk_test_ — {hasExistingSecret ? "محفوظ بالفعل، أدخل قيمة جديدة للتحديث" : "مطلوب"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How to get keys */}
      <Card className="mb-4 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800">كيف أحصل على المفاتيح؟</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p>١. سجّل حساب في مُيسّر: moyasar.com</p>
          <p>٢. أكمل التحقق من الهوية والسجل التجاري</p>
          <p>٣. من لوحة التحكم → الإعدادات → مفاتيح API</p>
          <p>٤. انسخ المفتاح العام (Publishable) والسري (Secret)</p>
          <p>٥. الصقهم هنا واضغط "حفظ"</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
          {updateMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending}>
          {testMutation.isPending ? "جاري الاختبار..." : "اختبار الاتصال"}
        </Button>
      </div>

      {/* Status indicator */}
      {settings?.hasMoyasarSecretKey && settings?.moyasarPublishableKey && (
        <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">الدفع الإلكتروني مُعد وجاهز</span>
        </div>
      )}

      {!settings?.hasMoyasarSecretKey && (
        <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">أدخل مفاتيح مُيسّر لتفعيل الدفع الإلكتروني</span>
        </div>
      )}
    </div>
  );
}
