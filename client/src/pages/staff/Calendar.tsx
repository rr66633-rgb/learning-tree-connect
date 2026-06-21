import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ChevronRight, ChevronLeft, Calendar as CalIcon, Pencil, Trash2, Eye, Bell, BellRing, MapPin, Clock, Shirt, Package, Send } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "holiday", label: "إجازة", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "event", label: "فعالية", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "meeting", label: "اجتماع", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "exam", label: "اختبار", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "activity", label: "نشاط", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "celebration", label: "احتفال", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "other", label: "أخرى", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const AUDIENCES = [
  { value: "all", label: "الجميع" },
  { value: "parents", label: "أولياء الأمور" },
  { value: "staff", label: "الموظفين" },
  { value: "admin", label: "الإدارة فقط" },
];

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const REMINDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-700" },
  sent: { label: "تم الإرسال", color: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
};

const REMINDER_TYPE_MAP: Record<string, string> = {
  parent_upcoming: "تذكير ولي أمر",
  parent_update: "تحديث للأهل",
  parent_cancellation: "إلغاء",
  teacher_preparation: "تحضير معلمة",
  teacher_materials: "تجهيز مواد",
  teacher_setup: "إعداد المكان",
  manual: "يدوي",
};

function getCategoryStyle(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.color || "bg-gray-100 text-gray-700";
}
function getCategoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat;
}

