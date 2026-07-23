import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, ChevronLeft, Calendar as CalIcon, Clock, MapPin, Package, Shirt } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

const getCATEGORIES = (isAr: boolean) => ([
  { value: "holiday", label: (isAr ? "إجازة" : "Leave"), color: "bg-red-100 text-red-700" },
  { value: "event", label: (isAr ? "فعالية" : "Event"), color: "bg-blue-100 text-blue-700" },
  { value: "meeting", label: (isAr ? "اجتماع" : "Meeting"), color: "bg-purple-100 text-purple-700" },
  { value: "exam", label: (isAr ? "اختبار" : "Test"), color: "bg-orange-100 text-orange-700" },
  { value: "activity", label: (isAr ? "نشاط" : "Activity"), color: "bg-green-100 text-green-700" },
  { value: "celebration", label: (isAr ? "احتفال" : "Celebration"), color: "bg-pink-100 text-pink-700" },
  { value: "other", label: (isAr ? "أخرى" : "Other"), color: "bg-gray-100 text-gray-700" },
]);

const getMONTHS_AR = (isAr: boolean) => ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const getDAYS_AR = (isAr: boolean) => ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function getCategoryStyle(cat: string, isAr: boolean) {
  return getCATEGORIES(isAr).find(c => c.value === cat)?.color || "bg-gray-100 text-gray-700";
}
function getCategoryLabel(cat: string, isAr: boolean) {
  return getCATEGORIES(isAr).find(c => c.value === cat)?.label || cat;
}

export default function ParentCalendar() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const isAr = i18n.language === "ar";
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

  // Calculate days until event
  function getDaysUntil(eventDate: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evDate = new Date(eventDate + "T00:00:00");
    const diff = Math.ceil((evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return (isAr ? "اليوم" : "Today");
    if (diff === 1) return (isAr ? "غداً" : "Tomorrow");
    if (diff < 0) return (isAr ? "انتهى" : "Ended");
    return (isAr ? `بعد ${diff} أيام` : `After${diff}Days`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isAr ? "التقويم السنوي" : "Annual Calendar"}</h1>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("")}
        >
          {isAr ? "الكل" : "All"}
        </Button>
        {getCATEGORIES(isAr).map(c => (
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
              {getMONTHS_AR(isAr)[month - 1]} {year}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {getDAYS_AR(isAr).map(d => (
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
                        className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${getCategoryStyle(ev.category, isAr)}`}
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
          <CardTitle className="text-lg">{isAr ? "الأحداث القادمة" : "Upcoming Events"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton variant="list" title={false} count={3} />
          ) : !filteredEvents || filteredEvents.length === 0 ? (
            <EmptyState variant="calendar" compact />
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev: any) => {
                const daysUntil = getDaysUntil(ev.eventDate);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => setViewEvent(ev)}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${getCategoryStyle(ev.category, isAr)}`}>
                      <CalIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{ev.titleAr}</span>
                        <Badge variant="outline" className={`text-[10px] ${getCategoryStyle(ev.category, isAr)}`}>
                          {getCategoryLabel(ev.category, isAr)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(ev.eventDate + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                        {ev.eventTime && ` - ${ev.eventTime}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {daysUntil}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog - Enhanced */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => { if (!o) setViewEvent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{viewEvent?.titleAr}</DialogTitle>
          </DialogHeader>
          {viewEvent && (
            <div className="space-y-4">
              {viewEvent.titleEn && <p className="text-muted-foreground text-sm" dir="ltr">{viewEvent.titleEn}</p>}
              
              {/* Event info cards */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CalIcon className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{isAr ? "التاريخ" : "Date"}</p>
                    <p className="font-medium text-sm">
                      {new Date(viewEvent.eventDate + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    {viewEvent.endDate && (
                      <p className="text-xs text-muted-foreground">حتى {new Date(viewEvent.endDate + "T00:00:00").toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}</p>
                    )}
                  </div>
                </div>

                {viewEvent.eventTime && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{isAr ? "الوقت" : "Time"}</p>
                      <p className="font-medium text-sm">{viewEvent.eventTime}</p>
                    </div>
                  </div>
                )}

                {viewEvent.location && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{isAr ? "الموقع" : "Location"}</p>
                      <p className="font-medium text-sm">{viewEvent.location}</p>
                    </div>
                  </div>
                )}

                {viewEvent.requiredMaterials && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Package className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs text-amber-700 font-medium">{isAr ? "المواد المطلوبة" : "Required Materials"}</p>
                      <p className="text-sm">{viewEvent.requiredMaterials}</p>
                    </div>
                  </div>
                )}

                {viewEvent.dressCode && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <Shirt className="h-5 w-5 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-xs text-purple-700 font-medium">{isAr ? "الزي المطلوب" : "Required Uniform"}</p>
                      <p className="text-sm">{viewEvent.dressCode}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge className={getCategoryStyle(viewEvent.category, isAr)}>{getCategoryLabel(viewEvent.category, isAr)}</Badge>
                <Badge variant="outline" className="text-xs">{getDaysUntil(viewEvent.eventDate)}</Badge>
              </div>

              {viewEvent.description && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-1">{isAr ? "التفاصيل" : "Details"}</p>
                  <p className="text-sm whitespace-pre-wrap">{viewEvent.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
