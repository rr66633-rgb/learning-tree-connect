import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Server, Database, Shield, Globe } from "lucide-react";

export default function SuperAdminSettings() {
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
          إعدادات المنصة
        </h1>
        <p className="text-muted-foreground mt-1">إعدادات عامة للمنصة</p>
      </div>

      {/* Platform Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5 text-[#00C9B7]" />
              معلومات المنصة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">اسم المنصة</span>
              <span className="font-medium">نشأة</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">الإصدار</span>
              <Badge variant="secondary">2.0.0</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">الحالة</span>
              <Badge className="bg-green-100 text-green-800">يعمل</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">البيئة</span>
              <Badge variant="outline">إنتاج</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-[#7C3AED]" />
              إحصائيات المنصة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">إجمالي المنظمات</span>
              <span className="font-bold text-lg">{stats?.totalOrganizations || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">المنظمات النشطة</span>
              <span className="font-bold text-lg text-green-600">{stats?.activeOrganizations || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">إجمالي المستخدمين</span>
              <span className="font-bold text-lg">{stats?.totalUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">إجمالي الأطفال</span>
              <span className="font-bold text-lg">{stats?.totalChildren || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">إجمالي الفصول</span>
              <span className="font-bold text-lg">{stats?.totalClasses || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#EC4899]" />
              الأمان
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">المصادقة</span>
              <Badge className="bg-green-100 text-green-800">مفعّل</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">تشفير البيانات</span>
              <Badge className="bg-green-100 text-green-800">مفعّل</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">سجل المراجعة</span>
              <Badge className="bg-green-100 text-green-800">مفعّل</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#F97316]" />
              النطاقات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">النطاق الرئيسي</span>
              <span className="font-medium text-sm" dir="ltr">naashah.com</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">النطاق الفرعي</span>
              <span className="font-medium text-sm" dir="ltr">naashah.manus.space</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">شهادة الأمان</span>
              <Badge className="bg-green-100 text-green-800">SSL مفعّل</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
