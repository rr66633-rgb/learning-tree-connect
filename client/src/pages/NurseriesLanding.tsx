import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { 
  Shield, Users, BarChart3, MessageCircle, 
  Calendar, CreditCard, BookOpen, CheckCircle2,
  ArrowLeft, Clock, TrendingUp, Heart, 
  Smartphone, FileText, Menu, X, Play,
  Star, Zap, Award, Target, Send, Quote, MapPin, Phone, Sparkles
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/assets/logo.webp";

export default function NurseriesLanding() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Demo form state
  const [demoForm, setDemoForm] = useState({
    nurseryName: "",
    contactName: "",
    phone: "",
    email: "",
    city: "",
    childrenCount: "",
    centerType: "",
    notes: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const submitDemo = trpc.demo.submitDemoRequest.useMutation({
    onSuccess: () => {
      setFormSubmitted(true);
      toast.success("تم إرسال طلبك بنجاح! سنتواصل معك قريباً.");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
    },
  });

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.nurseryName || !demoForm.contactName || !demoForm.phone) {
      toast.error("يرجى تعبئة الحقول المطلوبة");
      return;
    }
    submitDemo.mutate(demoForm);
  };

  useEffect(() => {
    document.title = "نشأة - النظام المتكامل لإدارة الحضانات ومراكز التأهيل والرعاية النهارية";
  }, []);

  // Intersection observer for stats animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const features = [
    { icon: Users, title: "إدارة الأطفال والفصول", desc: "تسجيل بيانات الأطفال الكاملة، إدارة الفصول وتوزيع الأطفال على المعلمات", color: "#00C9B7" },
    { icon: Calendar, title: "الحضور والانصراف", desc: "تسجيل حضور الأطفال والموظفين بلمسة واحدة مع إشعارات فورية لأولياء الأمور", color: "#7B61FF" },
    { icon: FileText, title: "التقارير اليومية", desc: "تقرير يومي مفصل لولي الأمر يشمل الوجبات والنوم والأنشطة مع صور وفيديوهات", color: "#FF5CA8" },
    { icon: MessageCircle, title: "التواصل مع أولياء الأمور", desc: "رسائل مباشرة وإشعارات فورية وإعلانات عامة وتقويم سنوي مشترك", color: "#FFB020" },
    { icon: CreditCard, title: "المالية والمدفوعات", desc: "فواتير إلكترونية تلقائية، دفع عبر مدى وفيزا وأبل باي، وتقارير مالية", color: "#00C9B7" },
    { icon: TrendingUp, title: "النمو والتطور", desc: "مقياس الكشف المبكر عن صعوبات التعلم والنمو، تقييمات مخصصة لكل طفل", color: "#7B61FF" },
    { icon: BookOpen, title: "الخطط والمناهج", desc: "خطط أسبوعية للأنشطة التعليمية، مكتبة مناهج جاهزة ومشاركة مع أولياء الأمور", color: "#FF5CA8" },
    { icon: Shield, title: "طلب الاستلام والنقل", desc: "نظام طلب استلام الطفل مع تتبع عمليات التسليم لضمان أمان الأطفال", color: "#FFB020" },
  ];

  const comparisonData = [
    { feature: "التقارير اليومية", traditional: "يدوية ورقية", naashah: "تلقائية مع صور" },
    { feature: "التواصل مع الأسرة", traditional: "بطيء ومحدود", naashah: "فوري ومباشر" },
    { feature: "المدفوعات", traditional: "تحويل بنكي يدوي", naashah: "إلكترونية متكاملة" },
    { feature: "متابعة النمو", traditional: "غير متوفرة", naashah: "علمية بمقاييس معتمدة" },
    { feature: "المتجر", traditional: "غير متوفر", naashah: "إلكتروني مدمج" },
    { feature: "الحضور والانصراف", traditional: "سجل ورقي", naashah: "إلكتروني مع إشعارات" },
  ];

  const plans = [
    { 
      id: "basic", name: "الأساسية", price: "٦,٩٠٠", period: "سنوياً",
      children: "حتى ٣٠ طفل", staff: "حتى ١٠ موظفين",
      features: ["الحضور والتقارير اليومية", "التقويم والإعلانات", "تطبيق ولي الأمر"],
      popular: false, gradient: "from-slate-50 to-white", borderColor: "border-gray-200"
    },
    { 
      id: "professional", name: "الاحترافية", price: "١٠,٩٠٠", period: "سنوياً",
      children: "حتى ١٠٠ طفل", staff: "حتى ٣٠ موظف",
      features: ["جميع مميزات الأساسية", "الرسائل والمستندات والصور", "الخطط الأسبوعية والفواتير", "المساعد الذكي والتقارير المتقدمة", "الهوية البصرية"],
      popular: true, gradient: "from-[#00C9B7]/5 to-[#7B61FF]/5", borderColor: "border-[#00C9B7]"
    },
    { 
      id: "enterprise", name: "المؤسسية", price: "١٥,٩٠٠", period: "سنوياً",
      children: "غير محدود", staff: "غير محدود",
      features: ["جميع مميزات الاحترافية", "دعم أولوية", "مساحة تخزين ١٠٠ جيجا", "فروع متعددة"],
      popular: false, gradient: "from-[#7B61FF]/5 to-[#FF5CA8]/5", borderColor: "border-[#7B61FF]/30"
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] sm:h-[68px]">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="نشأة" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-l from-[#00C9B7] to-[#7B61FF] bg-clip-text text-transparent">نشأة</span>
            </div>

            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">المزايا</a>
              <a href="#stats" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">لماذا نشأة؟</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">الباقات</a>
              <a href="#demo" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">احجز عرض</a>
            </div>

            <div className="hidden sm:flex items-center gap-2.5">
              <Button 
                variant="outline"
                onClick={() => setLocation("/login")}
                className="h-10 px-5 text-sm rounded-full font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                تسجيل الدخول
              </Button>
              <Button 
                onClick={() => setLocation("/register-nursery")}
                className="bg-gradient-to-l from-[#00C9B7] to-[#00B5A5] hover:from-[#00B5A5] hover:to-[#009990] text-white h-10 px-5 text-sm rounded-full font-medium shadow-[0_4px_14px_rgba(0,201,183,0.3)] active:scale-[0.97] transition-all duration-150"
              >
                ابدأ مجاناً
                <Sparkles className="w-4 h-4 mr-1.5" />
              </Button>
            </div>

            <button 
              className="sm:hidden p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-lg">
            <div className="px-5 py-5 space-y-1">
              <a href="#features" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>المزايا</a>
              <a href="#stats" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>لماذا نشأة؟</a>
              <a href="#pricing" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>الباقات</a>
              <a href="#demo" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>احجز عرض</a>
              <div className="pt-4 mt-2 border-t border-gray-100 space-y-2.5">
                <Button 
                  variant="outline"
                  onClick={() => { setLocation("/login"); setMobileMenuOpen(false); }}
                  className="w-full h-11 rounded-full text-sm font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  تسجيل الدخول
                </Button>
                <Button 
                  onClick={() => { setLocation("/register-nursery"); setMobileMenuOpen(false); }}
                  className="w-full bg-gradient-to-l from-[#00C9B7] to-[#00B5A5] text-white h-11 rounded-full text-sm font-medium shadow-[0_4px_14px_rgba(0,201,183,0.3)]"
                >
                  ابدأ مجاناً
                  <Sparkles className="w-4 h-4 mr-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Vibrant gradient background */}
      <section className="relative pt-[100px] sm:pt-[120px] pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00C9B7]/8 via-[#7B61FF]/5 to-[#FF5CA8]/8" />
        <div className="absolute top-20 right-[-100px] w-[400px] h-[400px] rounded-full bg-[#00C9B7]/10 blur-[100px]" />
        <div className="absolute bottom-0 left-[-100px] w-[350px] h-[350px] rounded-full bg-[#7B61FF]/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FF5CA8]/5 blur-[120px]" />
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-[#00C9B7]/20 text-[#00997A] text-xs sm:text-sm font-semibold mb-8 shadow-[0_2px_10px_rgba(0,201,183,0.1)]">
            <Zap className="w-4 h-4 text-[#FFB020]" />
            <span>النظام الأول لإدارة الحضانات في السعودية</span>
          </div>
          
          <h1 className="text-[32px] leading-[1.2] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.1] lg:text-[68px] font-extrabold text-[#1A1F36] mb-6 sm:mb-8">
            حوّل حضانتك
            <span className="block mt-2 bg-gradient-to-l from-[#00C9B7] via-[#7B61FF] to-[#FF5CA8] bg-clip-text text-transparent">لمؤسسة تعليمية احترافية</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-[1.8] px-2">
            وفّر <span className="font-bold text-[#00C9B7]">٧٠٪</span> من وقت الإدارة اليومية واجعل ولي الأمر شريكاً في رحلة طفله
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Button 
              size="lg"
              onClick={() => setLocation("/register-nursery")}
              className="w-full sm:w-auto bg-gradient-to-l from-[#00C9B7] to-[#009990] hover:from-[#00B5A5] hover:to-[#008880] text-white text-base sm:text-lg px-10 h-14 sm:h-16 rounded-2xl shadow-[0_8px_30px_rgba(0,201,183,0.35)] active:scale-[0.97] transition-all duration-150 font-bold"
            >
              ابدأ تجربتك المجانية
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto text-base px-8 h-14 sm:h-16 rounded-2xl border-2 border-[#7B61FF]/30 hover:border-[#7B61FF] hover:bg-[#7B61FF]/5 text-[#7B61FF] font-semibold"
            >
              <Phone className="w-5 h-5 ml-2" />
              احجز عرض تعريفي
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#00C9B7]/15 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C9B7]" />
              </div>
              <span>تجربة مجانية ١٤ يوم</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#7B61FF]/15 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7B61FF]" />
              </div>
              <span>بدون بطاقة ائتمان</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#FF5CA8]/15 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5CA8]" />
              </div>
              <span>تفعيل فوري</span>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
            شاهد كيف تعمل <span className="text-[#00C9B7]">نشأة</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-10 max-w-2xl mx-auto">
            فيديو قصير يوضح كيف تسهّل نشأة إدارة حضانتك يومياً
          </p>
          
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1A1F36] via-[#2D1B69] to-[#1A1F36]" />
            {showVideo ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/VIDEO_ID?autoplay=1&rel=0`}
                title="الفيديو التعريفي لنظام نشأة"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center" onClick={() => setShowVideo(true)}>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#00C9B7] to-[#7B61FF] flex items-center justify-center shadow-[0_0_60px_rgba(0,201,183,0.5)] group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-9 h-9 sm:w-11 sm:h-11 text-white fill-white mr-[-3px]" />
                </div>
                <p className="mt-6 text-white/90 text-base sm:text-lg font-semibold">الفيديو التعريفي</p>
                <p className="mt-1 text-white/50 text-sm">اضغط للمشاهدة</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section - Colorful */}
      <section id="stats" ref={statsRef} className="py-14 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1F36] to-[#2D1B69]" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-[#00C9B7]/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#FF5CA8]/15 blur-[100px]" />
        
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              لماذا تختار نشأة؟
            </h2>
            <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto">
              أرقام حقيقية توضح الفرق الذي تحدثه نشأة في إدارة حضانتك
            </p>
          </div>

          {/* Key metrics - vibrant cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12">
            {[
              { icon: Clock, value: "٧٠٪", label: "توفير في الوقت", color: "#00C9B7", bg: "from-[#00C9B7]/20 to-[#00C9B7]/5" },
              { icon: Heart, value: "٨٥٪", label: "رضا أولياء الأمور", color: "#FF5CA8", bg: "from-[#FF5CA8]/20 to-[#FF5CA8]/5" },
              { icon: Target, value: "٩٠٪", label: "تقليل الأعمال الورقية", color: "#7B61FF", bg: "from-[#7B61FF]/20 to-[#7B61FF]/5" },
              { icon: Star, value: "٩٥٪", label: "معدل الاستمرارية", color: "#FFB020", bg: "from-[#FFB020]/20 to-[#FFB020]/5" },
            ].map((metric, i) => (
              <div key={i} className={`bg-gradient-to-br ${metric.bg} backdrop-blur-sm rounded-2xl p-5 sm:p-6 text-center border border-white/10`}>
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${metric.color}25` }}>
                  <metric.icon className="w-6 h-6" style={{ color: metric.color }} />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-1">
                  {metric.value}
                </div>
                <div className="text-xs sm:text-sm text-white/70">{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[
              { label: "توفير وقت الإدارة اليومية", percentage: 70, color: "#00C9B7" },
              { label: "تقليل الأعمال الورقية", percentage: 90, color: "#7B61FF" },
              { label: "تحسين رضا أولياء الأمور", percentage: 85, color: "#FF5CA8" },
              { label: "زيادة تفاعل الأسر", percentage: 75, color: "#FFB020" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white/90">{stat.label}</span>
                  <span className="text-lg font-bold" style={{ color: stat.color }}>
                    {statsVisible ? `${stat.percentage}٪` : "٠٪"}
                  </span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: statsVisible ? `${stat.percentage}%` : '0%',
                      background: `linear-gradient(90deg, ${stat.color}, ${stat.color}99)`,
                      transitionDelay: `${i * 200}ms`,
                      boxShadow: `0 0 12px ${stat.color}50`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Colorful cards */}
      <section id="features" className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              كل ما تحتاجه في <span className="bg-gradient-to-l from-[#00C9B7] to-[#7B61FF] bg-clip-text text-transparent">نظام واحد</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              مجموعة متكاملة من الأدوات المصممة خصيصاً لتلبية احتياجات مؤسستك
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group relative bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-transparent hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${feature.color}08, ${feature.color}03)` }} />
                <div className="relative">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}08)` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1A1F36] mb-2">{feature.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Additional features */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Smartphone, title: "تطبيق ولي الأمر", color: "#00C9B7" },
              { icon: BarChart3, title: "التحليلات والتقارير", color: "#7B61FF" },
              { icon: Heart, title: "مشاركة الأسرة", color: "#FF5CA8" },
              { icon: Award, title: "المتجر الإلكتروني", color: "#FFB020" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-l" style={{ background: `linear-gradient(to left, ${f.color}08, ${f.color}03)` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${f.color}15` }}>
                  <f.icon className="w-4.5 h-4.5" style={{ color: f.color }} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#1A1F36]">{f.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-gray-50 to-[#00C9B7]/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              ما الذي يميزنا؟
            </h2>
            <p className="text-sm sm:text-base text-gray-600">مقارنة بين نشأة والأنظمة التقليدية</p>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-100">
            <div className="grid grid-cols-3">
              <div className="p-4 sm:p-5 text-center text-xs sm:text-sm font-bold text-white bg-[#1A1F36]">الميزة</div>
              <div className="p-4 sm:p-5 text-center text-xs sm:text-sm font-bold text-white bg-[#1A1F36]/90">التقليدي</div>
              <div className="p-4 sm:p-5 text-center text-xs sm:text-sm font-bold text-white bg-gradient-to-l from-[#00C9B7] to-[#009990]">نشأة</div>
            </div>
            {comparisonData.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-0`}>
                <div className="p-4 text-xs sm:text-sm font-medium text-[#1A1F36] flex items-center justify-center text-center">{row.feature}</div>
                <div className="p-4 text-xs sm:text-sm text-gray-400 flex items-center justify-center text-center">{row.traditional}</div>
                <div className="p-4 text-xs sm:text-sm text-[#00997A] font-semibold flex items-center justify-center text-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00C9B7] flex-shrink-0" />
                  {row.naashah}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFB020]/10 text-[#B87A00] text-xs sm:text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" />
              عرض خاص - تجربة مجانية ١٤ يوم
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              باقات الاشتراك السنوية
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              اختر الباقة المناسبة لحجم مؤسستك
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div 
                key={i} 
                className={`relative bg-gradient-to-br ${plan.gradient} rounded-3xl p-6 sm:p-8 flex flex-col border-2 ${plan.borderColor} transition-all duration-300 ${
                  plan.popular ? 'shadow-[0_10px_40px_rgba(0,201,183,0.15)] md:scale-105' : 'shadow-sm hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-l from-[#00C9B7] to-[#7B61FF] shadow-[0_4px_12px_rgba(0,201,183,0.3)]">
                    الأكثر طلباً
                  </div>
                )}
                <h3 className="text-lg sm:text-xl font-bold text-[#1A1F36] mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#1A1F36]">{plan.price}</span>
                  <span className="text-sm text-gray-500">ر.س / {plan.period}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 mb-6 text-xs sm:text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00C9B7]" />
                    {plan.children}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#7B61FF]" />
                    {plan.staff}
                  </span>
                </div>
                <ul className="space-y-3 mb-7 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00C9B7]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full h-12 rounded-xl text-sm font-bold active:scale-[0.97] transition-all duration-150 ${
                    plan.popular 
                      ? 'bg-gradient-to-l from-[#00C9B7] to-[#009990] hover:from-[#00B5A5] hover:to-[#008880] text-white shadow-[0_6px_20px_rgba(0,201,183,0.3)]' 
                      : 'bg-[#1A1F36] hover:bg-[#2D2B45] text-white'
                  }`}
                  onClick={() => setLocation(`/register-nursery?plan=${plan.id}`)}
                >
                  ابدأ التجربة المجانية
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#7B61FF]/5 to-[#FF5CA8]/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              مصمم خصيصاً لـ
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { title: "الحضانات ورياض الأطفال", Icon: Users, color: "#00C9B7" },
              { title: "مراكز التأهيل والتدخل المبكر", Icon: Heart, color: "#7B61FF" },
              { title: "مراكز الرعاية النهارية", Icon: Shield, color: "#FF5CA8" },
              { title: "المدارس التمهيدية", Icon: BookOpen, color: "#FFB020" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${item.color}20, ${item.color}08)` }}>
                  <item.Icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1A1F36] leading-relaxed">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
            شركاء <span className="text-[#00C9B7]">نفخر بهم</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-12">
            مراكز رائدة اختارت نشأة لإدارة عملياتها اليومية
          </p>
          <div className="flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300">
              <img 
                src="/manus-storage/learning-tree-logo_689ba726.png" 
                alt="مركز شجرة التعلم" 
                className="w-28 h-28 sm:w-36 sm:h-36 object-contain mx-auto"
              />
              <p className="mt-4 text-sm font-semibold text-[#1A1F36]">مركز شجرة التعلم</p>
              <p className="text-xs text-gray-400 mt-1">حي أجيال أرامكو</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              ماذا يقول <span className="text-[#00C9B7]">عملاؤنا</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              تجارب حقيقية من مراكز تستخدم نشأة يومياً
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-100">
              {/* Quote icon */}
              <div className="absolute top-6 left-6 sm:top-8 sm:left-8">
                <Quote className="w-10 h-10 sm:w-12 sm:h-12 text-[#00C9B7]/15" />
              </div>
              
              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-5 h-5 fill-[#FFB020] text-[#FFB020]" />
                ))}
              </div>

              {/* Testimonial text */}
              <blockquote className="text-base sm:text-lg text-[#1A1F36] leading-[2] mb-8 font-medium">
                "قبل نشأة كنت كل يوم أتابع المعلمات - وين الخطة الأسبوعية؟ خلّصتي تقييم الأطفال؟ كان شغل مرهق ومتكرر. الحين الخطة صارت بضغطة زر والتقييمات الفردية كلها على النظام، كل معلمة تعرف المطلوب منها وتسلّمه بوقته. حتى متطلبات الـ NDNA صرنا نغطيها بشكل منظم بدون ما أركض ورا أحد. نشأة ريّحني كمديرة وخلّى فريقي يشتغل باستقلالية."
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00C9B7] to-[#7B61FF] flex items-center justify-center shadow-[0_4px_12px_rgba(0,201,183,0.25)]">
                  <span className="text-white font-bold text-lg">أ</span>
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1F36] text-base">أمجاد الشمري</h4>
                  <p className="text-sm text-gray-500">مديرة مركز شجرة التعلم</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#00C9B7]" />
                    <span className="text-xs text-gray-400">حي أجيال أرامكو</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Booking Form Section */}
      <section id="demo" className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              احجز عرضاً تعريفياً <span className="text-[#00C9B7]">مجانياً</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              املأ النموذج وسنتواصل معك خلال ٢٤ ساعة لترتيب عرض تعريفي مخصص لمركزك
            </p>
          </div>

          {formSubmitted ? (
            <div className="bg-gradient-to-br from-[#00C9B7]/5 to-[#7B61FF]/5 rounded-3xl p-8 sm:p-12 text-center border border-[#00C9B7]/20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C9B7] to-[#7B61FF] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_30px_rgba(0,201,183,0.3)]">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1A1F36] mb-3">تم إرسال طلبك بنجاح!</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                شكراً لاهتمامك. سيتواصل معك فريقنا خلال ٢٤ ساعة لترتيب العرض التعريفي.
              </p>
              <Button
                onClick={() => setFormSubmitted(false)}
                variant="outline"
                className="rounded-xl border-[#00C9B7] text-[#00C9B7] hover:bg-[#00C9B7]/5"
              >
                إرسال طلب آخر
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">اسم المركز / الحضانة *</Label>
                  <Input
                    value={demoForm.nurseryName}
                    onChange={(e) => setDemoForm(f => ({ ...f, nurseryName: e.target.value }))}
                    placeholder="مثال: حضانة الأطفال السعداء"
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">اسم المسؤول *</Label>
                  <Input
                    value={demoForm.contactName}
                    onChange={(e) => setDemoForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="الاسم الكامل"
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">رقم الجوال *</Label>
                  <Input
                    value={demoForm.phone}
                    onChange={(e) => setDemoForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="05XXXXXXXX"
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={demoForm.email}
                    onChange={(e) => setDemoForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">المدينة</Label>
                  <Input
                    value={demoForm.city}
                    onChange={(e) => setDemoForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="مثال: الرياض"
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">عدد الأطفال (تقريبي)</Label>
                  <Input
                    value={demoForm.childrenCount}
                    onChange={(e) => setDemoForm(f => ({ ...f, childrenCount: e.target.value }))}
                    placeholder="مثال: ٣٠ طفل"
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">نوع المركز</Label>
                  <div className="flex flex-wrap gap-2">
                    {["حضانة", "روضة أطفال", "مركز تأهيل", "رعاية نهارية", "مدرسة تمهيدية"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDemoForm(f => ({ ...f, centerType: type }))}
                        className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                          demoForm.centerType === type
                            ? 'bg-gradient-to-l from-[#00C9B7] to-[#009990] text-white shadow-[0_4px_12px_rgba(0,201,183,0.25)]'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-[#00C9B7]/50 hover:text-[#00C9B7]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">ملاحظات إضافية</Label>
                  <textarea
                    value={demoForm.notes}
                    onChange={(e) => setDemoForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="أي ملاحظات أو استفسارات..."
                    className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00C9B7]/20 focus:border-[#00C9B7]"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitDemo.isPending}
                className="w-full sm:w-auto mt-6 h-13 px-10 rounded-xl bg-gradient-to-l from-[#00C9B7] to-[#009990] hover:from-[#00B5A5] hover:to-[#008880] text-white text-sm sm:text-base font-bold shadow-[0_6px_20px_rgba(0,201,183,0.3)] active:scale-[0.97] transition-all duration-150"
              >
                {submitDemo.isPending ? "جاري الإرسال..." : "أرسل الطلب"}
                <Send className="w-4 h-4 mr-2" />
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* CTA Section - Vibrant gradient */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00C9B7] via-[#009990] to-[#7B61FF]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] rounded-full bg-white/10 blur-[60px]" />
          <div className="absolute bottom-[-50%] left-[-20%] w-[500px] h-[500px] rounded-full bg-[#FF5CA8]/20 blur-[60px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 sm:mb-6">
            جرّب نشأة مجاناً لمدة ١٤ يوم
          </h2>
          <p className="text-base sm:text-lg text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            جرّب قبل أن تقرر. بدون بطاقة ائتمان، بدون التزام.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => setLocation("/register-nursery")}
              className="w-full sm:w-auto bg-white text-[#00997A] hover:bg-gray-50 text-base sm:text-lg px-10 h-14 sm:h-16 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] active:scale-[0.97] transition-all duration-150 font-extrabold"
            >
              سجّل حضانتك الآن
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto border-2 border-white/50 text-white hover:bg-white/10 text-base px-8 h-14 sm:h-16 rounded-2xl font-semibold bg-transparent"
            >
              احجز عرضاً تعريفياً
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-4 sm:px-6 bg-[#1A1F36]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="نشأة" className="w-10 h-10 object-contain" />
                <span className="text-xl font-bold text-white">نشأة</span>
              </div>
              <p className="text-sm text-white/60 leading-[1.8] max-w-sm">
                النظام المتكامل لإدارة الحضانات ومراكز التأهيل والرعاية النهارية. مصمم خصيصاً لتلبية احتياجات المؤسسات التعليمية في المملكة العربية السعودية.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm text-white">روابط سريعة</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><a href="#features" className="hover:text-[#00C9B7] transition-colors">المزايا</a></li>
                <li><a href="#pricing" className="hover:text-[#00C9B7] transition-colors">الباقات</a></li>
                <li><a href="#demo" className="hover:text-[#00C9B7] transition-colors">احجز عرض</a></li>
                <li><a href="/privacy" className="hover:text-[#00C9B7] transition-colors">سياسة الخصوصية</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm text-white">تواصل معنا</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li>البريد: info@naashah.com</li>
                <li>الهاتف: 4686 378 53 966+</li>
                <li><a href="https://naashah.com" className="hover:text-[#00C9B7] transition-colors">naashah.com</a></li>
                <li>المملكة العربية السعودية</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6 text-center text-sm text-white/40">
            <p>جميع الحقوق محفوظة لمنصة نشأة ٢٠٢٦</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/966533784686"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:shadow-[0_6px_25px_rgba(37,211,102,0.5)] hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="تواصل معنا عبر واتساب"
      >
        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}
