import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { BarChart3, CalendarDays, CheckCircle2, XCircle, Baby } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "react-i18next";

export default function ParentReports() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const { data: records, isLoading } = trpc.attendance.byChild.useQuery(
    { childId: parseInt(selectedChild || "0") },
    { enabled: !!selectedChild }
  );

  const stats = useMemo(() => {
    if (!records || records.length === 0) return null;
    const total = records.length;
    const present = records.filter((r: any) => r.status === "present" || r.status === "late" || r.status === "checked_in" || r.status === "checked_out").length;
    const absent = records.filter((r: any) => r.status === "absent" || r.status === "excused").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, rate };
  }, [records]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isAr ? "التقارير" : "Reports"}</h1>

      <Select value={selectedChild} onValueChange={setSelectedChild}>
        <SelectTrigger className="max-w-xs"><SelectValue placeholder={isAr ? "اختر الطفل" : "Select Child"} /></SelectTrigger>
        <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
      </Select>

      {selectedChild && (
        <>
          {/* Attendance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CalendarDays className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : stats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "إجمالي الأيام" : "Total Days"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : stats?.present ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "أيام الحضور" : "Attendance Days"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : stats?.absent ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "أيام الغياب" : "Absence Days"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "-" : `${stats?.rate ?? 0}%`}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "نسبة الحضور" : "Attendance Rate"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Progress */}
          {stats && (
            <Card>
              <CardHeader><CardTitle className="text-lg">{isAr ? "ملخص الحضور" : "Attendance Summary"}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{isAr ? "نسبة الحضور" : "Attendance Rate"}</span>
                      <span className="font-medium">{stats.rate}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${stats.rate}%` }} />
                    </div>
                  </div>
                  {stats.rate >= 90 ? (
                    <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{isAr ? "ممتاز! نسبة حضور عالية" : "Excellent! High Attendance Rate"}</p>
                  ) : stats.rate >= 75 ? (
                    <p className="text-sm text-amber-600">{isAr ? "نسبة حضور جيدة، يمكن تحسينها" : "Good Attendance Rate, Can Be Improved"}</p>
                  ) : (
                    <p className="text-sm text-red-600">{isAr ? "نسبة الحضور تحتاج لتحسين" : "Attendance Rate Needs Improvement"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Records */}
          <Card>
            <CardHeader><CardTitle className="text-lg">{isAr ? "آخر سجلات الحضور" : "Latest Attendance Records"}</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32 w-full" /> : records?.length === 0 ? (
                <EmptyState variant="attendance" compact />
              ) : (
                <div className="space-y-2">
                  {records?.slice(0, 15).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(r.date).toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <Badge className={
                        r.status === 'present' ? 'bg-green-100 text-green-700' :
                        r.status === 'absent' ? 'bg-red-100 text-red-700' :
                        r.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'excused' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'checked_out' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'
                      }>
                        {r.status === 'present' ? isAr ? 'حاضر' : 'Present' :
                         r.status === 'absent' ? isAr ? 'غائب' : 'Absent' :
                         r.status === 'late' ? isAr ? 'متأخر' : 'Late' :
                         r.status === 'excused' ? isAr ? 'غياب بعذر' : 'Excused Absence' :
                         r.status === 'checked_in' ? isAr ? 'تم التسجيل' : 'Registered' :
                         r.status === 'checked_out' ? isAr ? 'تم المغادرة' : 'Departed' : r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedChild && (
        <div className="text-center py-12">
          <Baby className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{isAr ? "اختر طفلاً لعرض التقارير" : "Select a child to view reports"}</p>
        </div>
      )}
    </div>
  );
}
