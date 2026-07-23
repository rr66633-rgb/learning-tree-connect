import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, Star, TrendingUp, Sparkles, GraduationCap, Palette } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useTranslation } from "react-i18next";

const getEYFS_AREAS = (isAr: boolean) => ([
  { name: (isAr ? "التواصل واللغة" : "Communication & Language"), icon: "💬", color: "from-blue-500 to-blue-600" },
  { name: (isAr ? "النمو الجسدي" : "Physical Development"), icon: "🏃", color: "from-green-500 to-green-600" },
  { name: (isAr ? "النمو الشخصي والاجتماعي والعاطفي" : "Personal, Social & Emotional Development"), icon: "💛", color: "from-yellow-500 to-yellow-600" },
  { name: (isAr ? "القراءة والكتابة" : "Literacy"), icon: "📖", color: "from-indigo-500 to-indigo-600" },
  { name: (isAr ? "الرياضيات" : "Mathematics"), icon: "🔢", color: "from-purple-500 to-purple-600" },
  { name: (isAr ? "فهم العالم" : "Understanding the World"), icon: "🌍", color: "from-teal-500 to-teal-600" },
  { name: (isAr ? "الفنون التعبيرية والتصميم" : "Expressive Arts & Design"), icon: "🎨", color: "from-pink-500 to-pink-600" },
]);

const getLEVELS = (isAr: boolean) => ([
  { value: "emerging", label: (isAr ? "ناشئ" : "Emerging"), color: "bg-amber-100 text-amber-700 border-amber-200", progressColor: "bg-amber-400" },
  { value: "developing", label: (isAr ? "متطور" : "Advanced"), color: "bg-blue-100 text-blue-700 border-blue-200", progressColor: "bg-blue-500" },
  { value: "secure", label: (isAr ? "متمكن" : "Proficient"), color: "bg-emerald-100 text-emerald-700 border-emerald-200", progressColor: "bg-emerald-500" },
  { value: "exceeding", label: (isAr ? "متفوق" : "Superior"), color: "bg-purple-100 text-purple-700 border-purple-200", progressColor: "bg-purple-500" },
]);

