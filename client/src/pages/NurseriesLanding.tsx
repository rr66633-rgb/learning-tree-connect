import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { 
  Shield, Users, BarChart3, MessageCircle, 
  Calendar, CreditCard, BookOpen, CheckCircle2,
  ArrowLeft, ArrowRight, Clock, TrendingUp, Heart, 
  Smartphone, FileText, Menu, X, Play,
  Star, Zap, Award, Target, Send, Quote, MapPin, Phone, Sparkles, Globe
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/assets/logo.webp";

export default function NurseriesLanding() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const toggleLanguage = () => {
    const newLang = isAr ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

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
      toast.success(isAr ? "تم إرسال طلبك بنجاح! سنتواصل معك قريباً." : "Your request was sent successfully! We will contact you soon.");
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? "حدث خطأ، يرجى المحاولة مرة أخرى" : "An error occurred, please try again"));
    },
  });

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.nurseryName || !demoForm.contactName || !demoForm.phone) {
      toast.error(isAr ? "يرجى تعبئة الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    submitDemo.mutate(demoForm);
  };

  useEffect(() => {
    document.title = isAr 
      ? isAr ? "نشأة - النظام المتكامل لإدارة الحضانات ومراكز التأهيل والرعاية النهارية" : "Nash'ah - Integrated System for Nursery, Rehabilitation, and Daycare Management"
      : "Nashaa - The Complete Nursery & Daycare Management System";
  }, [isAr]);

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

  const features = isAr ? [
    { icon: Users, title: isAr ? "إدارة الأطفال والفصول" : "Manage Children & Classes", desc: isAr ? "تسجيل بيانات الأطفال الكاملة، إدارة الفصول وتوزيع الأطفال على المعلمات" : "Full child data registration, class management, and child-teacher assignment", color: "#00C9B7" },
    { icon: Calendar, title: isAr ? "الحضور والانصراف" : "Attendance", desc: isAr ? "تسجيل حضور الأطفال والموظفين بلمسة واحدة مع إشعارات فورية لأولياء الأمور" : "One-touch check-in for children and staff with instant parent notifications", color: "#7B61FF" },
    { icon: FileText, title: isAr ? "التقارير اليومية" : "Daily Reports", desc: "تقرير يومي مفصل لولي الأمر يشمل الوجبات والنوم والأنشطة مع صور وفيديوهات", color: "#FF5CA8" },
    { icon: MessageCircle, title: isAr ? "التواصل مع أولياء الأمور" : "Parent Communication", desc: isAr ? "رسائل مباشرة وإشعارات فورية وإعلانات عامة وتقويم سنوي مشترك" : "Direct messages, instant notifications, public announcements, and shared annual calendar", color: "#FFB020" },
    { icon: CreditCard, title: isAr ? "المالية والمدفوعات" : "Finance & Payments", desc: isAr ? "فواتير إلكترونية تلقائية، دفع عبر مدى وفيزا وأبل باي، وتقارير مالية" : "Automatic e-invoices, payment via Mada, Visa, Apple Pay, and financial reports", color: "#00C9B7" },
    { icon: TrendingUp, title: isAr ? "النمو والتطور" : "Growth & Development", desc: isAr ? "مقياس الكشف المبكر عن صعوبات التعلم والنمو، تقييمات مخصصة لكل طفل" : "Early Detection Scale for Learning and Development Difficulties, Customized Assessments for Each Child", color: "#7B61FF" },
    { icon: BookOpen, title: isAr ? "الخطط والمناهج" : "Plans & Curriculum", desc: isAr ? "خطط أسبوعية للأنشطة التعليمية، مكتبة مناهج جاهزة ومشاركة مع أولياء الأمور" : "Weekly plans for educational activities, ready curriculum library, and sharing with parents", color: "#FF5CA8" },
    { icon: Shield, title: isAr ? "طلب الاستلام والنقل" : "Pick-up and transfer request", desc: isAr ? "نظام طلب استلام الطفل مع تتبع عمليات التسليم لضمان أمان الأطفال" : "Child Pickup Request System with Delivery Tracking to Ensure Child Safety", color: "#FFB020" },
  ] : [
    { icon: Users, title: "Children & Class Management", desc: "Complete child data registration, class management and student-teacher assignment", color: "#00C9B7" },
    { icon: Calendar, title: "Attendance & Departure", desc: "One-tap attendance for children and staff with instant parent notifications", color: "#7B61FF" },
    { icon: FileText, title: "Daily Reports", desc: "Detailed daily reports for parents including meals, sleep, activities with photos and videos", color: "#FF5CA8" },
    { icon: MessageCircle, title: "Parent Communication", desc: "Direct messaging, instant notifications, announcements, and shared calendar", color: "#FFB020" },
    { icon: CreditCard, title: "Finance & Payments", desc: "Automatic e-invoicing, Mada/Visa/Apple Pay payments, and financial reports", color: "#00C9B7" },
    { icon: TrendingUp, title: "Growth & Development", desc: "Early detection of learning difficulties, customized assessments for each child", color: "#7B61FF" },
    { icon: BookOpen, title: "Plans & Curriculum", desc: "Weekly activity plans, ready-made curriculum library shared with parents", color: "#FF5CA8" },
    { icon: Shield, title: "Pickup & Transport", desc: "Child pickup request system with delivery tracking for child safety", color: "#FFB020" },
  ];

  const comparisonData = isAr ? [
    { feature: isAr ? "التقارير اليومية" : "Daily Reports", traditional: "يدوية ورقية", naashah: "تلقائية مع صور" },
    { feature: isAr ? "التواصل مع الأسرة" : "Family Communication", traditional: isAr ? "بطيء ومحدود" : "Slow and Limited", naashah: isAr ? "فوري ومباشر" : "Instant & Direct" },
    { feature: isAr ? "المدفوعات" : "Payments", traditional: "تحويل بنكي يدوي", naashah: "إلكترونية متكاملة" },
    { feature: isAr ? "متابعة النمو" : "Growth Tracking", traditional: isAr ? "غير متوفرة" : "Not Available", naashah: isAr ? "علمية بمقاييس معتمدة" : "Scientific with Accredited Standards" },
    { feature: "المتجر", traditional: isAr ? "غير متوفر" : "Out of Stock", naashah: "إلكتروني مدمج" },
    { feature: isAr ? "الحضور والانصراف" : "Attendance", traditional: isAr ? "سجل ورقي" : "Paper Record", naashah: isAr ? "إلكتروني مع إشعارات" : "Electronic with Notifications" },
  ] : [
    { feature: "Daily Reports", traditional: "Manual & paper-based", naashah: "Automatic with photos" },
    { feature: "Family Communication", traditional: "Slow & limited", naashah: "Instant & direct" },
    { feature: "Payments", traditional: "Manual bank transfer", naashah: "Fully integrated e-payments" },
    { feature: "Growth Tracking", traditional: "Not available", naashah: "Scientific with certified scales" },
    { feature: "Store", traditional: "Not available", naashah: "Built-in e-store" },
    { feature: "Attendance", traditional: "Paper register", naashah: "Digital with notifications" },
  ];

  const plans = isAr ? [
    { 
      id: "basic", name: "الأساسية", price: "٦,٩٠٠", period: isAr ? "سنوياً" : "Yearly",
      children: isAr ? "حتى ٣٠ طفل" : "Up to 30 Children", staff: isAr ? "حتى ١٠ موظفين" : "Up to 10 Employees",
      features: [isAr ? "الحضور والتقارير اليومية" : "Attendance & Daily Reports", isAr ? "التقويم والإعلانات" : "Calendar & Announcements", isAr ? "تطبيق ولي الأمر" : "Parent App"],
      popular: false, gradient: "from-slate-50 to-white", borderColor: "border-gray-200"
    },
    { 
      id: "professional", name: "الاحترافية", price: "١٠,٩٠٠", period: isAr ? "سنوياً" : "Yearly",
      children: isAr ? "حتى ١٠٠ طفل" : "Up to 100 Children", staff: isAr ? "حتى ٣٠ موظف" : "Up to 30 Employees",
      features: ["جميع مميزات الأساسية", "الرسائل والمستندات والصور", "الخطط الأسبوعية والفواتير", "المساعد الذكي والتقارير المتقدمة", (isAr ? "الهوية البصرية" : "Visual Identity") ],
      popular: true, gradient: "from-[#00C9B7]/5 to-[#7B61FF]/5", borderColor: "border-[#00C9B7]"
    },
    { 
      id: "enterprise", name: "المؤسسية", price: "١٥,٩٠٠", period: isAr ? "سنوياً" : "Yearly",
      children: isAr ? "غير محدود" : "Unlimited", staff: isAr ? "غير محدود" : "Unlimited",
      features: [isAr ? "جميع مميزات الاحترافية" : "All Professional Features", isAr ? "دعم أولوية" : "Priority Support", isAr ? "مساحة تخزين ١٠٠ جيجا" : "100 GB storage space", isAr ? "فروع متعددة" : "Multiple Branches"],
      popular: false, gradient: "from-[#7B61FF]/5 to-[#FF5CA8]/5", borderColor: "border-[#7B61FF]/30"
    },
  ] : [
    { 
      id: "basic", name: "Basic", price: "6,900", period: "yearly",
      children: "Up to 30 children", staff: "Up to 10 staff",
      features: ["Attendance & daily reports", "Calendar & announcements", "Parent app"],
      popular: false, gradient: "from-slate-50 to-white", borderColor: "border-gray-200"
    },
    { 
      id: "professional", name: "Professional", price: "10,900", period: "yearly",
      children: "Up to 100 children", staff: "Up to 30 staff",
      features: ["All Basic features", "Messages, documents & photos", "Weekly plans & invoices", "AI assistant & advanced reports", "Visual branding"],
      popular: true, gradient: "from-[#00C9B7]/5 to-[#7B61FF]/5", borderColor: "border-[#00C9B7]"
    },
    { 
      id: "enterprise", name: "Enterprise", price: "15,900", period: "yearly",
      children: "Unlimited", staff: "Unlimited",
      features: ["All Professional features", "Priority support", "100GB storage", "Multiple branches"],
      popular: false, gradient: "from-[#7B61FF]/5 to-[#FF5CA8]/5", borderColor: "border-[#7B61FF]/30"
    },
  ];

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px] sm:h-[68px]">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt={isAr ? "نشأة" : "Nashaa"} className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-l from-[#00C9B7] to-[#7B61FF] bg-clip-text text-transparent">
                {isAr ? "نشأة" : "Nashaa"}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">{isAr ? "المزايا" : "Features"}</a>
              <a href="#stats" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">{isAr ? "لماذا نشأة؟" : "Why Nashaa?"}</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">{isAr ? "الباقات" : "Pricing"}</a>
              <a href="#demo" className="text-sm font-medium text-gray-600 hover:text-[#00C9B7] transition-colors">{isAr ? "احجز عرض" : "Book Demo"}</a>
            </div>

            <div className="hidden sm:flex items-center gap-2.5">
              {/* Language Switcher */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="h-9 px-3 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className={isAr ? "ml-1.5" : "mr-1.5"}>{isAr ? "EN" : "عربي"}</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/login")}
                className="h-10 px-5 text-sm rounded-full font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                {isAr ? "تسجيل الدخول" : "Sign In"}
              </Button>
              <Button 
                onClick={() => setLocation("/register-nursery")}
                className="bg-gradient-to-l from-[#00C9B7] to-[#00B5A5] hover:from-[#00B5A5] hover:to-[#009990] text-white h-10 px-5 text-sm rounded-full font-medium shadow-[0_4px_14px_rgba(0,201,183,0.3)] active:scale-[0.97] transition-all duration-150"
              >
                {isAr ? "ابدأ مجاناً" : "Start Free"}
                <Sparkles className={`w-4 h-4 ${isAr ? "mr-1.5" : "ml-1.5"}`} />
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
              <a href="#features" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>{isAr ? "المزايا" : "Features"}</a>
              <a href="#stats" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>{isAr ? "لماذا نشأة؟" : "Why Nashaa?"}</a>
              <a href="#pricing" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>{isAr ? "الباقات" : "Pricing"}</a>
              <a href="#demo" className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5" onClick={() => setMobileMenuOpen(false)}>{isAr ? "احجز عرض" : "Book Demo"}</a>
              {/* Mobile language switcher */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-[#00C9B7]/5 w-full"
              >
                <Globe className="w-4 h-4" />
                {isAr ? "English" : "العربية"}
              </button>
              <div className="pt-4 mt-2 border-t border-gray-100 space-y-2.5">
                <Button 
                  variant="outline"
                  onClick={() => { setLocation("/login"); setMobileMenuOpen(false); }}
                  className="w-full h-11 rounded-full text-sm font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </Button>
                <Button 
                  onClick={() => { setLocation("/register-nursery"); setMobileMenuOpen(false); }}
                  className="w-full bg-gradient-to-l from-[#00C9B7] to-[#00B5A5] text-white h-11 rounded-full text-sm font-medium shadow-[0_4px_14px_rgba(0,201,183,0.3)]"
                >
                  {isAr ? "ابدأ مجاناً" : "Start Free"}
                  <Sparkles className={`w-4 h-4 ${isAr ? "mr-1.5" : "ml-1.5"}`} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-[100px] sm:pt-[120px] pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00C9B7]/8 via-[#7B61FF]/5 to-[#FF5CA8]/8" />
        <div className="absolute top-20 right-[-100px] w-[400px] h-[400px] rounded-full bg-[#00C9B7]/10 blur-[100px]" />
        <div className="absolute bottom-0 left-[-100px] w-[350px] h-[350px] rounded-full bg-[#7B61FF]/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FF5CA8]/5 blur-[120px]" />
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-[#00C9B7]/20 text-[#00997A] text-xs sm:text-sm font-semibold mb-8 shadow-[0_2px_10px_rgba(0,201,183,0.1)]">
            <Zap className="w-4 h-4 text-[#FFB020]" />
            <span>{isAr ? "النظام الأول لإدارة الحضانات في السعودية" : "The #1 Nursery Management System in Saudi Arabia"}</span>
          </div>
          
          <h1 className="text-[32px] leading-[1.2] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.1] lg:text-[68px] font-extrabold text-[#1A1F36] mb-6 sm:mb-8">
            {isAr ? "حوّل حضانتك" : "Transform Your Nursery"}
            <span className="block mt-2 bg-gradient-to-l from-[#00C9B7] via-[#7B61FF] to-[#FF5CA8] bg-clip-text text-transparent">
              {isAr ? "لمؤسسة تعليمية احترافية" : "Into a Professional Institution"}
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-[1.8] px-2">
            {isAr 
              ? <>وفّر <span className="font-bold text-[#00C9B7]">{isAr ? "٧٠٪" : "70%"}</span>{isAr ? " من وقت الإدارة اليومية واجعل ولي الأمر شريكاً في رحلة طفله" : "From daily management time and make the parent a partner in their child\'s journey"}</>
              : <>Save <span className="font-bold text-[#00C9B7]">70%</span> of daily management time and make parents partners in their child's journey</>
            }
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Button 
              size="lg"
              onClick={() => setLocation("/register-nursery")}
              className="w-full sm:w-auto bg-gradient-to-l from-[#00C9B7] to-[#009990] hover:from-[#00B5A5] hover:to-[#008880] text-white text-base sm:text-lg px-10 h-14 sm:h-16 rounded-2xl shadow-[0_8px_30px_rgba(0,201,183,0.35)] active:scale-[0.97] transition-all duration-150 font-bold"
            >
              {isAr ? "ابدأ تجربتك المجانية" : "Start Your Free Trial"}
              <ArrowIcon className={`w-5 h-5 ${isAr ? "mr-2" : "ml-2"}`} />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto text-base px-8 h-14 sm:h-16 rounded-2xl border-2 border-[#7B61FF]/30 hover:border-[#7B61FF] hover:bg-[#7B61FF]/5 text-[#7B61FF] font-semibold"
            >
              <Phone className={`w-5 h-5 ${isAr ? "ml-2" : "mr-2"}`} />
              {isAr ? "احجز عرض تعريفي" : "Book a Demo"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#00C9B7]/15 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C9B7]" />
              </div>
              <span>{isAr ? "تجربة مجانية ١٤ يوم" : "14-day free trial"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#7B61FF]/15 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7B61FF]" />
              </div>
              <span>{isAr ? "بدون بطاقة ائتمان" : "No credit card required"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#FF5CA8]/15 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5CA8]" />
              </div>
              <span>{isAr ? "دعم فني مجاني" : "Free technical support"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              {isAr ? <>كل ما تحتاجه في <span className="text-[#00C9B7]">منصة واحدة</span></> : <>Everything you need in <span className="text-[#00C9B7]">one platform</span></>}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              {isAr ? "أكثر من ٢٠ أداة متكاملة تغطي جميع احتياجات مركزك التعليمي" : "20+ integrated tools covering all your educational center's needs"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <div key={i} className="group bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100/80 hover:border-transparent transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}08)` }}>
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-sm font-bold text-[#1A1F36] mb-2">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-[1.8]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" ref={statsRef} className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              {isAr ? <>لماذا <span className="text-[#00C9B7]">نشأة</span>؟</> : <>Why <span className="text-[#00C9B7]">Nashaa</span>?</>}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-14">
            {(isAr ? [
              { value: isAr ? "٧٠٪" : "70%", label: isAr ? "توفير في وقت الإدارة" : "Save Admin Time", color: "#00C9B7" },
              { value: isAr ? "٩٨٪" : "98%", label: isAr ? "رضا أولياء الأمور" : "Parent Satisfaction", color: "#7B61FF" },
              { value: "+٢٠", label: isAr ? "أداة متكاملة" : "Integrated Tool", color: "#FF5CA8" },
              { value: "٢٤/٧", label: isAr ? "دعم فني" : "Technical Support", color: "#FFB020" },
            ] : [
              { value: "70%", label: "Management time saved", color: "#00C9B7" },
              { value: "98%", label: "Parent satisfaction", color: "#7B61FF" },
              { value: "20+", label: "Integrated tools", color: "#FF5CA8" },
              { value: "24/7", label: "Technical support", color: "#FFB020" },
            ]).map((stat, i) => (
              <div key={i} className={`text-center p-5 rounded-2xl bg-gradient-to-br transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${i * 100}ms`, background: `linear-gradient(135deg, ${stat.color}08, ${stat.color}03)` }}>
                <div className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <h3 className="text-lg sm:text-xl font-bold text-[#1A1F36] mb-6 text-center">
              {isAr ? "الفرق بين الإدارة التقليدية ونشأة" : "Traditional Management vs Nashaa"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`py-3 ${isAr ? "text-right" : "text-left"} text-gray-500 font-medium`}>{isAr ? "الميزة" : "Feature"}</th>
                    <th className="py-3 text-center text-gray-500 font-medium">{isAr ? "الطريقة التقليدية" : "Traditional"}</th>
                    <th className="py-3 text-center text-[#00C9B7] font-bold">{isAr ? "نشأة" : "Nashaa"}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-3.5 font-medium text-[#1A1F36]">{row.feature}</td>
                      <td className="py-3.5 text-center text-gray-400">{row.traditional}</td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00C9B7]/10 text-[#00997A] text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {row.naashah}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              {isAr ? <>باقات <span className="text-[#00C9B7]">مرنة</span> تناسب مركزك</> : <><span className="text-[#00C9B7]">Flexible</span> plans for your center</>}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              {isAr ? "اختر الباقة المناسبة لحجم مركزك واحتياجاتك" : "Choose the plan that fits your center's size and needs"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative bg-gradient-to-br ${plan.gradient} rounded-3xl p-6 sm:p-8 border-2 ${plan.borderColor} ${plan.popular ? 'shadow-[0_10px_40px_rgba(0,201,183,0.15)] scale-[1.02]' : 'shadow-[0_4px_20px_rgba(0,0,0,0.04)]'} transition-all duration-300 hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)]`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-l from-[#00C9B7] to-[#009990] text-white text-xs font-bold rounded-full shadow-[0_4px_12px_rgba(0,201,183,0.3)]">
                    {isAr ? "الأكثر طلباً" : "Most Popular"}
                  </div>
                )}
                <h3 className="text-xl font-bold text-[#1A1F36] mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#1A1F36]">{plan.price}</span>
                  <span className="text-sm text-gray-500">{isAr ? "ر.س" : "SAR"} / {plan.period}</span>
                </div>
                <p className="text-xs text-gray-500 mb-6">{plan.children} • {plan.staff}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-[#00C9B7] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setLocation("/register-nursery")}
                  className={`w-full h-12 rounded-xl font-bold text-sm active:scale-[0.97] transition-all duration-150 ${
                    plan.popular 
                      ? 'bg-gradient-to-l from-[#00C9B7] to-[#009990] text-white shadow-[0_4px_14px_rgba(0,201,183,0.3)]'
                      : 'bg-white border-2 border-gray-200 text-[#1A1F36] hover:border-[#00C9B7] hover:text-[#00C9B7]'
                  }`}
                >
                  {isAr ? "ابدأ التجربة المجانية" : "Start Free Trial"}
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
              {isAr ? "مصمم خصيصاً لـ" : "Designed specifically for"}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {(isAr ? [
              { title: isAr ? "الحضانات ورياض الأطفال" : "Nurseries & Kindergartens", Icon: Users, color: "#00C9B7" },
              { title: isAr ? "مراكز التأهيل والتدخل المبكر" : "Rehabilitation and Early Intervention Centers", Icon: Heart, color: "#7B61FF" },
              { title: isAr ? "مراكز الرعاية النهارية" : "Daycare Centers", Icon: Shield, color: "#FF5CA8" },
              { title: isAr ? "المدارس التمهيدية" : "Preschools", Icon: BookOpen, color: "#FFB020" },
            ] : [
              { title: "Nurseries & Kindergartens", Icon: Users, color: "#00C9B7" },
              { title: "Rehabilitation & Early Intervention Centers", Icon: Heart, color: "#7B61FF" },
              { title: "Daycare Centers", Icon: Shield, color: "#FF5CA8" },
              { title: "Pre-Schools", Icon: BookOpen, color: "#FFB020" },
            ]).map((item, i) => (
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
            {isAr ? <>شركاء <span className="text-[#00C9B7]">نفخر بهم</span></> : <>Partners we're <span className="text-[#00C9B7]">proud of</span></>}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-12">
            {isAr ? "مراكز رائدة اختارت نشأة لإدارة عملياتها اليومية" : "Leading centers that chose Nashaa for their daily operations"}
          </p>
          <div className="flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300">
              <img 
                src="/manus-storage/learning-tree-logo_e85a5d0c.png" 
                alt={isAr ? "مركز شجرة التعلم" : "Learning Tree Center"} 
                className="w-28 h-28 sm:w-36 sm:h-36 object-contain mx-auto"
              />
              <p className="mt-4 text-sm font-semibold text-[#1A1F36]">{isAr ? "مركز شجرة التعلم" : "Learning Tree Center"}</p>
              <p className="text-xs text-gray-400 mt-1">{isAr ? "حي أجيال أرامكو" : "Ajyal Aramco District"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1F36] mb-4">
              {isAr ? <>ماذا يقول <span className="text-[#00C9B7]">عملاؤنا</span></> : <>What our <span className="text-[#00C9B7]">clients say</span></>}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              {isAr ? "تجارب حقيقية من مراكز تستخدم نشأة يومياً" : "Real experiences from centers using Nashaa daily"}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-100">
              <div className={`absolute top-6 ${isAr ? "left-6 sm:left-8" : "right-6 sm:right-8"}`}>
                <Quote className="w-10 h-10 sm:w-12 sm:h-12 text-[#00C9B7]/15" />
              </div>
              
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-5 h-5 fill-[#FFB020] text-[#FFB020]" />
                ))}
              </div>

              <blockquote className="text-base sm:text-lg text-[#1A1F36] leading-[2] mb-8 font-medium">
                {isAr 
                  ? "\"قبل نشأة كنت كل يوم أتابع المعلمات - وين الخطة الأسبوعية؟ خلّصتي تقييم الأطفال؟ كان شغل مرهق ومتكرر. الحين الخطة صارت بضغطة زر والتقييمات الفردية كلها على النظام، كل معلمة تعرف المطلوب منها وتسلّمه بوقته. حتى متطلبات الـ NDNA صرنا نغطيها بشكل منظم بدون ما أركض ورا أحد. نشأة ريّحني كمديرة وخلّى فريقي يشتغل باستقلالية.\""
                  : "\"Before Nashaa, I used to follow up with teachers every day - where's the weekly plan? Did you finish the children's assessments? It was exhausting and repetitive. Now the plan is done with one click and all individual assessments are on the system. Every teacher knows what's required and delivers on time. Even NDNA requirements are covered systematically. Nashaa relieved me as a director and made my team work independently.\""
                }
              </blockquote>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00C9B7] to-[#7B61FF] flex items-center justify-center shadow-[0_4px_12px_rgba(0,201,183,0.25)]">
                  <span className="text-white font-bold text-lg">{isAr ? "أ" : "A"}</span>
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1F36] text-base">{isAr ? "أمجاد الشمري" : "Amjad Al-Shammari"}</h4>
                  <p className="text-sm text-gray-500">{isAr ? "مديرة مركز شجرة التعلم" : "Director, Learning Tree Center"}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#00C9B7]" />
                    <span className="text-xs text-gray-400">{isAr ? "حي أجيال أرامكو" : "Ajyal Aramco District"}</span>
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
              {isAr ? <>احجز عرضاً تعريفياً <span className="text-[#00C9B7]">مجانياً</span></> : <>Book a <span className="text-[#00C9B7]">free</span> demo</>}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              {isAr ? "املأ النموذج وسنتواصل معك خلال ٢٤ ساعة لترتيب عرض تعريفي مخصص لمركزك" : "Fill the form and we'll contact you within 24 hours to arrange a personalized demo for your center"}
            </p>
          </div>

          {formSubmitted ? (
            <div className="bg-gradient-to-br from-[#00C9B7]/5 to-[#7B61FF]/5 rounded-3xl p-8 sm:p-12 text-center border border-[#00C9B7]/20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C9B7] to-[#7B61FF] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_30px_rgba(0,201,183,0.3)]">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1A1F36] mb-3">{isAr ? "تم إرسال طلبك بنجاح!" : "Your request was sent successfully!"}</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                {isAr ? "شكراً لاهتمامك. سيتواصل معك فريقنا خلال ٢٤ ساعة لترتيب العرض التعريفي." : "Thank you for your interest. Our team will contact you within 24 hours to arrange the demo."}
              </p>
              <Button
                onClick={() => setFormSubmitted(false)}
                variant="outline"
                className="rounded-xl border-[#00C9B7] text-[#00C9B7] hover:bg-[#00C9B7]/5"
              >
                {isAr ? "إرسال طلب آخر" : "Send another request"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "اسم المركز / الحضانة *" : "Center / Nursery Name *"}</Label>
                  <Input
                    value={demoForm.nurseryName}
                    onChange={(e) => setDemoForm(f => ({ ...f, nurseryName: e.target.value }))}
                    placeholder={isAr ? "مثال: حضانة الأطفال السعداء" : "e.g. Happy Kids Nursery"}
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "اسم المسؤول *" : "Contact Person *"}</Label>
                  <Input
                    value={demoForm.contactName}
                    onChange={(e) => setDemoForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder={isAr ? "الاسم الكامل" : "Full name"}
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "رقم الجوال *" : "Phone Number *"}</Label>
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
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "البريد الإلكتروني" : "Email"}</Label>
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
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "المدينة" : "City"}</Label>
                  <Input
                    value={demoForm.city}
                    onChange={(e) => setDemoForm(f => ({ ...f, city: e.target.value }))}
                    placeholder={isAr ? "مثال: الرياض" : "e.g. Riyadh"}
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "عدد الأطفال (تقريبي)" : "Number of Children (approx.)"}</Label>
                  <Input
                    value={demoForm.childrenCount}
                    onChange={(e) => setDemoForm(f => ({ ...f, childrenCount: e.target.value }))}
                    placeholder={isAr ? "مثال: ٣٠ طفل" : "e.g. 30 children"}
                    className="h-12 rounded-xl border-gray-200 focus:border-[#00C9B7] focus:ring-[#00C9B7]/20"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "نوع المركز" : "Center Type"}</Label>
                  <div className="flex flex-wrap gap-2">
                    {(isAr 
                      ? [(isAr ? "حضانة" : "Nursery"), (isAr ? "روضة أطفال" : "Kindergarten"), "مركز تأهيل", "رعاية نهارية", "مدرسة تمهيدية"]
                      : ["Nursery", "Kindergarten", "Rehabilitation Center", "Daycare", "Pre-School"]
                    ).map((type) => (
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
                  <Label className="text-sm font-medium text-[#1A1F36]">{isAr ? "ملاحظات إضافية" : "Additional Notes"}</Label>
                  <textarea
                    value={demoForm.notes}
                    onChange={(e) => setDemoForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={isAr ? "أي ملاحظات أو استفسارات..." : "Any notes or questions..."}
                    className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00C9B7]/20 focus:border-[#00C9B7]"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitDemo.isPending}
                className="w-full sm:w-auto mt-6 h-13 px-10 rounded-xl bg-gradient-to-l from-[#00C9B7] to-[#009990] hover:from-[#00B5A5] hover:to-[#008880] text-white text-sm sm:text-base font-bold shadow-[0_6px_20px_rgba(0,201,183,0.3)] active:scale-[0.97] transition-all duration-150"
              >
                {submitDemo.isPending ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "أرسل الطلب" : "Send Request")}
                <Send className={`w-4 h-4 ${isAr ? "mr-2" : "ml-2"}`} />
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00C9B7] via-[#009990] to-[#7B61FF]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] rounded-full bg-white/10 blur-[60px]" />
          <div className="absolute bottom-[-50%] left-[-20%] w-[500px] h-[500px] rounded-full bg-[#FF5CA8]/20 blur-[60px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 sm:mb-6">
            {isAr ? "جرّب نشأة مجاناً لمدة ١٤ يوم" : "Try Nashaa free for 14 days"}
          </h2>
          <p className="text-base sm:text-lg text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            {isAr ? "جرّب قبل أن تقرر. بدون بطاقة ائتمان، بدون التزام." : "Try before you decide. No credit card, no commitment."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => setLocation("/register-nursery")}
              className="w-full sm:w-auto bg-white text-[#00997A] hover:bg-gray-50 text-base sm:text-lg px-10 h-14 sm:h-16 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] active:scale-[0.97] transition-all duration-150 font-extrabold"
            >
              {isAr ? "سجّل حضانتك الآن" : "Register Your Nursery Now"}
              <ArrowIcon className={`w-5 h-5 ${isAr ? "mr-2" : "ml-2"}`} />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto border-2 border-white/50 text-white hover:bg-white/10 text-base px-8 h-14 sm:h-16 rounded-2xl font-semibold bg-transparent"
            >
              {isAr ? "احجز عرضاً تعريفياً" : "Book a Demo"}
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
                <img src={LOGO_URL} alt={isAr ? "نشأة" : "Nashaa"} className="w-10 h-10 object-contain" />
                <span className="text-xl font-bold text-white">{isAr ? "نشأة" : "Nashaa"}</span>
              </div>
              <p className="text-sm text-white/60 leading-[1.8] max-w-sm">
                {isAr 
                  ? isAr ? "النظام المتكامل لإدارة الحضانات ومراكز التأهيل والرعاية النهارية. مصمم خصيصاً لتلبية احتياجات المؤسسات التعليمية في المملكة العربية السعودية." : "Integrated system for managing nurseries, rehabilitation centers, and daycare. Specifically designed to meet the needs of educational institutions in Saudi Arabia."
                  : "The complete management system for nurseries, rehabilitation centers, and daycare facilities. Designed specifically for educational institutions in Saudi Arabia."
                }
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm text-white">{isAr ? "روابط سريعة" : "Quick Links"}</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><a href="#features" className="hover:text-[#00C9B7] transition-colors">{isAr ? "المزايا" : "Features"}</a></li>
                <li><a href="#pricing" className="hover:text-[#00C9B7] transition-colors">{isAr ? "الباقات" : "Pricing"}</a></li>
                <li><a href="#demo" className="hover:text-[#00C9B7] transition-colors">{isAr ? "احجز عرض" : "Book Demo"}</a></li>
                <li><a href="/privacy" className="hover:text-[#00C9B7] transition-colors">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm text-white">{isAr ? "تواصل معنا" : "Contact Us"}</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li>{isAr ? "البريد" : "Email"}: info@naashah.com</li>
                <li>{isAr ? "الهاتف" : "Phone"}: 4686 378 53 966+</li>
                <li><a href="https://naashah.com" className="hover:text-[#00C9B7] transition-colors">naashah.com</a></li>
                <li>{isAr ? "المملكة العربية السعودية" : "Saudi Arabia"}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6 text-center text-sm text-white/40">
            <p>{isAr ? "جميع الحقوق محفوظة لمنصة نشأة ٢٠٢٦" : "All rights reserved. Nashaa Platform 2026"}</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/966533784686"
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 ${isAr ? "left-6" : "right-6"} z-50 w-14 h-14 sm:w-16 sm:h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:shadow-[0_6px_25px_rgba(37,211,102,0.5)] hover:scale-110 active:scale-95 transition-all duration-200`}
        aria-label={isAr ? "تواصل معنا عبر واتساب" : "Contact us via WhatsApp"}
      >
        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}
