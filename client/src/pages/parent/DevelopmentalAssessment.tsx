import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useCallback } from "react";
import { TreePine, TrendingUp, CheckCircle2, AlertTriangle, XCircle, Calendar, User, Download, Loader2 } from "lucide-react";
import { generateAssessmentPDF } from "@/lib/assessmentPdf";
import { toast } from "sonner";

const AGE_GROUP_LABELS: Record<string, string> = {
  "24-36": "٢٤ - ٣٦ شهر",
  "36-48": "٣٦ - ٤٨ شهر",
  "48-60": "٤٨ - ٦٠ شهر",
  "60-72": "٦٠ - ٧٢ شهر",
};

const DOMAIN_LABELS: Record<string, string> = {
  communication: "التواصل واللغة",
  gross_motor: "المهارات الحركية الكبرى",
  fine_motor: "المهارات الحركية الدقيقة",
  cognitive: "المهارات الإدراكية والمعرفية",
  social_emotional: "المهارات الاجتماعية والعاطفية",
  problem_solving: "حل المشكلات والإدراك",
  personal_social: "المهارات الشخصية والاجتماعية",
};

function getInterpretationConfig(interpretation: string) {
  switch (interpretation) {
    case "on_track":
      return { label: "نمو ضمن المتوقع", color: "bg-green-100 text-green-800", icon: CheckCircle2, iconColor: "text-green-600" };
    case "needs_support":
      return { label: "يحتاج متابعة ودعم", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, iconColor: "text-yellow-600" };
    case "needs_referral":
      return { label: "يوصى بإحالة لمختص", color: "bg-red-100 text-red-800", icon: XCircle, iconColor: "text-red-600" };
    default:
      return { label: interpretation, color: "bg-gray-100 text-gray-800", icon: CheckCircle2, iconColor: "text-gray-600" };
  }
}

export default function ParentDevelopmentalAssessment() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // Get parent's children
  const { data: childrenData } = trpc.children.list.useQuery();
  const children = (childrenData as any)?.children || childrenData || [];

  // Get assessments for selected child
  const { data: assessments, isLoading } = trpc.assessment.getByChild.useQuery(
    { childId: parseInt(selectedChildId) },
    { enabled: !!selectedChildId }
  );

  const selectedChild = useMemo(() => {
    return children.find((c: any) => c.id === selectedChildId);
  }, [children, selectedChildId]);

  // Get latest assessment for summary
  const latestAssessment = assessments?.[0];

  // Handle PDF download
  const handleDownloadPDF = useCallback(async (assessment: any) => {
    try {
      setDownloadingId(assessment.id);

      // Fetch detailed responses for this assessment using utils.fetch
      let responses: any[] = [];
      try {
        const details = await utils.client.assessment.getDetails.query({ id: assessment.id });
        responses = (details as any)?.responses || [];
      } catch (e) {
        // If fetching details fails, continue without responses
        console.warn("Could not fetch assessment details:", e);
      }

      const childName = selectedChild
        ? `${selectedChild.firstName} ${selectedChild.lastName}`
        : "الطفل";

      await generateAssessmentPDF({
        id: assessment.id,
        childName,
        ageGroup: assessment.ageGroup,
        assessmentDate: assessment.assessmentDate,
        totalScore: assessment.totalScore,
        maxScore: assessment.maxScore,
        percentage: assessment.percentage,
        interpretation: assessment.interpretation,
        notes: assessment.notes,
        responses,
      });

      toast.success("تم تحميل التقرير بنجاح");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("حدث خطأ أثناء إنشاء التقرير");
    } finally {
      setDownloadingId(null);
    }
  }, [selectedChild, utils]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TreePine className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">مقياس شجرة التعلم</h1>
        </div>
        <p className="text-gray-500 text-sm">للكشف المبكر عن التأخر النمائي</p>
      </div>

      {/* Child Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="اختر الطفل..." />
              </SelectTrigger>
              <SelectContent>
                {children.map((child: any) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedChildId && (
        <div className="text-center py-12 text-gray-400">
          <TreePine className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>اختر طفلك لعرض نتائج التقييم النمائي</p>
        </div>
      )}

      {selectedChildId && isLoading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-pulse">جاري التحميل...</div>
        </div>
      )}

      {selectedChildId && !isLoading && (!assessments || assessments.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <TreePine className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد تقييمات بعد</p>
          <p className="text-sm mt-2">سيتم إجراء التقييم النمائي من قبل المعلمة</p>
        </div>
      )}

      {/* Latest Assessment Summary */}
      {latestAssessment && (
        <>
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  آخر تقييم
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(latestAssessment)}
                  disabled={downloadingId === latestAssessment.id}
                  className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  {downloadingId === latestAssessment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  تحميل التقرير
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(latestAssessment.assessmentDate).toLocaleDateString("ar-SA")}
                </div>
                <Badge variant="outline">
                  {AGE_GROUP_LABELS[latestAssessment.ageGroup] || latestAssessment.ageGroup}
                </Badge>
              </div>

              {/* Score Circle */}
              <div className="flex flex-col items-center py-4">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${
                  parseFloat(latestAssessment.percentage) >= 80 ? "border-green-400 bg-green-50" :
                  parseFloat(latestAssessment.percentage) >= 60 ? "border-yellow-400 bg-yellow-50" :
                  "border-red-400 bg-red-50"
                }`}>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{Math.round(parseFloat(latestAssessment.percentage))}%</div>
                    <div className="text-xs text-gray-500">{latestAssessment.totalScore}/{latestAssessment.maxScore}</div>
                  </div>
                </div>
                <div className="mt-3">
                  {(() => {
                    const config = getInterpretationConfig(latestAssessment.interpretation);
                    const Icon = config.icon;
                    return (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${config.color}`}>
                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Overall Score Bar */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">النتيجة الإجمالية</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الدرجة الكلية</span>
                    <span className="font-medium">{latestAssessment.totalScore}/{latestAssessment.maxScore}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${parseFloat(latestAssessment.percentage)}%`,
                        backgroundColor: parseFloat(latestAssessment.percentage) >= 80 ? "#10B981" : parseFloat(latestAssessment.percentage) >= 60 ? "#F59E0B" : "#EF4444",
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment History */}
          {assessments && assessments.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">سجل التقييمات السابقة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessments.slice(1).map((assessment: any) => {
                  const config = getInterpretationConfig(assessment.interpretation);
                  const Icon = config.icon;
                  return (
                    <div key={assessment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                        <div>
                          <div className="text-sm font-medium">
                            {AGE_GROUP_LABELS[assessment.ageGroup] || assessment.ageGroup}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(assessment.assessmentDate).toLocaleDateString("ar-SA")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <div className={`text-lg font-bold ${
                            parseFloat(assessment.percentage) >= 80 ? "text-green-600" :
                            parseFloat(assessment.percentage) >= 60 ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {Math.round(parseFloat(assessment.percentage))}%
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(assessment)}
                          disabled={downloadingId === assessment.id}
                          className="h-8 w-8 text-gray-500 hover:text-emerald-600"
                          title="تحميل التقرير"
                        >
                          {downloadingId === assessment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Interpretation Guide */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">دليل تفسير النتائج</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span><strong>80% فأكثر:</strong> نمو ضمن المتوقع للعمر</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span><strong>60%-79%:</strong> يحتاج متابعة ودعم إضافي</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-red-600" />
                <span><strong>أقل من 60%:</strong> يوصى بإعادة التقييم والإحالة لمختص</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