export default function ParentObservations() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const isAr = i18n.language === "ar";
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("progress");

  const { data: children, isLoading: loadingChildren } = trpc.children.list.useQuery();
  const { data: assessments, isLoading: loadingAssessments } = trpc.eyfs.assessments.useQuery(
    { childId: selectedChild! },
    { enabled: !!selectedChild }
  );
  const { data: observations } = trpc.observations.list.useQuery(
    { childId: selectedChild! },
    { enabled: !!selectedChild }
  );

  const assessmentsByArea = useMemo(() => {
    if (!assessments) return {};
    const grouped: Record<string, any[]> = {};
    assessments.forEach((a: any) => {
      if (!grouped[a.area]) grouped[a.area] = [];
      grouped[a.area].push(a);
    });
    return grouped;
  }, [assessments]);

  // Auto-select first child
  useMemo(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children]);

  if (loadingChildren) return <PageSkeleton variant="detail" />;

  const tabs = [
    { id: "progress", label: (isAr ? "التقدم" : "Progress"), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", activeBg: "bg-emerald-100 border-emerald-300" },
    { id: "assessments", label: (isAr ? "تقييمات EYFS" : "EYFS Assessments"), icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", activeBg: "bg-blue-100 border-blue-300" },
    { id: "observations", label: (isAr ? "الملاحظات" : "Notes"), icon: Eye, color: "text-purple-600", bg: "bg-purple-50", activeBg: "bg-purple-100 border-purple-300" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header with gradient */}
      <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{isAr ? "الملاحظات والتقييمات" : "Notes & Evaluations"}</h1>
        </div>
        <p className="text-sm text-muted-foreground mr-13">{isAr ? "تابعي تطور طفلك التعليمي" : "Track your child's educational development"}</p>
      </div>

      {/* Child Selection - Compact */}
      {children && children.length > 1 && (
        <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
          <span className="text-sm font-medium text-muted-foreground">{isAr ? "الطفل:" : "Child:"}</span>
          <Select value={selectedChild?.toString() || ""} onValueChange={(v) => setSelectedChild(Number(v))}>
            <SelectTrigger className="max-w-[200px] h-9 rounded-lg">
              <SelectValue placeholder={isAr ? "اختر طفلاً" : "Select a Child"} />
            </SelectTrigger>
            <SelectContent>
              {children?.map((child: any) => (
                <SelectItem key={child.id} value={child.id.toString()}>
                  {child.firstName} {child.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedChild && (
        <>
          {/* Custom Tabs with Colors */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                  activeTab === tab.id
                    ? `${tab.activeBg} ${tab.color} shadow-sm`
                    : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Progress Tab */}
          {activeTab === "progress" && (
            <div className="space-y-4">
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-l from-emerald-50 to-transparent">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    {isAr ? "ملخص تقدم طفلك" : "Child's Progress Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getEYFS_AREAS(isAr).map(area => {
                    const areaAssessments = assessmentsByArea[area.name] || [];
                    const latestLevel = areaAssessments[0]?.level || 'none';
                    const levelInfo = getLEVELS(isAr).find(l => l.value === latestLevel);
                    const progressWidth = latestLevel === 'emerging' ? '25%' : latestLevel === 'developing' ? '50%' : latestLevel === 'secure' ? '75%' : latestLevel === 'exceeding' ? '100%' : '5%';
                    return (
                      <div key={area.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{area.icon}</span>
                            <span className="text-sm font-medium">{area.name}</span>
                          </div>
                          {levelInfo && <Badge className={`${levelInfo.color} text-xs border`}>{levelInfo.label}</Badge>}
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 bg-gradient-to-l ${area.color}`}
                            style={{ width: progressWidth }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 text-amber-400" />
                          <span>{areaAssessments.length} {isAr ? "تقييم" : "assessments"}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* EYFS Assessments Tab */}
          {activeTab === "assessments" && (
            <div className="space-y-3">
              {getEYFS_AREAS(isAr).map(area => {
                const areaAssessments = assessmentsByArea[area.name] || [];
                const latestLevel = areaAssessments[0]?.level;
                const levelInfo = getLEVELS(isAr).find(l => l.value === latestLevel);
                return (
                  <Card key={area.name} className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{area.icon}</span>
                          <CardTitle className="text-sm font-semibold">{area.name}</CardTitle>
                        </div>
                        {levelInfo && <Badge className={`${levelInfo.color} text-xs border`}>{levelInfo.label}</Badge>}
                      </div>
                    </CardHeader>
                    {areaAssessments.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {areaAssessments.map((a: any) => (
                            <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/30 pb-2 last:border-0">
                              <div>
                                <span className="text-muted-foreground">{a.aspect || '-'}</span>
                                {a.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{a.notes}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{getLEVELS(isAr).find(l => l.value === a.level)?.label}</Badge>
                                <span className="text-xs text-muted-foreground">{new Date(a.assessedAt).toLocaleDateString(locale)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                    {areaAssessments.length === 0 && (
                      <CardContent className="pt-0 pb-4">
                        <p className="text-xs text-muted-foreground">{isAr ? "لا توجد تقييمات بعد" : "No evaluations yet"}</p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Learning Observations Tab */}
          {activeTab === "observations" && (
            <div className="space-y-3">
              {observations && observations.length > 0 ? (
                observations.map((obs: any) => (
                  <Card key={obs.id} className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-green-100 flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-green-600" />
                            </div>
                            <h3 className="font-medium text-sm">{obs.title}</h3>
                          </div>
                          <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">{obs.area}</Badge>
                          <p className="text-sm text-muted-foreground">{obs.description}</p>
                          {obs.nextSteps && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-xl text-sm border border-blue-100">
                              <span className="font-medium text-blue-700">{isAr ? "الخطوات التالية:" : "Next Steps:"}</span>
                              <span className="text-blue-600">{obs.nextSteps}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-1 rounded-lg">{new Date(obs.observedAt).toLocaleDateString(locale)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-10">
                    <EmptyState variant="observations" />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {!selectedChild && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">{isAr ? "اختر طفلاً" : "Select a Child"}</h3>
            <p className="text-sm text-muted-foreground">{isAr ? "لعرض الملاحظات والتقييمات" : "To view notes and assessments"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
