import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DevelopmentTimeline from "./DevelopmentTimeline";
import DevelopmentReport from "./DevelopmentReport";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Sparkles,
  FileText,
  BarChart3,
  Clock,
  ChevronLeft,
  Loader2,
  GraduationCap,
  Heart,
  MessageCircle,
  Palette,
  Calculator,
  Globe,
  Activity,
} from "lucide-react";

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

const levelLabels: Record<string, string> = {
  emerging: "ناشئ",
  developing: "يتطور",
  secure: "مستقر",
  exceeding: "متفوق",
};

const levelColors: Record<string, string> = {
  emerging: "text-red-600 bg-red-50 border-red-200",
  developing: "text-amber-600 bg-amber-50 border-amber-200",
  secure: "text-emerald-600 bg-emerald-50 border-emerald-200",
  exceeding: "text-blue-600 bg-blue-50 border-blue-200",
};

const levelToPercent: Record<string, number> = {
  emerging: 25,
  developing: 50,
  secure: 75,
  exceeding: 100,
};

export default function ChildDevelopmentProfile() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const childId = parseInt(params.id || "0");

  const { data: progress, isLoading: loadingProgress } = trpc.development.getChildProgress.useQuery({ childId });
  const { data: readiness, isLoading: loadingReadiness } = trpc.development.getReadinessScores.useQuery({ childId });
  const { data: analysis, isLoading: loadingAnalysis } = trpc.development.getLatestAnalysis.useQuery({ childId });
  const { data: benchmark, isLoading: loadingBenchmark } = trpc.development.getBenchmark.useQuery({ childId });
  const { data: recommendations } = trpc.development.getRecommendations.useQuery({ childId, status: "pending" });

  const analyzeMutation = trpc.development.analyzeChild.useMutation({
    onSuccess: () => toast.success("تم تحليل بيانات الطفل بنجاح"),
    onError: (err) => toast.error(err.message),
  });

  const generateReadinessMutation = trpc.development.generateReadinessScore.useMutation({
    onSuccess: () => toast.success("تم توليد درجة الجاهزية المدرسية"),
    onError: (err) => toast.error(err.message),
  });

  if (loadingProgress) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const latestReadiness = readiness?.[0];
  const parsedAnalysis = analysis?.content ? JSON.parse(analysis.content) : null;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff/development")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ملف التطور</h1>
            <p className="text-sm text-muted-foreground">تتبع النمو عبر مجالات EYFS السبعة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => analyzeMutation.mutate({ childId })}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
            تحليل ذكي
          </Button>
          <Button
            variant="outline"
            onClick={() => generateReadinessMutation.mutate({ childId })}
            disabled={generateReadinessMutation.isPending}
          >
            {generateReadinessMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <GraduationCap className="w-4 h-4 ml-2" />}
            جاهزية مدرسية
          </Button>
          <Button onClick={() => navigate(`/staff/development/observations/new?childId=${childId}`)}>
            ملاحظة جديدة
          </Button>
        </div>
      </div>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="progress" className="rounded-md">
            <BarChart3 className="w-4 h-4 ml-1" />
            التقدم
          </TabsTrigger>
          <TabsTrigger value="readiness" className="rounded-md">
            <GraduationCap className="w-4 h-4 ml-1" />
            الجاهزية المدرسية
          </TabsTrigger>
          <TabsTrigger value="analysis" className="rounded-md">
            <Sparkles className="w-4 h-4 ml-1" />
            التحليل الذكي
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="rounded-md">
            <Target className="w-4 h-4 ml-1" />
            المقارنة المعيارية
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-md">
            <Clock className="w-4 h-4 ml-1" />
            الخط الزمني
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-md">
            <FileText className="w-4 h-4 ml-1" />
            التقارير
          </TabsTrigger>
        </TabsList>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progress?.map((item: any) => {
              const Icon = areaIcons[item.area?.code] || Brain;
              const colorClass = areaColors[item.area?.code] || "from-gray-500 to-gray-600";
              const trendIcon = item.trend === "improving" ? TrendingUp : item.trend === "declining" ? TrendingDown : Minus;
              const TrendIcon = trendIcon;
              return (
                <Card key={item.area?.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.area?.nameAr || item.area?.nameEn}</p>
                        <p className="text-xs text-muted-foreground">{item.observationCount} ملاحظة</p>
                      </div>
                      <TrendIcon className={`w-4 h-4 ${item.trend === "improving" ? "text-emerald-500" : item.trend === "declining" ? "text-red-500" : "text-gray-400"}`} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">المستوى الحالي</span>
                        {item.latestLevel ? (
                          <Badge className={`${levelColors[item.latestLevel]} border`}>
                            {levelLabels[item.latestLevel]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">لم يُقيّم</span>
                        )}
                      </div>
                      <Progress value={levelToPercent[item.latestLevel] || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {(!progress || progress.length === 0) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">لا توجد ملاحظات تطورية بعد</p>
                <p className="text-sm mt-1">أضف ملاحظات لبدء تتبع تطور الطفل</p>
                <Button className="mt-4" onClick={() => navigate(`/staff/development/observations/new?childId=${childId}`)}>
                  إضافة أول ملاحظة
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* School Readiness Tab */}
        <TabsContent value="readiness" className="space-y-4">
          {latestReadiness ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">درجات الجاهزية المدرسية</CardTitle>
                  <CardDescription>آخر تقييم: {new Date(latestReadiness.assessedAt).toLocaleDateString("ar-SA")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "الجاهزية اللغوية", value: latestReadiness.languageReadiness, icon: MessageCircle },
                    { label: "الجاهزية الاجتماعية", value: latestReadiness.socialReadiness, icon: Heart },
                    { label: "الجاهزية العاطفية", value: latestReadiness.emotionalReadiness, icon: Heart },
                    { label: "الجاهزية المعرفية", value: latestReadiness.cognitiveReadiness, icon: Brain },
                    { label: "الجاهزية البدنية", value: latestReadiness.physicalReadiness, icon: Activity },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          {item.label}
                        </span>
                        <span className="font-bold">{item.value}%</span>
                      </div>
                      <Progress value={Number(item.value)} className="h-2.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">الدرجة الإجمالية</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/30" />
                      <circle
                        cx="50" cy="50" r="40"
                        stroke="currentColor" strokeWidth="8" fill="none"
                        className="text-emerald-500"
                        strokeDasharray={`${Number(latestReadiness.overallReadiness) * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl font-bold text-foreground">{latestReadiness.overallReadiness}</span>
                        <span className="text-lg text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">الجاهزية الإجمالية للمدرسة</p>
                  <Badge className={`mt-2 ${Number(latestReadiness.overallReadiness) >= 70 ? "bg-emerald-100 text-emerald-700" : Number(latestReadiness.overallReadiness) >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {Number(latestReadiness.overallReadiness) >= 70 ? "جاهز" : Number(latestReadiness.overallReadiness) >= 50 ? "يحتاج دعم" : "غير جاهز بعد"}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">لم يتم تقييم الجاهزية المدرسية بعد</p>
                <p className="text-sm mt-1">أضف ملاحظات كافية ثم اضغط "جاهزية مدرسية" لتوليد التقييم</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {parsedAnalysis ? (
            <div className="space-y-4">
              {/* Strengths */}
              <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    نقاط القوة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {parsedAnalysis.strengths?.map((s: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{typeof s === "string" ? s : s.description || s.area}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Concerns */}
              {parsedAnalysis.concerns?.length > 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-amber-500" />
                      مجالات تحتاج دعم
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {parsedAnalysis.concerns?.map((c: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{typeof c === "string" ? c : c.description || c.area}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">الملخص العام</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {parsedAnalysis.overallSummaryAr || parsedAnalysis.overallSummary || analysis?.contentAr}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">لم يتم إجراء تحليل ذكي بعد</p>
                <p className="text-sm mt-1">أضف ملاحظات كافية ثم اضغط "تحليل ذكي" لتوليد تقرير شامل</p>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  التوصيات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec: any) => (
                    <div key={rec.recommendation.id} className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {rec.recommendation.type === "classroom" ? "نشاط صفي" : rec.recommendation.type === "home" ? "نشاط منزلي" : "تدخل"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{rec.area?.nameAr}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">{rec.recommendation.titleAr || rec.recommendation.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.recommendation.descriptionAr || rec.recommendation.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Benchmark Tab */}
        <TabsContent value="benchmark" className="space-y-4">
          {benchmark ? (
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">المقارنة المعيارية</CardTitle>
                  <CardDescription>مقارنة أداء الطفل بتوقعات EYFS ومتوسط الفصل</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {benchmark.benchmarks?.map((b: any) => (
                      <div key={b.area?.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{b.area?.nameAr || b.area?.nameEn}</span>
                          <Badge variant="outline" className={b.status === "above" ? "text-emerald-600" : b.status === "at" ? "text-blue-600" : "text-amber-600"}>
                            {b.status === "above" ? "أعلى من المتوقع" : b.status === "at" ? "ضمن المتوقع" : "أقل من المتوقع"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 text-center">
                            <p className="text-muted-foreground">الطفل</p>
                            <p className="font-bold text-blue-600">{(b.childAvg * 25).toFixed(0)}%</p>
                          </div>
                          <div className="p-2 rounded bg-gray-50 dark:bg-gray-950/20 text-center">
                            <p className="text-muted-foreground">متوسط الفصل</p>
                            <p className="font-bold text-gray-600">{(b.classAvg * 25).toFixed(0)}%</p>
                          </div>
                          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-center">
                            <p className="text-muted-foreground">المتوقع (EYFS)</p>
                            <p className="font-bold text-emerald-600">{(b.expectedAvg * 25).toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">لا توجد بيانات كافية للمقارنة</p>
                <p className="text-sm mt-1">أضف ملاحظات تطورية لتفعيل المقارنة المعيارية</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <DevelopmentTimeline childId={childId} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <DevelopmentReport childId={childId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
