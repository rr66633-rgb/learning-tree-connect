import { useEffect, useState } from "react";
import { Link } from "wouter";
import { 
  CalendarDays, Sparkles, Copy, Download, Save, Loader2, BookOpen, 
  Clock, FileText, Trash2, Send, Plus, ChevronLeft, Edit3, Eye,
  BookMarked, Palette, FlaskConical, Music, Home, MessageSquare,
  Calculator, Dumbbell, Hand, Moon, LayoutGrid, X, PackageOpen,
  ListChecks, Target, Languages, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAiTask } from "@/components/AiTaskOverlay";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { WEEKLY_PLAN_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesForAgeGroup, type WeeklyPlanTemplate } from "@/lib/weeklyPlanTemplates";

// Section config without labels (labels come from i18n)
const SECTION_ICONS: Record<string, { icon: any; color: string }> = {
  theme_overview: { icon: BookOpen, color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  learning_objectives: { icon: FileText, color: "bg-blue-50 border-blue-200 text-blue-800" },
  arabic_activities: { icon: BookMarked, color: "bg-amber-50 border-amber-200 text-amber-800" },
  english_activities: { icon: BookMarked, color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  math_activities: { icon: Calculator, color: "bg-purple-50 border-purple-200 text-purple-800" },
  science_activities: { icon: FlaskConical, color: "bg-teal-50 border-teal-200 text-teal-800" },
  art_activities: { icon: Palette, color: "bg-pink-50 border-pink-200 text-pink-800" },
  sensory_activities: { icon: Hand, color: "bg-orange-50 border-orange-200 text-orange-800" },
  physical_activities: { icon: Dumbbell, color: "bg-red-50 border-red-200 text-red-800" },
  quran_islamic: { icon: Moon, color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  story_of_week: { icon: BookOpen, color: "bg-violet-50 border-violet-200 text-violet-800" },
  song_of_week: { icon: Music, color: "bg-sky-50 border-sky-200 text-sky-800" },
  home_activity: { icon: Home, color: "bg-lime-50 border-lime-200 text-lime-800" },
  parent_notes: { icon: MessageSquare, color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
};

const WIDE_SECTION_KEYS = new Set([
  "arabic_activities",
  "english_activities",
  "math_activities",
  "science_activities",
  "art_activities",
  "sensory_activities",
  "physical_activities",
]);

// Map section keys to i18n keys
const SECTION_LABEL_KEYS: Record<string, string> = {
  theme_overview: "sectionThemeOverview",
  learning_objectives: "sectionLearningObjectives",
  arabic_activities: "sectionArabicActivities",
  english_activities: "sectionEnglishActivities",
  math_activities: "sectionMathActivities",
  science_activities: "sectionScienceActivities",
  art_activities: "sectionArtActivities",
  sensory_activities: "sectionSensoryActivities",
  physical_activities: "sectionPhysicalActivities",
  quran_islamic: "sectionQuranIslamic",
  story_of_week: "sectionStoryOfWeek",
  song_of_week: "sectionSongOfWeek",
  home_activity: "sectionHomeActivity",
  parent_notes: "sectionParentNotes",
};

// Map object keys to i18n label keys
const OBJECT_LABEL_KEYS: Record<string, string> = {
  surah: "labelSurah", dua: "labelDua", value: "labelValue", activity: "labelActivity",
  title: "labelTitle", summary: "labelSummary", discussion_questions: "labelDiscussionQuestions",
  lessons: "labelLessons", lyrics: "labelLyrics", movements: "labelMovements",
  description: "labelDescription", materials: "labelMaterials", connection: "labelConnection",
  hadith: "labelHadith", ayah: "labelAyah", islamic_value: "labelIslamicValue",
  memorization: "labelMemorization", religious_activity: "labelReligiousActivity",
};

/**
 * Renders one section's text with the structure the model already put in it.
 *
 * Three things are recognised, all optional -- anything unrecognised falls
 * through as an ordinary paragraph, so no content can ever be lost or hidden:
 *   1. a language switch line ("العربية:" / "English:") starts a labelled block
 *   2. "1. …" / "- …" lines become a real list with aligned numbers
 *   3. a short "label: value" prefix is set in a lighter weight than its value
 * The wording itself is never touched.
 */
function FormattedText({ text, isAr }: { text: string; isAr: boolean }) {
  const LANG_HEADING = /^\s*(العربية|بالعربية|عربي|English|الإنجليزية|بالإنجليزية)\s*[:：]\s*$/;
  const LANG_INLINE = /^\s*(العربية|بالعربية|عربي|English|الإنجليزية|بالإنجليزية)\s*[:：]\s*(.+)$/;
  const NUMBERED = /^\s*(\d+)\s*[.)\-–]\s*(.+)$/;
  const BULLET = /^\s*[-•*]\s*(.+)$/;
  // A leading "شيء: ..." label, only when it is genuinely short (a label, not a
  // sentence that happens to contain a colon).
  const LABELLED = /^\s*([^:：\n]{2,28})\s*[:：]\s+(.+)$/;

  type Block = { lang: string | null; lines: string[] };
  const blocks: Block[] = [];
  let current: Block = { lang: null, lines: [] };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) { current.lines.push(""); continue; }

    const heading = line.match(LANG_HEADING);
    const inline = heading ? null : line.match(LANG_INLINE);
    if (heading || inline) {
      if (current.lines.some(Boolean)) blocks.push(current);
      current = { lang: (heading ? heading[1] : inline![1]), lines: [] };
      if (inline && inline[2].trim()) current.lines.push(inline[2].trim());
      continue;
    }
    current.lines.push(line);
  }
  if (current.lines.some(Boolean)) blocks.push(current);

  const isEnglishLabel = (l: string) => /english/i.test(l);

  const renderLine = (line: string, key: number) => {
    if (!line) return null;
    const num = line.match(NUMBERED);
    if (num) {
      return (
        <li key={key} className="flex gap-2.5 items-start">
          <span className="mt-0.5 shrink-0 h-5 min-w-5 px-1 rounded-md bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center justify-center tabular-nums">
            {num[1]}
          </span>
          <span className="text-sm text-gray-700 leading-relaxed">{renderInline(num[2])}</span>
        </li>
      );
    }
    const bullet = line.match(BULLET);
    if (bullet) {
      return (
        <li key={key} className="flex gap-2.5 items-start">
          <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-gray-300" />
          <span className="text-sm text-gray-700 leading-relaxed">{renderInline(bullet[1])}</span>
        </li>
      );
    }
    return (
      <p key={key} className="text-sm text-gray-700 leading-relaxed">{renderInline(line)}</p>
    );
  };

  // "المواد: كذا" -> label in a lighter weight, value normal.
  function renderInline(s: string) {
    const m = s.match(LABELLED);
    if (!m) return s;
    return (
      <>
        <span className="font-medium text-gray-500">{m[1]}: </span>
        {m[2]}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, bi) => {
        const en = block.lang ? isEnglishLabel(block.lang) : false;
        const items = block.lines.filter(Boolean);
        const allListItems = items.length > 1 && items.every((l) => NUMBERED.test(l) || BULLET.test(l));
        return (
          <div key={bi} dir={block.lang ? (en ? "ltr" : "rtl") : undefined}
               className={block.lang && en ? "text-left" : undefined}>
            {block.lang && (
              // Deliberately quiet: a small uppercase-ish label with a hairline,
              // so it separates the two languages without competing with the
              // section's own heading.
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold tracking-wide text-gray-400">
                  {block.lang}
                </span>
                <span className="h-px flex-1 bg-gray-100" />
              </div>
            )}
            {allListItems ? (
              <ol className="space-y-1.5">{items.map(renderLine)}</ol>
            ) : (
              <div className="space-y-1.5">{items.map(renderLine)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const ACTIVITY_FIELD = /^\s*([^:：\n]{2,42})\s*[:：]\s*(.*)$/;
const ACTIVITY_NUMBER = /^\s*([0-9٠-٩]+)\s*[.)\-–:]?\s+(.+)$/;
const ACTIVITY_LABELS = /(?:الوصف بالعربية|الوصف|English description|Description|المواد المطلوبة|المواد|Materials needed|Materials|المدة|Duration|طريقة التنفيذ|خطوات التنفيذ|التنفيذ|Procedure|Implementation|Steps|طريقة التقييم|التقييم|Assessment|المفهوم الرياضي|Math concept|الملاحظات المتوقعة|Expected observations|الحواس المستهدفة|Targeted senses|المهارات المستهدفة|Targeted skills)\s*[:：]/gi;

function fieldVisual(label: string, isAr: boolean) {
  const value = label.toLocaleLowerCase();
  if (/مدة|duration/.test(value)) return { Icon: Clock, tone: "bg-sky-50 text-sky-700 border-sky-100", label: isAr ? "المدة" : "Duration" };
  if (/مواد|materials/.test(value)) return { Icon: PackageOpen, tone: "bg-amber-50 text-amber-700 border-amber-100", label };
  if (/تقييم|assessment/.test(value)) return { Icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border-emerald-100", label };
  if (/تنفيذ|خطوات|procedure|implementation|steps/.test(value)) return { Icon: ListChecks, tone: "bg-violet-50 text-violet-700 border-violet-100", label };
  if (/وصف|description/.test(value)) return { Icon: Languages, tone: "bg-blue-50 text-blue-700 border-blue-100", label };
  return { Icon: Target, tone: "bg-slate-50 text-slate-700 border-slate-100", label };
}

function textDirection(value: string): "rtl" | "ltr" {
  return /[\u0600-\u06FF]/.test(value) ? "rtl" : "ltr";
}

/**
 * Turns both new and historical model output into scannable activity cards.
 * The parser only adds presentation structure; every original line remains
 * visible, including unknown labels, so an older plan never loses content.
 */
function RichFormattedText({ text, isAr }: { text: string; isAr: boolean }) {
  const normalized = text
    .replace(/\r/g, "")
    .replace(ACTIVITY_LABELS, match => `\n${match}`)
    .replace(/\s+(?=\d+\s*[.)\-–:]\s+)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
  type ActivityGroup = { number: string; title: string; details: string[] };
  const intro: string[] = [];
  const groups: ActivityGroup[] = [];
  let current: ActivityGroup | null = null;

  for (const line of lines) {
    const numbered = line.match(ACTIVITY_NUMBER);
    if (numbered) {
      current = { number: numbered[1], title: numbered[2], details: [] };
      groups.push(current);
    } else if (current) {
      current.details.push(line);
    } else {
      intro.push(line);
    }
  }

  const hasDetailedActivities = groups.some(group => group.details.length > 0);
  if (!hasDetailedActivities) return <FormattedText text={text} isAr={isAr} />;

  return (
    <div className="space-y-5">
      {intro.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <FormattedText text={intro.join("\n")} isAr={isAr} />
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group, groupIndex) => (
          <article key={`${group.number}-${groupIndex}`} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
            <header className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-4 py-3.5">
              <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-2 text-xs font-black text-white shadow-sm">
                {group.number}
              </span>
              <h4 className="pt-1 text-[15px] font-bold leading-6 text-slate-900" dir={textDirection(group.title)}>{group.title}</h4>
            </header>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {group.details.map((detail, detailIndex) => {
                const matched = detail.match(ACTIVITY_FIELD);
                if (!matched) {
                  return <p key={detailIndex} className="sm:col-span-2 whitespace-pre-wrap text-sm leading-7 text-slate-700" dir={textDirection(detail)}>{detail}</p>;
                }
                const label = matched[1].trim();
                const value = matched[2].trim();
                const visual = fieldVisual(label, isAr);
                const isLong = /وصف|description|تنفيذ|خطوات|procedure|implementation|steps|تقييم|assessment/.test(label.toLocaleLowerCase()) || value.length > 150;
                return (
                  <section key={detailIndex} className={`rounded-xl border p-3.5 ${visual.tone} ${isLong ? "sm:col-span-2" : ""}`} dir={textDirection(`${label} ${value}`)}>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-bold">
                      <visual.Icon className="h-3.5 w-3.5" />
                      <span>{label}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{value || "—"}</p>
                  </section>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SectionContent({ content, sectionKey, t }: { content: any; sectionKey: string; t: (key: string) => string }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  if (!content) return <p className="text-gray-400 text-sm">{t('weeklyPlan.noContent')}</p>;

  // Handle string content.
  // The model returns one long string per section, and it was previously dumped
  // straight into a <p> with whitespace-pre-wrap -- so numbered lists, the
  // "العربية:/English:" split and "label: value" pairs all read as one grey
  // block. FormattedText below gives that structure back without changing a
  // single word of the content.
  if (typeof content === "string") {
    return <RichFormattedText text={content} isAr={isAr} />;
  }

  // Handle array content (like learning_objectives or activities)
  if (Array.isArray(content)) {
    return (
      <div className="space-y-3">
        {content.map((item: any, i: number) => (
          <div key={i} className="p-3 bg-white rounded-lg border border-gray-100">
            {typeof item === "string" ? (
              <p className="text-sm text-gray-700">• {item}</p>
            ) : (
              <div className="space-y-1">
                {item.title && <p className="font-semibold text-sm text-gray-800">{item.title}</p>}
                {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                {item.materials && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">{t('weeklyPlan.labelMaterials')}:</span> {Array.isArray(item.materials) ? item.materials.join("، ") : item.materials}
                  </p>
                )}
                {item.duration && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelDuration')}:</span> {item.duration}</p>}
                {item.implementation && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelImplementation')}:</span> {item.implementation}</p>}
                {item.steps && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelSteps')}:</span> {Array.isArray(item.steps) ? item.steps.join(" → ") : item.steps}</p>}
                {item.concept && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelConcept')}:</span> {item.concept}</p>}
                {item.math_concept && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelMathConcept')}:</span> {item.math_concept}</p>}
                {item.experiment && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelExperiment')}:</span> {item.experiment}</p>}
                {item.targeted_senses && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelTargetedSenses')}:</span> {Array.isArray(item.targeted_senses) ? item.targeted_senses.join("، ") : item.targeted_senses}</p>}
                {item.targeted_skills && <p className="text-xs text-gray-500"><span className="font-medium">{t('weeklyPlan.labelTargetedSkills')}:</span> {Array.isArray(item.targeted_skills) ? item.targeted_skills.join("، ") : item.targeted_skills}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Handle object content (like quran_islamic, story_of_week, song_of_week)
  if (typeof content === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(content).map(([key, value]: [string, any]) => {
          if (!value) return null;
          const labelKey = OBJECT_LABEL_KEYS[key];
          const displayLabel = labelKey ? t(`weeklyPlan.${labelKey}`) : key;
          return (
            <div key={key} className="p-2 bg-white rounded border border-gray-50">
              <span className="text-xs font-semibold text-gray-500">{displayLabel}: </span>
              {Array.isArray(value) ? (
                <span className="text-sm text-gray-700">{value.join("، ")}</span>
              ) : typeof value === "object" ? (
                <span className="text-sm text-gray-700">{JSON.stringify(value, null, 2)}</span>
              ) : (
                <span className="text-sm text-gray-700">{String(value)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-sm text-gray-700">{String(content)}</p>;
}

function SectionEditor({ content, onChange }: { content: any; onChange: (val: string) => void }) {
  const textValue = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  return (
    <Textarea 
      value={textValue}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[150px] text-sm font-mono"
      dir="rtl"
    />
  );
}

function TemplateCard({ template, onSelect, isEn }: { template: WeeklyPlanTemplate; onSelect: (t: WeeklyPlanTemplate) => void; isEn: boolean }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <button
      onClick={() => onSelect(template)}
      className={`p-3 rounded-xl border-2 text-right transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${template.color}`}
    >
      <div className="text-2xl mb-2">{template.icon}</div>
      <h4 className="font-bold text-sm text-gray-800 mb-1 line-clamp-1">{isEn ? (template.titleEn || template.titleAr) : template.titleAr}</h4>
      <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {template.ageGroups.slice(0, 2).map(ag => (
          <span key={ag} className="text-[10px] bg-white/70 rounded px-1.5 py-0.5 text-gray-600">
            {ag === 'nursery' ? (isEn ? 'Nursery' : (isAr ? "حضانة" : "Nursery")) : ag.toUpperCase()}
          </span>
        ))}
        {template.ageGroups.length > 2 && (
          <span className="text-[10px] bg-white/70 rounded px-1.5 py-0.5 text-gray-600">+{template.ageGroups.length - 2}</span>
        )}
      </div>
    </button>
  );
}

export default function WeeklyPlanPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const isAr = i18n.language === 'ar';

  const [view, setView] = useState<"list" | "generate" | "preview">("list");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSections, setEditedSections] = useState<Record<string, any>>({});

  // Form state
  const [classId, setClassId] = useState<string>("");
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");
  const [theme, setTheme] = useState<string>("");
  const [language, setLanguage] = useState<string>("ar");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>("");

  // Age groups with translated labels
  const AGE_GROUPS = [
    { value: "nursery", label: t('weeklyPlan.nursery') },
    { value: "kg1", label: t('weeklyPlan.kg1') },
    { value: "kg2", label: t('weeklyPlan.kg2') },
    { value: "kg3", label: t('weeklyPlan.kg3') },
  ];

  // Queries
  const { trackWeeklyPlanTask, hasActiveWeeklyPlanTask } = useAiTask();
  const classesQuery = trpc.classes.list.useQuery();
  const plansQuery = trpc.weeklyPlan.list.useQuery({ limit: 50 });
  const selectedPlan = trpc.weeklyPlan.get.useQuery(
    { id: selectedPlanId! },
    { enabled: !!selectedPlanId }
  );

  // The background tracker opens a completed plan through a stable URL. This
  // also makes generated results bookmarkable instead of only reachable from
  // transient component state.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("planId");
    const planId = value ? Number(value) : NaN;
    if (Number.isInteger(planId) && planId > 0) {
      setSelectedPlanId(planId);
      setView("preview");
    }
  }, []);

  // Mutations
  const generateMutation = trpc.weeklyPlan.startGeneration.useMutation({
    onSuccess: (data) => {
      trackWeeklyPlanTask({
        jobId: data.jobId,
        title: "نُنشئ خطتك الأسبوعية",
        titleEn: "Creating your weekly plan",
        stages: [
          { label: "استلام الطلب وحفظه", labelEn: "Accepting and saving the request" },
          { label: "فهم الموضوع والفئة العمرية", labelEn: "Understanding the theme and age group" },
          { label: "صياغة أهداف التعلم وفق EYFS", labelEn: "Crafting EYFS learning objectives" },
          { label: "تصميم الأنشطة التعليمية", labelEn: "Designing learning activities" },
          { label: "تنسيق الأقسام الأربعة عشر", labelEn: "Formatting all 14 sections" },
          { label: "مراجعة الجودة والتناسق", labelEn: "Reviewing quality and consistency" },
          { label: "حفظ المسودة وتجهيز العرض", labelEn: "Saving the draft and preparing the view" },
        ],
      });
      toast.success(isAr ? "تم استلام الطلب، وسنبلغك عند اكتمال الخطة" : "Request accepted. We will notify you when the plan is ready.");
    },
    onError: (err) => {
      const raw = (err.message || "").toLowerCase();
      const message = raw.includes("abort") || raw.includes("signal") || raw.includes("fetch")
        ? (isAr ? "تعذّر إرسال الطلب بسبب انقطاع الاتصال. أعد المحاولة، ولن يتم إنشاء طلب مكرر." : "The request could not be sent because the connection was interrupted. Please try again.")
        : (err.message || t('weeklyPlan.planCreateError'));
      toast.error(message);
    },
  });

  const saveMutation = trpc.weeklyPlan.save.useMutation({
    onSuccess: () => {
      toast.success(t('weeklyPlan.editsSaved'));
      setIsEditing(false);
      selectedPlan.refetch();
    },
    onError: () => toast.error(t('weeklyPlan.editsSaveError')),
  });

  const publishMutation = trpc.weeklyPlan.publish.useMutation({
    onSuccess: () => {
      toast.success(t('weeklyPlan.publishedAndNotified'));
      selectedPlan.refetch();
      plansQuery.refetch();
    },
    onError: (err) => toast.error(err.message || t('weeklyPlan.publishError')),
  });

  const duplicateMutation = trpc.weeklyPlan.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(t('weeklyPlan.duplicated'));
      setSelectedPlanId(data.id);
      setView("preview");
      plansQuery.refetch();
    },
    onError: () => toast.error(t('weeklyPlan.duplicateError')),
  });

  const deleteMutation = trpc.weeklyPlan.delete.useMutation({
    onSuccess: () => {
      toast.success(t('weeklyPlan.deleted'));
      setSelectedPlanId(null);
      setView("list");
      plansQuery.refetch();
    },
    onError: () => toast.error(t('weeklyPlan.deleteError')),
  });

  const handleGenerate = () => {
    if (!ageGroup || !weekStart || !weekEnd || !theme) {
      toast.error(t('weeklyPlan.fillAllRequired'));
      return;
    }
    if (hasActiveWeeklyPlanTask || generateMutation.isPending) {
      toast.info(isAr ? "يوجد طلب خطة قيد التنفيذ بالفعل" : "A weekly plan request is already running");
      return;
    }
    generateMutation.mutate({
      requestId: crypto.randomUUID(),
      classId: classId ? parseInt(classId) : undefined,
      ageGroup: ageGroup as any,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      theme,
      language: language as any,
    });
  };

  const handleSaveEdits = () => {
    if (!selectedPlanId) return;
    const plan = selectedPlan.data;
    if (!plan) return;

    // Merge edited sections with original
    const currentSections = plan.sections as Record<string, any>;
    const mergedSections: Record<string, any> = { ...currentSections };
    
    for (const [key, value] of Object.entries(editedSections)) {
      try {
        mergedSections[key] = JSON.parse(value);
      } catch {
        mergedSections[key] = value;
      }
    }

    saveMutation.mutate({ id: selectedPlanId, sections: mergedSections });
  };

  const handlePublish = () => {
    if (!selectedPlanId) return;
    if (confirm(t('weeklyPlan.confirmPublish'))) {
      publishMutation.mutate({ id: selectedPlanId });
    }
  };

  // ============ LIST VIEW ============
  if (view === "list") {
    return (
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('weeklyPlan.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('weeklyPlan.subtitle')}</p>
          </div>
          <Button onClick={() => setView("generate")} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'}`} />
            {t('weeklyPlan.createNewPlan')}
          </Button>
        </div>

        {/* Plans List */}
        {plansQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : !plansQuery.data?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CalendarDays className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('weeklyPlan.noPlansYet')}</h3>
              <p className="text-sm text-gray-400 mb-6 text-center">{t('weeklyPlan.startWithAI')}</p>
              <Button onClick={() => setView("generate")} variant="outline">
                <Sparkles className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'}`} />
                {t('weeklyPlan.createNewPlan')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plansQuery.data?.map((plan: any) => (
              <Card 
                key={plan.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-r-4"
                style={{ borderRightColor: plan.status === "published" ? "#10b981" : "#f59e0b" }}
                onClick={() => { setSelectedPlanId(plan.id); setView("preview"); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={plan.status === "published" ? "default" : "secondary"} className={plan.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                      {plan.status === "published" ? (isEn ? "Published" : (isAr ? "منشورة" : "Published")) : (isEn ? "Draft" : (isAr ? "مسودة" : "Draft"))}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {AGE_GROUPS.find(g => g.value === plan.ageGroup)?.label?.split(" ")[0] || plan.ageGroup}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2 line-clamp-1">{plan.theme}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CalendarDays className="h-3 w-3" />
                    <span>{plan.weekStartDate} - {plan.weekEndDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(plan.createdAt).toLocaleDateString(isEn ? "en-US" : "ar-SA")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============ GENERATE VIEW ============
  if (view === "generate") {
    return (
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('weeklyPlan.createNewPlan')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('weeklyPlan.aiGeneratingDescription').split('...')[0]}</p>
          </div>
        </div>

        {/* Template Selector */}
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-gray-800">{t('weeklyPlan.readyTemplates')}</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                {showTemplates ? t('weeklyPlan.hideTemplates') : t('weeklyPlan.showTemplates')}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-3">{t('weeklyPlan.chooseTemplateOrWrite')}</p>
            
            {showTemplates && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={templateCategory === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTemplateCategory("")}
                    className={templateCategory === "" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    {t('weeklyPlan.allTemplates')}
                  </Button>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <Button
                      key={cat.id}
                      variant={templateCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTemplateCategory(cat.id)}
                      className={templateCategory === cat.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      {isEn ? (cat.labelEn || cat.labelAr) : cat.labelAr}
                    </Button>
                  ))}
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                  {getTemplatesForAgeGroup(ageGroup || undefined)
                    .filter(t => !templateCategory || t.category === templateCategory)
                    .map(template => (
                      <TemplateCard 
                        key={template.id} 
                        template={template}
                        isEn={isEn}
                        onSelect={(tmpl) => {
                          setTheme(tmpl.suggestedThemes[0].ar);
                          setShowTemplates(false);
                          toast.success(`${t('weeklyPlan.templateSelected')} ${isEn ? (tmpl.titleEn || tmpl.titleAr) : tmpl.titleAr}`);
                        }}
                      />
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classroom */}
              <div className="space-y-2">
                <Label>{t('weeklyPlan.classOptional')}</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('weeklyPlan.selectClass')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classesQuery.data?.map((cls: any) => (
                      <SelectItem key={cls.id} value={String(cls.id)}>
                        {cls.nameAr || cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Age Group */}
              <div className="space-y-2">
                <Label>{t('weeklyPlan.ageGroupRequired')}</Label>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('weeklyPlan.selectAgeGroup')} />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Week Start */}
              <div className="space-y-2">
                <Label>{t('weeklyPlan.weekStartRequired')}</Label>
                <Input 
                  type="date" 
                  value={weekStart} 
                  onChange={(e) => {
                    setWeekStart(e.target.value);
                    // Auto-set end date to +4 days (Sun-Thu)
                    if (e.target.value) {
                      const start = new Date(e.target.value);
                      start.setDate(start.getDate() + 4);
                      setWeekEnd(start.toISOString().split("T")[0]);
                    }
                  }}
                />
              </div>

              {/* Week End */}
              <div className="space-y-2">
                <Label>{t('weeklyPlan.weekEndRequired')}</Label>
                <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
              </div>

              {/* Theme */}
              <div className="space-y-2 md:col-span-2">
                <Label>{t('weeklyPlan.weeklyThemeRequired')}</Label>
                <Input 
                  value={theme} 
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder={t('weeklyPlan.themePlaceholder')}
                  className="text-lg"
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>{t('weeklyPlan.planLanguage')}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{t('weeklyPlan.arabic')}</SelectItem>
                    <SelectItem value="en">{t('weeklyPlan.english')}</SelectItem>
                    <SelectItem value="bilingual">{t('weeklyPlan.bilingual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-4 border-t">
              <Button 
                onClick={handleGenerate} 
                disabled={generateMutation.isPending || hasActiveWeeklyPlanTask}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-lg py-6 px-8"
                size="lg"
              >
                {generateMutation.isPending || hasActiveWeeklyPlanTask ? (
                  <>
                    <Loader2 className={`h-5 w-5 ${isEn ? 'mr-2' : 'ml-2'} animate-spin`} />
                    {t('weeklyPlan.generatingPlan')}
                  </>
                ) : (
                  <>
                    <Sparkles className={`h-5 w-5 ${isEn ? 'mr-2' : 'ml-2'}`} />
                    {t('weeklyPlan.generateAIPlan')}
                  </>
                )}
              </Button>
              {(generateMutation.isPending || hasActiveWeeklyPlanTask) && (
                <p className="text-sm text-gray-500 mt-3">
                  {isAr ? "طلبك محفوظ ويجري تنفيذه في الخلفية. يمكنك متابعة استخدام التطبيق." : "Your request is saved and running in the background. You can keep using the app."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ PREVIEW VIEW ============
  const plan = selectedPlan.data;
  const sections = plan?.sections as Record<string, any> | undefined;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_20px_60px_-42px_rgba(6,78,59,0.55)] md:p-6">
        <div className="pointer-events-none absolute -start-12 -top-16 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="shrink-0 rounded-2xl border-white bg-white/85 shadow-sm" onClick={() => { setView("list"); setSelectedPlanId(null); setIsEditing(false); setEditedSections({}); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-emerald-700"><Sparkles className="h-3.5 w-3.5" />{isAr ? "رحلة تعلم أسبوعية" : "Weekly learning journey"}</div>
            <h1 className="truncate text-2xl font-black tracking-tight text-slate-950">{plan?.theme || "..."}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={plan?.status === "published" ? "default" : "secondary"} className={plan?.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                {plan?.status === "published" ? (isEn ? "Published" : (isAr ? "منشورة" : "Published")) : (isEn ? "Draft" : (isAr ? "مسودة" : "Draft"))}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200/70"><CalendarDays className="h-3.5 w-3.5" />{plan?.weekStartDate} - {plan?.weekEndDate}</span>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200/70">
                {AGE_GROUPS.find(g => g.value === plan?.ageGroup)?.label || plan?.ageGroup}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white/65 p-2 ring-1 ring-white/90 backdrop-blur-sm">
          {plan?.status === "draft" && (
            <>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
                  {t('weeklyPlan.editBtn')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSaveEdits} disabled={saveMutation.isPending}>
                  <Save className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
                  {t('weeklyPlan.saveEdits')}
                </Button>
              )}
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePublish} disabled={publishMutation.isPending}>
                <Send className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
                {t('weeklyPlan.publishAndNotify')}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate({ id: selectedPlanId! })}>
            <Copy className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
            {t('weeklyPlan.duplicate')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            // Trigger PDF download (handled in separate component)
            window.dispatchEvent(new CustomEvent("download-weekly-plan-pdf", { detail: { plan } }));
          }}>
            <Download className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
            {t('weeklyPlan.downloadPDF')}
          </Button>
          {plan?.status === "draft" && (
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => {
              if (confirm(t('weeklyPlan.confirmDelete'))) {
                deleteMutation.mutate({ id: selectedPlanId! });
              }
            }}>
              <Trash2 className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
              {t('weeklyPlan.deleteBtn')}
            </Button>
          )}
        </div>
        </div>
      </div>

      {/* Plan Sections */}
      {selectedPlan.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : sections ? (
        <div className="space-y-5">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm" aria-label={isAr ? "أقسام الخطة" : "Plan sections"}>
            {Object.entries(SECTION_ICONS).map(([key, config], index) => {
              const Icon = config.icon;
              const labelKey = SECTION_LABEL_KEYS[key];
              return (
                <a key={key} href={`#plan-section-${key}`} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-slate-400">{index + 1}</span>
                  {t(`weeklyPlan.${labelKey}`)}
                </a>
              );
            })}
          </nav>

          <div className="grid items-start gap-5 md:grid-cols-2">
          {Object.entries(SECTION_ICONS).map(([key, config], sectionIndex) => {
            const Icon = config.icon;
            const sectionContent = sections[key];
            const colorClasses = config.color.split(" ");
            const labelKey = SECTION_LABEL_KEYS[key];

            return (
              <Card id={`plan-section-${key}`} key={key} className={`scroll-mt-24 overflow-hidden rounded-3xl border bg-white shadow-[0_14px_45px_-32px_rgba(15,23,42,0.5)] ${colorClasses[1] || ""} ${WIDE_SECTION_KEYS.has(key) ? "md:col-span-2" : ""}`}>
                <CardHeader className={`border-b px-5 py-4 ${colorClasses[0] || ""}`}>
                  <CardTitle className={`flex items-center gap-3 text-sm font-bold ${colorClasses[2] || ""}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-black/5">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="flex-1">{t(`weeklyPlan.${labelKey}`)}</span>
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/70 px-2 text-[11px] font-black opacity-65">{sectionIndex + 1}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                  {isEditing ? (
                    <SectionEditor 
                      content={editedSections[key] !== undefined ? editedSections[key] : sectionContent}
                      onChange={(val) => setEditedSections(prev => ({ ...prev, [key]: val }))}
                    />
                  ) : (
                    <SectionContent content={sectionContent} sectionKey={key} t={t} />
                  )}
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">{t('weeklyPlan.noContent')}</div>
      )}
    </div>
  );
}
