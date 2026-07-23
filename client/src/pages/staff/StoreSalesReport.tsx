import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";


const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  paid: "#10b981",
  processing: "#3b82f6",
  ready: "#8b5cf6",
  completed: "#059669",
  cancelled: "#ef4444",
  refunded: "#6b7280",
};


export default function StoreSalesReport() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const STATUS_LABELS: Record<string, string> = {
  pending: isAr ? "قيد الانتظار" : "Pending",
  paid: isAr ? "مدفوع" : "Paid",
  processing: isAr ? "قيد التجهيز" : "Preparing",
  ready: isAr ? "جاهز" : "Ready",
  completed: isAr ? "مكتمل" : "Completed",
  cancelled: isAr ? "ملغي" : "Cancelled",
  refunded: isAr ? "مسترد" : "Refunded",
  };

  const chartConfig: ChartConfig = {
  revenue: { label: isAr ? "الإيرادات" : "Revenue", color: "#10b981" },
  orders: { label: isAr ? "الطلبات" : "Orders", color: "#3b82f6" },
  };

  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const { data: report, isLoading } = trpc.store.adminGetSalesReport.useQuery({ period });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const summary = report?.summary;
  const dailySales = report?.dailySales || [];
  const topProducts = report?.topProducts || [];
  const ordersByStatus = report?.ordersByStatus || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {isAr ? "تقرير المبيعات" : "Sales Report"}
          </h1>
          <p className="text-muted-foreground">{isAr ? "إحصائيات وتحليلات مبيعات المتجر" : "Store Sales Statistics & Analytics"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={period === "week" ? "default" : "outline"}
            onClick={() => setPeriod("week")}
          >
            {isAr ? "أسبوع" : "Week"}
          </Button>
          <Button
            size="sm"
            variant={period === "month" ? "default" : "outline"}
            onClick={() => setPeriod("month")}
          >
            {isAr ? "شهر" : "Month"}
          </Button>
          <Button
            size="sm"
            variant={period === "year" ? "default" : "outline"}
            onClick={() => setPeriod("year")}
          >
            {isAr ? "سنة" : "Year"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي الطلبات" : "Total Orders"}</p>
                <p className="text-2xl font-bold">{summary?.totalOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي الإيرادات" : "Total Revenue"}</p>
                <p className="text-2xl font-bold">{Number(summary?.totalRevenue || 0).toFixed(0)} <span className="text-sm font-normal">{isAr ? "ر.س" : "SAR"}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "صافي الإيرادات" : "Net Revenue"}</p>
                <p className="text-2xl font-bold">{Number(summary?.netRevenue || 0).toFixed(0)} <span className="text-sm font-normal">{isAr ? "ر.س" : "SAR"}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "العمولة (10%)" : "Commission (10%)"}</p>
                <p className="text-2xl font-bold">{Number(summary?.totalCommission || 0).toFixed(0)} <span className="text-sm font-normal">{isAr ? "ر.س" : "SAR"}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isAr ? "الإيرادات اليومية" : "Daily Revenue"}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailySales.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                {isAr ? "لا توجد بيانات مبيعات في هذه الفترة" : "No sales data in this period"}
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => {
                          const d = new Date(v);
                          return d.toLocaleDateString("ar-SA");
                        }}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 3 }}
                    name={isAr ? "الإيرادات (ر.س)" : "Revenue (SAR)"}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isAr ? "حالة الطلبات" : "Order Status"}</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                {isAr ? "لا توجد طلبات في هذه الفترة" : "No requests in this period"}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="status"
                      >
                        {ordersByStatus.map((entry, index) => (
                          <Cell key={index} fill={STATUS_COLORS[entry.status] || "#6b7280"} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-sm text-sm">
                              <p className="font-medium">{STATUS_LABELS[data.status] || data.status}</p>
                              <p className="text-muted-foreground">{data.count} {isAr ? "طلب" : "Request"}</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {ordersByStatus.map((item) => (
                    <div key={item.status} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[item.status] || "#6b7280" }}
                      />
                      <span>{STATUS_LABELS[item.status] || item.status}</span>
                      <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isAr ? "المنتجات الأكثر مبيعاً" : "Best-selling Products"}</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              {isAr ? "لا توجد مبيعات في هذه الفترة" : "No sales in this period"}
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="productName"
                  fontSize={12}
                  width={90}
                  tickFormatter={(v) => v?.length > 15 ? v.substring(0, 15) + "..." : v}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === "totalQuantity") return [`${value} ${isAr ? "وحدة" : "Unit"}`, "الكمية المباعة"];
                        if (name === "totalRevenue") return [`${Number(value).toFixed(0)} ${isAr ? "ر.س" : "SAR"}`, "الإيرادات"];
                        return [value, name];
                      }}
                    />
                  }
                />
                <Bar dataKey="totalQuantity" fill="#3b82f6" radius={[0, 4, 4, 0]} name={isAr ? "الكمية المباعة" : "Quantity Sold"} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" onClick={() => navigate("/staff/store")}>
          <Package className="h-4 w-4 ml-1" />
          {isAr ? "إدارة المنتجات" : "Product Management"}
        </Button>
        <Button variant="outline" onClick={() => navigate("/staff/store/orders")}>
          <ShoppingBag className="h-4 w-4 ml-1" />
          {isAr ? "إدارة الطلبات" : "Order Management"}
        </Button>
      </div>
    </div>
  );
}
