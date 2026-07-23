import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain,
  TrendingUp,
  Star,
  Target,
  GraduationCap,
  Heart,
  MessageCircle,
  Palette,
  Calculator,
  Globe,
  Activity,
  FileText,
  Lightbulb,
  Home,
  BookOpen,
  Clock,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "react-i18next";

const areaIcons: Record<string, any> = {
  "CL": MessageCircle,
  "PD": Activity,
  "PSED": Heart,
  "L": FileText,
  "M": Calculator,
  "UW": Globe,
  "EAD": Palette,
};

const areaColors: Record<string, string> = {
  "CL": "from-blue-500 to-blue-600",
  "PD": "from-orange-500 to-orange-600",
  "PSED": "from-pink-500 to-pink-600",
  "L": "from-purple-500 to-purple-600",
  "M": "from-indigo-500 to-indigo-600",
  "UW": "from-teal-500 to-teal-600",
  "EAD": "from-rose-500 to-rose-600",
};

const getLevelLabels = (isAr: boolean): Record<string, string>  => ({
  emerging: (isAr ? "ناشئ" : "Emerging"),
  developing: (isAr ? "يتطور" : "Developing"),
  secure: (isAr ? "مستقر" : "Stable"),
  exceeding: (isAr ? "متفوق" : "Superior"),
});

const levelToPercent: Record<string, number> = {
  emerging: 25,
  developing: 50,
  secure: 75,
  exceeding: 100,
};

