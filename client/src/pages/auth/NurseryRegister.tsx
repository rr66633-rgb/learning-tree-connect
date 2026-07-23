import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { trackLead } from "@/lib/metaPixel";
import { useTranslation } from "react-i18next";
import { 
  ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, 
  Building2, User, Mail, Phone, Lock, MapPin, Users, Baby,
  Shield, Sparkles, Crown
} from "lucide-react";

const getSaudiCities = (isAr: boolean) => ([
  (isAr ? "الرياض" : "Riyadh"), (isAr ? "جدة" : "Jeddah"), (isAr ? "مكة المكرمة" : "Makkah Al-Mukarramah"), (isAr ? "المدينة المنورة" : "Madinah"), (isAr ? "الدمام" : "Dammam"),
  (isAr ? "الخبر" : "Khobar"), (isAr ? "الظهران" : "Dhahran"), (isAr ? "تبوك" : "Tabuk"), (isAr ? "بريدة" : "Buraidah"), (isAr ? "حائل" : "Hail"), (isAr ? "الطائف" : "Taif"),
  (isAr ? "أبها" : "Abha"), (isAr ? "خميس مشيط" : "Khamis Mushait"), (isAr ? "نجران" : "Najran"), (isAr ? "جازان" : "Jazan"), (isAr ? "ينبع" : "Yanbu"), (isAr ? "الجبيل" : "Jubail"),
  (isAr ? "القطيف" : "Qatif"), (isAr ? "الأحساء" : "Al-Ahsa"), (isAr ? "عنيزة" : "Unaizah"), (isAr ? "سكاكا" : "Sakaka"), (isAr ? "الباحة" : "Al Baha"), (isAr ? "عرعر" : "Arar"),
  (isAr ? "حفر الباطن" : "Hafar Al-Batin"), (isAr ? "الخرج" : "Kharj"), (isAr ? "المجمعة" : "Aggregated")
]);

const getPlans = (isAr: boolean) => ([
  {
    id: "basic" as const,
    name: (isAr ? "أساسي" : "Basic"),
    price: (isAr ? "٦,٩٠٠" : "6,900"),
    priceNum: 6900,
    period: "سنوياً",
    maxChildren: 50,
    maxStaff: 10,
    icon: Shield,
    color: "#7B61FF",
    features: [(isAr ? "حتى ٥٠ طفل" : "Up to 50 Children"), (isAr ? "حتى ١٠ موظفين" : "Up to 10 Employees"), (isAr ? "الحضور والتقارير اليومية" : "Attendance & Daily Reports"), (isAr ? "التواصل مع الأهالي" : "Parent Communication"), (isAr ? "الدعم الفني" : "Technical Support")],
  },
  {
    id: "professional" as const,
    name: (isAr ? "احترافي" : "Professional"),
    price: (isAr ? "١٠,٩٠٠" : "10,900"),
    priceNum: 10900,
    period: "سنوياً",
    maxChildren: 100,
    maxStaff: 25,
    icon: Sparkles,
    color: "#00C9B7",
    popular: true,
    features: [(isAr ? "حتى ١٠٠ طفل" : "Up to 100 Children"), (isAr ? "حتى ٢٥ موظف" : "Up to 25 Employees"), "المساعد الذكي (AI)", (isAr ? "التقييمات ومتابعة التطور" : "Assessments & Development Tracking"), (isAr ? "التحليلات المتقدمة" : "Advanced Analytics")],
  },
  {
    id: "enterprise" as const,
    name: (isAr ? "مؤسسي" : "Foundational"),
    price: (isAr ? "١٥,٩٠٠" : "15,900"),
    priceNum: 15900,
    period: "سنوياً",
    maxChildren: 200,
    maxStaff: 50,
    icon: Crown,
    color: "#FF5CA8",
    features: [(isAr ? "حتى ٢٠٠ طفل" : "Up to 200 Children"), (isAr ? "فروع متعددة" : "Multiple Branches"), (isAr ? "مدير حساب مخصص" : "Dedicated Account Manager"), (isAr ? "أولوية الدعم" : "Support Priority"), (isAr ? "العلامة التجارية المخصصة" : "Custom Branding")],
  },
]);

type PlanId = "basic" | "professional" | "enterprise";

