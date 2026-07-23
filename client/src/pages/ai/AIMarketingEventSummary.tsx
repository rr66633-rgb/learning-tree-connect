import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Copy, Loader2, Sparkles, FileText, Heart, Trophy, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function AIMarketingEventSummary() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [form, setForm] = useState({
    eventName: "",
    eventType: "",
    date: "",
    attendeesCount: "",
    highlights: "",
    language: "both" as "ar" | "en" | "both",
  });
  const [result, setResult] = useState<any>(null);

  const generateMutation = trpc.aiMarketing.generateEventSummary.useMutation({
    onSuccess: (data) => {
      setResult(data.content);
      toast.success(isAr ? "تم إنشاء الملخص بنجاح!" : "Summary created successfully!");
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? "حدث خطأ" : "An error occurred"));
    },
  });

  const handleGenerate = () => {
    if (!form.eventName || !form.eventType || !form.date || !form.highlights) {
      toast.error(isAr ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    generateMutation.mutate({
      ...form,
      attendeesCount: form.attendeesCount ? parseInt(form.attendeesCount) : undefined,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${isAr ? "تم نسخ " : "Copied"}${label}`);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai/marketing">
          <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isAr ? "ملخص ما بعد الفعالية" : "Post-Event Summary"}</h1>
          <p className="text-sm text-gray-500">{isAr ? "أنشئ تقارير وملخصات بعد انتهاء الفعالية" : "Generate Reports and Summaries After the Event"}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الفعالية *</Label>
              <Input placeholder={isAr ? "مثال: اليوم الرياضي" : "Example: Sports Day"} value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>نوع الفعالية *</Label>
              <Input placeholder={isAr ? "مثال: رياضي، تعليمي، احتفالي" : "Example: Sports, educational, celebratory"} value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>التاريخ *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "عدد الحضور" : "Number of attendees"}</Label>
              <Input type="number" placeholder={isAr ? "مثال: 50" : "Example: 50"} value={form.attendeesCount} onChange={(e) => setForm({ ...form, attendeesCount: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>أبرز اللحظات والإنجازات *</Label>
            <Textarea placeholder={isAr ? "اكتب أبرز ما حدث في الفعالية..." : "Write highlights of the event..."} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "اللغة" : "Language"}</Label>
            <Select value={form.language} onValueChange={(v: any) => setForm({ ...form, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">{isAr ? "عربي فقط" : "Arabic only"}</SelectItem>
                <SelectItem value="en">{isAr ? "إنجليزي فقط" : "English Only"}</SelectItem>
                <SelectItem value="both">{isAr ? "عربي وإنجليزي" : "Arabic and English"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />{isAr ? "جاري الإنشاء..." : "Creating..."}</> : <><Sparkles className="h-4 w-4 ml-2" />إنشاء الملخص</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <ContentCard title={isAr ? "تقرير الفعالية" : "Activity Report"} icon={<FileText className="h-5 w-5 text-blue-600" />} onCopy={() => copyToClipboard(result.eventReport || "", "التقرير")}>
            <p className="whitespace-pre-wrap leading-relaxed">{result.eventReport}</p>
          </ContentCard>
          <ContentCard title={isAr ? "ملخص لأولياء الأمور" : "Summary for Parents"} icon={<Heart className="h-5 w-5 text-pink-600" />} onCopy={() => copyToClipboard(result.parentSummary || "", "ملخص الأهل")}>
            <p className="whitespace-pre-wrap">{result.parentSummary}</p>
          </ContentCard>
          <ContentCard title="ملخص الإنجازات" icon={<Trophy className="h-5 w-5 text-amber-600" />} onCopy={() => copyToClipboard(result.achievementSummary || "", (isAr ? "الإنجازات" : "Achievements") )}>
            <p className="whitespace-pre-wrap">{result.achievementSummary}</p>
          </ContentCard>
          <ContentCard title={isAr ? "بوست سوشال ميديا" : "Social Media Post"} icon={<Share2 className="h-5 w-5 text-purple-600" />} onCopy={() => copyToClipboard(`${result.socialPost?.caption || ""}\n${result.socialPost?.hashtags?.join(" ") || ""}`, "البوست")}>
            <p className="whitespace-pre-wrap mb-2">{result.socialPost?.caption}</p>
            {result.socialPost?.hashtags && <div className="flex flex-wrap gap-1">{result.socialPost.hashtags.map((h: string, i: number) => <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{h}</span>)}</div>}
          </ContentCard>
          <ContentCard title={isAr ? "رسالة شكر" : "Thank You Message"} icon={<Heart className="h-5 w-5 text-red-500" />} onCopy={() => copyToClipboard(result.thankYouMessage || "", "رسالة الشكر")}>
            <p className="whitespace-pre-wrap">{result.thankYouMessage}</p>
          </ContentCard>
        </div>
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
