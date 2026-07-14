import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Phone, ArrowRight, Smartphone } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";

type LoginMode = "password" | "otp";
type OtpStep = "phone" | "verify";

export default function Login() {
  const [, setLocation] = useLocation();
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  
  // Password login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP login state
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [countdown, setCountdown] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const loginRetryRef = useRef(0);

  // Warm-up ping: wake up the server as soon as login page loads
  useEffect(() => {
    fetch(apiUrl('/api/csrf-token'), { credentials: 'include' }).catch(() => {});
  }, []);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدخول بنجاح");
      loginRetryRef.current = 0;
      window.location.reload();
    },
    onError: (error) => {
      // Detect network errors - includes iOS Safari's "Load failed" (lowercase 'f')
      const msg = error.message.toLowerCase();
      const isNetworkError = 
        msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('failed') ||
        msg.includes('abort') ||
        msg.includes('timeout') ||
        msg.includes('load failed') ||
        msg.includes('the internet connection appears to be offline') ||
        msg.includes('a server with the specified hostname could not be found');
      
      // Silent auto-retry on network errors (up to 3 times) - no toast shown during retries
      if (loginRetryRef.current < 3 && isNetworkError) {
        loginRetryRef.current += 1;
        // Silently retry after increasing delay (2s, 4s, 6s)
        setTimeout(() => {
          loginMutation.mutate({ identifier, password });
        }, 2000 * loginRetryRef.current);
        return;
      }
      // Only show error after all retries exhausted
      const friendlyMessage = isNetworkError
        ? "حدث خطأ في الاتصال. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى."
        : error.message;
      toast.error(friendlyMessage);
      setIsLoading(false);
      loginRetryRef.current = 0;
    },
  });

  // Helper to get user-friendly error message
  const getFriendlyError = (error: { message: string }) => {
    const msg = error.message.toLowerCase();
    const isNetwork = msg.includes('fetch') || msg.includes('network') || msg.includes('failed') ||
      msg.includes('abort') || msg.includes('timeout') || msg.includes('load failed') ||
      msg.includes('the internet connection appears to be offline');
    return isNetwork ? "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." : error.message;
  };

  const sendPhoneOtpMutation = trpc.auth.sendPhoneOtp.useMutation({
    onSuccess: (data) => {
      toast.success("تم إرسال رمز التحقق");
      setOtpStep("verify");
      setOtpExpiresAt(data.expiresAt);
      setCountdown(60);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(getFriendlyError(error));
      setIsLoading(false);
    },
  });
  const verifyPhoneOtpMutation = trpc.auth.verifyPhoneOtp.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدخول بنجاح");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(getFriendlyError(error));
      setIsLoading(false);
    },
  });
  const resendOtpMutation = trpc.auth.resendOtp.useMutation({
    onSuccess: (data) => {
      toast.success("تم إرسال رمز تحقق جديد");
      setOtpExpiresAt(data.expiresAt);
      setCountdown(60);
    },
    onError: (error) => {
      toast.error(getFriendlyError(error));
    },
  });

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("يرجى إدخال البيانات المطلوبة");
      return;
    }
    setIsLoading(true);
    loginMutation.mutate({ identifier, password });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      toast.error("يرجى إدخال رقم جوال صحيح");
      return;
    }
    setIsLoading(true);
    sendPhoneOtpMutation.mutate({ phone });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("يرجى إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }
    setIsLoading(true);
    verifyPhoneOtpMutation.mutate({ phone, code: otpCode });
  };

  const handleResendOtp = () => {
    if (countdown > 0) return;
    resendOtpMutation.mutate({ identifier: phone, type: "login_verification" });
  };

  const switchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setIsLoading(false);
    setOtpStep("phone");
    setOtpCode("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7f4] via-white to-[#e8f4fd] p-4 md:p-8" dir="rtl">
      <Card className="w-full max-w-md md:max-w-lg shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663757302822/cscUgnSZqDVGFSpPSQMsV9/nashaa-official-logo-B6wEWwsMZLrsNvxGDzxUwN.webp"
            alt="نشأة"
            className="w-20 h-20 mx-auto mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-800">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مرحباً بك في نشأة
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-muted p-1 gap-1">
            <button
              type="button"
              onClick={() => switchMode("password")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginMode === "password"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-muted-foreground hover:text-slate-600"
              }`}
            >
              <Lock className="h-4 w-4" />
              كلمة المرور
            </button>
            <button
              type="button"
              onClick={() => switchMode("otp")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginMode === "otp"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-muted-foreground hover:text-slate-600"
              }`}
            >
              <Smartphone className="h-4 w-4" />
              رمز التحقق
            </button>
          </div>

          {/* PASSWORD LOGIN */}
          {loginMode === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  البريد الإلكتروني أو رقم الجوال
                </Label>
                <div className="relative">
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="example@email.com أو 05xxxxxxxx"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pr-10 text-right"
                    dir="ltr"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {identifier.includes("@") ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10"
                    dir="ltr"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00C9B7] hover:bg-[#00B5A5] active:bg-[#009E93] text-white font-medium h-12 md:h-14 text-base md:text-lg rounded-xl active:scale-[0.97] transition-all duration-150"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>
            </form>
          )}

          {/* OTP LOGIN */}
          {loginMode === "otp" && otpStep === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  رقم الجوال
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10 text-right"
                    dir="ltr"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  سيتم إرسال رمز تحقق إلى بريدك الإلكتروني المرتبط بهذا الرقم
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00C9B7] hover:bg-[#00B5A5] active:bg-[#009E93] text-white font-medium h-12 md:h-14 text-base md:text-lg rounded-xl active:scale-[0.97] transition-all duration-150"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    جاري الإرسال...
                  </span>
                ) : (
                  "إرسال رمز التحقق"
                )}
              </Button>
            </form>
          )}

          {loginMode === "otp" && otpStep === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <button
                type="button"
                onClick={() => { setOtpStep("phone"); setOtpCode(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                تغيير الرقم
              </button>

              <div className="text-center py-2">
                <p className="text-sm text-slate-600">
                  تم إرسال رمز التحقق إلى البريد المرتبط بالرقم
                </p>
                <p className="text-lg font-bold text-slate-800 mt-1 tracking-wider" dir="ltr">
                  {phone}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">
                  رمز التحقق
                </Label>
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
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00C9B7] hover:bg-[#00B5A5] active:bg-[#009E93] text-white font-medium h-12 md:h-14 text-base md:text-lg rounded-xl active:scale-[0.97] transition-all duration-150"
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    جاري التحقق...
                  </span>
                ) : (
                  "تأكيد الدخول"
                )}
              </Button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    إعادة الإرسال بعد <span className="font-bold text-primary">{countdown}</span> ثانية
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    إعادة إرسال الرمز
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <button
                onClick={() => setLocation("/register")}
                className="text-primary hover:underline font-medium"
              >
                إنشاء حساب جديد
              </button>
            </p>
          </div>

          <div className="text-center pt-4 border-t mt-4">
            <p className="text-xs text-muted-foreground">
              بتسجيل الدخول، أنت توافق على{" "}
              <a href="/terms" className="text-primary hover:underline">
                شروط الخدمة
              </a>
              {" "}و{" "}
              <a href="/privacy" className="text-primary hover:underline">
                سياسة الخصوصية
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
