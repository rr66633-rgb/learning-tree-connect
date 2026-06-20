import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, Sparkles, Copy, Download, Save, Loader2, BookOpen, Clock, Users, Star, MessageCircle, Lightbulb, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const DAY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "الأحد": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-700" },
  "الاثنين": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700" },
  "الثلاثاء": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", badge: "bg-purple-100 text-purple-700" },
  "الأربعاء": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
  "الخميس": { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", badge: "bg-rose-100 text-rose-700" },
  "Sunday": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-700" },
  "Monday": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700" },
  "Tuesday": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", badge: "bg-purple-100 text-purple-700" },
  "Wednesday": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
  "Thursday": { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", badge: "bg-rose-100 text-rose-700" },
};

function DayCard({ day, index }: { day: any; index: number }) {
  const colors = DAY_COLORS[day.day] || { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-800", badge: "bg-gray-100 text-gray-700" };

  return (
    <div className={`rounded-xl ${colors.bg} ${colors.border} border p-5 space-y-4`}>
      {/* Day Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${colors.text}`}>{day.day || `اليوم ${index + 1}`}</h3>
        {day.totalDuration && (
          <Badge variant="outline" className={colors.badge}>
            <Clock className="h-3 w-3 ml-1" />{day.totalDuration}
          </Badge>
        )}
      </div>

      {/* Learning Objective */}
      {day.learningObjective && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-semibold text-gray-500">الهدف التعليمي</span>
          </div>
          <p className="text-sm font-medium text-gray-800">{day.learningObjective}</p>
        </div>
      )}

      {/* Circle Time */}
      {day.circleTime && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500">حلقة الصباح</span>
            {day.circleTime.duration && <Badge variant="outline" className="text-[10px] h-5">{day.circleTime.duration}</Badge>}
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">{day.circleTime.activity}</p>
          {day.circleTime.description && <p className="text-xs text-gray-600 mb-2">{day.circleTime.description}</p>}
          {day.circleTime.teacherInstructions && (
            <div className="mt-2 p-2 rounded bg-indigo-50 border border-indigo-100">
              <p className="text-[11px] font-semibold text-indigo-700 mb-1">📋 تعليمات المعلمة:</p>
              <p className="text-xs text-indigo-800">{day.circleTime.teacherInstructions}</p>
            </div>
          )}
        </div>
      )}

      {/* Main Activity */}
      {day.mainActivity && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-gray-500">النشاط الرئيسي</span>
            {day.mainActivity.duration && <Badge variant="outline" className="text-[10px] h-5">{day.mainActivity.duration}</Badge>}
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">{day.mainActivity.title}</p>
          {day.mainActivity.description && <p className="text-xs text-gray-600 mb-2">{day.mainActivity.description}</p>}
          {day.mainActivity.teacherInstructions && (
            <div className="mt-2 p-2 rounded bg-orange-50 border border-orange-100">
              <p className="text-[11px] font-semibold text-orange-700 mb-1">📋 تعليمات المعلمة:</p>
              <p className="text-xs text-orange-800">{day.mainActivity.teacherInstructions}</p>
            </div>
          )}
          {day.mainActivity.materials && Array.isArray(day.mainActivity.materials) && day.mainActivity.materials.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {day.mainActivity.materials.map((m: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-white">{m}</Badge>
              ))}
            </div>
          )}
          {day.mainActivity.differentiation && (
            <div className="mt-2 p-2 rounded bg-yellow-50 border border-yellow-100">
              <p className="text-[11px] font-semibold text-yellow-700 mb-1">🔄 التمايز:</p>
              <p className="text-xs text-yellow-800">{day.mainActivity.differentiation}</p>
            </div>
          )}
        </div>
      )}

      {/* Story Recommendation */}
      {day.storyRecommendation && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-teal-500" />
            <span className="text-xs font-semibold text-gray-500">القصة المقترحة</span>
          </div>
          <p className="text-sm font-semibold text-gray-800">{day.storyRecommendation.title}</p>
          {day.storyRecommendation.author && <p className="text-[11px] text-gray-500">المؤلف: {day.storyRecommendation.author}</p>}
          {day.storyRecommendation.summary && <p className="text-xs text-gray-600 mt-1">{day.storyRecommendation.summary}</p>}
          {day.storyRecommendation.connection && <p className="text-xs text-teal-700 mt-1 italic">الربط: {day.storyRecommendation.connection}</p>}
        </div>
      )}

      {/* Discussion Questions */}
      {day.discussionQuestions && Array.isArray(day.discussionQuestions) && day.discussionQuestions.length > 0 && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-pink-500" />
            <span className="text-xs font-semibold text-gray-500">أسئلة النقاش</span>
          </div>
          <ul className="space-y-1">
            {day.discussionQuestions.map((q: string, i: number) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                <span className="text-pink-400 mt-0.5">•</span>{q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Islamic Value */}
      {day.islamicValue && (
        <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🕌</span>
            <span className="text-xs font-semibold text-emerald-700">القيمة الإسلامية</span>
          </div>
          <p className="text-sm font-semibold text-emerald-800">{day.islamicValue.value}</p>
          {day.islamicValue.connection && <p className="text-xs text-emerald-700 mt-1">{day.islamicValue.connection}</p>}
          {day.islamicValue.hadithOrAyah && (
            <p className="text-xs text-emerald-900 mt-2 p-2 bg-emerald-100 rounded italic">"{day.islamicValue.hadithOrAyah}"</p>
          )}
        </div>
      )}

      {/* Assessment */}
      {day.assessmentOpportunity && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-semibold text-gray-500">فرصة التقييم</span>
          </div>
          {day.assessmentOpportunity.what && <p className="text-xs text-gray-700"><strong>ماذا نقيّم:</strong> {day.assessmentOpportunity.what}</p>}
          {day.assessmentOpportunity.how && <p className="text-xs text-gray-700 mt-1"><strong>كيف نقيّم:</strong> {day.assessmentOpportunity.how}</p>}
          {day.assessmentOpportunity.indicators && Array.isArray(day.assessmentOpportunity.indicators) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {day.assessmentOpportunity.indicators.map((ind: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">{ind}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Materials for the day */}
      {day.materials && Array.isArray(day.materials) && day.materials.length > 0 && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">📦 المواد المطلوبة لهذا اليوم</p>
          <div className="flex flex-wrap gap-1">
            {day.materials.map((m: string, i: number) => (
              <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
    const days = result.days && Array.isArray(result.days) ? result.days : [];
    
    const daysHtml = days.map((day: any) => `
      <div class="day-section">
        <h2 class="day-title">${day.day || ''}</h2>
        ${day.learningObjective ? `<div class="objective"><strong>🎯 الهدف التعليمي:</strong> ${day.learningObjective}</div>` : ''}
        ${day.circleTime ? `
          <div class="section">
            <h3>👥 حلقة الصباح ${day.circleTime.duration ? `(${day.circleTime.duration})` : ''}</h3>
            <p><strong>${day.circleTime.activity || ''}</strong></p>
            ${day.circleTime.description ? `<p>${day.circleTime.description}</p>` : ''}
            ${day.circleTime.teacherInstructions ? `<div class="instructions"><strong>تعليمات المعلمة:</strong><br/>${day.circleTime.teacherInstructions}</div>` : ''}
          </div>` : ''}
        ${day.mainActivity ? `
          <div class="section">
            <h3>⭐ النشاط الرئيسي ${day.mainActivity.duration ? `(${day.mainActivity.duration})` : ''}</h3>
            <p><strong>${day.mainActivity.title || ''}</strong></p>
            ${day.mainActivity.description ? `<p>${day.mainActivity.description}</p>` : ''}
            ${day.mainActivity.teacherInstructions ? `<div class="instructions"><strong>تعليمات المعلمة:</strong><br/>${day.mainActivity.teacherInstructions}</div>` : ''}
            ${day.mainActivity.materials && Array.isArray(day.mainActivity.materials) ? `<p class="materials"><strong>المواد:</strong> ${day.mainActivity.materials.join('، ')}</p>` : ''}
            ${day.mainActivity.differentiation ? `<p class="diff"><strong>التمايز:</strong> ${day.mainActivity.differentiation}</p>` : ''}
          </div>` : ''}
        ${day.storyRecommendation ? `
          <div class="section">
            <h3>📖 القصة المقترحة</h3>
            <p><strong>${day.storyRecommendation.title || ''}</strong>${day.storyRecommendation.author ? ` - ${day.storyRecommendation.author}` : ''}</p>
            ${day.storyRecommendation.summary ? `<p>${day.storyRecommendation.summary}</p>` : ''}
          </div>` : ''}
        ${day.discussionQuestions && Array.isArray(day.discussionQuestions) ? `
          <div class="section">
            <h3>💬 أسئلة النقاش</h3>
            <ul>${day.discussionQuestions.map((q: string) => `<li>${q}</li>`).join('')}</ul>
          </div>` : ''}
        ${day.islamicValue ? `
          <div class="section islamic">
            <h3>🕌 القيمة الإسلامية: ${day.islamicValue.value || ''}</h3>
            ${day.islamicValue.connection ? `<p>${day.islamicValue.connection}</p>` : ''}
            ${day.islamicValue.hadithOrAyah ? `<p class="hadith">"${day.islamicValue.hadithOrAyah}"</p>` : ''}
          </div>` : ''}
        ${day.assessmentOpportunity ? `
          <div class="section">
            <h3>✅ فرصة التقييم</h3>
            ${day.assessmentOpportunity.what ? `<p><strong>ماذا نقيّم:</strong> ${day.assessmentOpportunity.what}</p>` : ''}
            ${day.assessmentOpportunity.how ? `<p><strong>كيف نقيّم:</strong> ${day.assessmentOpportunity.how}</p>` : ''}
            ${day.assessmentOpportunity.indicators && Array.isArray(day.assessmentOpportunity.indicators) ? `<p><strong>المؤشرات:</strong> ${day.assessmentOpportunity.indicators.join('، ')}</p>` : ''}
          </div>` : ''}
        ${day.totalDuration ? `<p class="duration"><strong>⏱ المدة الإجمالية:</strong> ${day.totalDuration}</p>` : ''}
      </div>`).join('');

    printWindow.document.write(`<!DOCTYPE html><html dir="${isAr ? 'rtl' : 'ltr'}" lang="${language}"><head><meta charset="utf-8"/><title>${result.title || 'Weekly Plan'}</title>
    <style>
      body{font-family:'Segoe UI',Tahoma,sans-serif;padding:30px;line-height:1.7;color:#1a1a1a;font-size:13px}
      h1{color:#1d4ed8;border-bottom:3px solid #1d4ed8;padding-bottom:10px;font-size:22px}
      .overview{background:#f0f9ff;padding:12px;border-radius:8px;margin:12px 0;border-right:4px solid #1d4ed8}
      .objectives{margin:12px 0}
      .objectives li{margin:4px 0}
      .day-section{margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;page-break-inside:avoid}
      .day-title{color:#0369a1;font-size:18px;border-bottom:2px solid #0ea5e9;padding-bottom:6px;margin-bottom:12px}
      .section{margin:10px 0;padding:10px;background:#fafafa;border-radius:6px;border:1px solid #f0f0f0}
      .section h3{font-size:13px;color:#374151;margin:0 0 6px}
      .instructions{background:#fffbeb;padding:8px;border-radius:4px;margin-top:6px;border:1px solid #fde68a;font-size:12px}
      .materials{color:#0369a1;font-size:12px;margin-top:6px}
      .diff{color:#92400e;font-size:12px;font-style:italic}
      .islamic{background:#ecfdf5;border:1px solid #a7f3d0}
      .hadith{font-style:italic;color:#065f46;background:#d1fae5;padding:6px;border-radius:4px;margin-top:6px}
      .objective{background:#fef3c7;padding:8px;border-radius:6px;margin-bottom:10px;border-right:3px solid #f59e0b}
      .duration{color:#6b7280;font-size:12px;margin-top:8px;text-align:left}
      .footer{margin-top:30px;padding-top:12px;border-top:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center}
      .weekly-materials{background:#f0fdf4;padding:12px;border-radius:8px;margin:16px 0;border:1px solid #bbf7d0}
      @media print{.day-section{page-break-inside:avoid}}
    </style></head><body>
    <h1>${result.title || 'الخطة الأسبوعية'}</h1>
    ${result.overview ? `<div class="overview">${result.overview}</div>` : ''}
    ${result.learningObjectives && Array.isArray(result.learningObjectives) ? `<div class="objectives"><strong>أهداف الأسبوع:</strong><ul>${result.learningObjectives.map((o: string) => `<li>${o}</li>`).join('')}</ul></div>` : ''}
    ${daysHtml}
    ${result.weeklyMaterials && Array.isArray(result.weeklyMaterials) ? `<div class="weekly-materials"><strong>📦 جميع المواد المطلوبة للأسبوع:</strong><br/>${result.weeklyMaterials.join('، ')}</div>` : ''}
    ${result.parentInvolvement ? `<div class="section"><h3>👨‍👩‍👧 إشراك الأهل:</h3><p>${result.parentInvolvement}</p></div>` : ''}
    ${result.weeklyAssessment ? `<div class="section"><h3>📊 تقييم نهاية الأسبوع:</h3><p>${result.weeklyAssessment}</p></div>` : ''}
    <div class="footer"><p>Learning Tree Kids Center | ${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}</p></div>
    </body></html>`);
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
      {/* Header */}
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
          <p className="text-sm text-muted-foreground">Weekly Planner - EYFS</p>
        </div>
      </div>

      {/* Input Form */}
      {!result && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle className="text-base">إنشاء خطة أسبوعية جاهزة للتطبيق</CardTitle></CardHeader>
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
                <Input placeholder="مثال: الفصول الأربعة، الحيوانات، الألوان، جسمي" value={theme} onChange={(e) => setTheme(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>أهداف التعلم (سطر لكل هدف - اختياري)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="تطوير المهارات الحركية الدقيقة&#10;تعزيز التعاون بين الأطفال&#10;التعرف على الأشكال الهندسية"
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
              <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
                {generateMutation.isPending ? (<><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري إنشاء الخطة التفصيلية... (قد يستغرق 30 ثانية)</>) : (<><Sparkles className="h-5 w-5 ml-2" />إنشاء خطة أسبوعية كاملة</>)}
              </Button>
              {generateMutation.isPending && (
                <p className="text-xs text-center text-muted-foreground">يتم إنشاء خطة تفصيلية لـ 5 أيام مع جميع التفاصيل اللازمة للتدريس المباشر</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Plan Header */}
          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{result.title}</h2>
                  {result.overview && <p className="text-sm text-gray-600 mt-2 max-w-2xl">{result.overview}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {result.eyfsAreas && Array.isArray(result.eyfsAreas) && result.eyfsAreas.map((area: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{area}</Badge>
                    ))}
                  </div>
                  {result.learningObjectives && Array.isArray(result.learningObjectives) && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">أهداف الأسبوع:</p>
                      <ul className="space-y-1">
                        {result.learningObjectives.map((obj: string, i: number) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}><Copy className="h-4 w-4 ml-1" />نسخ</Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 ml-1" />PDF</Button>
                  <Button variant="outline" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}><Save className="h-4 w-4 ml-1" />حفظ</Button>
                  <Button variant="ghost" size="sm" onClick={() => setResult(null)}>خطة جديدة</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Days - Tabbed View */}
          {result.days && Array.isArray(result.days) && result.days.length > 0 && (
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {result.days.map((day: any, i: number) => (
                  <TabsTrigger key={i} value={String(i)} className="min-w-[80px]">
                    {day.day || `يوم ${i + 1}`}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="all">عرض الكل</TabsTrigger>
              </TabsList>
              {result.days.map((day: any, i: number) => (
                <TabsContent key={i} value={String(i)}>
                  <DayCard day={day} index={i} />
                </TabsContent>
              ))}
              <TabsContent value="all">
                <div className="space-y-4">
                  {result.days.map((day: any, i: number) => (
                    <DayCard key={i} day={day} index={i} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Weekly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.weeklyMaterials && Array.isArray(result.weeklyMaterials) && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">📦 المواد المطلوبة للأسبوع</p>
                  <div className="flex flex-wrap gap-1">
                    {result.weeklyMaterials.map((m: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {result.parentInvolvement && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">👨‍👩‍👧 إشراك الأهل</p>
                  <p className="text-xs text-gray-700">{result.parentInvolvement}</p>
                </CardContent>
              </Card>
            )}
            {result.weeklyAssessment && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">📊 تقييم نهاية الأسبوع</p>
                  <p className="text-xs text-gray-700">{result.weeklyAssessment}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
