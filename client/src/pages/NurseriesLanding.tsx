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
  Star, Zap, Award, Target, Send, Quote, MapPin, Phone
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/assets/logo.webp";

export default function NurseriesLanding() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
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
    { 
      icon: Users, 
      title: "إدارة الأطفال والفصول", 
      desc: "تسجيل بيانات الأطفال الكاملة، إدارة الفصول وتوزيع الأطفال على المعلمات، واستيراد البيانات دفعة واحدة",
      color: "#00C9B7" 
    },
    { 
      icon: Calendar, 
      title: "الحضور والانصراف", 
      desc: "تسجيل حضور الأطفال والموظفين بلمسة واحدة مع إشعارات فورية لأولياء الأمور عند الوصول والمغادرة",
      color: "#7B61FF" 
    },
    { 
      icon: FileText, 
      title: "التقارير اليومية", 
      desc: "إرسال تقرير يومي مفصل لولي الأمر يشمل الوجبات والنوم والأنشطة والحالة المزاجية مع صور وفيديوهات",
      color: "#FF5CA8" 
    },
    { 
      icon: MessageCircle, 
      title: "التواصل مع أولياء الأمور", 
      desc: "نظام رسائل مباشرة وإشعارات فورية وإعلانات عامة وتقويم سنوي مشترك",
      color: "#FFB020" 
    },
    { 
      icon: CreditCard, 
      title: "المالية والمدفوعات", 
      desc: "فواتير إلكترونية تلقائية، دفع إلكتروني عبر مدى وفيزا وماستركارد وأبل باي، وتقارير مالية مفصلة",
      color: "#00C9B7" 
    },
    { 
      icon: TrendingUp, 
      title: "النمو والتطور", 
      desc: "مقياس الكشف المبكر عن صعوبات التعلم والنمو، تقييمات مخصصة لكل طفل حسب عمره",
      color: "#7B61FF" 
    },
    { 
      icon: BookOpen, 
      title: "الخطط الأسبوعية والمناهج", 
      desc: "إعداد خطط أسبوعية للأنشطة التعليمية، مكتبة مناهج جاهزة ومتنوعة، ومشاركة الخطة مع أولياء الأمور",
      color: "#FF5CA8" 
    },
    { 
      icon: Shield, 
      title: "طلب الاستلام والنقل", 
      desc: "نظام طلب استلام الطفل من ولي الأمر مع تتبع عمليات التسليم والاستلام لضمان أمان الأطفال",
      color: "#FFB020" 
    },
  ];

  const additionalFeatures = [
    { icon: Smartphone, title: "تطبيق ولي الأمر", desc: "تطبيق مخصص لأولياء الأمور لمتابعة كل ما يخص أطفالهم" },
    { icon: BarChart3, title: "التحليلات والتقارير", desc: "لوحات تحكم تفاعلية وتقارير شاملة لاتخاذ القرار" },
    { icon: Heart, title: "مشاركة الأسرة", desc: "نظام نقاط ومكافآت لتحفيز مشاركة أولياء الأمور" },
    { icon: Award, title: "المتجر الإلكتروني", desc: "بيع منتجات وخدمات الحضانة مباشرة لأولياء الأمور" },
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
      id: "basic",
      name: "الأساسية", 
      price: "٦,٩٠٠", 
      period: "سنوياً",
      children: "حتى ٣٠ طفل",
      staff: "حتى ١٠ موظفين",
      features: ["الحضور والتقارير اليومية", "التقويم والإعلانات", "تطبيق ولي الأمر"],
      popular: false 
    },
    { 
      id: "professional",
      name: "الاحترافية", 
      price: "١٠,٩٠٠", 
      period: "سنوياً",
      children: "حتى ١٠٠ طفل",
      staff: "حتى ٣٠ موظف",
      features: ["جميع مميزات الأساسية", "الرسائل والمستندات والصور والفيديو", "الخطط الأسبوعية والفواتير", "المساعد الذكي والتقارير المتقدمة", "الهوية البصرية"],
      popular: true 
    },
    { 
      id: "enterprise",
      name: "المؤسسية", 
      price: "١٥,٩٠٠", 
      period: "سنوياً",
      children: "غير محدود",
      staff: "غير محدود",
      features: ["جميع مميزات الاحترافية", "دعم أولوية", "مساحة تخزين ١٠٠ جيجا", "فروع متعددة"],
      popular: false 
    },
  ];

  const timeStats = [
    { label: "توفير وقت الإدارة اليومية", percentage: 70, color: "#00C9B7" },
    { label: "تقليل الأعمال الورقية", percentage: 90, color: "#7B61FF" },
    { label: "تحسين رضا أولياء الأمور", percentage: 85, color: "#FF5CA8" },
    { label: "زيادة تفاعل الأسر", percentage: 75, color: "#FFB020" },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] sm:h-[68px] md:h-[72px]">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="نشأة" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain" />
              <span className="text-base sm:text-lg md:text-xl font-bold text-slate-800">نشأة</span>
            </div>

            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#video" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">الفيديو التعريفي</a>
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">المزايا</a>
              <a href="#stats" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">لماذا نشأة؟</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">الباقات</a>
              <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">تواصل معنا</a>
            </div>

            <div className="hidden sm:flex items-center gap-2.5">
              <Button 
                onClick={() => setLocation("/register-nursery")}
                className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white h-9 md:h-10 px-4 md:px-5 text-xs md:text-sm rounded-lg font-medium active:scale-[0.97] transition-all duration-150"
              >
                سجّل حضانتك مجاناً
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
          <div className="sm:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-5 py-5 space-y-1">
              <a href="#video" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>الفيديو التعريفي</a>
              <a href="#features" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>المزايا</a>
              <a href="#stats" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>لماذا نشأة؟</a>
              <a href="#pricing" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>الباقات</a>
              <a href="#contact" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>تواصل معنا</a>
              <div className="pt-4 mt-2 border-t border-gray-100">
                <Button 
                  onClick={() => { setLocation("/register-nursery"); setMobileMenuOpen(false); }}
                  className="w-full bg-[#00C9B7] hover:bg-[#00B5A5] text-white h-11 rounded-lg text-sm font-medium"
                >
                  سجّل حضانتك مجاناً
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-[90px] sm:pt-[110px] md:pt-[130px] pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 bg-gradient-to-b from-[#f0fdf9] to-white">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00C9B7]/10 text-[#00997A] text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <Zap className="w-4 h-4" />
            <span>النظام المتكامل لإدارة الحضانات ومراكز التأهيل</span>
          </div>
          
          <h1 className="text-[28px] leading-[1.3] sm:text-4xl sm:leading-[1.25] md:text-5xl md:leading-[1.2] lg:text-[56px] font-extrabold text-slate-800 mb-5 sm:mb-6">
            حوّل حضانتك لمؤسسة
            <span className="block mt-2 text-[#00C9B7]">تعليمية احترافية</span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-10 leading-[1.8] px-2">
            نظام متكامل يوفّر أكثر من ٧٠٪ من وقت الإدارة اليومية ويجعل ولي الأمر شريكاً في رحلة طفله.
            مصمم خصيصاً للحضانات ومراكز التأهيل والرعاية النهارية في المملكة العربية السعودية.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
            <Button 
              size="lg"
              onClick={() => setLocation("/register-nursery")}
              className="w-full sm:w-auto bg-[#00C9B7] hover:bg-[#00B5A5] text-white text-sm sm:text-base md:text-lg px-8 h-12 sm:h-14 rounded-xl shadow-[0_4px_14px_rgba(0,201,183,0.25)] active:scale-[0.97] transition-all duration-150 font-medium"
            >
              ابدأ تجربتك المجانية
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => {
                const el = document.getElementById('video');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto text-sm sm:text-base px-8 h-12 sm:h-14 rounded-xl border-gray-200 hover:border-[#00C9B7] hover:text-[#00C9B7] font-medium"
            >
              <Play className="w-5 h-5 ml-2" />
              شاهد الفيديو التعريفي
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-500">
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
              <span>تفعيل فوري</span>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-3 sm:mb-4">
            شاهد كيف تعمل نشأة
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto">
            فيديو قصير يوضح كيف تسهّل نشأة إدارة حضانتك يومياً
          </p>
          
          {/* Video Embed - supports YouTube */}
          <div className="relative w-full aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl group cursor-pointer">
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#00C9B7] flex items-center justify-center shadow-[0_0_40px_rgba(0,201,183,0.4)] group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white fill-white mr-[-3px]" />
                </div>
                <p className="mt-4 sm:mt-6 text-white/80 text-sm sm:text-base font-medium">الفيديو التعريفي لنظام نشأة</p>
                <p className="mt-1 text-white/50 text-xs sm:text-sm">اضغط للمشاهدة</p>
              </div>
            )}
            {/* Decorative gradient overlay */}
            {!showVideo && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />}
          </div>
        </div>
      </section>

      {/* Stats/Infographics Section */}
      <section id="stats" ref={statsRef} className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#F8FAFB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              لماذا تختار نشأة؟
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              أرقام حقيقية توضح الفرق الذي تحدثه نشأة في إدارة حضانتك
            </p>
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {timeStats.map((stat, i) => (
              <div key={i} className="bg-white rounded-xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm sm:text-base font-medium text-slate-700">{stat.label}</span>
                  <span className="text-lg sm:text-xl font-bold" style={{ color: stat.color }}>
                    {statsVisible ? `${stat.percentage}٪` : "٠٪"}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: statsVisible ? `${stat.percentage}%` : '0%',
                      backgroundColor: stat.color,
                      transitionDelay: `${i * 200}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Clock, value: "٧٠٪", label: "توفير في الوقت", color: "#00C9B7" },
              { icon: Heart, value: "٨٥٪", label: "رضا أولياء الأمور", color: "#FF5CA8" },
              { icon: Target, value: "٩٠٪", label: "تقليل الأعمال الورقية", color: "#7B61FF" },
              { icon: Star, value: "٩٥٪", label: "معدل الاستمرارية", color: "#FFB020" },
            ].map((metric, i) => (
              <div key={i} className="bg-white rounded-xl p-4 sm:p-5 text-center shadow-sm">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: `${metric.color}12` }}>
                  <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: metric.color }} />
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-1" style={{ color: metric.color }}>
                  {metric.value}
                </div>
                <div className="text-[11px] sm:text-xs text-gray-600">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              المميزات الأساسية للحضانات ومراكز التأهيل
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              مجموعة متكاملة من الأدوات المصممة خصيصاً لتلبية احتياجات مؤسستك التعليمية
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-[#F8FAFB] rounded-xl p-5 sm:p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div 
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${feature.color}15` }}
                >
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Additional features row */}
          <div className="mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {additionalFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-[#f0fdf9]">
                <feature.icon className="w-5 h-5 text-[#00C9B7] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">{feature.title}</h4>
                  <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#F8FAFB]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              ما الذي يميزنا؟
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              مقارنة بين نشأة والأنظمة التقليدية
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-800 text-white">
              <div className="p-3 sm:p-4 text-center text-xs sm:text-sm font-medium">الميزة</div>
              <div className="p-3 sm:p-4 text-center text-xs sm:text-sm font-medium">الأنظمة التقليدية</div>
              <div className="p-3 sm:p-4 text-center text-xs sm:text-sm font-medium bg-[#00C9B7]">نشأة</div>
            </div>
            {comparisonData.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100 last:border-0`}>
                <div className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-slate-700 flex items-center justify-center text-center">{row.feature}</div>
                <div className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 flex items-center justify-center text-center">{row.traditional}</div>
                <div className="p-3 sm:p-4 text-xs sm:text-sm text-[#00997A] font-medium flex items-center justify-center text-center bg-[#f0fdf9]">{row.naashah}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              باقات الاشتراك السنوية
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              اختر الباقة المناسبة لحجم مؤسستك. جميع الباقات تشمل تجربة مجانية ١٤ يوم بدون بطاقة ائتمان.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div 
                key={i} 
                className={`relative rounded-2xl p-6 sm:p-7 lg:p-8 flex flex-col transition-all duration-300 ${
                  plan.popular 
                    ? 'bg-white border-2 border-[#00C9B7] shadow-[0_8px_30px_rgba(0,201,183,0.12)] md:scale-105' 
                    : 'bg-white border-2 border-gray-100 hover:border-[#00C9B7]/30 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white bg-[#00C9B7] shadow-sm">
                    الأكثر طلباً
                  </div>
                )}
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{plan.price}</span>
                  <span className="text-sm text-gray-500">ر.س / {plan.period}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 mb-5 text-xs sm:text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00C9B7]" />
                    {plan.children}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#7B61FF]" />
                    {plan.staff}
                  </span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00C9B7]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full h-11 sm:h-12 rounded-xl text-sm font-medium active:scale-[0.97] transition-all duration-150 ${
                    plan.popular 
                      ? 'bg-[#00C9B7] hover:bg-[#00B5A5] text-white shadow-[0_4px_14px_rgba(0,201,183,0.25)]' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => setLocation(`/register-nursery?plan=${plan.id}`)}
                >
                  ابدأ التجربة المجانية
                </Button>
              </div>
            ))}
          </div>
          
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-8 max-w-2xl mx-auto">
            جميع الباقات تشمل التأهيل والتدريب والتحديثات المستمرة والدعم الفني.
          </p>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#F8FAFB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              مصمم خصيصاً لـ
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { title: "الحضانات ورياض الأطفال", icon: "🏫" },
              { title: "مراكز التأهيل والتدخل المبكر", icon: "🌱" },
              { title: "مراكز الرعاية النهارية", icon: "☀️" },
              { title: "المدارس التمهيدية", icon: "📚" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-5 sm:p-6 text-center shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-3xl sm:text-4xl mb-3">{item.icon}</div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              ماذا يقول عملاؤنا؟
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              آراء أصحاب الحضانات والمراكز الذين يستخدمون نشأة
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                name: "سيتم الإضافة قريباً",
                role: "مديرة حضانة",
                city: "الرياض",
                text: "سيتم إضافة شهادات العملاء بعد اشتراك أول مجموعة من الحضانات",
                stars: 5
              },
              {
                name: "سيتم الإضافة قريباً",
                role: "مالكة مركز تأهيل",
                city: "جدة",
                text: "سيتم إضافة شهادات العملاء بعد اشتراك أول مجموعة من الحضانات",
                stars: 5
              },
              {
                name: "سيتم الإضافة قريباً",
                role: "مديرة رعاية نهارية",
                city: "الدمام",
                text: "سيتم إضافة شهادات العملاء بعد اشتراك أول مجموعة من الحضانات",
                stars: 5
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-[#F8FAFB] rounded-xl p-5 sm:p-6 relative">
                <Quote className="w-8 h-8 text-[#00C9B7]/20 absolute top-4 left-4" />
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: testimonial.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-[#FFB020] fill-[#FFB020]" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 min-h-[60px]">
                  "{testimonial.text}"
                </p>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-sm font-bold text-slate-800">{testimonial.name}</p>
                  <p className="text-xs text-gray-500">{testimonial.role} - {testimonial.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Booking Form Section */}
      <section id="demo" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#F8FAFB]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">
              احجز عرضاً تعريفياً مجانياً
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              املأ النموذج وسنتواصل معك خلال ٢٤ ساعة لترتيب عرض تعريفي مخصص لمركزك
            </p>
          </div>

          {formSubmitted ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#00C9B7]/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#00C9B7]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">تم إرسال طلبك بنجاح!</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                شكراً لاهتمامك. سيتواصل معك فريقنا خلال ٢٤ ساعة لترتيب العرض التعريفي.
              </p>
              <Button
                onClick={() => setFormSubmitted(false)}
                variant="outline"
                className="rounded-xl"
              >
                إرسال طلب آخر
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">اسم المركز / الحضانة *</Label>
                  <Input
                    value={demoForm.nurseryName}
                    onChange={(e) => setDemoForm(f => ({ ...f, nurseryName: e.target.value }))}
                    placeholder="مثال: حضانة الأطفال السعداء"
                    className="h-11 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">اسم المسؤول *</Label>
                  <Input
                    value={demoForm.contactName}
                    onChange={(e) => setDemoForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="الاسم الكامل"
                    className="h-11 rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">رقم الجوال *</Label>
                  <Input
                    value={demoForm.phone}
                    onChange={(e) => setDemoForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="05XXXXXXXX"
                    className="h-11 rounded-lg"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={demoForm.email}
                    onChange={(e) => setDemoForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="h-11 rounded-lg"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">المدينة</Label>
                  <Input
                    value={demoForm.city}
                    onChange={(e) => setDemoForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="مثال: الرياض"
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">عدد الأطفال (تقريبي)</Label>
                  <Input
                    value={demoForm.childrenCount}
                    onChange={(e) => setDemoForm(f => ({ ...f, childrenCount: e.target.value }))}
                    placeholder="مثال: ٣٠ طفل"
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">نوع المركز</Label>
                  <div className="flex flex-wrap gap-2">
                    {["حضانة", "روضة أطفال", "مركز تأهيل", "رعاية نهارية", "مدرسة تمهيدية"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDemoForm(f => ({ ...f, centerType: type }))}
                        className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                          demoForm.centerType === type
                            ? 'bg-[#00C9B7] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">ملاحظات إضافية</Label>
                  <textarea
                    value={demoForm.notes}
                    onChange={(e) => setDemoForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="أي ملاحظات أو استفسارات..."
                    className="w-full h-24 px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00C9B7]/30 focus:border-[#00C9B7]"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitDemo.isPending}
                className="w-full sm:w-auto mt-6 h-12 px-8 rounded-xl bg-[#00C9B7] hover:bg-[#00B5A5] text-white text-sm sm:text-base font-medium shadow-[0_4px_14px_rgba(0,201,183,0.25)] active:scale-[0.97] transition-all duration-150"
              >
                {submitDemo.isPending ? "جاري الإرسال..." : "أرسل الطلب"}
                <Send className="w-4 h-4 mr-2" />
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#00C9B7] to-[#00997A]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
            جرّب نشأة مجاناً لمدة ١٤ يوم
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            جرّب قبل أن تقرر. بدون بطاقة ائتمان، بدون التزام. سجّل الآن واكتشف كيف تحوّل نشأة إدارة حضانتك.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => setLocation("/register-nursery")}
              className="w-full sm:w-auto bg-white text-[#00997A] hover:bg-gray-50 text-sm sm:text-base md:text-lg px-8 h-12 sm:h-14 rounded-xl shadow-lg active:scale-[0.97] transition-all duration-150 font-bold"
            >
              سجّل حضانتك الآن
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10 text-sm sm:text-base px-8 h-12 sm:h-14 rounded-xl font-medium bg-transparent"
            >
              احجز عرضاً تعريفياً مجانياً
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-10 sm:py-12 px-4 sm:px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="نشأة" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
                <span className="text-lg sm:text-xl font-bold text-slate-800">نشأة</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 leading-[1.7] max-w-sm">
                النظام المتكامل لإدارة الحضانات ومراكز التأهيل والرعاية النهارية. مصمم خصيصاً لتلبية احتياجات المؤسسات التعليمية في المملكة العربية السعودية.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-sm text-slate-800">روابط سريعة</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                <li><a href="#features" className="hover:text-[#00C9B7] transition-colors">المزايا</a></li>
                <li><a href="#pricing" className="hover:text-[#00C9B7] transition-colors">الباقات</a></li>
                <li><a href="#video" className="hover:text-[#00C9B7] transition-colors">الفيديو التعريفي</a></li>
                <li><a href="/privacy" className="hover:text-[#00C9B7] transition-colors">سياسة الخصوصية</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-sm text-slate-800">تواصل معنا</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                <li>البريد: info@naashah.com</li>
                <li>الهاتف: 4686 378 53 966+</li>
                <li><a href="https://naashah.com" className="hover:text-[#00C9B7] transition-colors">naashah.com</a></li>
                <li>المملكة العربية السعودية</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-8 pt-6 text-center text-xs sm:text-sm text-gray-500">
            <p>جميع الحقوق محفوظة لمنصة نشأة ٢٠٢٦</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
