import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Crown, AlertTriangle, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Hardcoded plans - no API call needed (instant load)
const PLANS = [
  {
    id: 1,
    nameAr: "الأساسية",
    priceYearly: 4830,
    originalPriceYearly: 6900,
    priceMonthly: 604,
    discountEnabled: true,
    discountPercentage: 30,
    maxOrganizations: 1,
  },
  {
    id: 2,
    nameAr: "الاحترافية",
    priceYearly: 7630,
    originalPriceYearly: 10900,
    priceMonthly: 954,
    discountEnabled: true,
    discountPercentage: 30,
    maxOrganizations: 1,
  },
  {
    id: 3,
    nameAr: "المؤسسية",
    priceYearly: 11200,
    originalPriceYearly: 15900,
    priceMonthly: 1392,
    discountEnabled: true,
    discountPercentage: 30,
    maxOrganizations: 3,
  },
];

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "نشط", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  trialing: { label: "فترة تجريبية", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
  past_due: { label: "متأخر - فترة سماح", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: AlertTriangle },
  expired: { label: "منتهي", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertTriangle },
  cancelled: { label: "ملغي", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: AlertTriangle },
  none: { label: "لا يوجد اشتراك", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: CreditCard },
};

export default function SubscriptionStatus() {
  const [, navigate] = useLocation();
  // Only fetch subscription status (plans are hardcoded above)
  const { data: subStatus } = trpc.subscriptionPayment.status.useQuery({
    organizationId: 0, // Will be overridden by ctx
  });

  const status = subStatus?.status || "none";
  const statusInfo = statusLabels[status] || statusLabels.none;
  const StatusIcon = statusInfo.icon;
  const subscription = subStatus?.subscription;

  const currentPlan = PLANS.find((p) => p.id === subscription?.planId);

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">إدارة الاشتراك</h1>
        {(status === "expired" || status === "none" || status === "past_due") && (
          <Button onClick={() => navigate("/pricing")} className="bg-[#00C9B7] hover:bg-[#00C9B7]/90">
            <CreditCard className="w-4 h-4 ml-2" />
            {status === "none" ? "اشترك الآن" : "تجديد الاشتراك"}
          </Button>
        )}
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-[#FFB020]" />
            حالة الاشتراك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={`${statusInfo.color} border px-3 py-1`}>
              <StatusIcon className="w-4 h-4 ml-1" />
              {statusInfo.label}
            </Badge>
          </div>

          {currentPlan && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">الباقة الحالية</p>
                <p className="text-lg font-semibold">{currentPlan.nameAr}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">دورة الفوترة</p>
                <p className="text-lg font-semibold">
                  {subscription?.billingCycle === "yearly" ? "سنوي" : "شهري"}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">المبلغ</p>
                <p className="text-lg font-semibold">{subscription?.amount} ر.س</p>
              </div>
            </div>
          )}

          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">بداية الفترة:</span>
                <span>{new Date(subscription.currentPeriodStart).toLocaleDateString("ar-SA")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">نهاية الفترة:</span>
                <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString("ar-SA")}</span>
              </div>
            </div>
          )}

          {status === "past_due" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  اشتراكك منتهي — لديك فترة سماح 7 أيام لتجديد الاشتراك قبل تعليق الحساب.
                </p>
              </div>
              <Button onClick={() => navigate("/pricing")} className="mt-3 bg-yellow-600 hover:bg-yellow-700">
                تجديد الآن
              </Button>
            </div>
          )}

          {status === "trialing" && subscription && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  أنت في الفترة التجريبية المجانية — تنتهي في {new Date(subscription.currentPeriodEnd).toLocaleDateString("ar-SA")}
                </p>
              </div>
              <Button onClick={() => navigate("/pricing")} variant="outline" className="mt-3">
                اختر باقة واشترك
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Overview */}
      {status !== "active" && (
        <Card>
          <CardHeader>
            <CardTitle>الباقات المتاحة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 hover:border-[#00C9B7] transition-colors cursor-pointer"
                  onClick={() => navigate(`/checkout?plan=${plan.id}&cycle=yearly`)}
                >
                  <h3 className="font-semibold text-lg">{plan.nameAr}</h3>
                  <div className="mt-2">
                    {plan.discountEnabled && plan.originalPriceYearly && (
                      <p className="text-sm text-muted-foreground line-through">
                        {Number(plan.originalPriceYearly).toLocaleString()} ر.س/سنة
                      </p>
                    )}
                    <p className="text-xl font-bold text-[#00C9B7]">
                      {Number(plan.priceYearly).toLocaleString()} ر.س/سنة
                    </p>
                  </div>
                  {plan.discountEnabled && (
                    <Badge className="mt-2 bg-red-500/10 text-red-600 border-red-500/20">
                      خصم {Number(plan.discountPercentage)}%
                    </Badge>
                  )}
                  {plan.maxOrganizations > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      حتى {plan.maxOrganizations} حضانات
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
