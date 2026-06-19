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
import { Plus } from "lucide-react";
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
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); setOpen(false); toast.success("تم إنشاء الفاتورة"); },
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">إجمالي الإيرادات</p><p className="text-2xl font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString()} ر.س</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">مستحقات معلقة</p><p className="text-2xl font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString()} ر.س</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">عدد الفواتير</p><p className="text-2xl font-bold">{summary?.totalInvoices ?? 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>الطفل</TableHead><TableHead>المبلغ</TableHead><TableHead>الوصف</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({length:3}).map((_,i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
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
