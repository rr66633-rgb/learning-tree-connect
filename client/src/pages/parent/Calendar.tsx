import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalIcon } from "lucide-react";

export default function ParentCalendar() {
  const { data: events } = trpc.calendar.events.useQuery();
  const typeColors: Record<string, string> = { event: "bg-blue-100 text-blue-700", holiday: "bg-red-100 text-red-700", trip: "bg-green-100 text-green-700", meeting: "bg-purple-100 text-purple-700" };
  const typeLabels: Record<string, string> = { event: "فعالية", holiday: "إجازة", trip: "رحلة", meeting: "اجتماع" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التقويم</h1>
      <div className="space-y-3">
        {events?.map((ev: any) => (
          <Card key={ev.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><CalIcon className="h-5 w-5 text-primary" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-medium">{ev.title}</span><Badge className={typeColors[ev.type] || ""}>{typeLabels[ev.type] || ev.type}</Badge></div>
                <p className="text-sm text-muted-foreground">{new Date(ev.date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {ev.description && <p className="text-sm mt-1">{ev.description}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!events || events.length === 0) && <p className="text-center text-muted-foreground py-8">لا توجد أحداث قادمة</p>}
      </div>
    </div>
  );
}
