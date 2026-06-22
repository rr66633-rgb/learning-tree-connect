import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowRight, Mail, Phone, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"input" | "otp" | "newPassword" | "success">("input");
  const [method, setMethod] = useState<"email" | "sms">("sms");
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.expiresAt) setExpiresAt(data.expiresAt);
      setStep("otp");
      startCountdown(60);
      startOtpExpiry(data.expiresAt || Date.now() + 5 * 60 * 1000);
    },
    onError: (error) => toast.error(error.message),
  });

  const verifyOtpMutation = trpc.auth.verifyResetOtp.useMutation({
    onSuccess: (data) => {
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setStep("newPassword");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setStep("success");
    },
    onError: (error) => toast.error(error.message),
  });

  const resendOtpMutation = trpc.auth.resendOtp.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.expiresAt) setExpiresAt(data.expiresAt);
      startCountdown(60);
    },
    onError: (error) => toast.error(error.message),
  });

  function startCountdown(seconds: number) {
    setCanResend(false);
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const [otpExpiryCountdown, setOtpExpiryCountdown] = useState(300);
  function startOtpExpiry(expiresAtMs: number) {
    const remaining = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
    setOtpExpiryCountdown(remaining);
    const interval = setInterval(() => {
      setOtpExpiryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      toast.error("يرجى إدخال البريد الإلكتروني أو رقم الجوال");
      return;
    }
    forgotMutation.mutate({ identifier, method });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }
    verifyOtpMutation.mutate({ identifier, code: otpCode });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    resetPasswordMutation.mutate({ token: resetToken, newPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7f4] via-white to-[#e8f4fd] p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663757302822/cscUgnSZqDVGFSpPSQMsV9/nashaa-official-logo-B6wEWwsMZLrsNvxGDzxUwN.webp"
            alt="نشأة"
            className="w-16 h-16 mx-auto mb-2 object-contain"
          />
          <h1 className="text-xl font-bold text-[#1a3a5c]">
            {step === "input" && "استعادة كلمة المرور"}
            {step === "otp" && "إدخال رمز التحقق"}
            {step === "newPassword" && "كلمة مرور جديدة"}
            {step === "success" && "تم بنجاح"}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Enter identifier */}
          {step === "input" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                أدخل بريدك الإلكتروني أو رقم جوالك لاستعادة كلمة المرور
              </p>

              {/* Method selection */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setMethod("sms")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    method === "sms" ? "bg-white shadow text-[#1a3a5c]" : "text-muted-foreground"
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  رسالة نصية
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    method === "email" ? "bg-white shadow text-[#1a3a5c]" : "text-muted-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  بريد إلكتروني
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {method === "sms" ? "رقم الجوال" : "البريد الإلكتروني"}
                </Label>
                <Input
                  id="identifier"
                  type={method === "sms" ? "tel" : "email"}
                  placeholder={method === "sms" ? "05xxxxxxxx" : "example@email.com"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  dir="ltr"
                  className="text-right"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1a3a5c] hover:bg-[#2d5a7b] text-white h-11"
                disabled={forgotMutation.isPending}
              >
                {forgotMutation.isPending ? "جاري الإرسال..." : "إرسال رمز التحقق"}
              </Button>

              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="h-4 w-4" />
                العودة لتسجيل الدخول
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                تم إرسال رمز التحقق إلى{" "}
                <span className="font-medium text-foreground" dir="ltr">{identifier}</span>
              </p>

              {/* OTP Expiry Timer */}
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  otpExpiryCountdown > 60 ? "bg-green-50 text-green-700" : 
                  otpExpiryCountdown > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                }`}>
                  {otpExpiryCountdown > 0 ? (
                    <>صالح لمدة {formatTime(otpExpiryCountdown)}</>
                  ) : (
                    <>انتهت صلاحية الرمز</>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">رمز التحقق</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  dir="ltr"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1a3a5c] hover:bg-[#2d5a7b] text-white h-11"
                disabled={verifyOtpMutation.isPending || otpExpiryCountdown === 0}
              >
                {verifyOtpMutation.isPending ? "جاري التحقق..." : "تحقق"}
              </Button>

              {/* Resend OTP */}
              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => resendOtpMutation.mutate({ identifier, type: "password_reset" })}
                    className="text-sm text-primary hover:underline font-medium"
                    disabled={resendOtpMutation.isPending}
                  >
                    {resendOtpMutation.isPending ? "جاري الإرسال..." : "إعادة إرسال الرمز"}
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    إعادة الإرسال بعد {countdown} ثانية
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep("input")}
                className="flex items-center justify-center gap-1 w-full text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="h-4 w-4" />
                تغيير رقم الجوال / البريد
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === "newPassword" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                أدخل كلمة المرور الجديدة
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
                <p className="text-xs text-muted-foreground">
                  {newPassword.length === 0 ? "" :
                   newPassword.length < 6 ? "ضعيفة جداً" :
                   newPassword.length < 8 ? "متوسطة" :
                   newPassword.length < 12 ? "جيدة" : "قوية"}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1a3a5c] hover:bg-[#2d5a7b] text-white h-11"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? "جاري التحديث..." : "تعيين كلمة المرور"}
              </Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-[#1a3a5c]">
                تم تغيير كلمة المرور بنجاح
              </h2>
              <p className="text-sm text-muted-foreground">
                يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-[#1a3a5c] hover:bg-[#2d5a7b] text-white h-11"
              >
                تسجيل الدخول
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
