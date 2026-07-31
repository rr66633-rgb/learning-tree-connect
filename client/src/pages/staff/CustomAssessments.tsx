import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, ClipboardList, Share2, ChevronRight, Play } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function CustomAssessments() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [, navigate] = useLocation();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newClassId, setNewClassId] = useState<string>("");
  const [newAgeGroup, setNewAgeGroup] = useState<string>("");

  // Question form
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<string>("multiple_choice");
  const [qOptions, setQOptions] = useState<string[]>(["", ""]);
  const [qCorrectAnswer, setQCorrectAnswer] = useState("");
  const [qMaxRating, setQMaxRating] = useState(5);

  // Translated maps (inside component)
  const AGE_GROUPS: Record<string, string> = {
    nursery: t('customAssessments.nursery'),
    kg1: t('customAssessments.kg1'),
    kg2: t('customAssessments.kg2'),
    kg3: t('customAssessments.kg3'),
  };

  const STATUS_LABELS: Record<string, string> = {
    draft: t('customAssessments.statusDraft'),
    active: t('customAssessments.statusPublished'),
    archived: t('customAssessments.statusArchived'),
  };

  const QUESTION_TYPES: Record<string, string> = {
    multiple_choice: t('customAssessments.typeMultiChoice'),
    true_false: t('customAssessments.typeYesNo'),
    rating: t('customAssessments.typeRating'),
    text: t('customAssessments.typeText'),
  };

  const utils = trpc.useUtils();
  const classesQuery = trpc.classes.list.useQuery();
  const assessmentsQuery = trpc.customAssessment.list.useQuery({});
  const selectedAssessment = trpc.customAssessment.get.useQuery(
    { id: selectedAssessmentId! },
    { enabled: !!selectedAssessmentId }
  );

  const createMutation = trpc.customAssessment.create.useMutation({
    onSuccess: () => {
      toast.success(t('customAssessments.createdSuccess'));
      utils.customAssessment.list.invalidate();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message || t('customAssessments.createError')),
  });

  const updateMutation = trpc.customAssessment.update.useMutation({
    onSuccess: () => {
      toast.success(t('customAssessments.publishedSuccess'));
      utils.customAssessment.list.invalidate();
      utils.customAssessment.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.customAssessment.delete.useMutation({
    onSuccess: () => {
      toast.success(t('customAssessments.deletedSuccess'));
      utils.customAssessment.list.invalidate();
      setSelectedAssessmentId(null);
    },
    onError: (err) => toast.error(err.message || t('customAssessments.deleteError')),
  });

  const addQuestionMutation = trpc.customAssessment.addQuestion.useMutation({
    onSuccess: () => {
      toast.success(t('customAssessments.questionAdded'));
      utils.customAssessment.get.invalidate();
      setShowQuestionDialog(false);
      resetQuestionForm();
    },
    onError: (err) => toast.error(err.message || t('customAssessments.questionAddError')),
  });

  const updateQuestionMutation = trpc.customAssessment.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success(t('customAssessments.questionAdded'));
      utils.customAssessment.get.invalidate();
      setShowQuestionDialog(false);
      resetQuestionForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteQuestionMutation = trpc.customAssessment.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success(t('customAssessments.questionDeleted'));
      utils.customAssessment.get.invalidate();
    },
    onError: (err) => toast.error(err.message || t('customAssessments.questionDeleteError')),
  });

  function resetForm() {
    setNewTitle("");
    setNewDescription("");
    setNewClassId("");
    setNewAgeGroup("");
  }

  function resetQuestionForm() {
    setQText("");
    setQType("multiple_choice");
    setQOptions(["", ""]);
    setQCorrectAnswer("");
    setQMaxRating(5);
    setEditingQuestion(null);
  }

  function handleCreateAssessment() {
    if (!newTitle.trim()) { toast.error(t('customAssessments.fillRequired')); return; }
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      classId: newClassId ? Number(newClassId) : undefined,
      ageGroup: newAgeGroup || undefined,
    });
  }

  function handleSaveQuestion() {
    if (!qText.trim()) { toast.error(t('customAssessments.fillRequired')); return; }
    
    const filteredOptions = qOptions.filter(o => o.trim());
    if (qType === "multiple_choice" && filteredOptions.length < 2) {
      toast.error(t('customAssessments.fillRequired'));
      return;
    }

    if (editingQuestion) {
      updateQuestionMutation.mutate({
        id: editingQuestion.id,
        questionText: qText.trim(),
        questionType: qType as any,
        options: qType === "multiple_choice" ? filteredOptions : null,
        correctAnswer: qCorrectAnswer.trim() || null,
        maxRating: qType === "rating" ? qMaxRating : undefined,
      });
    } else {
      addQuestionMutation.mutate({
        assessmentId: selectedAssessmentId!,
        questionText: qText.trim(),
        questionType: qType as any,
        options: qType === "multiple_choice" ? filteredOptions : undefined,
        correctAnswer: qCorrectAnswer.trim() || undefined,
        maxRating: qType === "rating" ? qMaxRating : undefined,
      });
    }
  }

  function openEditQuestion(q: any) {
    setEditingQuestion(q);
    setQText(q.questionText);
    setQType(q.questionType);
    setQOptions(q.options || ["", ""]);
    setQCorrectAnswer(q.correctAnswer || "");
    setQMaxRating(q.maxRating || 5);
    setShowQuestionDialog(true);
  }

  // ============ DETAIL VIEW ============
  if (selectedAssessmentId) {
    const assessment = selectedAssessment.data;
    const questions = assessment?.questions || [];

    return (
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedAssessmentId(null)}>
              <ChevronRight className="h-4 w-4" />
              {t('customAssessments.back')}
            </Button>
            <div>
              <h1 className="text-xl font-bold">{assessment?.title || "..."}</h1>
              <p className="text-sm text-muted-foreground">{assessment?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={assessment?.shareWithParents || false}
                onCheckedChange={(checked) => {
                  updateMutation.mutate({ id: selectedAssessmentId, shareWithParents: checked });
                }}
              />
              <Label className="text-sm">{t('customAssessments.share')}</Label>
            </div>
            <Select
              value={assessment?.status || "draft"}
              onValueChange={(val) => {
                updateMutation.mutate({ id: selectedAssessmentId, status: val as any });
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('customAssessments.statusDraft')}</SelectItem>
                <SelectItem value="active">{t('customAssessments.statusPublished')}</SelectItem>
                <SelectItem value="archived">{t('customAssessments.statusArchived')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => navigate(`/staff/custom-assessments/${selectedAssessmentId}/apply`)}
            >
              <Play className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
              {t('customAssessments.applyToChild')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(t('customAssessments.confirmDelete'))) {
                  deleteMutation.mutate({ id: selectedAssessmentId });
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('customAssessments.questions')} ({questions.length})</h2>
            <Button size="sm" onClick={() => { resetQuestionForm(); setShowQuestionDialog(true); }}>
              <Plus className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
              {t('customAssessments.addQuestion')}
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('customAssessments.noAssessments')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {questions.map((q: any, idx: number) => (
                <Card key={q.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            {idx + 1}.
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {QUESTION_TYPES[q.questionType]}
                          </Badge>
                        </div>
                        <p className="font-medium">{q.questionText}</p>
                        {q.questionType === "multiple_choice" && q.options && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(q.options as string[]).map((opt: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {opt}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {q.questionType === "rating" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('customAssessments.typeRating')}: 1-{q.maxRating}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditQuestion(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(t('customAssessments.confirmDelete'))) {
                              deleteQuestionMutation.mutate({ id: q.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Question Dialog */}
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? t('customAssessments.addQuestion') : t('customAssessments.addQuestion')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('customAssessments.questionText')}</Label>
                <Textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder={t('customAssessments.questionTextPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t('customAssessments.questionType')}</Label>
                <Select value={qType} onValueChange={setQType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">{t('customAssessments.typeMultiChoice')}</SelectItem>
                    <SelectItem value="true_false">{t('customAssessments.typeYesNo')}</SelectItem>
                    <SelectItem value="rating">{t('customAssessments.typeRating')}</SelectItem>
                    <SelectItem value="text">{t('customAssessments.typeText')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {qType === "multiple_choice" && (
                <div>
                  <Label>{t('customAssessments.options')}</Label>
                  <div className="space-y-2 mt-1">
                    {qOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...qOptions];
                            newOpts[i] = e.target.value;
                            setQOptions(newOpts);
                          }}
                          placeholder={`${t('customAssessments.options').split('(')[0].trim()} ${i + 1}`}
                        />
                        {qOptions.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setQOptions(qOptions.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQOptions([...qOptions, ""])}
                    >
                      <Plus className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
                      {t('customAssessments.addQuestionBtn')}
                    </Button>
                  </div>
                </div>
              )}

              {qType === "rating" && (
                <div>
                  <Label>{t('customAssessments.typeRating')}</Label>
                  <Select value={String(qMaxRating)} onValueChange={(v) => setQMaxRating(Number(v))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>{t('assessments.cancel')}</Button>
              <Button onClick={handleSaveQuestion} disabled={addQuestionMutation.isPending || updateQuestionMutation.isPending}>
                {editingQuestion ? t('assessments.save') : t('customAssessments.addQuestionBtn')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============ LIST VIEW ============
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('customAssessments.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('customAssessments.subtitle')}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className={`h-4 w-4 ${isEn ? 'mr-1' : 'ml-1'}`} />
          {t('customAssessments.createNew')}
        </Button>
      </div>

      {/* Assessments Grid */}
      {assessmentsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-32" />
            </Card>
          ))}
        </div>
      ) : !assessmentsQuery.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('customAssessments.noAssessments')}</p>
            <p className="text-sm mt-1">{t('customAssessments.noAssessmentsDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assessmentsQuery.data?.map((a: any) => (
            <Card
              key={a.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedAssessmentId(a.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge
                    variant={a.status === "active" ? "default" : a.status === "archived" ? "secondary" : "outline"}
                  >
                    {STATUS_LABELS[a.status]}
                  </Badge>
                  {a.shareWithParents && (
                    <Share2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{a.title}</h3>
                {a.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{a.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {a.ageGroup && <Badge variant="outline">{AGE_GROUPS[a.ageGroup] || a.ageGroup}</Badge>}
                  <span>{new Date(a.createdAt).toLocaleDateString(isEn ? "en-US" : "ar-SA")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('customAssessments.createNew')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('customAssessments.assessmentName')} *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t('customAssessments.assessmentNamePlaceholder')}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t('assessments.observationDesc')}</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t('customAssessments.subtitle')}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t('weeklyPlan.classOptional')}</Label>
              <Select value={newClassId} onValueChange={setNewClassId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('weeklyPlan.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classesQuery.data?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('customAssessments.ageGroup')}</Label>
              <Select value={newAgeGroup} onValueChange={setNewAgeGroup}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('customAssessments.selectAgeGroup')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AGE_GROUPS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('assessments.cancel')}</Button>
            <Button onClick={handleCreateAssessment} disabled={createMutation.isPending}>
              {createMutation.isPending ? t('customAssessments.creating') : t('customAssessments.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
