import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Clock, LogIn, LogOut, CheckCircle2, AlertCircle, UserX, UserCheck, Timer, AlertTriangle } from "lucide-react";

export default function StaffStaffAttendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "principal";
  const today = new Date().toISOString().split("T")[0];

  const { data: todayAttendance, isLoading: todayLoading } = trpc.staffAttendance.today.useQuery();
  const { data: records, isLoading } = isAdmin
    ? trpc.staffAttendance.byDate.useQuery({ date: today })
    : trpc.staffAttendance.myHistory.useQuery();

  const utils = trpc.useUtils();
  const [gpsLoading, setGpsLoading] = useState(false);

  // Late record dialog state
  const [lateDialog, setLateDialog] = useState(false);
  const [lateType, setLateType] = useState<"checkIn" | "checkOut">("checkIn");
  const [lateTime, setLateTime] = useState("");
  const [lateReason, setLateReason] = useState("");

  // Admin check-out dialog state
  const [adminCheckOutDialog, setAdminCheckOutDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [adminCheckOutTime, setAdminCheckOutTime] = useState("");
  const [adminCheckOutNotes, setAdminCheckOutNotes] = useState("");

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

  // Quick check-in (no GPS)
  const quickCheckIn = trpc.staffAttendance.quickCheckIn.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الوصول بنجاح ✓");
      utils.staffAttendance.today.invalidate();
      utils.staffAttendance.myHistory.invalidate();
      if (isAdmin) utils.staffAttendance.byDate.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Quick check-out (no GPS)
  const quickCheckOut = trpc.staffAttendance.quickCheckOut.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الانصراف بنجاح ✓");
      utils.staffAttendance.today.invalidate();
      utils.staffAttendance.myHistory.invalidate();
      if (isAdmin) utils.staffAttendance.byDate.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Late check-in
  const lateCheckIn = trpc.staffAttendance.lateCheckIn.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الوصول المتأخر بنجاح");
      utils.staffAttendance.today.invalidate();
      utils.staffAttendance.myHistory.invalidate();
      if (isAdmin) utils.staffAttendance.byDate.invalidate();
      setLateDialog(false);
      setLateTime("");
      setLateReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  // Late check-out
  const lateCheckOut = trpc.staffAttendance.lateCheckOut.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الانصراف المتأخر بنجاح");
      utils.staffAttendance.today.invalidate();
      utils.staffAttendance.myHistory.invalidate();
      if (isAdmin) utils.staffAttendance.byDate.invalidate();
      setLateDialog(false);
      setLateTime("");
      setLateReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const adminCheckOut = trpc.staffAttendance.adminCheckOut.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل انصراف الموظف بنجاح");
      utils.staffAttendance.byDate.invalidate();
      setAdminCheckOutDialog(false);
      setSelectedRecord(null);
      setAdminCheckOutTime("");
      setAdminCheckOutNotes("");
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

  // Quick check-in handler (no GPS)
  const handleQuickCheckIn = () => {
    quickCheckIn.mutate({ device: navigator.userAgent.slice(0, 100) });
  };

  // Quick check-out handler (no GPS)
  const handleQuickCheckOut = () => {
    quickCheckOut.mutate({ device: navigator.userAgent.slice(0, 100) });
  };

  // Open late dialog
  const openLateDialog = (type: "checkIn" | "checkOut") => {
    setLateType(type);
    // Default to current time
    const now = new Date();
    setLateTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setLateReason("");
    setLateDialog(true);
  };

  // Submit late record
  const submitLateRecord = () => {
    if (!lateTime || !lateReason.trim()) {
      toast.error("يرجى تحديد الوقت وكتابة السبب");
      return;
    }
    // Build full datetime from today + time
    const todayDate = new Date();
    const [hours, minutes] = lateTime.split(':').map(Number);
    todayDate.setHours(hours, minutes, 0, 0);
    const actualTimeISO = todayDate.toISOString();

    if (lateType === "checkIn") {
      lateCheckIn.mutate({
        actualTime: actualTimeISO,
        reason: lateReason.trim(),
        device: navigator.userAgent.slice(0, 100),
      });
    } else {
      lateCheckOut.mutate({
        actualTime: actualTimeISO,
        reason: lateReason.trim(),
        device: navigator.userAgent.slice(0, 100),
      });
    }
  };

  const handleAdminCheckOut = (record: any) => {
    setSelectedRecord(record);
    const now = new Date();
    setAdminCheckOutTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setAdminCheckOutNotes("");
    setAdminCheckOutDialog(true);
  };

  const confirmAdminCheckOut = () => {
    if (!selectedRecord) return;
    let checkOutTimeStr: string | undefined;
    if (adminCheckOutTime) {
      const recordDate = selectedRecord.date ? new Date(selectedRecord.date) : new Date();
      const [hours, minutes] = adminCheckOutTime.split(':').map(Number);
      recordDate.setHours(hours, minutes, 0, 0);
      checkOutTimeStr = recordDate.toISOString();
    }
    adminCheckOut.mutate({
      id: selectedRecord.id,
      checkOutTime: checkOutTimeStr,
      notes: adminCheckOutNotes || undefined,
    });
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
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">سجل حضور الموظفين</h1>
            <p className="text-sm text-muted-foreground">تسجيل الحضور والانصراف</p>
          </div>
        </div>
      </div>

      {/* ============ QUICK CHECK-IN / CHECK-OUT CARD ============ */}
      <Card className="border-2 border-primary/30 bg-gradient-to-l from-primary/5 via-primary/3 to-transparent shadow-lg">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-center text-center gap-5">
            {/* Status indicator */}
            <div className="flex items-center gap-3">
              {todayLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : todayAttendance?.checkInTime && todayAttendance?.checkOutTime ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">تم تسجيل اليوم بالكامل</span>
                </div>
              ) : todayAttendance?.checkInTime ? (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">
                    وقت الوصول: {new Date(todayAttendance.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    {(todayAttendance as any).isLateRecord && (
                      <Badge className="bg-amber-100 text-amber-700 mr-2 text-[10px]">تسجيل متأخر</Badge>
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                  <AlertCircle className="h-5 w-5" />
                  <span>لم يتم تسجيل الحضور بعد اليوم</span>
                </div>
              )}
            </div>

            {/* Main action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
              {!todayAttendance?.checkInTime ? (
                <>
                  <Button
                    onClick={handleQuickCheckIn}
                    disabled={quickCheckIn.isPending}
                    size="lg"
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.97] gap-3"
                  >
                    <LogIn className="h-6 w-6" />
                    {quickCheckIn.isPending ? "جاري التسجيل..." : "تسجيل وصول"}
                  </Button>
                  <Button
                    onClick={() => openLateDialog("checkIn")}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-50 px-6 py-6 rounded-xl gap-2"
                  >
                    <Timer className="h-5 w-5" />
                    تسجيل متأخر
                  </Button>
                </>
              ) : !todayAttendance?.checkOutTime ? (
                <>
                  <Button
                    onClick={handleQuickCheckOut}
                    disabled={quickCheckOut.isPending}
                    size="lg"
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.97] gap-3"
                  >
                    <LogOut className="h-6 w-6" />
                    {quickCheckOut.isPending ? "جاري التسجيل..." : "تسجيل انصراف"}
                  </Button>
                  <Button
                    onClick={() => openLateDialog("checkOut")}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-50 px-6 py-6 rounded-xl gap-2"
                  >
                    <Timer className="h-5 w-5" />
                    تسجيل متأخر
                  </Button>
                </>
              ) : null}
            </div>

            {/* GPS check-in option (secondary) */}
            {!todayAttendance?.checkInTime && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleCheckIn}
                  disabled={gpsLoading || checkIn.isPending}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary gap-1 text-xs"
                >
                  <MapPin className="h-3 w-3" />
                  {gpsLoading || checkIn.isPending ? "جاري التحديد..." : "تسجيل بالموقع الجغرافي (GPS)"}
                </Button>
              </div>
            )}
            {todayAttendance?.checkInTime && !todayAttendance?.checkOutTime && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleCheckOut}
                  disabled={gpsLoading || checkOut.isPending}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary gap-1 text-xs"
                >
                  <MapPin className="h-3 w-3" />
                  {gpsLoading || checkOut.isPending ? "جاري التحديد..." : "انصراف بالموقع الجغرافي (GPS)"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? `سجلات اليوم - ${new Date().toLocaleDateString('ar-SA')}` : "سجل حضوري"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>الموظف</TableHead>}
                  <TableHead>التاريخ</TableHead>
                  <TableHead>وقت الحضور</TableHead>
                  <TableHead>وقت الانصراف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  {isAdmin && <TableHead>إجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={isAdmin ? 7 : 6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : !records || (records as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
                ) : (records as any[]).map((r: any) => (
                  <TableRow key={r.id} className={r.isLateRecord ? "bg-amber-50/50" : ""}>
                    {isAdmin && <TableCell className="font-medium">{r.userName || "-"}</TableCell>}
                    <TableCell>{r.date ? new Date(r.date).toLocaleDateString('ar-SA') : r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('ar-SA') : "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                        {r.isLateRecord && r.actualCheckInTime && (
                          <span className="text-[10px] text-amber-600">
                            الوقت الفعلي: {new Date(r.actualCheckInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                        {r.isLateRecord && r.actualCheckOutTime && (
                          <span className="text-[10px] text-amber-600">
                            الوقت الفعلي: {new Date(r.actualCheckOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(r.status)}
                        {r.isLateRecord && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            متأخر
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {r.isLateRecord && r.lateReason ? (
                        <span className="text-xs text-amber-700 line-clamp-2">{r.lateReason}</span>
                      ) : r.notes ? (
                        <span className="text-xs text-muted-foreground line-clamp-2">{r.notes}</span>
                      ) : "-"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {r.status === "checked_in" && !r.checkOutTime && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-600 hover:bg-orange-50 gap-1 text-xs"
                            onClick={() => handleAdminCheckOut(r)}
                          >
                            <UserX className="h-3 w-3" />
                            تسجيل خروج
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ============ LATE RECORD DIALOG ============ */}
      <Dialog open={lateDialog} onOpenChange={setLateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-600" />
              {lateType === "checkIn" ? "تسجيل وصول متأخر" : "تسجيل انصراف متأخر"}
            </DialogTitle>
            <DialogDescription>
              {lateType === "checkIn"
                ? "حدد وقت وصولك الفعلي واكتب سبب التأخر في التسجيل"
                : "حدد وقت انصرافك الفعلي واكتب سبب التأخر في التسجيل"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="late-time">
                {lateType === "checkIn" ? "وقت الوصول الفعلي" : "وقت الانصراف الفعلي"}
              </Label>
              <Input
                id="late-time"
                type="time"
                value={lateTime}
                onChange={(e) => setLateTime(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="late-reason">سبب التسجيل المتأخر <span className="text-red-500">*</span></Label>
              <Textarea
                id="late-reason"
                placeholder="مثال: وصلت ونسيت أسجل..."
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                className="text-right"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">هذا السبب سيظهر للإدارة</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLateDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={submitLateRecord}
              disabled={lateCheckIn.isPending || lateCheckOut.isPending || !lateReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 gap-2"
            >
              <Timer className="h-4 w-4" />
              {(lateCheckIn.isPending || lateCheckOut.isPending) ? "جاري التسجيل..." : "تأكيد التسجيل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Check-Out Dialog */}
      <Dialog open={adminCheckOutDialog} onOpenChange={setAdminCheckOutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل خروج يدوي</DialogTitle>
            <DialogDescription>
              تسجيل انصراف الموظف {selectedRecord?.userName || ""} الذي نسي تسجيل خروجه
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checkout-time">وقت الانصراف</Label>
              <Input
                id="checkout-time"
                type="time"
                value={adminCheckOutTime}
                onChange={(e) => setAdminCheckOutTime(e.target.value)}
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">اترك الوقت الافتراضي أو عدّله لوقت الانصراف الفعلي</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="checkout-notes"
                placeholder="مثال: نسي الموظف تسجيل الخروج"
                value={adminCheckOutNotes}
                onChange={(e) => setAdminCheckOutNotes(e.target.value)}
                className="text-right"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAdminCheckOutDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={confirmAdminCheckOut}
              disabled={adminCheckOut.isPending}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
            >
              <LogOut className="h-4 w-4" />
              {adminCheckOut.isPending ? "جاري التسجيل..." : "تأكيد الخروج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
