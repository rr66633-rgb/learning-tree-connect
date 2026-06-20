import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, Sparkles, Copy, Download, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AIPlanner() {
  const [ageGroup, setAgeGroup] = useState("");
  const [theme, setTheme] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [result, setResult] = useState<any>(null);

  const [contentId, setContentId] = useState<number | null>(null);

  const generateMutation = trpc.ai.generateWeeklyPlan.useMutation({
    onSuccess: (data: any) => {
      setResult(data);
      setContentId(data.id ? Number(data.id) : null);
      toast.success("تم إنشاء الخطة الأسبوعية بنجاح");
    },
    onError: (err) => toast.error(err.message || "حدث خطأ"),
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
    const daysHtml = result.days && Array.isArray(result.days) ? result.days.map((day: any) => `
      <div class="day"><h3>${day.day || ''}</h3>
      ${day.activities && Array.isArray(day.activities) ? day.activities.map((a: any) => `<div class="activity"><strong>${a.title || a.name || ''}</strong><p>${a.description || ''}</p>${a.materials ? `<p class="materials">المواد: ${Array.isArray(a.materials) ? a.materials.join('، ') : a.materials}</p>` : ''}</div>`).join('') : ''}
      </div>`).join('') : '';
    printWindow.document.write(`<!DOCTYPE html><html dir="${isAr ? 'rtl' : 'ltr'}" lang="${language}"><head><meta charset="utf-8"/><title>${result.title || 'Weekly Plan'}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;line-height:1.8;color:#1a1a1a}h1{color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px}.day{margin:20px 0;padding:16px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd}.day h3{color:#0369a1;margin:0 0 12px}.activity{margin:8px 0;padding:8px;background:white;border-radius:4px}.materials{font-size:12px;color:#0369a1}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}</style></head><body><h1>${result.title || 'الخطة الأسبوعية'}</h1>${result.overview ? `<p>${result.overview}</p>` : ''}${daysHtml}<div class="footer"><p>Learning Tree Kids Center</p></div></body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleGenerate = () => {
    if (!ageGroup || !theme.trim()) {
      toast.error("يرجى اختيار الفئة العمرية وإدخال الموضوع");
      return;
    }
    generateMutation.mutate({
      ageGroup,
      theme,
      learningGoals: learningGoals.split("\n").filter(Boolean),
      language,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div className="p-2 rounded-xl bg-blue-100">
          <CalendarDays className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">الخطة الأسبوعية</h1>
          <p className="text-sm text-muted-foreground">Weekly Planner</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">المدخلات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>الفئة العمرية</Label>
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger><SelectValue placeholder="اختر الفئة العمرية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1">0-1 سنة (رضّع)</SelectItem>
                  <SelectItem value="1-2">1-2 سنة (دارجين)</SelectItem>
                  <SelectItem value="2-3">2-3 سنوات</SelectItem>
                  <SelectItem value="3-4">3-4 سنوات</SelectItem>
                  <SelectItem value="4-5">4-5 سنوات</SelectItem>
                  <SelectItem value="5-6">5-6 سنوات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الموضوع / الثيم</Label>
              <Input placeholder="مثال: الفصول الأربعة، الحيوانات، الألوان" value={theme} onChange={(e) => setTheme(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>أهداف التعلم (سطر لكل هدف - اختياري)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="تطوير المهارات الحركية الدقيقة&#10;تعزيز التعاون بين الأطفال"
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
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
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
              {generateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الإنشاء...</>) : (<><Sparkles className="h-4 w-4 ml-2" />إنشاء الخطة</>)}
            </Button>
          </CardContent>
        </Card>

        <Card className={result ? "border-blue-200" : "border-dashed"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>الخطة الأسبوعية</span>
              {result && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}><Copy className="h-4 w-4 ml-1" />نسخ</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 ml-1" />PDF</Button>
                  <Button variant="ghost" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}><Save className="h-4 w-4 ml-1" />حفظ</Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-3 opacity-20" />
                <p>اختر الفئة العمرية والموضوع لإنشاء خطة أسبوعية شاملة</p>
              </div>
            )}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm text-muted-foreground">جاري تصميم الخطة...</p>
              </div>
            )}
            {result && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {result.title && <h3 className="font-bold text-lg text-gray-900">{result.title}</h3>}
                {result.overview && <p className="text-gray-600 text-sm">{result.overview}</p>}
                {result.days && Array.isArray(result.days) && result.days.map((day: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">{day.day || `اليوم ${i + 1}`}</h4>
                    {day.activities && Array.isArray(day.activities) && day.activities.map((act: any, j: number) => (
                      <div key={j} className="mb-2 pr-3 border-r-2 border-blue-200">
                        <p className="font-medium text-sm">{act.title || act.name}</p>
                        <p className="text-xs text-gray-600">{act.description}</p>
                        {act.materials && <p className="text-xs text-blue-600 mt-1">المواد: {Array.isArray(act.materials) ? act.materials.join("، ") : act.materials}</p>}
                      </div>
                    ))}
                  </div>
                ))}
                {result.materials && (
                  <div className="p-3 rounded-lg bg-gray-50 border">
                    <Label className="text-xs text-muted-foreground">المواد المطلوبة</Label>
                    <p className="text-sm text-gray-700">{Array.isArray(result.materials) ? result.materials.join("، ") : result.materials}</p>
                  </div>
                )}
                {result.assessmentOpportunities && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <Label className="text-xs text-green-600">فرص التقييم</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {(Array.isArray(result.assessmentOpportunities) ? result.assessmentOpportunities : [result.assessmentOpportunities]).map((a: string, i: number) => <li key={i}>{a}</li>)}
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
