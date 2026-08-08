import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Phone, ArrowRight, Smartphone, Building2, UserRound } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";

import { useNativeSessionGate } from "@/contexts/NativeSessionGate";
import { useTranslation } from "react-i18next";

type LoginMode = "password" | "otp";
type OtpStep = "phone" | "verify";
type AccountOption = {
  accountId: number;
  displayName: string;
  role: string;
  organizationName: string;
};

export default function Login() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [, setLocation] = useLocation();
  const { enableNetwork } = useNativeSessionGate();
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  
  // Password login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountOptions, setAccountOptions] = useState<AccountOption[] | null>(null);

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
    onSuccess: (data) => {
      if ('requiresAccountSelection' in data && data.requiresAccountSelection) {
        setAccountOptions(data.accounts);
        setIsLoading(false);
        toast.info(isAr ? "اختر الحساب الذي تريد الدخول إليه" : "Choose the account you want to access");
        return;
      }
      toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Login successful");
      loginRetryRef.current = 0;
      // Open the network gate so auth.me and branding queries can fire
      enableNetwork();
      window.location.reload();
    },
    onError: (error) => {
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
      
      const friendlyMessage = isNetworkError
        ? isAr ? "حدث خطأ في الاتصال. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى." : "Connection error. Please check your internet connection and try again."
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
    return isNetwork ? isAr ? "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." : "Connection error. Please try again." : error.message;
  };

  const sendPhoneOtpMutation = trpc.auth.sendPhoneOtp.useMutation({
    onSuccess: (data) => {
      toast.success(isAr ? "تم إرسال رمز التحقق" : "Verification code sent");
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
      toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Login successful");
      // Open the network gate so auth.me and branding queries can fire
      enableNetwork();
      window.location.reload();
    },
    onError: (error) => {
      toast.error(getFriendlyError(error));
      setIsLoading(false);
    },
  });
  const resendOtpMutation = trpc.auth.resendOtp.useMutation({
    onSuccess: (data) => {
      toast.success(isAr ? "تم إرسال رمز تحقق جديد" : "New verification code sent");
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
      toast.error(isAr ? "يرجى إدخال البيانات المطلوبة" : "Please enter required data");
      return;
    }
    setIsLoading(true);
    // With server.url in capacitor.config.ts, native app loads from naashah.com
    // All requests are same-origin, so tRPC works normally on both web and native
    loginMutation.mutate({ identifier, password });
  };

  const handleAccountSelection = (accountId: number) => {
    setIsLoading(true);
    loginMutation.mutate({ identifier, password, accountId });
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      super_admin: { ar: "مدير النظام", en: "System administrator" },
      admin: { ar: "مدير", en: "Administrator" },
      principal: { ar: "مديرة الحضانة", en: "Nursery principal" },
      owner: { ar: "مالك", en: "Owner" },
      teacher: { ar: "معلمة", en: "Teacher" },
      assistant: { ar: "مساعدة", en: "Assistant" },
      accountant: { ar: "محاسب", en: "Accountant" },
      receptionist: { ar: "استقبال", en: "Receptionist" },
      parent: { ar: "ولي أمر", en: "Parent" },
    };
    return labels[role]?.[isAr ? "ar" : "en"] || role;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      toast.error(isAr ? "يرجى إدخال رقم جوال صحيح" : "Please enter a valid phone number");
      return;
    }
    setIsLoading(true);
    sendPhoneOtpMutation.mutate({ phone });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error(isAr ? "يرجى إدخال رمز التحقق المكون من 6 أرقام" : "Please enter the 6-digit verification code");
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
      <Card className="w-full max-w-md md:max-w-xl shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <img
            src="/assets/logo.webp"
            alt={isAr ? "نشأة" : "Nashaa"}
            className="w-20 h-20 mx-auto mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-800">{isAr ? "تسجيل الدخول" : "Login"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "مرحباً بك في نشأة" : "Welcome to Nash\'ah"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-muted p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => switchMode("password")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                loginMode === "password"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-muted-foreground hover:text-slate-600"
              }`}
            >
              <Lock className="h-5 w-5" />
              {isAr ? "كلمة المرور" : "Password"}
            </button>
            <button
              type="button"
              onClick={() => switchMode("otp")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                loginMode === "otp"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-muted-foreground hover:text-slate-600"
              }`}
            >
              <Smartphone className="h-5 w-5" />
              {isAr ? "رمز التحقق" : "Verification Code"}
            </button>
          </div>

          {/* PASSWORD LOGIN */}
          {loginMode === "password" && accountOptions && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setAccountOptions(null)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowRight className="h-4 w-4" />
                {isAr ? "العودة لبيانات الدخول" : "Back to login details"}
              </button>

              <div className="rounded-2xl border border-[#00C9B7]/20 bg-[#00C9B7]/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00C9B7] text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800">
                      {isAr ? "اختر الحساب" : "Choose an account"}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {isAr
                        ? "بيانات الدخول مرتبطة بأكثر من حساب. اختر الوجهة الصحيحة للمتابعة بأمان."
                        : "These credentials belong to more than one account. Choose the correct destination."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {accountOptions.map(option => (
                  <button
                    key={option.accountId}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleAccountSelection(option.accountId)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#00C9B7]/50 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-[#00C9B7]/10 group-hover:text-[#009E93]">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">
                        {option.organizationName}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {[option.displayName, roleLabel(option.role)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {isLoading && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#00C9B7] border-t-transparent" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loginMode === "password" && !accountOptions && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  {isAr ? "البريد الإلكتروني أو رقم الجوال" : "Email or Mobile Number"}
                </Label>
                <div className="relative">
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={isAr ? "example@email.com أو 05xxxxxxxx" : "example@email.com or 05xxxxxxxx"}
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
                  {isAr ? "كلمة المرور" : "Password"}
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
                  className="text-sm text-primary hover:underline font-medium py-2 px-1"
                >
                  {isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                </button>
                <button
                  type="button"
                  onClick={() => setLocation("/recover-account")}
                  className="text-sm text-amber-600 hover:underline font-medium py-2 px-1"
                >
                  {isAr ? "استعادة حساب محذوف" : "Restore Deleted Account"}
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
                    {isAr ? "جاري تسجيل الدخول..." : "Logging In..."}
                  </span>
                ) : (
                  (isAr ? "تسجيل الدخول" : "Login")
                )}
              </Button>
            </form>
          )}

          {/* OTP LOGIN */}
          {loginMode === "otp" && otpStep === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {isAr ? "رقم الجوال" : "Mobile Number"}
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
                  {isAr ? "سيتم إرسال رمز تحقق إلى بريدك الإلكتروني المرتبط بهذا الرقم" : "A verification code will be sent to your email associated with this number"}
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
                    {isAr ? "جاري الإرسال..." : "Sending..."}
                  </span>
                ) : (
                  isAr ? "إرسال رمز التحقق" : "Send Verification Code"
                )}
              </Button>
            </form>
          )}

          {loginMode === "otp" && otpStep === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <button
                type="button"
                onClick={() => { setOtpStep("phone"); setOtpCode(""); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <ArrowRight className="h-4 w-4" />
                {isAr ? "تغيير الرقم" : "Change Number"}
              </button>

              <div className="text-center py-2">
                <p className="text-sm text-slate-600">
                  {isAr ? "تم إرسال رمز التحقق إلى البريد المرتبط بالرقم" : "Verification code sent to email linked to number"}
                </p>
                <p className="text-lg font-bold text-slate-800 mt-1 tracking-wider" dir="ltr">
                  {phone}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">
                  {isAr ? "رمز التحقق" : "Verification Code"}
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
                    {isAr ? "جاري التحقق..." : "Verifying..."}
                  </span>
                ) : (
                  isAr ? "تأكيد الدخول" : "Confirm Entry"
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
                    {isAr ? "إعادة إرسال الرمز" : "Resend Code"}
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              {isAr ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
              <button
                onClick={() => setLocation("/register")}
                className="text-primary hover:underline font-medium"
              >
                {isAr ? "إنشاء حساب جديد" : "Create New Account"}
              </button>
            </p>
          </div>

          <div className="text-center pt-4 border-t mt-4">
            <p className="text-xs text-muted-foreground">
              {isAr ? "بتسجيل الدخول، أنت توافق على" : "By logging in, you agree to"}{" "}
              <a href="/terms" className="text-primary hover:underline">
                {isAr ? "شروط الخدمة" : "Terms of Service"}
              </a>
              {" "}و{" "}
              <a href="/privacy" className="text-primary hover:underline">
                {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
