import { Link } from "wouter";
import { 
  Sparkles, Eye, CalendarDays, Lightbulb, BarChart3, 
  MessageSquare, Newspaper, BookOpen, Library, Megaphone, Zap, ArrowUpRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const aiFeatures = [
  {
    id: "observation",
    title: "كاتب الملاحظات",
    description: "إنشاء ملاحظات مهنية مع تحليل EYFS تلقائياً",
    icon: Eye,
    bgColor: "bg-violet-100",
    iconColor: "text-violet-600",
    tag: "الأكثر استخداماً",
  },
  {
    id: "planner",
    title: "الخطة الأسبوعية",
    description: "إنشاء خطط أسبوعية شاملة بأنشطة يومية",
    icon: CalendarDays,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "activity",
    title: "مولّد الأنشطة",
    description: "أنشطة تعليمية مبتكرة حسب العمر والموضوع",
    icon: Lightbulb,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "report",
    title: "تقرير التقدم",
    description: "تقارير شاملة لأولياء الأمور من بيانات الطفل",
    icon: BarChart3,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    id: "message",
    title: "رسائل أولياء الأمور",
    description: "رسائل مهنية بالعربية والإنجليزية بنقرة واحدة",
    icon: MessageSquare,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    id: "newsletter",
    title: "النشرة الشهرية",
    description: "نشرة إخبارية جاهزة من أنشطة وأحداث الشهر",
    icon: Newspaper,
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    id: "story",
    title: "صانع القصص",
    description: "قصص تعليمية مع أسئلة نقاشية ومفردات",
    icon: BookOpen,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    id: "marketing",
    title: "التسويق الذكي",
    description: "محتوى تسويقي احترافي للفعاليات والسوشال ميديا",
    icon: Megaphone,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
    tag: "جديد",
  },
  {
    id: "library",
    title: "المكتبة",
    description: "حفظ واسترجاع جميع المحتوى المُنشأ",
    icon: Library,
    bgColor: "bg-muted",
    iconColor: "text-muted-foreground",
  },
];

export default function AIHub() {
  return (
    <div className="max-w-6xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200/50">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">المساعد الذكي</h1>
              <p className="text-sm text-muted-foreground">أدوات ذكاء اصطناعي لتقليل الأعمال الورقية</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="w-fit rounded-xl px-4 py-2 text-sm border-violet-200 text-violet-700 bg-violet-50">
          <Zap className="h-3.5 w-3.5 ml-1.5" />
          توفير 70% من الوقت
        </Badge>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiFeatures.map((feature) => (
          <Link key={feature.id} href={`/ai/${feature.id}`}>
            <Card className="group cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full relative overflow-hidden">
              <CardContent className="p-5">
                {feature.tag && (
                  <Badge className="absolute top-3 left-3 text-[10px] bg-violet-100 text-violet-700 border-0 rounded-lg">
                    {feature.tag}
                  </Badge>
                )}
                <div className={`w-11 h-11 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                  {feature.title}
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Tip */}
      <Card className="border-0 shadow-sm bg-gradient-to-l from-violet-50/80 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-800">نصيحة سريعة</span>
          </div>
          <p className="text-sm text-violet-700/80 leading-relaxed">
            جميع المحتوى المُنشأ يُحفظ تلقائياً في المكتبة. يمكنك إعادة استخدامه أو تعديله لاحقاً.
            اللغة العربية هي الافتراضية لجميع الأدوات مع دعم كامل للإنجليزية.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
