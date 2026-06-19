import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Clock, CheckCircle2, Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = { pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-700" };

export default function StaffFinance() {
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const { data: summary } = trpc.finance.summary.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [childFilter, setChildFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const create = trpc.finance.createInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); setOpen(false); setChildId(""); setAmount(""); setDescription(""); setDueDate(""); toast.success("تم إنشاء الفاتورة"); },
    onError: (e) => toast.error(e.message),
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv: any) => {
      // Search by child name or invoice number
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = inv.childName?.toLowerCase().includes(q);
        const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchDesc = inv.description?.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchDesc) return false;
      }
      // Status filter
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      // Child filter
      if (childFilter !== "all" && inv.childId?.toString() !== childFilter) return false;
      // Date range
      if (dateFrom) {
        const invDate = new Date(inv.createdAt);
        if (invDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const invDate = new Date(inv.createdAt);
        if (invDate > new Date(dateTo + "T23:59:59")) return false;
      }
      return true;
    });
  }, [invoices, searchQuery, statusFilter, childFilter, dateFrom, dateTo]);

  const handleInvoiceClick = (id: number) => {
    navigate(`/staff/invoice/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">إدارة المالية</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />فاتورة جديدة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إنشاء فاتورة</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>الطفل</Label>
                <Select value={childId} onValueChange={setChildId}><SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                  <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>المبلغ قبل الضريبة (ر.س)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
              <div><Label>الوصف</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="رسوم شهرية" /></div>
              <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate({ childId: parseInt(childId), parentId: 0, subtotal: amount, description, dueDate: dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0] })} disabled={!childId || !amount || create.isPending}>{create.isPending ? "جاري..." : "إنشاء"}</Button></DialogFooter>
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

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pr-9" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلقة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={childFilter} onValueChange={setChildFilter}>
              <SelectTrigger><SelectValue placeholder="الطفل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأطفال</SelectItem>
                {children?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="من تاريخ" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="إلى تاريخ" />
          </div>
          {(searchQuery || statusFilter !== "all" || childFilter !== "all" || dateFrom || dateTo) && (
            <div className="mt-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">عرض {filteredInvoices.length} من {invoices?.length || 0} فاتورة</span>
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setChildFilter("all"); setDateFrom(""); setDateTo(""); }}>مسح الفلاتر</Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                {isLoading ? Array.from({length:3}).map((_,i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد فواتير</TableCell></TableRow>
                ) :
                filteredInvoices.map((inv: any) => (
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
        )) : filteredInvoices.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">لا توجد فواتير</CardContent></Card>
        ) : filteredInvoices.map((inv: any) => (
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
