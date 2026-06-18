import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CreditCard, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pending: "secondary", paid: "default", overdue: "destructive", cancelled: "outline" };

export default function Finance() {
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const { data: summary } = trpc.finance.summary.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const createInvoice = trpc.finance.createInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success("تم إنشاء الفاتورة"); setOpen(false); },
    onError: () => toast.error("حدث خطأ"),
  });
  const markPaid = trpc.finance.markPaid.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success("تم تحديث حالة الفاتورة"); },
  });

  const [form, setForm] = useState({ childId: 0, parentId: 1, description: "", subtotal: "", dueDate: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId) { toast.error("يرجى اختيار الطفل"); return; }
    createInvoice.mutate({ ...form, childId: form.childId, parentId: form.parentId });
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المالية والفواتير</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />فاتورة جديدة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إنشاء فاتورة جديدة</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>الطفل</Label>
                <Select value={form.childId ? String(form.childId) : ""} onValueChange={v => setForm(f => ({ ...f, childId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                  <SelectContent>{children?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الوصف</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="رسوم الفصل الدراسي" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>المبلغ (ر.س)</Label><Input type="number" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} required /></div>
                <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
              </div>
              {form.subtotal && (
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>المبلغ الأساسي</span><span>{Number(form.subtotal).toLocaleString()} ر.س</span></div>
                  <div className="flex justify-between"><span>ضريبة القيمة المضافة (15%)</span><span>{(Number(form.subtotal) * 0.15).toLocaleString()} ر.س</span></div>
                  <div className="flex justify-between font-bold border-t pt-1"><span>الإجمالي</span><span>{(Number(form.subtotal) * 1.15).toLocaleString()} ر.س</span></div>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "جارٍ الإنشاء..." : "إنشاء الفاتورة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-600" /><div><p className="text-sm text-muted-foreground">الإيرادات</p><p className="text-xl font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString()} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-amber-600" /><div><p className="text-sm text-muted-foreground">معلقة</p><p className="text-xl font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString()} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-600" /><div><p className="text-sm text-muted-foreground">متأخرة</p><p className="text-xl font-bold text-red-600">{(summary?.overdueAmount ?? 0).toLocaleString()} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CreditCard className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">إجمالي الفواتير</p><p className="text-xl font-bold">{summary?.totalInvoices ?? 0}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الفواتير</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الضريبة</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الاستحقاق</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1,2,3,4,5].map(i => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
              ) : invoices && invoices.length > 0 ? (
                invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.description || "-"}</TableCell>
                    <TableCell>{Number(inv.subtotal).toLocaleString()} ر.س</TableCell>
                    <TableCell>{Number(inv.vatAmount).toLocaleString()} ر.س</TableCell>
                    <TableCell className="font-bold">{Number(inv.total).toLocaleString()} ر.س</TableCell>
                    <TableCell><Badge variant={statusColors[inv.status]}>{statusLabels[inv.status]}</Badge></TableCell>
                    <TableCell>{new Date(inv.dueDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      {inv.status === 'pending' && <Button size="sm" variant="default" onClick={() => markPaid.mutate({ id: inv.id })}>تأكيد الدفع</Button>}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد فواتير</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
