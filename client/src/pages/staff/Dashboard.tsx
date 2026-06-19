import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Users, CalendarCheck, CreditCard, TrendingUp, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: todayAttendance } = trpc.staffAttendance.today.useQuery();
  const checkIn = trpc.staffAttendance.checkIn.useMutation({
    onSuccess: () => toast.success("تم تسجيل الحضور بنجاح"),
    onError: (err) => toast.error(err.message),
  });
  const checkOut = trpc.staffAttendance.checkOut.useMutation({
    onSuccess: () => toast.success("تم تسجيل الانصراف بنجاح"),
    onError: (err) => toast.error(err.message),
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleCheckIn = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        checkIn.mutate({
          gpsLat: pos.coords.latitude,
          gpsLng: pos.coords.longitude,
          device: navigator.userAgent.slice(0, 100),
        });
        setGpsLoading(false);
      },
      (err) => {
        toast.error("لا يمكن تحديد موقعك. يرجى تفعيل خدمات الموقع.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckOut = () => {
    if (!todayAttendance?.id) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        checkOut.mutate({
          id: todayAttendance.id,
          gpsLat: pos.coords.latitude,
          gpsLng: pos.coords.longitude,
        });
        setGpsLoading(false);
      },
      (err) => {
        toast.error("لا يمكن تحديد موقعك. يرجى تفعيل خدمات الموقع.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const statCards = [
    { title: "إجمالي الأطفال", value: stats?.totalChildren ?? 0, icon: Users, color: "text-emerald-600" },
    { title: "الحضور اليوم", value: stats?.presentToday ?? 0, icon: CalendarCheck, color: "text-green-600" },
    { title: "الموظفون", value: stats?.totalStaff ?? 0, icon: TrendingUp, color: "text-blue-600" },
    { title: "إجمالي الإيرادات", value: `${(stats?.totalRevenue ?? 0).toLocaleString()} ر.س`, icon: CreditCard, color: "text-amber-600" },
  ];

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مرحباً، {user?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* GPS Attendance Card */}
      <Card className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">تسجيل الحضور</p>
                <p className="text-xs text-muted-foreground">
                  {todayAttendance?.checkInTime
                    ? `تم الحضور: ${new Date(todayAttendance.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                    : "لم يتم تسجيل الحضور بعد"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!todayAttendance?.checkInTime ? (
                <Button
                  onClick={handleCheckIn}
                  disabled={gpsLoading || checkIn.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Clock className="h-4 w-4 ml-1" />
                  {gpsLoading ? "جاري التحديد..." : "تسجيل حضور"}
                </Button>
              ) : !todayAttendance?.checkOutTime ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={gpsLoading || checkOut.isPending}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Clock className="h-4 w-4 ml-1" />
                  {gpsLoading ? "جاري التحديد..." : "تسجيل انصراف"}
                </Button>
              ) : (
                <span className="text-sm text-green-600 font-medium">✓ تم تسجيل اليوم</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {isAdmin && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>نشاط اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">نسبة الحضور</span>
                {isLoading ? <Skeleton className="h-5 w-12" /> : (
                  <span className="font-semibold text-primary">
                    {stats?.totalChildren ? Math.round((stats.presentToday / stats.totalChildren) * 100) : 0}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">الأطفال النشطون</span>
                {isLoading ? <Skeleton className="h-5 w-12" /> : (
                  <span className="font-semibold">{stats?.totalChildren ?? 0}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>ملخص مالي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">الإيرادات المحصلة</span>
                  {isLoading ? <Skeleton className="h-5 w-20" /> : (
                    <span className="font-semibold text-green-700">{(stats?.totalRevenue ?? 0).toLocaleString()} ر.س</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">ضريبة القيمة المضافة (15%)</span>
                  <span className="font-semibold">مطبقة</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
