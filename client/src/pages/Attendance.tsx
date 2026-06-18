import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, UserCheck, UserX, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const { data: children } = trpc.children.list.useQuery();
  const { data: attendanceRecords, isLoading } = trpc.attendance.byDate.useQuery({ date: selectedDate });
  const utils = trpc.useUtils();

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الحضور"); },
    onError: () => toast.error("حدث خطأ"),
  });
  const markAbsent = trpc.attendance.markAbsent.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الغياب"); },
  });
  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الانصراف"); },
  });

  const attendanceMap = useMemo(() => {
    const map = new Map<number, any>();
    attendanceRecords?.forEach(r => map.set(r.childId, r));
    return map;
  }, [attendanceRecords]);

  const stats = useMemo(() => {
    const total = children?.length ?? 0;
    const present = attendanceRecords?.filter(r => r.status === 'present').length ?? 0;
    const absent = attendanceRecords?.filter(r => r.status === 'absent' || r.status === 'excused').length ?? 0;
    return { total, present, absent, notMarked: total - present - absent };
  }, [children, attendanceRecords]);

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold">الحضور والانصراف</h1><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الحضور والانصراف</h1>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><CalendarCheck className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">الإجمالي</p><p className="text-xl font-bold">{stats.total}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><UserCheck className="h-8 w-8 text-green-600" /><div><p className="text-sm text-muted-foreground">حاضر</p><p className="text-xl font-bold text-green-600">{stats.present}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><UserX className="h-8 w-8 text-red-600" /><div><p className="text-sm text-muted-foreground">غائب</p><p className="text-xl font-bold text-red-600">{stats.absent}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-amber-600" /><div><p className="text-sm text-muted-foreground">لم يُسجل</p><p className="text-xl font-bold text-amber-600">{stats.notMarked}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>قائمة الحضور - {new Date(selectedDate).toLocaleDateString('ar-SA')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الطفل</TableHead>
                <TableHead className="text-right">الفصل</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">وقت الحضور</TableHead>
                <TableHead className="text-right">وقت الانصراف</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {children?.map(child => {
                const record = attendanceMap.get(child.id);
                return (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                    <TableCell>{child.className || "-"}</TableCell>
                    <TableCell>
                      {record ? (
                        <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                          {record.status === 'present' ? 'حاضر' : record.status === 'excused' ? 'معذور' : 'غائب'}
                        </Badge>
                      ) : <Badge variant="secondary">لم يُسجل</Badge>}
                    </TableCell>
                    <TableCell>{record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                    <TableCell>{record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!record && (
                          <>
                            <Button size="sm" variant="default" onClick={() => checkIn.mutate({ childId: child.id, date: selectedDate })}>حضور</Button>
                            <Button size="sm" variant="destructive" onClick={() => markAbsent.mutate({ childId: child.id, date: selectedDate, status: "absent" })}>غياب</Button>
                          </>
                        )}
                        {record && record.status === 'present' && !record.checkOutTime && (
                          <Button size="sm" variant="outline" onClick={() => checkOut.mutate({ id: record.id })}>انصراف</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!children || children.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا يوجد أطفال مسجلين</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
