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
import { Plus, CreditCard, TrendingUp, Clock, AlertTriangle, Send, RefreshCw, Download, FileText, Receipt, Undo2, CalendarClock, DollarSign } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createCsv, saveOrShareFile } from "@/lib/fileExport";

const getStatusLabels = (isAr: boolean): Record<string, string>  => ({ pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة", partially_paid: "مدفوعة جزئياً" });
const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pending: "secondary", paid: "default", overdue: "destructive", cancelled: "outline", partially_paid: "secondary" };
const getInvoiceTypeLabels = (isAr: boolean): Record<string, string>  => ({ tuition: (isAr ? "رسوم دراسية" : "Tuition Fees"), activity: (isAr ? "نشاط" : "Activity"), trip: (isAr ? "رحلة" : "Trip"), uniform: (isAr ? "زي مدرسي" : "School Uniform"), registration: (isAr ? "تسجيل" : "Register"), other: (isAr ? "أخرى" : "Other") });
const getFrequencyLabels = (isAr: boolean): Record<string, string>  => ({ monthly: (isAr ? "شهري" : "Monthly"), quarterly: (isAr ? "ربع سنوي" : "Quarterly"), semi_annual: (isAr ? "نصف سنوي" : "Semi-Annually"), annual: (isAr ? "سنوي" : "Annual") });
const getPaymentMethodLabels = (isAr: boolean): Record<string, string>  => ({ cash: (isAr ? "نقدي" : "Cash"), bank_transfer: (isAr ? "تحويل بنكي" : "Bank Transfer"), card: (isAr ? "بطاقة" : "Card"), apple_pay: "Apple Pay", mada: (isAr ? "مدى" : "Mada"), stc_pay: "STC Pay", visa: (isAr ? "فيزا" : "Visa"), mastercard: (isAr ? "ماستركارد" : "Mastercard") });

export default function Finance() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const { data: summary } = trpc.finance.summary.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const { data: allTransactions, isLoading: txLoading } = trpc.transactions.list.useQuery();
  const { data: allRefunds, isLoading: refundsLoading } = trpc.refunds.list.useQuery();
  const { data: tuitionPlans, isLoading: plansLoading } = trpc.tuitionPlans.list.useQuery();
  const utils = trpc.useUtils();

  const [openCreate, setOpenCreate] = useState(false);
  const [openMarkPaid, setOpenMarkPaid] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Mutations
  const createInvoice = trpc.finance.createInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success(isAr ? "تم إنشاء الفاتورة" : "Invoice created"); setOpenCreate(false); },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء إنشاء الفاتورة" : "Error while creating invoice"),
  });
  const markPaid = trpc.finance.markPaid.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.transactions.list.invalidate(); toast.success(isAr ? "تم تأكيد الدفع" : "Payment confirmed"); setOpenMarkPaid(false); },
  });
  const sendReminder = trpc.finance.sendReminder.useMutation({
    onSuccess: () => toast.success(isAr ? "تم إرسال التذكير" : "Reminder sent"),
    onError: () => toast.error(isAr ? "حدث خطأ" : "An error occurred"),
  });
  const deleteInvoice = trpc.finance.deleteInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success(isAr ? "تم حذف الفاتورة" : "Invoice deleted"); },
  });
  const createRefund = trpc.refunds.create.useMutation({
    onSuccess: () => { utils.refunds.list.invalidate(); utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.transactions.list.invalidate(); toast.success(isAr ? "تم الاسترداد بنجاح" : "Refund successful"); setOpenRefund(false); },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء الاسترداد" : "Error while refunding"),
  });
  const createPlan = trpc.tuitionPlans.create.useMutation({
    onSuccess: () => { utils.tuitionPlans.list.invalidate(); toast.success(isAr ? "تم إنشاء خطة الرسوم" : "Tuition plan created"); setOpenPlan(false); },
    onError: () => toast.error(isAr ? "حدث خطأ" : "An error occurred"),
  });
  const generateInvoices = trpc.tuitionPlans.generateInvoices.useMutation({
    onSuccess: (data) => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.tuitionPlans.list.invalidate(); toast.success(isAr ? `تم إنشاء ${data.generated} فاتورة` : `Created${data.generated}Invoice`); },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء إنشاء الفواتير" : "Error while creating invoices"),
  });

  // Forms
  const [form, setForm] = useState({ childId: 0, parentId: 0, description: "", subtotal: "", dueDate: "", invoiceType: "tuition" as string, isRecurring: false });
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [markPaidForm, setMarkPaidForm] = useState({ paymentMethod: "cash" as string });
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "", transactionId: 0 });
  const [planForm, setPlanForm] = useState({ childId: 0, parentId: 0, name: "", amount: "", frequency: "monthly" as string, description: "", startDate: "", endDate: "" });

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      return true;
    });
  }, [invoices, statusFilter, typeFilter]);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId) { toast.error(isAr ? "يرجى اختيار الطفل" : "Please select a child"); return; }
    if (!form.parentId) { toast.error(isAr ? "يرجى اختيار ولي الأمر" : "Please select a parent"); return; }
    createInvoice.mutate({
      childId: form.childId,
      parentId: form.parentId,
      description: form.description,
      subtotal: form.subtotal,
      dueDate: form.dueDate,
      invoiceType: form.invoiceType as any,
      isRecurring: form.isRecurring,
      taxInclusive,
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
    if (!planForm.childId || !planForm.parentId) { toast.error(isAr ? "يرجى اختيار الطفل وولي الأمر" : "Please select child and parent"); return; }
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

  const handleExportCSV = async () => {
    if (!invoices) return;
    const headers = ["رقم الفاتورة", (isAr ? "الطفل" : "Child"), "ولي الأمر", "الوصف", "المبلغ", "الضريبة", (isAr ? "الإجمالي" : "Total"), "الحالة", "تاريخ الاستحقاق", (isAr ? "تاريخ الدفع" : "Payment Date")];
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.childName || "",
      inv.parentName || "",
      inv.description || "",
      inv.subtotal,
      inv.vatAmount,
      inv.total,
      getStatusLabels(isAr)[inv.status] || inv.status,
      new Date(inv.dueDate).toLocaleDateString('ar-SA'),
      inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('ar-SA') : "",
    ]);
    try {
      const result = await saveOrShareFile(
        createCsv(headers, rows),
        `invoices_${new Date().toISOString().split('T')[0]}.csv`,
        "text/csv;charset=utf-8",
        isAr ? "المالية والمدفوعات" : "Finance & Payments",
      );
      if (result !== "cancelled") toast.success(isAr ? "تم تصدير التقرير" : "Report exported");
    } catch {
      toast.error(isAr ? "تعذّر تصدير الملف، حاول مرة أخرى" : "Could not export the file. Please try again.");
    }
  };

  // Get parent for selected child
  const selectedChild = children?.find(c => c.id === form.childId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "المالية والمدفوعات" : "Finance & Payments"}</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={handleExportCSV} disabled={!invoices?.length}>
            <Download className="h-4 w-4 ml-2" />{isAr ? "تصدير" : "Export"}
          </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />{isAr ? "فاتورة جديدة" : "New Invoice"}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{isAr ? "إنشاء فاتورة جديدة" : "Create New Invoice"}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{isAr ? "الطفل" : "Child"}</Label>
                    <Select value={form.childId ? String(form.childId) : ""} onValueChange={v => {
                      const child = children?.find(c => c.id === Number(v));
                      setForm(f => ({ ...f, childId: Number(v), parentId: child?.parentId || 0 }));
                    }}>
                      <SelectTrigger><SelectValue placeholder={isAr ? "اختر الطفل" : "Select Child"} /></SelectTrigger>
                      <SelectContent>{children?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.arabicName || `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{isAr ? "نوع الفاتورة" : "Invoice Type"}</Label>
                    <Select value={form.invoiceType} onValueChange={v => setForm(f => ({ ...f, invoiceType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tuition">{isAr ? "رسوم دراسية" : "Tuition Fees"}</SelectItem>
                        <SelectItem value="activity">{isAr ? "نشاط" : "Activity"}</SelectItem>
                        <SelectItem value="trip">{isAr ? "رحلة" : "Trip"}</SelectItem>
                        <SelectItem value="uniform">{isAr ? "زي مدرسي" : "School Uniform"}</SelectItem>
                        <SelectItem value="registration">{isAr ? "تسجيل" : "Register"}</SelectItem>
                        <SelectItem value="other">{isAr ? "أخرى" : "Other"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>{isAr ? "الوصف" : "Description"}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={isAr ? "وصف الفاتورة" : "Invoice Description"} required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>{isAr ? "المبلغ (ر.س)" : "Amount (SAR)"}</Label><Input type="number" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} required /></div>
                  <div><Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.isRecurring} onCheckedChange={v => setForm(f => ({ ...f, isRecurring: v }))} />
                  <Label>{isAr ? "فاتورة متكررة" : "Recurring Invoice"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={taxInclusive} onCheckedChange={v => setTaxInclusive(v)} />
                  <Label>{isAr ? "الضريبة مشمولة بالسعر" : "Tax included in price"}</Label>
                </div>
                {form.subtotal && (
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    {taxInclusive ? (
                      <>
                        <div className="flex justify-between"><span>{isAr ? "المبلغ شامل الضريبة" : "Amount (Tax Inclusive)"}</span><span>{Number(form.subtotal).toLocaleString('ar-SA')} ر.س</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>{isAr ? "المبلغ الأساسي" : "Base Amount"}</span><span>{(Number(form.subtotal) / 1.15).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>{isAr ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span><span>{(Number(form.subtotal) - Number(form.subtotal) / 1.15).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س</span></div>
                        <div className="flex justify-between font-bold border-t pt-1"><span>{isAr ? "الإجمالي (يدفعه ولي الأمر)" : "Total (Parent pays)"}</span><span>{Number(form.subtotal).toLocaleString('ar-SA')} ر.س</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span>{isAr ? "المبلغ الأساسي" : "Base Amount"}</span><span>{Number(form.subtotal).toLocaleString('ar-SA')} ر.س</span></div>
                        <div className="flex justify-between"><span>{isAr ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span><span>{(Number(form.subtotal) * 0.15).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س</span></div>
                        <div className="flex justify-between font-bold border-t pt-1"><span>{isAr ? "الإجمالي (يدفعه ولي الأمر)" : "Total (Parent pays)"}</span><span>{(Number(form.subtotal) * 1.15).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س</span></div>
                      </>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? (isAr ? "جارٍ الإنشاء..." : "Creating...") : (isAr ? "إنشاء الفاتورة" : "Create Invoice")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{isAr ? "الإيرادات الكلية" : "Total Revenue"}</p><p className="text-lg font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><DollarSign className="h-8 w-8 text-blue-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{isAr ? "إيرادات الشهر" : "Monthly Revenue"}</p><p className="text-lg font-bold text-blue-600">{(summary?.thisMonthRevenue ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-amber-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{isAr ? "معلقة" : "Pending"}</p><p className="text-lg font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{isAr ? "متأخرة" : "Overdue"}</p><p className="text-lg font-bold text-red-600">{(summary?.overdueAmount ?? 0).toLocaleString('ar-SA')} ر.س</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CreditCard className="h-8 w-8 text-primary shrink-0" /><div><p className="text-xs text-muted-foreground">{isAr ? "إجمالي الفواتير" : "Total Invoices"}</p><p className="text-lg font-bold">{summary?.totalInvoices ?? 0}</p></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-5">
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 ml-1" />{isAr ? "الفواتير" : "Invoices"}</TabsTrigger>
          <TabsTrigger value="transactions"><Receipt className="h-4 w-4 ml-1" />{isAr ? "المعاملات" : "Transactions"}</TabsTrigger>
          <TabsTrigger value="refunds"><Undo2 className="h-4 w-4 ml-1" />{isAr ? "الاستردادات" : "Refunds"}</TabsTrigger>
          <TabsTrigger value="plans"><CalendarClock className="h-4 w-4 ml-1" />{isAr ? "خطط الرسوم" : "Fee Plans"}</TabsTrigger>
          <TabsTrigger value="reports"><TrendingUp className="h-4 w-4 ml-1" />{isAr ? "التقارير" : "Reports"}</TabsTrigger>
        </TabsList>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAr ? "الفواتير" : "Invoices"}</CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder={isAr ? "الحالة" : "Status"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="pending">{isAr ? "معلقة" : "Pending"}</SelectItem>
                    <SelectItem value="paid">{isAr ? "مدفوعة" : "Paid"}</SelectItem>
                    <SelectItem value="overdue">{isAr ? "متأخرة" : "Overdue"}</SelectItem>
                    <SelectItem value="partially_paid">{isAr ? "مدفوعة جزئياً" : "Partially Paid"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{isAr ? "رقم الفاتورة" : "Invoice Number"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الطفل" : "Child"}</TableHead>
                    <TableHead className="text-right">{isAr ? "ولي الأمر" : "Parent"}</TableHead>
                    <TableHead className="text-right">{isAr ? "النوع" : "Type"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead className="text-right">{isAr ? "المدفوع" : "Paid"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الاستحقاق" : "Entitlement"}</TableHead>
                    <TableHead className="text-right">{isAr ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [1,2,3,4,5].map(i => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : filteredInvoices.length > 0 ? (
                    filteredInvoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.childName || "-"}</TableCell>
                        <TableCell>{inv.parentName || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{getInvoiceTypeLabels(isAr)[(inv as any).invoiceType] || "رسوم"}</Badge></TableCell>
                        <TableCell className="font-bold">{Number(inv.total).toLocaleString('ar-SA')} ر.س</TableCell>
                        <TableCell>{Number((inv as any).paidAmount || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                        <TableCell><Badge variant={statusColors[inv.status]}>{getStatusLabels(isAr)[inv.status]}</Badge></TableCell>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
                              <Button size="sm" variant="default" onClick={() => { setSelectedInvoice(inv); setOpenMarkPaid(true); }}>
                                <CreditCard className="h-3 w-3 ml-1" />{isAr ? "دفع" : "Pay"}
                              </Button>
                            )}
                            {(inv.status === 'pending' || inv.status === 'overdue') && (
                              <Button size="sm" variant="outline" onClick={() => sendReminder.mutate({ id: inv.id })}>
                                <Send className="h-3 w-3 ml-1" />{isAr ? "تذكير" : "Reminder"}
                              </Button>
                            )}
                            {inv.status === 'paid' && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setRefundForm({ amount: inv.total, reason: "", transactionId: 0 }); setOpenRefund(true); }}>
                                <Undo2 className="h-3 w-3 ml-1" />{isAr ? "استرداد" : "Refund"}
                              </Button>
                            )}
                            {inv.status === 'pending' && (
                              <Button size="sm" variant="destructive" onClick={() => { if (confirm((isAr ? "هل أنت متأكد من حذف هذه الفاتورة؟" : "Are you sure you want to delete this invoice?"))) deleteInvoice.mutate({ id: inv.id }); }}>
                                {isAr ? "حذف" : "Delete"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{isAr ? "لا توجد فواتير" : "No invoices"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle>{isAr ? "المعاملات المالية" : "Financial Transactions"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{isAr ? "التاريخ" : "Date"}</TableHead>
                    <TableHead className="text-right">{isAr ? "رقم الفاتورة" : "Invoice Number"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الطفل" : "Child"}</TableHead>
                    <TableHead className="text-right">{isAr ? "ولي الأمر" : "Parent"}</TableHead>
                    <TableHead className="text-right">{isAr ? "النوع" : "Type"}</TableHead>
                    <TableHead className="text-right">{isAr ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الطريقة" : "Method"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
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
                            {tx.type === 'payment' ? (isAr ? "دفع" : "Pay") : tx.type === 'refund' ? (isAr ? "استرداد" : "Refund") : (isAr ? "استرداد جزئي" : "Partial Refund")}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-bold ${tx.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.type === 'refund' ? '-' : '+'}{Number(tx.amount).toLocaleString('ar-SA')} ر.س
                        </TableCell>
                        <TableCell>{getPaymentMethodLabels(isAr)[tx.method] || tx.method || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'completed' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}>
                            {tx.status === 'completed' ? (isAr ? "مكتمل" : "Completed") : tx.status === 'failed' ? (isAr ? "فاشل" : "Failed") : (isAr ? "قيد المعالجة" : "Processing")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{isAr ? "لا توجد معاملات" : "No transactions"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REFUNDS TAB */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader><CardTitle>{isAr ? "الاستردادات" : "Refunds"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{isAr ? "التاريخ" : "Date"}</TableHead>
                    <TableHead className="text-right">{isAr ? "رقم الفاتورة" : "Invoice Number"}</TableHead>
                    <TableHead className="text-right">{isAr ? "ولي الأمر" : "Parent"}</TableHead>
                    <TableHead className="text-right">{isAr ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead className="text-right">{isAr ? "السبب" : "Reason"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
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
                          <Badge variant={ref.status === 'completed' ? 'default' : ref.status === 'failed' ? 'destructive' : 'secondary'}>
                            {ref.status === 'completed' ? (isAr ? "مكتمل" : "Completed") : ref.status === 'failed' ? (isAr ? "فاشل" : "Failed") : (isAr ? "قيد المعالجة" : "Processing")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{isAr ? "لا توجد استردادات" : "No refunds"}</TableCell></TableRow>
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
              <CardTitle>{isAr ? "خطط الرسوم الدراسية" : "Tuition Fee Plans"}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => generateInvoices.mutate()} disabled={generateInvoices.isPending}>
                  <RefreshCw className={`h-4 w-4 ml-2 ${generateInvoices.isPending ? 'animate-spin' : ''}`} />إنشاء الفواتير المستحقة
                </Button>
                <Dialog open={openPlan} onOpenChange={setOpenPlan}>
                  <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />{isAr ? "خطة جديدة" : "New Plan"}</Button></DialogTrigger>
                  <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
                    <DialogHeader><DialogTitle>{isAr ? "إنشاء خطة رسوم دراسية" : "Create Tuition Fee Plan"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreatePlan} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>{isAr ? "الطفل" : "Child"}</Label>
                          <Select value={planForm.childId ? String(planForm.childId) : ""} onValueChange={v => {
                            const child = children?.find(c => c.id === Number(v));
                            setPlanForm(f => ({ ...f, childId: Number(v), parentId: child?.parentId || 0 }));
                          }}>
                            <SelectTrigger><SelectValue placeholder={isAr ? "اختر الطفل" : "Select Child"} /></SelectTrigger>
                            <SelectContent>{children?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.arabicName || `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{isAr ? "التكرار" : "Repetition"}</Label>
                          <Select value={planForm.frequency} onValueChange={v => setPlanForm(f => ({ ...f, frequency: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">{isAr ? "شهري" : "Monthly"}</SelectItem>
                              <SelectItem value="quarterly">{isAr ? "ربع سنوي" : "Quarterly"}</SelectItem>
                              <SelectItem value="semi_annual">{isAr ? "نصف سنوي" : "Semi-Annually"}</SelectItem>
                              <SelectItem value="annual">{isAr ? "سنوي" : "Annual"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>{isAr ? "اسم الخطة" : "Plan Name"}</Label><Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="رسوم الفصل الأول" required /></div>
                      <div><Label>{isAr ? "المبلغ (ر.س)" : "Amount (SAR)"}</Label><Input type="number" step="0.01" value={planForm.amount} onChange={e => setPlanForm(f => ({ ...f, amount: e.target.value }))} required /></div>
                      <div><Label>{isAr ? "الوصف" : "Description"}</Label><Input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف اختياري" /></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><Label>{isAr ? "تاريخ البدء" : "Start Date"}</Label><Input type="date" value={planForm.startDate} onChange={e => setPlanForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
                        <div><Label>{isAr ? "تاريخ الانتهاء (اختياري)" : "End Date (Optional)"}</Label><Input type="date" value={planForm.endDate} onChange={e => setPlanForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                      </div>
                      <Button type="submit" className="w-full" disabled={createPlan.isPending}>
                        {createPlan.isPending ? (isAr ? "جارٍ الإنشاء..." : "Creating...") : (isAr ? "إنشاء الخطة" : "Create Plan")}
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
                    <TableHead className="text-right">{isAr ? "الاسم" : "Name"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الطفل" : "Child"}</TableHead>
                    <TableHead className="text-right">{isAr ? "ولي الأمر" : "Parent"}</TableHead>
                    <TableHead className="text-right">{isAr ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead className="text-right">{isAr ? "التكرار" : "Repetition"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الفوترة القادمة" : "Upcoming Billing"}</TableHead>
                    <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
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
                        <TableCell>{getFrequencyLabels(isAr)[plan.frequency] || plan.frequency}</TableCell>
                        <TableCell>{plan.nextBillingDate ? new Date(plan.nextBillingDate).toLocaleDateString('ar-SA') : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                            {plan.isActive ? (isAr ? "نشطة" : "Active") : (isAr ? "متوقفة" : "Stopped")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{isAr ? "لا توجد خطط رسوم" : "No fee plans"}</TableCell></TableRow>
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
              <CardHeader><CardTitle>{isAr ? "ملخص مالي" : "Financial Summary"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "إجمالي الإيرادات" : "Total Revenue"}</span>
                  <span className="font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "إيرادات الشهر الحالي" : "Current Month's Revenue"}</span>
                  <span className="font-bold text-blue-600">{(summary?.thisMonthRevenue ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "المبالغ المعلقة" : "Pending Amounts"}</span>
                  <span className="font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "المبالغ المتأخرة" : "Overdue Amounts"}</span>
                  <span className="font-bold text-red-600">{(summary?.overdueAmount ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">{isAr ? "المدفوعة جزئياً" : "Partially Paid"}</span>
                  <span className="font-bold">{(summary?.partiallyPaidAmount ?? 0).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{isAr ? "إحصائيات الفواتير" : "Invoice Statistics"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "إجمالي الفواتير" : "Total Invoices"}</span>
                  <span className="font-bold">{summary?.totalInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "فواتير مدفوعة" : "Paid Invoices"}</span>
                  <span className="font-bold text-green-600">{summary?.paidInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "فواتير معلقة" : "Pending Invoices"}</span>
                  <span className="font-bold text-amber-600">{summary?.pendingInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{isAr ? "فواتير متأخرة" : "Overdue Invoices"}</span>
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
          <DialogHeader><DialogTitle>{isAr ? "تأكيد الدفع" : "Confirm Payment"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p><strong>{isAr ? "الفاتورة:" : "Invoice:"}</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>{isAr ? "المبلغ:" : "Amount:"}</strong> {Number(selectedInvoice.total).toLocaleString('ar-SA')} ر.س</p>
              </div>
            )}
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={markPaidForm.paymentMethod} onValueChange={v => setMarkPaidForm({ paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{isAr ? "نقدي" : "Cash"}</SelectItem>
                  <SelectItem value="bank_transfer">{isAr ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                  <SelectItem value="card">{isAr ? "بطاقة" : "Card"}</SelectItem>
                  <SelectItem value="mada">{isAr ? "مدى" : "Mada"}</SelectItem>
                  <SelectItem value="apple_pay">Apple Pay</SelectItem>
                  <SelectItem value="stc_pay">STC Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMarkPaid(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleMarkPaid} disabled={markPaid.isPending}>
              {markPaid.isPending ? (isAr ? "جارٍ التأكيد..." : "Confirming...") : (isAr ? "تأكيد الدفع" : "Confirm Payment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={openRefund} onOpenChange={setOpenRefund}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? "استرداد المبلغ" : "Refund Amount"}</DialogTitle></DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            {selectedInvoice && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p><strong>{isAr ? "الفاتورة:" : "Invoice:"}</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>{isAr ? "المبلغ الأصلي:" : "Original Amount:"}</strong> {Number(selectedInvoice.total).toLocaleString('ar-SA')} ر.س</p>
              </div>
            )}
            <div><Label>{isAr ? "مبلغ الاسترداد (ر.س)" : "Refund Amount (SAR)"}</Label><Input type="number" step="0.01" value={refundForm.amount} onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><Label>{isAr ? "سبب الاسترداد" : "Reason for Refund"}</Label><Textarea value={refundForm.reason} onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))} placeholder="أدخل سبب الاسترداد" required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenRefund(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" variant="destructive" disabled={createRefund.isPending}>
                {createRefund.isPending ? (isAr ? "جارٍ الاسترداد..." : "Processing refund...") : (isAr ? "تأكيد الاسترداد" : "Confirm Refund")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
