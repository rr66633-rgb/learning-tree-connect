import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FileText, Sparkles, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useTranslation } from "react-i18next";

export default function EngagementReports() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [period, setPeriod] = useState<string>("monthly");
  const [language, setLanguage] = useState<string>("ar");
  const [report, setReport] = useState<any>(null);
  const [childInfo, setChildInfo] = useState<any>(null);

  const { data: childrenList, isLoading: childrenLoading } = trpc.children.list.useQuery();

  const generateMutation = trpc.engagement.reports.generate.useMutation({
    onSuccess: (data) => {
      setReport(data.report);
      setChildInfo(data.child);
      toast.success(isAr ? "تم إنشاء التقرير بنجاح" : "Report created successfully");
    },
    onError: () => toast.error(isAr ? "حدث خطأ أثناء إنشاء التقرير" : "Error creating report"),
  });

  const handleGenerate = () => {
    if (!selectedChildId) {
      toast.error(isAr ? "يرجى اختيار طفل" : "Please select a child");
      return;
    }
    generateMutation.mutate({
      childId: Number(selectedChildId),
      period: period as any,
      language: language as any,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-500" />
          {isAr ? "تقارير مشاركة الأسر" : "Family Engagement Reports"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "أنشئ تقارير مفصلة عن مشاركة الأسر في تعليم أطفالهم" : "Generate Detailed Reports on Family Engagement in Children\'s Education"}
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isAr ? "الطفل" : "Child"}</label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? "اختر طفلاً" : "Select a Child"} />
                </SelectTrigger>
                <SelectContent>
                  {childrenList?.map((child: any) => (
                    <SelectItem key={child.id} value={String(child.id)}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isAr ? "الفترة" : "Period"}</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{isAr ? "أسبوعي" : "Weekly"}</SelectItem>
                  <SelectItem value="monthly">{isAr ? "شهري" : "Monthly"}</SelectItem>
                  <SelectItem value="term">{isAr ? "فصلي" : " الفصل"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isAr ? "اللغة" : "Language"}</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{isAr ? "العربية" : "Arabic"}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !selectedChildId}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {generateMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 ml-2 animate-pulse" />
                  {isAr ? "جاري الإنشاء..." : "Creating..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 ml-2" />
                  {isAr ? "إنشاء التقرير" : "Generate Report"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {generateMutation.isPending && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="h-10 w-10 text-indigo-500 mx-auto animate-pulse" />
            <p className="text-lg font-medium">{isAr ? "جاري إنشاء التقرير بالذكاء الاصطناعي..." : "Generating AI Report..."}</p>
            <p className="text-sm text-muted-foreground">{isAr ? "قد يستغرق هذا بضع ثوانٍ" : "This may take a few seconds"}</p>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {report && !generateMutation.isPending && (
        <div className="space-y-4">
          {/* Report Actions */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{report.title}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-1" />
                {isAr ? "طباعة" : "Print"}
              </Button>
            </div>
          </div>

          {/* Report Summary */}
          <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{report.summary}</p>
            </CardContent>
          </Card>

          {/* Report Sections */}
          <Card className="print:shadow-none">
            <CardContent className="p-6 space-y-6">
              {childInfo && (
                <div className="text-center pb-4 border-b">
                  <h3 className="text-lg font-bold">{childInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">{isAr ? "العمر:" : "Age:"} {childInfo.age} {isAr ? "شهر" : "Month"}</p>
                </div>
              )}
              {report.sections?.map((section: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <h4 className="font-bold text-base border-r-4 border-indigo-500 pr-3">{section.heading}</h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                    <Streamdown>{section.content}</Streamdown>
                  </div>
                  {idx < report.sections.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!report && !generateMutation.isPending && (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-lg">{isAr ? "لم يتم إنشاء تقرير بعد" : "No report has been generated yet"}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              اختر طفلاً والفترة الزمنية ثم اضغط على (isAr ? "إنشاء التقرير" : "Create Report") لإنشاء تقرير مفصل عن مشاركة الأسرة
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
