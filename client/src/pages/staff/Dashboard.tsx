import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Users, CalendarCheck, CreditCard, TrendingUp, Clock, MapPin,
  Sparkles, Bell, BookOpen, MessageCircle, ArrowUpRight, Calendar,
  Baby, UserCheck, FileText, Megaphone, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function StaffDashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isEn = i18n.language === 'en';
  const locale = isEn ? 'en-US' : 'ar-SA';
  const { user } = useAuth();
  // Combined endpoint: 1 API call instead of 4 (saves ~1.5s TLS overhead)
  const { data: dashboardData, isLoading } = trpc.dashboard.all.useQuery();
  const stats = dashboardData?.stats;
  const todayAttendance = dashboardData?.staffAttendance;
  const announcements = dashboardData?.announcements;
  const allChildren = dashboardData?.children;
  const checkIn = trpc.staffAttendance.checkIn.useMutation({
    onSuccess: () => toast.success(t('staffDashboard.checkInSuccess')),
    onError: (err) => toast.error(err.message),
  });
  const checkOut = trpc.staffAttendance.checkOut.useMutation({
    onSuccess: () => toast.success(t('staffDashboard.checkOutSuccess')),
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
        toast.error(t('staffDashboard.locationError'));
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
        toast.error(t('staffDashboard.locationError'));
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isAdmin = user?.role === "admin" || user?.role === "principal" || user?.role === "owner" || user?.role === "super_admin";
  const attendanceRate = stats?.totalChildren ? Math.round((stats.presentToday / stats.totalChildren) * 100) : 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('staffDashboard.goodMorning');
    return t('staffDashboard.goodEvening');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting()}، {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/notifications`}>
            <Button variant="outline" size="sm" className="rounded-xl gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">{t('staffDashboard.notifications')}</span>
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
                <p className="font-semibold text-foreground">{t('staffDashboard.attendanceRegistration')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {todayAttendance?.checkInTime
                    ? `${t('staffDashboard.checkedInAt')} ${new Date(todayAttendance.checkInTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
                    : t('staffDashboard.notCheckedIn')}
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
                  {gpsLoading ? t('staffDashboard.locating') : t('staffDashboard.checkIn')}
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
                  {gpsLoading ? t('staffDashboard.locating') : t('staffDashboard.checkOut')}
                </Button>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-green-200 rounded-lg px-3 py-1.5">
                  <UserCheck className="h-3.5 w-3.5 ml-1" />
                  {t('staffDashboard.checkedInToday')}
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
          <Link href="/staff/attendance">
          <div className="stat-card cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" style={{ '--stat-color': 'oklch(0.55 0.16 155)' } as any}>
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-2xl bg-[#00C9B7]/10 flex items-center justify-center">
                <Baby className="h-5 w-5 text-[#00C9B7]" />
              </div>
              <Badge variant="outline" className="text-[10px] border-[#00C9B7]/30 text-[#00C9B7] rounded-lg">
                {t('staffDashboard.today')}
              </Badge>
            </div>
            <div className="mt-4">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-foreground">{stats?.presentToday ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{t('staffDashboard.childrenPresent')}</p>
            </div>
            <div className="mt-3">
              <Progress value={attendanceRate} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1">{attendanceRate}% {t('staffDashboard.attendanceRate')}</p>
            </div>
          </div>
          </Link>

          {/* Total Children */}
          <Link href="/staff/children">
          <div className="stat-card cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-2xl bg-[#7B61FF]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#7B61FF]" />
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-foreground">{stats?.totalChildren ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{t('staffDashboard.totalChildren')}</p>
            </div>
          </div>
          </Link>

          {/* Staff Present */}
          <Link href="/staff/staff-management">
          <div className="stat-card cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-2xl bg-[#FF5CA8]/10 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-[#FF5CA8]" />
              </div>
            </div>
            <div className="mt-4">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-foreground">{stats?.totalStaff ?? 0}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{t('staffDashboard.staff')}</p>
            </div>
          </div>
          </Link>

          {/* Revenue */}
          <Link href="/staff/finance">
          <div className="stat-card cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
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
              <p className="text-sm text-muted-foreground mt-1">{t('staffDashboard.revenue')}</p>
            </div>
          </div>
          </Link>
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
              <p className="text-xs font-medium text-foreground">{t('staffDashboard.attendance')}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/daily-reports`}>
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-[#FFB020]/5 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-[#FFB020]/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-[#FFB020]" />
              </div>
              <p className="text-xs font-medium text-foreground">{t('staffDashboard.reports')}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/messages`}>
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-[#FF5CA8]/5 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-[#FF5CA8]/10 flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="h-5 w-5 text-[#FF5CA8]" />
              </div>
              <p className="text-xs font-medium text-foreground">{t('staffDashboard.messages')}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ai/assistant">
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-[#7B61FF]/5 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-xl bg-[#7B61FF]/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="h-5 w-5 text-[#7B61FF]" />
              </div>
              <p className="text-xs font-medium text-foreground">{t('staffDashboard.aiAssistant')}</p>
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
                {isEn ? 'Today\'s Activity' : isAr ? 'نشاط اليوم' : 'Today\'s Activity'}
              </CardTitle>
              <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/attendance`}>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1 rounded-lg">
                  {isEn ? 'View All' : isAr ? 'عرض الكل' : 'View All'}
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
                <span className="text-sm font-medium">{t('staffDashboard.attendanceRate')}</span>
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
                <span className="text-sm font-medium">{t('staffDashboard.registeredChildren')}</span>
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
                  <span className="text-sm font-medium">{t('staffDashboard.collectedRevenue')}</span>
                </div>
                {isLoading ? <Skeleton className="h-6 w-20" /> : (
                  <span className="text-lg font-bold text-[#FFB020]">{(stats?.totalRevenue ?? 0).toLocaleString()} {t('staffDashboard.sar')}</span>
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
                {t('staffDashboard.smartRecommendations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 bg-white/80 rounded-xl border border-[#7B61FF]/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('staffDashboard.recommendation1')}
                </p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-[#7B61FF]/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('staffDashboard.recommendation2')}
                </p>
              </div>
              <Link href="/ai/assistant">
                <Button variant="ghost" size="sm" className="w-full text-xs text-[#7B61FF] hover:text-[#7B61FF] hover:bg-[#7B61FF]/5 rounded-lg mt-1">
                  {t('staffDashboard.exploreMore')}
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
                  {t('staffDashboard.latestAnnouncements')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcements?.slice(0, 3).map((ann: any) => (
                <div key={ann.id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{ann.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(ann.createdAt).toLocaleDateString(locale)}
                  </p>
                </div>
              ))}
              {(!announcements || announcements.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">{t('staffDashboard.noAnnouncements')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily Allergy Alert - Classroom Summary */}
      {(() => {
        const childrenWithAllergies = allChildren?.filter((c: any) => c.allergies && c.status === 'active') || [];
        if (childrenWithAllergies.length === 0) return null;
        return (
          <Card className="border-0 shadow-sm border-l-4 border-l-red-400 bg-gradient-to-l from-red-50/50 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                {isAr ? `تنبيهات الحساسية (${childrenWithAllergies.length} ${childrenWithAllergies.length === 1 ? 'طفل' : 'أطفال'})` : `Allergy Alerts (${childrenWithAllergies.length} ${childrenWithAllergies.length === 1 ? 'child' : 'children'})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {childrenWithAllergies.slice(0, 5).map((child: any) => (
                  <div key={child.id} className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-red-100">
                    <div className="flex items-center gap-2">
                      {child.photo ? (
                        <img src={child.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-600">
                          {child.firstName?.[0]}{child.lastName?.[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium">{child.firstName} {child.lastName}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50">
                      {child.allergies.length > 30 ? child.allergies.substring(0, 30) + '...' : child.allergies}
                    </Badge>
                  </div>
                ))}
                {childrenWithAllergies.length > 5 && (
                  <p className="text-xs text-center text-red-500 mt-1">
                    {isAr ? `+${childrenWithAllergies.length - 5} أطفال آخرين` : `+${childrenWithAllergies.length - 5} more children`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Upcoming Events */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              {t('staffDashboard.upcomingEvents')}
            </CardTitle>
            <Link href={`/${user?.role === 'parent' ? 'parent' : 'staff'}/calendar`}>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1 rounded-lg">
                {t('staffDashboard.calendar')}
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('staffDashboard.noEvents')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
