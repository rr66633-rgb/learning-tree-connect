import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Server, Database, Shield, Globe, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const NUMA_IMAGE = "/assets/numa-assistant.webp";

export default function SuperAdminSettings() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const utils = trpc.useUtils();
  const { data: stats, isLoading } = trpc.superAdmin.platformStats.useQuery();
  const assistantSettings = trpc.visitorAssistant.adminSettings.useQuery();
  const updateAssistant = trpc.visitorAssistant.updateSettings.useMutation({
    onSuccess: async data => {
      await Promise.all([
        utils.visitorAssistant.adminSettings.invalidate(),
        utils.visitorAssistant.publicSettings.invalidate(),
      ]);
      toast.success(data.enabled
        ? (isAr ? "تم إظهار نُمى للزوار" : "Numa is now visible to visitors")
        : (isAr ? "تم إخفاء نُمى عن الزوار" : "Numa is now hidden from visitors"));
    },
    onError: error => {
      toast.error(error.message || (isAr ? "تعذّر تحديث الإعداد" : "Couldn't update the setting"));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#00C9B7]" />
          {isAr ? "إعدادات المنصة" : "Platform Settings"}
        </h1>
        <p className="text-muted-foreground mt-1">{isAr ? "إعدادات عامة للمنصة" : "General Platform Settings"}</p>
      </div>

      <Card className="overflow-hidden border-[#00C9B7]/20 bg-gradient-to-br from-[#F0FFFC] via-white to-[#F4F1FF]">
        <CardHeader className="border-b border-[#00C9B7]/10 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#00C9B7]/15">
                <img src={NUMA_IMAGE} alt={isAr ? "شخصية نُمى" : "Numa mascot"} className="h-[88px] w-[88px] max-w-none translate-y-2 object-contain" />
              </div>
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="size-5 text-[#7B61FF]" />
                  {isAr ? "نُمى — مساعد الزوار" : "Numa — Visitor Assistant"}
                </CardTitle>
                <CardDescription className="mt-2 leading-6">
                  {isAr
                    ? "تحكم في ظهور زر المحادثة الذكي على صفحات الموقع العامة. عند الإيقاف تُرفض المحادثات الجديدة من الخادم أيضاً."
                    : "Control the smart chat button on public website pages. When disabled, new chats are also rejected by the server."}
                </CardDescription>
              </div>
            </div>
            <Badge className={assistantSettings.data?.enabled
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-gray-200 bg-gray-100 text-gray-600"}
            >
              {assistantSettings.isLoading
                ? (isAr ? "جارٍ التحميل" : "Loading")
                : assistantSettings.data?.enabled
                  ? (isAr ? "ظاهر للزوار" : "Visible")
                  : (isAr ? "مخفي" : "Hidden")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-5 rounded-xl border border-gray-100 bg-white/80 p-4">
            <div>
              <p className="font-semibold text-foreground">{isAr ? "إظهار المساعد في الموقع" : "Show assistant on website"}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {isAr ? "يظهر في الصفحة الرئيسية وصفحة الباقات فقط." : "Shown on the homepage and pricing page only."}
              </p>
            </div>
            <Switch
              checked={assistantSettings.data?.enabled ?? false}
              onCheckedChange={enabled => updateAssistant.mutate({ enabled })}
              disabled={assistantSettings.isLoading || assistantSettings.isError || updateAssistant.isPending}
              aria-label={isAr ? "إظهار أو إخفاء مساعد الزوار" : "Show or hide visitor assistant"}
              className="!h-7 !w-12 !min-h-0 !min-w-0 data-[state=checked]:bg-[#00B7A7] [&_[data-slot=switch-thumb]]:size-6"
            />
          </div>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5 text-[#00C9B7]" />
              {isAr ? "معلومات المنصة" : "Platform Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "اسم المنصة" : "Platform Name"}</span>
              <span className="font-medium">{isAr ? "نشأة" : "Nashaa"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "الإصدار" : "Version"}</span>
              <Badge variant="secondary">2.0.0</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "الحالة" : "Status"}</span>
              <Badge className="bg-green-100 text-green-800">{isAr ? "يعمل" : "Works"}</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{isAr ? "البيئة" : "Environment"}</span>
              <Badge variant="outline">{isAr ? "إنتاج" : "Production"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-[#7C3AED]" />
              {isAr ? "إحصائيات المنصة" : "Platform Statistics"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "إجمالي المنظمات" : "Total Organizations"}</span>
              <span className="font-bold text-lg">{stats?.totalOrganizations || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "المنظمات النشطة" : "Active Organizations"}</span>
              <span className="font-bold text-lg text-green-600">{stats?.activeOrganizations || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "إجمالي المستخدمين" : "Total Users"}</span>
              <span className="font-bold text-lg">{stats?.totalUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "إجمالي الأطفال" : "Total Children"}</span>
              <span className="font-bold text-lg">{stats?.totalChildren || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{isAr ? "إجمالي الفصول" : "Total Classes"}</span>
              <span className="font-bold text-lg">{stats?.totalClasses || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#EC4899]" />
              {isAr ? "الأمان" : "Security"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "المصادقة" : "Authentication"}</span>
              <Badge className="bg-green-100 text-green-800">{isAr ? "مفعّل" : "Activated"}</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "تشفير البيانات" : "Data Encryption"}</span>
              <Badge className="bg-green-100 text-green-800">{isAr ? "مفعّل" : "Activated"}</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{isAr ? "سجل المراجعة" : "Review Log"}</span>
              <Badge className="bg-green-100 text-green-800">{isAr ? "مفعّل" : "Activated"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#F97316]" />
              {isAr ? "النطاقات" : "Domains"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{isAr ? "النطاق الرئيسي" : "Main Domain"}</span>
              <span className="font-medium text-sm" dir="ltr">naashah.com</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{isAr ? "شهادة الأمان" : "Security Certificate"}</span>
              <Badge className="bg-green-100 text-green-800">SSL مفعّل</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
