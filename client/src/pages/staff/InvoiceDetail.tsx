import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowRight, CheckCircle2, Clock, Trash2, Pencil, Download, Printer, Send, CreditCard, Banknote, Building2 } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-700" };
const paymentMethodLabels: Record<string, string> = { cash: "نقدي", bank_transfer: "تحويل بنكي", card: "بطاقة" };

export default function InvoiceDetail() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  // Get id from URL path directly
  const pathParts = window.location.pathname.split('/');
  const idIndex = pathParts.indexOf('invoice') + 1;
  const invoiceId = parseInt(pathParts[idIndex] || "0");
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'principal' || user?.role === 'accountant';

  const { data: invoice, isLoading } = trpc.finance.getById.useQuery({ id: invoiceId }, { enabled: invoiceId > 0 });
  const utils = trpc.useUtils();

  const [payDialog, setPayDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [editDialog, setEditDialog] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const markPaid = trpc.finance.markPaid.useMutation({
    onSuccess: () => { utils.finance.getById.invalidate({ id: invoiceId }); utils.finance.invoices.invalidate(); setPayDialog(false); toast.success("تم تسجيل الدفع بنجاح"); },
    onError: (e) => toast.error(e.message),
  });

  const markPending = trpc.finance.markPending.useMutation({
    onSuccess: () => { utils.finance.getById.invalidate({ id: invoiceId }); utils.finance.invoices.invalidate(); toast.success("تم تغيير الحالة إلى معلقة"); },
    onError: (e) => toast.error(e.message),
  });

  const updateInvoice = trpc.finance.updateInvoice.useMutation({
    onSuccess: () => { utils.finance.getById.invalidate({ id: invoiceId }); utils.finance.invoices.invalidate(); setEditDialog(false); toast.success("تم تحديث الفاتورة"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteInvoice = trpc.finance.deleteInvoice.useMutation({
    onSuccess: () => { toast.success("تم حذف الفاتورة"); navigate(user?.role === 'parent' ? '/parent/finance' : '/staff/finance'); },
    onError: (e) => toast.error(e.message),
  });

  const sendToParent = trpc.finance.sendReminder.useMutation({
    onSuccess: () => toast.success("تم إرسال الفاتورة لولي الأمر"),
    onError: (e: any) => toast.error(e.message),
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    // Add Arabic font support
    doc.setFont('helvetica');
    // Header - Learning Tree branding
    doc.setFillColor(30, 70, 50);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Learning Tree Kids Center', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Tax Invoice / Simplified', 105, 25, { align: 'center' });
    // Invoice info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 15, 45);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-SA')}`, 15, 52);
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-SA') : 'N/A'}`, 15, 59);
    doc.text(`Status: ${invoice.status?.toUpperCase()}`, 140, 45);
    if (invoice.paidAt) doc.text(`Paid: ${new Date(invoice.paidAt).toLocaleDateString('en-SA')}`, 140, 52);
    // Child & Parent info
    doc.setFontSize(11);
    doc.text('Child:', 15, 72);
    doc.text(invoice.childName || '-', 50, 72);
    doc.text('Parent:', 15, 79);
    doc.text(invoice.parentName || '-', 50, 79);
    doc.text('Email:', 15, 86);
    doc.text(invoice.parentEmail || '-', 50, 86);
    doc.text('Phone:', 15, 93);
    doc.text(invoice.parentPhone || '-', 50, 93);
    // Table
    autoTable(doc, {
      startY: 105,
      head: [['Description', 'Amount (SAR)']],
      body: [
        [invoice.description || 'Service', Number(invoice.subtotal || 0).toLocaleString('en-SA')],
      ],
      foot: [
        ['Subtotal', `${Number(invoice.subtotal || 0).toLocaleString('en-SA')} SAR`],
        [`VAT (${Number(invoice.vatRate || 15)}%)`, `${Number(invoice.vatAmount || 0).toLocaleString('en-SA')} SAR`],
        ['Total', `${Number(invoice.total || 0).toLocaleString('en-SA')} SAR`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 70, 50] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });
    // Payment method
    const finalY = (doc as any).lastAutoTable?.finalY || 160;
    if (invoice.paymentMethod) {
      doc.setFontSize(10);
      doc.text(`Payment Method: ${paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}`, 15, finalY + 10);
    }
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Learning Tree Kids Center - Thank you for your trust', 105, 280, { align: 'center' });
    doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    toast.success('تم تحميل الفاتورة بنجاح');
  };

  const openEditDialog = () => {
    if (invoice) {
      setEditDesc(invoice.description || "");
      setEditAmount(invoice.subtotal?.toString() || "");
      setEditDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "");
      setEditDialog(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">الفاتورة غير موجودة</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(user?.role === 'parent' ? '/parent/finance' : '/staff/finance')}>
          <ArrowRight className="h-4 w-4 ml-2" />العودة للمالية
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(user?.role === 'parent' ? '/parent/finance' : '/staff/finance')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">فاتورة #{invoice.invoiceNumber}</h1>
            <p className="text-sm text-muted-foreground">تاريخ الإنشاء: {new Date(invoice.createdAt).toLocaleDateString('ar-SA')}</p>
          </div>
        </div>
        <Badge className={`text-sm px-3 py-1 ${statusColors[invoice.status]}`}>
          {statusLabels[invoice.status]}
        </Badge>
      </div>

      {/* Invoice Content - Printable Area */}
      <div ref={printRef} className="print-area">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle className="text-lg text-primary">حضانة شجرة التعلم</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">فاتورة ضريبية مبسطة</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium">رقم الفاتورة</p>
                <p className="text-lg font-bold text-primary">{invoice.invoiceNumber}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Child & Parent Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">معلومات الطفل</h3>
                <p className="font-medium">{invoice.childName}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">ولي الأمر</h3>
                <p className="font-medium">{invoice.parentName || "—"}</p>
                {invoice.parentEmail && <p className="text-sm text-muted-foreground">{invoice.parentEmail}</p>}
                {invoice.parentPhone && <p className="text-sm text-muted-foreground">{invoice.parentPhone}</p>}
              </div>
            </div>

            <Separator />

            {/* Invoice Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">تفاصيل الفاتورة</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span>الوصف</span>
                  <span className="font-medium">{invoice.description || "بدون وصف"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>المبلغ قبل الضريبة</span>
                  <span className="font-medium">{Number(invoice.subtotal).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>ضريبة القيمة المضافة ({invoice.vatRate}%)</span>
                  <span className="font-medium">{Number(invoice.vatAmount).toLocaleString('ar-SA')} ر.س</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>الإجمالي</span>
                  <span className="text-primary">{Number(invoice.total).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dates & Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">التواريخ</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>تاريخ الإنشاء:</span><span>{new Date(invoice.createdAt).toLocaleDateString('ar-SA')}</span></div>
                  <div className="flex justify-between"><span>تاريخ الاستحقاق:</span><span>{new Date(invoice.dueDate).toLocaleDateString('ar-SA')}</span></div>
                  {invoice.paidAt && <div className="flex justify-between"><span>تاريخ الدفع:</span><span>{new Date(invoice.paidAt).toLocaleDateString('ar-SA')}</span></div>}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">حالة الدفع</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>الحالة:</span><Badge className={statusColors[invoice.status]}>{statusLabels[invoice.status]}</Badge></div>
                  {invoice.paymentMethod && <div className="flex justify-between"><span>طريقة الدفع:</span><span>{paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}</span></div>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {isAdmin && (
        <Card className="print:hidden">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {invoice.status !== 'paid' && (
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setPayDialog(true)}>
                  <CheckCircle2 className="h-4 w-4 ml-2" />تسجيل دفع
                </Button>
              )}
              {invoice.status === 'paid' && (
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => markPending.mutate({ id: invoiceId })}>
                  <Clock className="h-4 w-4 ml-2" />إرجاع لمعلقة
                </Button>
              )}
              <Button variant="outline" onClick={openEditDialog}>
                <Pencil className="h-4 w-4 ml-2" />تعديل
              </Button>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 ml-2" />حذف
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 ml-2" />تحميل
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />طباعة
              </Button>
              <Button variant="outline" onClick={() => sendToParent.mutate({ id: invoiceId })} disabled={sendToParent.isPending}>
                <Send className="h-4 w-4 ml-2" />{sendToParent.isPending ? "جاري..." : "إرسال لولي الأمر"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark as Paid Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل دفع الفاتورة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">المبلغ: <span className="font-bold text-foreground">{Number(invoice.total).toLocaleString('ar-SA')} ر.س</span></p>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4" />نقدي</div>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />تحويل بنكي</div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />بطاقة</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>إلغاء</Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={!paymentMethod || markPaid.isPending} onClick={() => markPaid.mutate({ id: invoiceId, paymentMethod: paymentMethod as any })}>
              {markPaid.isPending ? "جاري..." : "تأكيد الدفع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الفاتورة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الوصف</Label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <div><Label>المبلغ قبل الضريبة (ر.س)</Label><Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} /></div>
            <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>إلغاء</Button>
            <Button disabled={updateInvoice.isPending} onClick={() => updateInvoice.mutate({ id: invoiceId, description: editDesc || undefined, subtotal: editAmount || undefined, dueDate: editDueDate || undefined })}>
              {updateInvoice.isPending ? "جاري..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteInvoice.mutate({ id: invoiceId })}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 2rem; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
