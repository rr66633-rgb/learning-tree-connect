import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export default function StaffAttendance() {
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: records } = trpc.attendance.byDate.useQuery({ date: new Date().toISOString().split("T")[0] });
  const utils = trpc.useUtils();
  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الحضور"); },
  });
  const markAbsent = trpc.attendance.markAbsent.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success("تم تسجيل الغياب"); },
  });

  const getStatus = (childId: number) => records?.find((r: any) => r.childId === childId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">حضور الأطفال</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('ar-SA')}</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطفل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              )) : children?.map((child: any) => {
                const record = getStatus(child.id);
                return (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                    <TableCell>
                      {record?.status === "present" ? <Badge className="bg-green-100 text-green-700">حاضر</Badge> :
                       record?.status === "absent" ? <Badge variant="destructive">غائب</Badge> :
                       <Badge variant="secondary">لم يُسجل</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-green-600" onClick={() => checkIn.mutate({ childId: child.id, date: new Date().toISOString().split("T")[0] })} disabled={record?.status === "present"}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => markAbsent.mutate({ childId: child.id, date: new Date().toISOString().split("T")[0], status: "absent" as const })} disabled={record?.status === "absent"}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
