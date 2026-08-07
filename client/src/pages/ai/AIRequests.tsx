import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Streamdown } from "streamdown";

const TYPE_OPTIONS = [
  "observation",
  "weekly_plan",
  "activity",
  "progress_report",
  "parent_message",
  "newsletter",
  "story",
  "marketing",
] as const;

const TYPE_STYLES: Record<string, string> = {
  observation: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  weekly_plan: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  activity: "border-[#FFB020]/30 bg-[#FFB020]/12 text-[#9A6300]",
  progress_report: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  parent_message: "border-[#FF5CA8]/25 bg-[#FF5CA8]/10 text-[#C92C73]",
  newsletter: "border-[#FFB020]/30 bg-[#FFB020]/12 text-[#9A6300]",
  story: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  marketing: "border-[#FF5CA8]/25 bg-[#FF5CA8]/10 text-[#C92C73]",
};

function humanizeKey(key: string, isAr: boolean) {
  const ar: Record<string, string> = {
    prompt: "الطلب",
    language: "اللغة",
    childId: "الطفل",
    classId: "الفصل",
    ageGroup: "الفئة العمرية",
    theme: "الموضوع",
    childName: "اسم الطفل",
    termPeriod: "الفترة الدراسية",
    academicYear: "العام الدراسي",
    reportType: "نوع التقرير",
    sourceObservations: "عدد الملاحظات المعتمدة",
    shortNote: "الملاحظة المختصرة",
    learningGoals: "أهداف إضافية",
    tone: "نبرة الرسالة",
    month: "الشهر",
    highlights: "أبرز الأحداث",
    period: "الفترة",
    assessmentType: "نوع التقييم",
    certificateType: "نوع الشهادة",
    title: "العنوان",
    titleAr: "العنوان بالعربية",
    titleEn: "العنوان بالإنجليزية",
    analysis: "التحليل التربوي",
    observation: "الملاحظة",
    nextSteps: "الخطوات التالية",
    next_steps: "الخطوات التالية",
    eyfsArea: "مجال EYFS",
    eyfsAreas: "مجالات EYFS",
    developmentLevel: "مستوى التطور",
    summary: "الملخص",
    overview: "نظرة عامة",
    strengths: "نقاط القوة",
    areasForDevelopment: "مجالات التطوير",
    teacherRecommendations: "توصيات للمعلمة",
    familyRecommendations: "توصيات للأسرة",
    recommendations: "التوصيات",
    learningObjectives: "أهداف التعلم",
    learning_objectives: "أهداف التعلم",
    weeklyMaterials: "مواد الأسبوع",
    parentInvolvement: "مشاركة الأسرة",
    weeklyAssessment: "التقييم الأسبوعي",
    theme_overview: "نظرة عامة على الموضوع",
    arabic_activities: "أنشطة اللغة العربية",
    english_activities: "أنشطة اللغة الإنجليزية",
    math_activities: "أنشطة الرياضيات",
    science_activities: "أنشطة العلوم والاستكشاف",
    art_activities: "الأنشطة الفنية والإبداعية",
    sensory_activities: "الأنشطة الحسية",
    physical_activities: "الأنشطة البدنية والحركية",
    quran_islamic: "القرآن والقيم الإسلامية",
    story_of_week: "قصة الأسبوع",
    song_of_week: "نشيد الأسبوع",
    home_activity: "النشاط المنزلي",
    parent_notes: "إرشادات الأسرة",
    days: "أيام الخطة",
    day: "اليوم",
    description: "الوصف",
    materials: "المواد",
    duration: "المدة",
    steps: "الخطوات",
    instructions: "خطوات التنفيذ",
    preparation: "التحضير",
    extensionIdeas: "أفكار للتوسّع",
    simplificationIdeas: "أفكار للتبسيط",
    assessmentMethod: "طريقة التقييم",
    vocabularyWords: "المفردات المستهدفة",
    safetyNotes: "ملاحظات السلامة",
    word: "الكلمة",
    meaning: "المعنى",
    moral: "القيمة المستفادة",
    story: "نص القصة",
    followUpActivities: "أنشطة المتابعة",
    ageAppropriate: "العمر المناسب",
    content: "المحتوى",
    body: "النص",
    messageAr: "نص الرسالة بالعربية",
    messageEn: "نص الرسالة بالإنجليزية",
    closingAr: "الخاتمة بالعربية",
    closingEn: "الخاتمة بالإنجليزية",
    greeting: "التحية",
    introduction: "المقدمة",
    sections: "أقسام المحتوى",
    upcomingEvents: "الفعاليات القادمة",
    parentTips: "نصائح للأسرة",
    closing: "الخاتمة",
    callToAction: "الدعوة للتفاعل",
    notes: "ملاحظات",
    attendance: "الحضور",
    percentage: "النسبة",
    nextLearningSteps: "خطوات التعلم التالية",
    socialEmotional: "النمو الاجتماعي والعاطفي",
    physicalDevelopment: "النمو الجسدي والحركي",
    communicationLanguage: "التواصل واللغة",
    parentRecommendations: "توصيات للأسرة",
    teacherComment: "تعليق المعلمة",
    overallReadiness: "الجاهزية العامة",
    languageReadiness: "الجاهزية اللغوية",
    socialReadiness: "الجاهزية الاجتماعية",
    emotionalReadiness: "الجاهزية العاطفية",
    cognitiveReadiness: "الجاهزية المعرفية",
    physicalReadiness: "الجاهزية الجسدية",
    parentAnnouncement: "إعلان أولياء الأمور",
    pushNotification: "الإشعار الفوري",
    whatsappMessage: "رسالة واتساب",
    smsMessage: "الرسالة النصية",
    instagramCaption: "محتوى إنستغرام",
    tiktokCaption: "محتوى تيك توك",
    snapchatCaption: "محتوى سناب شات",
    websiteArticle: "مقال الموقع",
    eventReport: "تقرير الفعالية",
    parentSummary: "ملخص أولياء الأمور",
    achievementSummary: "ملخص الإنجازات",
    socialPost: "منشور التواصل الاجتماعي",
    thankYouMessage: "رسالة الشكر",
    caption: "النص المنشور",
    hashtags: "الوسوم",
    circleTime: "وقت الحلقة",
    mainActivity: "النشاط الرئيس",
    learningObjective: "هدف التعلم",
    teacherInstructions: "إرشادات المعلمة",
    differentiation: "مراعاة الفروق الفردية",
    storyRecommendation: "القصة المقترحة",
    discussionQuestions: "أسئلة النقاش",
    author: "المؤلف",
    connection: "الارتباط بالموضوع",
    hadithOrAyah: "الحديث أو الآية",
    islamicValue: "القيمة الإسلامية",
    assessmentOpportunity: "فرصة التقييم",
    indicators: "المؤشرات",
    what: "ما الذي يُقيّم",
    how: "طريقة التقييم",
    totalDuration: "المدة الإجمالية",
    motivationalQuote: "العبارة التحفيزية",
    weekStartDate: "بداية الأسبوع",
    weekEndDate: "نهاية الأسبوع",
    subType: "نوع المحتوى",
  };
  if (isAr && ar[key]) return ar[key];
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, char => char.toUpperCase());
}

