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
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowRight, CheckCircle2, Clock, Trash2, Pencil, Download, Printer, Send, Mail, CreditCard, Banknote, Building2 } from "lucide-react";
import { generateInvoicePDF, printInvoice } from "@/lib/invoicePdf";

const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-700" };

export default function InvoiceDetail() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
    const statusLabels: Record<string, string> = { pending: t("finance.statusPending"), paid: t("finance.statusPaid"), overdue: t("finance.statusOverdue"), cancelled: t("statuses.cancelled") };
  const paymentMethodLabels: Record<string, string> = { cash: t("paymentMethods.cash"), bank_transfer: t("paymentMethods.bank_transfer"), card: t("paymentMethods.card") };
  const [, navigate] = useLocation();
  const { user } = useAuth();
  // Get id from URL path directly
  const pathParts = window.location.pathname.split('/');
  const idIndex = pathParts.indexOf('invoice') + 1;
  const invoiceId = parseInt(pathParts[idIndex] || "0");
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'principal' || user?.role === 'owner' || user?.role === 'accountant';

  const { data: invoice, isLoading } = trpc.finance.getById.useQuery({ id: invoiceId }, { enabled: invoiceId > 0 });
  const { data: centerSettings } = trpc.centerSettings.get.useQuery();
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
    onSuccess: () => { utils.finance.getById.invalidate({ id: invoiceId }); utils.finance.invoices.invalidate(); setPayDialog(false); toast.success(isAr ? "تم تسجيل الدفع بنجاح" : "Payment recorded successfully"); },
    onError: (e) => toast.error(e.message),
  });

  const markPending = trpc.finance.markPending.useMutation({
    onSuccess: () => { utils.finance.getById.invalidate({ id: invoiceId }); utils.finance.invoices.invalidate(); toast.success(isAr ? "تم تغيير الحالة إلى معلقة" : "Status changed to pending"); },
    onError: (e) => toast.error(e.message),
  });

  const updateInvoice = trpc.finance.updateInvoice.useMutation({
    onSuccess: () => { utils.finance.getById.invalidate({ id: invoiceId }); utils.finance.invoices.invalidate(); setEditDialog(false); toast.success(isAr ? "تم تحديث الفاتورة" : "Invoice updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteInvoice = trpc.finance.deleteInvoice.useMutation({
    onSuccess: () => { toast.success(isAr ? "تم حذف الفاتورة" : "Invoice deleted"); navigate(user?.role === 'parent' ? '/parent/finance' : '/staff/finance'); },
    onError: (e) => toast.error(e.message),
  });

  const sendToParent = trpc.finance.sendReminder.useMutation({
    onSuccess: () => toast.success(isAr ? "تم إرسال التذكير لولي الأمر" : "Reminder sent to parent"),
    onError: (e: any) => toast.error(e.message),
  });

  const sendInvoiceEmail = trpc.finance.sendInvoiceEmail.useMutation({
    onSuccess: () => toast.success(isAr ? "تم إرسال الفاتورة بالبريد الإلكتروني بنجاح" : "Invoice sent by email successfully"),
    onError: (e: any) => toast.error(e.message || isAr ? 'فشل إرسال البريد الإلكتروني' : 'Failed to Send Email'),
  });

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await printInvoice(invoice as any, {
        centerName: centerSettings?.centerName,
        phone: centerSettings?.phone || undefined,
        email: centerSettings?.email || undefined,
        address: centerSettings?.address || undefined,
        vatNumber: (centerSettings as any)?.vatNumber || undefined,
        commercialRegister: (centerSettings as any)?.commercialRegister || undefined,
        logoUrl: (centerSettings as any)?.logoUrl || undefined,
      });
    } catch (err) {
      console.error('Print error:', err);
      toast.error(isAr ? 'حدث خطأ أثناء الطباعة' : 'An error occurred during printing');
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      await generateInvoicePDF(invoice as any, {
        centerName: centerSettings?.centerName,
        phone: centerSettings?.phone || undefined,
        email: centerSettings?.email || undefined,
        address: centerSettings?.address || undefined,
        vatNumber: (centerSettings as any)?.vatNumber || undefined,
        commercialRegister: (centerSettings as any)?.commercialRegister || undefined,
        logoUrl: (centerSettings as any)?.logoUrl || undefined,
      });
      toast.success(isAr ? 'تم تحميل الفاتورة بنجاح' : 'Invoice uploaded successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error(isAr ? 'حدث خطأ أثناء توليد الفاتورة' : 'An error occurred while generating the invoice');
    }
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
        <p className="text-muted-foreground text-lg">{isAr ? "الفاتورة غير موجودة" : "Invoice Not Found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(user?.role === 'parent' ? '/parent/finance' : '/staff/finance')}>
          <ArrowRight className="h-4 w-4 ml-2" />{isAr ? "العودة للمالية" : "Back to Finance"}
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
            <p className="text-sm text-muted-foreground">{isAr ? "تاريخ الإنشاء:" : "Creation Date:"} {new Date(invoice.createdAt).toLocaleDateString('ar-SA')}</p>
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
                <CardTitle className="text-lg text-primary">{isAr ? "حضانة شجرة التعلم" : "Learning Tree Nursery"}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{isAr ? "فاتورة ضريبية مبسطة" : "Simplified Tax Invoice"}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium">{isAr ? "رقم الفاتورة" : "Invoice Number"}</p>
                <p className="text-lg font-bold text-primary">{invoice.invoiceNumber}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Child & Parent Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">{isAr ? "معلومات الطفل" : "Child Information"}</h3>
                <p className="font-medium">{invoice.childName}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">{isAr ? "ولي الأمر" : "Parent"}</h3>
                <p className="font-medium">{invoice.parentName || "—"}</p>
                {invoice.parentEmail && <p className="text-sm text-muted-foreground">{invoice.parentEmail}</p>}
                {invoice.parentPhone && <p className="text-sm text-muted-foreground">{invoice.parentPhone}</p>}
              </div>
            </div>

            <Separator />

            {/* Invoice Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">{isAr ? "تفاصيل الفاتورة" : "Invoice Details"}</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span>{isAr ? "الوصف" : "Description"}</span>
                  <span className="font-medium">{invoice.description || isAr ? "بدون وصف" : "No Description"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>{isAr ? "المبلغ قبل الضريبة" : "Amount Before Tax"}</span>
                  <span className="font-medium">{Number(invoice.subtotal).toLocaleString('ar-SA')} {isAr ? "ر.س" : "SAR"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{isAr ? "ضريبة القيمة المضافة (" : "VAT ("}{invoice.vatRate}%)</span>
                  <span className="font-medium">{Number(invoice.vatAmount).toLocaleString('ar-SA')} {isAr ? "ر.س" : "SAR"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>{isAr ? "الإجمالي" : "Total"}</span>
                  <span className="text-primary">{Number(invoice.total).toLocaleString('ar-SA')} {isAr ? "ر.س" : "SAR"}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dates & Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">{isAr ? "التواريخ" : "Dates"}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>{isAr ? "تاريخ الإنشاء:" : "Creation Date:"}</span><span>{new Date(invoice.createdAt).toLocaleDateString('ar-SA')}</span></div>
                  <div className="flex justify-between"><span>{isAr ? "تاريخ الاستحقاق:" : "Due Date:"}</span><span>{new Date(invoice.dueDate).toLocaleDateString('ar-SA')}</span></div>
                  {invoice.paidAt && <div className="flex justify-between"><span>{isAr ? "تاريخ الدفع:" : "Payment Date:"}</span><span>{new Date(invoice.paidAt).toLocaleDateString('ar-SA')}</span></div>}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">{isAr ? "حالة الدفع" : "Payment Status"}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>{isAr ? "الحالة:" : "Status:"}</span><Badge className={statusColors[invoice.status]}>{statusLabels[invoice.status]}</Badge></div>
                  {invoice.paymentMethod && <div className="flex justify-between"><span>{isAr ? "طريقة الدفع:" : "Payment Method:"}</span><span>{paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}</span></div>}
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
                  <CheckCircle2 className="h-4 w-4 ml-2" />{isAr ? "تسجيل دفع" : "Record Payment"}
                </Button>
              )}
              {invoice.status === 'paid' && (
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => markPending.mutate({ id: invoiceId })}>
                  <Clock className="h-4 w-4 ml-2" />{isAr ? "إرجاع لمعلقة" : "Return to Pending"}
                </Button>
              )}
              <Button variant="outline" onClick={openEditDialog}>
                <Pencil className="h-4 w-4 ml-2" />{isAr ? "تعديل" : "Edit"}
              </Button>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 ml-2" />{isAr ? "حذف" : "Delete"}
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 ml-2" />{isAr ? "تحميل" : "Download"}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" />{isAr ? "طباعة" : "Print"}
              </Button>
              <Button variant="outline" onClick={() => sendToParent.mutate({ id: invoiceId })} disabled={sendToParent.isPending}>
                <Send className="h-4 w-4 ml-2" />{sendToParent.isPending ? "جاري..." : (isAr ? "تذكير" : "Reminder")}
              </Button>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => sendInvoiceEmail.mutate({ id: invoiceId })} disabled={sendInvoiceEmail.isPending}>
                <Mail className="h-4 w-4 ml-2" />{sendInvoiceEmail.isPending ? isAr ? "جاري..." : "Processing..." : isAr ? "إرسال إيميل" : "Send Email"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark as Paid Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? "تسجيل دفع الفاتورة" : "Record Invoice Payment"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{isAr ? "المبلغ:" : "Amount:"} <span className="font-bold text-foreground">{Number(invoice.total).toLocaleString('ar-SA')} {isAr ? "ر.س" : "SAR"}</span></p>
            <div>
              <Label>{isAr ? "طريقة الدفع" : "Payment Method"}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder={isAr ? "اختر طريقة الدفع" : "Select Payment Method"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4" />{isAr ? "نقدي" : "Cash"}</div>
                  </SelectItem>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{isAr ? "تحويل بنكي" : "Bank Transfer"}</div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{isAr ? "بطاقة" : "Card"}</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={!paymentMethod || markPaid.isPending} onClick={() => markPaid.mutate({ id: invoiceId, paymentMethod: paymentMethod as any })}>
              {markPaid.isPending ? "جاري..." : (isAr ? "تأكيد الدفع" : "Confirm Payment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? "تعديل الفاتورة" : "Edit Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{isAr ? "الوصف" : "Description"}</Label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <div><Label>{isAr ? "المبلغ قبل الضريبة (ر.س)" : "Amount Before Tax (SAR)"}</Label><Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} /></div>
            <div><Label>{isAr ? "تاريخ الاستحقاق" : "Due Date"}</Label><Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button disabled={updateInvoice.isPending} onClick={() => updateInvoice.mutate({ id: invoiceId, description: editDesc || undefined, subtotal: editAmount || undefined, dueDate: editDueDate || undefined })}>
              {updateInvoice.isPending ? isAr ? "جاري..." : "Processing..." : isAr ? "حفظ التعديلات" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? "حذف الفاتورة" : "Delete Invoice"}</AlertDialogTitle>
            <AlertDialogDescription>{isAr ? "هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this invoice? This action cannot be undone."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteInvoice.mutate({ id: invoiceId })}>{isAr ? "حذف" : "Delete"}</AlertDialogAction>
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
