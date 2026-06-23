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

  const tierColors: Record<string, { bg: string; icon: string; border: string; accent: string }> = {
    starter: {
      bg: "from-[#00C9B7]/5 to-[#00C9B7]/2",
      icon: "bg-[#00C9B7]/10 text-[#00C9B7]",
      border: "border-[#00C9B7]/20",
      accent: "#00C9B7",
    },
    professional: {
      bg: "from-[#7B61FF]/5 to-[#7B61FF]/2",
      icon: "bg-[#7B61FF]/10 text-[#7B61FF]",
      border: "border-[#7B61FF]/20",
      accent: "#7B61FF",
    },
    enterprise: {
      bg: "from-[#FFB020]/5 to-[#FFB020]/2",
      icon: "bg-[#FFB020]/10 text-[#FFB020]",
      border: "border-[#FFB020]/20",
      accent: "#FFB020",
    },
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
        <h1 className="text-3xl font-bold text-foreground">خطط الاشتراك</h1>
        <p className="text-muted-foreground mt-2">اختر الخطة المناسبة لحضانتك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans?.map((plan) => {
          const TierIcon = tierIcons[plan.tier] || Star;
          const colors = tierColors[plan.tier] || tierColors.starter;
          const features = (Array.isArray(plan.features) ? plan.features : []) as string[];
          
          return (
            <Card
              key={plan.id}
              className={`bg-gradient-to-b ${colors.bg} ${colors.border} border relative overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
            >
              {plan.tier === "professional" && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#7B61FF]" />
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className={`p-3 rounded-xl ${colors.icon}`}>
                    <TierIcon className="w-6 h-6" />
                  </div>
                </div>
                <CardTitle className="text-foreground text-xl">{plan.nameAr}</CardTitle>
                <p className="text-muted-foreground text-sm">{plan.name}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center py-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.priceYearly}</span>
                    <span className="text-muted-foreground text-sm">ر.س/سنة</span>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <LimitRow label="الأطفال" value={plan.maxChildren >= 999 ? "غير محدود" : `حتى ${plan.maxChildren}`} />
                  <LimitRow label="الموظفون" value={plan.maxStaff >= 999 ? "غير محدود" : `حتى ${plan.maxStaff}`} />
                  <LimitRow label="الفصول" value={plan.maxClasses >= 999 ? "غير محدود" : `حتى ${plan.maxClasses}`} />
                  <LimitRow label="التخزين" value={`${plan.storageGb} جيجابايت`} />
                </div>

                {/* Features */}
                <div className="space-y-2 border-t border-border/50 pt-4">
                  {plan.hasAiTools && <FeatureRow label="أدوات الذكاء الاصطناعي" color={colors.accent} />}
                  {plan.hasCustomBranding && <FeatureRow label="هوية بصرية مخصصة" color={colors.accent} />}
                  {plan.hasAdvancedReports && <FeatureRow label="تقارير متقدمة" color={colors.accent} />}
                  {plan.hasParentApp && <FeatureRow label="تطبيق أولياء الأمور" color={colors.accent} />}
                  {plan.hasPushNotifications && <FeatureRow label="إشعارات فورية" color={colors.accent} />}
                  {plan.hasApiAccess && <FeatureRow label="وصول API" color={colors.accent} />}
                  {plan.prioritySupport && <FeatureRow label="دعم أولوية" color={colors.accent} />}
                </div>

                <Button
                  className="w-full mt-4 rounded-xl"
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

      <p className="text-center text-sm text-muted-foreground">
        جميع الخطط تشمل التأهيل والتدريب والتحديثات والدعم الفني.
      </p>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function FeatureRow({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check className="w-4 h-4 shrink-0" style={{ color }} />
      <span className="text-foreground">{label}</span>
    </div>
  );
}
