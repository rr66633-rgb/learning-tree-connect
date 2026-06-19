import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Baby, Calendar, Bell, CreditCard, LogIn, LogOut, Clock } from "lucide-react";
import { useMemo } from "react";

export default function ParentDashboard() {
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: notifications } = trpc.notifications.unreadCount.useQuery();
  const { data: announcements } = trpc.announcements.list.useQuery();
  
  // Get today's attendance for all children
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: todayAttendance } = trpc.attendance.byDate.useQuery({ date: today });

  // Map attendance to children
  const childAttendanceMap = useMemo(() => {
    const map: Record<number, any> = {};
    if (todayAttendance) {
      todayAttendance.forEach((r: any) => { map[r.childId] = r; });
    }
    return map;
  }, [todayAttendance]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مرحباً بك</h1>

      {/* Children summary with today's attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        )) : children?.map((child: any) => {
          const att = childAttendanceMap[child.id];
          return (
            <Card key={child.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {child.photo ? (
                    <img src={child.photo} alt={`${child.firstName} ${child.lastName}`} className="h-12 w-12 rounded-full object-cover border-2 border-primary/20" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Baby className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{child.firstName} {child.lastName}</p>
                    <p className="text-sm text-muted-foreground">{child.dateOfBirth ? `${getAge(child.dateOfBirth)} سنوات` : ""}</p>
                  </div>
                </div>
                
                {/* Today's attendance status */}
                {att ? (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">حالة اليوم</span>
                      <Badge variant="secondary" className={`text-xs ${
                        att.status === 'present' ? 'bg-green-100 text-green-700' :
                        att.status === 'absent' ? 'bg-red-100 text-red-700' :
                        att.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        att.status === 'excused' ? 'bg-blue-100 text-blue-700' :
                        att.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' :
                        att.status === 'checked_out' ? 'bg-gray-100 text-gray-700' : ''
                      }`}>
                        {att.status === 'present' ? 'حاضر' :
                         att.status === 'absent' ? 'غائب' :
                         att.status === 'late' ? 'متأخر' :
                         att.status === 'excused' ? 'غياب بعذر' :
                         att.status === 'checked_in' ? 'تم التسجيل' :
                         att.status === 'checked_out' ? 'تم المغادرة' : att.status}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {att.checkInTime && (
                        <span className="flex items-center gap-1 text-green-600">
                          <LogIn className="h-3 w-3" />
                          الوصول: {new Date(att.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {att.checkOutTime ? (
                        <span className="flex items-center gap-1 text-orange-600">
                          <LogOut className="h-3 w-3" />
                          المغادرة: {new Date(att.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : att.status !== 'absent' && att.status !== 'excused' ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">في المركز</Badge>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-2 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">لم يُسجل حضور اليوم</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Bell className="h-8 w-8 text-amber-500" /><div><p className="text-2xl font-bold">{notifications ?? 0}</p><p className="text-xs text-muted-foreground">إشعارات جديدة</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Baby className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{children?.length ?? 0}</p><p className="text-xs text-muted-foreground">أطفالي</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Calendar className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">-</p><p className="text-xs text-muted-foreground">أحداث قادمة</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CreditCard className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">-</p><p className="text-xs text-muted-foreground">فواتير معلقة</p></div></CardContent></Card>
      </div>

      {/* Recent announcements */}
      {announcements && announcements.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">آخر الإعلانات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {announcements.slice(0, 3).map((a: any) => (
              <div key={a.id} className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium text-sm">{a.titleAr || a.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{a.contentAr || a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleDateString('ar-SA')}</p>
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
