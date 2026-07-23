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
            alt={isAr ? "نشأة" : "Nashaa"}
            className="w-16 h-16 mx-auto mb-2 object-contain"
          />
          <h1 className="text-xl font-bold text-slate-800">
            {step === "verifying" && (isAr ? "جاري التحقق..." : "Verifying...")}
            {step === "form" && isAr ? "تعيين كلمة مرور جديدة" : "Set New Password"}
            {step === "success" && (isAr ? "تم بنجاح" : "Success")}
            {step === "invalid" && isAr ? "رابط غير صالح" : "Invalid Link"}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "verifying" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{isAr ? "جاري التحقق من صلاحية الرابط..." : "Checking Link Validity..."}</p>
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {isAr ? "أدخل كلمة المرور الجديدة لحسابك" : "Enter the new password for your account"}
              </p>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{isAr ? "كلمة المرور الجديدة" : "New Password"}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={isAr ? "6 أحرف على الأقل" : "At least 6 characters"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{isAr ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={isAr ? "أعد إدخال كلمة المرور" : "Re-enter Password"}
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
                {resetPasswordMutation.isPending ? isAr ? "جاري التحديث..." : "Updating..." : isAr ? "تعيين كلمة المرور" : "Set Password"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-800">
                {isAr ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isAr ? "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة" : "You can now log in with the new password"}
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11"
              >
                {isAr ? "تسجيل الدخول" : "Login"}
              </Button>
            </div>
          )}

          {step === "invalid" && (
            <div className="text-center space-y-4 py-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-800">
                {isAr ? "رابط غير صالح" : "Invalid Link"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isAr ? "هذا الرابط منتهي الصلاحية أو تم استخدامه مسبقاً. يرجى طلب رابط جديد." : "This link has expired or has been used previously. Please request a new link."}
              </p>
              <Button
                onClick={() => setLocation("/forgot-password")}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11"
              >
                {isAr ? "طلب رابط جديد" : "Request new link"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
