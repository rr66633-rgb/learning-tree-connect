import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Check, Star, Zap, Crown } from "lucide-react";

export default function SubscriptionPlans() {
  const [, navigate] = useLocation();
  const { data: plans, isLoading } = trpc.onboarding.getPlans.useQuery();

  const tierIcons: Record<string, any> = {
    starter: Star,
    professional: Zap,
    enterprise: Crown,
  };

  const tierColors: Record<string, string> = {
    starter: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    professional: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    enterprise: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  };

  const tierBadgeColors: Record<string, string> = {
    starter: "bg-blue-500/20 text-blue-400",
    professional: "bg-emerald-500/20 text-emerald-400",
    enterprise: "bg-amber-500/20 text-amber-400",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">خطط الاشتراك</h1>
        <p className="text-slate-400 mt-2">اختر الخطة المناسبة لحضانتك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans?.map((plan) => {
          const TierIcon = tierIcons[plan.tier] || Star;
          const features = JSON.parse(plan.features as string || "[]") as string[];
          
          return (
            <Card
              key={plan.id}
              className={`bg-gradient-to-b ${tierColors[plan.tier]} border relative overflow-hidden`}
            >
              {plan.tier === "professional" && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className={`p-3 rounded-xl ${tierBadgeColors[plan.tier]}`}>
                    <TierIcon className="w-6 h-6" />
                  </div>
                </div>
                <CardTitle className="text-white text-xl">{plan.nameAr}</CardTitle>
                <p className="text-slate-400 text-sm">{plan.name}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center py-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-white">{plan.priceMonthly}</span>
                    <span className="text-slate-400 text-sm">ر.س/شهر</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    أو {plan.priceYearly} ر.س/سنة (وفّر {Math.round((1 - Number(plan.priceYearly) / (Number(plan.priceMonthly) * 12)) * 100)}%)
                  </p>
                </div>

                {/* Limits */}
                <div className="space-y-2 border-t border-slate-700/50 pt-4">
                  <LimitRow label="الأطفال" value={plan.maxChildren >= 999 ? "غير محدود" : `حتى ${plan.maxChildren}`} />
                  <LimitRow label="الموظفون" value={plan.maxStaff >= 999 ? "غير محدود" : `حتى ${plan.maxStaff}`} />
                  <LimitRow label="الفصول" value={plan.maxClasses >= 999 ? "غير محدود" : `حتى ${plan.maxClasses}`} />
                  <LimitRow label="التخزين" value={`${plan.storageGb} جيجابايت`} />
                </div>

                {/* Features */}
                <div className="space-y-2 border-t border-slate-700/50 pt-4">
                  {plan.hasAiTools && <FeatureRow label="أدوات الذكاء الاصطناعي" />}
                  {plan.hasCustomBranding && <FeatureRow label="هوية بصرية مخصصة" />}
                  {plan.hasAdvancedReports && <FeatureRow label="تقارير متقدمة" />}
                  {plan.hasParentApp && <FeatureRow label="تطبيق أولياء الأمور" />}
                  {plan.hasPushNotifications && <FeatureRow label="إشعارات فورية" />}
                  {plan.hasApiAccess && <FeatureRow label="وصول API" />}
                  {plan.prioritySupport && <FeatureRow label="دعم أولوية" />}
                </div>

                <Button
                  className="w-full mt-4"
                  variant={plan.tier === "professional" ? "default" : "outline"}
                  onClick={() => navigate(`/onboarding?plan=${plan.id}`)}
                >
                  {plan.tier === "professional" ? "الأكثر شعبية - ابدأ الآن" : "اختر هذه الخطة"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="text-slate-300">{label}</span>
    </div>
  );
}
