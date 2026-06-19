import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, LogIn, LogOut, Loader2 } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";

export default function StaffAttendance() {
  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkInDialog, setCheckInDialog] = useState<{ childId: number; childName: string } | null>(null);
  const [checkOutDialog, setCheckOutDialog] = useState<{ id: number; childId: number; childName: string } | null>(null);
  const [droppedOffBy, setDroppedOffBy] = useState("");
  const [droppedOffRelationship, setDroppedOffRelationship] = useState<string>("");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [pickupRelationship, setPickupRelationship] = useState<string>("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [signatureData, setSignatureData] = useState("");

  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: records } = trpc.attendance.byDate.useQuery({ date: selectedDate });
  const utils = trpc.useUtils();

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الوصول"); setCheckInDialog(null); resetCheckInForm(); },
    onError: () => toast.error("حدث خطأ"),
  });
  const markAbsent = trpc.attendance.markAbsent.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الغياب"); },
  });
  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل المغادرة"); setCheckOutDialog(null); resetCheckOutForm(); },
    onError: () => toast.error("حدث خطأ"),
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
      return record && (record.status === 'present' || record.status === 'late') && !record.checkOutTime;
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
                <TableHead className="text-right">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              )) : children?.map((child: any) => {
                const record = attendanceMap.get(child.id);
                return (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                    <TableCell>
                      {record?.status === "present" ? <Badge className="bg-green-100 text-green-700">حاضر</Badge> :
                       record?.status === "absent" ? <Badge variant="destructive">غائب</Badge> :
                       record?.status === "late" ? <Badge className="bg-amber-100 text-amber-700">متأخر</Badge> :
                       <Badge variant="secondary">لم يُسجل</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!record && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600 gap-1" onClick={() => setCheckInDialog({ childId: child.id, childName: `${child.firstName} ${child.lastName}` })}>
                              <LogIn className="h-3 w-3" /> وصول
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => markAbsent.mutate({ childId: child.id, date: selectedDate, status: "absent" as const })} disabled={markAbsent.isPending}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {record && (record.status === 'present' || record.status === 'late') && !record.checkOutTime && (
                          <Button size="sm" variant="outline" className="text-orange-600 gap-1" onClick={() => setCheckOutDialog({ id: record.id, childId: child.id, childName: `${child.firstName} ${child.lastName}` })}>
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
