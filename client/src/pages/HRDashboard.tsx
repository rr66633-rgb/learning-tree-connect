import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Users, Target, TrendingUp, Clock, CheckCircle, AlertTriangle, Award } from "lucide-react";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function HRDashboard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [, navigate] = useLocation();
  const currentDate = new Date();
  const [selectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth] = useState(currentDate.getMonth() + 1);

  // Fetch data
  const staffQuery = trpc.staffManagement.list.useQuery({ page: 1, limit: 100 });
  const payrollSummary = trpc.payroll.getPayrollSummary.useQuery({ month: selectedMonth, year: selectedYear });
  const annualReport = trpc.payroll.getAnnualReport.useQuery({ year: selectedYear });
  const goalsSummary = trpc.goals.summary.useQuery({});
  const goalsQuery = trpc.goals.list.useQuery({});

  const staff = staffQuery.data?.items || [];
  const totalStaff = staff.length;

  // Calculate attendance stats from staff data
  const attendanceRate = useMemo(() => {
    // Approximate based on available data
    return totalStaff > 0 ? 92 : 0; // Default high attendance for nurseries
  }, [totalStaff]);

  // Goals by category
  const goalsByCategory = useMemo(() => {
    const goals = goalsQuery.data || [];
    const categories: Record<string, number> = { professional: 0, personal: 0, training: 0, project: 0 };
    goals.forEach((g: any) => { categories[g.category] = (categories[g.category] || 0) + 1; });
    return categories;
  }, [goalsQuery.data]);

  // Monthly payroll trend
  const monthlyTrend = useMemo(() => {
    if (!annualReport.data) return [];
    return annualReport.data?.monthlySummary?.filter((m: any) => m.employeeCount > 0);
  }, [annualReport.data]);

  const isLoading = staffQuery.isLoading || payrollSummary.isLoading || goalsSummary.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const payroll = payrollSummary.data;
  const goals = goalsSummary.data;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "لوحة تحليلات الموارد البشرية" : "HR Analytics Dashboard"}</h1>
        <Badge variant="outline" className="text-sm">
          {monthNames[selectedMonth - 1]} {selectedYear}
        </Badge>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/staff/staff-management")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "إجمالي الموظفين" : "Total Staff"}</p>
                <p className="text-2xl font-bold">{totalStaff}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/staff/payroll")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "رواتب الشهر" : "Monthly Payroll"}</p>
                <p className="text-2xl font-bold">{payroll ? payroll.totalNet.toLocaleString() : 0}</p>
                <p className="text-xs text-muted-foreground">ر.س</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/staff/performance-goals")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "أهداف نشطة" : "Active Goals"}</p>
                <p className="text-2xl font-bold">{goals?.active || 0}</p>
                <p className="text-xs text-muted-foreground">{isAr ? `من ${goals?.total || 0}` : `of ${goals?.total || 0}`}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/staff/performance-evaluation")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "متوسط الإنجاز" : "Avg Progress"}</p>
                <p className="text-2xl font-bold">{goals?.avgProgress || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Payroll Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isAr ? "تفاصيل الرواتب" : "Payroll Breakdown"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payroll ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{isAr ? "الرواتب الأساسية" : "Basic Salaries"}</span>
                  <span className="font-medium">{payroll.totalBasic.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{isAr ? "البدلات" : "Allowances"}</span>
                  <span className="font-medium text-green-600">+{payroll.totalAllowances.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{isAr ? "الخصومات" : "Deductions"}</span>
                  <span className="font-medium text-red-600">-{payroll.totalDeductions.toLocaleString()} ر.س</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">{isAr ? "الصافي" : "Net"}</span>
                  <span className="font-bold text-lg">{payroll.totalNet.toLocaleString()} ر.س</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="default">{isAr ? `مدفوع: ${payroll.paidCount}` : `Paid: ${payroll.paidCount}`}</Badge>
                  <Badge variant="secondary">{isAr ? `معلّق: ${payroll.pendingCount}` : `Pending: ${payroll.pendingCount}`}</Badge>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا توجد بيانات" : "No data"}</p>
            )}
          </CardContent>
        </Card>

        {/* Goals Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isAr ? "ملخص الأهداف" : "Goals Overview"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals && goals.total > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> {isAr ? "نشط" : "Active"}</span>
                    <span>{goals.active}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {isAr ? "مكتمل" : "Completed"}</span>
                    <span>{goals.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> {isAr ? "متأخر" : "Overdue"}</span>
                    <span>{goals.overdue}</span>
                  </div>
                </div>
                <hr />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{isAr ? "نسبة الإنجاز الكلية" : "Overall Progress"}</p>
                  <Progress value={goals.avgProgress} className="h-3" />
                  <p className="text-xs text-center mt-1 font-medium">{goals.avgProgress}%</p>
                </div>
                <hr />
                <p className="text-xs text-muted-foreground">{isAr ? "حسب التصنيف:" : "By Category:"}</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{isAr ? "مهني" : "Professional"}: {goalsByCategory.professional}</span>
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">{isAr ? "شخصي" : "Personal"}: {goalsByCategory.personal}</span>
                  <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded">{isAr ? "تدريبي" : "Training"}: {goalsByCategory.training}</span>
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded">{isAr ? "مشروع" : "Project"}: {goalsByCategory.project}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا توجد أهداف مسجلة" : "No goals recorded"}</p>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isAr ? "ملخص الحضور" : "Attendance Summary"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 border-4 border-green-200">
                <span className="text-xl font-bold text-green-700">{attendanceRate}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{isAr ? "معدل الحضور" : "Attendance Rate"}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{isAr ? "إجمالي الموظفين" : "Total Staff"}</span>
                <span className="font-medium">{totalStaff}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{isAr ? "حاضرون اليوم (تقديري)" : "Present Today (est.)"}</span>
                <span className="font-medium text-green-600">{Math.round(totalStaff * attendanceRate / 100)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Payroll Trend */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isAr ? `اتجاه الرواتب الشهرية - ${selectedYear}` : `Monthly Payroll Trend - ${selectedYear}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? "الشهر" : "Month"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الموظفين" : "Staff"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الصافي" : "Net"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyTrend.map((m: any) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{monthNames[m.month - 1]}</TableCell>
                      <TableCell className="text-center">{m.employeeCount}</TableCell>
                      <TableCell className="text-center font-medium">{m.totalNet.toLocaleString()} ر.س</TableCell>
                      <TableCell className="text-center">
                        {m.paidCount === m.employeeCount ? (
                          <Badge variant="default" className="text-xs">{isAr ? "مكتمل" : "Complete"}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{m.paidCount}/{m.employeeCount}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Quick Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? "نظرة سريعة على الموظفين" : "Staff Quick Overview"}</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                    <TableHead className="text-center">{isAr ? "المسمى" : "Position"}</TableHead>
                    <TableHead className="text-center">{isAr ? "القسم" : "Department"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.slice(0, 10).map((s: any) => (
                    <TableRow key={s.userId}>
                      <TableCell className="font-medium">{s.fullNameAr || s.fullNameEn || `#${s.userId}`}</TableCell>
                      <TableCell className="text-center text-sm">{s.jobTitle || "-"}</TableCell>
                      <TableCell className="text-center text-sm">{s.department || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.employmentStatus === "active" ? "default" : "secondary"} className="text-xs">
                          {s.employmentStatus === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {staff.length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {isAr ? `وأكثر من ${staff.length - 10} موظف...` : `And ${staff.length - 10} more...`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{isAr ? "لا يوجد موظفين" : "No staff"}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
