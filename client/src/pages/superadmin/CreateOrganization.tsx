import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Building2, CheckCircle2, Phone, Mail, MapPin, Users, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CreateOrganization() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    slug: "",
    edition: "nashaa" as "learning_tree" | "nashaa",
    orgType: "nursery" as const,
    status: "trial" as "active" | "suspended" | "pending" | "trial",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "SA",
    licenseNumber: "",
    maxChildren: 50,
    maxStaff: 20,
  });

  const createOrg = trpc.superAdmin.createOrganization.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      navigate(`/super-admin/organizations/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.nameAr || !form.slug) {
      toast.error(isAr ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    createOrg.mutate({ ...form, orgType: "nursery" });
  };

  // Auto-generate slug from English name
  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/super-admin/organizations")}
          className="text-muted-foreground hover:text-foreground rounded-lg"
        >
          <ArrowRight className="w-4 h-4 ml-1" />
          العودة
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#7B61FF]/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-[#7B61FF]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">إضافة منظمة جديدة</h1>
          <p className="text-muted-foreground text-sm">إنشاء حضانة أو روضة جديدة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#00C9B7]/10 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-[#00C9B7]" />
              </div>
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>الاسم بالعربية *</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                  className="rounded-lg mt-1.5"
                  placeholder="حضانة السعادة"
                  dir="rtl"
                />
              </div>
              <div>
                <Label>الاسم بالإنجليزية *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="rounded-lg mt-1.5"
                  placeholder="Happy Nursery"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>المعرف (slug) *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  className="rounded-lg mt-1.5"
                  placeholder="happy-nursery"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1.5">يستخدم في الرابط: {form.slug || "xxx"}.naashah.com</p>
              </div>
              <div>
                <Label>النسخة</Label>
                <Select value={form.edition} onValueChange={(v) => setForm((p) => ({ ...p, edition: v as any }))}>
                  <SelectTrigger className="rounded-lg mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nashaa">نشأة</SelectItem>
                    <SelectItem value="learning_tree">شجرة التعلم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as any }))}>
                  <SelectTrigger className="rounded-lg mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">تجريبية (14 يوم)</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم الترخيص</Label>
                <Input
                  value={form.licenseNumber}
                  onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                  className="rounded-lg mt-1.5"
                  placeholder="اختياري"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#FF5CA8]/10 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5 text-[#FF5CA8]" />
              </div>
              معلومات التواصل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-lg mt-1.5"
                  placeholder="+966..."
                  dir="ltr"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="rounded-lg mt-1.5"
                  placeholder="info@nursery.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>المدينة</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="rounded-lg mt-1.5"
                  placeholder="الرياض"
                />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="rounded-lg mt-1.5"
                  placeholder="العنوان الكامل"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#FFB020]/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-[#FFB020]" />
              </div>
              الحدود والسعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#7B61FF]" />
                  الحد الأقصى للأطفال
                </Label>
                <Input
                  type="number"
                  value={form.maxChildren}
                  onChange={(e) => setForm((p) => ({ ...p, maxChildren: parseInt(e.target.value) || 50 }))}
                  className="rounded-lg mt-1.5"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#00C9B7]" />
                  الحد الأقصى للموظفين
                </Label>
                <Input
                  type="number"
                  value={form.maxStaff}
                  onChange={(e) => setForm((p) => ({ ...p, maxStaff: parseInt(e.target.value) || 20 }))}
                  className="rounded-lg mt-1.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-12 text-base rounded-xl btn-press"
          disabled={createOrg.isPending}
        >
          {createOrg.isPending ? "جاري الإنشاء..." : (
            <>
              <CheckCircle2 className="w-5 h-5 ml-2" />
              إنشاء المنظمة
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
