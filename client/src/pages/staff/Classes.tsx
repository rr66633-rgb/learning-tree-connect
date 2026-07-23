import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function StaffClasses() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: classes, isLoading } = trpc.classes.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [capacity, setCapacity] = useState("12");

  const create = trpc.classes.create.useMutation({
    onSuccess: () => { utils.classes.list.invalidate(); setOpen(false); setName(""); setAgeGroup(""); toast.success(i18n.language === "ar" ? isAr ? "تم إنشاء الفصل" : "Class created" : "Class created"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n.language === "ar" ? isAr ? "إدارة الفصول" : "Class Management" : "Classes Management"}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />{i18n.language === "ar" ? isAr ? "إضافة فصل" : "Add Class" : "Add Class"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{i18n.language === "ar" ? isAr ? "إضافة فصل جديد" : "Add New Class" : "Add New Class"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{i18n.language === "ar" ? isAr ? "اسم الفصل" : "Class Name" : "Class Name"}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={i18n.language === "ar" ? isAr ? "مثال: فصل النجوم" : "Example: Stars Class" : "e.g. Stars Class"} /></div>
              <div><Label>{i18n.language === "ar" ? isAr ? "الفئة العمرية" : "Age Group" : "Age Group"}</Label><Input value={ageGroup} onChange={e => setAgeGroup(e.target.value)} placeholder={i18n.language === "ar" ? "مثال: 2-3 سنوات" : "e.g. 2-3 years"} /></div>
              <div><Label>{i18n.language === "ar" ? isAr ? "السعة" : "Capacity" : "Capacity"}</Label><Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate({ name, ageGroup, capacity: parseInt(capacity) })} disabled={!name || create.isPending}>
                {create.isPending ? (i18n.language === "ar" ? isAr ? "جاري الإنشاء..." : "Creating..." : "Creating...") : (i18n.language === "ar" ? isAr ? "إنشاء" : "Create" : "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        )) : classes?.map((cls: any) => (
          <Card key={cls.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{cls.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{i18n.language === "ar" ? isAr ? "الفئة العمرية" : "Age Group" : "Age Group"}</span><span>{cls.ageGroup || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{i18n.language === "ar" ? isAr ? "السعة" : "Capacity" : "Capacity"}</span><span>{cls.capacity || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{i18n.language === "ar" ? isAr ? "المعلمة" : "Teacher" : "Teacher"}</span><span>{cls.teacherName || (i18n.language === "ar" ? isAr ? "غير محدد" : "Undefined" : "Unassigned")}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
