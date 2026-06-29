import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { TreePine, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, XCircle, RotateCcw, Save, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ASSESSMENT_ITEMS,
  AGE_GROUP_LABELS,
  DOMAIN_LABELS,
  RESPONSE_LABELS,
  RESPONSE_SCORES,
  INTERPRETATION_LABELS,
  getInterpretation,
  type AgeGroup,
  type Domain,
  type ResponseValue,
} from "../../../../shared/assessmentData";

const DOMAINS: Domain[] = ["communication", "gross_motor", "fine_motor", "problem_solving", "personal_social"];

function getAgeGroupFromBirthDate(birthDate: string): AgeGroup | null {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months >= 24 && months < 36) return "24-36";
  if (months >= 36 && months < 48) return "36-48";
  if (months >= 48 && months < 60) return "48-60";
  if (months >= 60 && months <= 72) return "60-72";
  return null;
}

export default function DevelopmentalAssessment() {
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [notes, setNotes] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);

  const { data: children } = trpc.children.list.useQuery();
  const createAssessment = trpc.assessment.create.useMutation({
    onSuccess: (data) => {
      toast.success("تم حفظ التقييم بنجاح");
      setShowResults(true);
    },
    onError: (err) => {
      toast.error("حدث خطأ: " + err.message);
    },
  });

  const selectedChild = useMemo(() => {
    if (!children || !selectedChildId) return null;
    return children.find((c: any) => c.id === selectedChildId);
  }, [children, selectedChildId]);

  // Auto-detect age group from child's birth date
  useEffect(() => {
    if (selectedChild?.dateOfBirth) {
      const detected = getAgeGroupFromBirthDate(String(selectedChild.dateOfBirth));
      if (detected) {
        setSelectedAgeGroup(detected);
      }
    }
  }, [selectedChild]);

  const currentDomain = DOMAINS[currentDomainIndex];
  const items = useMemo(() => {
    if (!selectedAgeGroup) return [];
    return ASSESSMENT_ITEMS[selectedAgeGroup].filter(item => item.domain === currentDomain);
  }, [selectedAgeGroup, currentDomain]);

  const allItems = useMemo(() => {
    if (!selectedAgeGroup) return [];
    return ASSESSMENT_ITEMS[selectedAgeGroup];
  }, [selectedAgeGroup]);

  const domainProgress = useMemo(() => {
    const progress: Record<Domain, number> = {} as any;
    DOMAINS.forEach(domain => {
      const domainItems = allItems.filter(i => i.domain === domain);
      const answered = domainItems.filter(i => responses[`${domain}_${i.index}`] !== undefined).length;
      progress[domain] = domainItems.length > 0 ? (answered / domainItems.length) * 100 : 0;
    });
    return progress;
  }, [allItems, responses]);

  const totalAnswered = Object.keys(responses).length;
  const totalItems = allItems.length;
  const overallProgress = totalItems > 0 ? (totalAnswered / totalItems) * 100 : 0;

  const handleResponse = (domain: Domain, index: number, value: ResponseValue) => {
    setResponses(prev => ({ ...prev, [`${domain}_${index}`]: value }));
  };

  const calculateResults = () => {
    let totalScore = 0;
    const maxScore = totalItems * 2;
    const domainScores: Record<Domain, { score: number; max: number; percentage: number }> = {} as any;

    DOMAINS.forEach(domain => {
      const domainItems = allItems.filter(i => i.domain === domain);
      let dScore = 0;
      const dMax = domainItems.length * 2;
      domainItems.forEach(item => {
        const resp = responses[`${domain}_${item.index}`];
        if (resp) {
          dScore += RESPONSE_SCORES[resp];
          totalScore += RESPONSE_SCORES[resp];
        }
      });
      domainScores[domain] = { score: dScore, max: dMax, percentage: dMax > 0 ? (dScore / dMax) * 100 : 0 };
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const interpretation = getInterpretation(percentage);
    return { totalScore, maxScore, percentage, interpretation, domainScores };
  };

  const handleSubmit = () => {
    if (!selectedChildId || !selectedAgeGroup) return;
    if (totalAnswered < totalItems) {
      toast.error(`يرجى إكمال جميع البنود (${totalAnswered}/${totalItems})`);
      return;
    }

    const responsesList = allItems.map(item => ({
      domain: item.domain,
      itemIndex: item.index,
      itemText: item.text,
      response: responses[`${item.domain}_${item.index}`] || "not_yet" as ResponseValue,
    }));

    createAssessment.mutate({
      childId: selectedChildId,
      ageGroup: selectedAgeGroup,
      responses: responsesList,
      notes,
      assessmentDate: new Date().toISOString(),
    });
  };

  const resetAssessment = () => {
    setResponses({});
    setNotes("");
    setShowResults(false);
    setAssessmentStarted(false);
    setCurrentDomainIndex(0);
  };

  // Results view
  if (showResults) {
    const results = calculateResults();
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <TreePine className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-800">نتائج التقييم النمائي</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedChild?.firstName} {selectedChild?.lastName}</span>
              <Badge variant="outline">{AGE_GROUP_LABELS[selectedAgeGroup!]}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Overall Score */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-8 ${
                results.interpretation === "on_track" ? "border-emerald-500 text-emerald-700" :
                results.interpretation === "needs_support" ? "border-amber-500 text-amber-700" :
                "border-red-500 text-red-700"
              }`}>
                <div>
                  <div className="text-3xl font-bold">{results.percentage.toFixed(0)}%</div>
                  <div className="text-xs">{results.totalScore}/{results.maxScore}</div>
                </div>
              </div>
              <div className={`mt-4 text-lg font-semibold flex items-center justify-center gap-2 ${
                results.interpretation === "on_track" ? "text-emerald-700" :
                results.interpretation === "needs_support" ? "text-amber-700" :
                "text-red-700"
              }`}>
                {results.interpretation === "on_track" && <CheckCircle2 className="w-5 h-5" />}
                {results.interpretation === "needs_support" && <AlertTriangle className="w-5 h-5" />}
                {results.interpretation === "needs_referral" && <XCircle className="w-5 h-5" />}
                {INTERPRETATION_LABELS[results.interpretation]}
              </div>
            </div>

            {/* Domain Breakdown */}
            <h3 className="text-lg font-semibold mb-4">تفصيل المجالات</h3>
            <div className="space-y-4">
              {DOMAINS.map(domain => {
                const ds = results.domainScores[domain];
                const interp = getInterpretation(ds.percentage);
                return (
                  <div key={domain} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium">{DOMAIN_LABELS[domain]}</div>
                    <div className="flex-1">
                      <Progress
                        value={ds.percentage}
                        className={`h-3 ${
                          interp === "on_track" ? "[&>div]:bg-emerald-500" :
                          interp === "needs_support" ? "[&>div]:bg-amber-500" :
                          "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                    <div className="w-16 text-sm text-left font-semibold">{ds.percentage.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>

            {notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">ملاحظات:</h4>
                <p className="text-gray-700">{notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={resetAssessment} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            تقييم جديد
          </Button>
        </div>
      </div>
    );
  }

  // Assessment form
  if (assessmentStarted && selectedAgeGroup) {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <TreePine className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-800">مقياس الكشف المبكر</h1>
        </div>

        {/* Child info bar */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-emerald-50 rounded-lg">
          <span className="font-semibold">{selectedChild?.firstName} {selectedChild?.lastName}</span>
          <Badge variant="outline">{AGE_GROUP_LABELS[selectedAgeGroup]}</Badge>
          <span className="mr-auto text-sm text-gray-600">{totalAnswered}/{totalItems} بند</span>
        </div>

        {/* Overall progress */}
        <Progress value={overallProgress} className="h-2 mb-6 [&>div]:bg-emerald-500" />

        {/* Domain tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {DOMAINS.map((domain, idx) => (
            <button
              key={domain}
              onClick={() => setCurrentDomainIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                idx === currentDomainIndex
                  ? "bg-emerald-600 text-white shadow-md"
                  : domainProgress[domain] === 100
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {domainProgress[domain] === 100 && <CheckCircle2 className="w-4 h-4" />}
              {DOMAIN_LABELS[domain]}
            </button>
          ))}
        </div>

        {/* Items for current domain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{DOMAIN_LABELS[currentDomain]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const key = `${item.domain}_${item.index}`;
              const currentResponse = responses[key];
              return (
                <div key={key} className="p-4 border rounded-lg hover:border-emerald-200 transition-colors">
                  <p className="font-medium mb-3 text-gray-800">{item.text}</p>
                  <div className="flex gap-2">
                    {(["yes", "sometimes", "not_yet"] as ResponseValue[]).map(value => (
                      <button
                        key={value}
                        onClick={() => handleResponse(item.domain, item.index, value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          currentResponse === value
                            ? value === "yes"
                              ? "bg-emerald-600 text-white shadow-md"
                              : value === "sometimes"
                              ? "bg-amber-500 text-white shadow-md"
                              : "bg-red-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {RESPONSE_LABELS[value]} ({RESPONSE_SCORES[value]})
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentDomainIndex(prev => prev - 1)}
            disabled={currentDomainIndex === 0}
            className="gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            المجال السابق
          </Button>

          {currentDomainIndex === DOMAINS.length - 1 ? (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowResults(true)}
                variant="outline"
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                معاينة النتائج
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={totalAnswered < totalItems || createAssessment.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4" />
                {createAssessment.isPending ? "جاري الحفظ..." : "حفظ التقييم"}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setCurrentDomainIndex(prev => prev + 1)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              المجال التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Notes */}
        {currentDomainIndex === DOMAINS.length - 1 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات إضافية (اختياري)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظاتك حول أداء الطفل..."
              rows={3}
            />
          </div>
        )}
      </div>
    );
  }

  // Selection screen
  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <TreePine className="w-8 h-8 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مقياس الكشف المبكر</h1>
          <p className="text-gray-500 text-sm">للكشف المبكر عن التأخر النمائي</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>بدء تقييم جديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Child selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اختر الطفل</label>
            <Select
              value={selectedChildId?.toString() || ""}
              onValueChange={(val) => setSelectedChildId(parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الطفل..." />
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

          {/* Age group selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الفئة العمرية</label>
            <Select
              value={selectedAgeGroup || ""}
              onValueChange={(val) => setSelectedAgeGroup(val as AgeGroup)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الفئة العمرية..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(AGE_GROUP_LABELS) as AgeGroup[]).map(ag => (
                  <SelectItem key={ag} value={ag}>
                    {AGE_GROUP_LABELS[ag]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChild?.dateOfBirth && selectedAgeGroup && (
              <p className="text-xs text-emerald-600 mt-1">تم اكتشاف الفئة العمرية تلقائياً من تاريخ الميلاد</p>
            )}
          </div>

          {/* Assessment info */}
          {selectedAgeGroup && (
            <div className="p-4 bg-emerald-50 rounded-lg">
              <h4 className="font-semibold text-emerald-800 mb-2">معلومات التقييم</h4>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• عدد البنود: {ASSESSMENT_ITEMS[selectedAgeGroup].length} بند</li>
                <li>• المجالات: 5 مجالات (تواصل، حركية كبرى، حركية دقيقة، إدراك، اجتماعي)</li>
                <li>• طريقة التقييم: نعم (2) / أحياناً (1) / ليس بعد (0)</li>
                <li>• الدرجة القصوى: {ASSESSMENT_ITEMS[selectedAgeGroup].length * 2} نقطة</li>
              </ul>
            </div>
          )}

          <Button
            onClick={() => setAssessmentStarted(true)}
            disabled={!selectedChildId || !selectedAgeGroup}
            className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            size="lg"
          >
            <TreePine className="w-5 h-5" />
            بدء التقييم
          </Button>
        </CardContent>
      </Card>

      {/* Interpretation guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">دليل تفسير النتائج</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-semibold text-emerald-800">80% فأكثر:</span>
                <span className="text-emerald-700 mr-2">نمو ضمن المتوقع للعمر</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <span className="font-semibold text-amber-800">60%–79%:</span>
                <span className="text-amber-700 mr-2">يحتاج متابعة ودعم</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <span className="font-semibold text-red-800">أقل من 60%:</span>
                <span className="text-red-700 mr-2">يوصى بإعادة التقييم والإحالة لمختص</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
