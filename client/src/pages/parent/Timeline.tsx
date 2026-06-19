import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Utensils, Moon, Droplets, Baby, Sun, ThermometerSun, StickyNote, ChevronRight, ChevronLeft, Calendar } from "lucide-react";

const iconMap: Record<string, any> = { meal: Utensils, snack: Utensils, nap_start: Moon, nap_end: Moon, diaper: Baby, toilet: Droplets, water: Droplets, medication: ThermometerSun, outdoor_play: Sun, indoor_play: Sun, mood: StickyNote, temperature: ThermometerSun, note: StickyNote, activity: Sun, milestone: StickyNote };
const labelMap: Record<string, string> = { meal: "وجبة", snack: "وجبة خفيفة", nap_start: "بداية قيلولة", nap_end: "نهاية قيلولة", diaper: "حفاض", toilet: "دورة مياه", water: "ماء", medication: "دواء", outdoor_play: "لعب خارجي", indoor_play: "لعب داخلي", mood: "المزاج", temperature: "حرارة", note: "ملاحظة", activity: "نشاط", milestone: "إنجاز" };
const colorMap: Record<string, string> = { meal: "bg-orange-100 text-orange-600", snack: "bg-orange-50 text-orange-500", nap_start: "bg-indigo-100 text-indigo-600", nap_end: "bg-indigo-50 text-indigo-500", diaper: "bg-pink-100 text-pink-600", toilet: "bg-cyan-100 text-cyan-600", water: "bg-blue-100 text-blue-600", medication: "bg-red-100 text-red-600", outdoor_play: "bg-green-100 text-green-600", indoor_play: "bg-lime-100 text-lime-600", mood: "bg-purple-100 text-purple-600", temperature: "bg-red-50 text-red-500", note: "bg-gray-100 text-gray-600", activity: "bg-green-100 text-green-600", milestone: "bg-amber-100 text-amber-600" };

export default function ParentTimeline() {
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: activities, isLoading } = trpc.dailyActivities.byChild.useQuery(
    { childId: parseInt(selectedChild || "0"), date },
    { enabled: !!selectedChild }
  );

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
          <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">أنشطة اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32 w-full" /> : activities?.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد أنشطة مسجلة في هذا اليوم</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute top-0 bottom-0 right-5 w-px bg-border" />

                <div className="space-y-4">
                  {activities?.map((act: any, idx: number) => {
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
                              {new Date(act.timestamp || act.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {(act.details || act.description) && (
                            <p className="text-sm text-foreground/80">{act.details || act.description}</p>
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
