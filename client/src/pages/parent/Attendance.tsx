import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { CalendarDays, Clock, LogIn, LogOut, User, History } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "غياب بعذر",
  checked_in: "تم التسجيل",
  checked_out: "تم المغادرة",
};

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  excused: "bg-blue-100 text-blue-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-gray-100 text-gray-700",
};

export default function ParentAttendance() {
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const { data: records, isLoading } = trpc.attendance.byChild.useQuery(
    { childId: parseInt(selectedChild || "0") },
    { enabled: !!selectedChild }
  );
  const { data: auditLogs } = trpc.attendance.auditLog.useQuery(
    { childId: parseInt(selectedChild || "0") },
    { enabled: !!selectedChild && showHistory }
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
      
      <Select value={selectedChild} onValueChange={(v) => { setSelectedChild(v); setShowHistory(false); }}>
        <SelectTrigger className="max-w-xs"><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
        <SelectContent>{children?.map((c: any) => (
          <SelectItem key={c.id} value={c.id.toString()}>
            <span className="flex items-center gap-2">
              {c.photo ? (
                <img src={c.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{c.firstName?.charAt(0)}</div>
              )}
              {c.firstName} {c.lastName}
            </span>
          </SelectItem>
        ))}</SelectContent>
      </Select>

      {selectedChild && (
        <>
          {/* Today's Status Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-3">
                {(() => {
                  const child = children?.find((c: any) => c.id === parseInt(selectedChild));
                  return child?.photo ? (
                    <img src={child.photo} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-primary/20" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                  );
                })()}
                حالة اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-20 w-full" /> : todayRecord ? (
                <div className="space-y-4">
                  {/* Current Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">الحالة الحالية:</span>
                    <Badge className={STATUS_COLORS[todayRecord.status] || "bg-gray-100 text-gray-700"}>
                      {STATUS_LABELS[todayRecord.status] || todayRecord.status}
                    </Badge>
                  </div>

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
                </div>
              ) : (
                <EmptyState variant="attendance" compact />
              )}
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card>
            <CardHeader><CardTitle>سجل الحضور السابق</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32 w-full" /> : records?.length === 0 ? (
                <EmptyState variant="attendance" compact />
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
                      <Badge className={STATUS_COLORS[r.status] || "bg-gray-100 text-gray-700"}>
                        {STATUS_LABELS[r.status] || r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Log / Change History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  سجل تغييرات الحالة
                </span>
                {!showHistory && (
                  <button onClick={() => setShowHistory(true)} className="text-sm text-primary hover:underline font-normal">
                    عرض السجل
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            {showHistory && (
              <CardContent>
                {auditLogs && auditLogs.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                            {" "}
                            {new Date(log.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Badge variant="outline" className="text-xs">{STATUS_LABELS[log.previousStatus] || log.previousStatus}</Badge>
                          <span className="text-muted-foreground">←</span>
                          <Badge className={`text-xs ${STATUS_COLORS[log.newStatus] || ""}`}>{STATUS_LABELS[log.newStatus] || log.newStatus}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{log.changedByName || ""}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">لا توجد تغييرات مسجلة</p>
                )}
              </CardContent>
            )}
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
