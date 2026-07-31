import { useState } from "react";
import { Link } from "wouter";
import { 
  CalendarDays, Sparkles, Copy, Download, Save, Loader2, BookOpen, 
  Clock, FileText, Trash2, Send, Plus, ChevronLeft, Edit3, Eye,
  BookMarked, Palette, FlaskConical, Music, Home, MessageSquare,
  Calculator, Dumbbell, Hand, Moon, LayoutGrid, X
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

function SectionContent({ content, sectionKey, t }: { content: any; sectionKey: string; t: (key: string) => string }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  if (!content) return <p className="text-gray-400 text-sm">{t('weeklyPlan.noContent')}</p>;

  // Handle string content
  if (typeof content === "string") {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>;
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
  const classesQuery = trpc.classes.list.useQuery();
  const plansQuery = trpc.weeklyPlan.list.useQuery({ limit: 50 });
  const selectedPlan = trpc.weeklyPlan.get.useQuery(
    { id: selectedPlanId! },
    { enabled: !!selectedPlanId }
  );

  // Mutations
  const generateMutation = trpc.weeklyPlan.generate.useMutation({
    onSuccess: (data) => {
      toast.success(t('weeklyPlan.planCreatedSuccess'));
      setSelectedPlanId(data.id);
      setView("preview");
      plansQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || t('weeklyPlan.planCreateError'));
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
    generateMutation.mutate({
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
                disabled={generateMutation.isPending}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-lg py-6 px-8"
                size="lg"
              >
                {generateMutation.isPending ? (
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
              {generateMutation.isPending && (
                <p className="text-sm text-gray-500 mt-3">
                  {t('weeklyPlan.aiGeneratingDescription')}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedPlanId(null); setIsEditing(false); setEditedSections({}); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{plan?.theme || "..."}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={plan?.status === "published" ? "default" : "secondary"} className={plan?.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                {plan?.status === "published" ? (isEn ? "Published" : (isAr ? "منشورة" : "Published")) : (isEn ? "Draft" : (isAr ? "مسودة" : "Draft"))}
              </Badge>
              <span className="text-xs text-gray-500">{plan?.weekStartDate} - {plan?.weekEndDate}</span>
              <span className="text-xs text-gray-500">
                {AGE_GROUPS.find(g => g.value === plan?.ageGroup)?.label || plan?.ageGroup}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
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

      {/* Plan Sections */}
      {selectedPlan.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : sections ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(SECTION_ICONS).map(([key, config]) => {
            const Icon = config.icon;
            const sectionContent = sections[key];
            const colorClasses = config.color.split(" ");
            const labelKey = SECTION_LABEL_KEYS[key];

            return (
              <Card key={key} className={`border ${colorClasses[1] || ""}`}>
                <CardHeader className={`py-3 px-4 ${colorClasses[0] || ""}`}>
                  <CardTitle className={`text-sm font-bold flex items-center gap-2 ${colorClasses[2] || ""}`}>
                    <Icon className="h-4 w-4" />
                    {t(`weeklyPlan.${labelKey}`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
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
      ) : (
        <div className="text-center py-10 text-gray-400">{t('weeklyPlan.noContent')}</div>
      )}
    </div>
  );
}
