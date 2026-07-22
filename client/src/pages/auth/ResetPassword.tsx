import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const [step, setStep] = useState<"verifying" | "form" | "success" | "invalid">("verifying");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const verifyTokenMutation = trpc.auth.verifyResetToken.useMutation({
    onSuccess: () => setStep("form"),
    onError: () => setStep("invalid"),
  });

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setStep("success"),
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (token) {
      verifyTokenMutation.mutate({ token });
    } else {
      setStep("invalid");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(isAr ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    resetPasswordMutation.mutate({ token, newPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7f4] via-white to-[#e8f4fd] p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <img
            src="/assets/logo.webp"
            alt="نشأة"
            className="w-16 h-16 mx-auto mb-2 object-contain"
          />
          <h1 className="text-xl font-bold text-slate-800">
            {step === "verifying" && "جاري التحقق..."}
            {step === "form" && "تعيين كلمة مرور جديدة"}
            {step === "success" && "تم بنجاح"}
            {step === "invalid" && "رابط غير صالح"}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "verifying" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري التحقق من صلاحية الرابط...</p>
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                أدخل كلمة المرور الجديدة لحسابك
              </p>

              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="6 أحرف على الأقل"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="أعد إدخال كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          newPassword.length >= level * 3
                            ? level <= 1 ? "bg-red-400" : level <= 2 ? "bg-amber-400" : level <= 3 ? "bg-green-400" : "bg-green-600"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? "جاري التحديث..." : "تعيين كلمة المرور"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-800">
                تم تغيير كلمة المرور بنجاح
              </h2>
              <p className="text-sm text-muted-foreground">
                يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11"
              >
                تسجيل الدخول
              </Button>
            </div>
          )}

          {step === "invalid" && (
            <div className="text-center space-y-4 py-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-800">
                رابط غير صالح
              </h2>
              <p className="text-sm text-muted-foreground">
                هذا الرابط منتهي الصلاحية أو تم استخدامه مسبقاً. يرجى طلب رابط جديد.
              </p>
              <Button
                onClick={() => setLocation("/forgot-password")}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11"
              >
                طلب رابط جديد
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
