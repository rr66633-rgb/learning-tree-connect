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

const AGE_GROUPS: Record<string, string> = {
  nursery: "حضانة",
  kg1: "تمهيدي أول",
  kg2: "تمهيدي ثاني",
  kg3: "تمهيدي ثالث",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  archived: "مؤرشف",
};

const QUESTION_TYPES: Record<string, string> = {
  multiple_choice: "اختيار من متعدد",
  true_false: "صح / خطأ",
  rating: "تقييم",
  text: "نص حر",
};

export default function CustomAssessments() {
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

  const utils = trpc.useUtils();
  const classesQuery = trpc.classes.list.useQuery();
  const assessmentsQuery = trpc.customAssessment.list.useQuery({});
  const selectedAssessment = trpc.customAssessment.get.useQuery(
    { id: selectedAssessmentId! },
    { enabled: !!selectedAssessmentId }
  );

  const createMutation = trpc.customAssessment.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الاختبار بنجاح");
      utils.customAssessment.list.invalidate();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.customAssessment.update.useMutation({
    onSuccess: () => {
      toast.success("تم التحديث");
      utils.customAssessment.list.invalidate();
      utils.customAssessment.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.customAssessment.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الاختبار");
      utils.customAssessment.list.invalidate();
      setSelectedAssessmentId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const addQuestionMutation = trpc.customAssessment.addQuestion.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة السؤال");
      utils.customAssessment.get.invalidate();
      setShowQuestionDialog(false);
      resetQuestionForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateQuestionMutation = trpc.customAssessment.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث السؤال");
      utils.customAssessment.get.invalidate();
      setShowQuestionDialog(false);
      resetQuestionForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteQuestionMutation = trpc.customAssessment.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("تم حذف السؤال");
      utils.customAssessment.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
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
    if (!newTitle.trim()) { toast.error("يرجى إدخال عنوان الاختبار"); return; }
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      classId: newClassId ? Number(newClassId) : undefined,
      ageGroup: newAgeGroup || undefined,
    });
  }

  function handleSaveQuestion() {
    if (!qText.trim()) { toast.error("يرجى إدخال نص السؤال"); return; }
    
    const filteredOptions = qOptions.filter(o => o.trim());
    if (qType === "multiple_choice" && filteredOptions.length < 2) {
      toast.error("يرجى إضافة خيارين على الأقل");
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
              رجوع
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
              <Label className="text-sm">مشاركة مع أولياء الأمور</Label>
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
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => navigate(`/staff/custom-assessments/${selectedAssessmentId}/apply`)}
            >
              <Play className="h-4 w-4 ml-1" />
              تطبيق
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("هل أنت متأكد من حذف هذا الاختبار؟")) {
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
            <h2 className="text-lg font-semibold">الأسئلة ({questions.length})</h2>
            <Button size="sm" onClick={() => { resetQuestionForm(); setShowQuestionDialog(true); }}>
              <Plus className="h-4 w-4 ml-1" />
              إضافة سؤال
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد أسئلة بعد. اضغط "إضافة سؤال" للبدء.</p>
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
                            تقييم من 1 إلى {q.maxRating}
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
                            if (confirm("هل تريد حذف هذا السؤال؟")) {
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
              <DialogTitle>{editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>نص السؤال</Label>
                <Textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="اكتب السؤال هنا..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>نوع السؤال</Label>
                <Select value={qType} onValueChange={setQType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">اختيار من متعدد</SelectItem>
                    <SelectItem value="true_false">صح / خطأ</SelectItem>
                    <SelectItem value="rating">تقييم</SelectItem>
                    <SelectItem value="text">نص حر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {qType === "multiple_choice" && (
                <div>
                  <Label>الخيارات</Label>
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
                          placeholder={`الخيار ${i + 1}`}
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
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة خيار
                    </Button>
                  </div>
                </div>
              )}

              {qType === "rating" && (
                <div>
                  <Label>أعلى تقييم</Label>
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

              <div>
                <Label>الإجابة الصحيحة (اختياري)</Label>
                <Input
                  value={qCorrectAnswer}
                  onChange={(e) => setQCorrectAnswer(e.target.value)}
                  placeholder="اختياري - للمرجع فقط"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>إلغاء</Button>
              <Button onClick={handleSaveQuestion} disabled={addQuestionMutation.isPending || updateQuestionMutation.isPending}>
                {editingQuestion ? "تحديث" : "إضافة"}
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
          <h1 className="text-2xl font-bold">الاختبارات المخصصة</h1>
          <p className="text-sm text-muted-foreground mt-1">إنشاء وإدارة اختبارات وتقييمات مخصصة للأطفال</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 ml-1" />
          اختبار جديد
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
            <p className="text-lg font-medium">لا توجد اختبارات بعد</p>
            <p className="text-sm mt-1">اضغط "اختبار جديد" لإنشاء أول اختبار مخصص</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assessmentsQuery.data.map((a: any) => (
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
                  <span>{new Date(a.createdAt).toLocaleDateString("ar-SA")}</span>
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
            <DialogTitle>إنشاء اختبار جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>عنوان الاختبار *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثال: اختبار الحروف الهجائية"
                className="mt-1"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="وصف مختصر للاختبار..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>الفصل</Label>
              <Select value={newClassId} onValueChange={setNewClassId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر الفصل" />
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
              <Label>الفئة العمرية</Label>
              <Select value={newAgeGroup} onValueChange={setNewAgeGroup}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر الفئة" />
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
            <Button onClick={handleCreateAssessment} disabled={createMutation.isPending}>
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
