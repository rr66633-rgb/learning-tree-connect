import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Palette, Save, RotateCcw } from "lucide-react";

export default function Branding() {
  const { data: orgs, isLoading: orgsLoading } = trpc.superAdmin.listOrganizations.useQuery({});
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  const { data: branding, isLoading: brandingLoading, refetch } = trpc.superAdmin.getBranding.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const updateBranding = trpc.superAdmin.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الهوية البصرية بنجاح");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    primaryColor: "#10b981",
    secondaryColor: "#059669",
    accentColor: "#34d399",
    backgroundColor: "#0f172a",
    textColor: "#f8fafc",
    logoUrl: "",
    fontFamily: "Noto Sans Arabic",
    borderRadius: "0.5rem",
    sidebarStyle: "dark" as "dark" | "light" | "gradient",
  });

  useEffect(() => {
    if (branding) {
      setForm({
        primaryColor: branding.primaryColor || "#10b981",
        secondaryColor: branding.secondaryColor || "#059669",
        accentColor: branding.accentColor || "#34d399",
        backgroundColor: branding.backgroundColor || "#0f172a",
        textColor: branding.textColor || "#f8fafc",
        logoUrl: branding.logoUrl || "",
        fontFamily: branding.fontFamily || "Noto Sans Arabic",
        borderRadius: branding.borderRadius || "0.5rem",
        sidebarStyle: (branding.sidebarStyle as "dark" | "light" | "gradient") || "dark",
      });
    }
  }, [branding]);

  // Auto-select first org
  useEffect(() => {
    if (orgs?.organizations?.length && !selectedOrgId) {
      setSelectedOrgId(orgs.organizations[0].id);
    }
  }, [orgs, selectedOrgId]);

  const handleSave = () => {
    if (!selectedOrgId) return;
    updateBranding.mutate({
      organizationId: selectedOrgId,
      ...form,
      logoUrl: form.logoUrl || undefined,
    });
  };

  if (orgsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Palette className="w-6 h-6 text-[#EC4899]" />
            الهوية البصرية
          </h1>
          <p className="text-muted-foreground mt-1">إدارة الهوية البصرية لكل منظمة</p>
        </div>
      </div>

      {/* Organization Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اختر المنظمة</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedOrgId?.toString() || ""}
            onValueChange={(v) => setSelectedOrgId(Number(v))}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="اختر منظمة..." />
            </SelectTrigger>
            <SelectContent>
              {orgs?.organizations?.map((org: any) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.nameAr || org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrgId && (
        <>
          {brandingLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colors Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">الألوان</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اللون الأساسي</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.primaryColor}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>اللون الثانوي</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.secondaryColor}
                          onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.secondaryColor}
                          onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>لون التمييز</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.accentColor}
                          onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.accentColor}
                          onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>لون الخلفية</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.backgroundColor}
                          onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.backgroundColor}
                          onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>لون النص</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.textColor}
                          onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.textColor}
                          onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography & Style Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">الخطوط والتنسيق</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>الخط</Label>
                    <Select
                      value={form.fontFamily}
                      onValueChange={(v) => setForm({ ...form, fontFamily: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Noto Sans Arabic">Noto Sans Arabic</SelectItem>
                        <SelectItem value="Cairo">Cairo</SelectItem>
                        <SelectItem value="Tajawal">Tajawal</SelectItem>
                        <SelectItem value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</SelectItem>
                        <SelectItem value="Almarai">Almarai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>حجم الحواف المستديرة</Label>
                    <Select
                      value={form.borderRadius}
                      onValueChange={(v) => setForm({ ...form, borderRadius: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">بدون استدارة</SelectItem>
                        <SelectItem value="0.25rem">صغير</SelectItem>
                        <SelectItem value="0.5rem">متوسط</SelectItem>
                        <SelectItem value="0.75rem">كبير</SelectItem>
                        <SelectItem value="1rem">كبير جداً</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>نمط القائمة الجانبية</Label>
                    <Select
                      value={form.sidebarStyle}
                      onValueChange={(v) => setForm({ ...form, sidebarStyle: v as "dark" | "light" | "gradient" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">داكن</SelectItem>
                        <SelectItem value="light">فاتح</SelectItem>
                        <SelectItem value="gradient">متدرج</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>رابط الشعار</Label>
                    <Input
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">معاينة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="rounded-xl p-6 border"
                    style={{ backgroundColor: form.backgroundColor }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {form.logoUrl && (
                        <img src={form.logoUrl} alt="شعار" className="w-12 h-12 rounded-lg object-contain" />
                      )}
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: form.textColor }}>
                          معاينة الهوية البصرية
                        </h3>
                        <p className="text-sm opacity-70" style={{ color: form.textColor }}>
                          هذه معاينة لكيفية ظهور الألوان
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <div
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: form.primaryColor, borderRadius: form.borderRadius }}
                      >
                        زر أساسي
                      </div>
                      <div
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: form.secondaryColor, borderRadius: form.borderRadius }}
                      >
                        زر ثانوي
                      </div>
                      <div
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: form.accentColor, borderRadius: form.borderRadius }}
                      >
                        زر تمييز
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={updateBranding.isPending}>
              <Save className="w-4 h-4 ml-2" />
              {updateBranding.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RotateCcw className="w-4 h-4 ml-2" />
              إعادة تحميل
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
