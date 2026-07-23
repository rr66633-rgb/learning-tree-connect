import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Server, Database, Shield, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SuperAdminSettings() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: stats, isLoading } = trpc.superAdmin.platformStats.useQuery();

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
