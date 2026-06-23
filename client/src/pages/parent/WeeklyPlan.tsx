import { useState } from "react";
import { 
  CalendarDays, Download, Loader2, BookOpen, Clock, FileText, 
  BookMarked, Palette, FlaskConical, Music, Home, MessageSquare,
  Calculator, Dumbbell, Hand, Moon, ChevronLeft, Eye
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

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

const AGE_GROUPS: Record<string, string> = {
  nursery: "الحضانة",
  kg1: "تمهيدي أول",
  kg2: "تمهيدي ثاني",
  kg3: "تمهيدي ثالث",
};

function SectionContent({ content }: { content: any }) {
  if (!content) return <p className="text-gray-400 text-sm">لا يوجد محتوى</p>;

  if (typeof content === "string") {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

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
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

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

export default function ParentWeeklyPlan() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const plansQuery = trpc.weeklyPlan.parentList.useQuery({ limit: 50 });
  const selectedPlan = trpc.weeklyPlan.get.useQuery(
    { id: selectedPlanId! },
    { enabled: !!selectedPlanId }
  );

  // ============ DETAIL VIEW ============
  if (selectedPlanId) {
    const plan = selectedPlan.data;
    const sections = plan?.sections as Record<string, any> | undefined;

    return (
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPlanId(null)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{plan?.theme || "..."}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">{plan?.weekStartDate} - {plan?.weekEndDate}</span>
                <Badge variant="outline" className="text-xs">
                  {AGE_GROUPS[plan?.ageGroup || ""] || plan?.ageGroup}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            window.dispatchEvent(new CustomEvent("download-weekly-plan-pdf", { detail: { plan } }));
          }}>
            <Download className="h-4 w-4 ml-1" />
            تحميل PDF
          </Button>
        </div>

        {/* Plan Sections */}
        {selectedPlan.isLoading ? (
          <PageSkeleton variant="cards" title={false} count={4} />
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
                    <SectionContent content={sectionContent} />
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

  // ============ LIST VIEW ============
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الخطة الأسبوعية</h1>
        <p className="text-sm text-gray-500 mt-1">الخطط الأسبوعية المنشورة لفصل طفلك</p>
      </div>

      {/* Plans List */}
      {plansQuery.isLoading ? (
        <PageSkeleton variant="cards" title={false} count={4} />
      ) : !plansQuery.data?.length ? (
        <Card className="border-dashed">
          <CardContent>
            <EmptyState variant="calendar" title="لا توجد خطط أسبوعية منشورة" description="ستظهر هنا الخطط الأسبوعية عند نشرها من قبل المعلمة" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plansQuery.data.map((plan: any) => (
            <Card 
              key={plan.id} 
              className="cursor-pointer hover:shadow-md transition-shadow border-r-4 border-r-emerald-500"
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {AGE_GROUPS[plan.ageGroup] || plan.ageGroup}
                  </Badge>
                </div>
                <h3 className="font-bold text-gray-800 mb-2 line-clamp-1">{plan.theme}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CalendarDays className="h-3 w-3" />
                  <span>{plan.weekStartDate} - {plan.weekEndDate}</span>
                </div>
                {plan.publishedAt && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>نُشرت: {new Date(plan.publishedAt).toLocaleDateString("ar-SA")}</span>
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <Eye className="h-3 w-3 ml-1" />
                  عرض الخطة
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
