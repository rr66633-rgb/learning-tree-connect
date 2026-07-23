import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ShoppingBag, TrendingUp, Package } from "lucide-react";
import { useTranslation } from "react-i18next";


const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  ready: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-orange-100 text-orange-700",
};

export default function SuperAdminStore() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const statusLabels: Record<string, string> = {
  pending: isAr ? "بانتظار الدفع" : "Awaiting Payment",
  paid: isAr ? "مدفوع" : "Paid",
  processing: isAr ? "قيد التجهيز" : "Preparing",
  ready: isAr ? "جاهز للاستلام" : "Ready for Pickup",
  completed: isAr ? "مكتمل" : "Completed",
  cancelled: isAr ? "ملغي" : "Cancelled",
  refunded: isAr ? "مسترجع" : "Refunded",
  };

  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const { data: report, isLoading: reportLoading } = trpc.store.superAdminGetCommissionReport.useQuery();
  const { data: orders, isLoading: ordersLoading } = trpc.store.superAdminGetAllOrders.useQuery();

  if (reportLoading || ordersLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{isAr ? "إدارة المتجر" : "Store Management"}</h1>
        <p className="text-muted-foreground">{isAr ? "نظرة عامة على المبيعات والعمولات" : "Sales and Commissions Overview"}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي الطلبات" : "Total Orders"}</p>
                <p className="text-2xl font-bold">{report?.totalOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "الطلبات المدفوعة" : "Paid Orders"}</p>
                <p className="text-2xl font-bold">{report?.paidOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "إجمالي المبيعات" : "Total Sales"}</p>
                <p className="text-2xl font-bold">{Number(report?.totalRevenue || 0).toFixed(2)} <span className="text-sm">{isAr ? "ر.س" : "SAR"}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isAr ? "العمولات (10%)" : "Commission (10%)"}</p>
                <p className="text-2xl font-bold">{Number(report?.totalCommission || 0).toFixed(2)} <span className="text-sm">{isAr ? "ر.س" : "SAR"}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isAr ? "جميع الطلبات" : "All Orders"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!orders?.length ? (
            <div className="py-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{isAr ? "لا توجد طلبات" : "No orders"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? "رقم الطلب" : "Order Number"}</TableHead>
                    <TableHead>{isAr ? "الحضانة" : "Nursery"}</TableHead>
                    <TableHead>{isAr ? "الإجمالي" : "Total"}</TableHead>
                    <TableHead>{isAr ? "العمولة" : "Commission"}</TableHead>
                    <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">#{order.orderNumber}</TableCell>
                      <TableCell>{order.organizationId}</TableCell>
                      <TableCell className="font-medium">{order.total} {isAr ? "ر.س" : "SAR"}</TableCell>
                      <TableCell className="text-amber-600">{order.commission} {isAr ? "ر.س" : "SAR"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || ""}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString(locale)}</TableCell>
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
