import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Utensils, Moon, Droplets, Baby, Sun, ThermometerSun, StickyNote,
  ChevronRight, ChevronLeft, Calendar, LogIn, LogOut, Coffee, Apple,
  Sandwich, Cookie, Smile, BookOpen, TreePine, User
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const iconMap: Record<string, any> = {
  arrival: LogIn, breakfast: Coffee, morning_snack: Apple, lunch: Sandwich,
  afternoon_snack: Cookie, nap_start: Moon, nap_end: Moon, diaper: Baby,
  toilet: Droplets, medication: ThermometerSun, mood: Smile,
  learning_activity: BookOpen, outdoor_play: TreePine, departure: LogOut,
  meal: Utensils, snack: Utensils, water: Droplets, indoor_play: Sun,
  temperature: ThermometerSun, photo: StickyNote, note: StickyNote,
  observation: StickyNote, activity: Sun, milestone: StickyNote
};

const labelMap: Record<string, string> = {
  arrival: "الوصول", breakfast: "الإفطار", morning_snack: "وجبة صباحية",
  lunch: "الغداء", afternoon_snack: "وجبة مسائية", nap_start: "بداية قيلولة",
  nap_end: "نهاية قيلولة", diaper: "حفاض", toilet: "دورة مياه",
  medication: "دواء", mood: "المزاج", learning_activity: "نشاط تعليمي",
  outdoor_play: "لعب خارجي", departure: "المغادرة", meal: "وجبة",
  snack: "وجبة خفيفة", water: "ماء", indoor_play: "لعب داخلي",
  temperature: "حرارة", photo: "صورة", note: "ملاحظة",
  observation: "ملاحظة", activity: "نشاط", milestone: "إنجاز"
};

const colorMap: Record<string, string> = {
  arrival: "bg-emerald-100 text-emerald-600", breakfast: "bg-amber-100 text-amber-600",
  morning_snack: "bg-orange-50 text-orange-500", lunch: "bg-orange-100 text-orange-600",
  afternoon_snack: "bg-yellow-100 text-yellow-600", nap_start: "bg-indigo-100 text-indigo-600",
  nap_end: "bg-indigo-50 text-indigo-500", diaper: "bg-pink-100 text-pink-600",
  toilet: "bg-cyan-100 text-cyan-600", medication: "bg-red-100 text-red-600",
  mood: "bg-purple-100 text-purple-600", learning_activity: "bg-blue-100 text-blue-600",
  outdoor_play: "bg-green-100 text-green-600", departure: "bg-rose-100 text-rose-600",
  meal: "bg-orange-100 text-orange-600", snack: "bg-orange-50 text-orange-500",
  water: "bg-blue-100 text-blue-600", indoor_play: "bg-lime-100 text-lime-600",
  temperature: "bg-red-50 text-red-500", photo: "bg-violet-100 text-violet-600",
  note: "bg-gray-100 text-gray-600", observation: "bg-teal-100 text-teal-600",
  activity: "bg-green-100 text-green-600", milestone: "bg-amber-100 text-amber-600"
};

const relationshipLabels: Record<string, string> = {
  parent: "ولي أمر", driver: "سائق", guardian: "وصي", other: "آخر"
};

export default function ParentTimeline() {
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: activities, isLoading } = trpc.dailyActivities.byChild.useQuery(
    { childId: parseInt(selectedChild || "0"), date },
    { enabled: !!selectedChild }
  );

  const { data: departures } = trpc.departures.byChild.useQuery(
    { childId: parseInt(selectedChild || "0") },
    { enabled: !!selectedChild }
  );

  // Get today's departure for selected child
  const todayDeparture = departures?.find((d: any) => {
    const depDate = new Date(d.departureTime).toISOString().split('T')[0];
    return depDate === date;
  });

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split('T')[0]);
  };

  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الجدول الزمني اليومي</h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
          <SelectContent>
            {children?.map((c: any) => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedChild && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeDate(-1)}><ChevronRight className="h-4 w-4" /></Button>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{new Date(date).toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => changeDate(1)} disabled={isToday}><ChevronLeft className="h-4 w-4" /></Button>
            {!isToday && <Button variant="ghost" size="sm" onClick={() => setDate(new Date().toISOString().split('T')[0])}>اليوم</Button>}
          </div>
        )}
      </div>

      {selectedChild && (
        <>
          {/* Departure Info Card */}
          {todayDeparture && (
            <Card className="border-rose-200 bg-rose-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">تم تسجيل المغادرة</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(todayDeparture.departureTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {todayDeparture.pickedUpBy} ({relationshipLabels[todayDeparture.relationship] || todayDeparture.relationship})
                      </span>
                    </div>
                    {todayDeparture.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{todayDeparture.notes}</p>
                    )}
                  </div>
                  <Badge variant={todayDeparture.status === 'completed' ? 'default' : 'destructive'}>
                    {todayDeparture.status === 'completed' ? 'مكتمل' : todayDeparture.status === 'late' ? 'متأخر' : 'معلق'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">أنشطة اليوم</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32 w-full" /> : activities?.length === 0 ? (
                <EmptyState variant="daily-report" compact />
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute top-0 bottom-0 right-5 w-px bg-border" />

                  <div className="space-y-4">
                    {activities?.map((act: any) => {
                      const Icon = iconMap[act.type] || StickyNote;
                      const color = colorMap[act.type] || "bg-gray-100 text-gray-600";
                      return (
                        <div key={act.id} className="flex items-start gap-4 relative">
                          {/* Timeline dot */}
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 ${color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          {/* Content */}
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">{labelMap[act.type] || act.type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(act.recordedAt || act.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {(act.details || act.description) && (
                              <p className="text-sm text-foreground/80">{typeof act.details === 'string' ? act.details : act.description}</p>
                            )}
                            {act.notes && <p className="text-xs text-muted-foreground mt-1">{act.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedChild && (
        <div className="text-center py-12">
          <Baby className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">اختر طفلاً لعرض الجدول الزمني اليومي</p>
        </div>
      )}
    </div>
  );
}
