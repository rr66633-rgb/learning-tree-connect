import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ParentFinance() {
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الفواتير والمدفوعات</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>الطفل</TableHead><TableHead>المبلغ</TableHead><TableHead>الوصف</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
              invoices?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد فواتير</TableCell></TableRow> :
              invoices?.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.childName}</TableCell>
                  <TableCell className="font-medium">{inv.amount?.toLocaleString()} ر.س</TableCell>
                  <TableCell>{inv.description}</TableCell>
                  <TableCell><Badge className={inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{inv.status === "paid" ? "مدفوعة" : "معلقة"}</Badge></TableCell>
                  <TableCell>{new Date(inv.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
