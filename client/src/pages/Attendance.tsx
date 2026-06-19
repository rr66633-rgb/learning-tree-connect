import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, UserCheck, UserX, Clock, Loader2, LogIn, LogOut } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkInDialog, setCheckInDialog] = useState<{ childId: number; childName: string } | null>(null);
  const [checkOutDialog, setCheckOutDialog] = useState<{ id: number; childId: number; childName: string } | null>(null);
  const [droppedOffBy, setDroppedOffBy] = useState("");
  const [droppedOffRelationship, setDroppedOffRelationship] = useState<string>("");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [pickupRelationship, setPickupRelationship] = useState<string>("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [signatureData, setSignatureData] = useState("");

  const { data: children, isLoading: childrenLoading } = trpc.children.list.useQuery();
  const { data: attendanceRecords, isLoading: attendanceLoading } = trpc.attendance.byDate.useQuery({ date: selectedDate });
  const utils = trpc.useUtils();

  const isLoading = childrenLoading || attendanceLoading;

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الوصول بنجاح"); setCheckInDialog(null); resetCheckInForm(); },
    onError: () => toast.error("حدث خطأ في تسجيل الوصول"),
  });
  const markAbsent = trpc.attendance.markAbsent.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الغياب"); },
  });
  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل المغادرة بنجاح"); setCheckOutDialog(null); resetCheckOutForm(); },
    onError: () => toast.error("حدث خطأ في تسجيل المغادرة"),
  });

  function resetCheckInForm() {
    setDroppedOffBy("");
    setDroppedOffRelationship("");
    setCheckInNotes("");
  }

  function resetCheckOutForm() {
    setPickedUpBy("");
    setPickupRelationship("");
    setCheckOutNotes("");
    setSignatureData("");
  }

  const attendanceMap = useMemo(() => {
    const map = new Map<number, any>();
    attendanceRecords?.forEach(r => map.set(r.childId, r));
    return map;
  }, [attendanceRecords]);

  const stats = useMemo(() => {
    const total = children?.length ?? 0;
    const present = attendanceRecords?.filter(r => r.status === 'present').length ?? 0;
    const absent = attendanceRecords?.filter(r => r.status === 'absent' || r.status === 'excused').length ?? 0;
    const late = attendanceRecords?.filter(r => r.status === 'late').length ?? 0;
    return { total, present, absent, late, notMarked: total - present - absent - late };
  }, [children, attendanceRecords]);

  const currentlyInCenter = useMemo(() => {
    if (!attendanceRecords || !children) return [];
    return children.filter(child => {
      const record = attendanceMap.get(child.id);
      return record && (record.status === 'present' || record.status === 'late') && !record.checkOutTime;
    });
  }, [children, attendanceRecords, attendanceMap]);

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
      toast.error("يرجى تعبئة جميع الحقول المطلوبة");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الحضور والانصراف</h1>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">الإجمالي</p>
              <p className="text-xl font-bold">{isLoading ? <span className="bg-accent animate-pulse rounded-md h-6 w-8 inline-block" /> : stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">حاضر</p>
              <p className="text-xl font-bold text-green-600">{isLoading ? <span className="bg-accent animate-pulse rounded-md h-6 w-8 inline-block" /> : stats.present}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">غائب</p>
              <p className="text-xl font-bold text-red-600">{isLoading ? <span className="bg-accent animate-pulse rounded-md h-6 w-8 inline-block" /> : stats.absent}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-muted-foreground">لم يُسجل</p>
              <p className="text-xl font-bold text-amber-600">{isLoading ? <span className="bg-accent animate-pulse rounded-md h-6 w-8 inline-block" /> : stats.notMarked}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <LogIn className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-emerald-700">في المركز الآن</p>
              <p className="text-xl font-bold text-emerald-700">{isLoading ? <span className="bg-accent animate-pulse rounded-md h-6 w-8 inline-block" /> : currentlyInCenter.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently in center list */}
      {currentlyInCenter.length > 0 && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-700">الأطفال المتواجدون حالياً في المركز ({currentlyInCenter.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentlyInCenter.map(child => (
                <Badge key={child.id} variant="secondary" className="bg-emerald-100 text-emerald-800 px-3 py-1">
                  {child.firstName} {child.lastName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            سجل الحضور - {new Date(selectedDate).toLocaleDateString('ar-SA')}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الطفل</TableHead>
                  <TableHead className="text-right">الفصل</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">وقت الوصول</TableHead>
                  <TableHead className="text-right">وقت المغادرة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children?.map(child => {
                  const record = attendanceMap.get(child.id);
                  return (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                      <TableCell>{child.classId ? `فصل ${child.classId}` : "-"}</TableCell>
                      <TableCell>
                        {record ? (
                          <Badge variant={record.status === 'present' || record.status === 'late' ? 'default' : 'destructive'}>
                            {record.status === 'present' ? 'حاضر' : record.status === 'late' ? 'متأخر' : record.status === 'excused' ? 'معذور' : 'غائب'}
                          </Badge>
                        ) : <Badge variant="secondary">لم يُسجل</Badge>}
                      </TableCell>
                      <TableCell>{record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                      <TableCell>{record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!record && (
                            <>
                              <Button size="sm" variant="default" className="gap-1" onClick={() => setCheckInDialog({ childId: child.id, childName: `${child.firstName} ${child.lastName}` })}>
                                <LogIn className="h-3 w-3" /> تسجيل وصول
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => markAbsent.mutate({ childId: child.id, date: selectedDate, status: "absent" })} disabled={markAbsent.isPending}>غياب</Button>
                            </>
                          )}
                          {record && (record.status === 'present' || record.status === 'late') && !record.checkOutTime && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setCheckOutDialog({ id: record.id, childId: child.id, childName: `${child.firstName} ${child.lastName}` })}>
                              <LogOut className="h-3 w-3" /> تسجيل مغادرة
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
                {(!children || children.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا يوجد أطفال مسجلين</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                <SelectTrigger><SelectValue placeholder="اختر صلة القرابة" /></SelectTrigger>
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
              <Label>ملاحظات (اختياري)</Label>
              <Textarea value={checkInNotes} onChange={e => setCheckInNotes(e.target.value)} placeholder="أي ملاحظات عن حالة الطفل..." />
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
                <SelectTrigger><SelectValue placeholder="اختر صلة القرابة" /></SelectTrigger>
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
              <Label>ملاحظات (اختياري)</Label>
              <Textarea value={checkOutNotes} onChange={e => setCheckOutNotes(e.target.value)} placeholder="أي ملاحظات..." />
            </div>
            <div>
              <Label>التوقيع الرقمي (اختياري)</Label>
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

// Signature Pad Component
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
    if (canvas) {
      onChange(canvas.toDataURL());
    }
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
        width={350}
        height={120}
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
        <Button type="button" variant="ghost" size="sm" onClick={clear}>مسح التوقيع</Button>
        {value && <span className="text-xs text-green-600">✓ تم التوقيع</span>}
      </div>
    </div>
  );
}
