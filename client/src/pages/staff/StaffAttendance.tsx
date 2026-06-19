import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Clock, LogIn, LogOut, CheckCircle2, AlertCircle } from "lucide-react";

export default function StaffStaffAttendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const today = new Date().toISOString().split("T")[0];

  const { data: todayAttendance, isLoading: todayLoading } = trpc.staffAttendance.today.useQuery();
  const { data: records, isLoading } = isAdmin
    ? trpc.staffAttendance.byDate.useQuery({ date: today })
    : trpc.staffAttendance.myHistory.useQuery();

  const utils = trpc.useUtils();
  const [gpsLoading, setGpsLoading] = useState(false);

  const checkIn = trpc.staffAttendance.checkIn.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الحضور بنجاح");
      utils.staffAttendance.today.invalidate();
      utils.staffAttendance.myHistory.invalidate();
      if (isAdmin) utils.staffAttendance.byDate.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const checkOut = trpc.staffAttendance.checkOut.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الانصراف بنجاح");
      utils.staffAttendance.today.invalidate();
      utils.staffAttendance.myHistory.invalidate();
      if (isAdmin) utils.staffAttendance.byDate.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCheckIn = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم خدمات الموقع");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        checkIn.mutate({
          gpsLat: pos.coords.latitude,
          gpsLng: pos.coords.longitude,
          device: navigator.userAgent.slice(0, 100),
        });
        setGpsLoading(false);
      },
      () => {
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
      () => {
        toast.error("لا يمكن تحديد موقعك. يرجى تفعيل خدمات الموقع.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in": return <Badge className="bg-blue-100 text-blue-700">حاضر</Badge>;
      case "checked_out": return <Badge className="bg-green-100 text-green-700">انصرف</Badge>;
      case "late": return <Badge className="bg-amber-100 text-amber-700">متأخر</Badge>;
      case "absent": return <Badge className="bg-red-100 text-red-700">غائب</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">سجل حضور الموظفين</h1>
      </div>

      {/* GPS Check-in/Check-out Card */}
      <Card className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">تسجيل الحضور بالموقع</h3>
                {todayLoading ? (
                  <Skeleton className="h-4 w-48 mt-1" />
                ) : todayAttendance?.checkInTime ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <Clock className="inline h-3 w-3 ml-1" />
                      وقت الحضور: {new Date(todayAttendance.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {todayAttendance.checkOutTime && (
                      <p className="text-sm text-muted-foreground">
                        <Clock className="inline h-3 w-3 ml-1" />
                        وقت الانصراف: {new Date(todayAttendance.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">لم يتم تسجيل الحضور بعد اليوم</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {!todayAttendance?.checkInTime ? (
                <Button
                  onClick={handleCheckIn}
                  disabled={gpsLoading || checkIn.isPending}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  {gpsLoading || checkIn.isPending ? "جاري التحديد..." : "تسجيل حضور"}
                </Button>
              ) : !todayAttendance?.checkOutTime ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={gpsLoading || checkOut.isPending}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {gpsLoading || checkOut.isPending ? "جاري التحديد..." : "تسجيل انصراف"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">تم تسجيل اليوم بالكامل</span>
                </div>
              )}
            </div>
          </div>

          {/* GPS info note */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              يتم تسجيل الحضور والانصراف باستخدام الموقع الجغرافي (GPS). يجب أن تكون داخل نطاق المركز المحدد. تأكد من تفعيل خدمات الموقع في جهازك.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? `سجلات اليوم - ${new Date().toLocaleDateString('ar-SA')}` : "سجل حضوري"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && <TableHead>الموظف</TableHead>}
                <TableHead>التاريخ</TableHead>
                <TableHead>وقت الحضور</TableHead>
                <TableHead>وقت الانصراف</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={isAdmin ? 5 : 4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              )) : !records || (records as any[]).length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
              ) : (records as any[]).map((r: any) => (
                <TableRow key={r.id}>
                  {isAdmin && <TableCell className="font-medium">{r.userName || "-"}</TableCell>}
                  <TableCell>{r.date ? new Date(r.date).toLocaleDateString('ar-SA') : r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('ar-SA') : "-"}</TableCell>
                  <TableCell>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                  <TableCell>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                  <TableCell>{getStatusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
