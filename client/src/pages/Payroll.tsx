import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, CheckCircle, Clock, Plus, Play, Check, X, FileSpreadsheet, FileDown } from "lucide-react";
import { exportPayrollToExcel, exportPayrollToPdf, exportAnnualPayrollToExcel, exportAnnualPayrollToPdf } from "@/lib/payrollExport";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  approved: "معتمد",
  paid: "مدفوع",
  cancelled: "ملغي",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  approved: "outline",
  paid: "default",
  cancelled: "destructive",
};

export default function Payroll() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState("payroll");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<any>(null);

  // Form state
  const [formUserId, setFormUserId] = useState("");
  const [formBasicSalary, setFormBasicSalary] = useState("");
  const [formHousing, setFormHousing] = useState("");
  const [formTransport, setFormTransport] = useState("");
  const [formOtherAllowances, setFormOtherAllowances] = useState("");
  const [formGosi, setFormGosi] = useState("");
  const [formOtherDeductions, setFormOtherDeductions] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formIban, setFormIban] = useState("");

  // Queries
  const salariesQuery = trpc.payroll.listSalaries.useQuery();
  const payrollQuery = trpc.payroll.listPayrollRecords.useQuery({ month: selectedMonth, year: selectedYear });
  const summaryQuery = trpc.payroll.getPayrollSummary.useQuery({ month: selectedMonth, year: selectedYear });
  const staffQuery = trpc.staffManagement.list.useQuery({});

  // Mutations
  const upsertSalary = trpc.payroll.upsertSalary.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حفظ بيانات الراتب" : "Salary data saved");
      salariesQuery.refetch();
      setSalaryDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSalary = trpc.payroll.deleteSalary.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حذف بيانات الراتب" : "Salary deleted");
      salariesQuery.refetch();
    },
  });

  const generatePayroll = trpc.payroll.generateMonthlyPayroll.useMutation({
    onSuccess: (data: any) => {
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(isAr ? `تم إنشاء مسيّر الرواتب لـ ${data.count} موظف` : `Payroll generated for ${data.count} employees`);
        payrollQuery.refetch();
        summaryQuery.refetch();
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = trpc.payroll.updatePayrollStatus.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
      payrollQuery.refetch();
      summaryQuery.refetch();
    },
  });

  const bulkUpdate = trpc.payroll.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث جميع السجلات" : "All records updated");
      payrollQuery.refetch();
      summaryQuery.refetch();
    },
  });

  function resetForm() {
    setFormUserId("");
    setFormBasicSalary("");
    setFormHousing("");
    setFormTransport("");
    setFormOtherAllowances("");
    setFormGosi("");
    setFormOtherDeductions("");
    setFormBankName("");
    setFormIban("");
    setEditingSalary(null);
  }

  function openEditSalary(salary: any) {
    setEditingSalary(salary);
    setFormUserId(String(salary.userId));
    setFormBasicSalary(salary.basicSalary || "");
    setFormHousing(salary.housingAllowance || "");
    setFormTransport(salary.transportAllowance || "");
    setFormOtherAllowances(salary.otherAllowances || "");
    setFormGosi(salary.gosiDeduction || "");
    setFormOtherDeductions(salary.otherDeductions || "");
    setFormBankName(salary.bankName || "");
    setFormIban(salary.iban || "");
    setSalaryDialogOpen(true);
  }

  function handleSaveSalary() {
    if (!formUserId || !formBasicSalary) {
      toast.error(isAr ? "يرجى تعبئة الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    upsertSalary.mutate({
      userId: Number(formUserId),
      basicSalary: formBasicSalary,
      housingAllowance: formHousing || "0",
      transportAllowance: formTransport || "0",
      otherAllowances: formOtherAllowances || "0",
      gosiDeduction: formGosi || "0",
      otherDeductions: formOtherDeductions || "0",
      bankName: formBankName || undefined,
      iban: formIban || undefined,
    });
  }

  // Get staff members not yet configured
  const configuredUserIds = useMemo(() => {
    return new Set((salariesQuery.data || []).map((s: any) => s.userId));
  }, [salariesQuery.data]);

  const availableStaff = useMemo(() => {
    if (!staffQuery.data) return [];
    const items = (staffQuery.data as any).items || [];
    return items.filter((s: any) => !configuredUserIds.has(s.userId));
  }, [staffQuery.data, configuredUserIds]);

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "مسيّر الرواتب" : "Payroll Management"}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payroll">{isAr ? "المسيّر الشهري" : "Monthly Payroll"}</TabsTrigger>
          <TabsTrigger value="salaries">{isAr ? "إعداد الرواتب" : "Salary Configuration"}</TabsTrigger>
          <TabsTrigger value="annual">{isAr ? "التقرير السنوي" : "Annual Report"}</TabsTrigger>
        </TabsList>

        {/* Monthly Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          {/* Month/Year selector + actions */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => generatePayroll.mutate({ month: selectedMonth, year: selectedYear })}
              disabled={generatePayroll.isPending}
            >
              <Play className="w-4 h-4 me-2" />
              {isAr ? "إنشاء المسيّر" : "Generate Payroll"}
            </Button>
            {(payrollQuery.data?.length ?? 0) > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => bulkUpdate.mutate({ month: selectedMonth, year: selectedYear, status: "approved" })}
                  disabled={bulkUpdate.isPending}
                >
                  <Check className="w-4 h-4 me-2" />
                  {isAr ? "اعتماد الكل" : "Approve All"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => bulkUpdate.mutate({ month: selectedMonth, year: selectedYear, status: "paid" })}
                  disabled={bulkUpdate.isPending}
                >
                  <DollarSign className="w-4 h-4 me-2" />
                  {isAr ? "صرف الكل" : "Pay All"}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (payrollQuery.data && summary) {
                      try {
                        const result = await exportPayrollToExcel(payrollQuery.data as any, summary, selectedMonth, selectedYear);
                        if (result !== "cancelled") toast.success(isAr ? "تم تجهيز ملف Excel للحفظ" : "Excel file ready to save");
                      } catch {
                        toast.error(isAr ? "تعذّر تصدير ملف Excel" : "Could not export Excel file");
                      }
                    }
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4 me-2" />
                  {isAr ? "تصدير Excel" : "Export Excel"}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (payrollQuery.data && summary) {
                      try {
                        const result = await exportPayrollToPdf(payrollQuery.data as any, summary, selectedMonth, selectedYear);
                        if (result !== "cancelled") toast.success(isAr ? "تم تجهيز ملف PDF للحفظ" : "PDF ready to save");
                      } catch {
                        toast.error(isAr ? "تعذّر تصدير ملف PDF" : "Could not export PDF file");
                      }
                    }
                  }}
                >
                  <FileDown className="w-4 h-4 me-2" />
                  {isAr ? "تصدير PDF" : "Export PDF"}
                </Button>
              </>
            )}
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{isAr ? "عدد الموظفين" : "Employees"}</p>
                      <p className="text-xl font-bold">{summary.employeeCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{isAr ? "إجمالي الصافي" : "Total Net"}</p>
                      <p className="text-xl font-bold">{summary.totalNet.toLocaleString()} {isAr ? "ر.س" : "SAR"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{isAr ? "مدفوع" : "Paid"}</p>
                      <p className="text-xl font-bold">{summary.paidCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">{isAr ? "معلّق" : "Pending"}</p>
                      <p className="text-xl font-bold">{summary.pendingCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payroll Records Table */}
          {payrollQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (payrollQuery.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{isAr ? "لا يوجد مسيّر رواتب لهذا الشهر" : "No payroll records for this month"}</p>
                <p className="text-sm mt-2">{isAr ? "اضغط \"إنشاء المسيّر\" لتوليد كشف الرواتب" : "Click \"Generate Payroll\" to create payroll records"}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{isAr ? "الراتب الأساسي" : "Basic"}</TableHead>
                      <TableHead>{isAr ? "البدلات" : "Allowances"}</TableHead>
                      <TableHead>{isAr ? "الخصومات" : "Deductions"}</TableHead>
                      <TableHead>{isAr ? "الصافي" : "Net"}</TableHead>
                      <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isAr ? "إجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollQuery.data?.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.userName}</TableCell>
                        <TableCell>{Number(record.basicSalary).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">+{Number(record.totalAllowances).toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">-{Number(record.totalDeductions).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">{Number(record.netSalary).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusColors[record.status] || "secondary"}>
                            {statusLabels[record.status] || record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {record.status === "draft" && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: record.id, status: "approved" })}>
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            {record.status === "approved" && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: record.id, status: "paid" })}>
                                <DollarSign className="w-3 h-3" />
                              </Button>
                            )}
                            {(record.status === "draft" || record.status === "approved") && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: record.id, status: "cancelled" })}>
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Salary Configuration Tab */}
        <TabsContent value="salaries" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{isAr ? "إعداد الرواتب والبدلات لكل موظف" : "Configure salary and allowances per employee"}</p>
            <Button onClick={() => { resetForm(); setSalaryDialogOpen(true); }}>
              <Plus className="w-4 h-4 me-2" />
              {isAr ? "إضافة راتب" : "Add Salary"}
            </Button>
          </div>

          {salariesQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (salariesQuery.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{isAr ? "لم يتم إعداد رواتب بعد" : "No salary configurations yet"}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{isAr ? "الراتب الأساسي" : "Basic Salary"}</TableHead>
                      <TableHead>{isAr ? "بدل السكن" : "Housing"}</TableHead>
                      <TableHead>{isAr ? "بدل النقل" : "Transport"}</TableHead>
                      <TableHead>{isAr ? "التأمينات" : "GOSI"}</TableHead>
                      <TableHead>{isAr ? "البنك" : "Bank"}</TableHead>
                      <TableHead>{isAr ? "إجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salariesQuery.data?.map((salary: any) => (
                      <TableRow key={salary.id}>
                        <TableCell className="font-medium">{salary.userName}</TableCell>
                        <TableCell>{Number(salary.basicSalary).toLocaleString()} {isAr ? "ر.س" : "SAR"}</TableCell>
                        <TableCell>{Number(salary.housingAllowance || 0).toLocaleString()}</TableCell>
                        <TableCell>{Number(salary.transportAllowance || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">{Number(salary.gosiDeduction || 0).toLocaleString()}</TableCell>
                        <TableCell>{salary.bankName || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEditSalary(salary)}>
                              {isAr ? "تعديل" : "Edit"}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteSalary.mutate({ id: salary.id })}>
                              {isAr ? "حذف" : "Delete"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Annual Report Tab */}
        <TabsContent value="annual" className="space-y-4">
          <AnnualReportTab isAr={isAr} />
        </TabsContent>
      </Tabs>

      {/* Salary Dialog */}
      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSalary ? (isAr ? "تعديل الراتب" : "Edit Salary") : (isAr ? "إضافة راتب جديد" : "Add New Salary")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!editingSalary && (
              <div className="space-y-2">
                <Label>{isAr ? "الموظف" : "Employee"} *</Label>
                <Select value={formUserId} onValueChange={setFormUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر الموظف" : "Select employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStaff.map((staff: any) => (
                      <SelectItem key={staff.userId} value={String(staff.userId)}>{staff.fullNameAr || staff.fullNameEn || `موظف #${staff.userId}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? "الراتب الأساسي" : "Basic Salary"} *</Label>
                <Input type="number" value={formBasicSalary} onChange={(e) => setFormBasicSalary(e.target.value)} placeholder="5000" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "بدل السكن" : "Housing Allowance"}</Label>
                <Input type="number" value={formHousing} onChange={(e) => setFormHousing(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "بدل النقل" : "Transport Allowance"}</Label>
                <Input type="number" value={formTransport} onChange={(e) => setFormTransport(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "بدلات أخرى" : "Other Allowances"}</Label>
                <Input type="number" value={formOtherAllowances} onChange={(e) => setFormOtherAllowances(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "خصم التأمينات (GOSI)" : "GOSI Deduction"}</Label>
                <Input type="number" value={formGosi} onChange={(e) => setFormGosi(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "خصومات أخرى" : "Other Deductions"}</Label>
                <Input type="number" value={formOtherDeductions} onChange={(e) => setFormOtherDeductions(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? "اسم البنك" : "Bank Name"}</Label>
                <Input value={formBankName} onChange={(e) => setFormBankName(e.target.value)} placeholder={isAr ? "مثال: الراجحي" : "e.g. Al Rajhi"} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "رقم الآيبان" : "IBAN"}</Label>
                <Input value={formIban} onChange={(e) => setFormIban(e.target.value)} placeholder="SA..." dir="ltr" />
              </div>
            </div>
            {/* Net salary preview */}
            {formBasicSalary && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{isAr ? "صافي الراتب المتوقع:" : "Expected Net Salary:"}</p>
                <p className="text-lg font-bold">
                  {(
                    Number(formBasicSalary || 0) +
                    Number(formHousing || 0) +
                    Number(formTransport || 0) +
                    Number(formOtherAllowances || 0) -
                    Number(formGosi || 0) -
                    Number(formOtherDeductions || 0)
                  ).toLocaleString()} {isAr ? "ر.س" : "SAR"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryDialogOpen(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveSalary} disabled={upsertSalary.isPending}>
              {isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function AnnualReportTab({ isAr }: { isAr: boolean }) {
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const annualQuery = trpc.payroll.getAnnualReport.useQuery({ year: reportYear });

  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  if (annualQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const data = annualQuery.data;
  if (!data) return null;

  const { records, monthlySummary, annualTotal } = data;
  const activeMonths = monthlySummary.filter((m: any) => m.employeeCount > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={String(reportYear)} onValueChange={(v) => setReportYear(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {records.length > 0 && (
          <>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const result = await exportAnnualPayrollToExcel(records as any, monthlySummary, annualTotal, reportYear);
                  if (result !== "cancelled") toast.success(isAr ? "تم تجهيز التقرير السنوي للحفظ" : "Annual report ready to save");
                } catch {
                  toast.error(isAr ? "تعذّر تصدير التقرير السنوي" : "Could not export annual report");
                }
              }}
            >
              <FileSpreadsheet className="w-4 h-4 me-2" />
              {isAr ? "تصدير Excel" : "Export Excel"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const result = await exportAnnualPayrollToPdf(monthlySummary, annualTotal, reportYear);
                  if (result !== "cancelled") toast.success(isAr ? "تم تجهيز التقرير السنوي للحفظ" : "Annual report ready to save");
                } catch {
                  toast.error(isAr ? "تعذّر تصدير التقرير السنوي" : "Could not export annual report");
                }
              }}
            >
              <FileDown className="w-4 h-4 me-2" />
              {isAr ? "تصدير PDF" : "Export PDF"}
            </Button>
          </>
        )}
      </div>

      {/* Annual Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي الرواتب السنوي" : "Annual Total"}</p>
                <p className="text-xl font-bold">{annualTotal.totalNet.toLocaleString()} <span className="text-sm text-muted-foreground">ر.س</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي السجلات" : "Total Records"}</p>
                <p className="text-xl font-bold">{annualTotal.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "الأشهر المسجلة" : "Active Months"}</p>
                <p className="text-xl font-bold">{activeMonths.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "متوسط شهري" : "Monthly Avg"}</p>
                <p className="text-xl font-bold">{activeMonths.length > 0 ? Math.round(annualTotal.totalNet / activeMonths.length).toLocaleString() : 0} <span className="text-sm text-muted-foreground">ر.س</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      {activeMonths.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? `ملخص شهري - ${reportYear}` : `Monthly Summary - ${reportYear}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? "الشهر" : "Month"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الموظفين" : "Employees"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الأساسي" : "Basic"}</TableHead>
                    <TableHead className="text-center">{isAr ? "البدلات" : "Allowances"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الخصومات" : "Deductions"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الصافي" : "Net"}</TableHead>
                    <TableHead className="text-center">{isAr ? "مدفوع" : "Paid"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMonths.map((m: any) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{monthNames[m.month - 1]}</TableCell>
                      <TableCell className="text-center">{m.employeeCount}</TableCell>
                      <TableCell className="text-center">{m.totalBasic.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{m.totalAllowances.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{m.totalDeductions.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-bold">{m.totalNet.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={m.paidCount === m.employeeCount ? "default" : "secondary"}>
                          {m.paidCount}/{m.employeeCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>{isAr ? "الإجمالي" : "Total"}</TableCell>
                    <TableCell className="text-center">{annualTotal.totalRecords}</TableCell>
                    <TableCell className="text-center">{annualTotal.totalBasic.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{annualTotal.totalAllowances.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{annualTotal.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{annualTotal.totalNet.toLocaleString()}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isAr ? `لا توجد بيانات رواتب لعام ${reportYear}` : `No payroll data for ${reportYear}`}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
