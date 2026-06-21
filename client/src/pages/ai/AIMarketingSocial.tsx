import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Copy, Loader2, Sparkles, Instagram, Music, Ghost, Camera } from "lucide-react";
import { Link } from "wouter";

const platforms = [
  { value: "instagram_post", label: "بوست انستقرام", icon: Instagram },
  { value: "instagram_story", label: "ستوري انستقرام", icon: Camera },
  { value: "instagram_reel", label: "ريلز انستقرام", icon: Instagram },
  { value: "tiktok", label: "تيك توك", icon: Music },
  { value: "snapchat", label: "سناب شات", icon: Ghost },
];

const tones = [
  { value: "professional", label: "احترافي" },
  { value: "friendly", label: "ودود" },
  { value: "exciting", label: "حماسي" },
  { value: "educational", label: "تعليمي" },
  { value: "emotional", label: "عاطفي" },
];

export default function AIMarketingSocial() {
  const [form, setForm] = useState({
    platform: "instagram_post" as "instagram_post" | "instagram_story" | "instagram_reel" | "tiktok" | "snapchat",
    topic: "",
    tone: "professional" as "professional" | "educational" | "fun" | "promotional",
    language: "both" as "ar" | "en" | "both",
    additionalNotes: "",
  });
  const [result, setResult] = useState<any>(null);

  const generateMutation = trpc.aiMarketing.generateSocialContent.useMutation({
    onSuccess: (data) => {
      setResult(data.content);
      toast.success("تم إنشاء المحتوى بنجاح!");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ");
    },
  });

  const handleGenerate = () => {
    if (!form.topic) {
      toast.error("يرجى كتابة الموضوع");
      return;
    }
    generateMutation.mutate(form);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai/marketing">
          <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">مكتبة السوشال ميديا</h1>
          <p className="text-sm text-gray-500">أنشئ محتوى جاهز للنشر بضغطة واحدة</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>المنصة</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {platforms.map((p) => (
                <button key={p.value} onClick={() => setForm({ ...form, platform: p.value as any })}
                  className={`p-3 text-sm rounded-lg border text-center transition-all ${form.platform === p.value ? "border-pink-500 bg-pink-50 text-pink-700" : "border-gray-200 hover:border-gray-300"}`}>
                  <p.icon className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>الموضوع *</Label>
            <Input placeholder="مثال: أنشطة الأسبوع، تهنئة بالعيد، إعلان تسجيل..." value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>النبرة</Label>
              <Select value={form.tone} onValueChange={(v: any) => setForm({ ...form, tone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tones.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={form.language} onValueChange={(v: any) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">عربي فقط</SelectItem>
                  <SelectItem value="en">إنجليزي فقط</SelectItem>
                  <SelectItem value="both">عربي وإنجليزي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>ملاحظات إضافية</Label>
            <Textarea placeholder="أي تفاصيل إضافية تريد تضمينها..." value={form.additionalNotes} onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })} rows={2} />
          </div>
          <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-pink-600 hover:bg-pink-700">
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الإنشاء...</> : <><Sparkles className="h-4 w-4 ml-2" />إنشاء المحتوى</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {result.captionAr && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">الكابشن (عربي)</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.captionAr, "الكابشن العربي")}><Copy className="h-3.5 w-3.5 ml-1" />نسخ</Button>
                </div>
              </CardHeader>
              <CardContent><p className="whitespace-pre-wrap">{result.captionAr}</p></CardContent>
            </Card>
          )}
          {result.captionEn && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Caption (English)</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.captionEn, "English Caption")}><Copy className="h-3.5 w-3.5 ml-1" />نسخ</Button>
                </div>
              </CardHeader>
              <CardContent><p className="whitespace-pre-wrap" dir="ltr">{result.captionEn}</p></CardContent>
            </Card>
          )}
          {result.hashtags && result.hashtags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">الهاشتاقات</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.hashtags.join(" "), "الهاشتاقات")}><Copy className="h-3.5 w-3.5 ml-1" />نسخ</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((h: string, i: number) => (
                    <span key={i} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{h}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {result.callToAction && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">دعوة للتفاعل (CTA)</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.callToAction, "CTA")}><Copy className="h-3.5 w-3.5 ml-1" />نسخ</Button>
                </div>
              </CardHeader>
              <CardContent><p className="whitespace-pre-wrap">{result.callToAction}</p></CardContent>
            </Card>
          )}
          <Button onClick={() => copyToClipboard(`${result.captionAr || ""}\n\n${result.captionEn || ""}\n\n${result.hashtags?.join(" ") || ""}`, "كل المحتوى")} variant="outline" className="w-full">
            <Copy className="h-4 w-4 ml-2" />نسخ كل المحتوى
          </Button>
        </div>
      )}
    </div>
  );
}
