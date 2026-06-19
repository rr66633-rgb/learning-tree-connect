import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, UserPlus, Users, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function StaffEnrollment() {
  const { data: enrollments, isLoading } = trpc.enrollment.list.useQuery();
  const { data: waitingList, isLoading: wlLoading } = trpc.waitingList.list.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();
  const utils = trpc.useUtils();

  // Enrollment form state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollChildId, setEnrollChildId] = useState("");
  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollStartDate, setEnrollStartDate] = useState("");

  // Waiting list form state
  const [wlOpen, setWlOpen] = useState(false);
  const [wlChildName, setWlChildName] = useState("");
  const [wlParentName, setWlParentName] = useState("");
  const [wlPhone, setWlPhone] = useState("");
  const [wlEmail, setWlEmail] = useState("");
  const [wlPreferredClass, setWlPreferredClass] = useState("");
  const [wlNotes, setWlNotes] = useState("");

  const createEnrollment = trpc.enrollment.create.useMutation({
    onSuccess: () => {
      utils.enrollment.list.invalidate();
      setEnrollOpen(false);
      setEnrollChildId(""); setEnrollClassId(""); setEnrollStartDate("");
      toast.success("تم تسجيل الطفل بنجاح");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateEnrollment = trpc.enrollment.update.useMutation({
    onSuccess: () => { utils.enrollment.list.invalidate(); toast.success("تم تحديث الحالة"); },
    onError: (e) => toast.error(e.message),
  });

  const createWaitingEntry = trpc.waitingList.create.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate();
      setWlOpen(false);
      setWlChildName(""); setWlParentName(""); setWlPhone(""); setWlEmail(""); setWlPreferredClass(""); setWlNotes("");
      toast.success("تمت الإضافة لقائمة الانتظار");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateWaiting = trpc.waitingList.update.useMutation({
    onSuccess: () => { utils.waitingList.list.invalidate(); toast.success("تم تحديث الحالة"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteWaiting = trpc.waitingList.delete.useMutation({
    onSuccess: () => { utils.waitingList.list.invalidate(); toast.success("تم الحذف"); },
    onError: (e) => toast.error(e.message),
  });

  const enrollmentStatusMap: Record<string, { label: string; color: string }> = {
    active: { label: "نشط", color: "bg-green-100 text-green-700" },
    pending: { label: "معلق", color: "bg-amber-100 text-amber-700" },
    withdrawn: { label: "منسحب", color: "bg-red-100 text-red-700" },
    graduated: { label: "تخرج", color: "bg-blue-100 text-blue-700" },
    completed: { label: "مكتمل", color: "bg-blue-100 text-blue-700" },
  };

  const waitingStatusMap: Record<string, { label: string; color: string }> = {
    waiting: { label: "بانتظار", color: "bg-amber-100 text-amber-700" },
    contacted: { label: "تم التواصل", color: "bg-blue-100 text-blue-700" },
    enrolled: { label: "تم التسجيل", color: "bg-green-100 text-green-700" },
    cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
    declined: { label: "رفض", color: "bg-red-100 text-red-700" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التسجيل وقائمة الانتظار</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{enrollments?.filter((e: any) => e.status === 'active').length ?? 0}</p>
              <p className="text-xs text-muted-foreground">مسجلون نشطون</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{waitingList?.filter((w: any) => w.status === 'waiting').length ?? 0}</p>
              <p className="text-xs text-muted-foreground">في قائمة الانتظار</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{enrollments?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">إجمالي التسجيلات</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="enrolled">
        <TabsList>
          <TabsTrigger value="enrolled">المسجلون</TabsTrigger>
          <TabsTrigger value="waiting">قائمة الانتظار ({waitingList?.filter((w: any) => w.status === 'waiting').length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />تسجيل طفل</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>تسجيل طفل جديد</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>الطفل</Label>
                    <Select value={enrollChildId} onValueChange={setEnrollChildId}>
                      <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                      <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الفصل</Label>
                    <Select value={enrollClassId} onValueChange={setEnrollClassId}>
                      <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                      <SelectContent>{classes?.map((cl: any) => <SelectItem key={cl.id} value={cl.id.toString()}>{cl.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>تاريخ البدء</Label>
                    <Input type="date" value={enrollStartDate} onChange={e => setEnrollStartDate(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createEnrollment.mutate({ childId: parseInt(enrollChildId), classId: enrollClassId ? parseInt(enrollClassId) : undefined, startDate: enrollStartDate })} disabled={!enrollChildId || !enrollStartDate || createEnrollment.isPending}>
                    {createEnrollment.isPending ? "جاري..." : "تسجيل"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطفل</TableHead>
                    <TableHead>الفصل</TableHead>
                    <TableHead>تاريخ البدء</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                  enrollments?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد تسجيلات</TableCell></TableRow> :
                  enrollments?.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.childName || `طفل #${e.childId}`}</TableCell>
                      <TableCell>{e.className || (e.classId ? `فصل #${e.classId}` : "-")}</TableCell>
                      <TableCell>{e.startDate ? new Date(e.startDate).toLocaleDateString('ar-SA') : "-"}</TableCell>
                      <TableCell>
                        <Badge className={enrollmentStatusMap[e.status]?.color || ""}>
                          {enrollmentStatusMap[e.status]?.label || e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={e.status} onValueChange={(val) => updateEnrollment.mutate({ id: e.id, status: val as any })}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">نشط</SelectItem>
                            <SelectItem value="pending">معلق</SelectItem>
                            <SelectItem value="withdrawn">منسحب</SelectItem>
                            <SelectItem value="graduated">تخرج</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waiting" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={wlOpen} onOpenChange={setWlOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />إضافة لقائمة الانتظار</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>إضافة لقائمة الانتظار</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>اسم الطفل</Label><Input value={wlChildName} onChange={e => setWlChildName(e.target.value)} placeholder="اسم الطفل" /></div>
                  <div><Label>اسم ولي الأمر</Label><Input value={wlParentName} onChange={e => setWlParentName(e.target.value)} placeholder="اسم ولي الأمر" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>رقم الهاتف</Label><Input value={wlPhone} onChange={e => setWlPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" /></div>
                    <div><Label>البريد الإلكتروني</Label><Input value={wlEmail} onChange={e => setWlEmail(e.target.value)} placeholder="email@example.com" dir="ltr" /></div>
                  </div>
                  <div><Label>الفصل المفضل</Label><Input value={wlPreferredClass} onChange={e => setWlPreferredClass(e.target.value)} placeholder="مثال: الروضة الأولى" /></div>
                  <div><Label>ملاحظات</Label><Textarea value={wlNotes} onChange={e => setWlNotes(e.target.value)} rows={2} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createWaitingEntry.mutate({ childName: wlChildName, parentName: wlParentName, parentPhone: wlPhone, parentEmail: wlEmail || undefined, preferredClass: wlPreferredClass || undefined, notes: wlNotes || undefined })} disabled={!wlChildName || !wlParentName || !wlPhone || createWaitingEntry.isPending}>
                    {createWaitingEntry.isPending ? "جاري..." : "إضافة"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الطفل</TableHead>
                    <TableHead>ولي الأمر</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الفصل المفضل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wlLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                  waitingList?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">قائمة الانتظار فارغة</TableCell></TableRow> :
                  waitingList?.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.childName}</TableCell>
                      <TableCell>{w.parentName}</TableCell>
                      <TableCell dir="ltr">{w.phone || w.parentPhone}</TableCell>
                      <TableCell>{w.preferredClass || "-"}</TableCell>
                      <TableCell>
                        <Badge className={waitingStatusMap[w.status]?.color || ""}>
                          {waitingStatusMap[w.status]?.label || w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select value={w.status} onValueChange={(val) => updateWaiting.mutate({ id: w.id, status: val as any })}>
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="waiting">بانتظار</SelectItem>
                              <SelectItem value="contacted">تم التواصل</SelectItem>
                              <SelectItem value="enrolled">تم التسجيل</SelectItem>
                              <SelectItem value="declined">رفض</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteWaiting.mutate({ id: w.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
