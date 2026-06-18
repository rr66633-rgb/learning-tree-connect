import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const moodLabels: Record<string, string> = { happy: "سعيد", calm: "هادئ", tired: "متعب", upset: "منزعج", excited: "متحمس" };
const moodColors: Record<string, string> = { happy: "bg-green-100 text-green-700", calm: "bg-blue-100 text-blue-700", tired: "bg-amber-100 text-amber-700", upset: "bg-red-100 text-red-700", excited: "bg-purple-100 text-purple-700" };

export default function DailyReports() {
  const { data: reports, isLoading: reportsLoading } = trpc.dailyReports.list.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const createReport = trpc.dailyReports.create.useMutation({
    onSuccess: () => { utils.dailyReports.list.invalidate(); toast.success("تم إنشاء التقرير بنجاح"); setOpen(false); },
    onError: () => toast.error("حدث خطأ"),
  });

  const [form, setForm] = useState({
    childId: 0,
    date: new Date().toISOString().split('T')[0],
    mood: "happy" as "happy" | "calm" | "tired" | "upset" | "excited",
    activities: "",
    teacherNotes: "",
    meals: { breakfast: "", lunch: "", snack: "" },
    sleep: { from: "", to: "", quality: "good" },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId) { toast.error("يرجى اختيار الطفل"); return; }
    createReport.mutate({
      childId: form.childId,
      date: form.date,
      mood: form.mood,
      activities: form.activities,
      teacherNotes: form.teacherNotes,
      meals: form.meals,
      sleep: form.sleep,
      isPublished: true,
    });
  };

  const getChildName = (childId: number) => {
    const child = children?.find(c => c.id === childId);
    return child ? `${child.firstName} ${child.lastName}` : "غير معروف";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          التقارير اليومية
          {reportsLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />تقرير جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إنشاء تقرير يومي</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الطفل</Label>
                  <Select value={form.childId ? String(form.childId) : ""} onValueChange={v => setForm(f => ({ ...f, childId: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                    <SelectContent>{children?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <div>
                <Label>المزاج</Label>
                <Select value={form.mood} onValueChange={v => setForm(f => ({ ...f, mood: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="happy">سعيد</SelectItem>
                    <SelectItem value="calm">هادئ</SelectItem>
                    <SelectItem value="tired">متعب</SelectItem>
                    <SelectItem value="upset">منزعج</SelectItem>
                    <SelectItem value="excited">متحمس</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">الوجبات</Label>
                <Input placeholder="الإفطار" value={form.meals.breakfast} onChange={e => setForm(f => ({ ...f, meals: { ...f.meals, breakfast: e.target.value } }))} />
                <Input placeholder="الغداء" value={form.meals.lunch} onChange={e => setForm(f => ({ ...f, meals: { ...f.meals, lunch: e.target.value } }))} />
                <Input placeholder="وجبة خفيفة" value={form.meals.snack} onChange={e => setForm(f => ({ ...f, meals: { ...f.meals, snack: e.target.value } }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>النوم من</Label><Input type="time" value={form.sleep.from} onChange={e => setForm(f => ({ ...f, sleep: { ...f.sleep, from: e.target.value } }))} /></div>
                <div><Label>النوم إلى</Label><Input type="time" value={form.sleep.to} onChange={e => setForm(f => ({ ...f, sleep: { ...f.sleep, to: e.target.value } }))} /></div>
              </div>
              <div><Label>الأنشطة</Label><Textarea value={form.activities} onChange={e => setForm(f => ({ ...f, activities: e.target.value }))} placeholder="وصف الأنشطة التي قام بها الطفل اليوم" /></div>
              <div><Label>ملاحظات المعلمة</Label><Textarea value={form.teacherNotes} onChange={e => setForm(f => ({ ...f, teacherNotes: e.target.value }))} placeholder="ملاحظات إضافية لولي الأمر" /></div>
              <Button type="submit" className="w-full" disabled={createReport.isPending}>
                {createReport.isPending ? "جارٍ الإنشاء..." : "إنشاء التقرير"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {reportsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-24 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports?.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{getChildName(report.childId)}</CardTitle>
                  <Badge className={moodColors[report.mood ?? "happy"]}>{moodLabels[report.mood ?? "happy"]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(report.date).toLocaleDateString('ar-SA')}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.activities && <p className="text-sm"><span className="font-medium">الأنشطة:</span> {report.activities}</p>}
                {report.teacherNotes && <p className="text-sm"><span className="font-medium">ملاحظات:</span> {report.teacherNotes}</p>}
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant={report.isPublished ? "default" : "secondary"}>{report.isPublished ? "منشور" : "مسودة"}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!reports || reports.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>لا توجد تقارير يومية بعد</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
