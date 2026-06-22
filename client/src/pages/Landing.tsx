import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  Shield, Brain, Users, BarChart3, MessageCircle, 
  Calendar, CreditCard, BookOpen, Star, CheckCircle2,
  ArrowLeft, Sparkles
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663757302822/cscUgnSZqDVGFSpPSQMsV9/nashaa-official-logo-B6wEWwsMZLrsNvxGDzxUwN.webp";

export default function Landing() {
  const [, setLocation] = useLocation();

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
      name: "أساسي", 
      price: "٤٩٩", 
      period: "شهرياً",
      features: ["حتى ٣٠ طفل", "٥ موظفين", "الحضور والتقارير اليومية", "التواصل مع الأهل", "الدعم الفني"],
      popular: false 
    },
    { 
      name: "احترافي", 
      price: "٩٩٩", 
      period: "شهرياً",
      features: ["حتى ١٠٠ طفل", "١٥ موظف", "جميع مزايا الأساسي", "الذكاء الاصطناعي", "التقييمات والمنهج", "التحليلات المتقدمة", "تطبيق الأهل"],
      popular: true 
    },
    { 
      name: "مؤسسي", 
      price: "١,٩٩٩", 
      period: "شهرياً",
      features: ["عدد غير محدود", "جميع مزايا الاحترافي", "فروع متعددة", "واجهة مخصصة", "مدير حساب مخصص", "تكامل مع الأنظمة", "أولوية الدعم"],
      popular: false 
    },
  ];

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="نشأة" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold" style={{ color: '#1A1F36' }}>نشأة</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">المزايا</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">الأسعار</a>
              <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">تواصل معنا</a>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/login")}
                className="border-[#00C9B7] text-[#00C9B7] hover:bg-[#00C9B7]/5"
              >
                تسجيل الدخول
              </Button>
              <Button 
                onClick={() => setLocation("/register")}
                className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white"
              >
                ابدأ مجاناً
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-10" style={{ background: '#00C9B7' }} />
        <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full opacity-10" style={{ background: '#7B61FF' }} />
        <div className="absolute top-40 left-1/4 w-32 h-32 rounded-full opacity-10" style={{ background: '#FF5CA8' }} />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00C9B7]/10 text-[#00C9B7] text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>منصة متكاملة لإدارة الحضانات ورياض الأطفال</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6" style={{ color: '#1A1F36' }}>
            منصة متكاملة لإدارة الحضانات
            <span className="block mt-2" style={{ color: '#00C9B7' }}>ورياض الأطفال</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            إدارة الحضور والانصراف، التواصل مع الأهالي، التقييمات، الخطط التعليمية، والذكاء الاصطناعي في منصة واحدة.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => setLocation("/register")}
              className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-[#00C9B7]/25"
            >
              ابدأ تجربتك المجانية
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              className="text-lg px-8 py-6 rounded-xl border-gray-200"
            >
              تسجيل الدخول
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 mt-12 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00C9B7]" />
              <span>تجربة مجانية ١٤ يوم</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00C9B7]" />
              <span>بدون بطاقة ائتمان</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00C9B7]" />
              <span>دعم فني على مدار الساعة</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4" style={{ background: '#F2F4F7' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1A1F36' }}>
              كل ما تحتاجه لإدارة حضانتك
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              مجموعة متكاملة من الأدوات الذكية المصممة خصيصاً للحضانات ورياض الأطفال في المملكة العربية السعودية
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
                <CardContent className="p-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${feature.color}15` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1A1F36' }}>{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "+١٥٠", label: "حضانة مشتركة" },
              { value: "+٥,٠٠٠", label: "طفل مسجل" },
              { value: "+١,٢٠٠", label: "معلمة نشطة" },
              { value: "٩٩.٩٪", label: "وقت التشغيل" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-extrabold mb-1" style={{ color: '#00C9B7' }}>{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1A1F36' }}>
              خطط أسعار مرنة
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              اختر الخطة المناسبة لحجم حضانتك. جميع الخطط تشمل تجربة مجانية لمدة ١٤ يوم.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card 
                key={i} 
                className={`relative border-2 transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular 
                    ? 'border-[#00C9B7] shadow-xl shadow-[#00C9B7]/10' 
                    : 'border-gray-100 hover:border-[#00C9B7]/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#00C9B7' }}>
                    الأكثر طلباً
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1F36' }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold" style={{ color: '#1A1F36' }}>{plan.price}</span>
                    <span className="text-sm text-gray-500">ر.س / {plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#00C9B7' }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-[#00C9B7] hover:bg-[#00B5A5] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                    onClick={() => setLocation("/register")}
                  >
                    ابدأ الآن
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4" style={{ background: '#1A1F36' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            جاهز لتحويل حضانتك رقمياً؟
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            انضم لأكثر من ١٥٠ حضانة في المملكة تستخدم Naashah لإدارة عملياتها اليومية بكفاءة وذكاء
          </p>
          <Button 
            size="lg"
            onClick={() => setLocation("/register")}
            className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white text-lg px-10 py-6 rounded-xl shadow-lg"
          >
            ابدأ تجربتك المجانية الآن
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-4 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="نشأة" className="w-10 h-10 object-contain" />
                <span className="text-xl font-bold" style={{ color: '#1A1F36' }}>نشأة</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
                منصة متكاملة لإدارة الحضانات ورياض الأطفال. نساعد المراكز التعليمية في المملكة العربية السعودية على إدارة عملياتها اليومية بكفاءة وذكاء.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4" style={{ color: '#1A1F36' }}>المنصة</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#features" className="hover:text-[#00C9B7]">المزايا</a></li>
                <li><a href="#pricing" className="hover:text-[#00C9B7]">الأسعار</a></li>
                <li><a href="/privacy" className="hover:text-[#00C9B7]">سياسة الخصوصية</a></li>
                <li><a href="/terms" className="hover:text-[#00C9B7]">شروط الخدمة</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4" style={{ color: '#1A1F36' }}>تواصل معنا</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>البريد: info@naashah.com</li>
                <li>الهاتف: +966 53 378 4686</li>
                <li><a href="https://naashah.com" className="hover:text-[#00C9B7]">naashah.com</a></li>
                <li>المملكة العربية السعودية</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>جميع الحقوق محفوظة لمنصة نشأة Naashah ٢٠٢٦ | <a href="https://naashah.com" className="hover:text-[#00C9B7]">naashah.com</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
