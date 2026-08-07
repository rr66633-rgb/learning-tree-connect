import { useEffect, useState } from "react";
import { 
  CalendarDays, Sparkles, Copy, Download, Save, Loader2, BookOpen, 
  Clock, FileText, Trash2, Send, Plus, ChevronLeft, Edit3,
  BookMarked, Palette, FlaskConical, Music, Home, MessageSquare,
  Calculator, Dumbbell, Hand, Moon, LayoutGrid, PackageOpen,
  ListChecks, Target, Languages, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
const DEEP_TEAL_HEADER = "border-[#005B55] bg-gradient-to-l from-[#007F75] to-[#005B55]";
const DEEP_NAVY_HEADER = "border-[#2A314E] bg-gradient-to-l from-[#3F4868] to-[#2A314E]";

const SECTION_ICONS: Record<string, { icon: any; header: string }> = {
  theme_overview: { icon: BookOpen, header: DEEP_TEAL_HEADER },
  learning_objectives: { icon: FileText, header: DEEP_TEAL_HEADER },
  arabic_activities: { icon: BookMarked, header: DEEP_NAVY_HEADER },
  english_activities: { icon: BookMarked, header: DEEP_NAVY_HEADER },
  math_activities: { icon: Calculator, header: DEEP_NAVY_HEADER },
  science_activities: { icon: FlaskConical, header: DEEP_NAVY_HEADER },
  art_activities: { icon: Palette, header: DEEP_NAVY_HEADER },
  sensory_activities: { icon: Hand, header: DEEP_NAVY_HEADER },
  physical_activities: { icon: Dumbbell, header: DEEP_NAVY_HEADER },
  quran_islamic: { icon: Moon, header: DEEP_TEAL_HEADER },
  story_of_week: { icon: BookOpen, header: DEEP_TEAL_HEADER },
  song_of_week: { icon: Music, header: DEEP_TEAL_HEADER },
  home_activity: { icon: Home, header: DEEP_NAVY_HEADER },
  parent_notes: { icon: MessageSquare, header: DEEP_NAVY_HEADER },
};

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

const PLAN_SECTION_GROUPS = [
  {
    id: "foundation",
    titleAr: "بوصلة الأسبوع",
    titleEn: "Week compass",
    descriptionAr: "الفكرة العامة والأهداف التي تربط رحلة التعلم",
    descriptionEn: "The theme and objectives connecting the learning journey",
    keys: ["theme_overview", "learning_objectives"],
  },
  {
    id: "experiences",
    titleAr: "تجارب التعلم",
    titleEn: "Learning experiences",
    descriptionAr: "أنشطة اللغة والرياضيات والاستكشاف والإبداع والحركة",
    descriptionEn: "Language, mathematics, discovery, creativity and movement",
    keys: ["arabic_activities", "english_activities", "math_activities", "science_activities", "art_activities", "sensory_activities", "physical_activities"],
  },
  {
    id: "enrichment",
    titleAr: "القيم والإثراء",
    titleEn: "Values and enrichment",
    descriptionAr: "القيم الإسلامية والقصة والنشيد الداعم للموضوع",
    descriptionEn: "Islamic values, story and theme-supporting song",
    keys: ["quran_islamic", "story_of_week", "song_of_week"],
  },
  {
    id: "home",
    titleAr: "امتداد التعلم للمنزل",
    titleEn: "Learning beyond the classroom",
    descriptionAr: "نشاط منزلي وإرشادات واضحة لتعزيز مشاركة الأسرة",
    descriptionEn: "Home activity and practical guidance for family involvement",
    keys: ["home_activity", "parent_notes"],
  },
] as const;

const ALL_SECTION_KEYS = PLAN_SECTION_GROUPS.flatMap(group => [...group.keys]);

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
  const NUMBERED = /^\s*([0-9٠-٩]+)\s*[.)\-–]\s*(.+)$/;
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

  const isEnglishLabel = (label: string) => /english|الإنجليزية|بالإنجليزية/i.test(label);

  const renderLine = (line: string, key: number) => {
    if (!line) return null;
    const num = line.match(NUMBERED);
    if (num) {
      const direction = textDirection(num[2]);
      return (
        <li key={key} dir={direction} className={`flex items-start gap-2.5 ${direction === "ltr" ? "text-left" : "text-right"}`}>
          <span className="mt-0.5 shrink-0 h-5 min-w-5 px-1 rounded-md bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center justify-center tabular-nums">
            {num[1]}
          </span>
          <span className="text-sm text-gray-700 leading-relaxed">{renderInline(num[2])}</span>
        </li>
      );
    }
    const bullet = line.match(BULLET);
    if (bullet) {
      const direction = textDirection(bullet[1]);
      return (
        <li key={key} dir={direction} className={`flex items-start gap-2.5 ${direction === "ltr" ? "text-left" : "text-right"}`}>
          <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-gray-300" />
          <span className="text-sm text-gray-700 leading-relaxed">{renderInline(bullet[1])}</span>
        </li>
      );
    }
    const direction = textDirection(line);
    return <p key={key} dir={direction} className={`text-sm leading-relaxed text-gray-700 ${direction === "ltr" ? "text-left" : "text-right"}`}>{renderInline(line)}</p>;
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
        const blockDirection = block.lang ? (en ? "ltr" : "rtl") : undefined;
        return (
          <div
            key={bi}
            dir={blockDirection}
            className={block.lang
              ? `rounded-2xl border border-s-[3px] p-3.5 ${en ? "border-[#1A1F36]/10 border-s-[#00C9B7] bg-[#1A1F36]/[0.025] text-left" : "border-[#00C9B7]/15 border-s-[#00C9B7] bg-[#00C9B7]/[0.035] text-right"}`
              : undefined}
          >
            {block.lang && (
              <div className="mb-2.5 flex items-center gap-2">
                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${en ? "bg-[#1A1F36] text-white" : "bg-[#00C9B7] text-white"}`}>
                  {en ? "English" : (isAr ? "العربية" : "Arabic")}
                </span>
                <span className="h-px flex-1 bg-slate-200/80" />
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
const ACTIVITY_LANGUAGE_HEADING = /^\s*(?:English|الإنجليزية|بالإنجليزية|العربية|بالعربية|عربي)\s*[:：]?\s*$/i;

function fieldVisual(label: string, isAr: boolean) {
  const value = label.toLocaleLowerCase();
  if (/مدة|duration/.test(value)) return { Icon: Clock, tone: "bg-[#1A1F36]/5 text-[#1A1F36] border-[#1A1F36]/10", label: isAr ? "المدة" : "Duration" };
  if (/مواد|materials/.test(value)) return { Icon: PackageOpen, tone: "bg-[#FFB020]/10 text-[#9A6300] border-[#FFB020]/20", label };
  if (/تقييم|assessment/.test(value)) return { Icon: CheckCircle2, tone: "bg-[#00C9B7]/10 text-[#008F83] border-[#00C9B7]/20", label };
  if (/تنفيذ|خطوات|procedure|implementation|steps/.test(value)) return { Icon: ListChecks, tone: "bg-[#1A1F36]/5 text-[#1A1F36] border-[#1A1F36]/10", label };
  if (/وصف|description/.test(value)) return { Icon: Languages, tone: "bg-[#00C9B7]/10 text-[#008F83] border-[#00C9B7]/20", label };
  return { Icon: Target, tone: "bg-slate-50 text-slate-700 border-slate-100", label };
}

function textDirection(value: string): "rtl" | "ltr" {
  const firstStrongCharacter = value.match(/[A-Za-z\u0600-\u06FF]/)?.[0];
  return firstStrongCharacter && /[\u0600-\u06FF]/.test(firstStrongCharacter) ? "rtl" : "ltr";
}

function splitBilingualTitle(title: string) {
  const match = title.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (!match) return { primary: title, translation: "", translationDirection: null as "rtl" | "ltr" | null };
  const primary = match[1].trim();
  const translation = match[2].trim();
  const primaryDirection = textDirection(primary);
  const translationDirection = textDirection(translation);
  if (primaryDirection === translationDirection) {
    return { primary: title, translation: "", translationDirection: null as "rtl" | "ltr" | null };
  }
  return { primary, translation, translationDirection };
}

function sectionPreview(content: unknown, isAr: boolean) {
  if (content === null || content === undefined || content === "") {
    return isAr ? "لا يوجد محتوى في هذا القسم" : "No content in this section";
  }
  if (Array.isArray(content)) {
    return isAr ? `${content.length} عناصر مرتبة` : `${content.length} organized items`;
  }
  if (typeof content === "object") {
    const count = Object.values(content as Record<string, unknown>).filter(Boolean).length;
    return isAr ? `${count} محاور مترابطة` : `${count} connected topics`;
  }
  const text = String(content)
    .replace(/[*#•]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const numberedCount = (String(content).match(/(?:^|\s)[0-9٠-٩]+[.)\-–:]\s/g) || []).length;
  if (numberedCount > 1) return isAr ? `${numberedCount} عناصر مرتبة داخل القسم` : `${numberedCount} organized items in this section`;
  return text.length > 125 ? `${text.slice(0, 125).trim()}…` : text;
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
    .replace(/\s+(?=[0-9٠-٩]+\s*[.)\-–:]\s+)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
  type ActivityGroup = { number: string; title: string; details: string[] };
  const intro: string[] = [];
  const groups: ActivityGroup[] = [];
  let current: ActivityGroup | null = null;

  for (const line of lines) {
    if (ACTIVITY_LANGUAGE_HEADING.test(line)) {
      current = null;
      continue;
    }
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

  const hasStructuredActivities = groups.length > 1 || groups.some(group => group.details.length > 0);
  if (!hasStructuredActivities) return <FormattedText text={text} isAr={isAr} />;

  type ActivityRun = { direction: "rtl" | "ltr"; groups: Array<{ group: ActivityGroup; originalIndex: number }> };
  const groupRuns: ActivityRun[] = [];
  groups.forEach((group, originalIndex) => {
    const direction = textDirection(splitBilingualTitle(group.title).primary);
    const lastRun = groupRuns[groupRuns.length - 1];
    if (!lastRun || lastRun.direction !== direction) {
      groupRuns.push({ direction, groups: [{ group, originalIndex }] });
    } else {
      lastRun.groups.push({ group, originalIndex });
    }
  });

  return (
    <div className="space-y-5">
      {intro.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <FormattedText text={intro.join("\n")} isAr={isAr} />
        </div>
      )}
      {groupRuns.map((run, runIndex) => (
        <section key={`${run.direction}-${runIndex}`} dir={run.direction} className="space-y-3">
          {run.direction !== (isAr ? "rtl" : "ltr") && (
            <div className="flex items-center gap-3 px-1">
              <span className="text-[11px] font-black text-slate-500">
                {run.direction === "ltr" ? "English" : "Arabic"}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          )}
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {run.groups.map(({ group, originalIndex }) => {
              const bilingualTitle = splitBilingualTitle(group.title);
              const groupDirection = textDirection(bilingualTitle.primary);
              return (
                <article key={`${group.number}-${originalIndex}`} dir={groupDirection} className="self-start overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
                  <header className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-4 py-3.5">
                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-2 text-xs font-black text-white shadow-sm">
                      {group.number}
                    </span>
                    <h4 className={`min-w-0 flex-1 pt-1 text-[15px] font-bold leading-6 text-slate-900 ${groupDirection === "ltr" ? "text-left" : "text-right"}`}>
                      <span className="block">{bilingualTitle.primary}</span>
                      {bilingualTitle.translation && bilingualTitle.translationDirection && (
                        <span
                          dir={bilingualTitle.translationDirection}
                          className={`mt-1.5 block text-xs font-semibold leading-5 text-slate-500 ${bilingualTitle.translationDirection === "ltr" ? "text-left" : "text-right"}`}
                        >
                          <span className="me-1.5 inline-flex rounded-md bg-[#00C9B7]/10 px-2 py-0.5 text-[9px] font-black text-[#008F83]">
                            {bilingualTitle.translationDirection === "ltr" ? "English" : (isAr ? "العربية" : "Arabic")}
                          </span>
                          {bilingualTitle.translation}
                        </span>
                      )}
                    </h4>
                  </header>
                  {group.details.length > 0 && (
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
                        const detailDirection = textDirection(`${label} ${value}`);
                        const isEnglishDetail = groupDirection === "rtl" && detailDirection === "ltr" && /[A-Za-z]/.test(`${label} ${value}`);
                        return (
                          <section
                            key={detailIndex}
                            className={`rounded-xl border border-s-[3px] p-3.5 ${visual.tone} ${isEnglishDetail ? "border-s-[#00C9B7]" : ""} ${isLong ? "sm:col-span-2" : ""}`}
                            dir={detailDirection}
                          >
                            <div className="mb-1.5 flex items-center gap-2 text-xs font-bold">
                              <visual.Icon className="h-3.5 w-3.5" />
                              <span>{label}</span>
                              {isEnglishDetail && (
                                <span className="ms-auto rounded-md bg-[#1A1F36] px-2 py-0.5 text-[9px] font-black text-white">
                                  English
                                </span>
                              )}
                            </div>
                            <p className={`whitespace-pre-wrap text-sm leading-7 text-slate-700 ${detailDirection === "ltr" ? "text-left" : "text-right"}`}>{value || "—"}</p>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
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
        {content.map((item: any, i: number) => {
          const direction = textDirection(typeof item === "string" ? item : String(item?.title || item?.description || ""));
          return (
            <div key={i} dir={direction} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3.5">
              <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-xl bg-[#1A1F36] px-2 text-[11px] font-black text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                {typeof item === "string" ? (
                  <p className={`text-sm leading-7 text-gray-700 ${direction === "ltr" ? "text-left" : "text-right"}`}>{item}</p>
                ) : (
                  <SectionContent content={item} sectionKey={sectionKey} t={t} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Handle object content (like quran_islamic, story_of_week, song_of_week)
  if (typeof content === "object") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(content).map(([key, value]: [string, any]) => {
          if (value === null || value === undefined || value === "") return null;
          const labelKey = OBJECT_LABEL_KEYS[key];
          const displayLabel = labelKey ? t(`weeklyPlan.${labelKey}`) : key;
          const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
          const isDetailed = Array.isArray(value) || typeof value === "object" || serializedValue.length > 100;
          return (
            <section key={key} className={`rounded-2xl border border-slate-100 bg-slate-50/60 p-4 ${isDetailed ? "sm:col-span-2" : ""}`}>
              <span className="mb-2 block text-[11px] font-black text-[#008F83]">{displayLabel}</span>
              {typeof value === "object" ? (
                <SectionContent content={value} sectionKey={key} t={t} />
              ) : (
                <FormattedText text={String(value)} isAr={isAr} />
              )}
            </section>
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
  const [openSections, setOpenSections] = useState<string[]>(["theme_overview"]);

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

  useEffect(() => {
    if (selectedPlanId) setOpenSections(["theme_overview"]);
  }, [selectedPlanId]);

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
          <Button onClick={() => setView("generate")} className="bg-[#00A99A] hover:bg-[#008F83]">
            <Plus className={`h-4 w-4 ${isEn ? 'mr-2' : 'ml-2'}`} />
            {t('weeklyPlan.createNewPlan')}
          </Button>
        </div>

        {/* Plans List */}
        {plansQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#00A99A]" />
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
        <Card className="border-[#00C9B7]/20 bg-gradient-to-br from-[#00C9B7]/8 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[#00A99A]" />
                <h3 className="font-bold text-gray-800">{t('weeklyPlan.readyTemplates')}</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-[#00A99A] hover:bg-[#00C9B7]/10 hover:text-[#008F83]"
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
                    className={templateCategory === "" ? "bg-[#00A99A] hover:bg-[#008F83]" : ""}
                  >
                    {t('weeklyPlan.allTemplates')}
                  </Button>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <Button
                      key={cat.id}
                      variant={templateCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTemplateCategory(cat.id)}
                      className={templateCategory === cat.id ? "bg-[#00A99A] hover:bg-[#008F83]" : ""}
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
                className="w-full bg-[#00A99A] px-8 py-6 text-lg hover:bg-[#008F83] md:w-auto"
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
      <div className="relative overflow-hidden rounded-3xl border border-[#00C9B7]/20 bg-gradient-to-br from-[#00C9B7]/10 via-white to-[#FFB020]/8 p-5 shadow-[0_20px_60px_-42px_rgba(0,201,183,0.55)] md:p-6">
        <div className="pointer-events-none absolute -start-12 -top-16 h-40 w-40 rounded-full bg-[#00C9B7]/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="shrink-0 rounded-2xl border-white bg-white/85 shadow-sm" onClick={() => { setView("list"); setSelectedPlanId(null); setIsEditing(false); setEditedSections({}); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-[#008F83]"><Sparkles className="h-3.5 w-3.5" />{isAr ? "رحلة تعلم أسبوعية" : "Weekly learning journey"}</div>
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
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setOpenSections([...ALL_SECTION_KEYS]); }}>
                  <Edit3 className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
                  {t('weeklyPlan.editBtn')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSaveEdits} disabled={saveMutation.isPending}>
                  <Save className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
                  {t('weeklyPlan.saveEdits')}
                </Button>
              )}
              <Button size="sm" className="bg-[#00A99A] hover:bg-[#008F83]" onClick={handlePublish} disabled={publishMutation.isPending}>
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
          <Loader2 className="h-8 w-8 animate-spin text-[#00A99A]" />
        </div>
      ) : sections ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A1F36] text-white"><LayoutGrid className="h-4.5 w-4.5" /></span>
              <div>
                <h2 className="font-black text-slate-950">{isAr ? "خريطة الخطة" : "Plan map"}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {isAr ? "أربعة مسارات مترابطة و١٤ قسماً؛ افتح ما تحتاجه وابقِ بقية الخطة مختصرة." : "Four connected paths and 14 sections; open what you need and keep the rest compact."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setOpenSections([...ALL_SECTION_KEYS])} disabled={openSections.length === ALL_SECTION_KEYS.length}>
                {isAr ? "فتح الكل" : "Expand all"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setOpenSections([])} disabled={openSections.length === 0}>
                {isAr ? "طي الكل" : "Collapse all"}
              </Button>
            </div>
          </div>

          <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-6">
            {PLAN_SECTION_GROUPS.map((group, groupIndex) => (
              <section key={group.id} className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/70 shadow-[0_16px_45px_-38px_rgba(15,23,42,0.55)]">
                <header className="flex items-start gap-3 border-b border-slate-200/70 bg-white/75 px-4 py-4 md:px-5">
                  <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A1F36] text-xs font-black text-white shadow-sm">
                    {groupIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-slate-950">{isAr ? group.titleAr : group.titleEn}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{isAr ? group.descriptionAr : group.descriptionEn}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-slate-200 bg-white/80 text-slate-500">
                    {group.keys.length} {isAr ? "أقسام" : "sections"}
                  </Badge>
                </header>

                <div className="space-y-2.5 p-2.5 md:p-3">
                  {group.keys.map(key => {
                    const config = SECTION_ICONS[key];
                    const Icon = config.icon;
                    const sectionContent = sections[key];
                    const labelKey = SECTION_LABEL_KEYS[key];
                    const sectionIndex = ALL_SECTION_KEYS.indexOf(key);

                    return (
                      <AccordionItem id={`plan-section-${key}`} key={key} value={key} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <AccordionTrigger
                          dir={isEn ? "ltr" : "rtl"}
                          className={`rounded-none px-3.5 py-3.5 text-start text-white hover:no-underline hover:brightness-105 data-[state=open]:shadow-[0_10px_30px_-22px_rgba(15,23,42,0.85)] md:px-4 [&>svg]:text-white/75 ${config.header}`}
                        >
                          <span className="flex min-w-0 flex-1 items-start gap-3">
                            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 px-2 text-[11px] font-black tabular-nums text-white shadow-sm ring-1 ring-white/20">
                              {sectionIndex + 1}
                            </span>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white shadow-sm ring-1 ring-white/20">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-black text-white">{t(`weeklyPlan.${labelKey}`)}</span>
                              {!isEditing && <span className="mt-1 block truncate text-xs font-normal text-white/70">{sectionPreview(sectionContent, isAr)}</span>}
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="border-t border-slate-100 bg-white px-4 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5">
                          {isEditing ? (
                            <SectionEditor
                              content={editedSections[key] !== undefined ? editedSections[key] : sectionContent}
                              onChange={(val) => setEditedSections(prev => ({ ...prev, [key]: val }))}
                            />
                          ) : (
                            <SectionContent content={sectionContent} sectionKey={key} t={t} />
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </div>
              </section>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">{t('weeklyPlan.noContent')}</div>
      )}
    </div>
  );
}
