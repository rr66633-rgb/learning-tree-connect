import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Sparkles, Copy, Download, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AIStory() {
  const [theme, setTheme] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [result, setResult] = useState<any>(null);

  const [contentId, setContentId] = useState<number | null>(null);

  const generateMutation = trpc.ai.generateStory.useMutation({
    onSuccess: (data: any) => { setResult(data); setContentId(data.id ? Number(data.id) : null); toast.success("تم إنشاء القصة بنجاح"); },
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

  const handleExportPDF = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isAr = language === "ar";
    printWindow.document.write(`<!DOCTYPE html><html dir="${isAr ? 'rtl' : 'ltr'}" lang="${language}"><head><meta charset="utf-8"/><title>${result.title || 'Story'}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;line-height:2;color:#1a1a1a}h1{color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:8px}.story{margin:20px 0;padding:20px;background:#f0fdfa;border-radius:12px;border:1px solid #99f6e4;font-size:16px;white-space:pre-wrap}.section{margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px}.section-title{font-weight:bold;color:#0d9488;margin-bottom:8px;font-size:14px}.vocab{display:inline-block;margin:4px;padding:4px 12px;background:#ccfbf1;border-radius:20px;font-size:13px}ol,ul{padding-${isAr ? 'right' : 'left'}:20px}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}</style></head><body><h1>${result.title || ''}</h1><div class="story">${result.story || ''}</div>${result.discussionQuestions ? `<div class="section"><div class="section-title">${isAr ? 'أسئلة نقاشية' : 'Discussion Questions'}</div><ol>${(Array.isArray(result.discussionQuestions) ? result.discussionQuestions : [result.discussionQuestions]).map((q: string) => `<li>${q}</li>`).join('')}</ol></div>` : ''}${result.vocabulary ? `<div class="section"><div class="section-title">${isAr ? 'مفردات جديدة' : 'Vocabulary'}</div><div>${(Array.isArray(result.vocabulary) ? result.vocabulary : [result.vocabulary]).map((w: string) => `<span class="vocab">${w}</span>`).join('')}</div></div>` : ''}${result.followUpActivities ? `<div class="section"><div class="section-title">${isAr ? 'أنشطة متابعة' : 'Follow-up Activities'}</div><ul>${(Array.isArray(result.followUpActivities) ? result.followUpActivities : [result.followUpActivities]).map((a: string) => `<li>${a}</li>`).join('')}</ul></div>` : ''}<div class="footer"><p>Learning Tree Kids Center</p></div></body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleGenerate = () => {
    if (!theme.trim() || !ageGroup) { toast.error("يرجى إدخال الموضوع واختيار الفئة العمرية"); return; }
    generateMutation.mutate({ theme, ageGroup, language });
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai"><Button variant="ghost" size="icon" className="shrink-0"><ArrowRight className="h-5 w-5" /></Button></Link>
        <div className="p-2 rounded-xl bg-teal-100"><BookOpen className="h-5 w-5 text-teal-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">صانع القصص</h1>
          <p className="text-sm text-muted-foreground">Story Creator</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">المدخلات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>موضوع القصة</Label>
              <Input placeholder="مثال: الصداقة، المشاركة، النظافة، الطبيعة" value={theme} onChange={(e) => setTheme(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الفئة العمرية</Label>
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger><SelectValue placeholder="اختر الفئة العمرية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2-3">2-3 سنوات</SelectItem>
                  <SelectItem value="3-4">3-4 سنوات</SelectItem>
                  <SelectItem value="4-5">4-5 سنوات</SelectItem>
                  <SelectItem value="5-6">5-6 سنوات</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700">
              {generateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الإنشاء...</>) : (<><Sparkles className="h-4 w-4 ml-2" />إنشاء القصة</>)}
            </Button>
          </CardContent>
        </Card>

        <Card className={result ? "border-teal-200" : "border-dashed"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>القصة</span>
              {result && (
                <div className="flex gap-1">
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
                <BookOpen className="h-12 w-12 mb-3 opacity-20" />
                <p>أدخل موضوعاً لإنشاء قصة تعليمية مع أنشطة مصاحبة</p>
              </div>
            )}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500 mb-3" />
                <p className="text-sm text-muted-foreground">جاري كتابة القصة...</p>
              </div>
            )}
            {result && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {result.title && <h3 className="font-bold text-lg text-gray-900">{result.title}</h3>}
                {result.story && (
                  <div className="p-4 rounded-lg bg-teal-50 border border-teal-100">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.story}</p>
                  </div>
                )}
                {result.discussionQuestions && (
                  <div>
                    <Label className="text-xs text-muted-foreground">أسئلة نقاشية</Label>
                    <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mt-1">
                      {(Array.isArray(result.discussionQuestions) ? result.discussionQuestions : [result.discussionQuestions]).map((q: string, i: number) => <li key={i}>{q}</li>)}
                    </ol>
                  </div>
                )}
                {result.vocabulary && (
                  <div>
                    <Label className="text-xs text-muted-foreground">مفردات جديدة</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(Array.isArray(result.vocabulary) ? result.vocabulary : [result.vocabulary]).map((word: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">{word}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.followUpActivities && (
                  <div>
                    <Label className="text-xs text-muted-foreground">أنشطة متابعة</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mt-1">
                      {(Array.isArray(result.followUpActivities) ? result.followUpActivities : [result.followUpActivities]).map((a: string, i: number) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
