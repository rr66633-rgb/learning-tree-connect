import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  Building2,
  Palette,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "معلومات الحضانة", icon: Building2 },
  { id: 2, title: "الهوية البصرية", icon: Palette },
  { id: 3, title: "خطة الاشتراك", icon: CreditCard },
  { id: 4, title: "التأكيد", icon: CheckCircle2 },
];

export default function OnboardingWizard() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const preselectedPlan = params.get("plan");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    slug: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "SA",
    licenseNumber: "",
    primaryColor: "#10b981",
    secondaryColor: "#059669",
    accentColor: "#34d399",
    logoUrl: "",
    planId: preselectedPlan ? parseInt(preselectedPlan) : 0,
    billingCycle: "monthly" as "monthly" | "yearly",
  });

  const { data: plans } = trpc.onboarding.getPlans.useQuery();
  const { data: slugCheck } = trpc.onboarding.checkSlug.useQuery(
    { slug: form.slug },
    { enabled: form.slug.length >= 2 }
  );

  const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      navigate("/staff");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return form.name && form.nameAr && form.slug && slugCheck?.available;
      case 2:
        return true; // Colors have defaults
      case 3:
        return form.planId > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, form, slugCheck]);

  const handleSubmit = () => {
    completeOnboarding.mutate({
      ...form,
      planId: form.planId,
    });
  };

  const selectedPlan = plans?.find((p) => p.id === form.planId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-[#00C9B7]" />
            <h1 className="text-2xl font-bold text-foreground">إعداد حضانتك على Naashah</h1>
          </div>
          <p className="text-muted-foreground">أكمل الخطوات التالية لبدء استخدام المنصة</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = s.id === step;
            const isCompleted = s.id < step;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    isActive
                      ? "bg-[#00C9B7]/10 text-[#00C9B7] border border-emerald-500/30"
                      : isCompleted
                      ? "bg-[#00C9B7]/10 text-[#00C9B7]"
                      : "text-muted-foreground"
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${isCompleted ? "bg-[#00C9B7]" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">معلومات الحضانة الأساسية</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">اسم الحضانة بالعربية *</Label>
                    <Input
                      value={form.nameAr}
                      onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                      className="bg-background border-input text-foreground mt-1"
                      placeholder="حضانة السعادة"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">اسم الحضانة بالإنجليزية *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="bg-background border-input text-foreground mt-1"
                      placeholder="Happy Nursery"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-foreground">المعرف الفريد *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    className="bg-background border-input text-foreground mt-1"
                    placeholder="happy-nursery"
                    dir="ltr"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{form.slug || "xxx"}.naashah.com</p>
                    {form.slug.length >= 2 && (
                      <span className={`text-xs ${slugCheck?.available ? "text-[#00C9B7]" : "text-red-400"}`}>
                        {slugCheck?.available ? "✓ متاح" : "✗ غير متاح"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">الهاتف</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="bg-background border-input text-foreground mt-1"
                      placeholder="+966..."
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">البريد الإلكتروني</Label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="bg-background border-input text-foreground mt-1"
                      placeholder="info@nursery.com"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">المدينة</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                      className="bg-background border-input text-foreground mt-1"
                      placeholder="الرياض"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">رقم الترخيص</Label>
                    <Input
                      value={form.licenseNumber}
                      onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                      className="bg-background border-input text-foreground mt-1"
                      placeholder="اختياري"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">تخصيص الهوية البصرية</h2>
                <p className="text-sm text-muted-foreground mb-4">اختر ألوان حضانتك. يمكنك تغييرها لاحقاً من الإعدادات.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-foreground">اللون الأساسي</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-input"
                      />
                      <Input
                        value={form.primaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                        className="bg-background border-input text-foreground"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground">اللون الثانوي</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form.secondaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-input"
                      />
                      <Input
                        value={form.secondaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                        className="bg-background border-input text-foreground"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground">اللون المميز</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form.accentColor}
                        onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-input"
                      />
                      <Input
                        value={form.accentColor}
                        onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                        className="bg-background border-input text-foreground"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-6 rounded-xl border border-border" style={{ background: `linear-gradient(135deg, ${form.primaryColor}20, ${form.secondaryColor}10)` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.primaryColor }}>
                      <Building2 className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{form.nameAr || "اسم الحضانة"}</h3>
                      <p className="text-xs" style={{ color: form.accentColor }}>{form.name || "Nursery Name"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded text-foreground text-sm" style={{ backgroundColor: form.primaryColor }}>
                      زر أساسي
                    </div>
                    <div className="px-3 py-1.5 rounded text-sm border" style={{ borderColor: form.secondaryColor, color: form.secondaryColor }}>
                      زر ثانوي
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">اختر خطة الاشتراك</h2>
                <p className="text-sm text-muted-foreground mb-4">جميع الخطط تشمل فترة تجريبية مجانية لمدة 14 يوم</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans?.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        form.planId === plan.id
                          ? "border-emerald-500 bg-[#00C9B7]/10"
                          : "border-border bg-background hover:border-input"
                      }`}
                      onClick={() => setForm((p) => ({ ...p, planId: plan.id }))}
                    >
                      <h3 className="font-semibold text-foreground">{plan.nameAr}</h3>
                      <p className="text-2xl font-bold text-foreground mt-2">{plan.priceMonthly} <span className="text-sm text-muted-foreground">ر.س/شهر</span></p>
                      <p className="text-xs text-muted-foreground mt-1">حتى {plan.maxChildren >= 999 ? "غير محدود" : plan.maxChildren} طفل</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <Label className="text-foreground">دورة الفوترة</Label>
                  <Select value={form.billingCycle} onValueChange={(v) => setForm((p) => ({ ...p, billingCycle: v as any }))}>
                    <SelectTrigger className="bg-background border-input text-foreground mt-1 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">شهرية</SelectItem>
                      <SelectItem value="yearly">سنوية (خصم)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">مراجعة وتأكيد</h2>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">معلومات الحضانة</h3>
                    <p className="text-foreground font-medium">{form.nameAr}</p>
                    <p className="text-muted-foreground text-sm">{form.name}</p>
                    <p className="text-muted-foreground text-xs mt-1">{form.slug}.naashah.com</p>
                  </div>

                  <div className="p-4 rounded-lg bg-background border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">الهوية البصرية</h3>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded" style={{ backgroundColor: form.primaryColor }} />
                      <div className="w-8 h-8 rounded" style={{ backgroundColor: form.secondaryColor }} />
                      <div className="w-8 h-8 rounded" style={{ backgroundColor: form.accentColor }} />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-background border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">خطة الاشتراك</h3>
                    <p className="text-foreground font-medium">{selectedPlan?.nameAr || "غير محدد"}</p>
                    <p className="text-muted-foreground text-sm">
                      {form.billingCycle === "monthly" ? `${selectedPlan?.priceMonthly} ر.س/شهر` : `${selectedPlan?.priceYearly} ر.س/سنة`}
                    </p>
                    <p className="text-[#00C9B7] text-xs mt-1">تشمل فترة تجريبية مجانية 14 يوم</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="border-input text-foreground"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            السابق
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={!canProceed}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              التالي
              <ArrowLeft className="w-4 h-4 mr-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={completeOnboarding.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {completeOnboarding.isPending ? "جاري الإنشاء..." : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                  إنشاء الحضانة
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