export default function ParentDevelopment() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const isAr = i18n.language === "ar";
  const { data: childrenData } = trpc.children.list.useQuery({});
  const children = useMemo(() => {
    if (!childrenData) return [];
    return Array.isArray(childrenData) ? childrenData : (childrenData as any)?.children || [];
  }, [childrenData]);

  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const childId = selectedChildId ? parseInt(selectedChildId) : children?.[0]?.id;

  const { data: progress, isLoading: loadingProgress } = trpc.development.getChildProgress.useQuery(
    { childId: childId! },
    { enabled: !!childId }
  );
  const { data: readiness } = trpc.development.getReadinessScores.useQuery(
    { childId: childId! },
    { enabled: !!childId }
  );
  const { data: recommendations } = trpc.development.getRecommendations.useQuery(
    { childId: childId!, type: "home_activity" },
    { enabled: !!childId }
  );
  const { data: milestones } = trpc.development.getMilestones.useQuery(
    {},
    { enabled: !!childId }
  );

  if (!children?.length) {
    return (
      <div className="p-6" dir="rtl">
        <Card className="border-0 shadow-sm">
          <CardContent>
            <EmptyState variant="children" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestReadiness = readiness?.[0];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isAr ? "نمو وتطور طفلي" : "My Child's Growth and Development"}</h1>
            <p className="text-sm text-muted-foreground">{isAr ? "تتبع التقدم عبر مجالات التطور الأساسية" : "Track progress across key development areas"}</p>
          </div>
        </div>
        {children.length > 1 && (
          <Select value={selectedChildId || String(children[0]?.id)} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={isAr ? "اختر الطفل" : "Select Child"} />
            </SelectTrigger>
            <SelectContent>
              {children.map((child: any) => (
                <SelectItem key={child.id} value={String(child.id)}>
                  {child.firstName} {child.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Overall Readiness Score (if available) */}
      {latestReadiness && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                  {isAr ? "الجاهزية المدرسية" : "School Readiness"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{isAr ? "آخر تقييم: " : "Last assessment: "}{new Date(latestReadiness.assessedAt).toLocaleDateString(locale)}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{latestReadiness.overallReadiness}%</div>
                  <p className="text-xs text-muted-foreground">{isAr ? "الدرجة الإجمالية" : "Overall Score"}</p>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: (isAr ? "لغوي" : "Linguistic"), value: latestReadiness.languageReadiness },
                    { label: (isAr ? "اجتماعي" : "Social"), value: latestReadiness.socialReadiness },
                    { label: (isAr ? "عاطفي" : "Emotional"), value: latestReadiness.emotionalReadiness },
                    { label: (isAr ? "معرفي" : "Cognitive"), value: latestReadiness.cognitiveReadiness },
                    { label: (isAr ? "بدني" : "Physical"), value: latestReadiness.physicalReadiness },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <div className="text-sm font-bold text-foreground">{item.value}%</div>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="progress" className="rounded-md">
            <TrendingUp className="w-4 h-4 ml-1" />
            {isAr ? "التقدم" : "Progress"}
          </TabsTrigger>
          <TabsTrigger value="milestones" className="rounded-md">
            <Star className="w-4 h-4 ml-1" />
            {isAr ? "المعالم التطورية" : "Developmental Milestones"}
          </TabsTrigger>
          <TabsTrigger value="activities" className="rounded-md">
            <Home className="w-4 h-4 ml-1" />
            {isAr ? "أنشطة منزلية" : "Home Activities"}
          </TabsTrigger>
        </TabsList>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          {loadingProgress ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : progress && progress.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progress.map((item: any) => {
                const Icon = areaIcons[item.area?.code] || Brain;
                const colorClass = areaColors[item.area?.code] || "from-gray-500 to-gray-600";
                return (
                  <Card key={item.area?.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{isAr ? (item.area?.nameAr || item.area?.nameEn) : (item.area?.nameEn || item.area?.nameAr)}</p>
                          <p className="text-xs text-muted-foreground">{item.observationCount} {isAr ? "ملاحظة مسجلة" : "recorded observations"}</p>
                        </div>
                        {item.trend === "improving" && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">
                            <TrendingUp className="w-3 h-3 ml-1" />
                            {isAr ? "تحسّن" : "Improvement"}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{isAr ? "المستوى الحالي" : "Current Level"}</span>
                          <span className="font-medium">{item.latestLevel ? getLevelLabels(isAr)[item.latestLevel] : (isAr ? "لم يُقيّم" : "Not assessed")}</span>
                        </div>
                        <Progress value={levelToPercent[item.latestLevel] || 0} className="h-2.5" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{isAr ? "ناشئ" : "Emerging"}</span>
                          <span>{isAr ? "يتطور" : "Developing"}</span>
                          <span>{isAr ? "مستقر" : "Stable"}</span>
                          <span>{isAr ? "متفوق" : "Superior"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent>
                <EmptyState variant="development" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          {milestones && milestones.length > 0 ? (
            <div className="space-y-3">
              {milestones.map((milestone: any) => (
                <Card key={milestone.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${milestone.achieved ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                        {milestone.achieved ? <Star className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{milestone.titleAr || milestone.title}</p>
                        <p className="text-xs text-muted-foreground">{milestone.descriptionAr || milestone.description}</p>
                      </div>
                      {milestone.achieved ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">{isAr ? "تم تحقيقه" : "Achieved"}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">{isAr ? "قيد التطور" : "In Development"}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent>
                <EmptyState variant="development" title={isAr ? "لا توجد معالم تطورية مسجلة بعد" : "No developmental milestones recorded yet"} description={isAr ? "ستظهر المعالم التطورية عند تسجيل ملاحظات كافية" : "Developmental milestones will appear when sufficient observations are recorded"} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Home Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-4">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold">{isAr ? "أنشطة مقترحة للمنزل" : "Suggested Home Activities"}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isAr ? "هذه الأنشطة مصممة خصيصاً لدعم تطور طفلك بناءً على ملاحظات المعلم" : "These activities are specifically designed to support your child's development based on teacher observations"}
                  </p>
                </CardContent>
              </Card>

              {recommendations.map((rec: any) => (
                <Card key={rec.recommendation.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <Home className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm">{rec.recommendation.titleAr || rec.recommendation.title}</h4>
                          <Badge variant="outline" className="text-xs">{isAr ? rec.area?.nameAr : (rec.area?.nameEn || rec.area?.nameAr)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {rec.recommendation.descriptionAr || rec.recommendation.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent>
                <EmptyState variant="activities" title={isAr ? "لا توجد أنشطة منزلية مقترحة حالياً" : "No home activities suggested currently"} description={isAr ? "ستظهر الأنشطة المقترحة بعد تحليل ملاحظات المعلم" : "Suggested activities will appear after analyzing teacher feedback"} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
