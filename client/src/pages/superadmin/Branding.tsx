import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback } from "react";
import { Palette, Save, RotateCcw, Upload, X, Image as ImageIcon } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { fetchWithCsrf } from "@/lib/csrf";
import { uploadWithProgress, compressImage } from "@/lib/uploadWithProgress";
import { useTranslation } from "react-i18next";

interface LogoUploadProps {
  label: string;
  currentUrl: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

function LogoUpload({ label, currentUrl, onUpload, onRemove }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(isAr ? "نوع الملف غير مدعوم. يرجى رفع صور PNG أو JPG أو SVG" : "File type not supported. Please upload PNG, JPG, or SVG images");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isAr ? "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت" : "File too large. Maximum 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', await compressImage(file));
      const { url } = await uploadWithProgress(apiUrl('/api/upload-logo'), formData);
      onUpload(url);
      toast.success(isAr ? "تم رفع الشعار بنجاح" : "Logo uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || isAr ? "فشل رفع الشعار" : "Failed to Upload Logo");
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {currentUrl ? (
        <div className="relative group">
          <div className="border rounded-xl p-4 bg-muted/30 flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
              <img
                src={currentUrl}
                alt={label}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{label}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate" dir="ltr">{currentUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-3.5 h-3.5 ml-1" />
                {isAr ? "تغيير" : "Change"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">{isAr ? "جاري رفع الشعار..." : "Uploading Logo..."}</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isAr ? "اسحب الشعار هنا أو اضغط للاختيار" : "Drag logo here or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, SVG - الحد الأقصى 5 ميجابايت
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function Branding() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: orgs, isLoading: orgsLoading } = trpc.superAdmin.listOrganizations.useQuery({});
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  const { data: branding, isLoading: brandingLoading, refetch } = trpc.superAdmin.getBranding.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const updateBranding = trpc.superAdmin.updateBranding.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث الهوية البصرية بنجاح" : "Visual identity updated successfully");
      refetch();
    },
    onError: (err) => toast.error(err.message) });

  const [form, setForm] = useState({
    primaryColor: "#10b981",
    secondaryColor: "#059669",
    accentColor: "#34d399",
    backgroundColor: "#0f172a",
    textColor: "#f8fafc",
    logoUrl: "",
    logoLightUrl: "",
    appIcon: "",
    fontFamily: "Noto Sans Arabic",
    borderRadius: "0.5rem",
    sidebarStyle: "dark" as "dark" | "light" | "gradient" });

  useEffect(() => {
    if (branding) {
      setForm({
        primaryColor: branding.primaryColor || "#10b981",
        secondaryColor: branding.secondaryColor || "#059669",
        accentColor: branding.accentColor || "#34d399",
        backgroundColor: branding.backgroundColor || "#0f172a",
        textColor: branding.textColor || "#f8fafc",
        logoUrl: branding.logoUrl || "",
        logoLightUrl: branding.logoLightUrl || "",
        appIcon: branding.appIcon || "",
        fontFamily: branding.fontFamily || "Noto Sans Arabic",
        borderRadius: branding.borderRadius || "0.5rem",
        sidebarStyle: (branding.sidebarStyle as "dark" | "light" | "gradient") || "dark" });
    }
  }, [branding]);

  // Auto-select first org
  useEffect(() => {
    if (orgs?.organizations?.length && !selectedOrgId) {
      setSelectedOrgId(orgs.organizations[0].id);
    }
  }, [orgs, selectedOrgId]);

  const handleSave = () => {
    if (!selectedOrgId) {
      toast.error(isAr ? "يرجى اختيار منظمة أولاً" : "Please select an organization first");
      return;
    }
    toast.info(isAr ? "جاري حفظ التغييرات..." : "Saving changes...");
    updateBranding.mutate({
      organizationId: selectedOrgId,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      accentColor: form.accentColor,
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      logoUrl: form.logoUrl || undefined,
      logoLightUrl: form.logoLightUrl || undefined,
      appIcon: form.appIcon || undefined,
      fontFamily: form.fontFamily,
      borderRadius: form.borderRadius,
      sidebarStyle: form.sidebarStyle });
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
            {isAr ? "الهوية البصرية" : "Visual Identity"}
          </h1>
          <p className="text-muted-foreground mt-1">{isAr ? "إدارة الهوية البصرية لكل منظمة" : "Manage Visual Identity for Each Organization"}</p>
        </div>
      </div>

      {/* Organization Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isAr ? "اختر المنظمة" : "Select Organization"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedOrgId?.toString() || ""}
            onValueChange={(v) => setSelectedOrgId(Number(v))}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder={isAr ? "اختر منظمة..." : "Select Organization..."} />
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
              {/* Logos Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#7C3AED]" />
                    {isAr ? "الشعارات" : "Logos"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <LogoUpload
                      label={isAr ? "الشعار الرئيسي (للخلفيات الفاتحة)" : "Main Logo (for light backgrounds)"}
                      currentUrl={form.logoUrl}
                      onUpload={(url) => setForm({ ...form, logoUrl: url })}
                      onRemove={() => setForm({ ...form, logoUrl: "" })}
                    />
                    <LogoUpload
                      label={isAr ? "الشعار الفاتح (للخلفيات الداكنة)" : "Light Logo (for dark backgrounds)"}
                      currentUrl={form.logoLightUrl}
                      onUpload={(url) => setForm({ ...form, logoLightUrl: url })}
                      onRemove={() => setForm({ ...form, logoLightUrl: "" })}
                    />
                    <LogoUpload
                      label={isAr ? "أيقونة التطبيق" : "App Icon"}
                      currentUrl={form.appIcon}
                      onUpload={(url) => setForm({ ...form, appIcon: url })}
                      onRemove={() => setForm({ ...form, appIcon: "" })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Colors Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{isAr ? "الألوان" : "Colors"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isAr ? "اللون الأساسي" : "Primary Color"}</Label>
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
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? "اللون الثانوي" : "Secondary Color"}</Label>
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
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? "لون التمييز" : "Accent color"}</Label>
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
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? "لون الخلفية" : "Background Color"}</Label>
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
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? "لون النص" : "Text Color"}</Label>
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
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography & Style Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{isAr ? "الخطوط والتنسيق" : "Fonts & Formatting"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{isAr ? "الخط" : "Font"}</Label>
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
                    <Label>{isAr ? "حجم الحواف المستديرة" : "Rounded Corners Size"}</Label>
                    <Select
                      value={form.borderRadius}
                      onValueChange={(v) => setForm({ ...form, borderRadius: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{isAr ? "بدون استدارة" : "No Rotation"}</SelectItem>
                        <SelectItem value="0.25rem">{isAr ? "صغير" : "Small"}</SelectItem>
                        <SelectItem value="0.5rem">{isAr ? "متوسط" : "Average"}</SelectItem>
                        <SelectItem value="0.75rem">{isAr ? "كبير" : "Large"}</SelectItem>
                        <SelectItem value="1rem">{isAr ? "كبير جداً" : "Very Large"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{isAr ? "نمط القائمة الجانبية" : "Side Menu Style"}</Label>
                    <Select
                      value={form.sidebarStyle}
                      onValueChange={(v) => setForm({ ...form, sidebarStyle: v as "dark" | "light" | "gradient" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">{isAr ? "داكن" : "Dark"}</SelectItem>
                        <SelectItem value="light">{isAr ? "فاتح" : "Light"}</SelectItem>
                        <SelectItem value="gradient">{isAr ? "متدرج" : "Gradual"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">{isAr ? "معاينة" : "Preview"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="rounded-xl p-6 border"
                    style={{ backgroundColor: form.backgroundColor }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {form.logoLightUrl ? (
                        <img src={form.logoLightUrl} alt={isAr ? "شعار" : "Logo"} className="w-12 h-12 rounded-lg object-contain" />
                      ) : form.logoUrl ? (
                        <img src={form.logoUrl} alt={isAr ? "شعار" : "Logo"} className="w-12 h-12 rounded-lg object-contain" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6" style={{ color: form.textColor }} />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: form.textColor, fontFamily: form.fontFamily }}>
                          {isAr ? "معاينة الهوية البصرية" : "Visual Identity Preview"}
                        </h3>
                        <p className="text-sm opacity-70" style={{ color: form.textColor }}>
                          {isAr ? "هذه معاينة لكيفية ظهور الألوان والشعار" : "This is a preview of how the colors and logo will appear"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <div
                        className="px-4 py-2 text-white text-sm font-medium"
                        style={{ backgroundColor: form.primaryColor, borderRadius: form.borderRadius }}
                      >
                        {isAr ? "زر أساسي" : "Primary Button"}
                      </div>
                      <div
                        className="px-4 py-2 text-white text-sm font-medium"
                        style={{ backgroundColor: form.secondaryColor, borderRadius: form.borderRadius }}
                      >
                        {isAr ? "زر ثانوي" : "Secondary Button"}
                      </div>
                      <div
                        className="px-4 py-2 text-white text-sm font-medium"
                        style={{ backgroundColor: form.accentColor, borderRadius: form.borderRadius }}
                      >
                        {isAr ? "زر تمييز" : "Highlight Button"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save Button - Fixed at bottom for mobile, inline for desktop */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t p-3 flex items-center justify-center gap-3 md:relative md:border-t-0 md:p-0 md:mt-6 md:bg-transparent md:backdrop-blur-none">
            <Button onClick={handleSave} disabled={updateBranding.isPending} size="lg" className="flex-1 md:flex-none min-h-[48px]">
              <Save className="w-4 h-4 ml-2" />
              {updateBranding.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}
            </Button>
            <Button variant="outline" size="lg" onClick={() => { refetch(); toast.info(isAr ? "تم إعادة تحميل البيانات" : "Data reloaded"); }} className="flex-1 md:flex-none min-h-[48px]">
              <RotateCcw className="w-4 h-4 ml-2" />
              {isAr ? "إعادة تحميل" : "Reload"}
            </Button>
          </div>
          {/* Spacer for fixed bottom bar on mobile */}
          <div className="h-16 md:hidden" />
        </>
      )}
    </div>
  );
}
