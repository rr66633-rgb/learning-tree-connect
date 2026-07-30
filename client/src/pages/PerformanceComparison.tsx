import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Users, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";

const ratingLabels: Record<string, string> = {
  excellent: "ممتاز",
  very_good: "جيد جداً",
  good: "جيد",
  acceptable: "مقبول",
  poor: "ضعيف",
};

const ratingColors: Record<string, string> = {
  excellent: "bg-green-100 text-green-800",
  very_good: "bg-blue-100 text-blue-800",
  good: "bg-yellow-100 text-yellow-800",
  acceptable: "bg-orange-100 text-orange-800",
  poor: "bg-red-100 text-red-800",
};

export default function PerformanceComparison() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [period1, setPeriod1] = useState<string>("");
  const [period2, setPeriod2] = useState<string>("");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const staffQuery = trpc.staffManagement.list.useQuery({});
  const evaluationsQuery = trpc.evaluation.listEvaluations.useQuery({});

  // Get unique periods from evaluations
  const periods = useMemo(() => {
    if (!evaluationsQuery.data) return [];
    const periodsSet = new Set(evaluationsQuery.data.map((e: any) => e.period));
    const uniquePeriods: string[] = [];
    periodsSet.forEach((p) => uniquePeriods.push(p as string));
    return uniquePeriods.sort().reverse();
  }, [evaluationsQuery.data]);

  // Set default periods
  useEffect(() => {
    if (periods.length >= 2 && !period1 && !period2) {
      setPeriod1(periods[1]); // older period
      setPeriod2(periods[0]); // newer period
    } else if (periods.length === 1 && !period1) {
      setPeriod1(periods[0]);
      setPeriod2(periods[0]);
    }
  }, [periods, period1, period2]);

  // Filter evaluations for comparison
  const comparisonData = useMemo(() => {
    if (!evaluationsQuery.data || !period1 || !period2) return [];

    const evals = evaluationsQuery.data as any[];
    const period1Evals = evals.filter((e) => e.period === period1);
    const period2Evals = evals.filter((e) => e.period === period2);

    // Get all unique employees
    const employeeIdSet = new Set([...period1Evals.map((e: any) => e.userId), ...period2Evals.map((e: any) => e.userId)]);
    const allEmployeeIds: number[] = [];
    employeeIdSet.forEach((id) => allEmployeeIds.push(id as number));

    const comparison = allEmployeeIds
      .filter((id) => selectedEmployee === "all" || String(id) === selectedEmployee)
      .map((userId) => {
        const p1 = period1Evals.find((e: any) => e.userId === userId);
        const p2 = period2Evals.find((e: any) => e.userId === userId);
        const score1 = p1 ? Number(p1.overallScore) : null;
        const score2 = p2 ? Number(p2.overallScore) : null;
        const change = score1 !== null && score2 !== null ? score2 - score1 : null;

        return {
          userId,
          userName: p1?.userName || p2?.userName || "",
          score1,
          rating1: p1?.overallRating || null,
          score2,
          rating2: p2?.overallRating || null,
          change,
        };
      });

    return comparison.sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  }, [evaluationsQuery.data, period1, period2, selectedEmployee]);

  // Summary stats
  const stats = useMemo(() => {
    if (comparisonData.length === 0) return null;
    const withChange = comparisonData.filter((d) => d.change !== null);
    const improved = withChange.filter((d) => d.change! > 0).length;
    const declined = withChange.filter((d) => d.change! < 0).length;
    const stable = withChange.filter((d) => d.change === 0).length;
    const avgChange = withChange.length > 0 ? withChange.reduce((sum, d) => sum + d.change!, 0) / withChange.length : 0;
    return { improved, declined, stable, avgChange, total: comparisonData.length };
  }, [comparisonData]);

  // Chart rendering
  useEffect(() => {
    if (!chartRef.current || comparisonData.length === 0) return;

    const loadChart = async () => {
      const { Chart, CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend } = await import("chart.js");
      Chart.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend);

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current!.getContext("2d")!;
      const labels = comparisonData.slice(0, 10).map((d) => d.userName);
      const data1 = comparisonData.slice(0, 10).map((d) => d.score1 ?? 0);
      const data2 = comparisonData.slice(0, 10).map((d) => d.score2 ?? 0);

      chartInstanceRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: period1,
              data: data1,
              backgroundColor: "rgba(99, 102, 241, 0.6)",
              borderColor: "rgb(99, 102, 241)",
              borderWidth: 1,
            },
            {
              label: period2,
              data: data2,
              backgroundColor: "rgba(16, 185, 129, 0.6)",
              borderColor: "rgb(16, 185, 129)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
            tooltip: {
              callbacks: {
                label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: { display: true, text: isAr ? "النسبة %" : "Score %" },
            },
          },
        },
      });
    };

    loadChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [comparisonData, period1, period2, isAr]);

  if (evaluationsQuery.isLoading || staffQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const staffItems = staffQuery.data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "تقرير مقارنة الأداء" : "Performance Comparison Report"}</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{isAr ? "الموظف" : "Employee"}</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={isAr ? "جميع الموظفين" : "All Employees"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "جميع الموظفين" : "All Employees"}</SelectItem>
                  {staffItems.map((s: any) => (
                    <SelectItem key={s.userId} value={String(s.userId)}>
                      {s.fullNameAr || s.fullNameEn || s.user?.name || `#${s.userId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{isAr ? "الفترة الأولى" : "Period 1"}</label>
              <Select value={period1} onValueChange={setPeriod1}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={isAr ? "اختر الفترة" : "Select period"} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">{isAr ? "الفترة الثانية" : "Period 2"}</label>
              <Select value={period2} onValueChange={setPeriod2}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={isAr ? "اختر الفترة" : "Select period"} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "إجمالي الموظفين" : "Total Employees"}</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "تحسّن" : "Improved"}</p>
                  <p className="text-xl font-bold text-green-600">{stats.improved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "تراجع" : "Declined"}</p>
                  <p className="text-xl font-bold text-red-600">{stats.declined}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "متوسط التغيير" : "Avg Change"}</p>
                  <p className={`text-xl font-bold ${stats.avgChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stats.avgChange >= 0 ? "+" : ""}{stats.avgChange.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {comparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? "مقارنة الأداء بين الفترتين" : "Performance Comparison Chart"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: "320px" }}>
              <canvas ref={chartRef}></canvas>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "تفاصيل المقارنة" : "Comparison Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          {comparisonData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isAr ? "لا توجد بيانات تقييم للمقارنة. يرجى اختيار فترتين مختلفتين." : "No evaluation data for comparison. Please select two different periods."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                    <TableHead className="text-center">{period1 || (isAr ? "الفترة ١" : "Period 1")}</TableHead>
                    <TableHead className="text-center">{isAr ? "التقدير" : "Rating"}</TableHead>
                    <TableHead className="text-center">{period2 || (isAr ? "الفترة ٢" : "Period 2")}</TableHead>
                    <TableHead className="text-center">{isAr ? "التقدير" : "Rating"}</TableHead>
                    <TableHead className="text-center">{isAr ? "التغيير" : "Change"}</TableHead>
                    <TableHead className="text-center">{isAr ? "الاتجاه" : "Trend"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell className="text-center">
                        {row.score1 !== null ? `${row.score1.toFixed(1)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.rating1 ? (
                          <Badge className={ratingColors[row.rating1]}>{ratingLabels[row.rating1]}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.score2 !== null ? `${row.score2.toFixed(1)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.rating2 ? (
                          <Badge className={ratingColors[row.rating2]}>{ratingLabels[row.rating2]}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.change !== null ? (
                          <span className={`font-bold ${row.change > 0 ? "text-green-600" : row.change < 0 ? "text-red-600" : "text-gray-500"}`}>
                            {row.change > 0 ? "+" : ""}{row.change.toFixed(1)}%
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.change !== null ? (
                          row.change > 0 ? (
                            <ArrowUpRight className="w-5 h-5 text-green-500 inline" />
                          ) : row.change < 0 ? (
                            <ArrowDownRight className="w-5 h-5 text-red-500 inline" />
                          ) : (
                            <Minus className="w-5 h-5 text-gray-400 inline" />
                          )
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
