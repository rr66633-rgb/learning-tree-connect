import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, ChevronLeft, Calendar as CalIcon } from "lucide-react";
import { useState, useMemo } from "react";

const CATEGORIES = [
  { value: "holiday", label: "إجازة", color: "bg-red-100 text-red-700" },
  { value: "event", label: "فعالية", color: "bg-blue-100 text-blue-700" },
  { value: "meeting", label: "اجتماع", color: "bg-purple-100 text-purple-700" },
  { value: "exam", label: "اختبار", color: "bg-orange-100 text-orange-700" },
  { value: "activity", label: "نشاط", color: "bg-green-100 text-green-700" },
  { value: "celebration", label: "احتفال", color: "bg-pink-100 text-pink-700" },
  { value: "other", label: "أخرى", color: "bg-gray-100 text-gray-700" },
];

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function getCategoryStyle(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.color || "bg-gray-100 text-gray-700";
}
function getCategoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat;
}

export default function ParentCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewEvent, setViewEvent] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: events, isLoading } = trpc.calendar.list.useQuery({ month, year });

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!selectedCategory) return events;
    return events.filter((ev: any) => ev.category === selectedCategory);
  }, [events, selectedCategory]);

  // Calendar grid
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
    filteredEvents?.forEach((ev: any) => {
      const d = ev.eventDate;
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التقويم السنوي</h1>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("")}
        >
          الكل
        </Button>
        {CATEGORIES.map(c => (
          <Button
            key={c.value}
            variant={selectedCategory === c.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(c.value)}
          >
            {c.label}
          </Button>
        ))}
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
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
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
                  className={`min-h-[80px] border-b border-l border-border p-1 ${
                    !day.isCurrentMonth ? "bg-muted/30" : ""
                  } ${isToday ? "bg-primary/5" : ""}`}
                >
                  <div className={`text-sm font-medium mb-1 ${!day.isCurrentMonth ? "text-muted-foreground/50" : ""} ${isToday ? "text-primary font-bold" : ""}`}>
                    {day.date}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev: any) => (
                      <div
                        key={ev.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${getCategoryStyle(ev.category)}`}
                        onClick={() => setViewEvent(ev)}
                        title={ev.titleAr}
                      >
                        {ev.titleAr}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الأحداث القادمة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : !filteredEvents || filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد أحداث في هذا الشهر</div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev: any) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => setViewEvent(ev)}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${getCategoryStyle(ev.category)}`}>
                    <CalIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{ev.titleAr}</span>
                      <Badge variant="outline" className={`text-[10px] ${getCategoryStyle(ev.category)}`}>
                        {getCategoryLabel(ev.category)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ev.eventDate + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                      {ev.endDate && ` — ${new Date(ev.endDate + "T00:00:00").toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => { if (!o) setViewEvent(null); }}>
        <DialogContent>
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
                    <span className="text-muted-foreground">حتى:</span>
                    <p className="font-medium">{new Date(viewEvent.endDate + "T00:00:00").toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">التصنيف:</span>
                  <Badge className={`mt-1 ${getCategoryStyle(viewEvent.category)}`}>{getCategoryLabel(viewEvent.category)}</Badge>
                </div>
              </div>
              {viewEvent.description && (
                <div>
                  <span className="text-sm text-muted-foreground">التفاصيل:</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{viewEvent.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
