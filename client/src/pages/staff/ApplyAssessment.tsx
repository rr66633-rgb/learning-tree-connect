import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronRight, Save, Star, CheckCircle2, FileDown, Mail } from "lucide-react";
import { generateCustomAssessmentPDF } from "@/lib/customAssessmentPdf";
import { useRoute, useLocation } from "wouter";

const QUESTION_TYPES: Record<string, string> = {
  multiple_choice: "اختيار من متعدد",
  true_false: "صح / خطأ",
  rating: "تقييم",
  text: "نص حر",
};

export default function ApplyAssessment() {
  const [, params] = useRoute("/staff/custom-assessments/:id/apply");
  const [, navigate] = useLocation();
  const assessmentId = params?.id ? Number(params.id) : 0;

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [responses, setResponses] = useState<Record<number, { answer?: string; rating?: number; notes?: string }>>({});
  const [saved, setSaved] = useState(false);

  const assessmentQuery = trpc.customAssessment.get.useQuery({ id: assessmentId }, { enabled: !!assessmentId });
  const childrenQuery = trpc.children.list.useQuery({});
  const existingResponses = trpc.customAssessment.getResponses.useQuery(
    { assessmentId, childId: selectedChildId! },
    { enabled: !!selectedChildId && !!assessmentId }
  );

  const saveResponsesMutation = trpc.customAssessment.saveResponses.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإجابات بنجاح");
      setSaved(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const emailToParentsMutation = trpc.customAssessment.emailReportToParents.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (err) => toast.error(err.message),
  });

  // Load existing responses when child changes
  useMemo(() => {
    if (existingResponses.data && existingResponses.data.length > 0) {
      const loaded: Record<number, { answer?: string; rating?: number; notes?: string }> = {};
      existingResponses.data.forEach((r: any) => {
        loaded[r.questionId] = {
          answer: r.answer || undefined,
          rating: r.rating || undefined,
          notes: r.notes || undefined,
        };
      });
      setResponses(loaded);
      setSaved(true);
    } else {
      setResponses({});
      setSaved(false);
    }
  }, [existingResponses.data]);

  const assessment = assessmentQuery.data;
  const questions = assessment?.questions || [];

  // Filter children by assessment's class
  const filteredChildren = useMemo(() => {
    if (!childrenQuery.data) return [];
    if (assessment?.classId) {
      return childrenQuery.data.filter((c: any) => c.classId === assessment.classId);
    }
    return childrenQuery.data;
  }, [childrenQuery.data, assessment?.classId]);

  function updateResponse(questionId: number, field: string, value: any) {
    setSaved(false);
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
  }

  function handleSave() {
    if (!selectedChildId) { toast.error("يرجى اختيار طفل أولاً"); return; }
    
    const responsesList = questions.map((q: any) => ({
      questionId: q.id,
      answer: responses[q.id]?.answer || null,
      rating: responses[q.id]?.rating || null,
      notes: responses[q.id]?.notes || null,
    }));

    saveResponsesMutation.mutate({
      assessmentId,
      childId: selectedChildId,
      responses: responsesList,
    });
  }

  if (!assessmentId) {
    return <div className="p-6 text-center text-muted-foreground">اختبار غير موجود</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/staff/custom-assessments")}>
          <ChevronRight className="h-4 w-4" />
          رجوع
        </Button>
        <div>
          <h1 className="text-xl font-bold">تطبيق: {assessment?.title || "..."}</h1>
          <p className="text-sm text-muted-foreground">{assessment?.description}</p>
        </div>
      </div>

      {/* Child Selection */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-base font-semibold">اختر الطفل</Label>
          <Select
            value={selectedChildId ? String(selectedChildId) : ""}
            onValueChange={(v) => { setSelectedChildId(Number(v)); setSaved(false); }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="اختر طفلاً لتطبيق الاختبار عليه" />
            </SelectTrigger>
            <SelectContent>
              {filteredChildren.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.firstName} {c.lastName || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Questions */}
      {selectedChildId && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((q: any, idx: number) => (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                  <Badge variant="outline" className="text-xs">{QUESTION_TYPES[q.questionType]}</Badge>
                </div>
                <p className="font-medium text-base">{q.questionText}</p>

                {/* Multiple Choice */}
                {q.questionType === "multiple_choice" && q.options && (
                  <RadioGroup
                    value={responses[q.id]?.answer || ""}
                    onValueChange={(val) => updateResponse(q.id, "answer", val)}
                    className="space-y-2"
                  >
                    {(q.options as string[]).map((opt: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`q${q.id}-opt${i}`} />
                        <Label htmlFor={`q${q.id}-opt${i}`} className="cursor-pointer">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* True/False */}
                {q.questionType === "true_false" && (
                  <RadioGroup
                    value={responses[q.id]?.answer || ""}
                    onValueChange={(val) => updateResponse(q.id, "answer", val)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="صح" id={`q${q.id}-true`} />
                      <Label htmlFor={`q${q.id}-true`} className="cursor-pointer">صح</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="خطأ" id={`q${q.id}-false`} />
                      <Label htmlFor={`q${q.id}-false`} className="cursor-pointer">خطأ</Label>
                    </div>
                  </RadioGroup>
                )}

                {/* Rating */}
                {q.questionType === "rating" && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: q.maxRating || 5 }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updateResponse(q.id, "rating", num)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            (responses[q.id]?.rating || 0) >= num
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-sm text-muted-foreground mr-2">
                      {responses[q.id]?.rating || 0} / {q.maxRating || 5}
                    </span>
                  </div>
                )}

                {/* Text */}
                {q.questionType === "text" && (
                  <Textarea
                    value={responses[q.id]?.answer || ""}
                    onChange={(e) => updateResponse(q.id, "answer", e.target.value)}
                    placeholder="اكتب الإجابة هنا..."
                  />
                )}

                {/* Notes */}
                <div>
                  <Label className="text-xs text-muted-foreground">ملاحظات (اختياري)</Label>
                  <Input
                    value={responses[q.id]?.notes || ""}
                    onChange={(e) => updateResponse(q.id, "notes", e.target.value)}
                    placeholder="ملاحظات إضافية..."
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Save & Export Buttons */}
          <div className="flex items-center gap-3 sticky bottom-4">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleSave}
              disabled={saveResponsesMutation.isPending}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-5 w-5 ml-2" />
                  محفوظ
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 ml-2" />
                  حفظ الإجابات
                </>
              )}
            </Button>
            {saved && selectedChildId && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    const child = filteredChildren.find((c: any) => c.id === selectedChildId);
                    const childName = child ? `${child.firstName} ${child.lastName || ""}`.trim() : "طفل";
                    generateCustomAssessmentPDF({
                      assessmentTitle: assessment?.title || "",
                      assessmentDescription: assessment?.description || undefined,
                      childName,
                      className: undefined,
                      date: new Date().toISOString(),
                      responses: questions.map((q: any) => ({
                        questionText: q.questionText,
                        questionType: q.questionType,
                        answer: responses[q.id]?.answer || null,
                        rating: responses[q.id]?.rating || null,
                        maxRating: q.maxRating || 5,
                        notes: responses[q.id]?.notes || null,
                        options: q.options || [],
                      })),
                    });
                    toast.success("تم تصدير التقرير بنجاح");
                  }}
                >
                  <FileDown className="h-5 w-5 ml-2" />
                  تصدير PDF
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    emailToParentsMutation.mutate({
                      assessmentId,
                      childId: selectedChildId!,
                    });
                  }}
                  disabled={emailToParentsMutation.isPending}
                >
                  <Mail className="h-5 w-5 ml-2" />
                  {emailToParentsMutation.isPending ? "جاري الإرسال..." : "إرسال للوالدين"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {selectedChildId && questions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>لا توجد أسئلة في هذا الاختبار. يرجى إضافة أسئلة أولاً.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
