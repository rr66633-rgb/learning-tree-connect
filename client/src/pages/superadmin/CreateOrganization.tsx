import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";

export default function CreateOrganization() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    slug: "",
    edition: "nashaa" as "learning_tree" | "nashaa",
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
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    createOrg.mutate(form);
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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/super-admin")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowRight className="w-4 h-4 ml-1" />
          العودة
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">إضافة حضانة جديدة</h1>
          <p className="text-slate-400 text-sm">إنشاء منظمة جديدة على المنصة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">الاسم بالعربية *</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="حضانة السعادة"
                  dir="rtl"
                />
              </div>
              <div>
                <Label className="text-slate-300">الاسم بالإنجليزية *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="Happy Nursery"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">المعرف (slug) *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="happy-nursery"
                  dir="ltr"
                />
                <p className="text-xs text-slate-500 mt-1">يستخدم في الرابط: {form.slug || "xxx"}.nashaa.sa</p>
              </div>
              <div>
                <Label className="text-slate-300">النسخة</Label>
                <Select value={form.edition} onValueChange={(v) => setForm((p) => ({ ...p, edition: v as any }))}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nashaa">نشأة</SelectItem>
                    <SelectItem value="learning_tree">شجرة التعلم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as any }))}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white mt-1">
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
                <Label className="text-slate-300">رقم الترخيص</Label>
                <Input
                  value={form.licenseNumber}
                  onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="اختياري"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">معلومات التواصل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="+966..."
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-slate-300">البريد الإلكتروني</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="info@nursery.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">المدينة</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="الرياض"
                />
              </div>
              <div>
                <Label className="text-slate-300">العنوان</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                  placeholder="العنوان الكامل"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">الحدود</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">الحد الأقصى للأطفال</Label>
                <Input
                  type="number"
                  value={form.maxChildren}
                  onChange={(e) => setForm((p) => ({ ...p, maxChildren: parseInt(e.target.value) || 50 }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">الحد الأقصى للموظفين</Label>
                <Input
                  type="number"
                  value={form.maxStaff}
                  onChange={(e) => setForm((p) => ({ ...p, maxStaff: parseInt(e.target.value) || 20 }))}
                  className="bg-slate-900/50 border-slate-600 text-white mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
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
