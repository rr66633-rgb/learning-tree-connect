import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { CalendarDays, Clock, LogIn, LogOut, User } from "lucide-react";

export default function ParentAttendance() {
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const { data: records, isLoading } = trpc.attendance.byChild.useQuery(
    { childId: parseInt(selectedChild || "0") },
    { enabled: !!selectedChild }
  );

  // Get today's attendance record
  const todayRecord = useMemo(() => {
    if (!records) return null;
    const today = new Date().toISOString().split('T')[0];
    return records.find((r: any) => {
      const recordDate = new Date(r.date).toISOString().split('T')[0];
      return recordDate === today;
    });
  }, [records]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">سجل الحضور</h1>
      
      <Select value={selectedChild} onValueChange={setSelectedChild}>
        <SelectTrigger className="max-w-xs"><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
        <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
      </Select>

      {selectedChild && (
        <>
          {/* Today's Status Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                حالة اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-20 w-full" /> : todayRecord ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Arrival Info */}
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <LogIn className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">الوصول</p>
                      {todayRecord.checkInTime ? (
                        <>
                          <p className="text-lg font-bold text-green-700 dark:text-green-300">
                            {new Date(todayRecord.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {todayRecord.droppedOffBy && (
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              أوصله: {todayRecord.droppedOffBy}
                              {todayRecord.droppedOffRelationship && ` (${getRelationshipLabel(todayRecord.droppedOffRelationship)})`}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">لم يُسجل بعد</p>
                      )}
                    </div>
                  </div>

                  {/* Departure Info */}
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                    <LogOut className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200">المغادرة</p>
                      {todayRecord.checkOutTime ? (
                        <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                          {new Date(todayRecord.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">لا يزال في المركز</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">لم يتم تسجيل حضور اليوم</p>
              )}
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card>
            <CardHeader><CardTitle>سجل الحضور السابق</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32 w-full" /> : records?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد سجلات حضور</p>
              ) : (
                <div className="space-y-2">
                  {records?.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm block">{new Date(r.date).toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                          <div className="flex gap-3 mt-1">
                            {r.checkInTime && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <LogIn className="h-3 w-3" />
                                {new Date(r.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {r.checkOutTime && (
                              <span className="text-xs text-orange-600 flex items-center gap-1">
                                <LogOut className="h-3 w-3" />
                                {new Date(r.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={r.status === "present" ? "bg-green-100 text-green-700" : r.status === "late" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                        {r.status === "present" ? "حاضر" : r.status === "late" ? "متأخر" : r.status === "excused" ? "إذن" : "غائب"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function getRelationshipLabel(rel: string): string {
  const labels: Record<string, string> = {
    mother: "الأم",
    father: "الأب",
    driver: "السائق",
    grandparent: "الجد/الجدة",
    guardian: "ولي الأمر",
    other: "آخر",
  };
  return labels[rel] || rel;
}
