import { Link } from "wouter";
import { 
  Sparkles, Eye, CalendarDays, Lightbulb, BarChart3, 
  MessageSquare, Newspaper, BookOpen, Library, Megaphone, Zap, ArrowUpRight, History
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";


export default function AIHub() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const aiFeatures = [
  {
    id: "observation",
    title: isAr ? "كاتب الملاحظات" : "Note Taker",
    description: "إنشاء ملاحظات مهنية مع تحليل EYFS تلقائياً",
    icon: Eye,
    bgColor: "bg-violet-100",
    iconColor: "text-violet-600",
    tag: isAr ? "الأكثر استخداماً" : "Most Used",
  },
  {
    id: "planner",
    title: isAr ? "الخطة الأسبوعية" : "Weekly Plan",
    description: isAr ? "إنشاء خطط أسبوعية شاملة بأنشطة يومية" : "Create Comprehensive Weekly Plans with Daily Activities",
    icon: CalendarDays,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "activity",
    title: isAr ? "مولّد الأنشطة" : "Activity Generator",
    description: isAr ? "أنشطة تعليمية مبتكرة حسب العمر والموضوع" : "Innovative Educational Activities by Age and Topic",
    icon: Lightbulb,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "report",
    title: isAr ? "تقرير التقدم" : "Progress Report",
    description: isAr ? "تقارير شاملة لأولياء الأمور من بيانات الطفل" : "Comprehensive reports for parents from child data",
    icon: BarChart3,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    id: "message",
    title: isAr ? "رسائل أولياء الأمور" : "Parent Messages",
    description: isAr ? "رسائل مهنية بالعربية والإنجليزية بنقرة واحدة" : "Professional messages in Arabic and English with one click",
    icon: MessageSquare,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    id: "newsletter",
    title: isAr ? "النشرة الشهرية" : "Monthly Newsletter",
    description: isAr ? "نشرة إخبارية جاهزة من أنشطة وأحداث الشهر" : "Ready Newsletter of Monthly Activities and Events",
    icon: Newspaper,
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    id: "story",
    title: isAr ? "صانع القصص" : "Story Maker",
    description: isAr ? "قصص تعليمية مع أسئلة نقاشية ومفردات" : "Educational stories with discussion questions and vocabulary",
    icon: BookOpen,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    id: "marketing",
    title: isAr ? "التسويق الذكي" : "Smart Marketing",
    description: isAr ? "محتوى تسويقي احترافي للفعاليات والسوشال ميديا" : "Professional marketing content for events and social media",
    icon: Megaphone,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
    tag: isAr ? "جديد" : "New",
  },
  {
    id: "requests",
    title: isAr ? "أعمالي الذكية" : "My AI Work",
    description: isAr ? "مساحة موحدة لكل الخطط والتقارير والمحتوى الذي أنشأته بالمساعد" : "One place for every plan, report and piece of content you created with AI",
    icon: History,
    bgColor: "bg-violet-100",
    iconColor: "text-violet-600",
    tag: isAr ? "سجل كامل" : "Full history",
  },
  {
    id: "library",
    title: isAr ? "المكتبة" : "Library",
    description: isAr ? "حفظ واسترجاع جميع المحتوى المُنشأ" : "Save and Restore All Created Content",
    icon: Library,
    bgColor: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  ];

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
              <h1 className="text-2xl font-bold text-foreground">{isAr ? "المساعد الذكي" : "AI Assistant"}</h1>
              <p className="text-sm text-muted-foreground">{isAr ? "أدوات ذكاء اصطناعي لتقليل الأعمال الورقية" : "AI tools to reduce paperwork"}</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="w-fit rounded-xl px-4 py-2 text-sm border-violet-200 text-violet-700 bg-violet-50">
          <Zap className="h-3.5 w-3.5 ml-1.5" />
          {isAr ? "توفير 70% من الوقت" : "Save 70% of time"}
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
            <span className="text-sm font-semibold text-violet-800">{isAr ? "نصيحة سريعة" : "Quick Tip"}</span>
          </div>
          <p className="text-sm text-violet-700/80 leading-relaxed">
            {isAr ? "كل طلب ونتيجة يُحفظان تلقائياً في أعمالي الذكية، ويمكنك الرجوع إلى المصدر أو فتح النتيجة في أي وقت. المكتبة مخصصة للمحتوى الذي تختار الاحتفاظ به كمفضلة." : "Every request and result is saved automatically in My AI Work, where you can reopen its source or result. The library is for content you intentionally keep as a favorite."}
            {isAr ? "اللغة العربية هي الافتراضية لجميع الأدوات مع دعم كامل للإنجليزية." : "Arabic is the default language for all tools with full English support."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
