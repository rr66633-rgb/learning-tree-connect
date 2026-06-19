import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function StaffFinance() {
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const { data: summary } = trpc.finance.summary.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const create = trpc.finance.createInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); setOpen(false); setChildId(""); setAmount(""); setDescription(""); toast.success("تم إنشاء الفاتورة"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المالية</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />فاتورة جديدة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إنشاء فاتورة</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>الطفل</Label>
                <Select value={childId} onValueChange={setChildId}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>المبلغ (ر.س)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div><Label>الوصف</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="رسوم شهرية" /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate({ childId: parseInt(childId), parentId: 0, subtotal: amount, description, dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0] })} disabled={!childId || !amount || create.isPending}>{create.isPending ? "جاري..." : "إنشاء"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-xl font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString('ar-SA')} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">مستحقات معلقة</p>
              <p className="text-xl font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString('ar-SA')} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">عدد الفواتير</p>
              <p className="text-xl font-bold">{summary?.totalInvoices ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الطفل</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({length:3}).map((_,i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                invoices?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد فواتير</TableCell></TableRow>
                ) :
                invoices?.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.childName || "—"}</TableCell>
                    <TableCell className="font-bold text-nowrap">{Number(inv.total).toLocaleString('ar-SA')} ر.س</TableCell>
                    <TableCell className="max-w-[200px] truncate">{inv.description || "—"}</TableCell>
                    <TableCell>
                      <Badge className={inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                        {inv.status === "paid" ? "مدفوعة" : inv.status === "overdue" ? "متأخرة" : "معلقة"}
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
          <Card><CardContent className="p-6 text-center text-muted-foreground">لا توجد فواتير</CardContent></Card>
        ) : invoices?.map((inv: any) => (
          <Card key={inv.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{inv.childName || "—"}</span>
                <Badge className={inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                  {inv.status === "paid" ? "مدفوعة" : inv.status === "overdue" ? "متأخرة" : "معلقة"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{inv.description || "بدون وصف"}</span>
                <span className="font-bold text-lg">{Number(inv.total).toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                <span>رقم الفاتورة: {inv.invoiceNumber}</span>
                <span>{new Date(inv.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
