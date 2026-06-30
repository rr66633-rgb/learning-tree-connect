import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Users, CalendarCheck, CreditCard, TrendingUp, Clock, MapPin,
  Sparkles, Bell, BookOpen, MessageCircle, ArrowUpRight, Calendar,
  Baby, UserCheck, FileText, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: todayAttendance } = trpc.staffAttendance.today.useQuery();
  const { data: announcements } = trpc.announcements.list.useQuery();
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

  const isAdmin = user?.role === "admin" || user?.role === "principal";
  const attendanceRate = stats?.totalChildren ? Math.round((stats.presentToday / stats.totalChildren) * 100) : 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "مساء الخير";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting()}، {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/notifications`}>
            <Button variant="outline" size="sm" className="rounded-xl gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">الإشعارات</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* GPS Attendance Card - Premium */}
      <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-l from-primary/5 via-primary/3 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">تسجيل الحضور</p>
                <p className="text-sm text-muted-foreground mt-0.5">
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
                  className="rounded-xl bg-green-600 hover:bg-green-700 shadow-sm btn-press"
                >
                  <Clock className="h-4 w-4 ml-1.5" />
                  {gpsLoading ? "جاري..." : "تسجيل حضور"}
                </Button>
              ) : !todayAttendance?.checkOutTime ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={gpsLoading || checkOut.isPending}
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 btn-press"
                >
                  <Clock className="h-4 w-4 ml-1.5" />
                  {gpsLoading ? "جاري..." : "تسجيل انصراف"}
                </Button>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200 rounded-lg px-3 py-1.5">
                  <UserCheck className="h-3.5 w-3.5 ml-1" />
                  تم تسجيل اليوم
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Premium Grid */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Children Present */}
          <div className="stat-card" style={{ '--stat-color': 'oklch(0.55 0.16 155)' } as any}>
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-2xl bg-[#00C9B7]/10 flex items-center justify-center">
                <Baby className="h-5 w-5 text-[#00C9B7]" />
              </div>
              <Badge variant="outline" className="text-[10px] border-[#00C9B7]/30 text-[#00C9B7] rounded-lg">
                اليوم
              </Badge>
            </div>
            <div className="mt-4">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-foreground">{stats?.presentToday ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">أطفال حاضرون</p>
            </div>
            <div className="mt-3">
              <Progress value={attendanceRate} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1">{attendanceRate}% نسبة الحضور</p>
            </div>
          </div>

          {/* Total Children */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-2xl bg-[#7B61FF]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#7B61FF]" />
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-foreground">{stats?.totalChildren ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">إجمالي الأطفال</p>
            </div>
          </div>

          {/* Staff Present */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-2xl bg-[#FF5CA8]/10 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-[#FF5CA8]" />
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-foreground">{stats?.totalStaff ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">الموظفون</p>
            </div>
          </div>

          {/* Revenue */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-2xl bg-[#FFB020]/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-[#FFB020]" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px] font-medium">+12%</span>
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <p className="text-2xl font-bold text-foreground">{(stats?.totalRevenue ?? 0).toLocaleString()}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">الإيرادات (ر.س)</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/attendance`}>
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-[#00C9B7]/5 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-[#00C9B7]/10 flex items-center justify-center mx-auto mb-2">
                <CalendarCheck className="h-5 w-5 text-[#00C9B7]" />
              </div>
              <p className="text-xs font-medium text-foreground">الحضور</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/daily-reports`}>
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-[#FFB020]/5 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-[#FFB020]/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-[#FFB020]" />
              </div>
              <p className="text-xs font-medium text-foreground">التقارير</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/messages`}>
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-[#FF5CA8]/5 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-[#FF5CA8]/10 flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="h-5 w-5 text-[#FF5CA8]" />
              </div>
              <p className="text-xs font-medium text-foreground">الرسائل</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ai/assistant">
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-[#7B61FF]/5 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-[#7B61FF]/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="h-5 w-5 text-[#7B61FF]" />
              </div>
              <p className="text-xs font-medium text-foreground">المساعد الذكي</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Activity */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                نشاط اليوم
              </CardTitle>
              <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/attendance`}>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1 rounded-lg">
                  عرض الكل
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-l from-[#00C9B7]/5 to-transparent rounded-xl border border-[#00C9B7]/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#00C9B7]/10 flex items-center justify-center">
                  <CalendarCheck className="h-4 w-4 text-[#00C9B7]" />
                </div>
                <span className="text-sm font-medium">نسبة الحضور</span>
              </div>
              {isLoading ? <Skeleton className="h-6 w-14" /> : (
                <span className="text-lg font-bold text-[#00C9B7]">{attendanceRate}%</span>
              )}
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-l from-[#7B61FF]/5 to-transparent rounded-xl border border-[#7B61FF]/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#7B61FF]/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#7B61FF]" />
                </div>
                <span className="text-sm font-medium">الأطفال المسجلون</span>
              </div>
              {isLoading ? <Skeleton className="h-6 w-14" /> : (
                <span className="text-lg font-bold text-[#7B61FF]">{stats?.totalChildren ?? 0}</span>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between p-4 bg-gradient-to-l from-[#FFB020]/5 to-transparent rounded-xl border border-[#FFB020]/10">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#FFB020]/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-[#FFB020]" />
                  </div>
                  <span className="text-sm font-medium">الإيرادات المحصلة</span>
                </div>
                {isLoading ? <Skeleton className="h-6 w-20" /> : (
                  <span className="text-lg font-bold text-[#FFB020]">{(stats?.totalRevenue ?? 0).toLocaleString()} ر.س</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations & Announcements */}
        <div className="space-y-4">
          {/* AI Recommendations */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-[#7B61FF]/5 to-[#FF5CA8]/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7B61FF]" />
                توصيات ذكية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 bg-white/80 rounded-xl border border-[#7B61FF]/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  بناءً على بيانات الحضور، يُنصح بالتواصل مع أولياء الأمور للغائبين لأكثر من يومين متتاليين.
                </p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-[#7B61FF]/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يمكنك إنشاء خطة أسبوعية جديدة باستخدام المساعد الذكي لتوفير الوقت.
                </p>
              </div>
              <Link href="/ai/assistant">
                <Button variant="ghost" size="sm" className="w-full text-xs text-[#7B61FF] hover:text-[#7B61FF] hover:bg-[#7B61FF]/5 rounded-lg mt-1">
                  استكشف المزيد
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#FFB020]" />
                  آخر الإعلانات
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcements?.slice(0, 3).map((ann: any) => (
                <div key={ann.id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{ann.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(ann.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              ))}
              {(!announcements || announcements.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد إعلانات حديثة</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Events */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              الأحداث القادمة
            </CardTitle>
            <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/calendar`}>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1 rounded-lg">
                التقويم
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد أحداث قادمة هذا الأسبوع</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
