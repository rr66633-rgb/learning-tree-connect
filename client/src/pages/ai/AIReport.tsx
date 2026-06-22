import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Sparkles, Copy, Loader2, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AIReport() {
  const [childId, setChildId] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [result, setResult] = useState<any>(null);

  const childrenQuery = trpc.children.list.useQuery(undefined, { retry: false });
  const children = childrenQuery.data || [];

  const [contentId, setContentId] = useState<number | null>(null);

  const generateMutation = trpc.ai.generateProgressReport.useMutation({
    onSuccess: (data: any) => { setResult(data); setContentId(data.id ? Number(data.id) : null); toast.success("تم إنشاء التقرير بنجاح"); },
    onError: (err) => { const msg = err.message || "حدث خطأ"; toast.error(msg.includes("JSON") || msg.includes("parse") || msg.includes("Unterminated") ? "حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى." : msg); },
  });

  const saveMutation = trpc.ai.saveToLibrary.useMutation({
    onSuccess: () => toast.success("تم الحفظ في المكتبة"),
    onError: (err) => toast.error(err.message || "فشل الحفظ"),
  });

  const handleSaveToLibrary = () => {
    if (!contentId) { toast.error("لا يوجد محتوى لحفظه"); return; }
    saveMutation.mutate({ contentId });
  };

  const handleGenerate = () => {
    if (!childId) { toast.error("يرجى اختيار الطفل"); return; }
    generateMutation.mutate({ childId: Number(childId), language });
  };

  const handleExportPDF = () => {
    if (!result) return;
    // Create printable content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>تقرير التقدم</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.8;direction:rtl}
      h1{color:#7C3AED;border-bottom:2px solid #7C3AED;padding-bottom:10px}
      h2{color:#2c5f7c;margin-top:20px}
      .section{margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px}
      </style></head><body>
      <h1>${result.title || 'تقرير التقدم'}</h1>
      ${result.summary ? `<div class="section"><h2>الملخص</h2><p>${result.summary}</p></div>` : ''}
      ${result.strengths ? `<div class="section"><h2>نقاط القوة</h2><ul>${(Array.isArray(result.strengths) ? result.strengths : [result.strengths]).map((s: string) => `<li>${s}</li>`).join('')}</ul></div>` : ''}
      ${result.areasForDevelopment ? `<div class="section"><h2>مجالات التطوير</h2><ul>${(Array.isArray(result.areasForDevelopment) ? result.areasForDevelopment : [result.areasForDevelopment]).map((s: string) => `<li>${s}</li>`).join('')}</ul></div>` : ''}
      ${result.nextSteps ? `<div class="section"><h2>الخطوات التالية</h2><ul>${(Array.isArray(result.nextSteps) ? result.nextSteps : [result.nextSteps]).map((s: string) => `<li>${s}</li>`).join('')}</ul></div>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai"><Button variant="ghost" size="icon" className="shrink-0"><ArrowRight className="h-5 w-5" /></Button></Link>
        <div className="p-2 rounded-xl bg-emerald-100"><BarChart3 className="h-5 w-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">تقرير التقدم</h1>
          <p className="text-sm text-muted-foreground">Progress Report</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">المدخلات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>اختر الطفل</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger><SelectValue placeholder="اختر طفلاً" /></SelectTrigger>
                <SelectContent>
                  {(children as any[]).map((child: any) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.arabicName || `${child.firstName} ${child.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "ar" | "en")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              <p>سيقوم النظام بقراءة سجلات الحضور والملاحظات والتقييمات والتقارير اليومية لإنشاء تقرير شامل.</p>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
              {generateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري التحليل...</>) : (<><Sparkles className="h-4 w-4 ml-2" />إنشاء التقرير</>)}
            </Button>
          </CardContent>
        </Card>

        <Card className={result ? "border-emerald-200" : "border-dashed"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>التقرير</span>
              {result && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("تم النسخ"); }}><Copy className="h-4 w-4 ml-1" />نسخ</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 ml-1" />PDF</Button>
                  <Button variant="ghost" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}><Save className="h-4 w-4 ml-1" />حفظ</Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
                <p>اختر طفلاً لإنشاء تقرير تقدم شامل لولي الأمر</p>
              </div>
            )}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-3" />
                <p className="text-sm text-muted-foreground">جاري تحليل البيانات وكتابة التقرير...</p>
              </div>
            )}
            {result && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {result.title && <h3 className="font-bold text-lg text-gray-900">{result.title}</h3>}
                {result.summary && <p className="text-gray-600 text-sm leading-relaxed">{result.summary}</p>}
                {result.strengths && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                    <Label className="text-xs text-green-600">نقاط القوة</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                      {(Array.isArray(result.strengths) ? result.strengths : [result.strengths]).map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {result.areasForDevelopment && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <Label className="text-xs text-amber-600">مجالات التطوير</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                      {(Array.isArray(result.areasForDevelopment) ? result.areasForDevelopment : [result.areasForDevelopment]).map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {result.nextSteps && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <Label className="text-xs text-blue-600">الخطوات التالية للتعلم</Label>
                    <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                      {(Array.isArray(result.nextSteps) ? result.nextSteps : [result.nextSteps]).map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {result.attendanceSummary && (
                  <div className="p-3 rounded-lg bg-gray-50 border">
                    <Label className="text-xs text-muted-foreground">ملخص الحضور</Label>
                    <p className="text-sm text-gray-700">{result.attendanceSummary}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
