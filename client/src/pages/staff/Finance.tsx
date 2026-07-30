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
import { Plus, CreditCard, TrendingUp, Clock, AlertTriangle, Send, RefreshCw, Download, FileText, Receipt, Undo2, CalendarClock, DollarSign, Search, Filter, Mail, Printer } from "lucide-react";
import { generateInvoicePDF, printInvoice } from "@/lib/invoicePdf";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function StaffFinance() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isEn = i18n.language === 'en';
  const locale = isEn ? 'en-SA' : 'ar-SA';

  const statusLabels: Record<string, string> = { pending: t('finance.statusPending'), paid: t('finance.statusPaid'), overdue: t('finance.statusOverdue'), cancelled: t('finance.statusCancelled'), partially_paid: t('finance.statusPartiallyPaid') };
  const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-700", partially_paid: "bg-blue-100 text-blue-700" };
  const invoiceTypeLabels: Record<string, string> = { tuition: t('finance.tuition'), activity: t('finance.activity'), trip: t('finance.trip'), uniform: t('finance.uniform'), registration: t('finance.registration'), other: t('finance.other') };
  const frequencyLabels: Record<string, string> = { monthly: t('finance.monthly'), quarterly: t('finance.quarterly'), semi_annual: t('finance.semiAnnual'), annual: t('finance.annual') };
  const paymentMethodLabels: Record<string, string> = { cash: t('finance.cash'), bank_transfer: t('finance.bankTransfer'), card: t('finance.card'), apple_pay: t('finance.applePay'), mada: t('finance.mada'), stc_pay: t('finance.stcPay'), visa: t('finance.visa'), mastercard: t('finance.mastercard') };

  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const { data: summary } = trpc.finance.summary.useQuery();
  const { data: children } = trpc.children.list.useQuery();
  const { data: allTransactions, isLoading: txLoading } = trpc.transactions.list.useQuery();
  const { data: allRefunds, isLoading: refundsLoading } = trpc.refunds.list.useQuery();
  const { data: tuitionPlans, isLoading: plansLoading } = trpc.tuitionPlans.list.useQuery();
  const { data: centerSettings } = trpc.centerSettings.get.useQuery();
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
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success(t('finance.invoiceCreated')); setOpenCreate(false); },
    onError: (e: any) => toast.error(e.message || t('finance.invoiceCreateError')),
  });
  const markPaid = trpc.finance.markPaid.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.transactions.list.invalidate(); toast.success(t('finance.paymentConfirmed')); setOpenMarkPaid(false); },
  });
  const sendReminder = trpc.finance.sendReminder.useMutation({
    onSuccess: () => toast.success(t('finance.reminderSent')),
    onError: () => toast.error(t('finance.error')),
  });
  const sendInvoiceEmail = trpc.finance.sendInvoiceEmail.useMutation({
    onSuccess: () => toast.success(t('finance.emailSent')),
    onError: (e: any) => toast.error(e.message || t('finance.emailError')),
  });
  const deleteInvoice = trpc.finance.deleteInvoice.useMutation({
    onSuccess: () => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); toast.success(t('finance.invoiceDeleted')); },
  });
  const createRefund = trpc.refunds.create.useMutation({
    onSuccess: () => { utils.refunds.list.invalidate(); utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.transactions.list.invalidate(); toast.success(t('finance.refundSuccess')); setOpenRefund(false); },
    onError: () => toast.error(t('finance.refundError')),
  });
  const createPlan = trpc.tuitionPlans.create.useMutation({
    onSuccess: () => { utils.tuitionPlans.list.invalidate(); toast.success(t('finance.planCreated')); setOpenPlan(false); },
    onError: () => toast.error(t('finance.error')),
  });
  const generateInvoices = trpc.tuitionPlans.generateInvoices.useMutation({
    onSuccess: (data: any) => { utils.finance.invoices.invalidate(); utils.finance.summary.invalidate(); utils.tuitionPlans.list.invalidate(); toast.success(`${data.generated} ${t('finance.invoicesGenerated')}`); },
    onError: () => toast.error(t('finance.error')),
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
    if (!form.childId) { toast.error(t('finance.selectChildError')); return; }
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
    if (!planForm.childId || !planForm.parentId) { toast.error(t('finance.selectChildAndParent')); return; }
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
    const headers = [t('finance.invoiceNumber'), t('finance.child'), t('finance.parent'), t('finance.description'), t('finance.amount'), t('finance.vat'), t('finance.total'), t('finance.status'), t('finance.dueDate'), t('finance.paidDate')];
    const rows = invoices.map((inv: any) => [
      inv.invoiceNumber,
      inv.childName || "",
      inv.parentName || "",
      inv.description || "",
      inv.subtotal,
      inv.vatAmount,
      inv.total,
      statusLabels[inv.status] || inv.status,
      new Date(inv.dueDate).toLocaleDateString(locale),
      inv.paidAt ? new Date(inv.paidAt).toLocaleDateString(locale) : "",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('finance.exported'));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('finance.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('finance.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={!invoices?.length}>
            <Download className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'}`} />{t('finance.export')}
          </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild><Button><Plus className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'}`} />{t('finance.createInvoice')}</Button></DialogTrigger>
            <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
              <DialogHeader><DialogTitle>{t('finance.createInvoiceTitle')}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('finance.child')}</Label>
                    <Select value={form.childId ? String(form.childId) : ""} onValueChange={v => {
                      const child = children?.find((c: any) => c.id === Number(v));
                      setForm(f => ({ ...f, childId: Number(v), parentId: (child as any)?.parentId || 0 }));
                    }}>
                      <SelectTrigger><SelectValue placeholder={t('finance.selectChild')} /></SelectTrigger>
                      <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.arabicName || `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('finance.invoiceType')}</Label>
                    <Select value={form.invoiceType} onValueChange={v => setForm(f => ({ ...f, invoiceType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tuition">{t('finance.tuition')}</SelectItem>
                        <SelectItem value="activity">{t('finance.activity')}</SelectItem>
                        <SelectItem value="trip">{t('finance.trip')}</SelectItem>
                        <SelectItem value="uniform">{t('finance.uniform')}</SelectItem>
                        <SelectItem value="registration">{t('finance.registration')}</SelectItem>
                        <SelectItem value="other">{t('finance.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>{t('finance.description')}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('finance.invoiceDescription')} required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>{t('finance.amount')}</Label><Input type="number" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} required /></div>
                  <div><Label>{t('finance.dueDate')}</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.isRecurring} onCheckedChange={v => setForm(f => ({ ...f, isRecurring: v }))} />
                  <Label>{t('finance.recurringInvoice')}</Label>
                </div>
                {form.subtotal && (
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between"><span>{t('finance.subtotal')}</span><span>{Number(form.subtotal).toLocaleString(locale)} {t('finance.sar')}</span></div>
                    <div className="flex justify-between"><span>{t('finance.vat')}</span><span>{(Number(form.subtotal) * 0.15).toLocaleString(locale)} {t('finance.sar')}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>{t('finance.total')}</span><span>{(Number(form.subtotal) * 1.15).toLocaleString(locale)} {t('finance.sar')}</span></div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? t('finance.creating') : t('finance.createInvoiceBtn')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{t('finance.totalRevenue')}</p><p className="text-lg font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString(locale)} {t('finance.sar')}</p></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("paid")}><CardContent className="p-4 flex items-center gap-3"><DollarSign className="h-8 w-8 text-blue-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{t('finance.monthRevenue')}</p><p className="text-lg font-bold text-blue-600">{(summary?.thisMonthRevenue ?? 0).toLocaleString(locale)} {t('finance.sar')}</p></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pending")}><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-amber-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{t('finance.pendingAmount')}</p><p className="text-lg font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString(locale)} {t('finance.sar')}</p></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("overdue")}><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-600 shrink-0" /><div><p className="text-xs text-muted-foreground">{t('finance.overdueAmount')}</p><p className="text-lg font-bold text-red-600">{(summary?.overdueAmount ?? 0).toLocaleString(locale)} {t('finance.sar')}</p></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}><CardContent className="p-4 flex items-center gap-3"><CreditCard className="h-8 w-8 text-primary shrink-0" /><div><p className="text-xs text-muted-foreground">{t('finance.totalInvoices')}</p><p className="text-lg font-bold">{summary?.totalInvoices ?? 0}</p></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="invoices"><FileText className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.invoices')}</TabsTrigger>
          <TabsTrigger value="transactions"><Receipt className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.transactions')}</TabsTrigger>
          <TabsTrigger value="refunds"><Undo2 className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.refunds')}</TabsTrigger>
          <TabsTrigger value="plans"><CalendarClock className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.tuitionPlans')}</TabsTrigger>
          <TabsTrigger value="reports"><TrendingUp className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.reports')}</TabsTrigger>
        </TabsList>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{t('finance.invoices')}</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className={`absolute ${isEn ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                  <Input className={`${isEn ? 'pl-9' : 'pr-9'} w-[200px]`} placeholder={t('finance.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('finance.filterStatus')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('finance.all')}</SelectItem>
                    <SelectItem value="pending">{t('finance.statusPending')}</SelectItem>
                    <SelectItem value="paid">{t('finance.statusPaid')}</SelectItem>
                    <SelectItem value="overdue">{t('finance.statusOverdue')}</SelectItem>
                    <SelectItem value="partially_paid">{t('finance.statusPartiallyPaid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.invoiceNumber')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.child')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.parent')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.type')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.total')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.paid')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.status')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.dueDate')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('common.actions') || (isEn ? 'Actions' : isAr ? 'إجراءات' : 'Actions')}</TableHead>
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
                        <TableCell><Badge variant="outline">{invoiceTypeLabels[inv.invoiceType] || t('finance.fees')}</Badge></TableCell>
                        <TableCell className="font-bold">{Number(inv.total).toLocaleString(locale)} {t('finance.sar')}</TableCell>
                        <TableCell>{Number(inv.paidAmount || 0).toLocaleString(locale)} {t('finance.sar')}</TableCell>
                        <TableCell><Badge className={statusColors[inv.status]}>{statusLabels[inv.status]}</Badge></TableCell>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString(locale)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                            {(inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
                              <Button size="sm" variant="default" onClick={() => { setSelectedInvoice(inv); setOpenMarkPaid(true); }}>
                                <CreditCard className={`h-3 w-3 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.pay')}
                              </Button>
                            )}
                            {(inv.status === 'pending' || inv.status === 'overdue') && (
                              <Button size="sm" variant="outline" onClick={() => sendReminder.mutate({ id: inv.id })}>
                                <Send className={`h-3 w-3 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.sendReminder')}
                              </Button>
                            )}
                            {inv.status === 'paid' && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setRefundForm({ amount: inv.total, reason: "", transactionId: 0 }); setOpenRefund(true); }}>
                                <Undo2 className={`h-3 w-3 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.refund')}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={async () => { try { await generateInvoicePDF(inv as any, { centerName: centerSettings?.centerName, phone: centerSettings?.phone || undefined, email: centerSettings?.email || undefined, address: centerSettings?.address || undefined, vatNumber: (centerSettings as any)?.vatNumber || undefined, commercialRegister: (centerSettings as any)?.commercialRegister || undefined, logoUrl: (centerSettings as any)?.logoUrl || undefined }); 
toast.success(t('finance.pdfDownloaded')); } catch (err) { console.error('PDF generation error:', err); toast.error(t('finance.pdfError') + ': ' + (err instanceof Error ? err.message : '')); } }}>
                              <Download className={`h-3 w-3 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.downloadPdf')}
                            </Button>
                            <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={async () => { try { await printInvoice(inv as any, { centerName: centerSettings?.centerName, phone: centerSettings?.phone || undefined, email: centerSettings?.email || undefined, address: centerSettings?.address || undefined, vatNumber: (centerSettings as any)?.vatNumber || undefined, commercialRegister: (centerSettings as any)?.commercialRegister || undefined, logoUrl: (centerSettings as any)?.logoUrl || undefined }); } catch (err) { toast.error(t('finance.printError')); } }}>
                              <Printer className={`h-3 w-3 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.printInvoice')}
                            </Button>
                            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => sendInvoiceEmail.mutate({ id: inv.id })} disabled={sendInvoiceEmail.isPending}>
                              <Mail className={`h-3 w-3 ${isEn ? 'mr-1' : 'ml-1'}`} />{t('finance.emailInvoice')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{t('finance.noInvoices')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader><CardTitle>{t('finance.financialTransactions')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.date')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.invoiceNumber')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.child')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.parent')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.type')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.amount')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.method')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txLoading ? (
                    [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : allTransactions && allTransactions.length > 0 ? (
                    allTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.createdAt).toLocaleDateString(locale)}</TableCell>
                        <TableCell className="font-mono text-sm">{tx.invoiceNumber || "-"}</TableCell>
                        <TableCell>{tx.childFirstName ? `${tx.childFirstName} ${tx.childLastName || ''}` : "-"}</TableCell>
                        <TableCell>{tx.parentName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'refund' ? 'destructive' : 'default'}>
                            {tx.type === 'payment' ? t('finance.payment') : tx.type === 'refund' ? t('finance.refund') : t('finance.partialRefund')}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-bold ${tx.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.type === 'refund' ? '-' : '+'}{Number(tx.amount).toLocaleString(locale)} {t('finance.sar')}
                        </TableCell>
                        <TableCell>{paymentMethodLabels[tx.method] || tx.method || "-"}</TableCell>
                        <TableCell>
                          <Badge className={tx.status === 'completed' ? 'bg-green-100 text-green-700' : tx.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {tx.status === 'completed' ? t('finance.completed') : tx.status === 'failed' ? t('finance.failed') : t('finance.processing')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t('finance.noTransactions')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REFUNDS TAB */}
        <TabsContent value="refunds">
          <Card>
            <CardHeader><CardTitle>{t('finance.refunds')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.date')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.invoiceNumber')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.parent')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.amount')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.refundReason')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundsLoading ? (
                    [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                  ) : allRefunds && allRefunds.length > 0 ? (
                    allRefunds.map((ref: any) => (
                      <TableRow key={ref.id}>
                        <TableCell>{new Date(ref.createdAt).toLocaleDateString(locale)}</TableCell>
                        <TableCell className="font-mono text-sm">{ref.invoiceNumber || "-"}</TableCell>
                        <TableCell>{ref.parentName || "-"}</TableCell>
                        <TableCell className="font-bold text-red-600">{Number(ref.amount).toLocaleString(locale)} {t('finance.sar')}</TableCell>
                        <TableCell>{ref.reason || "-"}</TableCell>
                        <TableCell>
                          <Badge className={ref.status === 'completed' ? 'bg-green-100 text-green-700' : ref.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {ref.status === 'completed' ? t('finance.completed') : ref.status === 'failed' ? t('finance.failed') : t('finance.processing')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('finance.noRefunds')}</TableCell></TableRow>
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
              <CardTitle>{t('finance.tuitionPlansTitle')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => generateInvoices.mutate()} disabled={generateInvoices.isPending}>
                  <RefreshCw className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'} ${generateInvoices.isPending ? 'animate-spin' : ''}`} />{t('finance.generateDueInvoices')}
                </Button>
                <Dialog open={openPlan} onOpenChange={setOpenPlan}>
                  <DialogTrigger asChild><Button><Plus className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'}`} />{t('finance.newPlan')}</Button></DialogTrigger>
                  <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
                    <DialogHeader><DialogTitle>{t('finance.createTuitionPlan')}</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreatePlan} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>{t('finance.child')}</Label>
                          <Select value={planForm.childId ? String(planForm.childId) : ""} onValueChange={v => {
                            const child = children?.find((c: any) => c.id === Number(v));
                            setPlanForm(f => ({ ...f, childId: Number(v), parentId: (child as any)?.parentId || 0 }));
                          }}>
                            <SelectTrigger><SelectValue placeholder={t('finance.selectChild')} /></SelectTrigger>
                            <SelectContent>{children?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.arabicName || `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{t('finance.frequency')}</Label>
                          <Select value={planForm.frequency} onValueChange={v => setPlanForm(f => ({ ...f, frequency: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">{t('finance.monthly')}</SelectItem>
                              <SelectItem value="quarterly">{t('finance.quarterly')}</SelectItem>
                              <SelectItem value="semi_annual">{t('finance.semiAnnual')}</SelectItem>
                              <SelectItem value="annual">{t('finance.annual')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>{t('finance.planName')}</Label><Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder={t('finance.planNamePlaceholder')} required /></div>
                      <div><Label>{t('finance.planAmount')}</Label><Input type="number" step="0.01" value={planForm.amount} onChange={e => setPlanForm(f => ({ ...f, amount: e.target.value }))} required /></div>
                      <div><Label>{t('finance.planDescription')}</Label><Input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder={t('finance.planDescriptionPlaceholder')} /></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><Label>{t('finance.startDate')}</Label><Input type="date" value={planForm.startDate} onChange={e => setPlanForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
                        <div><Label>{t('finance.endDate')}</Label><Input type="date" value={planForm.endDate} onChange={e => setPlanForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                      </div>
                      <Button type="submit" className="w-full" disabled={createPlan.isPending}>
                        {createPlan.isPending ? t('finance.creatingPlan') : t('finance.createPlanBtn')}
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
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.name')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.child')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.parent')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.amount')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.frequency')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.nextBilling')}</TableHead>
                    <TableHead className={isEn ? 'text-left' : 'text-right'}>{t('finance.status')}</TableHead>
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
                        <TableCell className="font-bold">{Number(plan.amount).toLocaleString(locale)} {t('finance.sar')}</TableCell>
                        <TableCell>{frequencyLabels[plan.frequency] || plan.frequency}</TableCell>
                        <TableCell>{plan.nextBillingDate ? new Date(plan.nextBillingDate).toLocaleDateString(locale) : "-"}</TableCell>
                        <TableCell>
                          <Badge className={plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {plan.isActive ? t('finance.active') : t('finance.inactive')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('finance.noPlans')}</TableCell></TableRow>
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
              <CardHeader><CardTitle>{t('finance.financialSummary')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.totalRevenue')}</span>
                  <span className="font-bold text-green-600">{(summary?.totalRevenue ?? 0).toLocaleString(locale)} {t('finance.sar')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.currentMonthRevenue')}</span>
                  <span className="font-bold text-blue-600">{(summary?.thisMonthRevenue ?? 0).toLocaleString(locale)} {t('finance.sar')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.pendingAmounts')}</span>
                  <span className="font-bold text-amber-600">{(summary?.pendingAmount ?? 0).toLocaleString(locale)} {t('finance.sar')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.overdueAmounts')}</span>
                  <span className="font-bold text-red-600">{(summary?.overdueAmount ?? 0).toLocaleString(locale)} {t('finance.sar')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">{t('finance.partiallyPaidAmount')}</span>
                  <span className="font-bold">{(summary?.partiallyPaidAmount ?? 0).toLocaleString(locale)} {t('finance.sar')}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('finance.invoiceStats')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.totalInvoices')}</span>
                  <span className="font-bold">{summary?.totalInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.paidInvoices')}</span>
                  <span className="font-bold text-green-600">{summary?.paidInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.pendingInvoices')}</span>
                  <span className="font-bold text-amber-600">{summary?.pendingInvoices ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">{t('finance.overdueInvoices')}</span>
                  <span className="font-bold text-red-600">{summary?.overdueInvoices ?? 0}</span>
                </div>
                <div className="pt-4">
                  <Button variant="outline" className="w-full" onClick={handleExportCSV}>
                    <Download className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'}`} />{t('finance.exportCsv')}
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
          <DialogHeader><DialogTitle>{t('finance.confirmPayment')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p><strong>{t('finance.invoice')}:</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>{t('finance.amount')}:</strong> {Number(selectedInvoice.total).toLocaleString(locale)} {t('finance.sar')}</p>
              </div>
            )}
            <div>
              <Label>{t('finance.paymentMethod')}</Label>
              <Select value={markPaidForm.paymentMethod} onValueChange={v => setMarkPaidForm({ paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('finance.bankTransfer')}</SelectItem>
                  <SelectItem value="card">{t('finance.card')}</SelectItem>
                  <SelectItem value="mada">{t('finance.mada')}</SelectItem>
                  <SelectItem value="apple_pay">{t('finance.applePay')}</SelectItem>
                  <SelectItem value="stc_pay">{t('finance.stcPay')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMarkPaid(false)}>{t('finance.cancel')}</Button>
            <Button onClick={handleMarkPaid} disabled={markPaid.isPending}>
              {markPaid.isPending ? t('finance.confirming') : t('finance.confirmPaymentBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={openRefund} onOpenChange={setOpenRefund}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('finance.refundTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            {selectedInvoice && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p><strong>{t('finance.invoice')}:</strong> {selectedInvoice.invoiceNumber}</p>
                <p><strong>{t('finance.originalAmount')}:</strong> {Number(selectedInvoice.total).toLocaleString(locale)} {t('finance.sar')}</p>
              </div>
            )}
            <div><Label>{t('finance.refundAmount')}</Label><Input type="number" step="0.01" value={refundForm.amount} onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><Label>{t('finance.refundReason')}</Label><Textarea value={refundForm.reason} onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('finance.refundReasonPlaceholder')} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenRefund(false)}>{t('finance.cancel')}</Button>
              <Button type="submit" variant="destructive" disabled={createRefund.isPending}>
                {createRefund.isPending ? t('finance.refunding') : t('finance.confirmRefund')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
