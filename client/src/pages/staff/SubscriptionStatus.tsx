import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Crown, Calendar, CheckCircle2, Clock, CreditCard, Star, Building2 } from "lucide-react";

// Hardcoded plans - no API call needed, loads instantly
const PLANS = [
  {
    id: 1,
    name: "الأساسية",
    slug: "starter",
    monthlyPrice: 604,
    yearlyPrice: 6900,
    discountedYearlyPrice: 4830,
    maxOrganizations: 1,
    features: ["إدارة الأطفال والحضور", "التقارير اليومية", "التواصل مع أولياء الأمور", "دعم فني أساسي"],
    icon: Star,
  },
  {
    id: 2,
    name: "الاحترافية",
    slug: "professional",
    monthlyPrice: 954,
    yearlyPrice: 10900,
    discountedYearlyPrice: 7630,
    maxOrganizations: 1,
    features: ["كل مميزات الأساسية", "الخطط الأسبوعية بالذكاء الاصطناعي", "المالية والفواتير", "المتجر الإلكتروني", "تقارير متقدمة"],
    popular: true,
    icon: Crown,
  },
  {
    id: 3,
    name: "المؤسسية",
    slug: "enterprise",
    monthlyPrice: 1392,
    yearlyPrice: 15900,
    discountedYearlyPrice: 11200,
    maxOrganizations: 3,
    pricePerExtraOrg: 3000,
    features: ["كل مميزات الاحترافية", "حتى 3 حضانات (فروع)", "3,000 ر.س لكل فرع إضافي", "مدير حساب مخصص", "أولوية في الدعم الفني"],
    icon: Building2,
  },
];

const DISCOUNT_EXPIRES = "23 أغسطس 2026";
const DISCOUNT_PERCENT = 30;
const TRIAL_DAYS = 14;

export default function SubscriptionStatus() {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الاشتراك</h1>
          <p className="text-muted-foreground mt-1">اختر الباقة المناسبة لحضانتك</p>
        </div>
      </div>

      {/* Discount Banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-full">
            <Crown className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-700">عرض خاص: خصم {DISCOUNT_PERCENT}% على الاشتراك السنوي</p>
            <p className="text-sm text-amber-600">ينتهي {DISCOUNT_EXPIRES} — فترة تجريبية {TRIAL_DAYS} يوم مجاناً</p>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">الأكثر طلباً</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                {/* Pricing */}
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold">{plan.discountedYearlyPrice.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">ر.س/سنة</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-through">{plan.yearlyPrice.toLocaleString()} ر.س</p>
                  <p className="text-xs text-muted-foreground mt-1">أو {plan.monthlyPrice} ر.س/شهر</p>
                </div>

                {/* Features */}
                <ul className="text-sm space-y-2 text-right">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Max orgs */}
                {plan.maxOrganizations > 1 && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    تدعم حتى {plan.maxOrganizations} حضانات
                  </p>
                )}

                {/* CTA */}
                <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                  ابدأ الفترة التجريبية
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>فترة تجريبية {TRIAL_DAYS} يوم مجاناً</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>فترة سماح 7 أيام بعد الانتهاء</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              <span>الدفع عبر مدى، فيزا، Apple Pay</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
