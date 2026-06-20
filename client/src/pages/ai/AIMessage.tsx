import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, MessageSquare, Sparkles, Copy, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AIMessage() {
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState<any>(null);

  const [contentId, setContentId] = useState<number | null>(null);

  const generateMutation = trpc.ai.generateParentMessage.useMutation({
    onSuccess: (data: any) => { setResult(data); setContentId(data.id ? Number(data.id) : null); toast.success("تم إنشاء الرسالة بنجاح"); },
    onError: (err) => toast.error(err.message || "حدث خطأ"),
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
    if (!idea.trim()) { toast.error("يرجى إدخال فكرة الرسالة"); return; }
    generateMutation.mutate({ idea });
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ai"><Button variant="ghost" size="icon" className="shrink-0"><ArrowRight className="h-5 w-5" /></Button></Link>
        <div className="p-2 rounded-xl bg-pink-100"><MessageSquare className="h-5 w-5 text-pink-600" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">رسائل أولياء الأمور</h1>
          <p className="text-sm text-muted-foreground">Parent Message Generator</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">الفكرة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>اكتب فكرة الرسالة باختصار</Label>
              <Textarea
                placeholder="مثال: رحلة ميدانية يوم الخميس القادم&#10;أو: تذكير بدفع الرسوم&#10;أو: إغلاق الحضانة بسبب العيد"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={5}
              />
            </div>
            <div className="p-3 rounded-lg bg-pink-50 border border-pink-100 text-sm text-pink-700">
              <p>سيتم إنشاء رسالة مهنية بالعربية والإنجليزية جاهزة للإرسال.</p>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700">
              {generateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الإنشاء...</>) : (<><Sparkles className="h-4 w-4 ml-2" />إنشاء الرسالة</>)}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Arabic Message */}
          <Card className={result ? "border-pink-200" : "border-dashed"}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>الرسالة بالعربية</span>
                {result?.messageAr && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copyText(result.messageAr)}><Copy className="h-4 w-4 ml-1" />نسخ</Button>
                    <Button variant="ghost" size="sm" onClick={handleSaveToLibrary} disabled={saveMutation.isPending}><Save className="h-4 w-4 ml-1" />حفظ</Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result && !generateMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">اكتب فكرة بسيطة وسيتم إنشاء رسالة مهنية</p>
                </div>
              )}
              {generateMutation.isPending && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                </div>
              )}
              {result?.messageAr && (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">{result.messageAr}</div>
              )}
            </CardContent>
          </Card>

          {/* English Message */}
          <Card className={result ? "border-blue-200" : "border-dashed"}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>English Message</span>
                {result?.messageEn && <Button variant="ghost" size="sm" onClick={() => copyText(result.messageEn)}><Copy className="h-4 w-4 ml-1" />Copy</Button>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result && !generateMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <p className="text-sm">English version will appear here</p>
                </div>
              )}
              {generateMutation.isPending && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              )}
              {result?.messageEn && (
                <div dir="ltr" className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">{result.messageEn}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
