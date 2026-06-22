import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, CreditCard, TrendingUp, Clock, AlertTriangle, Send, RefreshCw, Download, FileText, Receipt, Undo2, CalendarClock, DollarSign, Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = { pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة", partially_paid: "مدفوعة جزئياً" };
const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-700", partially_paid: "bg-blue-100 text-blue-700" };
const invoiceTypeLabels: Record<string, string> = { tuition: "رسوم دراسية", activity: "نشاط", trip: "رحلة", uniform: "زي مدرسي", registration: "تسجيل", other: "أخرى" };
const frequencyLabels: Record<string, string> = { monthly: "شهري", quarterly: "ربع سنوي", semi_annual: "نصف سنوي", annual: "سنوي" };
const paymentMethodLabels: Record<string, string> = { cash: "نقدي", bank_transfer: "تحويل بنكي", card: "بطاقة", apple_pay: "Apple Pay", mada: "مدى", stc_pay: "STC Pay", visa: "فيزا", mastercard: "ماستركارد" };

export default function StaffFinance() {
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const { data: summary } = trpc.finance.summary.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const { data: allTransactions, isLoading: txLoading } = trpc.transactions.list.useQuery();
  const { data: allRefunds, isLoading: refundsLoading } = trpc.refunds.list.useQuery();
  const { data: tuitionPlans, isLoading: plansLoading } = trpc.tuitionPlans.list.useQuery();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const [openCreate, setOpenCreate] = useState(false);
  const [openMarkPaid, setOpenMarkPaid] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Mutations
  const createInvoice = trpc.finance.createInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success("تم إنشاء الفاتورة"); setOpenCreate(false); },
    onError: (e: any) => toast.error(e.message || "حدث خطأ أثناء إنشاء الفاتورة"),
  });
  const markPaid = trpc.finance.markPaid.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.transactions.list.invalidate(); toast.success("تم تأكيد الدفع"); setOpenMarkPaid(false); },
  });
  const sendReminder = trpc.finance.sendReminder.useMutation({
    onSuccess: () => toast.success("تم إرسال التذكير"),
    onError: () => toast.error("حدث خطأ"),
  });
  const deleteInvoice = trpc.finance.deleteInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success("تم حذف الفاتورة"); },
  });
  const createRefund = trpc.refunds.create.useMutation({
    onSuccess: () => { utils.refunds.list.invalidate(); utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.transactions.list.invalidate(); toast.success("تم الاسترداد بنجاح"); setOpenRefund(false); },
    onError: () => toast.error("حدث خطأ أثناء الاسترداد"),
  });
  const createPlan = trpc.tuitionPlans.create.useMutation({
    onSuccess: () => { utils.tuitionPlans.list.invalidate(); toast.success("تم إنشاء خطة الرسوم"); setOpenPlan(false); },
    onError: () => toast.error("حدث خطأ"),
  });
  const generateInvoices = trpc.tuitionPlans.generateInvoices.useMutation({
    onSuccess: (data: any) => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.tuitionPlans.list.invalidate(); toast.success(`تم إنشاء ${data.generated} فاتورة`); },
    onError: () => toast.error("حدث خطأ أثناء إنشاء الفواتير"),
  });

  // Forms
  const [form, setForm] = useState({ childId: 0, parentId: 0, description: "", subtotal: "", dueDate: "", invoiceType: "tuition" as string, isRecurring: false });
  const [markPaidForm, setMarkPaidForm] = useState({ paymentMethod: "cash" as string });
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "", transactionId: 0 });
  const [planForm, setPlanForm] = useState({ childId: 0, parentId: 0, name: "", amount: "", frequency: "monthly" as string, description: "", startDate: "", endDate: "" });

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv: any) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = inv.childName?.toLowerCase().includes(q);
        const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchDesc = inv.description?.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchDesc) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId) { toast.error("يرجى اختيار الطفل"); return; }
    createInvoice.mutate({
      childId: form.childId,
      parentId: form.parentId,
      description: form.description,
      subtotal: form.subtotal,
      dueDate: form.dueDate,
      invoiceType: form.invoiceType as any,
      isRecurring: form.isRecurring,
    });
  };

  const handleMarkPaid = () => {
    if (!selectedInvoice) return;
    markPaid.mutate({ id: selectedInvoice.id, paymentMethod: markPaidForm.paymentMethod as any });
  };

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    createRefund.mutate({
      invoiceId: selectedInvoice.id,
      transactionId: refundForm.transactionId || 0,
      amount: refundForm.amount,
      reason: refundForm.reason,
    });
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.childId || !planForm.parentId) { toast.error("يرجى اختيار الطفل وولي الأمر"); return; }
    createPlan.mutate({
      childId: planForm.childId,
      parentId: planForm.parentId,
      name: planForm.name,
      amount: planForm.amount,
      frequency: planForm.frequency as any,
      description: planForm.description,
      startDate: planForm.startDate,
      endDate: planForm.endDate || undefined,
    });
  };

  const handleExportCSV = () => {
    if (!invoices) return;
    const headers = ["رقم الفاتورة", "الطفل", "ولي الأمر", "الوصف", "المبلغ", "الضريبة", "الإجمالي", "الحالة", "تاريخ الاستحقاق", "تاريخ الدفع"];
    const rows = invoices.map((inv: any) => [
      inv.invoiceNumber,
      inv.childName || "",
      inv.parentName || "",
      inv.description || "",
      inv.subtotal,
      inv.vatAmount,
      inv.total,
      statusLabels[inv.status] || inv.status,
      new Date(inv.dueDate).toLocaleDateString('ar-SA'),
      inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('ar-SA') : "",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير التقرير");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">المالية والمدفوعات</h1>
            <p className="text-sm text-muted-foreground">إدارة الفواتير والمدفوعات والتقارير المالية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={!invoices?.length}>
            <Download className="h-4 w-4 ml-2" />تصدير
          </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />فاتورة جديدة</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>إنشاء فاتورة جديدة</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الطفل</Label>
                    <Select value={form.childId ? String(form.childId) : ""} onValueChange={v => {
                      const child = children?.find((c: any) => c.id === Number(v));
                      setForm(f => ({ ...f, childId: Number(v), parentId: (child as any)?.parentId || 0 }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                      <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.arabicName || `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>نوع الفاتورة</Label>
                    <Select value={form.invoiceType} onValueChange={v => setForm(f => ({ ...f, invoiceType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tuition">رسوم دراسية</SelectItem>
                        <SelectItem value="activity">نشاط</SelectItem>
                        <SelectItem value="trip">رحلة</SelectItem>
                        <SelectItem value="uniform">زي مدرسي</SelectItem>
                        <SelectItem value="registration">تسجيل</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>الوصف</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف الفاتورة" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>المبلغ (ر.س)</Label><Input type="number" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} required /></div>
                  <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.isRecurring} onCheckedChange={v => setForm(f => ({ ...f, isRecurring: v }))} />
                  <Label>فاتورة متكررة</Label>
                </div>
                {form.subtotal && (
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between"><span>المبلغ الأساسي</span><span>{Number(form.subtotal).toLocaleString('ar-SA')} ر.س</span></div>
                    <div className="flex justify-between"><span>ضريبة القيمة المضافة (15%)</span><span>{(Number(form.subtotal) * 0.15).toLocaleString('ar-SA')} ر.س</span></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>الإجمالي</span><span>{(Number(form.subtotal) * 1.15).toLocaleString('ar-SA')} ر.س</span></div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? "جارٍ الإنشاء..." : "إنشاء الفاتورة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-600 shrink-0" /><div><p className="text-xs text-muted-foreground">الإيرادات الكلية</p><p className="text-lg font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><DollarSign className="h-8 w-8 text-blue-600 shrink-0" /><div><p className="text-xs text-muted-foreground">إيرادات الشهر</p><p className="text-lg font-bold text-blue-600">{(summary?.thisMonthRevenue ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-amber-600 shrink-0" /><div><p className="text-xs text-muted-foreground">معلقة</p><p className="text-lg font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-600 shrink-0" /><div><p className="text-xs text-muted-foreground">متأخرة</p><p className="text-lg font-bold text-red-600">{(summary?.overdueAmount ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CreditCard className="h-8 w-8 text-primary shrink-0" /><div><p className="text-xs text-muted-foreground">إجمالي الفواتير</p><p className="text-lg font-bold">{summary?.totalInvoices ?? 0}</p></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 ml-1" />الفواتير</TabsTrigger>
          <TabsTrigger value="transactions"><Receipt className="h-4 w-4 ml-1" />المعاملات</TabsTrigger>
          <TabsTrigger value="refunds"><Undo2 className="h-4 w-4 ml-1" />الاستردادات</TabsTrigger>
          <TabsTrigger value="plans"><CalendarClock className="h-4 w-4 ml-1" />خطط الرسوم</TabsTrigger>
          <TabsTrigger value="reports"><TrendingUp className="h-4 w-4 ml-1" />التقارير</TabsTrigger>
        </TabsList>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>الفواتير</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pr-9 w-[200px]" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="pending">معلقة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="overdue">متأخرة</SelectItem>
                    <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">الطفل</TableHead>
                    <TableHead className="text-right">ولي الأمر</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-right">المدفوع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الاستحقاق</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [1,2,3,4,5].map(i => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv: any) => (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/staff/invoice/${inv.id}`)}>
                        <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.childName || "-"}</TableCell>
                        <TableCell>{inv.parentName || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{invoiceTypeLabels[inv.invoiceType] || "رسوم"}</Badge></TableCell>
                        <TableCell className="font-bold">{Number(inv.total).toLocaleString('ar-SA')} ر.س</TableCell>
                        <TableCell>{Number(inv.paidAmount || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                        <TableCell><Badge className={statusColors[inv.status]}>{statusLabels[inv.status]}</Badge></TableCell>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                            {(inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
                              <Button size="sm" variant="default" onClick={() => { setSelectedInvoice(inv); setOpenMarkPaid(true); }}>
                                <CreditCard className="h-3 w-3 ml-1" />دفع
                              </Button>
                            )}
                            {(inv.status === 'pending' || inv.status === 'overdue') && (
                              <Button size="sm" variant="outline" onClick={() => sendReminder.mutate({ id: inv.id })}>
                                <Send className="h-3 w-3 ml-1" />تذكير
                              </Button>
                            )}
                            {inv.status === 'paid' && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setRefundForm({ amount: inv.total, reason: "", transactionId: 0 }); setOpenRefund(true); }}>
                                <Undo2 className="h-3 w-3 ml-1" />استرداد
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد فواتير</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle>المعاملات المالية</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">الطفل</TableHead>
                    <TableHead className="text-right">ولي الأمر</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الطريقة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : allTransactions && allTransactions.length > 0 ? (
                    allTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-mono text-sm">{tx.invoiceNumber || "-"}</TableCell>
                        <TableCell>{tx.childFirstName ? `${tx.childFirstName} ${tx.childLastName || ''}` : "-"}</TableCell>
                        <TableCell>{tx.parentName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'refund' ? 'destructive' : 'default'}>
                            {tx.type === 'payment' ? 'دفع' : tx.type === 'refund' ? 'استرداد' : 'استرداد جزئي'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-bold ${tx.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.type === 'refund' ? '-' : '+'}{Number(tx.amount).toLocaleString('ar-SA')} ر.س
                        </TableCell>
                        <TableCell>{paymentMethodLabels[tx.method] || tx.method || "-"}</TableCell>
                        <TableCell>
                          <Badge className={tx.status === 'completed' ? 'bg-green-100 text-green-700' : tx.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {tx.status === 'completed' ? 'مكتمل' : tx.status === 'failed' ? 'فاشل' : 'قيد المعالجة'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد معاملات</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REFUNDS TAB */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader><CardTitle>الاستردادات</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">ولي الأمر</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">السبب</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundsLoading ? (
                    [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : allRefunds && allRefunds.length > 0 ? (
                    allRefunds.map((ref: any) => (
                      <TableRow key={ref.id}>
                        <TableCell>{new Date(ref.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-mono text-sm">{ref.invoiceNumber || "-"}</TableCell>
                        <TableCell>{ref.parentName || "-"}</TableCell>
                        <TableCell className="font-bold text-red-600">{Number(ref.amount).toLocaleString('ar-SA')} ر.س</TableCell>
                        <TableCell>{ref.reason || "-"}</TableCell>
                        <TableCell>
                          <Badge className={ref.status === 'completed' ? 'bg-green-100 text-green-700' : ref.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {ref.status === 'completed' ? 'مكتمل' : ref.status === 'failed' ? 'فاشل' : 'قيد المعالجة'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد استردادات</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TUITION PLANS TAB */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>خطط الرسوم الدراسية</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => generateInvoices.mutate()} disabled={generateInvoices.isPending}>
                  <RefreshCw className={`h-4 w-4 ml-2 ${generateInvoices.isPending ? 'animate-spin' : ''}`} />إنشاء الفواتير المستحقة
                </Button>
                <Dialog open={openPlan} onOpenChange={setOpenPlan}>
                  <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />خطة جديدة</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>إنشاء خطة رسوم دراسية</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreatePlan} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>الطفل</Label>
                          <Select value={planForm.childId ? String(planForm.childId) : ""} onValueChange={v => {
                            const child = children?.find((c: any) => c.id === Number(v));
                            setPlanForm(f => ({ ...f, childId: Number(v), parentId: (child as any)?.parentId || 0 }));
                          }}>
                            <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                            <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.arabicName || `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>التكرار</Label>
                          <Select value={planForm.frequency} onValueChange={v => setPlanForm(f => ({ ...f, frequency: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">شهري</SelectItem>
                              <SelectItem value="quarterly">ربع سنوي</SelectItem>
                              <SelectItem value="semi_annual">نصف سنوي</SelectItem>
                              <SelectItem value="annual">سنوي</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>اسم الخطة</Label><Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="رسوم الفصل الأول" required /></div>
                      <div><Label>المبلغ (ر.س)</Label><Input type="number" step="0.01" value={planForm.amount} onChange={e => setPlanForm(f => ({ ...f, amount: e.target.value }))} required /></div>
                      <div><Label>الوصف</Label><Input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف اختياري" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>تاريخ البدء</Label><Input type="date" value={planForm.startDate} onChange={e => setPlanForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
                        <div><Label>تاريخ الانتهاء (اختياري)</Label><Input type="date" value={planForm.endDate} onChange={e => setPlanForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                      </div>
                      <Button type="submit" className="w-full" disabled={createPlan.isPending}>
                        {createPlan.isPending ? "جارٍ الإنشاء..." : "إنشاء الخطة"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الطفل</TableHead>
                    <TableHead className="text-right">ولي الأمر</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">التكرار</TableHead>
                    <TableHead className="text-right">الفوترة القادمة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plansLoading ? (
                    [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : tuitionPlans && tuitionPlans.length > 0 ? (
                    tuitionPlans.map((plan: any) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{plan.childFirstName ? `${plan.childFirstName} ${plan.childLastName || ''}` : "-"}</TableCell>
                        <TableCell>{plan.parentName || "-"}</TableCell>
                        <TableCell className="font-bold">{Number(plan.amount).toLocaleString('ar-SA')} ر.س</TableCell>
                        <TableCell>{frequencyLabels[plan.frequency] || plan.frequency}</TableCell>
                        <TableCell>{plan.nextBillingDate ? new Date(plan.nextBillingDate).toLocaleDateString('ar-SA') : "-"}</TableCell>
                        <TableCell>
                          <Badge className={plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {plan.isActive ? 'نشطة' : 'متوقفة'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد خطط رسوم</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>ملخص مالي</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">إجمالي الإيرادات</span>
                  <span className="font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">إيرادات الشهر الحالي</span>
                  <span className="font-bold text-blue-600">{(summary?.thisMonthRevenue ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">المبالغ المعلقة</span>
                  <span className="font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">المبالغ المتأخرة</span>
                  <span className="font-bold text-red-600">{(summary?.overdueAmount ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">المدفوعة جزئياً</span>
                  <span className="font-bold">{(summary?.partiallyPaidAmount ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>إحصائيات الفواتير</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">إجمالي الفواتير</span>
                  <span className="font-bold">{summary?.totalInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">فواتير مدفوعة</span>
                  <span className="font-bold text-green-600">{summary?.paidInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">فواتير معلقة</span>
                  <span className="font-bold text-amber-600">{summary?.pendingInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">فواتير متأخرة</span>
                  <span className="font-bold text-red-600">{summary?.overdueInvoices ?? 0}</span>
                </div>
                <div className="pt-4">
                  <Button variant="outline" className="w-full" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 ml-2" />تصدير التقرير المالي (CSV)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Mark as Paid Dialog */}
      <Dialog open={openMarkPaid} onOpenChange={setOpenMarkPaid}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الدفع</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p><strong>الفاتورة:</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>المبلغ:</strong> {Number(selectedInvoice.total).toLocaleString('ar-SA')} ر.س</p>
              </div>
            )}
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={markPaidForm.paymentMethod} onValueChange={v => setMarkPaidForm({ paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                  <SelectItem value="mada">مدى</SelectItem>
                  <SelectItem value="apple_pay">Apple Pay</SelectItem>
                  <SelectItem value="stc_pay">STC Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMarkPaid(false)}>إلغاء</Button>
            <Button onClick={handleMarkPaid} disabled={markPaid.isPending}>
              {markPaid.isPending ? "جارٍ التأكيد..." : "تأكيد الدفع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={openRefund} onOpenChange={setOpenRefund}>
        <DialogContent>
          <DialogHeader><DialogTitle>استرداد المبلغ</DialogTitle></DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            {selectedInvoice && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p><strong>الفاتورة:</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>المبلغ الأصلي:</strong> {Number(selectedInvoice.total).toLocaleString('ar-SA')} ر.س</p>
              </div>
            )}
            <div><Label>مبلغ الاسترداد (ر.س)</Label><Input type="number" step="0.01" value={refundForm.amount} onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><Label>سبب الاسترداد</Label><Textarea value={refundForm.reason} onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))} placeholder="أدخل سبب الاسترداد" required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenRefund(false)}>إلغاء</Button>
              <Button type="submit" variant="destructive" disabled={createRefund.isPending}>
                {createRefund.isPending ? "جارٍ الاسترداد..." : "تأكيد الاسترداد"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
