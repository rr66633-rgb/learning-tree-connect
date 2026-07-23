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
import { useTranslation } from "react-i18next";

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
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const colors = DAY_COLORS[day.day] || { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-800", badge: "bg-gray-100 text-gray-700" };

  return (
    <div className={`rounded-xl ${colors.bg} ${colors.border} border p-5 space-y-4`}>
      {/* Day Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${colors.text}`}>{day.day || (isAr ? `اليوم ${index + 1}` : `Today${index + 1}`)}</h3>
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
            <span className="text-xs font-semibold text-gray-500">{isAr ? "الهدف التعليمي" : "Learning Objective"}</span>
          </div>
          <p className="text-sm font-medium text-gray-800">{day.learningObjective}</p>
        </div>
      )}

      {/* Circle Time */}
      {day.circleTime && (
        <div className="p-3 rounded-lg bg-white border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500">{isAr ? "حلقة الصباح" : "Morning Circle"}</span>
            {day.circleTime.duration && <Badge variant="outline" className="text-[10px] h-5">{day.circleTime.duration}</Badge>}
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">{day.circleTime.activity}</p>
          {day.circleTime.description && <p className="text-xs text-gray-600 mb-2">{day.circleTime.description}</p>}
          {day.circleTime.teacherInstructions && (
            <div className="mt-2 p-2 rounded bg-indigo-50 border border-indigo-100">
              <p className="text-[11px] font-semibold text-indigo-700 mb-1">{isAr ? "📋 تعليمات المعلمة:" : "📋 Teacher Instructions:"}</p>
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
            <span className="text-xs font-semibold text-gray-500">{isAr ? "النشاط الرئيسي" : "Main Activity"}</span>
            {day.mainActivity.duration && <Badge variant="outline" className="text-[10px] h-5">{day.mainActivity.duration}</Badge>}
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">{day.mainActivity.title}</p>
          {day.mainActivity.description && <p className="text-xs text-gray-600 mb-2">{day.mainActivity.description}</p>}
          {day.mainActivity.teacherInstructions && (
            <div className="mt-2 p-2 rounded bg-orange-50 border border-orange-100">
              <p className="text-[11px] font-semibold text-orange-700 mb-1">{isAr ? "📋 تعليمات المعلمة:" : "📋 Teacher Instructions:"}</p>
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
              <p className="text-[11px] font-semibold text-yellow-700 mb-1">{isAr ? "🔄 التمايز:" : "🔄 Differentiation:"}</p>
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
            <span className="text-xs font-semibold text-gray-500">{isAr ? "القصة المقترحة" : "Suggested Story"}</span>
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
            <span className="text-xs font-semibold text-gray-500">{isAr ? "أسئلة النقاش" : "Discussion Questions"}</span>
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
            <span className="text-xs font-semibold text-emerald-700">{isAr ? "القيمة الإسلامية" : "Islamic Value"}</span>
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
            <span className="text-xs font-semibold text-gray-500">{isAr ? "فرصة التقييم" : "Evaluation Opportunity"}</span>
          </div>
          {day.assessmentOpportunity.what && <p className="text-xs text-gray-700"><strong>{isAr ? "ماذا نقيّم:" : "What we evaluate:"}</strong> {day.assessmentOpportunity.what}</p>}
          {day.assessmentOpportunity.how && <p className="text-xs text-gray-700 mt-1"><strong>{isAr ? "كيف نقيّم:" : "How we evaluate:"}</strong> {day.assessmentOpportunity.how}</p>}
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
          <p className="text-xs font-semibold text-gray-500 mb-2">{isAr ? "📦 المواد المطلوبة لهذا اليوم" : "📦 Materials needed for this day"}</p>
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
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [ageGroup, setAgeGroup] = useState("");
  const [theme, setTheme] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [language, setLanguage] = useState<"ar" | "en" | "bilingual">("bilingual");
  const [result, setResult] = useState<any>(null);
  const [contentId, setContentId] = useState<number | null>(null);

  const generateMutation = trpc.ai.generateWeeklyPlan.useMutation({
    onSuccess: (data: any) => {
      // Validate completeness: must have exactly 5 days with required fields
      const requiredDays = 5;
      const requiredFields = ['learningObjective', 'circleTime', 'mainActivity'];
      
      if (!data.days || !Array.isArray(data.days) || data.days.length < requiredDays) {
        const missingCount = requiredDays - (data.days?.length || 0);
        toast.error(isAr ? `الخطة غير مكتملة (${data.days?.length || 0} أيام من ${requiredDays}). يرجى إعادة التوليد.` : `Plan Incomplete (${data.days?.length || 0}Days from${requiredDays}). يرجى إعادة التوليد.`);
        return;
      }
      
      // Check each day has required fields
      const incompleteDays: string[] = [];
      for (const day of data.days) {
        const missing = requiredFields.filter(f => !day[f]);
        if (missing.length > 0) {
          incompleteDays.push(day.day || (isAr ? "يوم غير محدد" : "Undesignated Day"));
        }
      }
      
      if (incompleteDays.length > 0) {
        toast.warning(isAr ? `بعض الأيام غير مكتملة: ${incompleteDays.join('، ')}. يمكنك إعادة التوليد للحصول على خطة أفضل.` : `Some days are incomplete:${incompleteDays.join('، ')}. يمكنك إعادة التوليد للحصول على خطة أفضل.`);
      }
      
      setResult(data);
      setContentId(data.id ? Number(data.id) : null);
      toast.success(isAr ? `تم إنشاء الخطة الأسبوعية بنجاح (${data.days.length} أيام)` : `Weekly plan created successfully (${data.days.length}Days)`);
    },
    onError: (err) => {
      const msg = err.message || (isAr ? "حدث خطأ" : "An error occurred");
      // Show user-friendly error - never show raw JSON/technical errors
      if (msg.includes("JSON") || msg.includes("parse") || msg.includes("Unterminated") || msg.includes("Unexpected")) {
        toast.error(isAr ? "حدث خطأ أثناء إنشاء الخطة. يرجى المحاولة مرة أخرى." : "Error creating plan. Please try again.");
      } else {
        toast.error(msg);
      }
    },
  });

  const saveMutation = trpc.ai.saveToLibrary.useMutation({
    onSuccess: () => toast.success(isAr ? "تم الحفظ في المكتبة" : "Saved to library"),
    onError: (err) => toast.error(err.message || (isAr ? "فشل الحفظ" : "Save Failed")),
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
    const dir = isAr ? 'rtl' : 'ltr';
    const days = result.days && Array.isArray(result.days) ? result.days : [];
    const today = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const dayColors = ['#1d4ed8', '#059669', '#7c3aed', '#d97706', '#e11d48'];

    const daysHtml = days.map((day: any, idx: number) => {
      const color = dayColors[idx % dayColors.length];
      return `
      <div class="day-section" style="border-color:${color}20;">
        <div class="day-header" style="background:${color};">
          <h2>${day.day || ''}</h2>
          ${day.totalDuration ? `<span class="day-duration">${day.totalDuration}</span>` : ''}
        </div>
        <div class="day-body">
          ${day.learningObjective ? `
            <div class="field objective-field">
              <div class="field-icon">🎯</div>
              <div class="field-content">
                <div class="field-label">{isAr ? "الهدف التعليمي" : "Learning Objective"}</div>
                <div class="field-value">${day.learningObjective}</div>
              </div>
            </div>` : ''}

          ${day.circleTime ? `
            <div class="field">
              <div class="field-icon">👥</div>
              <div class="field-content">
                <div class="field-label">حلقة الصباح ${day.circleTime.duration ? `<span class="badge">${day.circleTime.duration}</span>` : ''}</div>
                <div class="field-value"><strong>${day.circleTime.activity || ''}</strong></div>
                ${day.circleTime.description ? `<div class="field-desc">${day.circleTime.description}</div>` : ''}
                ${day.circleTime.teacherInstructions ? `<div class="teacher-note"><span class="note-label">{isAr ? "تعليمات المعلمة:" : "Teacher Instructions:"}</span> ${day.circleTime.teacherInstructions}</div>` : ''}
              </div>
            </div>` : ''}

          ${day.mainActivity ? `
            <div class="field main-activity-field">
              <div class="field-icon">⭐</div>
              <div class="field-content">
                <div class="field-label">النشاط الرئيسي ${day.mainActivity.duration ? `<span class="badge">${day.mainActivity.duration}</span>` : ''}</div>
                <div class="field-value"><strong>${day.mainActivity.title || ''}</strong></div>
                ${day.mainActivity.description ? `<div class="field-desc">${day.mainActivity.description}</div>` : ''}
                ${day.mainActivity.teacherInstructions ? `<div class="teacher-note"><span class="note-label">{isAr ? "تعليمات المعلمة:" : "Teacher Instructions:"}</span> ${day.mainActivity.teacherInstructions}</div>` : ''}
                ${day.mainActivity.materials && Array.isArray(day.mainActivity.materials) && day.mainActivity.materials.length > 0 ? `<div class="materials-list"><span class="note-label">المواد:</span> ${day.mainActivity.materials.join(' • ')}</div>` : ''}
                ${day.mainActivity.differentiation ? `<div class="differentiation"><span class="note-label">{isAr ? "التمايز:" : "Differentiation:"}</span> ${day.mainActivity.differentiation}</div>` : ''}
              </div>
            </div>` : ''}

          ${day.storyRecommendation ? `
            <div class="field">
              <div class="field-icon">📖</div>
              <div class="field-content">
                <div class="field-label">{isAr ? "القصة المقترحة" : "Suggested Story"}</div>
                <div class="field-value"><strong>${day.storyRecommendation.title || ''}</strong>${day.storyRecommendation.author ? ` <span class="author">— ${day.storyRecommendation.author}</span>` : ''}</div>
                ${day.storyRecommendation.summary ? `<div class="field-desc">${day.storyRecommendation.summary}</div>` : ''}
                ${day.storyRecommendation.connection ? `<div class="connection">الربط بالموضوع: ${day.storyRecommendation.connection}</div>` : ''}
              </div>
            </div>` : ''}

          ${day.discussionQuestions && Array.isArray(day.discussionQuestions) && day.discussionQuestions.length > 0 ? `
            <div class="field">
              <div class="field-icon">💬</div>
              <div class="field-content">
                <div class="field-label">{isAr ? "أسئلة النقاش" : "Discussion Questions"}</div>
                <ol class="questions-list">${day.discussionQuestions.map((q: string) => `<li>${q}</li>`).join('')}</ol>
              </div>
            </div>` : ''}

          ${day.islamicValue ? `
            <div class="field islamic-field">
              <div class="field-icon">🕌</div>
              <div class="field-content">
                <div class="field-label">{isAr ? "القيمة الإسلامية" : "Islamic Value"}</div>
                <div class="field-value"><strong>${day.islamicValue.value || ''}</strong></div>
                ${day.islamicValue.connection ? `<div class="field-desc">${day.islamicValue.connection}</div>` : ''}
                ${day.islamicValue.hadithOrAyah ? `<div class="hadith">"${day.islamicValue.hadithOrAyah}"</div>` : ''}
              </div>
            </div>` : ''}

          ${day.assessmentOpportunity ? `
            <div class="field assessment-field">
              <div class="field-icon">✅</div>
              <div class="field-content">
                <div class="field-label">{isAr ? "فرصة التقييم" : "Evaluation Opportunity"}</div>
                ${day.assessmentOpportunity.what ? `<div class="field-desc"><strong>{isAr ? "ماذا نقيّم:" : "What we evaluate:"}</strong> ${day.assessmentOpportunity.what}</div>` : ''}
                ${day.assessmentOpportunity.how ? `<div class="field-desc"><strong>{isAr ? "كيف نقيّم:" : "How we evaluate:"}</strong> ${day.assessmentOpportunity.how}</div>` : ''}
                ${day.assessmentOpportunity.indicators && Array.isArray(day.assessmentOpportunity.indicators) ? `<div class="indicators">${day.assessmentOpportunity.indicators.map((ind: string) => `<span class="indicator-badge">${ind}</span>`).join('')}</div>` : ''}
              </div>
            </div>` : ''}

          ${day.materials && Array.isArray(day.materials) && day.materials.length > 0 ? `
            <div class="field">
              <div class="field-icon">📦</div>
              <div class="field-content">
                <div class="field-label">{isAr ? "المواد المطلوبة لهذا اليوم" : "Materials needed for this day"}</div>
                <div class="materials-list">${day.materials.join(' • ')}</div>
              </div>
            </div>` : ''}
        </div>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8"/>
  <title>${result.title || (isAr ? "الخطة الأسبوعية" : "Weekly Plan")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Arial', 'Tahoma', sans-serif;
      padding: 0;
      line-height: 1.7;
      color: #1f2937;
      font-size: 12px;
      background: #fff;
    }
    .cover {
      background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%);
      color: white;
      padding: 40px 50px;
      margin-bottom: 30px;
    }
    .cover h1 {
      font-size: 26px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .cover .subtitle {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 16px;
    }
    .cover .meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      font-size: 12px;
      opacity: 0.85;
    }
    .cover .meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .content {
      padding: 0 40px 40px;
    }
    .overview-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-${isAr ? 'right' : 'left'}: 5px solid #0284c7;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .overview-box p {
      font-size: 13px;
      color: #0c4a6e;
    }
    .objectives-section {
      margin-bottom: 24px;
    }
    .objectives-section h3 {
      font-size: 14px;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .objectives-section ul {
      list-style: none;
      padding: 0;
    }
    .objectives-section li {
      padding: 4px 0;
      padding-${isAr ? 'right' : 'left'}: 20px;
      position: relative;
      font-size: 12px;
    }
    .objectives-section li::before {
      content: '✓';
      position: absolute;
      ${isAr ? 'right' : 'left'}: 0;
      color: #059669;
      font-weight: bold;
    }
    .day-section {
      margin: 24px 0;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .day-header {
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .day-header h2 {
      font-size: 16px;
      font-weight: 700;
    }
    .day-duration {
      background: rgba(255,255,255,0.25);
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
    }
    .day-body {
      padding: 16px 20px;
    }
    .field {
      display: flex;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .field:last-child {
      border-bottom: none;
    }
    .field-icon {
      font-size: 18px;
      width: 28px;
      text-align: center;
      flex-shrink: 0;
      padding-top: 2px;
    }
    .field-content {
      flex: 1;
    }
    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }
    .field-value {
      font-size: 13px;
      color: #1f2937;
    }
    .field-desc {
      font-size: 12px;
      color: #4b5563;
      margin-top: 4px;
    }
    .badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
      margin-${isAr ? 'right' : 'left'}: 6px;
    }
    .teacher-note {
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 8px;
      font-size: 11px;
      color: #92400e;
    }
    .note-label {
      font-weight: 600;
      color: #78350f;
    }
    .materials-list {
      font-size: 11px;
      color: #0369a1;
      margin-top: 6px;
    }
    .differentiation {
      font-size: 11px;
      color: #92400e;
      font-style: italic;
      margin-top: 4px;
    }
    .author {
      font-size: 11px;
      color: #6b7280;
    }
    .connection {
      font-size: 11px;
      color: #0d9488;
      font-style: italic;
      margin-top: 4px;
    }
    .questions-list {
      padding-${isAr ? 'right' : 'left'}: 18px;
      margin-top: 4px;
    }
    .questions-list li {
      font-size: 12px;
      margin: 3px 0;
      color: #374151;
    }
    .objective-field {
      background: #fefce8;
      border-radius: 8px;
      padding: 12px !important;
      border: 1px solid #fef08a !important;
      border-bottom: 1px solid #fef08a !important;
    }
    .islamic-field {
      background: #ecfdf5;
      border-radius: 8px;
      padding: 12px !important;
      border: 1px solid #a7f3d0 !important;
      border-bottom: 1px solid #a7f3d0 !important;
    }
    .hadith {
      font-style: italic;
      color: #065f46;
      background: #d1fae5;
      padding: 6px 10px;
      border-radius: 4px;
      margin-top: 6px;
      font-size: 12px;
    }
    .assessment-field {
      background: #f0fdf4;
      border-radius: 8px;
      padding: 12px !important;
      border: 1px solid #bbf7d0 !important;
      border-bottom: 1px solid #bbf7d0 !important;
    }
    .indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .indicator-badge {
      background: #dcfce7;
      color: #166534;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      border: 1px solid #bbf7d0;
    }
    .main-activity-field {
      background: #fff7ed;
      border-radius: 8px;
      padding: 12px !important;
      border: 1px solid #fed7aa !important;
      border-bottom: 1px solid #fed7aa !important;
    }
    .summary-section {
      margin-top: 30px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .summary-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }
    .summary-card h4 {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .summary-card p, .summary-card ul {
      font-size: 12px;
      color: #374151;
    }
    .summary-card ul {
      list-style: disc;
      padding-${isAr ? 'right' : 'left'}: 16px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
    }
    .footer .logo-text {
      font-size: 14px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 4px;
    }
    @media print {
      body { padding: 0; }
      .cover { margin-bottom: 20px; }
      .day-section { page-break-inside: avoid; }
      .content { padding: 0 30px 30px; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${result.title || (isAr ? "الخطة الأسبوعية" : "Weekly Plan")}</h1>
    <p class="subtitle">${result.overview || 'خطة تعليمية أسبوعية شاملة وفق منهج EYFS'}</p>
    <div class="meta">
      <span>📅 ${today}</span>
      <span>👶 الفئة العمرية: ${ageGroup} سنوات</span>
      <span>📚 الموضوع: ${theme}</span>
      <span>📄 ${days.length} أيام</span>
    </div>
  </div>
  <div class="content">
    ${result.overview ? `<div class="overview-box"><p>${result.overview}</p></div>` : ''}
    ${result.learningObjectives && Array.isArray(result.learningObjectives) && result.learningObjectives.length > 0 ? `
      <div class="objectives-section">
        <h3>{isAr ? "أهداف الأسبوع" : "Weekly Goals"}</h3>
        <ul>${result.learningObjectives.map((o: string) => `<li>${o}</li>`).join('')}</ul>
      </div>` : ''}
    ${result.eyfsAreas && Array.isArray(result.eyfsAreas) && result.eyfsAreas.length > 0 ? `
      <div style="margin-bottom:20px;">
        <span style="font-size:11px;color:#6b7280;font-weight:600;">{isAr ? "مجالات EYFS المغطاة:" : "EYFS Areas Covered:"}</span>
        ${result.eyfsAreas.map((a: string) => `<span class="indicator-badge" style="background:#dbeafe;color:#1e40af;border-color:#bfdbfe;">${a}</span>`).join(' ')}
      </div>` : ''}
    ${daysHtml}
    <div class="summary-section">
      ${result.weeklyMaterials && Array.isArray(result.weeklyMaterials) && result.weeklyMaterials.length > 0 ? `
        <div class="summary-card">
          <h4>{isAr ? "📦 جميع المواد المطلوبة للأسبوع" : "📦 All materials needed for the week"}</h4>
          <ul>${result.weeklyMaterials.map((m: string) => `<li>${m}</li>`).join('')}</ul>
        </div>` : ''}
      ${result.parentInvolvement ? `
        <div class="summary-card">
          <h4>{isAr ? "👨‍👩‍👧 إشراك الأهل" : "👨‍👩‍👧 Parent Engagement"}</h4>
          <p>${result.parentInvolvement}</p>
        </div>` : ''}
      ${result.weeklyAssessment ? `
        <div class="summary-card">
          <h4>{isAr ? "📊 تقييم نهاية الأسبوع" : "📊 End of Week Assessment"}</h4>
          <p>${result.weeklyAssessment}</p>
        </div>` : ''}
    </div>
    <div class="footer">
      <p class="logo-text">Nashaa</p>
      <p>خطة أسبوعية تفصيلية — تم إنشاؤها بواسطة المساعد الذكي | ${today}</p>
      <p>{isAr ? "هذه الخطة مُعدّة للاستخدام المباشر في الفصل الدراسي" : "This plan is ready for direct use in the classroom"}</p>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
  };

  const handleGenerate = () => {
    if (!ageGroup || !theme.trim()) {
      toast.error(isAr ? "يرجى اختيار الفئة العمرية وإدخال الموضوع" : "Please select age group and enter topic");
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
    toast.success(isAr ? "تم النسخ" : "Copied");
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
          <h1 className="text-xl font-bold text-gray-900">{isAr ? "الخطة الأسبوعية" : "Weekly Plan"}</h1>
          <p className="text-sm text-muted-foreground">Weekly Planner - EYFS</p>
        </div>
      </div>

      {/* Input Form */}
      {!result && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle className="text-base">{isAr ? "إنشاء خطة أسبوعية جاهزة للتطبيق" : "Create Ready-to-Use Weekly Plan"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? "الفئة العمرية" : "Age Group"}</Label>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger><SelectValue placeholder={isAr ? "اختر الفئة العمرية" : "Select Age Group"} /></SelectTrigger>
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
                <Label>{isAr ? "الموضوع / الثيم" : "Topic / Theme"}</Label>
                <Input placeholder={isAr ? "مثال: الفصول الأربعة، الحيوانات، الألوان، جسمي" : "Example: Four seasons, animals, colors, my body"} value={theme} onChange={(e) => setTheme(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "أهداف التعلم (سطر لكل هدف - اختياري)" : "Learning Objectives (one per line - optional)"}</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="تطوير المهارات الحركية الدقيقة&#10;تعزيز التعاون بين الأطفال&#10;التعرف على الأشكال الهندسية"
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "اللغة" : "Language"}</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en" | "bilingual")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bilingual">{isAr ? "ثنائي اللغة (عربي + إنجليزي)" : "Bilingual (Arabic + English)"}</SelectItem>
                    <SelectItem value="ar">{isAr ? "العربية فقط" : "Arabic Only"}</SelectItem>
                    <SelectItem value="en">{isAr ? "الإنجليزية فقط" : "English Only"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
                {generateMutation.isPending ? (<><Loader2 className="h-5 w-5 animate-spin ml-2" />{isAr ? "جاري إنشاء الخطة التفصيلية... (قد يستغرق 30 ثانية)" : "Generating Detailed Plan... (May take 30 seconds)"}</>) : (<><Sparkles className="h-5 w-5 ml-2" />{isAr ? "إنشاء خطة أسبوعية كاملة" : "Create Complete Weekly Plan"}</>)}
              </Button>
              {generateMutation.isPending && (
                <p className="text-xs text-center text-muted-foreground">{isAr ? "يتم إنشاء خطة تفصيلية لـ 5 أيام مع جميع التفاصيل اللازمة للتدريس المباشر" : "A detailed 5-day plan is created with all necessary details for direct teaching"}</p>
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
                      <p className="text-xs font-semibold text-gray-500 mb-1">{isAr ? "أهداف الأسبوع:" : "Weekly Goals:"}</p>
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
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}><Copy className="h-4 w-4 ml-1" />{isAr ? "نسخ" : "Copy"}</Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 ml-1" />PDF</Button>
                  <Button variant="outline" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}><Save className="h-4 w-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>
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
                    {day.day || (isAr ? `يوم ${i + 1}` : `Day${i + 1}`)}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="all">{isAr ? "عرض الكل" : "View All"}</TabsTrigger>
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
                  <p className="text-xs font-semibold text-gray-500 mb-2">{isAr ? "📦 المواد المطلوبة للأسبوع" : "📦 Materials needed for the week"}</p>
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
                  <p className="text-xs font-semibold text-gray-500 mb-2">{isAr ? "👨‍👩‍👧 إشراك الأهل" : "👨‍👩‍👧 Parent Engagement"}</p>
                  <p className="text-xs text-gray-700">{result.parentInvolvement}</p>
                </CardContent>
              </Card>
            )}
            {result.weeklyAssessment && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{isAr ? "📊 تقييم نهاية الأسبوع" : "📊 End of Week Assessment"}</p>
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
