import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, Star, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";

const EYFS_AREAS = [
  "التواصل واللغة",
  "النمو الجسدي",
  "النمو الشخصي والاجتماعي والعاطفي",
  "القراءة والكتابة",
  "الرياضيات",
  "فهم العالم",
  "الفنون التعبيرية والتصميم",
];

const LEVELS = [
  { value: "emerging", label: "ناشئ", color: "bg-yellow-100 text-yellow-800" },
  { value: "developing", label: "متطور", color: "bg-blue-100 text-blue-800" },
  { value: "secure", label: "متمكن", color: "bg-green-100 text-green-800" },
  { value: "exceeding", label: "متفوق", color: "bg-purple-100 text-purple-800" },
];

export default function ParentObservations() {
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("observations");

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

  if (loadingChildren) return <PageSkeleton variant="detail" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الملاحظات والتقييمات</h1>

      {/* Child Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="font-medium whitespace-nowrap">اختر الطفل:</label>
            <Select value={selectedChild?.toString() || ""} onValueChange={(v) => setSelectedChild(Number(v))}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="اختر طفلاً" />
              </SelectTrigger>
              <SelectContent>
                {children?.map((child: any) => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    <div className="flex items-center gap-2">
                      {child.photoUrl && <img src={child.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />}
                      <span>{child.firstName} {child.lastName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedChild && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="observations">الملاحظات التعليمية</TabsTrigger>
            <TabsTrigger value="assessments">تقييمات EYFS</TabsTrigger>
            <TabsTrigger value="progress">التقدم</TabsTrigger>
          </TabsList>

          {/* Learning Observations Tab */}
          <TabsContent value="observations" className="space-y-4">
            {observations && observations.length > 0 ? (
              <div className="space-y-3">
                {observations.map((obs: any) => (
                  <Card key={obs.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-green-600" />
                            <h3 className="font-medium">{obs.title}</h3>
                          </div>
                          <Badge variant="outline" className="text-xs">{obs.area}</Badge>
                          <p className="text-sm text-muted-foreground mt-2">{obs.description}</p>
                          {obs.nextSteps && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                              <span className="font-medium text-blue-700">الخطوات التالية: </span>
                              <span className="text-blue-600">{obs.nextSteps}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(obs.observedAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <EmptyState variant="observations" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* EYFS Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4">
            {EYFS_AREAS.map(area => {
              const areaAssessments = assessmentsByArea[area] || [];
              const latestLevel = areaAssessments[0]?.level;
              const levelInfo = LEVELS.find(l => l.value === latestLevel);
              return (
                <Card key={area}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{area}</CardTitle>
                      {levelInfo && <Badge className={levelInfo.color}>{levelInfo.label}</Badge>}
                    </div>
                  </CardHeader>
                  {areaAssessments.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {areaAssessments.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                            <div>
                              <span className="text-muted-foreground">{a.aspect || '-'}</span>
                              {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{LEVELS.find(l => l.value === a.level)?.label}</Badge>
                              <span className="text-xs text-muted-foreground">{new Date(a.assessedAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  ملخص تقدم طفلك
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EYFS_AREAS.map(area => {
                    const areaAssessments = assessmentsByArea[area] || [];
                    const latestLevel = areaAssessments[0]?.level || 'none';
                    const levelInfo = LEVELS.find(l => l.value === latestLevel);
                    const progressWidth = latestLevel === 'emerging' ? '25%' : latestLevel === 'developing' ? '50%' : latestLevel === 'secure' ? '75%' : latestLevel === 'exceeding' ? '100%' : '0%';
                    return (
                      <div key={area} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{area}</span>
                          {levelInfo && <Badge className={`${levelInfo.color} text-xs`}>{levelInfo.label}</Badge>}
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: progressWidth }} />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3" />
                          <span>{areaAssessments.length} تقييم</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!selectedChild && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">اختر طفلاً لعرض الملاحظات والتقييمات</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
