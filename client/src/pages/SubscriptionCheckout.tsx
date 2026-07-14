import { useEffect, useRef, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Shield, CreditCard, CheckCircle2, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Moyasar: any;
  }
}

export default function SubscriptionCheckout() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const planId = params.get("plan");
  const billingCycle = (params.get("cycle") || "yearly") as "monthly" | "yearly";
  const orgId = params.get("org");

  const { data: plans, isLoading: plansLoading } = trpc.onboarding.getPlans.useQuery();
  const { data: gatewayStatus } = trpc.payments.gatewayStatus.useQuery();

  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const moyasarRef = useRef<HTMLDivElement>(null);

  const selectedPlan = plans?.find((p) => p.id === Number(planId));

  const amount = useMemo(() => {
    if (!selectedPlan) return 0;
    const price = billingCycle === "yearly"
      ? Number(selectedPlan.priceYearly)
      : Number(selectedPlan.priceMonthly);
    return price;
  }, [selectedPlan, billingCycle]);

  // Discounted amount (50% off)
  const discountedAmount = useMemo(() => {
    return amount * 0.5;
  }, [amount]);

  const amountInHalalas = Math.round(discountedAmount * 100);

  useEffect(() => {
    if (!selectedPlan || !gatewayStatus?.publishableKey || paymentInitiated) return;
    if (!moyasarRef.current) return;
    if (amountInHalalas < 100) return; // Minimum 1 SAR

    // Clear previous form
    moyasarRef.current.innerHTML = "";

    try {
      window.Moyasar.init({
        element: moyasarRef.current,
        amount: amountInHalalas,
        currency: "SAR",
        description: `اشتراك ${selectedPlan.nameAr} - ${billingCycle === "yearly" ? "سنوي" : "شهري"}`,
        publishable_api_key: gatewayStatus.publishableKey,
        callback_url: `https://naashah.com/payment-callback?plan=${planId}&cycle=${billingCycle}&org=${orgId || ""}`,
        methods: ["creditcard", "applepay"],
        supported_networks: ["visa", "mastercard", "mada"],
        apple_pay: {
          country: 'SA',
          label: 'Naashah',
          validate_merchant_url: 'https://api.moyasar.com/v1/applepay/initiate',
          version: 6,
          supported_countries: ['SA'],
        },
        language: "ar",
        fixed_width: false,
        on_initiating: async function() {
          setPaymentInitiated(true);
          return true;
        },
        metadata: {
          planId: String(planId),
          billingCycle,
          organizationId: orgId || "",
          type: "subscription",
        },
      });
    } catch (err) {
      console.error("Moyasar init error:", err);
      toast.error("حدث خطأ في تهيئة بوابة الدفع");
    }
  }, [selectedPlan, gatewayStatus, amountInHalalas, planId, billingCycle, orgId, paymentInitiated]);

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <p className="text-muted-foreground">لم يتم تحديد خطة اشتراك صالحة</p>
            <Button onClick={() => navigate("/pricing")} variant="outline">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة لخطط الاشتراك
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gatewayStatus?.isConfigured || !gatewayStatus?.publishableKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">بوابة الدفع غير مفعلة</h2>
            <p className="text-muted-foreground text-sm">
              يرجى التواصل مع الإدارة لتفعيل بوابة الدفع الإلكتروني.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">إتمام الدفع</h1>
          <p className="text-muted-foreground text-sm">ادفع بأمان عبر بوابة ميسر</p>
        </div>

        {/* Plan Summary */}
        <Card className="border-[#00C9B7]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{selectedPlan.nameAr}</CardTitle>
              <Badge variant="secondary" className="bg-[#00C9B7]/10 text-[#00C9B7]">
                {billingCycle === "yearly" ? "سنوي" : "شهري"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">السعر الأصلي</span>
              <span className="text-muted-foreground line-through">{amount.toLocaleString("ar-SA")} ر.س</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#FF5CA8] font-medium">خصم 50% (عرض خاص)</span>
              <span className="text-[#FF5CA8] font-medium">-{(amount - discountedAmount).toLocaleString("ar-SA")} ر.س</span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-semibold text-foreground">المبلغ المطلوب</span>
              <span className="text-xl font-bold text-[#00C9B7]">{discountedAmount.toLocaleString("ar-SA")} ر.س</span>
            </div>
            <p className="text-xs text-muted-foreground">
              شامل ضريبة القيمة المضافة • {billingCycle === "yearly" ? "اشتراك سنوي" : "اشتراك شهري"}
            </p>
          </CardContent>
        </Card>

        {/* Moyasar Payment Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#7B61FF]" />
              بيانات الدفع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentInitiated ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#00C9B7]" />
                <p className="text-sm text-muted-foreground">جاري معالجة الدفع...</p>
              </div>
            ) : (
              <div ref={moyasarRef} className="moyasar-form" />
            )}
          </CardContent>
        </Card>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>مدفوعاتك محمية بتشفير SSL 256-bit</span>
        </div>

        {/* Supported Networks */}
        <div className="flex items-center justify-center gap-4 opacity-60">
          <img src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/assets/mada.svg" alt="مدى" className="h-6" />
          <img src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/assets/visa.svg" alt="Visa" className="h-6" />
          <img src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/assets/mastercard.svg" alt="Mastercard" className="h-6" />
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate(-1 as any)} className="text-muted-foreground">
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة
          </Button>
        </div>
      </div>
    </div>
  );
}
