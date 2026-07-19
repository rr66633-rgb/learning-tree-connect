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

function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [language, setLanguage] = useState<"ar" | "en">(user?.language || "ar");
  const [isEditing, setIsEditing] = useState(false);

  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث البيانات بنجاح");
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
      toast.info("لا توجد تغييرات");
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
    super_admin: "مدير عام",
    admin: "مدير",
    principal: "مديرة الحضانة",
    teacher: "معلمة",
    assistant: "مساعدة",
    accountant: "محاسب",
    receptionist: "استقبال",
    parent: "ولي أمر",
    user: "مستخدم",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              البيانات الشخصية
            </CardTitle>
            <CardDescription>معلومات حسابك الأساسية</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              تعديل
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
              الاسم الكامل
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
              البريد الإلكتروني
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
              رقم الجوال
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
              اللغة
            </Label>
            {isEditing ? (
              <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
                {language === "ar" ? "العربية" : "English"}
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
              {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              إلغاء
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
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
      toast.error("يرجى إدخال كلمة المرور الحالية");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
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
    if (score <= 2) return { level: score, label: "ضعيفة", color: "bg-red-500" };
    if (score <= 3) return { level: score, label: "متوسطة", color: "bg-yellow-500" };
    return { level: score, label: "قوية", color: "bg-green-500" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          تغيير كلمة المرور
        </CardTitle>
        <CardDescription>قم بتحديث كلمة المرور الخاصة بك لتعزيز أمان حسابك</CardDescription>
      </CardHeader>
      <CardContent>
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">تم تغيير كلمة المرور بنجاح</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>كلمة المرور الحالية</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
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
            <Label>كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
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
                <p className="text-xs text-muted-foreground">قوة كلمة المرور: {strength.label}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>تأكيد كلمة المرور الجديدة</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور الجديدة"
              dir="ltr"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white"
          >
            {changePasswordMutation.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LoginSessionsSection() {
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
          سجل تسجيلات الدخول
        </CardTitle>
        <CardDescription>آخر عمليات تسجيل الدخول الناجحة لحسابك</CardDescription>
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
                    <p className="text-sm font-medium">تسجيل دخول ناجح</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {session.ip || "غير معروف"}
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
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات حتى الآن</p>
        )}
      </CardContent>
    </Card>
  );
}

function DeleteAccountSection() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("تم حذف حسابك بنجاح");
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (!password) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }
    deleteAccountMutation.mutate({ password });
  };

  const canDelete = password.length > 0 && confirmText === "حذف";

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Trash2 className="h-5 w-5" />
          حذف الحساب
        </CardTitle>
        <CardDescription className="text-red-600/80">
          حذف حسابك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800">تنبيه مهم</p>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>سيتم حذف بياناتك الشخصية (الاسم، البريد، رقم الجوال) بشكل نهائي</li>
              <li>بيانات طفلك التعليمية (الحضور، التقارير، التقييمات) ستبقى محفوظة لدى الحضانة</li>
              <li>لن تتمكن من استعادة الحساب بعد الحذف</li>
            </ul>
          </div>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4 ml-2" />
              حذف حسابي نهائياً
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                تأكيد حذف الحساب
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بياناتك الشخصية.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>كلمة المرور للتأكيد</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
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
                <Label>اكتب "حذف" للتأكيد</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="حذف"
                  dir="rtl"
                />
              </div>
            </div>
            <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
              <AlertDialogCancel onClick={() => { setPassword(""); setConfirmText(""); }}>
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!canDelete || deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {deleteAccountMutation.isPending ? "جاري الحذف..." : "حذف الحساب نهائياً"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function AccountSettings() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">إعدادات الحساب</h1>
        <p className="text-muted-foreground">إدارة بياناتك الشخصية وأمان حسابك</p>
      </div>

      <ProfileSection />
      <ChangePasswordSection />
      <LoginSessionsSection />
      <DeleteAccountSection />
    </div>
  );
}
