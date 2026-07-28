import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Pencil, Trash2, User, Phone, AlertTriangle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type ChildForm = { firstName: string; lastName: string; dateOfBirth: string; gender: "male" | "female"; className: string; emergencyContact: string; emergencyPhone: string; allergies: string; medicalNotes: string; };
const emptyForm: ChildForm = { firstName: "", lastName: "", dateOfBirth: "", gender: "male", className: "", emergencyContact: "", emergencyPhone: "", allergies: "", medicalNotes: "" };

export default function Children() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const createChild = trpc.children.create.useMutation({
    onSuccess: () => { utils.children.list.invalidate(); toast.success(isAr ? "تم إضافة الطفل بنجاح" : "Child added successfully"); setCreateOpen(false); setForm(emptyForm); },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء الإضافة" : "Error while adding"),
  });
  const updateChild = trpc.children.update.useMutation({
    onSuccess: () => { utils.children.list.invalidate(); toast.success(isAr ? "تم تحديث البيانات" : "Data updated"); setEditOpen(false); setSelectedChild(null); },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء التحديث" : "Error while updating"),
  });
  const deleteChild = trpc.children.delete.useMutation({
    onSuccess: () => { utils.children.list.invalidate(); toast.success(isAr ? "تم الحذف بنجاح" : "Deleted successfully"); setDetailOpen(false); },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ChildForm>(emptyForm);
  const [editForm, setEditForm] = useState<ChildForm>(emptyForm);

  const filtered = children?.filter(c =>
    `${c.firstName} ${c.lastName}`.includes(search)
  ) ?? [];

  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); createChild.mutate(form); };
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    updateChild.mutate({ id: selectedChild.id, ...editForm });
  };

  const openEdit = (child: any) => {
    setSelectedChild(child);
    setEditForm({
      firstName: child.firstName, lastName: child.lastName,
      dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : "",
      gender: child.gender, className: "",
      emergencyContact: child.emergencyContact || "", emergencyPhone: child.emergencyPhone || "",
      allergies: child.allergies || "", medicalNotes: child.medicalNotes || "",
    });
    setEditOpen(true);
  };

  const openDetail = (child: any) => { setSelectedChild(child); setDetailOpen(true); };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "إدارة الأطفال" : "Children Management"}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />{isAr ? "إضافة طفل" : "Add Child"}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{isAr ? "إضافة طفل جديد" : "Add New Child"}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{isAr ? "الاسم الأول" : "First Name"}</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
                <div><Label>{isAr ? "اسم العائلة" : "Last Name"}</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{isAr ? "تاريخ الميلاد" : "Date of Birth"}</Label><Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} required /></div>
                <div><Label>{isAr ? "الجنس" : "Gender"}</Label>
                  <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v as "male" | "female" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="male">{isAr ? "ذكر" : "Male"}</SelectItem><SelectItem value="female">{isAr ? "أنثى" : "Female"}</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{isAr ? "الفصل" : "Class"}</Label><Input value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} placeholder="مثال: الروضة أ" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{isAr ? "جهة اتصال الطوارئ" : "Emergency Contact"}</Label><Input value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} /></div>
                <div><Label>{isAr ? "هاتف الطوارئ" : "Emergency Phone"}</Label><Input value={form.emergencyPhone} onChange={e => setForm(f => ({ ...f, emergencyPhone: e.target.value }))} /></div>
              </div>
              <div><Label>{isAr ? "الحساسية" : "Allergies"}</Label><Input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder={isAr ? "مثال: حساسية الفول السوداني" : "Example: Peanut allergy"} /></div>
              <div><Label>{isAr ? "ملاحظات طبية" : "Medical Notes"}</Label><Input value={form.medicalNotes} onChange={e => setForm(f => ({ ...f, medicalNotes: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={createChild.isPending}>{createChild.isPending ? (isAr ? "جارٍ الإضافة..." : "Adding...") : "إضافة الطفل"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isAr ? "تعديل بيانات الطفل" : "Edit Child Data"}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{isAr ? "الاسم الأول" : "First Name"}</Label><Input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
              <div><Label>{isAr ? "اسم العائلة" : "Last Name"}</Label><Input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{isAr ? "تاريخ الميلاد" : "Date of Birth"}</Label><Input type="date" value={editForm.dateOfBirth} onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} /></div>
              <div><Label>{isAr ? "الجنس" : "Gender"}</Label>
                <Select value={editForm.gender} onValueChange={v => setEditForm(f => ({ ...f, gender: v as "male" | "female" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">{isAr ? "ذكر" : "Male"}</SelectItem><SelectItem value="female">{isAr ? "أنثى" : "Female"}</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{isAr ? "الفصل" : "Class"}</Label><Input value={editForm.className} onChange={e => setEditForm(f => ({ ...f, className: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{isAr ? "جهة اتصال الطوارئ" : "Emergency Contact"}</Label><Input value={editForm.emergencyContact} onChange={e => setEditForm(f => ({ ...f, emergencyContact: e.target.value }))} /></div>
              <div><Label>{isAr ? "هاتف الطوارئ" : "Emergency Phone"}</Label><Input value={editForm.emergencyPhone} onChange={e => setEditForm(f => ({ ...f, emergencyPhone: e.target.value }))} /></div>
            </div>
            <div><Label>{isAr ? "الحساسية" : "Allergies"}</Label><Input value={editForm.allergies} onChange={e => setEditForm(f => ({ ...f, allergies: e.target.value }))} /></div>
            <div><Label>{isAr ? "ملاحظات طبية" : "Medical Notes"}</Label><Input value={editForm.medicalNotes} onChange={e => setEditForm(f => ({ ...f, medicalNotes: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={updateChild.isPending}>{updateChild.isPending ? isAr ? "جارٍ التحديث..." : "Updating..." : isAr ? "حفظ التعديلات" : "Save Changes"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isAr ? "ملف الطفل" : "Child Profile"}</DialogTitle></DialogHeader>
          {selectedChild && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedChild.firstName} {selectedChild.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedChild.className || isAr ? "بدون فصل" : "No Class"}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{isAr ? "الجنس:" : "Gender:"}</span> <span className="font-medium">{selectedChild.gender === "male" ? "ذكر" : "أنثى"}</span></div>
                <div><span className="text-muted-foreground">{isAr ? "تاريخ الميلاد:" : "Date of Birth:"}</span> <span className="font-medium">{selectedChild.dateOfBirth ? new Date(selectedChild.dateOfBirth).toLocaleDateString('ar-SA') : "-"}</span></div>
                <div><span className="text-muted-foreground">الحالة:</span> <Badge variant={selectedChild.status === "active" ? "default" : "secondary"}>{selectedChild.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}</Badge></div>
                <div><span className="text-muted-foreground">{isAr ? "تاريخ التسجيل:" : "Registration Date:"}</span> <span className="font-medium">{new Date(selectedChild.enrollmentDate).toLocaleDateString('ar-SA')}</span></div>
              </div>
              {(selectedChild.emergencyContact || selectedChild.emergencyPhone) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><Phone className="h-4 w-4" />{isAr ? "جهة اتصال الطوارئ" : "Emergency Contact"}</h4>
                    <p className="text-sm">{selectedChild.emergencyContact} - {selectedChild.emergencyPhone}</p>
                  </div>
                </>
              )}
              {selectedChild.allergies && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-amber-600"><AlertTriangle className="h-4 w-4" />{isAr ? "الحساسية" : "Allergies"}</h4>
                    <p className="text-sm">{selectedChild.allergies}</p>
                  </div>
                </>
              )}
              {selectedChild.medicalNotes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold">{isAr ? "ملاحظات طبية" : "Medical Notes"}</h4>
                    <p className="text-sm">{selectedChild.medicalNotes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={isAr ? "بحث بالاسم أو الفصل..." : "Search by Name or Class..."} value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Badge variant="secondary">{filtered.length} {isAr ? "طفل" : "Child"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{isAr ? "الاسم" : "Name"}</TableHead>
                <TableHead className="text-right">{isAr ? "الفصل" : "Class"}</TableHead>
                <TableHead className="text-right">{isAr ? "الجنس" : "Gender"}</TableHead>
                <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right">{isAr ? "تاريخ التسجيل" : "Registration Date"}</TableHead>
                <TableHead className="text-right">{isAr ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(child => (
                <TableRow key={child.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(child)}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {child.firstName} {child.lastName}
                      {child.allergies && (
                        <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          {isAr ? "حساسية" : "Allergy"}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{child.classId ? `${isAr ? "فصل " : " الفصل"}${child.classId}` : "-"}</TableCell>
                  <TableCell>{child.gender === "male" ? (isAr ? "ذكر" : "Male") : (isAr ? "أنثى" : "Female")}</TableCell>
                  <TableCell>
                    <Badge variant={child.status === "active" ? "default" : "secondary"}>
                      {child.status === "active" ? (isAr ? "نشط" : "Active") : child.status === "graduated" ? (isAr ? "متخرج" : "Graduated") : (isAr ? "غير نشط" : "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(child.enrollmentDate).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(child)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) deleteChild.mutate({ id: child.id }); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {isLoading && (
                <>{[1,2,3,4,5].map(i => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}</>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{isAr ? "لا يوجد أطفال مسجلين" : "No children registered"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
