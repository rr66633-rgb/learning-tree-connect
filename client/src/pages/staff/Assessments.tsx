import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Plus, Eye, Star, TrendingUp } from "lucide-react";

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

export default function Assessments() {
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("assessments");
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({ area: "", subArea: "", level: "emerging" as const, notes: "", evidence: "" });
  const [observationForm, setObservationForm] = useState({ area: "", title: "", description: "", evidence: "", nextSteps: "" });

  const { data: children } = trpc.children.list.useQuery();
  const { data: assessments, refetch: refetchAssessments } = trpc.eyfs.assessments.useQuery(
    { childId: selectedChild! },
    { enabled: !!selectedChild }
  );
  const { data: observations, refetch: refetchObservations } = trpc.observations.list.useQuery(
    { childId: selectedChild! },
    { enabled: !!selectedChild }
  );

  const createAssessment = trpc.eyfs.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة التقييم بنجاح");
      setShowAssessmentDialog(false);
      setAssessmentForm({ area: "", subArea: "", level: "emerging", notes: "", evidence: "" });
      refetchAssessments();
    },
    onError: () => toast.error("حدث خطأ أثناء إضافة التقييم"),
  });

  const createObservation = trpc.observations.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الملاحظة بنجاح");
      setShowObservationDialog(false);
      setObservationForm({ area: "", title: "", description: "", evidence: "", nextSteps: "" });
      refetchObservations();
    },
    onError: () => toast.error("حدث خطأ أثناء إضافة الملاحظة"),
  });

  const assessmentsByArea = useMemo(() => {
    if (!assessments) return {};
    const grouped: Record<string, any[]> = {};
    assessments.forEach((a: any) => {
      if (!grouped[a.area]) grouped[a.area] = [];
      grouped[a.area].push(a);
    });
    return grouped;
  }, [assessments]);

  const selectedChildData = children?.find((c: any) => c.id === selectedChild);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">التقييمات والملاحظات التعليمية</h1>
      </div>

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
                      {(child as any).photoUrl && <img src={(child as any).photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />}
                      <span>{child.firstName} {child.lastName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChildData && (
              <div className="flex items-center gap-2 mr-4">
                {(selectedChildData as any).photoUrl && (
                  <img src={(selectedChildData as any).photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-green-200" />
                )}
                <span className="font-medium">{selectedChildData.firstName} {selectedChildData.lastName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedChild && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="assessments">تقييمات EYFS</TabsTrigger>
            <TabsTrigger value="observations">الملاحظات التعليمية</TabsTrigger>
            <TabsTrigger value="progress">التقدم</TabsTrigger>
          </TabsList>

          {/* EYFS Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showAssessmentDialog} onOpenChange={setShowAssessmentDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 ml-2" />إضافة تقييم</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة تقييم EYFS</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">المجال</label>
                      <Select value={assessmentForm.area} onValueChange={(v) => setAssessmentForm(p => ({ ...p, area: v }))}>
                        <SelectTrigger><SelectValue placeholder="اختر المجال" /></SelectTrigger>
                        <SelectContent>
                          {EYFS_AREAS.map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">الجانب الفرعي</label>
                      <Input value={assessmentForm.subArea} onChange={(e) => setAssessmentForm(p => ({ ...p, subArea: e.target.value }))} placeholder="مثال: الاستماع والانتباه" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">المستوى</label>
                      <Select value={assessmentForm.level} onValueChange={(v: any) => setAssessmentForm(p => ({ ...p, level: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LEVELS.map(l => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">ملاحظات</label>
                      <Textarea value={assessmentForm.notes} onChange={(e) => setAssessmentForm(p => ({ ...p, notes: e.target.value }))} placeholder="ملاحظات إضافية..." />
                    </div>
                    <Button className="w-full" onClick={() => createAssessment.mutate({ childId: selectedChild!, ...assessmentForm })} disabled={!assessmentForm.area || createAssessment.isPending}>
                      {createAssessment.isPending ? "جاري الحفظ..." : "حفظ التقييم"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Assessments by Area */}
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
                        {areaAssessments.slice(0, 3).map((a: any) => (
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

          {/* Learning Observations Tab */}
          <TabsContent value="observations" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showObservationDialog} onOpenChange={setShowObservationDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 ml-2" />إضافة ملاحظة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة ملاحظة تعليمية</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">المجال</label>
                      <Select value={observationForm.area} onValueChange={(v) => setObservationForm(p => ({ ...p, area: v }))}>
                        <SelectTrigger><SelectValue placeholder="اختر المجال" /></SelectTrigger>
                        <SelectContent>
                          {EYFS_AREAS.map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">العنوان</label>
                      <Input value={observationForm.title} onChange={(e) => setObservationForm(p => ({ ...p, title: e.target.value }))} placeholder="عنوان الملاحظة" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">الوصف</label>
                      <Textarea value={observationForm.description} onChange={(e) => setObservationForm(p => ({ ...p, description: e.target.value }))} placeholder="وصف تفصيلي للملاحظة..." rows={4} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">الخطوات التالية</label>
                      <Textarea value={observationForm.nextSteps} onChange={(e) => setObservationForm(p => ({ ...p, nextSteps: e.target.value }))} placeholder="ما هي الخطوات التالية لتطوير الطفل؟" rows={2} />
                    </div>
                    <Button className="w-full" onClick={() => createObservation.mutate({ childId: selectedChild!, ...observationForm })} disabled={!observationForm.area || !observationForm.title || !observationForm.description || createObservation.isPending}>
                      {createObservation.isPending ? "جاري الحفظ..." : "حفظ الملاحظة"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

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
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">لا توجد ملاحظات تعليمية بعد</p>
                  <p className="text-sm text-muted-foreground">أضف ملاحظات لتتبع تقدم الطفل</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  ملخص التقدم
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
                          <span>•</span>
                          <span>{(observations || []).filter((o: any) => o.area === area).length} ملاحظة</span>
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
            <h3 className="text-lg font-medium text-muted-foreground">اختر طفلاً لعرض التقييمات</h3>
            <p className="text-sm text-muted-foreground mt-1">يمكنك إضافة تقييمات EYFS وملاحظات تعليمية لكل طفل</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
