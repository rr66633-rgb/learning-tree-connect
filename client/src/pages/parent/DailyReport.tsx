import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Utensils, Moon, Droplets, Baby, Sun, ThermometerSun, StickyNote } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const iconMap: Record<string, any> = { meal: Utensils, snack: Utensils, nap_start: Moon, nap_end: Moon, diaper: Baby, toilet: Droplets, water: Droplets, medication: ThermometerSun, outdoor_play: Sun, indoor_play: Sun, mood: StickyNote, temperature: ThermometerSun, note: StickyNote };
const labelMap: Record<string, string> = { meal: "وجبة", snack: "وجبة خفيفة", nap_start: "بداية قيلولة", nap_end: "نهاية قيلولة", diaper: "حفاض", toilet: "دورة مياه", water: "ماء", medication: "دواء", outdoor_play: "لعب خارجي", indoor_play: "لعب داخلي", mood: "المزاج", temperature: "حرارة", note: "ملاحظة" };

export default function ParentDailyReport() {
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const { data: activities, isLoading } = trpc.dailyActivities.byChild.useQuery(
    { childId: parseInt(selectedChild || "0"), date: new Date().toISOString().split('T')[0] },
    { enabled: !!selectedChild }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التقرير اليومي</h1>
      <Select value={selectedChild} onValueChange={setSelectedChild}>
        <SelectTrigger className="max-w-xs"><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
        <SelectContent>{children?.map((c: any) => (
          <SelectItem key={c.id} value={c.id.toString()}>
            <span className="flex items-center gap-2">
              {c.photo ? (
                <img src={c.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{c.firstName?.charAt(0)}</div>
              )}
              {c.firstName} {c.lastName}
            </span>
          </SelectItem>
        ))}</SelectContent>
      </Select>

      {selectedChild && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {(() => {
                const child = children?.find((c: any) => c.id === parseInt(selectedChild));
                return child?.photo ? (
                  <img src={child.photo} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-primary/20" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {children?.find((c: any) => c.id === parseInt(selectedChild))?.firstName?.charAt(0)}
                  </div>
                );
              })()}
              <CardTitle>أنشطة اليوم - {new Date().toLocaleDateString('ar-SA')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32 w-full" /> : activities?.length === 0 ? (
              <EmptyState variant="daily-report" compact />
            ) : (
              <div className="space-y-3">
                {activities?.map((act: any) => {
                  const Icon = iconMap[act.type] || StickyNote;
                  return (
                    <div key={act.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{labelMap[act.type] || act.type}</span>
                          <span className="text-xs text-muted-foreground">{new Date(act.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {act.details && <p className="text-sm text-muted-foreground mt-1">{act.details}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
