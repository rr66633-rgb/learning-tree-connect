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
import { useTranslation } from "react-i18next";

const getAGE_GROUP_LABELS = (isAr: boolean): Record<string, string>  => ({
  "24-36": (isAr ? "٢٤ - ٣٦ شهر" : "24 - 36 months"),
  "36-48": (isAr ? "٣٦ - ٤٨ شهر" : "36 - 48 months"),
  "48-60": (isAr ? "٤٨ - ٦٠ شهر" : "48 - 60 months"),
  "60-72": (isAr ? "٦٠ - ٧٢ شهر" : "60 - 72 months"),
});

const getDOMAIN_LABELS = (isAr: boolean): Record<string, string>  => ({
  communication: (isAr ? "التواصل واللغة" : "Communication & Language"),
  gross_motor: (isAr ? "المهارات الحركية الكبرى" : "Gross Motor Skills"),
  fine_motor: (isAr ? "المهارات الحركية الدقيقة" : "Fine Motor Skills"),
  cognitive: (isAr ? "المهارات الإدراكية والمعرفية" : "Cognitive Skills"),
  social_emotional: (isAr ? "المهارات الاجتماعية والعاطفية" : "Social & Emotional Skills"),
  problem_solving: (isAr ? "حل المشكلات والإدراك" : "Problem Solving and Cognition"),
  personal_social: (isAr ? "المهارات الشخصية والاجتماعية" : "Personal & Social Skills"),
});

function getInterpretationConfig(interpretation: string, isAr: boolean = true) {
  switch (interpretation) {
    case "on_track":
      return { label: isAr ? "نمو ضمن المتوقع" : "On Track", color: "bg-green-100 text-green-800", icon: CheckCircle2, iconColor: "text-green-600" };
    case "needs_support":
      return { label: isAr ? "يحتاج متابعة ودعم" : "Needs Support", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, iconColor: "text-yellow-600" };
    case "needs_referral":
      return { label: isAr ? "يوصى بإحالة لمختص" : "Needs Referral", color: "bg-red-100 text-red-800", icon: XCircle, iconColor: "text-red-600" };
    default:
      return { label: interpretation, color: "bg-gray-100 text-gray-800", icon: CheckCircle2, iconColor: "text-gray-600" };
  }
}

export default function ParentDevelopmentalAssessment() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
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
        : (isAr ? "الطفل" : "Child");

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

      toast.success(isAr ? "تم تحميل التقرير بنجاح" : "Report downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(isAr ? "حدث خطأ أثناء إنشاء التقرير" : "Error creating report");
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
          <h1 className="text-2xl font-bold text-gray-900">{isAr ? "مقياس الكشف المبكر" : "Early Detection Scale"}</h1>
        </div>
        <p className="text-gray-500 text-sm">{isAr ? "للكشف المبكر عن التأخر النمائي" : "For early detection of developmental delay"}</p>
      </div>

      {/* Child Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={isAr ? "اختر الطفل..." : "Select Child"} />
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
          <p>{isAr ? "اختر طفلك لعرض نتائج التقييم النمائي" : "Select your child to view developmental assessment results"}</p>
        </div>
      )}

      {selectedChildId && isLoading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>
        </div>
      )}

      {selectedChildId && !isLoading && (!assessments || assessments.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <TreePine className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">{isAr ? "لا توجد تقييمات بعد" : "No evaluations yet"}</p>
          <p className="text-sm mt-2">{isAr ? "سيتم إجراء التقييم النمائي من قبل المعلمة" : "Developmental assessment will be conducted by the teacher"}</p>
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
                  {isAr ? "آخر تقييم" : "Last Assessment"}
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
                  {isAr ? "تحميل التقرير" : "Download Report"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(latestAssessment.assessmentDate).toLocaleDateString(locale)}
                </div>
                <Badge variant="outline">
                  {getAGE_GROUP_LABELS(isAr)[latestAssessment.ageGroup] || latestAssessment.ageGroup}
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
                    const config = getInterpretationConfig(latestAssessment.interpretation, isAr);
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
                <h3 className="font-semibold text-sm text-gray-700">{isAr ? "النتيجة الإجمالية" : "Overall Result"}</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{isAr ? "الدرجة الكلية" : "Total Score"}</span>
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
                <CardTitle className="text-lg">{isAr ? "سجل التقييمات السابقة" : "Previous Assessments Log"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessments.slice(1).map((assessment: any) => {
                  const config = getInterpretationConfig(assessment.interpretation, isAr);
                  const Icon = config.icon;
                  return (
                    <div key={assessment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                        <div>
                          <div className="text-sm font-medium">
                            {getAGE_GROUP_LABELS(isAr)[assessment.ageGroup] || assessment.ageGroup}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(assessment.assessmentDate).toLocaleDateString(locale)}
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
                          title={isAr ? "تحميل التقرير" : "Download Report"}
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
              <CardTitle className="text-sm text-gray-600">{isAr ? "دليل تفسير النتائج" : "Results Interpretation Guide"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span><strong>80% فأكثر:</strong>{isAr ? "نمو ضمن المتوقع للعمر" : "Age-Appropriate Growth"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span><strong>60%-79%:</strong>{isAr ? "يحتاج متابعة ودعم إضافي" : "Needs Additional Follow-up and Support"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-red-600" />
                <span><strong>{isAr ? "أقل من 60%:" : "Less than 60%:"}</strong>{isAr ? "يوصى بإعادة التقييم والإحالة لمختص" : "Re-evaluation and referral to specialist recommended"}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
