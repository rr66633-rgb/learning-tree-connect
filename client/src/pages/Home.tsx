import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, CreditCard, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  const statCards = [
    { title: isAr ? "إجمالي الأطفال" : "Total Children", value: stats?.totalChildren ?? 0, icon: Users, color: "text-primary" },
    { title: isAr ? "الحضور اليوم" : "Attendance Today", value: stats?.presentToday ?? 0, icon: CalendarCheck, color: "text-green-600" },
    { title: isAr ? "الموظفون" : "Staff", value: stats?.totalStaff ?? 0, icon: TrendingUp, color: "text-blue-600" },
    { title: isAr ? "إجمالي الإيرادات" : "Total Revenue", value: `${(stats?.totalRevenue ?? 0).toLocaleString()} ر.س`, icon: CreditCard, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "لوحة التحكم" : "Dashboard"}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? "نشاط اليوم" : "Today\'s Activity"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{isAr ? "نسبة الحضور" : "Attendance Rate"}</span>
                {isLoading ? <Skeleton className="h-5 w-12" /> : (
                  <span className="font-semibold text-primary">
                    {stats?.totalChildren ? Math.round((stats.presentToday / stats.totalChildren) * 100) : 0}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{isAr ? "الأطفال النشطون" : "Active Children"}</span>
                {isLoading ? <Skeleton className="h-5 w-12" /> : (
                  <span className="font-semibold">{stats?.totalChildren ?? 0}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{isAr ? "المعلمون" : "Teachers"}</span>
                {isLoading ? <Skeleton className="h-5 w-12" /> : (
                  <span className="font-semibold">{stats?.totalStaff ?? 0}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isAr ? "ملخص مالي" : "Financial Summary"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">{isAr ? "الإيرادات المحصلة" : "Collected Revenue"}</span>
                {isLoading ? <Skeleton className="h-5 w-20" /> : (
                  <span className="font-semibold text-green-700">{(stats?.totalRevenue ?? 0).toLocaleString()} {isAr ? "ر.س" : "SAR"}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <span className="text-sm text-amber-700">{isAr ? "مستحقات قادمة" : "Upcoming dues"}</span>
                <span className="font-semibold text-amber-700">-</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">{isAr ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span>
                <span className="font-semibold">{isAr ? "مطبقة" : "Applied"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
