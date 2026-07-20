import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react";

export default function RecoverAccount() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recovered, setRecovered] = useState(false);

  const recoverMutation = trpc.auth.recoverAccount.useMutation({
    onSuccess: (data) => {
      setRecovered(true);
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    recoverMutation.mutate({ email, password });
  };

  if (recovered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-800">تم استعادة حسابك بنجاح</h2>
            <p className="text-muted-foreground">
              حسابك نشط الآن ويمكنك تسجيل الدخول واستخدام جميع خدمات المنصة.
            </p>
            <Button
              onClick={() => setLocation("/login")}
              className="w-full bg-[#00C9B7] hover:bg-[#00B5A5] text-white font-medium h-12 rounded-xl"
            >
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-3">
            <RefreshCw className="h-7 w-7 text-amber-600" />
          </div>
          <CardTitle className="text-xl">استعادة الحساب</CardTitle>
          <CardDescription>
            إذا قمت بطلب حذف حسابك ولم تنتهِ فترة السماح (30 يوم)، يمكنك استعادة حسابك هنا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecover} className="space-y-4">
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium h-12 rounded-xl"
              disabled={recoverMutation.isPending}
            >
              {recoverMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  جاري الاستعادة...
                </span>
              ) : (
                "استعادة الحساب"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-sm text-primary hover:underline font-medium"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
