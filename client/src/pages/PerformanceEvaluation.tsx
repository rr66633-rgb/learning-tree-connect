import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Star, Plus, ClipboardList, Award, Eye } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const ratingLabels: Record<string, string> = {
  excellent: "ممتاز",
  very_good: "جيد جداً",
  good: "جيد",
  acceptable: "مقبول",
  poor: "ضعيف",
};

const ratingColors: Record<string, string> = {
  excellent: "bg-emerald-100 text-emerald-800",
  very_good: "bg-blue-100 text-blue-800",
  good: "bg-sky-100 text-sky-800",
  acceptable: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  reviewed: "تمت المراجعة",
  acknowledged: "تم الاطلاع",
};

const categoryLabels: Record<string, string> = {
  professional: "مهني",
  personal: "شخصي",
  technical: "تقني",
  leadership: "قيادي",
  communication: "تواصل",
};

export default function PerformanceEvaluation() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState("evaluations");
  const [criterionDialogOpen, setCriterionDialogOpen] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEvalId, setViewingEvalId] = useState<number | null>(null);

  // Criterion form
  const [criterionName, setCriterionName] = useState("");
  const [criterionNameAr, setCriterionNameAr] = useState("");
  const [criterionDesc, setCriterionDesc] = useState("");
  const [criterionCategory, setCriterionCategory] = useState("");
  const [criterionMaxScore, setCriterionMaxScore] = useState("5");
  const [editingCriterionId, setEditingCriterionId] = useState<number | null>(null);

  // Evaluation form
  const [evalUserId, setEvalUserId] = useState("");
  const [evalPeriod, setEvalPeriod] = useState("");
  const [evalScores, setEvalScores] = useState<Record<number, number>>({});
  const [evalComments, setEvalComments] = useState<Record<number, string>>({});
  const [evalStrengths, setEvalStrengths] = useState("");
  const [evalImprovements, setEvalImprovements] = useState("");
  const [evalGoals, setEvalGoals] = useState("");
  const [evalNotes, setEvalNotes] = useState("");

  // Queries
  const criteriaQuery = trpc.evaluation.listCriteria.useQuery();
  const evaluationsQuery = trpc.evaluation.listEvaluations.useQuery({});
  const staffQuery = trpc.staffManagement.list.useQuery({});
  const evalDetailQuery = trpc.evaluation.getEvaluation.useQuery(
    { id: viewingEvalId! },
    { enabled: !!viewingEvalId }
  );

  // Mutations
  const upsertCriterion = trpc.evaluation.upsertCriterion.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حفظ المعيار" : "Criterion saved");
      criteriaQuery.refetch();
      setCriterionDialogOpen(false);
      resetCriterionForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCriterion = trpc.evaluation.deleteCriterion.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم حذف المعيار" : "Criterion deleted");
      criteriaQuery.refetch();
    },
  });

  const createEvaluation = trpc.evaluation.createEvaluation.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إنشاء التقييم" : "Evaluation created");
      evaluationsQuery.refetch();
      setEvalDialogOpen(false);
      resetEvalForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const submitEvaluation = trpc.evaluation.submitEvaluation.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تقديم التقييم" : "Evaluation submitted");
      evaluationsQuery.refetch();
    },
  });

  function resetCriterionForm() {
    setCriterionName("");
    setCriterionNameAr("");
    setCriterionDesc("");
    setCriterionCategory("");
    setCriterionMaxScore("5");
    setEditingCriterionId(null);
  }

  function resetEvalForm() {
    setEvalUserId("");
    setEvalPeriod("");
    setEvalScores({});
    setEvalComments({});
    setEvalStrengths("");
    setEvalImprovements("");
    setEvalGoals("");
    setEvalNotes("");
  }

  function openEditCriterion(c: any) {
    setEditingCriterionId(c.id);
    setCriterionName(c.name);
    setCriterionNameAr(c.nameAr || "");
    setCriterionDesc(c.description || "");
    setCriterionCategory(c.category || "");
    setCriterionMaxScore(String(c.maxScore));
    setCriterionDialogOpen(true);
  }

  function handleSaveCriterion() {
    if (!criterionName) {
      toast.error(isAr ? "يرجى إدخال اسم المعيار" : "Please enter criterion name");
      return;
    }
    upsertCriterion.mutate({
      id: editingCriterionId || undefined,
      name: criterionName,
      nameAr: criterionNameAr || undefined,
      description: criterionDesc || undefined,
      category: criterionCategory || undefined,
      maxScore: Number(criterionMaxScore) || 5,
    });
  }

  function handleCreateEvaluation() {
    if (!evalUserId || !evalPeriod) {
      toast.error(isAr ? "يرجى اختيار الموظف والفترة" : "Please select employee and period");
      return;
    }
    const scores = Object.entries(evalScores).map(([criterionId, score]) => ({
      criterionId: Number(criterionId),
      score,
      comment: evalComments[Number(criterionId)] || undefined,
    }));
    if (scores.length === 0) {
      toast.error(isAr ? "يرجى تقييم معيار واحد على الأقل" : "Please rate at least one criterion");
      return;
    }
    createEvaluation.mutate({
      userId: Number(evalUserId),
      period: evalPeriod,
      scores,
      strengths: evalStrengths || undefined,
      improvements: evalImprovements || undefined,
      goals: evalGoals || undefined,
      notes: evalNotes || undefined,
    });
  }

  // Period options
  const periodOptions = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    return [
      { value: `Q1-${year}`, label: `${isAr ? "الربع الأول" : "Q1"} ${year}` },
      { value: `Q2-${year}`, label: `${isAr ? "الربع الثاني" : "Q2"} ${year}` },
      { value: `Q3-${year}`, label: `${isAr ? "الربع الثالث" : "Q3"} ${year}` },
      { value: `Q4-${year}`, label: `${isAr ? "الربع الرابع" : "Q4"} ${year}` },
      { value: `H1-${year}`, label: `${isAr ? "النصف الأول" : "H1"} ${year}` },
      { value: `H2-${year}`, label: `${isAr ? "النصف الثاني" : "H2"} ${year}` },
      { value: `Annual-${year}`, label: `${isAr ? "سنوي" : "Annual"} ${year}` },
    ];
  }, [isAr]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "تقييم الأداء" : "Performance Evaluation"}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="evaluations">{isAr ? "التقييمات" : "Evaluations"}</TabsTrigger>
          <TabsTrigger value="criteria">{isAr ? "معايير التقييم" : "Criteria"}</TabsTrigger>
        </TabsList>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{isAr ? "تقييمات أداء الموظفين" : "Employee performance evaluations"}</p>
            <Button onClick={() => { resetEvalForm(); setEvalDialogOpen(true); }}>
              <Plus className="w-4 h-4 me-2" />
              {isAr ? "تقييم جديد" : "New Evaluation"}
            </Button>
          </div>

          {evaluationsQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (evaluationsQuery.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{isAr ? "لا توجد تقييمات بعد" : "No evaluations yet"}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{isAr ? "الفترة" : "Period"}</TableHead>
                      <TableHead>{isAr ? "التقييم" : "Rating"}</TableHead>
                      <TableHead>{isAr ? "النسبة" : "Score"}</TableHead>
                      <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isAr ? "إجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluationsQuery.data?.map((ev: any) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.userName}</TableCell>
                        <TableCell>{ev.period}</TableCell>
                        <TableCell>
                          {ev.overallRating && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${ratingColors[ev.overallRating] || ""}`}>
                              {ratingLabels[ev.overallRating] || ev.overallRating}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{ev.overallScore ? `${Number(ev.overallScore).toFixed(0)}%` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{statusLabels[ev.status] || ev.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(ev.createdAt).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => { setViewingEvalId(ev.id); setViewDialogOpen(true); }}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            {ev.status === "draft" && (
                              <Button size="sm" variant="outline" onClick={() => submitEvaluation.mutate({ id: ev.id })}>
                                {isAr ? "تقديم" : "Submit"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Criteria Tab */}
        <TabsContent value="criteria" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{isAr ? "معايير تقييم الأداء" : "Performance evaluation criteria"}</p>
            <Button onClick={() => { resetCriterionForm(); setCriterionDialogOpen(true); }}>
              <Plus className="w-4 h-4 me-2" />
              {isAr ? "إضافة معيار" : "Add Criterion"}
            </Button>
          </div>

          {criteriaQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (criteriaQuery.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{isAr ? "لم يتم إضافة معايير بعد" : "No criteria added yet"}</p>
                <p className="text-sm mt-2">{isAr ? "أضف معايير التقييم لبدء تقييم الموظفين" : "Add evaluation criteria to start evaluating employees"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {criteriaQuery.data?.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.nameAr || c.name}</p>
                      {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                      <div className="flex gap-2 mt-1">
                        {c.category && (
                          <Badge variant="outline" className="text-xs">{categoryLabels[c.category] || c.category}</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{isAr ? `أقصى درجة: ${c.maxScore}` : `Max: ${c.maxScore}`}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEditCriterion(c)}>
                        {isAr ? "تعديل" : "Edit"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteCriterion.mutate({ id: c.id })}>
                        {isAr ? "حذف" : "Delete"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Criterion Dialog */}
      <Dialog open={criterionDialogOpen} onOpenChange={setCriterionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCriterionId ? (isAr ? "تعديل المعيار" : "Edit Criterion") : (isAr ? "إضافة معيار جديد" : "Add New Criterion")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? "اسم المعيار (عربي)" : "Criterion Name (Arabic)"} *</Label>
              <Input value={criterionNameAr} onChange={(e) => { setCriterionNameAr(e.target.value); if (!criterionName) setCriterionName(e.target.value); }} placeholder={isAr ? "مثال: الالتزام بالمواعيد" : "e.g. Punctuality"} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "اسم المعيار (إنجليزي)" : "Criterion Name (English)"}</Label>
              <Input value={criterionName} onChange={(e) => setCriterionName(e.target.value)} placeholder="Punctuality" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الوصف" : "Description"}</Label>
              <Textarea value={criterionDesc} onChange={(e) => setCriterionDesc(e.target.value)} placeholder={isAr ? "وصف المعيار..." : "Describe the criterion..."} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? "التصنيف" : "Category"}</Label>
                <Select value={criterionCategory} onValueChange={setCriterionCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر" : "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">{isAr ? "مهني" : "Professional"}</SelectItem>
                    <SelectItem value="personal">{isAr ? "شخصي" : "Personal"}</SelectItem>
                    <SelectItem value="technical">{isAr ? "تقني" : "Technical"}</SelectItem>
                    <SelectItem value="leadership">{isAr ? "قيادي" : "Leadership"}</SelectItem>
                    <SelectItem value="communication">{isAr ? "تواصل" : "Communication"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "أقصى درجة" : "Max Score"}</Label>
                <Input type="number" min="1" max="10" value={criterionMaxScore} onChange={(e) => setCriterionMaxScore(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriterionDialogOpen(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveCriterion} disabled={upsertCriterion.isPending}>
              {isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Evaluation Dialog */}
      <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? "تقييم أداء جديد" : "New Performance Evaluation"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isAr ? "الموظف" : "Employee"} *</Label>
                <Select value={evalUserId} onValueChange={setEvalUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر الموظف" : "Select employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {((staffQuery.data as any)?.items || []).filter((s: any) => true).map((s: any) => (
                      <SelectItem key={s.userId} value={String(s.userId)}>{s.fullNameAr || s.fullNameEn || `موظف #${s.userId}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الفترة" : "Period"} *</Label>
                <Select value={evalPeriod} onValueChange={setEvalPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر الفترة" : "Select period"} />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Criteria scoring */}
            {(criteriaQuery.data?.length ?? 0) > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">{isAr ? "تقييم المعايير" : "Criteria Scoring"}</Label>
                {criteriaQuery.data?.map((c: any) => (
                  <div key={c.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.nameAr || c.name}</span>
                      <span className="text-sm text-muted-foreground">{isAr ? `من ${c.maxScore}` : `out of ${c.maxScore}`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: c.maxScore }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEvalScores((prev) => ({ ...prev, [c.id]: i + 1 }))}
                          className={`p-1 rounded transition-colors ${
                            (evalScores[c.id] || 0) >= i + 1 ? "text-amber-500" : "text-gray-300"
                          }`}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      ))}
                      <span className="ms-2 text-sm font-medium">{evalScores[c.id] || 0}/{c.maxScore}</span>
                    </div>
                    <Input
                      placeholder={isAr ? "ملاحظة (اختياري)" : "Comment (optional)"}
                      value={evalComments[c.id] || ""}
                      onChange={(e) => setEvalComments((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>{isAr ? "نقاط القوة" : "Strengths"}</Label>
              <Textarea value={evalStrengths} onChange={(e) => setEvalStrengths(e.target.value)} placeholder={isAr ? "أبرز نقاط القوة..." : "Key strengths..."} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "نقاط التحسين" : "Areas for Improvement"}</Label>
              <Textarea value={evalImprovements} onChange={(e) => setEvalImprovements(e.target.value)} placeholder={isAr ? "مجالات التحسين..." : "Areas to improve..."} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الأهداف" : "Goals"}</Label>
              <Textarea value={evalGoals} onChange={(e) => setEvalGoals(e.target.value)} placeholder={isAr ? "أهداف الفترة القادمة..." : "Goals for next period..."} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "ملاحظات إضافية" : "Additional Notes"}</Label>
              <Textarea value={evalNotes} onChange={(e) => setEvalNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvalDialogOpen(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleCreateEvaluation} disabled={createEvaluation.isPending}>
              {isAr ? "حفظ التقييم" : "Save Evaluation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Evaluation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) setViewingEvalId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? "تفاصيل التقييم" : "Evaluation Details"}</DialogTitle>
          </DialogHeader>
          {evalDetailQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : evalDetailQuery.data ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "الموظف" : "Employee"}</p>
                  <p className="font-medium">{evalDetailQuery.data.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "الفترة" : "Period"}</p>
                  <p className="font-medium">{evalDetailQuery.data.period}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "التقييم العام" : "Overall Rating"}</p>
                  {evalDetailQuery.data.overallRating && (
                    <span className={`px-2 py-1 rounded text-sm font-medium ${ratingColors[evalDetailQuery.data.overallRating] || ""}`}>
                      {ratingLabels[evalDetailQuery.data.overallRating] || evalDetailQuery.data.overallRating}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "النسبة" : "Score"}</p>
                  <p className="font-bold text-lg">{evalDetailQuery.data.overallScore ? `${Number(evalDetailQuery.data.overallScore).toFixed(0)}%` : "-"}</p>
                </div>
              </div>

              {/* Scores */}
              {evalDetailQuery.data.scores && evalDetailQuery.data.scores.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold">{isAr ? "تفاصيل المعايير" : "Criteria Details"}</p>
                  {evalDetailQuery.data.scores.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{s.criterionNameAr || s.criterionName}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: s.maxScore }, (_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < s.score ? "text-amber-500 fill-amber-500" : "text-gray-300"}`} />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{s.score}/{s.maxScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {evalDetailQuery.data.strengths && (
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "نقاط القوة" : "Strengths"}</p>
                  <p>{evalDetailQuery.data.strengths}</p>
                </div>
              )}
              {evalDetailQuery.data.improvements && (
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "نقاط التحسين" : "Improvements"}</p>
                  <p>{evalDetailQuery.data.improvements}</p>
                </div>
              )}
              {evalDetailQuery.data.goals && (
                <div>
                  <p className="text-sm text-muted-foreground">{isAr ? "الأهداف" : "Goals"}</p>
                  <p>{evalDetailQuery.data.goals}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground py-4">{isAr ? "لم يتم العثور على التقييم" : "Evaluation not found"}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
