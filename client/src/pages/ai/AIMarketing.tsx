import { Link } from "wouter";
import { Calendar, Share2, Camera, Image, FileText, Sparkles, ArrowUpRight, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Calendar,
    title: "محتوى الفعاليات",
    description: "إعلانات، رسائل واتساب، SMS، وكابشنات سوشال ميديا",
    path: "/ai/marketing/event-content",
    color: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: FileText,
    title: "ملخص ما بعد الفعالية",
    description: "تقارير وملخصات بعد انتهاء الفعالية",
    path: "/ai/marketing/event-summary",
    color: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Image,
    title: "مصمم البوسترات",
    description: "بوسترات احترافية بالذكاء الاصطناعي",
    path: "/ai/marketing/poster",
    color: "bg-purple-100",
    iconColor: "text-purple-600",
    tag: "مميز",
  },
  {
    icon: Share2,
    title: "محتوى السوشال ميديا",
    description: "كابشنات لانستقرام، تيك توك، وسناب شات",
    path: "/ai/marketing/social-media",
    color: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    icon: Camera,
    title: "كابشن من الصور والفيديو",
    description: "ارفع صورة أو فيديو والذكاء الاصطناعي يكتب الكابشن",
    path: "/ai/marketing/media-caption",
    color: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export default function AIMarketing() {
  return (
    <div className="max-w-5xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-200/50">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">التسويق الذكي</h1>
            <p className="text-sm text-muted-foreground">محتوى تسويقي احترافي بنقرة واحدة</p>
          </div>
        </div>
        <Link href="/ai">
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            جميع أدوات الذكاء الاصطناعي
          </Button>
        </Link>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Link key={feature.path} href={feature.path}>
            <Card className="group h-full cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden">
              <CardContent className="p-5">
                {feature.tag && (
                  <Badge className="absolute top-3 left-3 text-[10px] bg-rose-100 text-rose-700 border-0 rounded-lg">
                    {feature.tag}
                  </Badge>
                )}
                <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
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
    </div>
  );
}