function firstResultText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstResultText(item);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = firstResultText(nested);
      if (found) return found;
    }
  }
  return "";
}

function resultDirection(value: unknown): "rtl" | "ltr" {
  const firstStrongCharacter = firstResultText(value).match(/[A-Za-z\u0600-\u06FF]/)?.[0];
  return firstStrongCharacter && /[\u0600-\u06FF]/.test(firstStrongCharacter) ? "rtl" : "ltr";
}

function StructuredContent({ value, depth = 0, isAr, fieldKey }: { value: unknown; depth?: number; isAr: boolean; fieldKey?: string }) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") || trimmed.startsWith("["))) {
      try {
        return <StructuredContent value={JSON.parse(trimmed)} depth={depth} isAr={isAr} fieldKey={fieldKey} />;
      } catch {
        // Historical plain text that merely begins like JSON is still shown.
      }
    }
    const readable = trimmed.replace(/\s+(?=[0-9٠-٩]+[.)]\s+)/g, "\n");
    return (
      <div className="prose prose-slate max-w-none text-[15px] leading-8 prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-headings:font-bold prose-headings:text-slate-900" dir={resultDirection(readable)}>
        <Streamdown>{readable}</Streamdown>
      </div>
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    const readiness = fieldKey ? /readiness/i.test(fieldKey) : false;
    return readiness && typeof value === "number"
      ? <div className="flex items-end gap-1"><span className="text-3xl font-black tabular-nums text-slate-950">{value}</span><span className="pb-1 text-sm font-bold text-slate-400">%</span></div>
      : <p className="text-[15px] leading-7 text-slate-800">{typeof value === "boolean" ? (value ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")) : value}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <div className={`grid gap-2.5 ${value.some(item => typeof item === "object" && item !== null) ? "xl:grid-cols-2" : ""}`}>
        {value.map((item, index) => (
          <div key={index} dir={resultDirection(item)} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-[0_8px_25px_-24px_rgba(15,23,42,0.45)]">
            <span className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-1.5 text-[10px] font-black text-white">{index + 1}</span>
            <div className="min-w-0 flex-1"><StructuredContent value={item} depth={depth + 1} isAr={isAr} /></div>
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key, nested]) =>
      nested !== null && nested !== undefined && nested !== "" && !(depth === 0 && (key === "title" || key === "subType"))
    );
    return (
      <div className={depth === 0 ? "grid items-start gap-4 md:grid-cols-2" : "space-y-3"}>
        {entries.map(([key, nested]) => {
          const longField = Array.isArray(nested)
            || (typeof nested === "object" && nested !== null)
            || (typeof nested === "string" && (nested.length > 110 || /\n/.test(nested)))
            || /analysis|observation|summary|overview|next|description|recommend|content|body|steps|notes|days/i.test(key);
          return (
            <section key={key} className={depth === 0
              ? `self-start overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_35px_-28px_rgba(15,23,42,0.5)] ${longField ? "md:col-span-2" : ""}`
              : "border-s border-slate-200 ps-3"}>
              <div className={depth === 0 ? "flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3" : "mb-1.5"}>
                {depth === 0 && <span className="h-2 w-2 rounded-full bg-[#00C9B7]" />}
                <h4 className="text-xs font-black tracking-wide text-slate-600">{humanizeKey(key, isAr)}</h4>
              </div>
              <div className={depth === 0 ? "p-4 md:p-5" : ""}>
                <StructuredContent value={nested} depth={depth + 1} isAr={isAr} fieldKey={key} />
              </div>
            </section>
          );
        })}
      </div>
    );
  }
  return null;
}

export default function AIRequests() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const pageSize = 25;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(0), [typeFilter, statusFilter, debouncedSearch]);

  const historyQuery = trpc.ai.getRequestHistory.useQuery({
    type: typeFilter === "all" ? undefined : typeFilter as any,
    status: statusFilter === "all" ? undefined : statusFilter as any,
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
  }, {
    staleTime: 30_000,
    refetchInterval: query => query.state.data?.items.some(item => item.status === "pending" || item.status === "processing") ? 8_000 : false,
  });

  const typeLabels: Record<string, string> = {
    observation: isAr ? "ملاحظة تعليمية" : "Observation",
    weekly_plan: isAr ? "خطة أسبوعية" : "Weekly plan",
    activity: isAr ? "نشاط تعليمي" : "Activity",
    progress_report: isAr ? "تقرير أو تقييم" : "Report or assessment",
    parent_message: isAr ? "رسالة لولي الأمر" : "Parent message",
    newsletter: isAr ? "نشرة" : "Newsletter",
    story: isAr ? "قصة" : "Story",
    marketing: isAr ? "محتوى تسويقي" : "Marketing content",
  };

  const rows = historyQuery.data?.items || [];

  const stats = useMemo(() => ({
    total: historyQuery.data?.total || 0,
    visible: rows.length,
    page: page + 1,
  }), [historyQuery.data]);

  const statusBadge = (status: string, progress: number) => {
    if (status === "completed") return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="me-1 h-3 w-3" />{isAr ? "مكتمل" : "Completed"}</Badge>;
    if (status === "failed") return <Badge className="border-red-200 bg-red-50 text-red-700"><AlertCircle className="me-1 h-3 w-3" />{isAr ? "تعذّر" : "Failed"}</Badge>;
    return <Badge className="border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]"><Loader2 className="me-1 h-3 w-3 animate-spin" />{isAr ? `قيد التنفيذ ${progress}%` : `Running ${progress}%`}</Badge>;
  };

  const copyResult = async () => {
    if (!selected?.content) return;
    const copyValue = typeof selected.content === "string"
      ? selected.content
      : JSON.stringify(selected.content, null, 2);
    await navigator.clipboard.writeText(copyValue);
    toast.success(isAr ? "تم نسخ النتيجة" : "Result copied");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8" dir={isAr ? "rtl" : "ltr"}>
      <div className="relative overflow-hidden rounded-3xl bg-[#1A1F36] p-6 text-white md:p-8">
        <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#00C9B7]/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-12 h-48 w-48 rounded-full bg-[#FFB020]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/ai"><Button variant="ghost" size="sm" className="mb-4 -ms-2 text-white/70 hover:bg-white/10 hover:text-white">{isAr ? <ArrowRight className="me-2 h-4 w-4" /> : <ArrowLeft className="me-2 h-4 w-4" />}{isAr ? "العودة للمساعد" : "Back to AI"}</Button></Link>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00C9B7]/15 ring-1 ring-[#00C9B7]/30"><Clock3 className="h-6 w-6 text-[#57E2D6]" /></span>
              <div>
                <h1 className="text-2xl font-black md:text-3xl">{isAr ? "سجل أعمالي الذكية" : "My AI Work"}</h1>
                <p className="mt-1 text-sm text-slate-300">{isAr ? "كل خططك وتقاريرك ومحتواك الذكي محفوظة ومنظمة وقابلة للعودة" : "Every AI plan, report and content result—organized, preserved and easy to revisit"}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [stats.total, isAr ? "كل الأعمال" : "All work"],
              [stats.visible, isAr ? "في هذه الصفحة" : "On this page"],
              [stats.page, isAr ? "رقم الصفحة" : "Page"],
            ].map(([value, label]) => <div key={String(label)} className="min-w-20 rounded-2xl bg-white/8 px-3 py-3 ring-1 ring-white/10"><div className="text-xl font-black">{value}</div><div className="text-[11px] text-slate-300">{label}</div></div>)}
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} className="ps-10" placeholder={isAr ? "ابحث بالعنوان أو تفاصيل الطلب..." : "Search title or request details..."} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "جميع الأنواع" : "All types"}</SelectItem>{TYPE_OPTIONS.map(type => <SelectItem key={type} value={type}>{typeLabels[type]}</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{isAr ? "كل الحالات" : "All statuses"}</SelectItem><SelectItem value="completed">{isAr ? "مكتمل" : "Completed"}</SelectItem><SelectItem value="processing">{isAr ? "قيد التنفيذ" : "Running"}</SelectItem><SelectItem value="pending">{isAr ? "في قائمة الانتظار" : "Queued"}</SelectItem><SelectItem value="failed">{isAr ? "متعذر" : "Failed"}</SelectItem></SelectContent></Select>
        </CardContent>
      </Card>

      {historyQuery.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#00C9B7]" /></div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center py-16 text-center"><Sparkles className="mb-4 h-12 w-12 text-muted-foreground/25" /><h2 className="font-bold">{isAr ? "لا توجد أعمال مطابقة" : "No matching work"}</h2><p className="mt-1 text-sm text-muted-foreground">{isAr ? "ستظهر هنا كل النتائج التي تنشئها تلقائياً" : "Every generated result will appear here automatically"}</p></CardContent></Card>
      ) : (
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/55 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-start font-semibold">{isAr ? "العمل الذكي" : "AI work"}</th><th className="px-4 py-3 text-start font-semibold">{isAr ? "البيانات" : "Details"}</th><th className="px-4 py-3 text-start font-semibold">{isAr ? "الحالة" : "Status"}</th><th className="px-4 py-3 text-start font-semibold">{isAr ? "التاريخ" : "Date"}</th><th className="px-5 py-3 text-end font-semibold">{isAr ? "الإجراءات" : "Actions"}</th></tr></thead>
              <tbody className="divide-y divide-border/70">{rows.map(item => <tr key={item.key} className="transition-colors hover:bg-muted/25"><td className="px-5 py-4"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-primary/8 p-2 text-primary"><FileText className="h-4 w-4" /></span><div><p className="max-w-[280px] font-semibold leading-6">{item.title}</p><Badge variant="outline" className={`mt-1.5 ${TYPE_STYLES[item.type] || ""}`}>{typeLabels[item.type] || item.type}</Badge></div></div></td><td className="px-4 py-4"><div className="max-w-[260px] space-y-1 text-xs text-muted-foreground">{Object.entries(item.requestDetails || {}).filter(([, value]) => value !== null && value !== undefined && value !== "").slice(0, 3).map(([key, value]) => <p key={key} className="truncate"><span className="font-medium text-foreground/70">{humanizeKey(key, isAr)}:</span> {String(value)}</p>)}</div></td><td className="px-4 py-4">{statusBadge(item.status, item.progress)}</td><td className="px-4 py-4 text-xs text-muted-foreground"><div className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</div></td><td className="px-5 py-4"><div className="flex justify-end gap-2">{Boolean(item.content) && <Button size="sm" variant="outline" onClick={() => setSelected(item)}>{isAr ? "عرض النتيجة" : "View result"}</Button>}<Button size="sm" asChild><a href={item.destinationUrl}><ExternalLink className="me-1.5 h-3.5 w-3.5" />{isAr ? "فتح في قسمه" : "Open in section"}</a></Button></div></td></tr>)}</tbody>
            </table>
          </div>

          <div className="divide-y md:hidden">{rows.map(item => <article key={item.key} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className={TYPE_STYLES[item.type] || ""}>{typeLabels[item.type] || item.type}</Badge><h3 className="mt-2 font-bold leading-6">{item.title}</h3></div>{statusBadge(item.status, item.progress)}</div><div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-xs">{Object.entries(item.requestDetails || {}).filter(([, value]) => value !== null && value !== undefined && value !== "").slice(0, 4).map(([key, value]) => <div key={key} className="min-w-0"><p className="text-muted-foreground">{humanizeKey(key, isAr)}</p><p className="truncate font-medium">{String(value)}</p></div>)}</div><div className="flex gap-2">{Boolean(item.content) && <Button className="flex-1" variant="outline" onClick={() => setSelected(item)}>{isAr ? "عرض النتيجة" : "View"}</Button>}<Button className="flex-1" asChild><a href={item.destinationUrl}>{isAr ? "فتح في قسمه" : "Open in section"}<ExternalLink className="ms-1.5 h-3.5 w-3.5" /></a></Button></div></article>)}</div>

          {(page > 0 || historyQuery.data?.hasMore) && (
            <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 md:px-5">
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? `عرض ${page * pageSize + 1}–${page * pageSize + rows.length} من ${historyQuery.data?.total || 0}`
                  : `Showing ${page * pageSize + 1}–${page * pageSize + rows.length} of ${historyQuery.data?.total || 0}`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0 || historyQuery.isFetching} onClick={() => setPage(value => Math.max(0, value - 1))}>
                  {isAr ? <ArrowRight className="me-1 h-4 w-4" /> : <ArrowLeft className="me-1 h-4 w-4" />}
                  {isAr ? "السابق" : "Previous"}
                </Button>
                <Button variant="outline" size="sm" disabled={!historyQuery.data?.hasMore || historyQuery.isFetching} onClick={() => setPage(value => value + 1)}>
                  {isAr ? "التالي" : "Next"}
                  {isAr ? <ArrowLeft className="ms-1 h-4 w-4" /> : <ArrowRight className="ms-1 h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent
          className="max-h-[90vh] max-w-none gap-0 overflow-hidden rounded-3xl border-0 bg-slate-50 p-0 shadow-2xl [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:text-white"
          style={{ width: "min(1180px, calc(100vw - 32px))", maxWidth: "1180px" }}
          dir={isAr ? "rtl" : "ltr"}
        >
          <div className="max-h-[90vh] overflow-y-auto">
            <DialogHeader className="relative overflow-hidden bg-[#1A1F36] px-6 pb-6 pt-7 text-white md:px-9">
              <div className="absolute -start-16 -top-20 h-52 w-52 rounded-full bg-[#00C9B7]/25 blur-3xl" />
              <div className="absolute -bottom-20 end-16 h-40 w-40 rounded-full bg-[#FFB020]/10 blur-3xl" />
              <div className="relative flex items-start gap-4 pe-9">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00C9B7]/15 ring-1 ring-[#00C9B7]/30"><Sparkles className="h-6 w-6 text-[#57E2D6]" /></span>
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs font-bold text-[#57E2D6]">{isAr ? "نتيجة محفوظة في أعمالي الذكية" : "Saved in My AI Work"}</p>
                  <DialogTitle className="text-start text-xl font-black leading-8 text-white md:text-2xl">{selected?.title}</DialogTitle>
                </div>
              </div>
            </DialogHeader>
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur-md md:px-8">
              {selected && <Badge className={TYPE_STYLES[selected.type] || ""}>{typeLabels[selected.type] || selected.type}</Badge>}
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{selected && new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", { dateStyle: "full", timeStyle: "short" }).format(new Date(selected.createdAt))}</span>
              <div className="ms-auto flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={copyResult}><Copy className="me-1.5 h-3.5 w-3.5" />{isAr ? "نسخ النتيجة" : "Copy result"}</Button>
                {selected && <Button size="sm" className="rounded-xl" asChild><a href={selected.destinationUrl}><ExternalLink className="me-1.5 h-3.5 w-3.5" />{isAr ? "فتح في قسمه" : "Open source"}</a></Button>}
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8 lg:p-10">
              <StructuredContent value={selected?.content} isAr={isAr} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
