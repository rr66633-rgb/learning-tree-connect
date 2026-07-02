import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  Shield, Brain, Users, BarChart3, MessageCircle, 
  Calendar, CreditCard, BookOpen, CheckCircle2,
  ArrowLeft, Sparkles, Menu, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { trackViewContent } from "@/lib/metaPixel";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663757302822/cscUgnSZqDVGFSpPSQMsV9/nashaa-official-logo-B6wEWwsMZLrsNvxGDzxUwN.webp";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    trackViewContent("Landing Page", "homepage");
  }, []);

  useEffect(() => {
    document.title = "نشأة - منصة إدارة الحضانات ورياض الأطفال الذكية";
  }, []);

  const features = [
    { icon: Users, title: "إدارة الأطفال", desc: "ملفات شاملة لكل طفل مع متابعة النمو والتطور", color: "#00C9B7" },
    { icon: Calendar, title: "الحضور الذكي", desc: "تسجيل حضور بالموقع الجغرافي وإشعارات فورية للأهل", color: "#7B61FF" },
    { icon: Brain, title: "الذكاء الاصطناعي", desc: "توليد خطط أسبوعية وملاحظات وتقارير بضغطة زر", color: "#FF5CA8" },
    { icon: MessageCircle, title: "التواصل مع الأهل", desc: "رسائل فورية وتقارير يومية وصور ومقاطع", color: "#FFB020" },
    { icon: BookOpen, title: "المنهج والتقييم", desc: "تقييمات معتمدة على إطار السنوات المبكرة", color: "#00C9B7" },
    { icon: CreditCard, title: "الفوترة والمالية", desc: "فواتير آلية ومتابعة المدفوعات والتقارير المالية", color: "#7B61FF" },
    { icon: BarChart3, title: "التحليلات والتقارير", desc: "لوحات تحكم تفاعلية وتقارير شاملة لاتخاذ القرار", color: "#FF5CA8" },
    { icon: Shield, title: "الأمان والخصوصية", desc: "تشفير كامل وصلاحيات متعددة المستويات", color: "#FFB020" },
  ];

  const plans = [
    { 
      id: "basic",
      name: "أساسي", 
      price: "٦,٩٠٠", 
      priceEn: "6,900",
      period: "سنوياً",
      features: ["حتى ٥٠ طفل", "حتى ١٠ موظفين", "الحضور وتسجيل الدخول/الخروج", "التقارير اليومية", "التواصل مع الأهالي", "تطبيق الأهل للجوال", "الدعم الفني"],
      popular: false 
    },
    { 
      id: "professional",
      name: "احترافي", 
      price: "١٠,٩٠٠", 
      priceEn: "10,900",
      period: "سنوياً",
      features: ["حتى ١٠٠ طفل", "حتى ٢٥ موظف", "جميع مزايا الخطة الأساسية", "المساعد الذكي (AI)", "التقييمات ومتابعة التطور", "أدوات التخطيط التعليمي", "التحليلات والتقارير المتقدمة", "تطبيق الأهل للجوال"],
      popular: true 
    },
    { 
      id: "enterprise",
      name: "مؤسسي", 
      price: "١٥,٩٠٠", 
      priceEn: "15,900",
      period: "سنوياً",
      features: ["حتى ٢٠٠ طفل", "فروع متعددة", "جميع مزايا الخطة الاحترافية", "صلاحيات وأدوار متقدمة", "مدير حساب مخصص", "أولوية الدعم الفني", "التكامل والوصول عبر API", "خيارات العلامة التجارية المخصصة"],
      popular: false 
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl">
      {/* Navigation - Premium header with proper spacing */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] sm:h-[68px] md:h-[72px]">
            {/* Logo - proper vertical alignment */}
            <div className="flex items-center gap-3 sm:gap-3.5">
              <img 
                src={LOGO_URL} 
                alt="نشأة" 
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain flex-shrink-0" 
              />
              <span className="text-base sm:text-lg md:text-xl font-bold text-slate-800">نشأة</span>
            </div>

            {/* Desktop nav links - centered */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors duration-200">المزايا</a>
              <a href="/pricing" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors duration-200">الأسعار</a>
              <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors duration-200">تواصل معنا</a>
            </div>

            {/* Desktop buttons - proper spacing */}
            <div className="hidden sm:flex items-center gap-2.5 md:gap-3">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/login")}
                className="border-[#00C9B7] text-[#00C9B7] hover:bg-[#e6faf8] h-9 md:h-10 px-3.5 md:px-5 text-xs md:text-sm rounded-lg font-medium"
              >
                تسجيل الدخول
              </Button>
              <Button 
                onClick={() => setLocation("/register-nursery")}
                className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white h-9 md:h-10 px-3.5 md:px-5 text-xs md:text-sm rounded-lg font-medium active:scale-[0.97] transition-all duration-150"
              >
                سجل حضانتك
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="sm:hidden p-2.5 -ml-2 rounded-lg hover:bg-gray-50 transition-colors active:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-100 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="px-5 py-5 space-y-1">
              <a href="#features" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>المزايا</a>
              <a href="/pricing" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>الأسعار</a>
              <a href="#contact" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>تواصل معنا</a>
              <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-2.5">
                <Button 
                  variant="outline" 
                  onClick={() => { setLocation("/login"); setMobileMenuOpen(false); }}
                  className="w-full border-[#00C9B7] text-[#00C9B7] hover:bg-[#e6faf8] h-11 rounded-lg text-sm font-medium"
                >
                  تسجيل الدخول
                </Button>
                <Button 
                  onClick={() => { setLocation("/register-nursery"); setMobileMenuOpen(false); }}
                  className="w-full bg-[#00C9B7] hover:bg-[#00B5A5] text-white h-11 rounded-lg text-sm font-medium"
                >
                  سجل حضانتك
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Clean, no decorative elements */}
      <section className="pt-[84px] sm:pt-[100px] md:pt-[120px] pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#e6faf8] text-[#00C9B7] text-[11px] sm:text-xs md:text-sm font-medium mb-5 sm:mb-7 md:mb-8">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>منصة متكاملة لإدارة الحضانات ورياض الأطفال</span>
          </div>
          
          {/* Headline - proper spacing and sizing */}
          <h1 className="text-[26px] leading-[1.35] sm:text-4xl sm:leading-[1.3] md:text-5xl md:leading-[1.25] lg:text-[56px] lg:leading-[1.2] font-extrabold text-slate-800 mb-4 sm:mb-5 md:mb-6">
            منصة متكاملة لإدارة الحضانات
            <span className="block mt-1 sm:mt-2 text-[#00C9B7]">ورياض الأطفال</span>
          </h1>
          
          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-7 sm:mb-8 md:mb-10 leading-[1.7] px-1">
            إدارة الحضور والانصراف، التواصل مع الأهالي، التقييمات، الخطط التعليمية، والذكاء الاصطناعي في منصة واحدة.
          </p>
          
          {/* CTA Buttons - consistent sizing */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2 sm:px-0">
            <Button 
              size="lg"
              onClick={() => setLocation("/register-nursery")}
              className="w-full sm:w-auto bg-[#00C9B7] hover:bg-[#00B5A5] text-white text-sm sm:text-base md:text-lg px-6 sm:px-8 h-12 sm:h-[52px] md:h-14 rounded-xl shadow-[0_4px_14px_rgba(0,201,183,0.25)] hover:shadow-[0_6px_20px_rgba(0,201,183,0.3)] active:scale-[0.97] transition-all duration-150 font-medium"
            >
              سجل حضانتك الآن
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              className="w-full sm:w-auto text-sm sm:text-base md:text-lg px-6 sm:px-8 h-12 sm:h-[52px] md:h-14 rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 font-medium text-gray-700"
            >
              تسجيل الدخول
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 md:gap-x-8 mt-7 sm:mt-10 md:mt-12 text-[11px] sm:text-xs md:text-sm text-gray-500">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C9B7] flex-shrink-0" />
              <span>تجربة مجانية ١٤ يوم</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C9B7] flex-shrink-0" />
              <span>بدون بطاقة ائتمان</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00C9B7] flex-shrink-0" />
              <span>دعم فني على مدار الساعة</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#F8FAFB]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-2.5 sm:mb-3 md:mb-4">
              كل ما تحتاجه لإدارة حضانتك
            </h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-2 leading-relaxed">
              مجموعة متكاملة من الأدوات الذكية المصممة خصيصاً للحضانات ورياض الأطفال في المملكة العربية السعودية
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 bg-white rounded-xl hover:-translate-y-0.5">
                <CardContent className="p-3.5 sm:p-4 md:p-5 lg:p-6">
                  <div 
                    className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-2.5 sm:mb-3 md:mb-4"
                    style={{ background: `${feature.color}12` }}
                  >
                    <feature.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-[13px] sm:text-sm md:text-base lg:text-lg font-bold text-slate-800 mb-1 sm:mb-1.5 md:mb-2">{feature.title}</h3>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 text-center">
            {[
              { value: "+١٥٠", label: "حضانة مشتركة" },
              { value: "+٥,٠٠٠", label: "طفل مسجل" },
              { value: "+١,٢٠٠", label: "معلمة نشطة" },
              { value: "٩٩.٩٪", label: "وقت التشغيل" },
            ].map((stat, i) => (
              <div key={i} className="py-3 sm:py-4">
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#00C9B7] mb-0.5 sm:mb-1">{stat.value}</div>
                <div className="text-[11px] sm:text-xs md:text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-2.5 sm:mb-3 md:mb-4">
              خطط اشتراك سنوية
            </h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-2 leading-relaxed">
              اختر الخطة المناسبة لحجم حضانتك. جميع الأسعار بالريال السعودي والفوترة سنوية.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card 
                key={i} 
                className={`relative border-2 transition-all duration-300 rounded-2xl flex flex-col ${
                  plan.popular 
                    ? 'border-[#00C9B7] shadow-[0_8px_30px_rgba(0,201,183,0.12)]' 
                    : 'border-gray-100 hover:border-[#00C9B7]/30 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                } ${plan.popular ? 'sm:scale-[1.02] md:scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] sm:text-xs font-bold text-white whitespace-nowrap bg-[#00C9B7] shadow-sm">
                    الأكثر طلباً
                  </div>
                )}
                <CardContent className="p-5 sm:p-6 md:p-7 lg:p-8 flex flex-col flex-1">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800">{plan.price}</span>
                    <span className="text-[11px] sm:text-xs md:text-sm text-gray-500">ر.س / {plan.period}</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-400 mb-4 sm:mb-5 md:mb-6">SAR {plan.priceEn} / Year</p>
                  <ul className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-5 sm:mb-6 md:mb-8 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-[11px] sm:text-xs md:text-sm text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 text-[#00C9B7]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full h-10 sm:h-11 md:h-12 rounded-xl text-xs sm:text-sm md:text-base font-medium active:scale-[0.97] transition-all duration-150 ${
                      plan.popular 
                        ? 'bg-[#00C9B7] hover:bg-[#00B5A5] text-white shadow-[0_4px_14px_rgba(0,201,183,0.25)]' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                    onClick={() => setLocation(`/register-nursery?plan=${plan.id}`)}
                  >
                    ابدأ الآن
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <p className="text-center text-[11px] sm:text-xs md:text-sm text-gray-500 mt-6 sm:mt-8 md:mt-10 max-w-2xl mx-auto px-4 leading-relaxed">
            جميع الخطط تشمل التأهيل والتدريب والتحديثات والدعم الفني.
          </p>
        </div>
      </section>

      {/* Free Demo Booking Section */}
      <section id="demo" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#f0fdf9] via-white to-[#ecfdf5]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#00C9B7]/10 text-[#00997A] px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Calendar className="w-4 h-4" />
            <span>عرض تعريفي مجاني</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4 md:mb-6 px-2">
            احجزي عرضاً تعريفياً مجانياً لمنصة نشأة
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto px-4 leading-relaxed">
            اكتشفي كيف تساعد نشأة حضانتك على إدارة الحضور، التواصل مع أولياء الأمور، والتقارير اليومية بكل سهولة
          </p>
          <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white">
            <iframe
              src="https://calendly.com/naashah-info/30min?hide_gdpr_banner=1&background_color=ffffff&text_color=1e293b&primary_color=00C9B7"
              width="100%"
              height="660"
              frameBorder="0"
              title="احجزي موعدك مع نشأة"
              className="w-full min-h-[580px] sm:min-h-[620px] md:min-h-[660px]"
            />
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-4">
            مدة العرض ٣٠ دقيقة عبر زوم
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4C1D95]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 md:mb-6 px-2">
            جاهز لتحويل حضانتك رقمياً؟
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-purple-100 mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto px-4 leading-relaxed">
            انضم لأكثر من ١٥٠ حضانة في المملكة تستخدم نشأة لإدارة عملياتها اليومية بكفاءة وذكاء
          </p>
          <Button 
            size="lg"
            onClick={() => setLocation("/register-nursery")}
            className="w-full sm:w-auto bg-[#00C9B7] hover:bg-[#00B5A5] text-white text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 h-12 sm:h-[52px] md:h-14 rounded-xl shadow-[0_4px_14px_rgba(0,201,183,0.3)] hover:shadow-[0_6px_20px_rgba(0,201,183,0.4)] active:scale-[0.97] transition-all duration-150 font-medium"
          >
            سجل حضانتك الآن
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-8 sm:py-10 md:py-12 px-4 sm:px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <img src={LOGO_URL} alt="نشأة" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain flex-shrink-0" />
                <span className="text-base sm:text-lg md:text-xl font-bold text-slate-800">نشأة</span>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-600 leading-[1.7] max-w-sm">
                منصة متكاملة لإدارة الحضانات ورياض الأطفال. نساعد المراكز التعليمية في المملكة العربية السعودية على إدارة عملياتها اليومية بكفاءة وذكاء.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-2.5 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base text-slate-800">المنصة</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs md:text-sm text-gray-600">
                <li><a href="#features" className="hover:text-[#00C9B7] transition-colors duration-200">المزايا</a></li>
                <li><a href="/pricing" className="hover:text-[#00C9B7] transition-colors duration-200">الأسعار</a></li>
                <li><a href="/privacy" className="hover:text-[#00C9B7] transition-colors duration-200">سياسة الخصوصية</a></li>
                <li><a href="/terms" className="hover:text-[#00C9B7] transition-colors duration-200">شروط الخدمة</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2.5 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base text-slate-800">تواصل معنا</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs md:text-sm text-gray-600">
                <li>البريد: info@naashah.com</li>
                <li>الهاتف: +966 53 378 4686</li>
                <li><a href="https://naashah.com" className="hover:text-[#00C9B7] transition-colors duration-200">naashah.com</a></li>
                <li>المملكة العربية السعودية</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-6 sm:mt-8 pt-5 sm:pt-6 md:pt-8 text-center text-[10px] sm:text-xs md:text-sm text-gray-500">
            <p>جميع الحقوق محفوظة لمنصة نشأة Naashah ٢٠٢٦ | <a href="https://naashah.com" className="hover:text-[#00C9B7] transition-colors duration-200">naashah.com</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
