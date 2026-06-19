import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt } from "lucide-react";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = { pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-700" };

export default function ParentFinance() {
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const [, navigate] = useLocation();

  const totalPending = invoices?.filter((inv: any) => inv.status === 'pending' || inv.status === 'overdue').reduce((sum: number, inv: any) => sum + Number(inv.total), 0) ?? 0;

  const handleInvoiceClick = (id: number) => {
    navigate(`/parent/invoice/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الفواتير والمدفوعات</h1>
        {totalPending > 0 && (
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 px-3 py-1">
            مستحق: {totalPending.toLocaleString('ar-SA')} ر.س
          </Badge>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">الطفل</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                invoices?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد فواتير</TableCell></TableRow> :
                invoices?.map((inv: any) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleInvoiceClick(inv.id)}>
                    <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{inv.childName || "—"}</TableCell>
                    <TableCell className="font-bold text-nowrap">{Number(inv.total).toLocaleString('ar-SA')} ر.س</TableCell>
                    <TableCell className="max-w-[200px] truncate">{inv.description || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[inv.status]}>
                        {statusLabels[inv.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-nowrap">{new Date(inv.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? Array.from({length:3}).map((_,i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        )) : invoices?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">لا توجد فواتير</p>
            </CardContent>
          </Card>
        ) : invoices?.map((inv: any) => (
          <Card key={inv.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]" onClick={() => handleInvoiceClick(inv.id)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{inv.childName || "—"}</span>
                <Badge className={statusColors[inv.status]}>
                  {statusLabels[inv.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{inv.description || "بدون وصف"}</span>
                <span className="font-bold text-lg">{Number(inv.total).toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                <span>{inv.invoiceNumber}</span>
                <span>{new Date(inv.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
