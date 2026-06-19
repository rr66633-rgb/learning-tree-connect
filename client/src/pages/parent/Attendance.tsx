import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";

export default function ParentAttendance() {
  const { data: children } = trpc.children.list.useQuery();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const { data: records, isLoading } = trpc.attendance.byChild.useQuery(
    { childId: parseInt(selectedChild || "0") },
    { enabled: !!selectedChild }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">سجل الحضور</h1>
      <Select value={selectedChild} onValueChange={setSelectedChild}>
        <SelectTrigger className="max-w-xs"><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
        <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
      </Select>
      {selectedChild && (
        <Card>
          <CardHeader><CardTitle>سجل الحضور</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32 w-full" /> : records?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد سجلات حضور</p>
            ) : (
              <div className="space-y-2">
                {records?.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{new Date(r.date).toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <Badge className={r.status === "present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {r.status === "present" ? "حاضر" : "غائب"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
