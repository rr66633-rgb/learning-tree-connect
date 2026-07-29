import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, CreditCard, TrendingUp, AlertCircle, Clock, Filter, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  initiated: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  refunded: "bg-blue-100 text-blue-800",
};

// methodLabels moved inside component

export default function PaymentsReport() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const statusLabels: Record<string, string> = { initiated: t("statuses.initiated"), paid: t("statuses.paid"), failed: t("statuses.failed"), expired: t("statuses.expired"), refunded: t("statuses.refunded") };
  const methodLabels: Record<string, string> = { mada: t("paymentMethods.mada"), visa: t("paymentMethods.visa"), mastercard: t("paymentMethods.mastercard"), apple_pay: t("paymentMethods.apple_pay"), stc_pay: t("paymentMethods.stc_pay"), cash: t("paymentMethods.cash"), bank_transfer: t("paymentMethods.bank_transfer") };
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.superAdmin.paymentsReport.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: status as any,
    method: method as any,
    page,
    limit: 50,
  });

  const handleExportCSV = () => {
    if (!data?.payments?.length) {
      toast.error(isAr ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    const headers = ["رقم العملية", (isAr ? "رقم الفاتورة" : "Invoice Number"), "اسم ولي الأمر", t("superadmin.amount"), t("superadmin.paymentMethod"), t("common.status"), "تاريخ الإنشاء", "تاريخ الدفع"];
    const rows = data.payments.map((p: any) => [
      p.moyasarPaymentId || p.id,
      p.invoiceNumber || "-",
      p.parentName || "-",
      `${Number(p.amount).toFixed(2)} ${isAr ? "ر.س" : "SAR"}`,
      methodLabels[p.method] || p.method,
      statusLabels[p.status] || p.status,
      p.createdAt ? new Date(p.createdAt).toLocaleDateString(locale) : "-",
      p.paidAt ? new Date(p.paidAt).toLocaleDateString(locale) : "-",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(isAr ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? "تقرير المدفوعات" : "Payments Report"}</h1>
          <p className="text-muted-foreground text-sm mt-1">{isAr ? "جميع عمليات الدفع عبر بوابة ميسر" : "All Payments via Maysar Gateway"}</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي المدفوع" : "Total Paid"}</p>
                <p className="text-xl font-bold text-green-600">
                  {isLoading ? <Skeleton className="h-6 w-24" /> : `${Number(data?.stats?.totalPaid || 0).toLocaleString("ar-SA")} ${isAr ? "ر.س" : "SAR"}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "قيد المعالجة" : "Processing"}</p>
                <p className="text-xl font-bold text-yellow-600">
                  {isLoading ? <Skeleton className="h-6 w-24" /> : `${Number(data?.stats?.totalInitiated || 0).toLocaleString("ar-SA")} ${isAr ? "ر.س" : "SAR"}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "فاشلة" : "Failed"}</p>
                <p className="text-xl font-bold text-red-600">
                  {isLoading ? <Skeleton className="h-6 w-24" /> : `${Number(data?.stats?.totalFailed || 0).toLocaleString("ar-SA")} ${isAr ? "ر.س" : "SAR"}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي العمليات" : "Total Operations"}</p>
                <p className="text-xl font-bold">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : (data?.stats?.countTotal || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{isAr ? "فلاتر البحث" : "Search Filters"}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? "من تاريخ" : "From Date"}</label>
              <Input type="date" lang="en" dir="ltr" placeholder="yyyy/mm/dd" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? "إلى تاريخ" : "To Date"}</label>
              <Input type="date" lang="en" dir="ltr" placeholder="yyyy/mm/dd" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? "حالة الدفع" : "Payment Status"}</label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="paid">{isAr ? "مدفوعة" : "Paid"}</SelectItem>
                  <SelectItem value="initiated">{isAr ? "قيد المعالجة" : "Processing"}</SelectItem>
                  <SelectItem value="failed">{isAr ? "فاشلة" : "Failed"}</SelectItem>
                  <SelectItem value="expired">{isAr ? "منتهية" : "Expired"}</SelectItem>
                  <SelectItem value="refunded">{isAr ? "مستردة" : "Refunded"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? "طريقة الدفع" : "Payment Method"}</label>
              <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="mada">{isAr ? "مدى" : "Mada"}</SelectItem>
                  <SelectItem value="visa">{isAr ? "فيزا" : "Visa"}</SelectItem>
                  <SelectItem value="mastercard">{isAr ? "ماستركارد" : "Mastercard"}</SelectItem>
                  <SelectItem value="apple_pay">Apple Pay</SelectItem>
                  <SelectItem value="stc_pay">STC Pay</SelectItem>
                  <SelectItem value="cash">{isAr ? "نقدي" : "Cash"}</SelectItem>
                  <SelectItem value="bank_transfer">{isAr ? "تحويل بنكي" : "Bank Transfer"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isAr ? "سجل المدفوعات (" : "Payments Log ("}{data?.total || 0} {isAr ? "عملية)" : "Process"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data?.payments?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isAr ? "لا توجد عمليات دفع مطابقة" : "No matching payment transactions"}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">{isAr ? "رقم الفاتورة" : "Invoice Number"}</TableHead>
                      <TableHead className="text-right">{isAr ? "ولي الأمر" : "Parent"}</TableHead>
                      <TableHead className="text-right">{isAr ? "المبلغ" : "Amount"}</TableHead>
                      <TableHead className="text-right">{isAr ? "طريقة الدفع" : "Payment Method"}</TableHead>
                      <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
                      <TableHead className="text-right">{isAr ? "التاريخ" : "Date"}</TableHead>
                      <TableHead className="text-right">{isAr ? "رقم ميسر" : "Easy Number"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.map((payment: any, index: number) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{(page - 1) * 50 + index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.invoiceNumber || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{payment.parentName || "-"}</p>
                            <p className="text-xs text-muted-foreground">{payment.parentEmail || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">{Number(payment.amount).toLocaleString("ar-SA")} {isAr ? "ر.س" : "SAR"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {methodLabels[payment.method] || payment.method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status] || "bg-gray-100"}`}>
                            {statusLabels[payment.status] || payment.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
                            : new Date(payment.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
                          }
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {payment.moyasarPaymentId ? payment.moyasarPaymentId.substring(0, 12) + "..." : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    صفحة {page} {isAr ? "من" : "From"} {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                      {isAr ? "السابق" : "Previous"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      {isAr ? "التالي" : "Next"}
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
