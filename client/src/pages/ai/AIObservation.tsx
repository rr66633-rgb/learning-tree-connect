import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Eye, Sparkles, Copy, Save, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAiTask } from "@/components/AiTaskOverlay";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function AIObservation() {
  const { i18n } = useTranslation();
  const { runTask } = useAiTask();
  const isAr = i18n.language === "ar";
  const [childName, setChildName] = useState("");
  const [shortNote, setShortNote] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [result, setResult] = useState<any>(null);

  const generateMutation = trpc.ai.generateObservation.useMutation({
    onSuccess: (data: any) => {
      setResult(data);
      setContentId(data.id ? Number(data.id) : null);
      toast.success(isAr ? "تم إنشاء الملاحظة بنجاح" : "Observation created successfully");
    },
    onError: (err) => {
      const msg = err.message || (isAr ? "حدث خطأ" : "An error occurred");
      toast.error(msg.includes("JSON") || msg.includes("parse") || msg.includes("Unterminated") ? isAr ? "حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى." : "An error occurred during processing. Please try again." : msg);
    },
  });

  const [contentId, setContentId] = useState<number | null>(null);

  const saveMutation = trpc.ai.saveToLibrary.useMutation({
    onSuccess: () => toast.success(isAr ? "تم الحفظ في المكتبة" : "Saved to library"),
    onError: (err) => toast.error(err.message || isAr ? "فشل الحفظ" : "Save Failed"),
  });

  const handleGenerate = () => {
    if (!childName.trim() || !shortNote.trim()) {
      toast.error(isAr ? "يرجى إدخال اسم الطفل والملاحظة" : "Please enter child name and observation");
      return;
    }
    runTask({
      title: "جارٍ إعداد الملاحظة",
      titleEn: "Preparing the observation",
      stages: [
        { label: "قراءة ملاحظتك", labelEn: "Reading your note" },
        { label: "تحليلها وفق إطار EYFS", labelEn: "Analysing against EYFS" },
        { label: "صياغة الملاحظة المهنية", labelEn: "Writing the professional note" },
      ],
      stageSeconds: [3, 8],
      run: () => generateMutation.mutateAsync({ childName, shortNote, language }),
      onDone: () => ({
        title: "تمت كتابة الملاحظة",
        titleEn: "Observation ready",
        actionLabel: "عرض الملاحظة",
        actionLabelEn: "View observation",
        // The result renders inline below the form; bring it into view
        // rather than leaving the user staring at the inputs.
        onAction: () => requestAnimationFrame(() =>
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
        ),
      }),
    }).catch(() => { /* the card reports the failure; the toast already fired */ });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ" : "Copied");
  };

  const handleSaveToLibrary = () => {
    if (!contentId) {
      toast.error(isAr ? "لا يوجد محتوى لحفظه" : "No content to save");
      return;
    }
    saveMutation.mutate({ contentId });
  };

  const handleExportPDF = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isAr = language === "ar";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
        <meta charset="utf-8" />
        <title>${result.title || 'Observation'}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; line-height: 1.8; color: #1a1a1a; }
          h1 { color: #5b21b6; border-bottom: 2px solid #5b21b6; padding-bottom: 8px; }
          .section { margin: 20px 0; padding: 16px; background: #f9fafb; border-radius: 8px; }
          .section-title { font-weight: bold; color: #5b21b6; margin-bottom: 8px; font-size: 14px; }
          .eyfs-box { background: #ede9fe; padding: 16px; border-radius: 8px; border: 1px solid #c4b5fd; }
          ul { padding-${isAr ? 'right' : 'left'}: 20px; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>${result.title || isAr ? 'ملاحظة تعليمية' : 'Educational Note'}</h1>
        <p><strong>${isAr ? 'الطفل' : 'Child'}:</strong> ${childName}</p>
        <p><strong>${isAr ? 'التاريخ' : 'Date'}:</strong> ${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p>
        
        <div class="section">
          <div class="section-title">${isAr ? 'الملاحظة المهنية' : 'Professional Observation'}</div>
          <p>${result.observation || ''}</p>
        </div>

        ${result.eyfsArea ? `
        <div class="eyfs-box">
          <div class="section-title">${isAr ? 'مجال EYFS' : 'EYFS Area'}</div>
          <p><strong>${result.eyfsArea}</strong></p>
          ${result.eyfsSubArea ? `<p>${result.eyfsSubArea}</p>` : ''}
        </div>` : ''}

        ${result.analysis ? `
        <div class="section">
          <div class="section-title">${isAr ? 'التحليل' : 'Analysis'}</div>
          <p>${result.analysis}</p>
        </div>` : ''}

        ${result.nextSteps ? `
        <div class="section">
          <div class="section-title">${isAr ? 'الخطوات التالية' : 'Next Steps'}</div>
          <ul>
            ${(Array.isArray(result.nextSteps) ? result.nextSteps : [result.nextSteps]).map((s: string) => `<li>${s}</li>`).join('')}
          </ul>
        </div>` : ''}

        <div class="footer">
          <p>Nashaa - ${isAr ? 'تم الإنشاء بواسطة المساعد الذكي' : 'Generated by AI Assistant'}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ai">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-xl">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Eye className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{isAr ? "كاتب الملاحظات" : "Note Taker"}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? "إنشاء ملاحظات مهنية بنقرة واحدة" : "Create Professional Notes with One Click"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{isAr ? "المدخلات" : "Inputs"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? "اسم الطفل" : "Child's Name"}</Label>
              <Input
                placeholder={isAr ? "مثال: سارة" : "Example: Sarah"}
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "ملاحظة قصيرة" : "Short Note"}</Label>
              <Textarea
                placeholder={isAr ? "مثال: سارة بنت برج باستخدام المكعبات وتعاونت مع طفل آخر" : "Example: Sarah built a tower using blocks and collaborated with another child"}
                value={shortNote}
                onChange={(e) => setShortNote(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اللغة" : "Language"}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{isAr ? "العربية" : "Arabic"}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  {isAr ? "جاري الإنشاء..." : "Creating..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 ml-2" />
                  {isAr ? "إنشاء الملاحظة" : "Create Note"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card className={`border-0 shadow-sm ${result ? "ring-1 ring-violet-200" : ""}`}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{isAr ? "النتيجة" : "Score"}</span>
              {result && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}>
                    <Copy className="h-4 w-4 ml-1" />{isAr ? "نسخ" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 ml-1" />PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 ml-1" />{isAr ? "حفظ" : "Save"}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Eye className="h-12 w-12 mb-3 opacity-20" />
                <p>أدخل ملاحظة قصيرة واضغط isAr ? "إنشاء" : "Create" لتوليد ملاحظة مهنية</p>
              </div>
            )}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-3" />
                <p className="text-sm text-muted-foreground">{isAr ? "جاري التحليل والكتابة..." : "Analyzing & Writing..."}</p>
              </div>
            )}
            {result && (
              <div className="space-y-4">
                {result.title && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? "العنوان" : "Address"}</Label>
                    <p className="font-semibold text-gray-900">{result.title}</p>
                  </div>
                )}
                {result.observation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? "الملاحظة المهنية" : "Professional Note"}</Label>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.observation}</p>
                  </div>
                )}
                {result.eyfsArea && (
                  <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                    <Label className="text-xs text-violet-600">مجال EYFS</Label>
                    <p className="font-medium text-violet-800">{result.eyfsArea}</p>
                    {result.eyfsSubArea && (
                      <p className="text-sm text-violet-600 mt-1">{result.eyfsSubArea}</p>
                    )}
                  </div>
                )}
                {result.analysis && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? "التحليل" : "Analysis"}</Label>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
                  </div>
                )}
                {result.nextSteps && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? "الخطوات التالية" : "Next Steps"}</Label>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {(Array.isArray(result.nextSteps) ? result.nextSteps : [result.nextSteps]).map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
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
