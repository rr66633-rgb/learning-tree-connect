import { Link } from "wouter";
import { 
  Sparkles, Eye, CalendarDays, Lightbulb, BarChart3, 
  MessageSquare, Newspaper, BookOpen, Library, ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const aiFeatures = [
  {
    id: "observation",
    title: "كاتب الملاحظات",
    titleEn: "Observation Writer",
    description: "إنشاء ملاحظات مهنية مع تحليل EYFS تلقائياً",
    icon: Eye,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    id: "planner",
    title: "الخطة الأسبوعية",
    titleEn: "Weekly Planner",
    description: "إنشاء خطط أسبوعية شاملة بأنشطة يومية",
    icon: CalendarDays,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    id: "activity",
    title: "مولّد الأنشطة",
    titleEn: "Activity Generator",
    description: "أنشطة تعليمية مبتكرة حسب العمر والموضوع",
    icon: Lightbulb,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    id: "report",
    title: "تقرير التقدم",
    titleEn: "Progress Report",
    description: "تقارير شاملة لأولياء الأمور من بيانات الطفل",
    icon: BarChart3,
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    id: "message",
    title: "رسائل أولياء الأمور",
    titleEn: "Parent Messages",
    description: "رسائل مهنية بالعربية والإنجليزية بنقرة واحدة",
    icon: MessageSquare,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  {
    id: "newsletter",
    title: "النشرة الشهرية",
    titleEn: "Newsletter",
    description: "نشرة إخبارية جاهزة من أنشطة وأحداث الشهر",
    icon: Newspaper,
    color: "from-indigo-500 to-blue-600",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    id: "story",
    title: "صانع القصص",
    titleEn: "Story Creator",
    description: "قصص تعليمية مع أسئلة نقاشية ومفردات",
    icon: BookOpen,
    color: "from-teal-500 to-emerald-600",
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    id: "library",
    title: "المكتبة",
    titleEn: "AI Library",
    description: "حفظ واسترجاع جميع المحتوى المُنشأ",
    icon: Library,
    color: "from-slate-500 to-gray-600",
    bgColor: "bg-slate-50",
    iconColor: "text-slate-600",
  },
];

export default function AIHub() {
  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المساعد الذكي</h1>
            <p className="text-sm text-muted-foreground">Learning Tree AI</p>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          أدوات ذكاء اصطناعي متقدمة لتقليل الأعمال الورقية بنسبة 70% وتمكين المعلمات من التركيز على ما يهم: الأطفال.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {aiFeatures.map((feature) => (
          <Link key={feature.id} href={`/ai/${feature.id}`}>
            <Card className="group cursor-pointer border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 ease-out h-full">
              <CardContent className="p-5">
                <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{feature.titleEn}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-medium text-violet-800">نصيحة سريعة</span>
        </div>
        <p className="text-sm text-violet-700">
          جميع المحتوى المُنشأ يُحفظ تلقائياً في المكتبة. يمكنك إعادة استخدامه أو تعديله لاحقاً.
          اللغة العربية هي الافتراضية لجميع الأدوات مع دعم كامل للإنجليزية.
        </p>
      </div>
    </div>
  );
}
