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
import { useTranslation } from "react-i18next";

export default function StaffEnrollment() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
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
      toast.success(isAr ? "تم تسجيل الطفل بنجاح" : "Child enrolled successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateEnrollment = trpc.enrollment.update.useMutation({
    onSuccess: () => { utils.enrollment.list.invalidate(); toast.success(isAr ? "تم تحديث الحالة" : "Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const createWaitingEntry = trpc.waitingList.create.useMutation({
    onSuccess: () => {
      utils.waitingList.list.invalidate();
      setWlOpen(false);
      setWlChildName(""); setWlParentName(""); setWlPhone(""); setWlEmail(""); setWlPreferredClass(""); setWlNotes("");
      toast.success(isAr ? "تمت الإضافة لقائمة الانتظار" : "Added to waiting list");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateWaiting = trpc.waitingList.update.useMutation({
    onSuccess: () => { utils.waitingList.list.invalidate(); toast.success(isAr ? "تم تحديث الحالة" : "Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteWaiting = trpc.waitingList.delete.useMutation({
    onSuccess: () => { utils.waitingList.list.invalidate(); toast.success(isAr ? "تم الحذف" : "Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const enrollmentStatusMap: Record<string, { label: string; color: string }> = {
    active: { label: isAr ? "نشط" : "Active", color: "bg-green-100 text-green-700" },
    pending: { label: isAr ? "معلق" : "Pending", color: "bg-amber-100 text-amber-700" },
    withdrawn: { label: isAr ? "منسحب" : "Withdrawn", color: "bg-red-100 text-red-700" },
    graduated: { label: isAr ? "تخرج" : "Graduated", color: "bg-blue-100 text-blue-700" },
    completed: { label: isAr ? "مكتمل" : "Completed", color: "bg-blue-100 text-blue-700" },
  };

  const waitingStatusMap: Record<string, { label: string; color: string }> = {
    waiting: { label: isAr ? "بانتظار" : "Waiting", color: "bg-amber-100 text-amber-700" },
    contacted: { label: isAr ? "تم التواصل" : "Contacted", color: "bg-blue-100 text-blue-700" },
    enrolled: { label: isAr ? "تم التسجيل" : "Enrolled", color: "bg-green-100 text-green-700" },
    cancelled: { label: isAr ? "ملغي" : "Cancelled", color: "bg-red-100 text-red-700" },
    declined: { label: isAr ? "رفض" : "Declined", color: "bg-red-100 text-red-700" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isAr ? "التسجيل وقائمة الانتظار" : "Enrollment & Waiting List"}</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{enrollments?.filter((e: any) => e.status === 'active').length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{isAr ? "مسجلون نشطون" : "Active Enrollments"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{waitingList?.filter((w: any) => w.status === 'waiting').length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{isAr ? "في قائمة الانتظار" : "On Waiting List"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{enrollments?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{isAr ? "إجمالي التسجيلات" : "Total Enrollments"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="enrolled">
        <TabsList>
          <TabsTrigger value="enrolled">{isAr ? "المسجلون" : "Enrolled"}</TabsTrigger>
          <TabsTrigger value="waiting">{isAr ? "قائمة الانتظار" : "Waiting List"} ({waitingList?.filter((w: any) => w.status === 'waiting').length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />{isAr ? "تسجيل طفل" : "Enroll Child"}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isAr ? "تسجيل طفل جديد" : "Enroll New Child"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{isAr ? "الطفل" : "Child"}</Label>
                    <Select value={enrollChildId} onValueChange={setEnrollChildId}>
                      <SelectTrigger><SelectValue placeholder={isAr ? "اختر الطفل" : "Select child"} /></SelectTrigger>
                      <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{isAr ? "الفصل" : "Class"}</Label>
                    <Select value={enrollClassId} onValueChange={setEnrollClassId}>
                      <SelectTrigger><SelectValue placeholder={isAr ? "اختر الفصل" : "Select class"} /></SelectTrigger>
                      <SelectContent>{classes?.map((cl: any) => <SelectItem key={cl.id} value={cl.id.toString()}>{cl.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{isAr ? "تاريخ البدء" : "Start Date"}</Label>
                    <Input type="date" value={enrollStartDate} onChange={e => setEnrollStartDate(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createEnrollment.mutate({ childId: parseInt(enrollChildId), classId: enrollClassId ? parseInt(enrollClassId) : undefined, startDate: enrollStartDate })} disabled={!enrollChildId || !enrollStartDate || createEnrollment.isPending}>
                    {createEnrollment.isPending ? (isAr ? "جاري..." : "Loading...") : (isAr ? "تسجيل" : "Enroll")}
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
                    <TableHead>{isAr ? "الطفل" : "Child"}</TableHead>
                    <TableHead>{isAr ? "الفصل" : "Class"}</TableHead>
                    <TableHead>{isAr ? "تاريخ البدء" : "Start Date"}</TableHead>
                    <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isAr ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                  enrollments?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isAr ? "لا توجد تسجيلات" : "No enrollments"}</TableCell></TableRow> :
                  enrollments?.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.childName || (isAr ? `طفل #${e.childId}` : `Child #${e.childId}`)}</TableCell>
                      <TableCell>{e.className || (e.classId ? (isAr ? `فصل #${e.classId}` : `Class #${e.classId}`) : "-")}</TableCell>
                      <TableCell>{e.startDate ? new Date(e.startDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : "-"}</TableCell>
                      <TableCell>
                        <Badge className={enrollmentStatusMap[e.status]?.color || ""}>
                          {enrollmentStatusMap[e.status]?.label || e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={e.status} onValueChange={(val) => updateEnrollment.mutate({ id: e.id, status: val as any })}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{isAr ? "نشط" : "Active"}</SelectItem>
                            <SelectItem value="pending">{isAr ? "معلق" : "Pending"}</SelectItem>
                            <SelectItem value="withdrawn">{isAr ? "منسحب" : "Withdrawn"}</SelectItem>
                            <SelectItem value="graduated">{isAr ? "تخرج" : "Graduated"}</SelectItem>
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
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />{isAr ? "إضافة لقائمة الانتظار" : "Add to Waiting List"}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isAr ? "إضافة لقائمة الانتظار" : "Add to Waiting List"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>{isAr ? "اسم الطفل" : "Child Name"}</Label><Input value={wlChildName} onChange={e => setWlChildName(e.target.value)} placeholder={isAr ? "اسم الطفل" : "Child name"} /></div>
                  <div><Label>{isAr ? "اسم ولي الأمر" : "Parent Name"}</Label><Input value={wlParentName} onChange={e => setWlParentName(e.target.value)} placeholder={isAr ? "اسم ولي الأمر" : "Parent name"} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>{isAr ? "رقم الهاتف" : "Phone"}</Label><Input value={wlPhone} onChange={e => setWlPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" /></div>
                    <div><Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label><Input value={wlEmail} onChange={e => setWlEmail(e.target.value)} placeholder="email@example.com" dir="ltr" /></div>
                  </div>
                  <div><Label>{isAr ? "الفصل المفضل" : "Preferred Class"}</Label><Input value={wlPreferredClass} onChange={e => setWlPreferredClass(e.target.value)} placeholder={isAr ? "مثال: الروضة الأولى" : "e.g. KG1"} /></div>
                  <div><Label>{isAr ? "ملاحظات" : "Notes"}</Label><Textarea value={wlNotes} onChange={e => setWlNotes(e.target.value)} rows={2} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createWaitingEntry.mutate({ childName: wlChildName, parentName: wlParentName, parentPhone: wlPhone, parentEmail: wlEmail || undefined, preferredClass: wlPreferredClass || undefined, notes: wlNotes || undefined })} disabled={!wlChildName || !wlParentName || !wlPhone || createWaitingEntry.isPending}>
                    {createWaitingEntry.isPending ? (isAr ? "جاري..." : "Loading...") : (isAr ? "إضافة" : "Add")}
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
                    <TableHead>{isAr ? "اسم الطفل" : "Child Name"}</TableHead>
                    <TableHead>{isAr ? "ولي الأمر" : "Parent"}</TableHead>
                    <TableHead>{isAr ? "الهاتف" : "Phone"}</TableHead>
                    <TableHead>{isAr ? "الفصل المفضل" : "Preferred Class"}</TableHead>
                    <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isAr ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wlLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                  waitingList?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? "قائمة الانتظار فارغة" : "Waiting list is empty"}</TableCell></TableRow> :
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
                              <SelectItem value="waiting">{isAr ? "بانتظار" : "Waiting"}</SelectItem>
                              <SelectItem value="contacted">{isAr ? "تم التواصل" : "Contacted"}</SelectItem>
                              <SelectItem value="enrolled">{isAr ? "تم التسجيل" : "Enrolled"}</SelectItem>
                              <SelectItem value="declined">{isAr ? "رفض" : "Declined"}</SelectItem>
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
