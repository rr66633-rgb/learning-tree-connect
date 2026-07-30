import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";

export default function StaffClasses() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: classes, isLoading } = trpc.classes.list.useQuery();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [capacity, setCapacity] = useState("12");

  const create = trpc.classes.create.useMutation({
    onSuccess: () => { utils.classes.list.invalidate(); setOpen(false); setName(""); setAgeGroup(""); setCapacity("12"); toast.success(isAr ? "تم إنشاء الفصل" : "Class created"); },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.classes.update.useMutation({
    onSuccess: () => { utils.classes.list.invalidate(); setEditOpen(false); setSelectedClass(null); toast.success(isAr ? "تم تحديث الفصل" : "Class updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteClass = trpc.classes.delete.useMutation({
    onSuccess: () => { utils.classes.list.invalidate(); setDeleteOpen(false); setSelectedClass(null); toast.success(isAr ? "تم حذف الفصل" : "Class deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (cls: any) => {
    setSelectedClass(cls);
    setName(cls.name || "");
    setAgeGroup(cls.ageGroup || "");
    setCapacity(String(cls.capacity || 12));
    setEditOpen(true);
  };

  const handleDelete = (cls: any) => {
    setSelectedClass(cls);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "إدارة الفصول" : "Class Management"}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />{isAr ? "إضافة فصل" : "Add Class"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? "إضافة فصل جديد" : "Add New Class"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{isAr ? "اسم الفصل" : "Class Name"}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={isAr ? "مثال: فصل النجوم" : "e.g. Stars Class"} /></div>
              <div><Label>{isAr ? "الفئة العمرية" : "Age Group"}</Label><Input value={ageGroup} onChange={e => setAgeGroup(e.target.value)} placeholder={isAr ? "مثال: 2-3 سنوات" : "e.g. 2-3 years"} /></div>
              <div><Label>{isAr ? "السعة" : "Capacity"}</Label><Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate({ name, ageGroup, capacity: parseInt(capacity) })} disabled={!name || create.isPending}>
                {create.isPending ? (isAr ? "جاري الإنشاء..." : "Creating...") : (isAr ? "إنشاء" : "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        )) : classes?.map((cls: any) => (
          <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/staff/classes/${cls.id}`)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{cls.name}</CardTitle>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(cls); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الفئة العمرية" : "Age Group"}</span><span>{cls.ageGroup || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "السعة" : "Capacity"}</span><span>{cls.capacity || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "المعلمة" : "Teacher"}</span><span>{cls.teacherName || (isAr ? "غير محدد" : "Unassigned")}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? "تعديل الفصل" : "Edit Class"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{isAr ? "اسم الفصل" : "Class Name"}</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>{isAr ? "الفئة العمرية" : "Age Group"}</Label><Input value={ageGroup} onChange={e => setAgeGroup(e.target.value)} /></div>
            <div><Label>{isAr ? "السعة" : "Capacity"}</Label><Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => { if (selectedClass) update.mutate({ id: selectedClass.id, name, ageGroup, capacity: parseInt(capacity) }); }} disabled={!name || update.isPending}>
              {update.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? "حذف الفصل" : "Delete Class"}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">{isAr ? `هل أنت متأكد من حذف الفصل "${selectedClass?.name}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete "${selectedClass?.name}"? This action cannot be undone.`}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => { if (selectedClass) deleteClass.mutate({ id: selectedClass.id }); }} disabled={deleteClass.isPending}>
              {deleteClass.isPending ? (isAr ? "جاري الحذف..." : "Deleting...") : (isAr ? "حذف" : "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
