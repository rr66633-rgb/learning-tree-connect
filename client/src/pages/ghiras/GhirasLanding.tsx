import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  CalendarCheck,
  Users,
  FileText,
  MessageCircle,
  BookOpen,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: CalendarCheck,
    title: "تسجيل الحضور",
    desc: "سجلي حضور وغياب طلابك بسهولة يومياً",
    color: "#00C9B7",
  },
  {
    icon: Users,
    title: "إدارة الطلاب",
    desc: "أضيفي طلابك وتابعي بياناتهم ومعلومات أولياء أمورهم",
    color: "#7C3AED",
  },
  {
    icon: FileText,
    title: "التقارير والملاحظات",
    desc: "أرسلي تقارير يومية وملاحظات لأولياء الأمور",
    color: "#F97316",
  },
  {
    icon: MessageCircle,
    title: "التواصل مع الأسر",
    desc: "تواصلي مع أولياء الأمور مباشرة من المنصة",
    color: "#EC4899",
  },
  {
    icon: BookOpen,
    title: "التقييمات",
    desc: "قيّمي أداء طلابك وتابعي تطورهم",
    color: "#10B981",
  },
  {
    icon: Sparkles,
    title: "الخطة الأسبوعية",
    desc: "خططي لأسبوعك الدراسي بسهولة وشاركيه مع الأسر",
    color: "#7C3AED",
  },
];

const benefits = [
  "بدون تعقيد - واجهة بسيطة ومباشرة",
  "تعمل على الجوال والكمبيوتر",
  "مناسبة لأي معلمة سواء بمدرسة حكومية أو خاصة",
  "تواصل مباشر مع أولياء الأمور",
  "تقارير جاهزة بضغطة زر",
  "آمنة ومشفرة لحماية بيانات الطلاب",
];

export default function GhirasLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-white" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">غ</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">غراس</h1>
              <p className="text-xs text-muted-foreground">من نشأة</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link href="/ghiras/register">
              <Button size="sm" className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl">
                ابدئي مجاناً
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-[#10B981]/10 text-[#059669] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            منصة مجانية للمعلمات
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
            أدوات ذكية لكل معلمة
            <br />
            <span className="text-[#10B981]">تبسّط يومك الدراسي</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            غراس منصة مصممة خصيصاً للمعلمات. سجلي الحضور، أرسلي التقارير، وتواصلي مع أولياء الأمور - كل شي في مكان واحد.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/ghiras/register">
              <Button size="lg" className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl px-8 h-12 text-base shadow-lg shadow-[#10B981]/20">
                ابدئي الآن مجاناً
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="rounded-xl px-8 h-12 text-base">
                عندي حساب
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">كل ما تحتاجينه في مكان واحد</h2>
            <p className="text-muted-foreground">أدوات بسيطة وفعالة تساعدك في إدارة فصلك</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">لماذا غراس؟</h2>
            <p className="text-muted-foreground">صُممت خصيصاً لتناسب احتياجات المعلمة</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 p-4 rounded-xl bg-white shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                <span className="text-foreground font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#10B981] to-[#059669]">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">جاهزة تبدئين؟</h2>
          <p className="text-white/80 text-lg mb-8">
            سجلي الآن مجاناً وابدئي بإدارة فصلك بطريقة أسهل
          </p>
          <Link href="/ghiras/register">
            <Button size="lg" className="bg-white text-[#059669] hover:bg-white/90 rounded-xl px-8 h-12 text-base font-bold shadow-lg">
              إنشاء حساب مجاني
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-white border-t border-border/50">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
              <span className="text-white font-bold text-sm">غ</span>
            </div>
            <span className="font-bold text-foreground">غراس</span>
            <span className="text-muted-foreground text-sm">من نشأة</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">سياسة الخصوصية</Link>
            <Link href="/terms" className="hover:text-foreground">الشروط والأحكام</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
