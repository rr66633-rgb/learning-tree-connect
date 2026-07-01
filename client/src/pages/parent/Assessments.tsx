import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ClipboardList, ChevronDown } from "lucide-react";
import { useState } from "react";

const QUESTION_TYPES: Record<string, string> = {
  multiple_choice: "اختيار من متعدد",
  true_false: "صح / خطأ",
  rating: "تقييم",
  text: "نص حر",
};

export default function ParentAssessments() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const assessmentsQuery = trpc.customAssessment.parentList.useQuery({ limit: 20 });

  if (assessmentsQuery.isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">الاختبارات والتقييمات</h1>
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  const assessments = assessmentsQuery.data || [];

  if (assessments.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">الاختبارات والتقييمات</h1>
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">لا توجد اختبارات متاحة حالياً</p>
            <p className="text-sm mt-1">ستظهر هنا نتائج الاختبارات عند مشاركتها من قبل المعلمة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">الاختبارات والتقييمات</h1>
        <p className="text-sm text-muted-foreground mt-1">نتائج اختبارات أطفالك</p>
      </div>

      <div className="space-y-4">
        {assessments.map((assessment: any) => (
          <Card key={assessment.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Assessment Header */}
              <button
                className="w-full p-4 text-right flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(expandedId === assessment.id ? null : assessment.id)}
              >
                <div>
                  <h3 className="font-bold text-lg">{assessment.title}</h3>
                  {assessment.description && (
                    <p className="text-sm text-muted-foreground mt-1">{assessment.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(assessment.createdAt).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedId === assessment.id ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded Content */}
              {expandedId === assessment.id && assessment.childResults && (
                <div className="border-t px-4 pb-4 space-y-4">
                  {assessment.childResults.map((child: any) => (
                    <div key={child.childId} className="mt-4">
                      <Badge className="mb-3">{child.childName}</Badge>
                      <div className="space-y-3">
                        {child.responses.map((r: any, idx: number) => (
                          <div key={r.id} className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                            </div>
                            {r.answer && (
                              <p className="text-sm">
                                <span className="font-medium">الإجابة:</span> {r.answer}
                              </p>
                            )}
                            {r.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-sm font-medium">التقييم:</span>
                                {Array.from({ length: r.rating }, (_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                            )}
                            {r.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ملاحظات: {r.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