export default function NurseryRegister() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const preselectedPlan = params.get("plan") as PlanId | null;

  const [step, setStep] = useState(preselectedPlan ? 2 : 1);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(preselectedPlan || "professional");
  
  // Nursery info
  const [nurseryName, setNurseryName] = useState("");
  const [nurseryNameAr, setNurseryNameAr] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [childrenCount, setChildrenCount] = useState("");
  const [staffCount, setStaffCount] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  
  // Owner info
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submitMutation = trpc.registration.submit.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setStep(5);
      trackLead("Nursery Registration");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const validateStep2 = () => {
    if (!nurseryNameAr.trim()) { toast.error(isAr ? "اسم الحضانة بالعربية مطلوب" : "Nursery name in Arabic is required"); return false; }
    if (!city) { toast.error(isAr ? "المدينة مطلوبة" : "City is required"); return false; }
    if (!childrenCount || parseInt(childrenCount) < 1) { toast.error(isAr ? "عدد الأطفال مطلوب" : "Number of children is required"); return false; }
    if (!staffCount || parseInt(staffCount) < 1) { toast.error(isAr ? "عدد الموظفين مطلوب" : "Number of staff is required"); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!ownerName.trim()) { toast.error(isAr ? "اسم المالك مطلوب" : "Owner name is required"); return false; }
    if (!ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) { toast.error(isAr ? "البريد الإلكتروني غير صحيح" : "Invalid email address"); return false; }
    if (!ownerPhone.trim() || ownerPhone.length < 9) { toast.error(isAr ? "رقم الجوال غير صحيح" : "Invalid phone number"); return false; }
    if (!ownerPassword || ownerPassword.length < 8) { toast.error(isAr ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters"); return false; }
    if (ownerPassword !== confirmPassword) { toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"); return false; }
    return true;
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      nurseryName: nurseryName || nurseryNameAr,
      nurseryNameAr,
      city,
      district: district || undefined,
      childrenCount: parseInt(childrenCount),
      staffCount: parseInt(staffCount),
      licenseNumber: licenseNumber || undefined,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerPassword,
      selectedPlan,
    });
  };

  const currentPlan = getPlans(isAr).find(p => p.id === selectedPlan)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" dir="rtl">
      {/* Header */}
      <header className="py-4 px-6 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl font-bold" style={{ color: '#00C9B7' }}>{isAr ? "نشأة" : "Nasha'a"}</span>
            <span className="text-sm text-gray-500 font-medium">Naashah</span>
          </button>
          <button 
            onClick={() => setLocation("/login")}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            لديك حساب؟ <span className="font-semibold" style={{ color: '#00C9B7' }}>{isAr ? "تسجيل الدخول" : "Login"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: (isAr ? "الخطة" : "Plan") },
              { num: 2, label: (isAr ? "الحضانة" : "Nursery") },
              { num: 3, label: (isAr ? "المالك" : "Owner") },
              { num: 4, label: "تأكيد" },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  step >= s.num 
                    ? 'bg-[#00C9B7] text-white' 
                    : step === 5 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.num || step === 5 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center text-xs">{s.num}</span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 3 && <div className={`w-8 h-0.5 ${step > s.num ? 'bg-[#00C9B7]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-3" style={{ color: '#1e293b' }}>اختر خطة الاشتراك</h1>
              <p className="text-gray-600">{isAr ? "اختر الخطة المناسبة لحجم حضانتك. يمكنك الترقية لاحقاً." : "Choose the right plan for your nursery size. You can upgrade later."}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {getPlans(isAr).map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                return (
                  <Card 
                    key={plan.id}
                    className={`relative cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                      isSelected 
                        ? 'border-2 shadow-lg' 
                        : 'border border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ borderColor: isSelected ? plan.color : undefined }}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: plan.color }}>
                        {isAr ? "الأكثر طلباً" : "Most Requested"}
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}15` }}>
                          <Icon className="w-5 h-5" style={{ color: plan.color }} />
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: '#1e293b' }}>{plan.name}</h3>
                      </div>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-2xl font-extrabold" style={{ color: '#1e293b' }}>{plan.price}</span>
                        <span className="text-xs text-gray-500">ر.س / {plan.period}</span>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.color }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t text-center">
                          <span className="text-sm font-semibold" style={{ color: plan.color }}>{isAr ? "تم الاختيار" : "Selected"}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <p className="text-sm text-gray-500 mb-6">{isAr ? "جميع الخطط تشمل التأهيل والتدريب والتحديثات والدعم الفني" : "All plans include qualification, training, updates, and technical support"}</p>
              <Button 
                size="lg"
                className="px-10 bg-[#00C9B7] hover:bg-[#00B5A5] text-white"
                onClick={() => setStep(2)}
              >
                {isAr ? "التالي" : "Next"}
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Nursery Details */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-3" style={{ color: '#1e293b' }}>{isAr ? "بيانات الحضانة" : "Nursery Data"}</h1>
              <p className="text-gray-600">{isAr ? "أدخل المعلومات الأساسية عن حضانتك" : "Enter basic information about your nursery"}</p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "اسم الحضانة بالعربية" : "Nursery Name in Arabic"}<span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      value={nurseryNameAr} 
                      onChange={(e) => setNurseryNameAr(e.target.value)}
                      placeholder={isAr ? "مثال: حضانة براعم المستقبل" : "Example: Future Buds Nursery"}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "اسم الحضانة بالإنجليزية (اختياري)" : "Nursery Name in English (Optional)"}</Label>
                  <Input 
                    value={nurseryName} 
                    onChange={(e) => setNurseryName(e.target.value)}
                    placeholder="e.g. Future Buds Nursery"
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{isAr ? "المدينة" : "City"}<span className="text-red-500">*</span></Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger>
                        <SelectValue placeholder={isAr ? "اختر المدينة" : "Select City"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getSaudiCities(isAr).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{isAr ? "الحي (اختياري)" : "District (Optional)"}</Label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        value={district} 
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder={isAr ? "مثال: حي النرجس" : "Example: Al-Narjis District"}
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{isAr ? "عدد الأطفال المتوقع" : "Expected number of children"}<span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Baby className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        type="number"
                        value={childrenCount} 
                        onChange={(e) => setChildrenCount(e.target.value)}
                        placeholder={isAr ? "مثال: 30" : "Example: 30"}
                        className="pr-10"
                        min="1"
                        max="500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{isAr ? "عدد الموظفين" : "Number of employees"}<span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        type="number"
                        value={staffCount} 
                        onChange={(e) => setStaffCount(e.target.value)}
                        placeholder={isAr ? "مثال: 8" : "Example: 8"}
                        className="pr-10"
                        min="1"
                        max="200"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "رقم الترخيص (اختياري)" : "License Number (Optional)"}</Label>
                  <Input 
                    value={licenseNumber} 
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder={isAr ? "رقم ترخيص وزارة التعليم أو الشؤون الاجتماعية" : "Ministry of Education or Social Affairs License Number"}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                {isAr ? "السابق" : "Previous"}
              </Button>
              <Button 
                className="px-8 bg-[#00C9B7] hover:bg-[#00B5A5] text-white gap-2"
                onClick={() => { if (validateStep2()) setStep(3); }}
              >
                {isAr ? "التالي" : "Next"}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Owner Details */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-3" style={{ color: '#1e293b' }}>{isAr ? "بيانات المالك" : "Owner Data"}</h1>
              <p className="text-gray-600">{isAr ? "أدخل بياناتك الشخصية لإنشاء حساب المدير" : "Enter your personal data to create an admin account"}</p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "الاسم الكامل" : "Full Name"}<span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      value={ownerName} 
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder={isAr ? "الاسم الثلاثي" : "Full Name (Triple)"}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "البريد الإلكتروني" : "Email"}<span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type="email"
                      value={ownerEmail} 
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="example@domain.com"
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "رقم الجوال" : "Mobile Number"}<span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type="tel"
                      value={ownerPhone} 
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "كلمة المرور" : "Password"}<span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={ownerPassword} 
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder={isAr ? "8 أحرف على الأقل" : "At least 8 characters"}
                      className="pr-10 pl-10"
                      dir="ltr"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "تأكيد كلمة المرور" : "Confirm Password"}<span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={isAr ? "أعد إدخال كلمة المرور" : "Re-enter Password"}
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                {isAr ? "السابق" : "Previous"}
              </Button>
              <Button 
                className="px-8 bg-[#00C9B7] hover:bg-[#00B5A5] text-white gap-2"
                onClick={() => { if (validateStep3()) setStep(4); }}
              >
                {isAr ? "التالي" : "Next"}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-3" style={{ color: '#1e293b' }}>{isAr ? "مراجعة وتأكيد" : "Review and Confirm"}</h1>
              <p className="text-gray-600">{isAr ? "راجع بياناتك قبل إرسال الطلب" : "Review your data before submitting the request"}</p>
            </div>

            {/* Plan Summary */}
            <Card className="border-2" style={{ borderColor: currentPlan.color }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${currentPlan.color}15` }}>
                      <currentPlan.icon className="w-5 h-5" style={{ color: currentPlan.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: '#1e293b' }}>خطة {currentPlan.name}</h3>
                      <p className="text-sm text-gray-500">{isAr ? "اشتراك سنوي" : "Annual Subscription"}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-xl font-bold" style={{ color: '#1e293b' }}>{currentPlan.price}</span>
                    <span className="text-sm text-gray-500 mr-1">{isAr ? "ر.س/سنة" : "SAR/year"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nursery Info Summary */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
                  <Building2 className="w-4 h-4" style={{ color: '#7B61FF' }} />
                  {isAr ? "بيانات الحضانة" : "Nursery Data"}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">{isAr ? "الاسم:" : "Name:"}</span>
                    <span className="font-medium mr-2">{nurseryNameAr}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? "المدينة:" : "City:"}</span>
                    <span className="font-medium mr-2">{city}</span>
                  </div>
                  {district && (
                    <div>
                      <span className="text-gray-500">الحي:</span>
                      <span className="font-medium mr-2">{district}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">عدد الأطفال:</span>
                    <span className="font-medium mr-2">{childrenCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? "عدد الموظفين:" : "Number of employees:"}</span>
                    <span className="font-medium mr-2">{staffCount}</span>
                  </div>
                  {licenseNumber && (
                    <div>
                      <span className="text-gray-500">{isAr ? "رقم الترخيص:" : "License Number:"}</span>
                      <span className="font-medium mr-2">{licenseNumber}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Owner Info Summary */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
                  <User className="w-4 h-4" style={{ color: '#FF5CA8' }} />
                  {isAr ? "بيانات المالك" : "Owner Data"}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">{isAr ? "الاسم:" : "Name:"}</span>
                    <span className="font-medium mr-2">{ownerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? "البريد:" : "Mail:"}</span>
                    <span className="font-medium mr-2" dir="ltr">{ownerEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">الجوال:</span>
                    <span className="font-medium mr-2" dir="ltr">{ownerPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(3)}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                {isAr ? "السابق" : "Previous"}
              </Button>
              <Button 
                className="px-10 bg-[#00C9B7] hover:bg-[#00B5A5] text-white gap-2"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>{isAr ? "جاري الإرسال..." : "Sending..."}</>
                ) : (
                  <>
                    {isAr ? "إرسال الطلب" : "Submit Order"}
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              بإرسال الطلب، أنت توافق على <button onClick={() => setLocation("/terms")} className="underline hover:text-gray-600">شروط الاستخدام</button> و<button onClick={() => setLocation("/privacy")} className="underline hover:text-gray-600">سياسة الخصوصية</button>
            </p>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: '#00C9B715' }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: '#00C9B7' }} />
            </div>
            <h1 className="text-3xl font-bold mb-4" style={{ color: '#1e293b' }}>{isAr ? "تم استلام طلبك بنجاح!" : "Your order has been received successfully!"}</h1>
            <p className="text-gray-600 mb-3 text-lg">
              {isAr ? "شكراً لاهتمامك بمنصة نشأة" : "Thank you for your interest in Nash'ah platform"}
            </p>
            <p className="text-gray-500 mb-8">
              سيقوم فريقنا بمراجعة طلبك والتواصل معك عبر البريد الإلكتروني أو الجوال خلال <strong>{isAr ? "٢٤ ساعة عمل" : "24 working hours"}</strong>.
            </p>

            <Card className="bg-gray-50 border-0 mb-8">
              <CardContent className="p-5">
                <h3 className="font-bold mb-3" style={{ color: '#1e293b' }}>{isAr ? "ماذا بعد؟" : "What's next?"}</h3>
                <ul className="text-sm text-gray-600 space-y-2 text-right">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white mt-0.5" style={{ background: '#00C9B7' }}>١</span>
                    <span>{isAr ? "مراجعة الطلب من فريق نشأة" : "Review request by Nash'ah team"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white mt-0.5" style={{ background: '#7B61FF' }}>٢</span>
                    <span>{isAr ? "التواصل معك لتأكيد البيانات وترتيب الدفع" : "Contact you to confirm data and arrange payment"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white mt-0.5" style={{ background: '#FF5CA8' }}>٣</span>
                    <span>{isAr ? "تفعيل حسابك وبدء جلسة التأهيل والتدريب" : "Activate your account and start onboarding/training session"}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                className="bg-[#00C9B7] hover:bg-[#00B5A5] text-white"
                onClick={() => setLocation("/")}
              >
                {isAr ? "العودة للصفحة الرئيسية" : "Back to Homepage"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open("https://wa.me/966533784686", "_blank")}
              >
                {isAr ? "تواصل عبر واتساب" : "Contact via WhatsApp"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
