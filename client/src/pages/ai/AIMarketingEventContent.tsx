import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowRight, Copy, Loader2, Sparkles, MessageSquare, Bell, Phone, Instagram, Music, Ghost, Globe } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

const eventTypes = [
  { value: "trip", label: "رحلة" },
  { value: "celebration", label: "احتفال" },
  { value: "national_day", label: "يوم وطني" },
  { value: "graduation", label: "تخرج" },
  { value: "sports", label: "يوم رياضي" },
  { value: "science", label: "يوم علمي" },
  { value: "family", label: "يوم الأسرة" },
  { value: "workshop", label: "ورشة عمل" },
  { value: "open_house", label: "يوم مفتوح" },
  { value: "registration", label: "حملة تسجيل" },
  { value: "ramadan", label: "فعالية رمضانية" },
  { value: "eid", label: "فعالية العيد" },
  { value: "other", label: "أخرى" },
];

const ageGroups = [
  { value: "infant", label: "رضع (3-12 شهر)" },
  { value: "toddler", label: "دارجين (1-2 سنة)" },
  { value: "preschool", label: "تمهيدي (3-4 سنوات)" },
  { value: "kg1", label: "KG1 (4-5 سنوات)" },
  { value: "kg2", label: "KG2 (5-6 سنوات)" },
  { value: "all", label: "جميع الأعمار" },
];

