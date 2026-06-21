import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Newspaper, Sparkles, Copy, Loader2, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AINewsletter() {
  const [month, setMonth] = useState("");
  const [highlights, setHighlights] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [result, setResult] = useState<any>(null);

  const [contentId, setContentId] = useState<number | null>(null);

  const generateMutation = trpc.ai.generateNewsletter.useMutation({
    onSuccess: (data: any) => { setResult(data); setContentId(data.id ? Number(data.id) : null); toast.success("تم إنشاء النشرة بنجاح"); },
    onError: (err) => { const msg = err.message || "حدث خطأ"; toast.error(msg.includes("JSON") || msg.includes("parse") || msg.includes("Unterminated") ? "حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى." : msg); },
  });

  const saveMutation = trpc.ai.saveToLibrary.useMutation({
    onSuccess: () => toast.success("تم الحفظ في المكتبة"),
    onError: (err) => toast.error(err.message || "فشل الحفظ"),
  });

  const handleSaveToLibrary = () => {
    if (!contentId) { toast.error("لا يوجد محتوى لحفظه"); return; }
    saveMutation.mutate({ contentId });
  };

  const handleGenerate = () => {
    if (!month.trim()) { toast.error("يرجى إدخال الشهر"); return; }
    generateMutation.mutate({ month, highlights: highlights.split("\n").filter(Boolean), language });
  };

  const handleExportPDF = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>النشرة الشهرية</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.8;direction:rtl}
      h1{color:#1a3a5c;text-align:center}h2{color:#2c5f7c;margin-top:20px}
      .section{margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px}
      </style></head><body>
      <h1>${result.title || 'النشرة الشهرية'}</h1>
      ${result.introduction ? `<p>${result.introduction}</p>` : ''}
      ${result.sections ? result.sections.map((s: any) => `<div class="section"><h2>${s.title}</h2><p>${s.content}</p></div>`).join('') : ''}
      ${result.closingMessage ? `<p><strong>${result.closingMessage}</strong></p>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai"><Button variant="ghost" size="icon" className="shrink-0"><ArrowRight className="h-5 w-5" /></Button></Link>
        <div className="p-2 rounded-xl bg-indigo-100"><Newspaper className="h-5 w-5 text-indigo-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">النشرة الشهرية</h1>
          <p className="text-sm text-muted-foreground">Newsletter Generator</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">المدخلات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>الشهر</Label>
              <Input placeholder="مثال: يناير 2026" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>أبرز الأحداث والأنشطة (سطر لكل حدث - اختياري)</Label>
              <Textarea
                placeholder="رحلة إلى حديقة الحيوان&#10;يوم اللغة العربية&#10;مشروع الزراعة"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-700">
              <p>سيقرأ النظام أحداث التقويم والإعلانات الأخيرة تلقائياً لإثراء النشرة.</p>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700">
              {generateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الإنشاء...</>) : (<><Sparkles className="h-4 w-4 ml-2" />إنشاء النشرة</>)}
            </Button>
          </CardContent>
        </Card>

        <Card className={result ? "border-indigo-200" : "border-dashed"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>النشرة</span>
              {result && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("تم النسخ"); }}><Copy className="h-4 w-4 ml-1" />نسخ</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 ml-1" />PDF</Button>
                  <Button variant="ghost" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}><Save className="h-4 w-4 ml-1" />حفظ</Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Newspaper className="h-12 w-12 mb-3 opacity-20" />
                <p>أدخل الشهر لإنشاء نشرة إخبارية شهرية</p>
              </div>
            )}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
                <p className="text-sm text-muted-foreground">جاري تجميع المحتوى...</p>
              </div>
            )}
            {result && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {result.title && <h3 className="font-bold text-lg text-gray-900 text-center">{result.title}</h3>}
                {result.introduction && <p className="text-gray-600 text-sm leading-relaxed">{result.introduction}</p>}
                {result.sections && Array.isArray(result.sections) && result.sections.map((section: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                    <h4 className="font-semibold text-indigo-800 mb-1">{section.title}</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>
                  </div>
                ))}
                {result.upcomingEvents && Array.isArray(result.upcomingEvents) && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <Label className="text-xs text-blue-600">الأحداث القادمة</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                      {result.upcomingEvents.map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
                {result.closingMessage && (
                  <p className="text-sm text-gray-600 italic text-center border-t pt-3">{result.closingMessage}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
