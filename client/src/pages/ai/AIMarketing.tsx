import { Link } from "wouter";
import { Calendar, Share2, Camera, Image, FileText, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "محتوى الفعاليات",
    description: "أنشئ إعلانات، رسائل واتساب، SMS، وكابشنات سوشال ميديا لأي فعالية",
    path: "/ai/marketing/event-content",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: FileText,
    title: "ملخص ما بعد الفعالية",
    description: "أنشئ تقارير وملخصات بعد انتهاء الفعالية",
    path: "/ai/marketing/event-summary",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Image,
    title: "مصمم البوسترات",
    description: "أنشئ بوسترات احترافية بالذكاء الاصطناعي مع قوالب جاهزة",
    path: "/ai/marketing/poster",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Share2,
    title: "محتوى السوشال ميديا",
    description: "أنشئ كابشنات لانستقرام، تيك توك، وسناب شات",
    path: "/ai/marketing/social-media",
    color: "bg-pink-100 text-pink-600",
  },
  {
    icon: Camera,
    title: "كابشن من الصور والفيديو",
    description: "ارفع صورة أو فيديو والذكاء الاصطناعي يكتب الكابشن",
    path: "/ai/marketing/media-caption",
    color: "bg-amber-100 text-amber-600",
  },
];

export default function AIMarketing() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl mb-4">
          <Sparkles className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">التسويق الذكي</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          أنشئ محتوى تسويقي احترافي لجميع المنصات بضغطة واحدة باستخدام الذكاء الاصطناعي
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Link key={feature.path} href={feature.path}>
            <Card className="h-full cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-gray-100">
              <CardContent className="p-5">
                <div className={`inline-flex p-2.5 rounded-xl ${feature.color} mb-3`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
