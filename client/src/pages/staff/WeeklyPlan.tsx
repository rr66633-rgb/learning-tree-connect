import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  CalendarDays, Sparkles, Copy, Download, Save, Loader2, BookOpen, 
  Clock, FileText, Trash2, Send, Plus, ChevronLeft, Edit3, Eye,
  BookMarked, Palette, FlaskConical, Music, Home, MessageSquare,
  Calculator, Dumbbell, Hand, Moon
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

const SECTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  theme_overview: { label: "نظرة عامة على الموضوع", icon: BookOpen, color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  learning_objectives: { label: "أهداف التعلم", icon: FileText, color: "bg-blue-50 border-blue-200 text-blue-800" },
  arabic_activities: { label: "أنشطة اللغة العربية", icon: BookMarked, color: "bg-amber-50 border-amber-200 text-amber-800" },
  english_activities: { label: "أنشطة اللغة الإنجليزية", icon: BookMarked, color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  math_activities: { label: "أنشطة الرياضيات", icon: Calculator, color: "bg-purple-50 border-purple-200 text-purple-800" },
  science_activities: { label: "أنشطة العلوم", icon: FlaskConical, color: "bg-teal-50 border-teal-200 text-teal-800" },
  art_activities: { label: "أنشطة الفنون", icon: Palette, color: "bg-pink-50 border-pink-200 text-pink-800" },
  sensory_activities: { label: "أنشطة حسية", icon: Hand, color: "bg-orange-50 border-orange-200 text-orange-800" },
  physical_activities: { label: "أنشطة بدنية", icon: Dumbbell, color: "bg-red-50 border-red-200 text-red-800" },
  quran_islamic: { label: "القرآن والدراسات الإسلامية", icon: Moon, color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  story_of_week: { label: "قصة الأسبوع", icon: BookOpen, color: "bg-violet-50 border-violet-200 text-violet-800" },
  song_of_week: { label: "نشيد الأسبوع", icon: Music, color: "bg-sky-50 border-sky-200 text-sky-800" },
  home_activity: { label: "نشاط منزلي", icon: Home, color: "bg-lime-50 border-lime-200 text-lime-800" },
  parent_notes: { label: "ملاحظات لأولياء الأمور", icon: MessageSquare, color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
};

const AGE_GROUPS = [
  { value: "nursery", label: "الحضانة (٢-٣ سنوات)" },
  { value: "kg1", label: "تمهيدي أول KG1 (٣-٤ سنوات)" },
  { value: "kg2", label: "تمهيدي ثاني KG2 (٤-٥ سنوات)" },
  { value: "kg3", label: "تمهيدي ثالث KG3 (٥-٦ سنوات)" },
];

function SectionContent({ content, sectionKey }: { content: any; sectionKey: string }) {
  if (!content) return <p className="text-gray-400 text-sm">لا يوجد محتوى</p>;

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
                    <span className="font-medium">المواد:</span> {Array.isArray(item.materials) ? item.materials.join("، ") : item.materials}
                  </p>
                )}
                {item.duration && <p className="text-xs text-gray-500"><span className="font-medium">المدة:</span> {item.duration}</p>}
                {item.implementation && <p className="text-xs text-gray-500"><span className="font-medium">التنفيذ:</span> {item.implementation}</p>}
                {item.steps && <p className="text-xs text-gray-500"><span className="font-medium">الخطوات:</span> {Array.isArray(item.steps) ? item.steps.join(" → ") : item.steps}</p>}
                {item.concept && <p className="text-xs text-gray-500"><span className="font-medium">المفهوم:</span> {item.concept}</p>}
                {item.math_concept && <p className="text-xs text-gray-500"><span className="font-medium">المفهوم الرياضي:</span> {item.math_concept}</p>}
                {item.experiment && <p className="text-xs text-gray-500"><span className="font-medium">التجربة:</span> {item.experiment}</p>}
                {item.targeted_senses && <p className="text-xs text-gray-500"><span className="font-medium">الحواس المستهدفة:</span> {Array.isArray(item.targeted_senses) ? item.targeted_senses.join("، ") : item.targeted_senses}</p>}
                {item.targeted_skills && <p className="text-xs text-gray-500"><span className="font-medium">المهارات المستهدفة:</span> {Array.isArray(item.targeted_skills) ? item.targeted_skills.join("، ") : item.targeted_skills}</p>}
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
          const labelMap: Record<string, string> = {
            surah: "السورة", dua: "الدعاء", value: "القيمة", activity: "النشاط",
            title: "العنوان", summary: "الملخص", discussion_questions: "أسئلة المناقشة",
            lessons: "الدروس المستفادة", lyrics: "الكلمات", movements: "الحركات",
            description: "الوصف", materials: "المواد", connection: "الارتباط",
            hadith: "الحديث", ayah: "الآية", islamic_value: "القيمة الإسلامية",
            memorization: "الحفظ", religious_activity: "النشاط الديني",
          };
          const displayLabel = labelMap[key] || key;
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

export default function WeeklyPlanPage() {
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
      toast.success("تم إنشاء الخطة الأسبوعية بنجاح!");
      setSelectedPlanId(data.id);
      setView("preview");
      plansQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "فشل في إنشاء الخطة. يرجى المحاولة مرة أخرى.");
    },
  });

  const saveMutation = trpc.weeklyPlan.save.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التعديلات بنجاح");
      setIsEditing(false);
      selectedPlan.refetch();
    },
    onError: () => toast.error("فشل في حفظ التعديلات"),
  });

  const publishMutation = trpc.weeklyPlan.publish.useMutation({
    onSuccess: () => {
      toast.success("تم نشر الخطة الأسبوعية وإشعار أولياء الأمور");
      selectedPlan.refetch();
      plansQuery.refetch();
    },
    onError: (err) => toast.error(err.message || "فشل في نشر الخطة"),
  });

  const duplicateMutation = trpc.weeklyPlan.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("تم نسخ الخطة بنجاح");
      setSelectedPlanId(data.id);
      setView("preview");
      plansQuery.refetch();
    },
    onError: () => toast.error("فشل في نسخ الخطة"),
  });

  const deleteMutation = trpc.weeklyPlan.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الخطة");
      setSelectedPlanId(null);
      setView("list");
      plansQuery.refetch();
    },
    onError: () => toast.error("فشل في حذف الخطة"),
  });

  const handleGenerate = () => {
    if (!ageGroup || !weekStart || !weekEnd || !theme) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
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
    if (confirm("هل أنت متأكد من نشر هذه الخطة؟ سيتم إشعار جميع أولياء أمور الفصل.")) {
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
            <h1 className="text-2xl font-bold text-gray-900">الخطة الأسبوعية</h1>
            <p className="text-sm text-gray-500 mt-1">إنشاء وإدارة الخطط الأسبوعية بالذكاء الاصطناعي</p>
          </div>
          <Button onClick={() => setView("generate")} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 ml-2" />
            إنشاء خطة جديدة
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
              <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد خطط أسبوعية بعد</h3>
              <p className="text-sm text-gray-400 mb-6 text-center">ابدأ بإنشاء أول خطة أسبوعية باستخدام الذكاء الاصطناعي</p>
              <Button onClick={() => setView("generate")} variant="outline">
                <Sparkles className="h-4 w-4 ml-2" />
                إنشاء خطة جديدة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plansQuery.data.map((plan: any) => (
              <Card 
                key={plan.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-r-4"
                style={{ borderRightColor: plan.status === "published" ? "#10b981" : "#f59e0b" }}
                onClick={() => { setSelectedPlanId(plan.id); setView("preview"); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={plan.status === "published" ? "default" : "secondary"} className={plan.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                      {plan.status === "published" ? "منشورة" : "مسودة"}
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
                    <span>{new Date(plan.createdAt).toLocaleDateString("ar-SA")}</span>
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
            <h1 className="text-2xl font-bold text-gray-900">إنشاء خطة أسبوعية جديدة</h1>
            <p className="text-sm text-gray-500 mt-1">سيقوم الذكاء الاصطناعي بإنشاء خطة كاملة من 14 قسماً</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classroom */}
              <div className="space-y-2">
                <Label>الفصل (اختياري)</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
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
                <Label>الفئة العمرية *</Label>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة العمرية" />
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
                <Label>بداية الأسبوع *</Label>
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
                <Label>نهاية الأسبوع *</Label>
                <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
              </div>

              {/* Theme */}
              <div className="space-y-2 md:col-span-2">
                <Label>الموضوع الأسبوعي *</Label>
                <Input 
                  value={theme} 
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="مثال: الفصول الأربعة، الحيوانات، الماء، الفضاء..."
                  className="text-lg"
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>لغة الخطة</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">عربي</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bilingual">ثنائي اللغة</SelectItem>
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
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري إنشاء الخطة... (قد يستغرق 15-30 ثانية)
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 ml-2" />
                    إنشاء الخطة الأسبوعية بالذكاء الاصطناعي
                  </>
                )}
              </Button>
              {generateMutation.isPending && (
                <p className="text-sm text-gray-500 mt-3">
                  يقوم الذكاء الاصطناعي بإنشاء خطة كاملة تشمل 14 قسماً مع أنشطة مفصلة ومواد مطلوبة...
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
                {plan?.status === "published" ? "منشورة" : "مسودة"}
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
                  <Edit3 className="h-4 w-4 ml-1" />
                  تعديل
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSaveEdits} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 ml-1" />
                  حفظ التعديلات
                </Button>
              )}
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePublish} disabled={publishMutation.isPending}>
                <Send className="h-4 w-4 ml-1" />
                نشر وإشعار الأهل
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate({ id: selectedPlanId! })}>
            <Copy className="h-4 w-4 ml-1" />
            نسخ
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            // Trigger PDF download (handled in separate component)
            window.dispatchEvent(new CustomEvent("download-weekly-plan-pdf", { detail: { plan } }));
          }}>
            <Download className="h-4 w-4 ml-1" />
            تحميل PDF
          </Button>
          {plan?.status === "draft" && (
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => {
              if (confirm("هل أنت متأكد من حذف هذه الخطة؟")) {
                deleteMutation.mutate({ id: selectedPlanId! });
              }
            }}>
              <Trash2 className="h-4 w-4 ml-1" />
              حذف
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
          {Object.entries(SECTION_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const sectionContent = sections[key];
            const colorClasses = config.color.split(" ");

            return (
              <Card key={key} className={`border ${colorClasses[1] || ""}`}>
                <CardHeader className={`py-3 px-4 ${colorClasses[0] || ""}`}>
                  <CardTitle className={`text-sm font-bold flex items-center gap-2 ${colorClasses[2] || ""}`}>
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {isEditing ? (
                    <SectionEditor 
                      content={editedSections[key] !== undefined ? editedSections[key] : sectionContent}
                      onChange={(val) => setEditedSections(prev => ({ ...prev, [key]: val }))}
                    />
                  ) : (
                    <SectionContent content={sectionContent} sectionKey={key} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">لا يوجد محتوى</div>
      )}
    </div>
  );
}