export default function AIMarketingEventContent() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [form, setForm] = useState({
    eventName: "",
    eventType: "",
    date: "",
    time: "",
    ageGroup: "",
    location: "",
    description: "",
    language: "both" as "ar" | "en" | "both",
  });
  const [result, setResult] = useState<any>(null);

  const generateMutation = trpc.aiMarketing.generateEventContent.useMutation({
    onSuccess: (data) => {
      setResult(data.content);
      toast.success(isAr ? "تم إنشاء المحتوى بنجاح!" : "Content created successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إنشاء المحتوى");
    },
  });

  const handleGenerate = () => {
    if (!form.eventName || !form.eventType || !form.date || !form.description) {
      toast.error(isAr ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
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
          <h1 className="text-xl font-bold text-gray-900">مولد محتوى الفعاليات</h1>
          <p className="text-sm text-gray-500">أنشئ محتوى تسويقي شامل لأي فعالية</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الفعالية *</Label>
              <Input placeholder="مثال: رحلة حديقة الحيوان" value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>نوع الفعالية *</Label>
              <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v })}>
                <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>
                  {eventTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>التاريخ *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الوقت</Label>
              <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الفئة العمرية" : "Age Group"}</Label>
              <Select value={form.ageGroup} onValueChange={(v) => setForm({ ...form, ageGroup: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                <SelectContent>
                  {ageGroups.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المكان</Label>
              <Input placeholder="مثال: قاعة الأنشطة" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>وصف الفعالية *</Label>
            <Textarea placeholder="اكتب وصفاً مختصراً عن الفعالية..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "اللغة" : "Language"}</Label>
            <Select value={form.language} onValueChange={(v: any) => setForm({ ...form, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">عربي فقط</SelectItem>
                <SelectItem value="en">إنجليزي فقط</SelectItem>
                <SelectItem value="both">عربي وإنجليزي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الإنشاء...</> : <><Sparkles className="h-4 w-4 ml-2" />إنشاء المحتوى</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Tabs defaultValue="announcement" className="space-y-4">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full h-auto">
            <TabsTrigger value="announcement" className="text-xs p-2">إعلان</TabsTrigger>
            <TabsTrigger value="push" className="text-xs p-2">إشعار</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs p-2">واتساب</TabsTrigger>
            <TabsTrigger value="sms" className="text-xs p-2">SMS</TabsTrigger>
            <TabsTrigger value="instagram" className="text-xs p-2">انستقرام</TabsTrigger>
            <TabsTrigger value="tiktok" className="text-xs p-2">تيك توك</TabsTrigger>
            <TabsTrigger value="snapchat" className="text-xs p-2">سناب</TabsTrigger>
            <TabsTrigger value="website" className="text-xs p-2">موقع</TabsTrigger>
          </TabsList>

          <TabsContent value="announcement">
            <ContentCard title="إعلان أولياء الأمور" icon={<MessageSquare className="h-5 w-5" />} onCopy={() => copyToClipboard(`${result.parentAnnouncement?.ar || ""}\n\n${result.parentAnnouncement?.en || ""}`, "الإعلان")}>
              {result.parentAnnouncement?.ar && <div className="mb-4"><h4 className="font-semibold text-sm text-gray-500 mb-1">عربي</h4><p className="whitespace-pre-wrap">{result.parentAnnouncement.ar}</p></div>}
              {result.parentAnnouncement?.en && <div><h4 className="font-semibold text-sm text-gray-500 mb-1">English</h4><p className="whitespace-pre-wrap">{result.parentAnnouncement.en}</p></div>}
            </ContentCard>
          </TabsContent>

          <TabsContent value="push">
            <ContentCard title="إشعار الهاتف" icon={<Bell className="h-5 w-5" />} onCopy={() => copyToClipboard(result.pushNotification || "", "الإشعار")}>
              <p className="whitespace-pre-wrap">{result.pushNotification}</p>
            </ContentCard>
          </TabsContent>

          <TabsContent value="whatsapp">
            <ContentCard title="رسالة واتساب" icon={<Phone className="h-5 w-5" />} onCopy={() => copyToClipboard(result.whatsappMessage || "", "رسالة الواتساب")}>
              <p className="whitespace-pre-wrap">{result.whatsappMessage}</p>
            </ContentCard>
          </TabsContent>

          <TabsContent value="sms">
            <ContentCard title="رسالة SMS" icon={<Phone className="h-5 w-5" />} onCopy={() => copyToClipboard(result.smsMessage || "", "رسالة SMS")}>
              <p className="whitespace-pre-wrap">{result.smsMessage}</p>
              <p className="text-xs text-gray-400 mt-2">{(result.smsMessage || "").length} / 160 حرف</p>
            </ContentCard>
          </TabsContent>

          <TabsContent value="instagram">
            <ContentCard title="كابشن انستقرام" icon={<Instagram className="h-5 w-5" />} onCopy={() => copyToClipboard(`${result.instagramCaption?.ar || ""}\n\n${result.instagramCaption?.hashtags?.join(" ") || ""}`, "كابشن انستقرام")}>
              {result.instagramCaption?.ar && <div className="mb-3"><h4 className="font-semibold text-sm text-gray-500 mb-1">عربي</h4><p className="whitespace-pre-wrap">{result.instagramCaption.ar}</p></div>}
              {result.instagramCaption?.en && <div className="mb-3"><h4 className="font-semibold text-sm text-gray-500 mb-1">English</h4><p className="whitespace-pre-wrap">{result.instagramCaption.en}</p></div>}
              {result.instagramCaption?.hashtags && <div className="flex flex-wrap gap-1 mt-2">{result.instagramCaption.hashtags.map((h: string, i: number) => <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{h}</span>)}</div>}
            </ContentCard>
          </TabsContent>

          <TabsContent value="tiktok">
            <ContentCard title="كابشن تيك توك" icon={<Music className="h-5 w-5" />} onCopy={() => copyToClipboard(`${result.tiktokCaption?.caption || ""}\n${result.tiktokCaption?.hashtags?.join(" ") || ""}`, "كابشن تيك توك")}>
              <p className="whitespace-pre-wrap mb-2">{result.tiktokCaption?.caption}</p>
              {result.tiktokCaption?.hashtags && <div className="flex flex-wrap gap-1">{result.tiktokCaption.hashtags.map((h: string, i: number) => <span key={i} className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full">{h}</span>)}</div>}
            </ContentCard>
          </TabsContent>

          <TabsContent value="snapchat">
            <ContentCard title="كابشن سناب شات" icon={<Ghost className="h-5 w-5" />} onCopy={() => copyToClipboard(result.snapchatCaption || "", "كابشن سناب شات")}>
              <p className="whitespace-pre-wrap">{result.snapchatCaption}</p>
            </ContentCard>
          </TabsContent>

          <TabsContent value="website">
            <ContentCard title="مقال الموقع" icon={<Globe className="h-5 w-5" />} onCopy={() => copyToClipboard(`${result.websiteArticle?.title || ""}\n\n${result.websiteArticle?.body || ""}`, "مقال الموقع")}>
              {result.websiteArticle?.title && <h3 className="text-lg font-bold mb-3">{result.websiteArticle.title}</h3>}
              <p className="whitespace-pre-wrap leading-relaxed">{result.websiteArticle?.body}</p>
            </ContentCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ContentCard({ title, icon, children, onCopy }: { title: string; icon: React.ReactNode; children: React.ReactNode; onCopy: () => void }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={onCopy}><Copy className="h-3.5 w-3.5 ml-1" />{isAr ? "نسخ" : "Copy"}</Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
