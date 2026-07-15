import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { 
  Check, Star, Zap, Crown, ArrowLeft, Shield, 
  Sparkles, Clock, HeadphonesIcon, CheckCircle2, Menu, X
} from "lucide-react";
import { useState } from "react";
import { trackViewContent } from "@/lib/metaPixel";

const LOGO_URL = "/assets/logo.webp";

export default function Pricing() {
  const [, navigate] = useLocation();
  const { data: plans, isLoading } = trpc.onboarding.getPlans.useQuery();
  const [billingCycle, setBillingCycle] = useState<"yearly" | "monthly">("yearly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    trackViewContent("Pricing Page", "pricing");
    document.title = "الأسعار - نشأة | منصة إدارة الحضانات ورياض الأطفال";
  }, []);

  const tierIcons: Record<string, any> = {
    starter: Star,
    professional: Zap,
    enterprise: Crown,
  };

  const tierColors: Record<string, { bg: string; icon: string; border: string; accent: string; btnBg: string }> = {
    starter: {
      bg: "bg-white",
      icon: "bg-[#00C9B7]/10 text-[#00C9B7]",
      border: "border-gray-200",
      accent: "#00C9B7",
      btnBg: "bg-gray-100 hover:bg-gray-200 text-gray-800",
    },
    professional: {
      bg: "bg-white",
      icon: "bg-[#7B61FF]/10 text-[#7B61FF]",
      border: "border-[#00C9B7]",
      accent: "#7B61FF",
      btnBg: "bg-[#00C9B7] hover:bg-[#00B5A5] text-white shadow-[0_4px_14px_rgba(0,201,183,0.25)]",
    },
    enterprise: {
      bg: "bg-white",
      icon: "bg-[#FFB020]/10 text-[#FFB020]",
      border: "border-gray-200",
      accent: "#FFB020",
      btnBg: "bg-gray-100 hover:bg-gray-200 text-gray-800",
    },
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] sm:h-[68px] md:h-[72px]">
            <div className="flex items-center gap-3 sm:gap-3.5 cursor-pointer" onClick={() => navigate("/")}>
              <img src={LOGO_URL} alt="نشأة" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain flex-shrink-0" />
              <span className="text-base sm:text-lg md:text-xl font-bold text-slate-800">نشأة</span>
            </div>

            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="/#features" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors duration-200">المزايا</a>
              <span className="text-sm font-medium text-[#00C9B7]">الأسعار</span>
              <a href="/#contact" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors duration-200">تواصل معنا</a>
            </div>

            <div className="hidden sm:flex items-center gap-2.5 md:gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate("/login")}
                className="border-[#00C9B7] text-[#00C9B7] hover:bg-[#e6faf8] h-9 md:h-10 px-3.5 md:px-5 text-xs md:text-sm rounded-lg font-medium"
              >
                تسجيل الدخول
              </Button>
              <Button 
                onClick={() => navigate("/register-nursery")}
                className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white h-9 md:h-10 px-3.5 md:px-5 text-xs md:text-sm rounded-lg font-medium active:scale-[0.97] transition-all duration-150"
              >
                سجل حضانتك
              </Button>
            </div>

            <button 
              className="sm:hidden p-2.5 -ml-2 rounded-lg hover:bg-gray-50 transition-colors active:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-5 py-5 space-y-1">
              <a href="/#features" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>المزايا</a>
              <span className="block text-sm font-medium text-[#00C9B7] py-2.5 px-3 rounded-lg bg-[#e6faf8]">الأسعار</span>
              <a href="/#contact" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>تواصل معنا</a>
              <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-2.5">
                <Button 
                  variant="outline" 
                  onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
                  className="w-full border-[#00C9B7] text-[#00C9B7] hover:bg-[#e6faf8] h-11 rounded-lg text-sm font-medium"
                >
                  تسجيل الدخول
                </Button>
                <Button 
                  onClick={() => { navigate("/register-nursery"); setMobileMenuOpen(false); }}
                  className="w-full bg-[#00C9B7] hover:bg-[#00B5A5] text-white h-11 rounded-lg text-sm font-medium"
                >
                  سجل حضانتك
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-[100px] sm:pt-[120px] md:pt-[140px] pb-8 sm:pb-12 md:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Discount Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF5CA8]/10 text-[#FF5CA8] text-xs sm:text-sm font-bold mb-5 sm:mb-7 animate-pulse">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>عرض خاص: خصم 50% لفترة محدودة</span>
          </div>

          <h1 className="text-[26px] leading-[1.35] sm:text-3xl sm:leading-[1.3] md:text-4xl md:leading-[1.25] lg:text-5xl lg:leading-[1.2] font-extrabold text-slate-800 mb-3 sm:mb-4 md:mb-5">
            اختر الخطة المناسبة لحضانتك
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-[1.7]">
            جميع الخطط تشمل تجربة مجانية ١٤ يوم بدون بطاقة ائتمان. اشتركي هالشهر واحصلي على خصم ٥٠٪
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6 sm:mt-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly" 
                  ? "bg-[#00C9B7] text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "yearly" 
                  ? "bg-[#00C9B7] text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              سنوي
              <Badge className="mr-2 bg-[#FF5CA8]/10 text-[#FF5CA8] text-[10px] px-1.5 py-0">وفّر 20%</Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
              <Skeleton className="h-[500px] rounded-2xl" />
              <Skeleton className="h-[500px] rounded-2xl" />
              <Skeleton className="h-[500px] rounded-2xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
              {plans?.map((plan) => {
                const TierIcon = tierIcons[plan.tier] || Star;
                const colors = tierColors[plan.tier] || tierColors.starter;
                const isProfessional = plan.tier === "professional";
                
                const originalPrice = billingCycle === "yearly" 
                  ? Number(plan.priceYearly) 
                  : Number(plan.priceMonthly);
                const discountedPrice = Math.round(originalPrice * 0.5);

                return (
                  <Card
                    key={plan.id}
                    className={`relative border-2 transition-all duration-300 rounded-2xl flex flex-col ${colors.border} ${colors.bg} ${
                      isProfessional ? 'sm:scale-[1.02] md:scale-105 shadow-[0_8px_30px_rgba(0,201,183,0.12)]' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]'
                    }`}
                  >
                    {isProfessional && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] sm:text-xs font-bold text-white whitespace-nowrap bg-[#00C9B7] shadow-sm">
                        الأكثر طلباً
                      </div>
                    )}
                    <CardContent className="p-5 sm:p-6 md:p-7 lg:p-8 flex flex-col flex-1">
                      {/* Plan Header */}
                      <div className="text-center mb-4 sm:mb-5">
                        <div className="flex justify-center mb-3">
                          <div className={`p-3 rounded-xl ${colors.icon}`}>
                            <TierIcon className="w-6 h-6" />
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">{plan.nameAr}</h3>
                        <p className="text-xs text-gray-500 mt-1">{plan.name}</p>
                      </div>

                      {/* Price with Discount */}
                      <div className="text-center py-4 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-sm text-gray-400 line-through">{originalPrice.toLocaleString("ar-SA")}</span>
                          <Badge className="bg-[#FF5CA8]/10 text-[#FF5CA8] text-[10px] font-bold px-2">-50%</Badge>
                        </div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">
                            {discountedPrice.toLocaleString("ar-SA")}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            ر.س / {billingCycle === "yearly" ? "سنة" : "شهر"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          SAR {discountedPrice.toLocaleString("en")} / {billingCycle === "yearly" ? "Year" : "Month"}
                        </p>
                      </div>

                      {/* Limits */}
                      <div className="space-y-2.5 border-t border-gray-100 pt-4 mb-4">
                        <LimitRow label="الأطفال" value={plan.maxChildren >= 999 ? "غير محدود" : `حتى ${plan.maxChildren}`} />
                        <LimitRow label="الموظفون" value={plan.maxStaff >= 999 ? "غير محدود" : `حتى ${plan.maxStaff}`} />
                        <LimitRow label="الفصول" value={plan.maxClasses >= 999 ? "غير محدود" : `حتى ${plan.maxClasses}`} />
                        <LimitRow label="التخزين" value={`${plan.storageGb} جيجابايت`} />
                      </div>

                      {/* Features */}
                      <div className="space-y-2 border-t border-gray-100 pt-4 mb-6 flex-1">
                        {plan.hasParentApp && <FeatureRow label="تطبيق أولياء الأمور" color={colors.accent} />}
                        {plan.hasPushNotifications && <FeatureRow label="إشعارات فورية" color={colors.accent} />}
                        {plan.hasAiTools && <FeatureRow label="أدوات الذكاء الاصطناعي" color={colors.accent} />}
                        {plan.hasCustomBranding && <FeatureRow label="هوية بصرية مخصصة" color={colors.accent} />}
                        {plan.hasAdvancedReports && <FeatureRow label="تقارير متقدمة" color={colors.accent} />}
                        {plan.hasApiAccess && <FeatureRow label="وصول API" color={colors.accent} />}
                        {plan.prioritySupport && <FeatureRow label="دعم أولوية" color={colors.accent} />}
                      </div>

                      {/* CTA Button */}
                      <Button
                        className={`w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base font-medium active:scale-[0.97] transition-all duration-150 ${colors.btnBg}`}
                        onClick={() => navigate(`/register-nursery?plan=${plan.tier}`)}
                      >
                        {isProfessional ? "ابدأ تجربتك المجانية" : "اختر هذه الخطة"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#F8FAFB]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 text-center mb-8 sm:mb-12">
            جميع الخطط تشمل
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Clock, title: "تجربة مجانية ١٤ يوم", desc: "بدون بطاقة ائتمان" },
              { icon: HeadphonesIcon, title: "دعم فني متواصل", desc: "على مدار الساعة" },
              { icon: Shield, title: "أمان وتشفير كامل", desc: "بيانات محمية 100%" },
              { icon: Sparkles, title: "تحديثات مستمرة", desc: "مزايا جديدة شهرياً" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 sm:p-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#00C9B7]/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00C9B7]" />
                </div>
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-[11px] sm:text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 text-center mb-8 sm:mb-12">
            أسئلة شائعة
          </h2>
          <div className="space-y-4">
            {[
              { q: "هل يمكنني تغيير الخطة لاحقاً؟", a: "نعم، يمكنك الترقية أو تغيير خطتك في أي وقت. سيتم احتساب الفرق بشكل نسبي." },
              { q: "ماذا يحدث بعد انتهاء الفترة التجريبية؟", a: "ستحتاج لاختيار خطة مدفوعة للاستمرار. لن يتم حذف بياناتك." },
              { q: "هل يمكنني إلغاء الاشتراك؟", a: "نعم، يمكنك إلغاء اشتراكك في أي وقت. ستستمر في الاستفادة حتى نهاية فترة الاشتراك الحالية." },
              { q: "ما طرق الدفع المتاحة؟", a: "نقبل مدى، فيزا، ماستركارد، وApple Pay عبر بوابة ميسر الآمنة." },
              { q: "هل الأسعار شاملة الضريبة؟", a: "نعم، جميع الأسعار المعروضة شاملة ضريبة القيمة المضافة (15%)." },
            ].map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 sm:p-5 hover:border-[#00C9B7]/20 transition-colors">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#f0fdf9] via-white to-[#ecfdf5]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-3 sm:mb-4">
            جاهزة لتطوير حضانتك؟
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
            انضمي لأكثر من ١٥٠ حضانة تستخدم نشأة لإدارة عملياتها اليومية بكفاءة
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button 
              size="lg"
              onClick={() => navigate("/register-nursery")}
              className="w-full sm:w-auto bg-[#00C9B7] hover:bg-[#00B5A5] text-white text-sm sm:text-base px-6 sm:px-8 h-12 sm:h-14 rounded-xl shadow-[0_4px_14px_rgba(0,201,183,0.25)] active:scale-[0.97] transition-all duration-150 font-medium"
            >
              ابدأ تجربتك المجانية
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 mt-6 text-[11px] sm:text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00C9B7]" />
              <span>١٤ يوم مجاناً</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00C9B7]" />
              <span>بدون بطاقة ائتمان</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00C9B7]" />
              <span>إلغاء في أي وقت</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="نشأة" className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium text-gray-700">نشأة</span>
            <span className="text-xs text-gray-400">• منصة إدارة الحضانات ورياض الأطفال</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <a href="/privacy" className="hover:text-[#00C9B7] transition-colors">سياسة الخصوصية</a>
            <a href="/terms" className="hover:text-[#00C9B7] transition-colors">الشروط والأحكام</a>
            <span>© {new Date().getFullYear()} نشأة</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function FeatureRow({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check className="w-4 h-4 shrink-0" style={{ color }} />
      <span className="text-slate-700">{label}</span>
    </div>
  );
}
