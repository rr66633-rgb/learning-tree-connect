import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Download, Loader2, Sparkles, Image } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const getTemplates = (isAr: boolean) => ([
  { value: "trip", label: (isAr ? "رحلة" : "Trip"), emoji: "🚌" },
  { value: "national_day", label: (isAr ? "اليوم الوطني" : "National Day"), emoji: "🇸🇦" },
  { value: "founding_day", label: (isAr ? "يوم التأسيس" : "Founding Day"), emoji: "🏛️" },
  { value: "ramadan", label: (isAr ? "رمضان" : "Ramadan"), emoji: "🌙" },
  { value: "eid", label: (isAr ? "العيد" : "Eid"), emoji: "🎉" },
  { value: "graduation", label: (isAr ? "التخرج" : "Graduation"), emoji: "🎓" },
  { value: "sports_day", label: (isAr ? "اليوم الرياضي" : "Sports Day"), emoji: "⚽" },
  { value: "science_day", label: (isAr ? "يوم العلوم" : "Science Day"), emoji: "🔬" },
  { value: "family_day", label: (isAr ? "يوم الأسرة" : "Family Day"), emoji: "👨‍👩‍👧‍👦" },
  { value: "water_fun", label: (isAr ? "اليوم المائي" : "Water Day"), emoji: "💦" },
  { value: "open_house", label: (isAr ? "يوم مفتوح" : "Open Day"), emoji: "🏫" },
  { value: "parent_workshop", label: (isAr ? "ورشة أولياء الأمور" : "Parents' Workshop"), emoji: "📋" },
  { value: "summer_program", label: (isAr ? "البرنامج الصيفي" : "Summer Program"), emoji: "☀️" },
  { value: "registration", label: (isAr ? "حملة التسجيل" : "Registration Campaign"), emoji: "📝" },
]);

export default function AIMarketingPoster() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    ageGroup: "",
    template: "",
    language: "ar" as "ar" | "en",
  });
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  const generateMutation = trpc.aiMarketing.generatePoster.useMutation({
    onSuccess: (data) => {
      setPosterUrl(data.posterUrl || null);
      toast.success(isAr ? "تم إنشاء البوستر بنجاح!" : "Poster created successfully!");
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? "حدث خطأ أثناء إنشاء البوستر" : "An error occurred while creating the poster"));
    },
  });

  const handleGenerate = () => {
    if (!form.title) {
      toast.error(isAr ? "يرجى كتابة عنوان الفعالية" : "Please enter event title");
      return;
    }
    generateMutation.mutate(form);
  };

  const handleDownload = async () => {
    if (!posterUrl) return;
    try {
      const response = await fetch(posterUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poster-${form.title || "event"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(isAr ? "فشل تحميل البوستر" : "Failed to download poster");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai/marketing">
          <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isAr ? "مصمم البوسترات" : "Poster Designer"}</h1>
          <p className="text-sm text-gray-500">{isAr ? "أنشئ بوسترات احترافية بالذكاء الاصطناعي" : "Create Professional Posters with AI"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? "القالب" : "Template"}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {getTemplates(isAr).map((t) => (
                  <button key={t.value} onClick={() => setForm({ ...form, template: t.value })}
                    className={`p-2 text-sm rounded-lg border text-center transition-all ${form.template === t.value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 hover:border-gray-300"}`}>
                    <span className="block text-lg mb-0.5">{t.emoji}</span>
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>عنوان الفعالية *</Label>
              <Input placeholder={isAr ? "مثال: اليوم الرياضي السنوي" : "Example: Annual Sports Day"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? "التاريخ" : "Date"}</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الوقت" : "Time"}</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "المكان" : "Location"}</Label>
              <Input placeholder={isAr ? "مثال: ملعب المركز" : "Example: Center Playground"} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الفئة العمرية" : "Age Group"}</Label>
              <Input placeholder={isAr ? "مثال: 3-6 سنوات" : "Example: 3-6 years"} value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اللغة" : "Language"}</Label>
              <Select value={form.language} onValueChange={(v: any) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{isAr ? "عربي" : "Arabic"}</SelectItem>
                  <SelectItem value="en">{isAr ? "إنجليزي" : "English"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-purple-600 hover:bg-purple-700">
              {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري التصميم (10-20 ثانية)...</> : <><Sparkles className="h-4 w-4 ml-2" />{isAr ? "تصميم البوستر" : "Poster Design"}</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            {posterUrl ? (
              <div className="space-y-4">
                <img src={posterUrl} alt="البوستر" className="w-full rounded-lg shadow-md" />
                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <Download className="h-4 w-4 ml-2" />تحميل PNG
                  </Button>
                  <Button onClick={handleGenerate} variant="outline" disabled={generateMutation.isPending} className="flex-1">
                    <Sparkles className="h-4 w-4 ml-2" />إعادة التصميم
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                <Image className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-sm">{isAr ? "البوستر سيظهر هنا" : "Poster will appear here"}</p>
                <p className="text-xs mt-1">{isAr ? "اختر قالب واملأ البيانات ثم اضغط تصميم" : "Choose a template, fill in the data, then click Design"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
