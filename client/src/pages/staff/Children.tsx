import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useState } from "react";

export default function StaffChildren() {
  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const [search, setSearch] = useState("");

  const filtered = children?.filter((c: any) => {
    const fullName = `${c.firstName} ${c.lastName}`;
    const parent = users?.find((u: any) => u.id === c.parentId);
    const parentName = parent?.name ?? "";
    return fullName.includes(search) || parentName.includes(search);
  }) ?? [];

  const getClassName = (classId: number | null) => {
    if (!classId) return "-";
    return classes?.find((c: any) => c.id === classId)?.name ?? "-";
  };

  const getParentName = (parentId: number | null) => {
    if (!parentId) return "-";
    return users?.find((u: any) => u.id === parentId)?.name ?? "-";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">نشط</Badge>;
      case "inactive":
        return <Badge variant="secondary">غير نشط</Badge>;
      case "graduated":
        return <Badge className="bg-blue-100 text-blue-700">متخرج</Badge>;
      case "waitlist":
        return <Badge className="bg-yellow-100 text-yellow-700">قائمة انتظار</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأطفال</h1>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الفصل</TableHead>
                <TableHead>تاريخ الميلاد</TableHead>
                <TableHead>ولي الأمر</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    لا يوجد أطفال مسجلون
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((child: any) => (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                    <TableCell>{getClassName(child.classId)}</TableCell>
                    <TableCell>{child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString('ar-SA') : "-"}</TableCell>
                    <TableCell>{getParentName(child.parentId)}</TableCell>
                    <TableCell>{getStatusBadge(child.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
