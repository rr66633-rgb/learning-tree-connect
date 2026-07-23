import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, ArrowLeft, Package } from "lucide-react";
import { useLocation } from "wouter";
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

export default function ParentStoreOrders() {
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
  const [, navigate] = useLocation();
  const { data: orders, isLoading } = trpc.store.getMyOrders.useQuery();

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? "طلباتي" : "My requests"}</h1>
          <p className="text-muted-foreground">{isAr ? "سجل مشترياتك من المتجر" : "Your Store Purchases Log"}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/parent/store")}>
          <ArrowLeft className="h-4 w-4 ml-1" />
          {isAr ? "العودة للمتجر" : "Back to Store"}
        </Button>
      </div>

      {!orders?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{isAr ? "لا توجد طلبات" : "No orders"}</p>
            <p className="text-muted-foreground mb-4">{isAr ? "لم تقم بأي طلب بعد" : "You haven\'t made any requests yet"}</p>
            <Button onClick={() => navigate("/parent/store")}>{isAr ? "تصفح المتجر" : "Browse Store"}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm font-medium">#{order.orderNumber}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <Badge className={statusColors[order.status] || ""}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{isAr ? "الإجمالي" : "Total"}</span>
                  <span className="font-bold text-primary">{order.total} {isAr ? "ر.س" : "SAR"}</span>
                </div>
                {order.status === "ready" && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-sm text-green-700 font-medium">{isAr ? "طلبك جاهز للاستلام من الحضانة" : "Your order is ready for pick-up from the nursery"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
