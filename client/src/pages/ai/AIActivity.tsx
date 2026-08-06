import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Lightbulb, Sparkles, Copy, Download, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAiTask } from "@/components/AiTaskOverlay";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AIActivity() {
  const { i18n } = useTranslation();
  const { runTask } = useAiTask();
  const isAr = i18n.language === "ar";
  const [age, setAge] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [result, setResult] = useState<any>(null);

  const [contentId, setContentId] = useState<number | null>(null);

  const generateMutation = trpc.ai.generateActivity.useMutation({
    onSuccess: (data: any) => { setResult(data); setContentId(data.id ? Number(data.id) : null); toast.success(isAr ? "تم إنشاء النشاط بنجاح" : "Activity created successfully"); },
    onError: (err) => { const msg = err.message || (isAr ? "حدث خطأ" : "An error occurred"); toast.error(msg.includes("JSON") || msg.includes("parse") || msg.includes("Unterminated") ? "حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى." : msg); },
  });

  const saveMutation = trpc.ai.saveToLibrary.useMutation({
    onSuccess: () => toast.success(isAr ? "تم الحفظ في المكتبة" : "Saved to library"),
    onError: (err) => toast.error(err.message || isAr ? "فشل الحفظ" : "Save Failed"),
  });

  const handleSaveToLibrary = () => {
    if (!contentId) { toast.error(isAr ? "لا يوجد محتوى لحفظه" : "No content to save"); return; }
    saveMutation.mutate({ contentId });
  };

  const handleExportPDF = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isAr = language === "ar";
    printWindow.document.write(`<!DOCTYPE html><html dir="${isAr ? 'rtl' : 'ltr'}" lang="${language}"><head><meta charset="utf-8"/><title>${result.title || 'Activity'}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;line-height:1.8;color:#1a1a1a}h1{color:#d97706;border-bottom:2px solid #d97706;padding-bottom:8px}.section{margin:20px 0;padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a}.section-title{font-weight:bold;color:#d97706;margin-bottom:8px;font-size:14px}ol{padding-${isAr ? 'right' : 'left'}:20px}ul{padding-${isAr ? 'right' : 'left'}:20px}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}</style></head><body><h1>${result.title || ''}</h1>${result.learningObjective ? `<div class="section"><div class="section-title">${isAr ? 'الهدف التعليمي' : 'Learning Objective'}</div><p>${result.learningObjective}</p></div>` : ''}${result.materials ? `<div class="section"><div class="section-title">${isAr ? 'المواد' : 'Materials'}</div><ul>${(Array.isArray(result.materials) ? result.materials : [result.materials]).map((m: string) => `<li>${m}</li>`).join('')}</ul></div>` : ''}${result.instructions ? `<div class="section"><div class="section-title">${isAr ? 'خطوات التنفيذ' : 'Instructions'}</div><ol>${(Array.isArray(result.instructions) ? result.instructions : [result.instructions]).map((s: string) => `<li>${s}</li>`).join('')}</ol></div>` : ''}${result.extensionIdeas ? `<div class="section"><div class="section-title">${isAr ? 'أفكار للتوسع' : 'Extension Ideas'}</div><ul>${(Array.isArray(result.extensionIdeas) ? result.extensionIdeas : [result.extensionIdeas]).map((e: string) => `<li>${e}</li>`).join('')}</ul></div>` : ''}${result.assessmentMethod ? `<div class="section"><div class="section-title">${isAr ? 'طريقة التقييم' : 'Assessment'}</div><p>${result.assessmentMethod}</p></div>` : ''}<div class="footer"><p>نشأة</p></div></body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleGenerate = () => {
    if (!age || !topic.trim()) { toast.error(isAr ? "يرجى اختيار العمر وإدخال الموضوع" : "Please select age and enter topic"); return; }
    runTask({
      title: "جارٍ توليد النشاط",
      titleEn: "Generating the activity",
      stages: [
        { label: "تحديد الفئة العمرية والموضوع", labelEn: "Matching age group and topic" },
        { label: "بناء خطوات النشاط والمواد", labelEn: "Building steps and materials" },
        { label: "إضافة طريقة التقييم", labelEn: "Adding the assessment method" },
      ],
      stageSeconds: [3, 8],
      run: () => generateMutation.mutateAsync({ age, topic, language }),
      onDone: () => ({
        title: "تم توليد النشاط",
        titleEn: "Activity ready",
        actionLabel: "عرض النشاط",
        actionLabelEn: "View activity",
        // The result renders inline below the form; bring it into view
        // rather than leaving the user staring at the inputs.
        onAction: () => requestAnimationFrame(() =>
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
        ),
      }),
    }).catch(() => { /* the card reports the failure; the toast already fired */ });
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai"><Button variant="ghost" size="icon" className="shrink-0"><ArrowRight className="h-5 w-5" /></Button></Link>
        <div className="p-2 rounded-xl bg-amber-100"><Lightbulb className="h-5 w-5 text-amber-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isAr ? "مولّد الأنشطة" : "Activity Generator"}</h1>
          <p className="text-sm text-muted-foreground">Activity Generator</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{isAr ? "المدخلات" : "Inputs"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? "العمر" : "Age"}</Label>
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger><SelectValue placeholder={isAr ? "اختر الفئة العمرية" : "Select Age Group"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1">0-1 سنة</SelectItem>
                  <SelectItem value="1-2">{isAr ? "1-2 سنة" : "Toddlers (1-2 years)"}</SelectItem>
                  <SelectItem value="2-3">2-3 سنوات</SelectItem>
                  <SelectItem value="3-4">{isAr ? "3-4 سنوات" : "Preschool (3-4 years)"}</SelectItem>
                  <SelectItem value="4-5">4-5 سنوات</SelectItem>
                  <SelectItem value="5-6">5-6 سنوات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الموضوع" : "Subject"}</Label>
              <Input placeholder={isAr ? "مثال: الأشكال الهندسية، الطبيعة، الحواس الخمس" : "Example: Geometric shapes, nature, five senses"} value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اللغة" : "Language"}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{isAr ? "العربية" : "Arabic"}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              {generateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin ml-2" />{isAr ? "جاري الإنشاء..." : "Creating..."}</>) : (<><Sparkles className="h-4 w-4 ml-2" />إنشاء النشاط</>)}
            </Button>
          </CardContent>
        </Card>

        <Card className={result ? "border-amber-200" : "border-dashed"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{isAr ? "النشاط" : "Activity"}</span>
              {result && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success(isAr ? "تم النسخ" : "Copied"); }}><Copy className="h-4 w-4 ml-1" />{isAr ? "نسخ" : "Copy"}</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 ml-1" />PDF</Button>
                  <Button variant="ghost" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}><Save className="h-4 w-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Lightbulb className="h-12 w-12 mb-3 opacity-20" />
                <p>{isAr ? "اختر العمر والموضوع لإنشاء نشاط تعليمي مبتكر" : "Choose age and topic to create an innovative educational activity"}</p>
              </div>
            )}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
                <p className="text-sm text-muted-foreground">{isAr ? "جاري تصميم النشاط..." : "Designing Activity..."}</p>
              </div>
            )}
            {result && (
              <div className="space-y-4">
                {result.title && <h3 className="font-bold text-lg text-gray-900">{result.title}</h3>}
                {result.learningObjective && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <Label className="text-xs text-amber-600">{isAr ? "الهدف التعليمي" : "Learning Objective"}</Label>
                    <p className="text-sm text-gray-700">{result.learningObjective}</p>
                  </div>
                )}
                {result.materials && (
                  <div><Label className="text-xs text-muted-foreground">{isAr ? "المواد المطلوبة" : "Required Materials"}</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {(Array.isArray(result.materials) ? result.materials : [result.materials]).map((m: string, i: number) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {result.instructions && (
                  <div><Label className="text-xs text-muted-foreground">{isAr ? "خطوات التنفيذ" : "Implementation Steps"}</Label>
                    <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                      {(Array.isArray(result.instructions) ? result.instructions : [result.instructions]).map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}
                {result.extensionIdeas && (
                  <div><Label className="text-xs text-muted-foreground">{isAr ? "أفكار للتوسع" : "Expansion Ideas"}</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {(Array.isArray(result.extensionIdeas) ? result.extensionIdeas : [result.extensionIdeas]).map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
                {result.assessmentMethod && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <Label className="text-xs text-green-600">{isAr ? "طريقة التقييم" : "Evaluation method"}</Label>
                    <p className="text-sm text-gray-700">{result.assessmentMethod}</p>
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
