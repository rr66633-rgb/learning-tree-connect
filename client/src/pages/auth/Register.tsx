import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { trackCompleteRegistration } from "@/lib/metaPixel";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, User, Mail, Phone, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [, setLocation] = useLocation();
  const [orgSlug, setOrgSlug] = useState(() => new URLSearchParams(window.location.search).get('org') || '');
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [otpExpiryCountdown, setOtpExpiryCountdown] = useState(300);
  const { data: organizations, isLoading: organizationsLoading } = trpc.waitingList.publicOrganizations.useQuery(undefined, {
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (!orgSlug && organizations?.length === 1) setOrgSlug(organizations[0].slug);
  }, [orgSlug, organizations]);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setStep("otp");
      startCountdown(60);
      startOtpExpiry(data.expiresAt);
    },
    onError: (error) => toast.error(error.message),
  });

  const verifyMutation = trpc.auth.verifyRegistration.useMutation({
    onSuccess: () => {
      setStep("success");
      trackCompleteRegistration("email");
    },
    onError: (error) => toast.error(error.message),
  });

  const resendOtpMutation = trpc.auth.resendOtp.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      startCountdown(60);
      if (data.expiresAt) startOtpExpiry(data.expiresAt);
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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgSlug || !name || !phone || !email || !password) {
      toast.error(isAr ? "يرجى إدخال جميع البيانات المطلوبة" : "Please enter all required data");
      return;
    }
    if (password.length < 6) {
      toast.error(isAr ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    registerMutation.mutate({ orgSlug, name, phone, email, password });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error(isAr ? "يرجى إدخال رمز التحقق المكون من 6 أرقام" : "Please enter the 6-digit verification code");
      return;
    }
    verifyMutation.mutate({ identifier: phone, code: otpCode });
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
            {step === "form" && isAr ? "إنشاء حساب ولي أمر" : "Create Parent Account"}
            {step === "otp" && isAr ? "تحقق من رقم الجوال" : "Verify Mobile Number"}
            {step === "success" && isAr ? "تم التسجيل بنجاح" : "Registered successfully"}
          </h1>
          {step === "form" && (
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? "أنشئ حسابك للوصول إلى بوابة ولي الأمر" : "Create Your Account to Access the Parent Portal"}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Registration Form */}
          {step === "form" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {isAr ? "الحضانة" : "Nursery"}
                </Label>
                <Select value={orgSlug} onValueChange={setOrgSlug} required>
                  <SelectTrigger>
                    <SelectValue placeholder={organizationsLoading ? (isAr ? "جاري التحميل..." : "Loading...") : (isAr ? "اختر الحضانة" : "Select nursery")} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map(org => (
                      <SelectItem key={org.slug} value={org.slug}>
                        {isAr ? org.nameAr : org.name}{org.city ? ` - ${org.city}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{isAr ? "الاسم الكامل" : "Full Name"}</Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder={isAr ? "أدخل اسمك الكامل" : "Enter Your Full Name"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pr-10"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{isAr ? "رقم الجوال" : "Phone Number"}</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                  />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{isAr ? "كلمة المرور" : "Password"}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isAr ? "6 أحرف على الأقل" : "At least 6 characters"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10"
                    dir="ltr"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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

              {/* Password strength */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          password.length >= level * 3
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
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (isAr ? "جاري التسجيل..." : "Registering...") : "إنشاء الحساب"}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isAr ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-primary hover:underline font-medium"
                  >
                    {isAr ? "تسجيل الدخول" : "Login"}
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {isAr ? "تم إرسال رمز التحقق إلى" : "Verification code sent to"}{" "}
                <span className="font-medium text-foreground" dir="ltr">{phone}</span>
              </p>

              {/* OTP Expiry Timer */}
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  otpExpiryCountdown > 60 ? "bg-green-50 text-green-700" : 
                  otpExpiryCountdown > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                }`}>
                  {otpExpiryCountdown > 0 ? (
                    <>{isAr ? "صالح لمدة" : "Valid for"} {formatTime(otpExpiryCountdown)}</>
                  ) : (
                    <>{isAr ? "انتهت صلاحية الرمز" : "Code Expired"}</>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">{isAr ? "رمز التحقق" : "Verification Code"}</Label>
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
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11"
                disabled={verifyMutation.isPending || otpExpiryCountdown === 0}
              >
                {verifyMutation.isPending ? (isAr ? "جاري التحقق..." : "Verifying...") : "تأكيد الرمز"}
              </Button>

              {/* Resend OTP */}
              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => resendOtpMutation.mutate({ identifier: phone, type: "registration" })}
                    className="text-sm text-primary hover:underline font-medium"
                    disabled={resendOtpMutation.isPending}
                  >
                    {resendOtpMutation.isPending ? (isAr ? "جاري الإرسال..." : "Sending...") : "إعادة إرسال الرمز"}
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isAr ? "إعادة الإرسال بعد" : "Resend After"} {countdown} ثانية
                  </p>
                )}
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-slate-800">
                {isAr ? "تم إنشاء حسابك بنجاح" : "Account created successfully"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isAr ? "حسابك قيد المراجعة من قبل الإدارة. ستتمكن من الوصول إلى البوابة بعد الموافقة." : "Your account is under review by administration. You will be able to access the portal after approval."}
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11"
              >
                {isAr ? "تسجيل الدخول" : "Login"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
