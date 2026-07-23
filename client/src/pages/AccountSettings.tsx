import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle2, Shield, Clock, Globe, Trash2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

function ProfileSection() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [language, setLanguage] = useState<"ar" | "en">(user?.language || "ar");
  const [isEditing, setIsEditing] = useState(false);

  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      // Apply language change immediately
      import('@/lib/i18n').then(({ default: i18n }) => {
        i18n.changeLanguage(language);
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      });
      toast.success(language === 'ar' ? isAr ? "تم تحديث البيانات بنجاح" : "Data updated successfully" : "Profile updated successfully");
      setIsEditing(false);
      utils.auth.me.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setLanguage(user.language || "ar");
    }
  }, [user]);

  const handleSave = () => {
    const updates: any = {};
    if (name !== user?.name) updates.name = name;
    if (email !== user?.email) updates.email = email;
    if (phone !== user?.phone) updates.phone = phone;
    if (language !== user?.language) updates.language = language;

    if (Object.keys(updates).length === 0) {
      toast.info(isAr ? "لا توجد تغييرات" : "No changes");
      setIsEditing(false);
      return;
    }
    updateProfileMutation.mutate(updates);
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setLanguage(user?.language || "ar");
    setIsEditing(false);
  };

  const roleLabels: Record<string, string> = {
    super_admin: isAr ? "مدير عام" : "General Manager",
    admin: isAr ? "مدير" : "Manager",
    principal: isAr ? "مديرة الحضانة" : "Nursery Director",
    teacher: isAr ? "معلمة" : "Teacher (female)",
    assistant: isAr ? "مساعدة" : "Help",
    accountant: isAr ? "محاسب" : "Accountant",
    receptionist: isAr ? "استقبال" : "Reception",
    parent: isAr ? "ولي أمر" : "Parent",
    user: isAr ? "مستخدم" : "User",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isAr ? "البيانات الشخصية" : "Personal Data"}
            </CardTitle>
            <CardDescription>{isAr ? "معلومات حسابك الأساسية" : "Your Basic Account Information"}</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              {isAr ? "تعديل" : "Edit"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 pb-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00C9B7] to-[#00A89A] flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.charAt(0) || "م"}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <Badge variant="secondary" className="text-xs">
              {roleLabels[user?.role || "user"] || user?.role}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {isAr ? "الاسم الكامل" : "Full Name"}
            </Label>
            {isEditing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">{user?.name || "—"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {isAr ? "البريد الإلكتروني" : "Email"}
            </Label>
            {isEditing ? (
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            ) : (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30" dir="ltr">{user?.email || "—"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {isAr ? "رقم الجوال" : "Mobile Number"}
            </Label>
            {isEditing ? (
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
            ) : (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30" dir="ltr">{user?.phone || "—"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {isAr ? "اللغة" : "Language"}
            </Label>
            {isEditing ? (
              <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{isAr ? "العربية" : "Arabic"}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
                {language === "ar" ? isAr ? "العربية" : "Arabic" : "English"}
              </p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white"
            >
              {updateProfileMutation.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChangePasswordSection() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error(isAr ? "يرجى إدخال كلمة المرور الحالية" : "Please enter current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error(isAr ? "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" : "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  // Password strength indicator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 2) return { level: score, label: isAr ? "ضعيفة" : "Weak", color: "bg-red-500" };
    if (score <= 3) return { level: score, label: isAr ? "متوسطة" : "Medium", color: "bg-yellow-500" };
    return { level: score, label: isAr ? "قوية" : "Strong", color: "bg-green-500" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {isAr ? "تغيير كلمة المرور" : "Change Password"}
        </CardTitle>
        <CardDescription>{isAr ? "قم بتحديث كلمة المرور الخاصة بك لتعزيز أمان حسابك" : "Update your password to enhance your account security"}</CardDescription>
      </CardHeader>
      <CardContent>
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{isAr ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully"}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>{isAr ? "كلمة المرور الحالية" : "Current Password"}</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={isAr ? "أدخل كلمة المرور الحالية" : "Enter Current Password"}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isAr ? "كلمة المرور الجديدة" : "New Password"}</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={isAr ? "أدخل كلمة المرور الجديدة" : "Enter New Password"}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength.level ? strength.color : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{isAr ? "قوة كلمة المرور:" : "Password strength:"} {strength.label}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={isAr ? "أعد إدخال كلمة المرور الجديدة" : "Re-enter New Password"}
              dir="ltr"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">{isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white"
          >
            {changePasswordMutation.isPending ? "جاري التغيير..." : (isAr ? "تغيير كلمة المرور" : "Change Password")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LoginSessionsSection() {
  const { i18n: _i18n } = useTranslation();
  const isAr = _i18n.language === 'ar';
  const { data: sessions, isLoading } = trpc.auth.getLoginSessions.useQuery();

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {isAr ? "سجل تسجيلات الدخول" : "Login Log"}
        </CardTitle>
        <CardDescription>{isAr ? "آخر عمليات تسجيل الدخول الناجحة لحسابك" : "Last successful logins to your account"}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((session, i) => (
              <div key={session.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{isAr ? "تسجيل دخول ناجح" : "Login Successful"}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {session.ip || isAr ? "غير معروف" : "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(session.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا توجد سجلات حتى الآن" : "No records yet"}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DeleteAccountSection() {
  const [password, setPassword] = useState("");
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [showPassword, setShowPassword] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (!password) {
      toast.error(isAr ? "يرجى إدخال كلمة المرور" : "Please enter password");
      return;
    }
    deleteAccountMutation.mutate({ password });
  };

  const canDelete = password.length > 0 && confirmText === (isAr ? "حذف" : "Delete");

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Trash2 className="h-5 w-5" />
          {isAr ? "حذف الحساب" : "Delete Account"}
        </CardTitle>
        <CardDescription className="text-red-600/80">
          {isAr ? "طلب حذف حسابك. سيتم منحك فترة سماح 30 يوم قبل الحذف النهائي." : "Request to delete your account. You will be granted a 30-day grace period before final deletion."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800">{isAr ? "تنبيه مهم" : "Important Alert"}</p>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>{isAr ? "سيتم تعطيل حسابك فوراً وحذفه نهائياً بعد 30 يوم" : "Your account will be immediately deactivated and permanently deleted after 30 days"}</li>
              <li>{isAr ? "يمكنك استعادة حسابك خلال فترة السماح من صفحة تسجيل الدخول" : "You can recover your account during the grace period from the login page"}</li>
              <li>{isAr ? "بيانات طفلك التعليمية (الحضور، التقارير، التقييمات) ستبقى محفوظة لدى الحضانة" : "Your child\'s educational data (attendance, reports, assessments) will remain with the nursery"}</li>
              <li>{isAr ? "سيتم إرسال بريد إلكتروني تأكيدي بتفاصيل الحذف" : "A confirmation email with deletion details will be sent"}</li>
            </ul>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {isAr ? "لمزيد من التفاصيل حول بياناتك، اطلع على" : "For more details about your data, see"}{" "}
          <a href="/privacy" className="text-primary underline">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</a>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4 ml-2" />
              {isAr ? "طلب حذف الحساب" : "Account deletion request"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                {isAr ? "تأكيد طلب حذف الحساب" : "Confirm Account Deletion Request"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                {isAr ? "سيتم تعطيل حسابك فوراً وحذفه نهائياً بعد 30 يوم. يمكنك استعادة حسابك خلال هذه الفترة." : "Your account will be immediately deactivated and permanently deleted after 30 days. You can restore your account during this period."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{isAr ? "كلمة المرور للتأكيد" : "Confirm Password"}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isAr ? "أدخل كلمة المرور" : "Enter Password"}
                    dir="ltr"
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
              <div className="space-y-2">
                <Label>اكتب (isAr ? "حذف" : "Delete") للتأكيد</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={isAr ? "حذف" : "Delete"}
                  dir="rtl"
                />
              </div>
            </div>
            <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
              <AlertDialogCancel onClick={() => { setPassword(""); setConfirmText(""); }}>
                {isAr ? "إلغاء" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!canDelete || deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {deleteAccountMutation.isPending ? isAr ? "جاري تقديم الطلب..." : "Submitting Request..." : isAr ? "تأكيد حذف الحساب" : "Confirm Account Deletion"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function AccountSettings() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{isAr ? "إعدادات الحساب" : "Account Settings"}</h1>
        <p className="text-muted-foreground">{isAr ? "إدارة بياناتك الشخصية وأمان حسابك" : "Manage Your Personal Data & Account Security"}</p>
      </div>

      <ProfileSection />
      <ChangePasswordSection />
      <LoginSessionsSection />
      <DeleteAccountSection />
    </div>
  );
}
