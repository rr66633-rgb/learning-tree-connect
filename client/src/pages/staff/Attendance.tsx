import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, LogIn, LogOut, Loader2, History, Edit } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";

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

export default function StaffAttendance() {
  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkInDialog, setCheckInDialog] = useState<{ childId: number; childName: string } | null>(null);
  const [checkOutDialog, setCheckOutDialog] = useState<{ id: number; childId: number; childName: string } | null>(null);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{ id: number; childId: number; childName: string; currentStatus: string; newStatus: string } | null>(null);
  const [auditLogDialog, setAuditLogDialog] = useState<{ childId: number; childName: string; attendanceId?: number } | null>(null);
  const [statusChangeNotes, setStatusChangeNotes] = useState("");
  const [droppedOffBy, setDroppedOffBy] = useState("");
  const [droppedOffRelationship, setDroppedOffRelationship] = useState<string>("");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [pickupRelationship, setPickupRelationship] = useState<string>("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [markAbsentConfirm, setMarkAbsentConfirm] = useState<{ childId: number; childName: string } | null>(null);

  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: records } = trpc.attendance.byDate.useQuery({ date: selectedDate });
  const { data: auditLogs } = trpc.attendance.auditLog.useQuery(
    { childId: auditLogDialog?.childId, attendanceId: auditLogDialog?.attendanceId },
    { enabled: !!auditLogDialog }
  );
  const utils = trpc.useUtils();

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الوصول"); setCheckInDialog(null); resetCheckInForm(); },
    onError: () => toast.error("حدث خطأ"),
  });
  const markAbsent = trpc.attendance.markAbsent.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الغياب"); },
    onError: () => toast.error("حدث خطأ"),
  });
  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل المغادرة"); setCheckOutDialog(null); resetCheckOutForm(); },
    onError: () => toast.error("حدث خطأ"),
  });
  const updateStatus = trpc.attendance.updateStatus.useMutation({
    onSuccess: (data) => {
      utils.attendance.byDate.invalidate();
      toast.success(`تم تغيير الحالة من "${STATUS_LABELS[data.previousStatus] || data.previousStatus}" إلى "${STATUS_LABELS[data.newStatus] || data.newStatus}"`);
      setStatusChangeDialog(null);
      setStatusChangeNotes("");
    },
    onError: () => toast.error("حدث خطأ في تغيير الحالة"),
  });

  function resetCheckInForm() { setDroppedOffBy(""); setDroppedOffRelationship(""); setCheckInNotes(""); }
  function resetCheckOutForm() { setPickedUpBy(""); setPickupRelationship(""); setCheckOutNotes(""); setSignatureData(""); }

  const attendanceMap = useMemo(() => {
    const map = new Map<number, any>();
    records?.forEach((r: any) => map.set(r.childId, r));
    return map;
  }, [records]);

  const currentlyInCenter = useMemo(() => {
    if (!records || !children) return [];
    return children.filter((child: any) => {
      const record = attendanceMap.get(child.id);
      return record && (record.status === 'present' || record.status === 'late' || record.status === 'checked_in') && !record.checkOutTime;
    });
  }, [children, records, attendanceMap]);

  function handleCheckInSubmit() {
    if (!checkInDialog) return;
    checkIn.mutate({
      childId: checkInDialog.childId,
      date: selectedDate,
      droppedOffBy: droppedOffBy || undefined,
      droppedOffRelationship: (droppedOffRelationship as any) || undefined,
      notes: checkInNotes || undefined,
    });
  }

  function handleCheckOutSubmit() {
    if (!checkOutDialog || !pickedUpBy || !pickupRelationship) {
      toast.error("يرجى تعبئة الحقول المطلوبة");
      return;
    }
    checkOut.mutate({
      id: checkOutDialog.id,
      childId: checkOutDialog.childId,
      pickedUpBy,
      relationship: pickupRelationship as any,
      signatureData: signatureData || undefined,
      notes: checkOutNotes || undefined,
    });
  }

  function handleStatusChangeConfirm() {
    if (!statusChangeDialog) return;
    updateStatus.mutate({
      id: statusChangeDialog.id,
      childId: statusChangeDialog.childId,
      newStatus: statusChangeDialog.newStatus as any,
      notes: statusChangeNotes || undefined,
    });
  }

  function openStatusChange(record: any, childName: string, newStatus: string) {
    setStatusChangeDialog({
      id: record.id,
      childId: record.childId,
      childName,
      currentStatus: record.status,
      newStatus,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">حضور الأطفال</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Currently in center */}
      {currentlyInCenter.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700">في المركز الآن ({currentlyInCenter.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentlyInCenter.map((child: any) => (
                <Badge key={child.id} variant="secondary" className="bg-emerald-100 text-emerald-800">
                  {child.firstName} {child.lastName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الطفل</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الوصول</TableHead>
                <TableHead className="text-right">المغادرة</TableHead>
                <TableHead className="text-right">تغيير الحالة</TableHead>
                <TableHead className="text-right">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              )) : children?.map((child: any) => {
                const record = attendanceMap.get(child.id);
                const childName = `${child.firstName} ${child.lastName}`;
                return (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {child.photo ? (
                          <img src={child.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {(child.firstName?.[0] || "")}{(child.lastName?.[0] || "")}
                          </div>
                        )}
                        <span>{childName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record ? (
                        <Badge className={STATUS_COLORS[record.status] || "bg-gray-100 text-gray-700"}>
                          {STATUS_LABELS[record.status] || record.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">لم يُسجل</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </TableCell>
                    <TableCell>
                      {record ? (
                        <div className="flex flex-wrap gap-1">
                          {record.status !== 'present' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-green-600 hover:bg-green-50" onClick={() => openStatusChange(record, childName, 'present')}>
                              حاضر
                            </Button>
                          )}
                          {record.status !== 'absent' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => openStatusChange(record, childName, 'absent')}>
                              غائب
                            </Button>
                          )}
                          {record.status !== 'late' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-600 hover:bg-amber-50" onClick={() => openStatusChange(record, childName, 'late')}>
                              متأخر
                            </Button>
                          )}
                          {record.status !== 'excused' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50" onClick={() => openStatusChange(record, childName, 'excused')}>
                              بعذر
                            </Button>
                          )}
                          {record.status !== 'checked_in' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => openStatusChange(record, childName, 'checked_in')}>
                              تسجيل
                            </Button>
                          )}
                          {record.status !== 'checked_out' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-600 hover:bg-gray-50" onClick={() => openStatusChange(record, childName, 'checked_out')}>
                              مغادرة
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-50" onClick={() => setAuditLogDialog({ childId: child.id, childName, attendanceId: record.id })}>
                            <History className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!record && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600 gap-1" onClick={() => setCheckInDialog({ childId: child.id, childName })}>
                              <LogIn className="h-3 w-3" /> وصول
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => setMarkAbsentConfirm({ childId: child.id, childName })} disabled={markAbsent.isPending}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {record && (record.status === 'present' || record.status === 'late' || record.status === 'checked_in') && !record.checkOutTime && (
                          <Button size="sm" variant="outline" className="text-orange-600 gap-1" onClick={() => setCheckOutDialog({ id: record.id, childId: child.id, childName })}>
                            <LogOut className="h-3 w-3" /> مغادرة
                          </Button>
                        )}
                        {record?.checkOutTime && (
                          <Badge variant="outline" className="text-muted-foreground">مكتمل</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mark Absent Confirmation Dialog */}
      <AlertDialog open={!!markAbsentConfirm} onOpenChange={(open) => { if (!open) setMarkAbsentConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الغياب</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد تسجيل <strong>{markAbsentConfirm?.childName}</strong> كغائب اليوم؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (markAbsentConfirm) {
                  markAbsent.mutate({ childId: markAbsentConfirm.childId, date: selectedDate, status: "absent" as const });
                  setMarkAbsentConfirm(null);
                }
              }}
            >
              تأكيد الغياب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={!!statusChangeDialog} onOpenChange={(open) => { if (!open) { setStatusChangeDialog(null); setStatusChangeNotes(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تغيير الحالة</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                هل تريد تغيير حالة <strong>{statusChangeDialog?.childName}</strong> من{" "}
                <Badge className={STATUS_COLORS[statusChangeDialog?.currentStatus || ""] || ""}>{STATUS_LABELS[statusChangeDialog?.currentStatus || ""] || statusChangeDialog?.currentStatus}</Badge>
                {" "}إلى{" "}
                <Badge className={STATUS_COLORS[statusChangeDialog?.newStatus || ""] || ""}>{STATUS_LABELS[statusChangeDialog?.newStatus || ""] || statusChangeDialog?.newStatus}</Badge>
                ؟
              </p>
              <div className="pt-2">
                <Label className="text-sm">ملاحظات (اختياري)</Label>
                <Textarea
                  value={statusChangeNotes}
                  onChange={e => setStatusChangeNotes(e.target.value)}
                  placeholder="سبب التغيير..."
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChangeConfirm} disabled={updateStatus.isPending}>
              {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد التغيير
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Log Dialog */}
      <Dialog open={!!auditLogDialog} onOpenChange={(open) => { if (!open) setAuditLogDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>سجل التغييرات - {auditLogDialog?.childName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {auditLogs && auditLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">من</TableHead>
                    <TableHead className="text-right">إلى</TableHead>
                    <TableHead className="text-right">بواسطة</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.createdAt).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{STATUS_LABELS[log.previousStatus] || log.previousStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${STATUS_COLORS[log.newStatus] || ""}`}>{STATUS_LABELS[log.newStatus] || log.newStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{log.changedByName || "-"}</TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">{log.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد تغييرات مسجلة</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditLogDialog(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-In Dialog */}
      <Dialog open={!!checkInDialog} onOpenChange={(open) => { if (!open) { setCheckInDialog(null); resetCheckInForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل وصول - {checkInDialog?.childName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>من أحضر الطفل</Label>
              <Input value={droppedOffBy} onChange={e => setDroppedOffBy(e.target.value)} placeholder="اسم الشخص" />
            </div>
            <div>
              <Label>صلة القرابة</Label>
              <Select value={droppedOffRelationship} onValueChange={setDroppedOffRelationship}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">الأم</SelectItem>
                  <SelectItem value="father">الأب</SelectItem>
                  <SelectItem value="driver">السائق</SelectItem>
                  <SelectItem value="grandparent">الجد/الجدة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={checkInNotes} onChange={e => setCheckInNotes(e.target.value)} placeholder="ملاحظات اختيارية..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCheckInDialog(null); resetCheckInForm(); }}>إلغاء</Button>
            <Button onClick={handleCheckInSubmit} disabled={checkIn.isPending}>
              {checkIn.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تسجيل الوصول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={!!checkOutDialog} onOpenChange={(open) => { if (!open) { setCheckOutDialog(null); resetCheckOutForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل مغادرة - {checkOutDialog?.childName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>من استلم الطفل <span className="text-red-500">*</span></Label>
              <Input value={pickedUpBy} onChange={e => setPickedUpBy(e.target.value)} placeholder="اسم المستلم" />
            </div>
            <div>
              <Label>صلة القرابة <span className="text-red-500">*</span></Label>
              <Select value={pickupRelationship} onValueChange={setPickupRelationship}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">الأم</SelectItem>
                  <SelectItem value="father">الأب</SelectItem>
                  <SelectItem value="driver">السائق</SelectItem>
                  <SelectItem value="grandparent">الجد/الجدة</SelectItem>
                  <SelectItem value="guardian">ولي الأمر</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={checkOutNotes} onChange={e => setCheckOutNotes(e.target.value)} placeholder="ملاحظات اختيارية..." />
            </div>
            <div>
              <Label>التوقيع الرقمي</Label>
              <SignaturePad value={signatureData} onChange={setSignatureData} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCheckOutDialog(null); resetCheckOutForm(); }}>إلغاء</Button>
            <Button onClick={handleCheckOutSubmit} disabled={checkOut.isPending || !pickedUpBy || !pickupRelationship}>
              {checkOut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تسجيل المغادرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL());
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={100}
        className="border rounded-md w-full cursor-crosshair bg-white touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={clear}>مسح</Button>
        {value && <span className="text-xs text-green-600">✓ تم التوقيع</span>}
      </div>
    </div>
  );
}
