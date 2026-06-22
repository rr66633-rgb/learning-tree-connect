import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Baby, Calendar, Bell, CreditCard, Clock, Heart,
  BookOpen, MessageCircle, Sparkles, ArrowUpRight,
  CheckCircle2, XCircle, AlertCircle, LogIn, LogOut
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ParentDashboard() {
  const { user } = useAuth();
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: notifications } = trpc.notifications.unreadCount.useQuery();
  const { data: announcements } = trpc.announcements.list.useQuery();

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: todayAttendance } = trpc.attendance.byDate.useQuery({ date: today });

  const childAttendanceMap = useMemo(() => {
    const map: Record<number, any> = {};
    if (todayAttendance) {
      todayAttendance.forEach((r: any) => { map[r.childId] = r; });
    }
    return map;
  }, [todayAttendance]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    return "مساء الخير";
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'present': return { label: 'حاضر', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      case 'absent': return { label: 'غائب', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      case 'late': return { label: 'متأخر', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
      case 'excused': return { label: 'غياب بعذر', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'checked_in': return { label: 'في المركز', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'checked_out': return { label: 'غادر', icon: LogOut, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
      default: return { label: status, icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting()}، {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/parent/notifications">
          <Button variant="outline" size="icon" className="rounded-xl relative">
            <Bell className="h-5 w-5" />
            {(notifications ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {notifications}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Children Cards - Emotional Design */}
      <div className="space-y-4">
        {isLoading ? Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm"><CardContent className="p-6"><Skeleton className="h-32 w-full rounded-xl" /></CardContent></Card>
        )) : children?.map((child: any) => {
          const att = childAttendanceMap[child.id];
          const statusInfo = att ? getStatusInfo(att.status) : null;
          return (
            <Card key={child.id} className="border-0 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
              <CardContent className="p-0">
                {/* Child header with gradient */}
                <div className="bg-gradient-to-l from-primary/8 via-primary/4 to-transparent p-5">
                  <div className="flex items-center gap-4">
                    {child.photo ? (
                      <img src={child.photo} alt={`${child.firstName} ${child.lastName}`} className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-white shadow-md">
                        <Baby className="h-7 w-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-bold text-foreground">{child.firstName} {child.lastName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {child.dateOfBirth && (
                          <span className="text-sm text-muted-foreground">{getAge(child.dateOfBirth)} سنوات</span>
                        )}
                        {child.className && (
                          <Badge variant="secondary" className="rounded-lg text-xs">{child.className}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance status */}
                <div className="px-5 pb-5 pt-3">
                  {statusInfo ? (
                    <div className={`p-3.5 rounded-xl ${statusInfo.bg} border ${statusInfo.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <statusInfo.icon className={`h-4 w-4 ${statusInfo.color}`} />
                          <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {att.checkInTime && (
                            <span className="flex items-center gap-1">
                              <LogIn className="h-3 w-3" />
                              {new Date(att.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {att.checkOutTime && (
                            <span className="flex items-center gap-1">
                              <LogOut className="h-3 w-3" />
                              {new Date(att.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-sm text-muted-foreground">لم يُسجل حضور اليوم</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/parent/daily-report">
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="h-11 w-11 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2.5">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-foreground">التقرير اليومي</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/parent/engagement">
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="h-11 w-11 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2.5">
                <Heart className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs font-medium text-foreground">مشاركة الأسرة</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/parent/messages">
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="h-11 w-11 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-2.5">
                <MessageCircle className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-xs font-medium text-foreground">الرسائل</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/parent/engagement/chatbot">
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-0 shadow-sm bg-gradient-to-br from-violet-50/50 to-transparent">
            <CardContent className="p-4 text-center">
              <div className="h-11 w-11 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-2.5">
                <Sparkles className="h-5 w-5 text-violet-600" />
              </div>
              <p className="text-xs font-medium text-foreground">المساعد الذكي</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{notifications ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">إشعارات جديدة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Baby className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{children?.length ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">أطفالي</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Announcements */}
      {announcements && announcements.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Bell className="h-3.5 w-3.5 text-amber-600" />
                </div>
                آخر الإعلانات
              </CardTitle>
              <Link href="/parent/announcements">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1 rounded-lg">
                  عرض الكل
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {announcements.slice(0, 3).map((a: any) => (
              <div key={a.id} className="p-3.5 rounded-xl bg-muted/30 border border-border/50">
                <p className="font-medium text-sm text-foreground">{a.titleAr || a.title}</p>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{a.contentAr || a.content}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
