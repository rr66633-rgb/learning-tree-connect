import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, CreditCard, TrendingUp } from "lucide-react";

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "إجمالي الأطفال", value: stats?.totalChildren ?? 0, icon: Users, color: "text-primary" },
    { title: "الحضور اليوم", value: stats?.presentToday ?? 0, icon: CalendarCheck, color: "text-green-600" },
    { title: "الموظفون", value: stats?.totalStaff ?? 0, icon: TrendingUp, color: "text-blue-600" },
    { title: "إجمالي الإيرادات", value: `${(stats?.totalRevenue ?? 0).toLocaleString()} ر.س`, icon: CreditCard, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
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
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>نشاط اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">نسبة الحضور</span>
                <span className="font-semibold text-primary">
                  {stats?.totalChildren ? Math.round((stats.presentToday / stats.totalChildren) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">الأطفال النشطون</span>
                <span className="font-semibold">{stats?.totalChildren ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">المعلمون</span>
                <span className="font-semibold">{stats?.totalStaff ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ملخص مالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">الإيرادات المحصلة</span>
                <span className="font-semibold text-green-700">{(stats?.totalRevenue ?? 0).toLocaleString()} ر.س</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <span className="text-sm text-amber-700">مستحقات قادمة</span>
                <span className="font-semibold text-amber-700">-</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">ضريبة القيمة المضافة (15%)</span>
                <span className="font-semibold">مطبقة</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
