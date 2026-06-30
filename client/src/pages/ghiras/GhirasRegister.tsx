import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function GhirasRegister() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const registerMutation = trpc.registration.ghirasRegister.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء حسابك بنجاح! يمكنك تسجيل الدخول الآن.");
      navigate("/login");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء التسجيل");
      setLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("كلمة المرور غير متطابقة");
      return;
    }
    if (form.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    registerMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-white flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-white font-bold text-2xl">غ</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">إنشاء حساب في غراس</h1>
          <p className="text-muted-foreground text-sm mt-1">ابدئي بإدارة فصلك بطريقة أسهل</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#10B981]" />
              معلوماتك الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>الاسم الكامل *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1.5 rounded-lg"
                  placeholder="الاسم الكامل"
                  dir="rtl"
                />
              </div>

              <div>
                <Label>البريد الإلكتروني *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1.5 rounded-lg"
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>

              <div>
                <Label>رقم الجوال</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1.5 rounded-lg"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div>
                <Label>كلمة المرور *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="mt-1.5 rounded-lg"
                  placeholder="6 أحرف على الأقل"
                />
              </div>

              <div>
                <Label>تأكيد كلمة المرور *</Label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="mt-1.5 rounded-lg"
                  placeholder="أعيدي كتابة كلمة المرور"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white rounded-xl h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? "جاري التسجيل..." : "إنشاء حساب"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              عندك حساب؟{" "}
              <Link href="/login" className="text-[#10B981] font-medium hover:underline">
                تسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Back to Ghiras */}
        <div className="text-center mt-6">
          <Link href="/ghiras" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            العودة لصفحة غراس
          </Link>
        </div>
      </div>
    </div>
  );
}
