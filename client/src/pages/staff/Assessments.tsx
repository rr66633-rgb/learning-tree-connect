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
import { useTranslation } from "react-i18next";

// EYFS area keys mapped to i18n keys
const EYFS_AREA_KEYS = [
  "communication",
  "physical",
  "personal",
  "literacy",
  "mathematics",
  "understanding",
  "expressive",
];

// EYFS area values for backend (Arabic)
const getEYFS_AREA_VALUES = (isAr: boolean) => ([
  (isAr ? "التواصل واللغة" : "Communication & Language"),
  (isAr ? "النمو الجسدي" : "Physical Development"),
  (isAr ? "النمو الشخصي والاجتماعي والعاطفي" : "Personal, Social & Emotional Development"),
  (isAr ? "القراءة والكتابة" : "Literacy"),
  (isAr ? "الرياضيات" : "Mathematics"),
  (isAr ? "فهم العالم" : "Understanding the World"),
  (isAr ? "الفنون التعبيرية والتصميم" : "Expressive Arts & Design"),
]);

const LEVEL_KEYS = ["emerging", "developing", "secure", "exceeding"];
const LEVEL_COLORS = [
  "bg-yellow-100 text-yellow-800",
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
];

export default function Assessments() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const isEn = i18n.language === 'en';

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
      toast.success(t('assessments.assessmentAdded'));
      setShowAssessmentDialog(false);
      setAssessmentForm({ area: "", subArea: "", level: "emerging", notes: "", evidence: "" });
      refetchAssessments();
    },
    onError: () => toast.error(t('assessments.assessmentError')),
  });

  const createObservation = trpc.observations.create.useMutation({
    onSuccess: () => {
      toast.success(t('assessments.observationAdded'));
      setShowObservationDialog(false);
      setObservationForm({ area: "", title: "", description: "", evidence: "", nextSteps: "" });
      refetchObservations();
    },
    onError: () => toast.error(t('assessments.observationError')),
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

  // Helper to get translated area name
  const getAreaLabel = (areaIndex: number) => t(`assessments.${EYFS_AREA_KEYS[areaIndex]}`);
  const getLevelLabel = (levelKey: string) => t(`assessments.${levelKey}`);
  const getLevelColor = (levelKey: string) => LEVEL_COLORS[LEVEL_KEYS.indexOf(levelKey)] || "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('assessments.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('assessments.pageSubtitle')}</p>
        </div>
      </div>

      {/* Child Selection */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="font-medium whitespace-nowrap">{t('assessments.selectChildLabel')}</label>
            <Select value={selectedChild?.toString() || ""} onValueChange={(v) => setSelectedChild(Number(v))}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder={t('assessments.selectChildPlaceholder')} />
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
              <div className={`flex items-center gap-2 ${isEn ? 'ml-4' : 'mr-4'}`}>
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
            <TabsTrigger value="assessments">{t('assessments.eyfsTab')}</TabsTrigger>
            <TabsTrigger value="observations">{t('assessments.observationsTab')}</TabsTrigger>
            <TabsTrigger value="progress">{t('assessments.progressTab')}</TabsTrigger>
          </TabsList>

          {/* EYFS Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showAssessmentDialog} onOpenChange={setShowAssessmentDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className={`w-4 h-4 ${isEn ? 'mr-2' : 'ml-2'}`} />{t('assessments.addAssessment')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('assessments.addEyfsAssessment')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">{t('assessments.areaLabel')}</label>
                      <Select value={assessmentForm.area} onValueChange={(v) => setAssessmentForm(p => ({ ...p, area: v }))}>
                        <SelectTrigger><SelectValue placeholder={t('assessments.selectArea')} /></SelectTrigger>
                        <SelectContent>
                          {getEYFS_AREA_VALUES(isAr).map((area, i) => (
                            <SelectItem key={area} value={area}>{getAreaLabel(i)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('assessments.subArea')}</label>
                      <Input value={assessmentForm.subArea} onChange={(e) => setAssessmentForm(p => ({ ...p, subArea: e.target.value }))} placeholder={t('assessments.subAreaPlaceholder')} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('assessments.levelLabel')}</label>
                      <Select value={assessmentForm.level} onValueChange={(v: any) => setAssessmentForm(p => ({ ...p, level: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LEVEL_KEYS.map(l => (
                            <SelectItem key={l} value={l}>{getLevelLabel(l)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('assessments.notesLabel')}</label>
                      <Textarea value={assessmentForm.notes} onChange={(e) => setAssessmentForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('assessments.notesPlaceholder')} />
                    </div>
                    <Button className="w-full" onClick={() => createAssessment.mutate({ childId: selectedChild!, ...assessmentForm })} disabled={!assessmentForm.area || createAssessment.isPending}>
                      {createAssessment.isPending ? t('assessments.saving') : t('assessments.saveAssessment')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Assessments by Area */}
            {getEYFS_AREA_VALUES(isAr).map((area, areaIndex) => {
              const areaAssessments = assessmentsByArea[area] || [];
              const latestLevel = areaAssessments[0]?.level;
              const levelLabel = latestLevel ? getLevelLabel(latestLevel) : null;
              const levelColor = latestLevel ? getLevelColor(latestLevel) : "";
              return (
                <Card key={area}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{getAreaLabel(areaIndex)}</CardTitle>
                      {levelLabel && <Badge className={levelColor}>{levelLabel}</Badge>}
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
                              <Badge variant="outline" className="text-xs">{getLevelLabel(a.level)}</Badge>
                              <span className="text-xs text-muted-foreground">{new Date(a.assessedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-SA')}</span>
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
                  <Button><Plus className={`w-4 h-4 ${isEn ? 'mr-2' : 'ml-2'}`} />{t('assessments.addObservation')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('assessments.addLearningObservation')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">{t('assessments.areaLabel')}</label>
                      <Select value={observationForm.area} onValueChange={(v) => setObservationForm(p => ({ ...p, area: v }))}>
                        <SelectTrigger><SelectValue placeholder={t('assessments.selectArea')} /></SelectTrigger>
                        <SelectContent>
                          {getEYFS_AREA_VALUES(isAr).map((area, i) => (
                            <SelectItem key={area} value={area}>{getAreaLabel(i)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('assessments.observationTitle')}</label>
                      <Input value={observationForm.title} onChange={(e) => setObservationForm(p => ({ ...p, title: e.target.value }))} placeholder={t('assessments.observationTitlePlaceholder')} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('assessments.observationDesc')}</label>
                      <Textarea value={observationForm.description} onChange={(e) => setObservationForm(p => ({ ...p, description: e.target.value }))} placeholder={t('assessments.observationDescPlaceholder')} rows={4} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('assessments.nextSteps')}</label>
                      <Textarea value={observationForm.nextSteps} onChange={(e) => setObservationForm(p => ({ ...p, nextSteps: e.target.value }))} placeholder={t('assessments.nextStepsPlaceholder')} rows={2} />
                    </div>
                    <Button className="w-full" onClick={() => createObservation.mutate({ childId: selectedChild!, ...observationForm })} disabled={!observationForm.area || !observationForm.title || !observationForm.description || createObservation.isPending}>
                      {createObservation.isPending ? t('assessments.saving') : t('assessments.saveObservation')}
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
                              <span className="font-medium text-blue-700">{t('assessments.nextStepsLabel')} </span>
                              <span className="text-blue-600">{obs.nextSteps}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(obs.observedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-SA')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t('assessments.noObservations')}</p>
                  <p className="text-sm text-muted-foreground">{t('assessments.noObservationsDesc')}</p>
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
                  {t('assessments.progressSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getEYFS_AREA_VALUES(isAr).map((area, areaIndex) => {
                    const areaAssessments = assessmentsByArea[area] || [];
                    const latestLevel = areaAssessments[0]?.level || 'none';
                    const levelLabel = LEVEL_KEYS.includes(latestLevel) ? getLevelLabel(latestLevel) : null;
                    const levelColor = getLevelColor(latestLevel);
                    const progressWidth = latestLevel === 'emerging' ? '25%' : latestLevel === 'developing' ? '50%' : latestLevel === 'secure' ? '75%' : latestLevel === 'exceeding' ? '100%' : '0%';
                    return (
                      <div key={area} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{getAreaLabel(areaIndex)}</span>
                          {levelLabel && <Badge className={`${levelColor} text-xs`}>{levelLabel}</Badge>}
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: progressWidth }} />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3" />
                          <span>{areaAssessments.length} {t('assessments.assessmentCount')}</span>
                          <span>•</span>
                          <span>{(observations || []).filter((o: any) => o.area === area).length} {t('assessments.observationCount')}</span>
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
            <h3 className="text-lg font-medium text-muted-foreground">{t('assessments.noChildSelected')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('assessments.noChildSelectedDesc')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
