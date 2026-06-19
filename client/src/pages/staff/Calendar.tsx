import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function StaffCalendar() {
  const { data: events, isLoading } = trpc.calendar.events.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("event");

  const create = trpc.calendar.create.useMutation({
    onSuccess: () => { utils.calendar.events.invalidate(); setOpen(false); setTitle(""); setDescription(""); toast.success("تم إضافة الحدث"); },
    onError: (e) => toast.error(e.message),
  });

  const typeColors: Record<string, string> = { event: "bg-blue-100 text-blue-700", holiday: "bg-red-100 text-red-700", trip: "bg-green-100 text-green-700", meeting: "bg-purple-100 text-purple-700" };
  const typeLabels: Record<string, string> = { event: "فعالية", holiday: "إجازة", trip: "رحلة", meeting: "اجتماع" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">التقويم</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />إضافة حدث</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>حدث جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>العنوان</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><Label>التاريخ</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><Label>النوع</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="event">فعالية</SelectItem><SelectItem value="holiday">إجازة</SelectItem><SelectItem value="trip">رحلة</SelectItem><SelectItem value="meeting">اجتماع</SelectItem></SelectContent></Select></div>
              <div><Label>الوصف</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate({ title, startDate: date, type: type as "holiday" | "event" | "meeting" | "deadline" | "other", description })} disabled={!title || !date || create.isPending}>{create.isPending ? "جاري..." : "إضافة"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {events?.map((ev: any) => (
          <Card key={ev.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CalIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ev.title}</span>
                  <Badge className={typeColors[ev.type] || ""}>{typeLabels[ev.type] || ev.type}</Badge>
                </div>
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
