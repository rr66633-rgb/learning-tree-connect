import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Receipt, CreditCard, Clock, FileText, Download, AlertTriangle, CheckCircle2, XCircle, History } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trackPurchase } from "@/lib/metaPixel";

declare global {
  interface Window {
    Moyasar: any;
  }
}

const statusLabels: Record<string, string> = { pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة", partially_paid: "مدفوعة جزئياً" };
const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-700", partially_paid: "bg-blue-100 text-blue-700" };
const invoiceTypeLabels: Record<string, string> = { tuition: "رسوم دراسية", activity: "نشاط", trip: "رحلة", uniform: "زي مدرسي", registration: "تسجيل", other: "أخرى" };
const paymentMethodLabels: Record<string, string> = { cash: "نقدي", bank_transfer: "تحويل بنكي", card: "بطاقة", apple_pay: "Apple Pay", mada: "مدى", stc_pay: "STC Pay", visa: "فيزا", mastercard: "ماستركارد" };

export default function ParentFinance() {
  const { data: invoices, isLoading } = trpc.finance.invoices.useQuery();
  const { data: paymentHistory, isLoading: historyLoading } = trpc.payments.history.useQuery();
  const { data: gatewayStatus } = trpc.payments.gatewayStatus.useQuery();
  const utils = trpc.useUtils();

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mada");
  const [statusFilter, setStatusFilter] = useState("all");

  const initiatePayment = trpc.payments.initiate.useMutation({
    onSuccess: (data) => {
      if (!data.isConfigured) {
        toast.info("بوابة الدفع غير مفعلة حالياً. سيتم تفعيلها قريباً.");
        setOpenPayDialog(false);
        return;
      }
      // Track Purchase event when payment is initiated
      if (selectedInvoice) {
        trackPurchase(Number(selectedInvoice.total) - Number(selectedInvoice.paidAmount || 0), "SAR");
      }
      if (data.transactionUrl) {
        window.location.href = data.transactionUrl;
      } else {
        toast.success("تم بدء عملية الدفع");
        setOpenPayDialog(false);
      }
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء عملية الدفع"),
  });

  const totalPending = invoices?.filter((inv: any) => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid').reduce((sum: number, inv: any) => sum + (Number(inv.total) - Number(inv.paidAmount || 0)), 0) ?? 0;
  const totalPaid = invoices?.filter((inv: any) => inv.status === 'paid').reduce((sum: number, inv: any) => sum + Number(inv.total), 0) ?? 0;

  const filteredInvoices = invoices?.filter((inv: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "unpaid") return inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid';
    return inv.status === statusFilter;
  }) ?? [];

  const handlePay = (invoice: any) => {
    setSelectedInvoice(invoice);
    setOpenPayDialog(true);
  };

  const [moyasarInitialized, setMoyasarInitialized] = useState(false);

  // Use callback ref to initialize Moyasar form when the DOM element mounts
  const moyasarFormRef = useRef<HTMLDivElement>(null);
  const initMoyasarForm = (node: HTMLDivElement | null) => {
    moyasarFormRef.current = node;
    if (!node || !selectedInvoice || !gatewayStatus?.publishableKey) return;
    
    // Clear and initialize
    node.innerHTML = '';
    setMoyasarInitialized(false);

    try {
      const amountInHalalas = Math.round((Number(selectedInvoice.total) - Number(selectedInvoice.paidAmount || 0)) * 100);
      
      window.Moyasar.init({
        element: node,
        amount: amountInHalalas,
        currency: 'SAR',
        description: `فاتورة ${selectedInvoice.invoiceNumber} - ${selectedInvoice.description || ''}`,
        publishable_api_key: gatewayStatus.publishableKey,
        callback_url: `https://naashah.com/payment-callback?invoiceId=${selectedInvoice.id}`,
        methods: ['creditcard', 'applepay', 'stcpay'],
        supported_networks: ['visa', 'mastercard', 'mada'],
        apple_pay: {
          country: 'SA',
          label: 'Naashah',
          validate_merchant_url: 'https://api.moyasar.com/v1/applepay/initiate',
          version: 6,
          supported_countries: ['SA'],
        },
        language: 'ar',
        fixed_width: false,
        metadata: {
          invoiceId: String(selectedInvoice.id),
          invoiceNumber: selectedInvoice.invoiceNumber,
        },
        on_initiating: async function() {
          trackPurchase(Number(selectedInvoice.total) - Number(selectedInvoice.paidAmount || 0), 'SAR');
          return true;
        },
        on_completed: async function(payment: any) {
          // Save payment to our server immediately after Moyasar creates it
          try {
            const response = await fetch('/api/trpc/payments.saveFromMoyasar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                json: {
                  moyasarPaymentId: payment.id,
                  invoiceId: selectedInvoice.id,
                  amount: amountInHalalas / 100,
                  method: payment.source?.type === 'applepay' ? 'apple_pay' : 
                          payment.source?.type === 'stcpay' ? 'stc_pay' :
                          payment.source?.company === 'mada' ? 'mada' :
                          payment.source?.company === 'visa' ? 'visa' : 'mastercard',
                  status: payment.status,
                },
              }),
            });
            console.log('Payment saved to server:', response.status);
          } catch (err) {
            console.error('Failed to save payment to server:', err);
          }
        },
        on_failure: async function(error: any) {
          console.error('Moyasar payment failed:', error);
          toast.error('فشلت عملية الدفع: ' + (typeof error === 'string' ? error : 'يرجى المحاولة مرة أخرى'));
        },
      });
      setMoyasarInitialized(true);
    } catch (err) {
      console.error('Moyasar init error:', err);
      toast.error('حدث خطأ في تهيئة بوابة الدفع');
    }
  };

  const handleInitiatePayment = () => {
    // This is now handled by Moyasar form submit button
    // Keep for backward compatibility
    if (!selectedInvoice) return;
    if (!gatewayStatus?.publishableKey) {
      toast.error('بوابة الدفع غير مفعلة حالياً');
      return;
    }
    // The Moyasar form handles the payment directly
    toast.info('يرجى إدخال بيانات البطاقة في النموذج أدناه');
  };

  const handleViewDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
    setOpenDetailDialog(true);
  };

  const handleDownloadPDF = (invoice: any) => {
    // Generate a simple PDF-like receipt
    const content = `
فاتورة رقم: ${invoice.invoiceNumber}
التاريخ: ${new Date(invoice.createdAt).toLocaleDateString('ar-SA')}
تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}
الطفل: ${invoice.childName || ''}
الوصف: ${invoice.description || ''}
المبلغ الأساسي: ${Number(invoice.subtotal).toLocaleString('ar-SA')} ر.س
ضريبة القيمة المضافة (${invoice.vatRate}%): ${Number(invoice.vatAmount).toLocaleString('ar-SA')} ر.س
الإجمالي: ${Number(invoice.total).toLocaleString('ar-SA')} ر.س
الحالة: ${statusLabels[invoice.status]}
${invoice.paidAt ? `تاريخ الدفع: ${new Date(invoice.paidAt).toLocaleDateString('ar-SA')}` : ''}
    `.trim();
    
    const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice_${invoice.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تحميل الفاتورة");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الفواتير والمدفوعات</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">المبلغ المستحق</p>
              <p className="text-lg font-bold text-amber-600">{totalPending.toLocaleString('ar-SA')} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المدفوع</p>
              <p className="text-lg font-bold text-green-600">{totalPaid.toLocaleString('ar-SA')} ر.س</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">بوابة الدفع</p>
              <p className="text-sm font-medium">
                {gatewayStatus?.isConfigured ? (
                  <span className="text-green-600">مفعلة</span>
                ) : (
                  <span className="text-amber-600">قيد التفعيل</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 ml-1" />الفواتير</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 ml-1" />سجل المدفوعات</TabsTrigger>
        </TabsList>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          <div className="flex justify-end mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفواتير</SelectItem>
                <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
              </SelectContent>
            </Select>
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
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الاستحقاق</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <TableRow><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                    filteredInvoices.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState variant="finance" compact /></TableCell></TableRow> :
                    filteredInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell className="font-medium">{inv.childName || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{invoiceTypeLabels[inv.invoiceType] || "رسوم"}</Badge></TableCell>
                        <TableCell className="font-bold">{Number(inv.total).toLocaleString('ar-SA')} ر.س</TableCell>
                        <TableCell><Badge className={statusColors[inv.status]}>{statusLabels[inv.status]}</Badge></TableCell>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
                              <Button size="sm" onClick={() => handlePay(inv)}>
                                <CreditCard className="h-3 w-3 ml-1" />ادفع
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(inv)}>
                              <FileText className="h-3 w-3 ml-1" />تفاصيل
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(inv)}>
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
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
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            )) : filteredInvoices.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState variant="finance" />
                </CardContent>
              </Card>
            ) : filteredInvoices.map((inv: any) => (
              <Card key={inv.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base">{inv.childName || "—"}</span>
                    <Badge className={statusColors[inv.status]}>{statusLabels[inv.status]}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{inv.description || "بدون وصف"}</span>
                    <span className="font-bold text-lg">{Number(inv.total).toLocaleString('ar-SA')} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                    <span>{inv.invoiceNumber}</span>
                    <span>استحقاق: {new Date(inv.dueDate).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {(inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
                      <Button size="sm" className="flex-1" onClick={() => handlePay(inv)}>
                        <CreditCard className="h-3 w-3 ml-1" />ادفع الآن
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(inv)}>
                      <FileText className="h-3 w-3 ml-1" />تفاصيل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(inv)}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PAYMENT HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>سجل المدفوعات</CardTitle></CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !paymentHistory || paymentHistory.length === 0 ? (
                <EmptyState variant="finance" compact title="لا توجد مدفوعات سابقة" description="ستظهر هنا سجل المدفوعات السابقة" />
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${payment.status === 'paid' ? 'bg-green-100' : payment.status === 'failed' ? 'bg-red-100' : 'bg-amber-100'}`}>
                          {payment.status === 'paid' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                           payment.status === 'failed' ? <XCircle className="h-4 w-4 text-red-600" /> :
                           <Clock className="h-4 w-4 text-amber-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{payment.invoiceDescription || payment.invoiceNumber || "دفعة"}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.childFirstName ? `${payment.childFirstName} ${payment.childLastName || ''}` : ''} 
                            {payment.method ? ` • ${paymentMethodLabels[payment.method] || payment.method}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${payment.status === 'paid' ? 'text-green-600' : ''}`}>
                          {Number(payment.amount).toLocaleString('ar-SA')} ر.س
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('ar-SA') : new Date(payment.createdAt).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog - Using Moyasar Form */}
      <Dialog open={openPayDialog} onOpenChange={(open) => {
        setOpenPayDialog(open);
        if (!open) setMoyasarInitialized(false);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>دفع الفاتورة</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">رقم الفاتورة</span><span className="font-mono">{selectedInvoice.invoiceNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الطفل</span><span>{selectedInvoice.childName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الوصف</span><span>{selectedInvoice.description}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>المبلغ المطلوب</span><span>{(Number(selectedInvoice.total) - Number(selectedInvoice.paidAmount || 0)).toLocaleString('ar-SA')} ر.س</span></div>
              </div>

              {!gatewayStatus?.isConfigured ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 inline ml-1" />
                  بوابة الدفع الإلكتروني قيد التفعيل. سيتم تفعيل الدفع الإلكتروني قريباً.
                </div>
              ) : (
                <div ref={initMoyasarForm} className="moyasar-form" />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPayDialog(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={openDetailDialog} onOpenChange={setOpenDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تفاصيل الفاتورة</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">رقم الفاتورة</span><span className="font-mono">{selectedInvoice.invoiceNumber}</span></div>
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">الطفل</span><span>{selectedInvoice.childName}</span></div>
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">النوع</span><span>{invoiceTypeLabels[selectedInvoice.invoiceType] || "رسوم"}</span></div>
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">الوصف</span><span>{selectedInvoice.description || "—"}</span></div>
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">تاريخ الإنشاء</span><span>{new Date(selectedInvoice.createdAt).toLocaleDateString('ar-SA')}</span></div>
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">تاريخ الاستحقاق</span><span>{new Date(selectedInvoice.dueDate).toLocaleDateString('ar-SA')}</span></div>
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">المبلغ الأساسي</span><span>{Number(selectedInvoice.subtotal).toLocaleString('ar-SA')} ر.س</span></div>
                <div className="flex justify-between py-1 border-b"><span className="text-muted-foreground">ضريبة القيمة المضافة ({selectedInvoice.vatRate}%)</span><span>{Number(selectedInvoice.vatAmount).toLocaleString('ar-SA')} ر.س</span></div>
                <div className="flex justify-between py-1 border-b font-bold text-base"><span>الإجمالي</span><span>{Number(selectedInvoice.total).toLocaleString('ar-SA')} ر.س</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">الحالة</span><Badge className={statusColors[selectedInvoice.status]}>{statusLabels[selectedInvoice.status]}</Badge></div>
                {selectedInvoice.paidAt && (
                  <div className="flex justify-between py-1 border-t"><span className="text-muted-foreground">تاريخ الدفع</span><span>{new Date(selectedInvoice.paidAt).toLocaleDateString('ar-SA')}</span></div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleDownloadPDF(selectedInvoice)}>
                  <Download className="h-4 w-4 ml-2" />تحميل الفاتورة
                </Button>
                {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'overdue') && (
                  <Button className="flex-1" onClick={() => { setOpenDetailDialog(false); handlePay(selectedInvoice); }}>
                    <CreditCard className="h-4 w-4 ml-2" />ادفع الآن
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