export default function StaffCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [viewEvent, setViewEvent] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [reminderDialog, setReminderDialog] = useState<any>(null);
  const [manualReminderMsg, setManualReminderMsg] = useState("");
  const [manualReminderAudience, setManualReminderAudience] = useState<"all" | "parents" | "staff">("parents");

  // Form state
  const [form, setForm] = useState({
    titleAr: "",
    titleEn: "",
    eventDate: "",
    endDate: "",
    eventTime: "",
    location: "",
    requiredMaterials: "",
    dressCode: "",
    category: "event" as string,
    description: "",
    audience: "all" as string,
    status: "draft" as string,
    autoReminders: true,
  });

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: events, isLoading } = trpc.calendar.list.useQuery({ month, year });
  const utils = trpc.useUtils();

  // Reminder history query (only when viewing an event)
  const { data: reminderHistory } = trpc.calendar.reminderHistory.useQuery(
    { eventId: reminderDialog?.id || 0 },
    { enabled: !!reminderDialog }
  );

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("تم إضافة الحدث بنجاح");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate();
      setDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      toast.success("تم تحديث الحدث بنجاح");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate();
      setDeleteConfirm(null);
      toast.success("تم حذف الحدث");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const publishMutation = trpc.calendar.publish.useMutation({
    onSuccess: (data: any) => {
      utils.calendar.list.invalidate();
      toast.success(data.status === "published" ? "تم نشر الحدث وجدولة التذكيرات" : "تم إلغاء نشر الحدث");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendReminderMutation = trpc.calendar.sendReminder.useMutation({
    onSuccess: (data: any) => {
      utils.calendar.reminderHistory.invalidate();
      toast.success(`تم إرسال التذكير إلى ${data.sentTo} مستخدم`);
      setManualReminderMsg("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelRemindersMutation = trpc.calendar.cancelReminders.useMutation({
    onSuccess: () => {
      utils.calendar.reminderHistory.invalidate();
      toast.success("تم إلغاء التذكيرات المعلقة");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ titleAr: "", titleEn: "", eventDate: "", endDate: "", eventTime: "", location: "", requiredMaterials: "", dressCode: "", category: "event", description: "", audience: "all", status: "draft", autoReminders: true });
  }

  function openCreate(dateStr?: string) {
    resetForm();
    setEditingEvent(null);
    if (dateStr) setForm(f => ({ ...f, eventDate: dateStr }));
    setDialogOpen(true);
  }

  function openEdit(ev: any) {
    setEditingEvent(ev);
    setForm({
      titleAr: ev.titleAr || "",
      titleEn: ev.titleEn || "",
      eventDate: ev.eventDate || "",
      endDate: ev.endDate || "",
      eventTime: ev.eventTime || "",
      location: ev.location || "",
      requiredMaterials: ev.requiredMaterials || "",
      dressCode: ev.dressCode || "",
      category: ev.category || "event",
      description: ev.description || "",
      audience: ev.audience || "all",
      status: ev.status || "draft",
      autoReminders: true,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.titleAr || !form.eventDate) {
      toast.error("العنوان بالعربية والتاريخ مطلوبان");
      return;
    }
    const payload: any = {
      titleAr: form.titleAr,
      titleEn: form.titleEn || undefined,
      eventDate: form.eventDate,
      endDate: form.endDate || undefined,
      eventTime: form.eventTime || undefined,
      location: form.location || undefined,
      requiredMaterials: form.requiredMaterials || undefined,
      dressCode: form.dressCode || undefined,
      category: form.category as any,
      description: form.description || undefined,
      audience: form.audience as any,
      status: form.status as any,
      autoReminders: form.autoReminders,
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleSendManualReminder() {
    if (!manualReminderMsg.trim() || !reminderDialog) return;
    sendReminderMutation.mutate({
      eventId: reminderDialog.id,
      audience: manualReminderAudience,
      message: manualReminderMsg,
    });
  }

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: number; dateStr: string; isCurrentMonth: boolean }[] = [];
    
    const prevMonthLast = new Date(year, month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = month - 1 < 1 ? 12 : month - 1;
      const y = month - 1 < 1 ? year - 1 : year;
      days.push({ date: d, dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false });
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: d, dateStr: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: true });
    }
    
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 1 > 12 ? 1 : month + 1;
      const y = month + 1 > 12 ? year + 1 : year;
      days.push({ date: d, dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false });
    }
    
    return days;
  }, [month, year]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    events?.forEach((ev: any) => {
      const d = ev.eventDate;
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [events]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">التقويم السنوي</h1>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة حدث
        </Button>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 2, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl">
              {MONTHS_AR[month - 1]} {year}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_AR.map(d => (
              <div key={d} className="text-center text-sm font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 border-t border-r border-border">
            {calendarDays.map((day, idx) => {
              const dayEvents = eventsByDate[day.dateStr] || [];
              const isToday = day.dateStr === todayStr;
              return (
                <div
                  key={idx}
                  className={`min-h-[90px] border-b border-l border-border p-1 cursor-pointer hover:bg-accent/30 transition-colors ${
                    !day.isCurrentMonth ? "bg-muted/30" : ""
                  } ${isToday ? "bg-primary/5" : ""}`}
                  onClick={() => openCreate(day.dateStr)}
                >
                  <div className={`text-sm font-medium mb-1 ${!day.isCurrentMonth ? "text-muted-foreground/50" : ""} ${isToday ? "text-primary font-bold" : ""}`}>
                    {day.date}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev: any) => (
                      <div
                        key={ev.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${getCategoryStyle(ev.category)} ${ev.status === "draft" ? "opacity-60 border border-dashed" : ""}`}
                        onClick={(e) => { e.stopPropagation(); setViewEvent(ev); }}
                        title={ev.titleAr}
                      >
                        {ev.titleAr}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Events List Below Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أحداث {MONTHS_AR[month - 1]}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : !events || events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد أحداث في هذا الشهر</div>
          ) : (
            <div className="space-y-3">
              {events.map((ev: any) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${getCategoryStyle(ev.category)}`}>
                    <CalIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{ev.titleAr}</span>
                      <Badge variant="outline" className={`text-[10px] ${getCategoryStyle(ev.category)}`}>
                        {getCategoryLabel(ev.category)}
                      </Badge>
                      {ev.status === "draft" && (
                        <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">مسودة</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ev.eventDate + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                      {ev.eventTime && ` - ${ev.eventTime}`}
                      {ev.endDate && ` — ${new Date(ev.endDate + "T00:00:00").toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-2 ml-2">
                      <Switch
                        checked={ev.status === "published"}
                        onCheckedChange={(checked) => publishMutation.mutate({ id: ev.id, published: checked })}
                        className="scale-75"
                      />
                      <span className="text-[10px] text-muted-foreground">{ev.status === "published" ? "منشور" : "مسودة"}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReminderDialog(ev)} title="التذكيرات">
                      <Bell className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewEvent(ev)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ev)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(ev.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingEvent(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "تعديل الحدث" : "إضافة حدث جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            <div>
              <Label>العنوان بالعربية *</Label>
              <Input value={form.titleAr} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, titleAr: e.target.value }))} placeholder="مثال: إجازة اليوم الوطني" />
            </div>
            <div>
              <Label>العنوان بالإنجليزية</Label>
              <Input value={form.titleEn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, titleEn: e.target.value }))} placeholder="National Day Holiday" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ البداية *</Label>
                <Input type="date" value={form.eventDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, eventDate: e.target.value }))} />
              </div>
              <div>
                <Label>تاريخ النهاية (اختياري)</Label>
                <Input type="date" value={form.endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1"><Clock className="h-3 w-3" />الوقت</Label>
                <Input type="time" value={form.eventTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, eventTime: e.target.value }))} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" />الموقع</Label>
                <Input value={form.location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="مثال: القاعة الرئيسية" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الجمهور</Label>
                <Select value={form.audience} onValueChange={(v) => setForm(f => ({ ...f, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Package className="h-3 w-3" />المواد المطلوبة</Label>
              <Input value={form.requiredMaterials} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, requiredMaterials: e.target.value }))} placeholder="مثال: ملابس رياضية، قبعة شمسية" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Shirt className="h-3 w-3" />الزي المطلوب</Label>
              <Input value={form.dressCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, dressCode: e.target.value }))} placeholder="مثال: ملابس بيضاء" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="تفاصيل إضافية عن الحدث..." />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-3">
                <Label>نشر مباشرة</Label>
                <Switch checked={form.status === "published"} onCheckedChange={(c) => setForm(f => ({ ...f, status: c ? "published" : "draft" }))} />
              </div>
              <div className="flex items-center gap-3">
                <Label className="flex items-center gap-1"><BellRing className="h-3 w-3" />تذكيرات تلقائية</Label>
                <Switch checked={form.autoReminders} onCheckedChange={(c) => setForm(f => ({ ...f, autoReminders: c }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? "جاري الحفظ..." : editingEvent ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Event Dialog - Enhanced with full details */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => { if (!o) setViewEvent(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewEvent?.titleAr}</DialogTitle>
          </DialogHeader>
          {viewEvent && (
            <div className="space-y-4">
              {viewEvent.titleEn && <p className="text-muted-foreground" dir="ltr">{viewEvent.titleEn}</p>}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">التاريخ:</span>
                  <p className="font-medium">
                    {new Date(viewEvent.eventDate + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                {viewEvent.endDate && (
                  <div>
                    <span className="text-muted-foreground">تاريخ النهاية:</span>
                    <p className="font-medium">{new Date(viewEvent.endDate + "T00:00:00").toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                )}
                {viewEvent.eventTime && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">الوقت:</span>
                      <p className="font-medium">{viewEvent.eventTime}</p>
                    </div>
                  </div>
                )}
                {viewEvent.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">الموقع:</span>
                      <p className="font-medium">{viewEvent.location}</p>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">التصنيف:</span>
                  <Badge className={`mt-1 ${getCategoryStyle(viewEvent.category)}`}>{getCategoryLabel(viewEvent.category)}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">الجمهور:</span>
                  <p className="font-medium">{AUDIENCES.find(a => a.value === viewEvent.audience)?.label || viewEvent.audience}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالة:</span>
                  <Badge variant="outline" className={viewEvent.status === "published" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}>
                    {viewEvent.status === "published" ? "منشور" : "مسودة"}
                  </Badge>
                </div>
              </div>
              {viewEvent.requiredMaterials && (
                <div className="flex items-start gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">المواد المطلوبة:</span>
                    <p className="font-medium">{viewEvent.requiredMaterials}</p>
                  </div>
                </div>
              )}
              {viewEvent.dressCode && (
                <div className="flex items-start gap-2 text-sm">
                  <Shirt className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">الزي المطلوب:</span>
                    <p className="font-medium">{viewEvent.dressCode}</p>
                  </div>
                </div>
              )}
              {viewEvent.description && (
                <div>
                  <span className="text-sm text-muted-foreground">الوصف:</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{viewEvent.description}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setViewEvent(null); setReminderDialog(viewEvent); }}>
                  <Bell className="h-4 w-4 ml-2" />التذكيرات
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setViewEvent(null); openEdit(viewEvent); }}>
                  <Pencil className="h-4 w-4 ml-2" />تعديل
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => { setViewEvent(null); setDeleteConfirm(viewEvent.id); }}>
                  <Trash2 className="h-4 w-4 ml-2" />حذف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reminder Management Dialog */}
      <Dialog open={!!reminderDialog} onOpenChange={(o) => { if (!o) setReminderDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              تذكيرات: {reminderDialog?.titleAr}
            </DialogTitle>
          </DialogHeader>
          {reminderDialog && (
            <Tabs defaultValue="send" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="send" className="flex-1">إرسال تذكير</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">سجل التذكيرات</TabsTrigger>
              </TabsList>
              
              <TabsContent value="send" className="space-y-4 mt-4">
                <div>
                  <Label>الرسالة</Label>
                  <Textarea
                    value={manualReminderMsg}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualReminderMsg(e.target.value)}
                    placeholder={`مثال: ${reminderDialog.titleAr} غداً - لا تنسوا إحضار...`}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>إرسال إلى</Label>
                  <Select value={manualReminderAudience} onValueChange={(v: any) => setManualReminderAudience(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parents">أولياء الأمور</SelectItem>
                      <SelectItem value="staff">الموظفين</SelectItem>
                      <SelectItem value="all">الجميع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSendManualReminder} disabled={!manualReminderMsg.trim() || sendReminderMutation.isPending} className="flex-1">
                    <Send className="h-4 w-4 ml-2" />
                    {sendReminderMutation.isPending ? "جاري الإرسال..." : "إرسال الآن"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => cancelRemindersMutation.mutate({ eventId: reminderDialog.id })}
                    disabled={cancelRemindersMutation.isPending}
                    className="text-destructive"
                  >
                    إلغاء المعلقة
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <div className="max-h-[40vh] overflow-y-auto space-y-2">
                  {!reminderHistory || reminderHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">لا توجد تذكيرات مجدولة</p>
                  ) : (
                    reminderHistory.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={REMINDER_STATUS_MAP[r.status]?.color || ""}>
                              {REMINDER_STATUS_MAP[r.status]?.label || r.status}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {REMINDER_TYPE_MAP[r.reminderType] || r.reminderType}
                            </span>
                          </div>
                          <p className="mt-1 truncate">{r.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            مجدول: {new Date(r.scheduledAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {r.sentAt && ` | أُرسل: ${new Date(r.sentAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                          </p>
                        </div>
                        {r.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive shrink-0"
                            onClick={() => cancelRemindersMutation.mutate({ eventId: reminderDialog.id, reminderId: r.id })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">هل أنت متأكد من حذف هذا الحدث؟ سيتم إلغاء جميع التذكيرات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
