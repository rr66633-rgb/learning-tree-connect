import { ArrowLeft, ArrowRight, CalendarDays, Copy, FileText, Loader2, Printer, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { AIResultContent, AI_TYPE_STYLES } from "@/components/ai/AIResultContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function AIResultDetail() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const resultQuery = trpc.ai.getById.useQuery(
    { id },
    { enabled: Number.isInteger(id) && id > 0, retry: false, staleTime: 60_000 },
  );

  const typeLabels: Record<string, string> = {
    observation: isAr ? "ملاحظة تعليمية" : "Observation",
    weekly_plan: isAr ? "خطة أسبوعية" : "Weekly plan",
    activity: isAr ? "نشاط تعليمي" : "Activity",
    progress_report: isAr ? "تقرير أو تقييم" : "Report or assessment",
    parent_message: isAr ? "رسالة لولي الأمر" : "Parent message",
    newsletter: isAr ? "نشرة" : "Newsletter",
    story: isAr ? "قصة" : "Story",
    marketing: isAr ? "محتوى تسويقي" : "Marketing content",
  };

  const copyResult = async () => {
    if (!resultQuery.data?.content) return;
    const value = typeof resultQuery.data.content === "string"
      ? resultQuery.data.content
      : JSON.stringify(resultQuery.data.content, null, 2);
    await navigator.clipboard.writeText(value);
    toast.success(isAr ? "تم نسخ النتيجة" : "Result copied");
  };

  if (!Number.isInteger(id) || id <= 0 || resultQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl p-5 md:p-8" dir={isAr ? "rtl" : "ltr"}>
        <Card className="border-dashed"><CardContent className="flex flex-col items-center py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/25" />
          <h1 className="font-bold">{isAr ? "النتيجة غير موجودة أو لا تملك صلاحية عرضها" : "This result was not found or you do not have access"}</h1>
          <Button asChild className="mt-5"><Link href="/ai/requests">{isAr ? "العودة إلى أعمالي الذكية" : "Back to My AI Work"}</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  if (resultQuery.isLoading || !resultQuery.data) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#00C9B7]" /></div>;
  }

  const result = resultQuery.data;
  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-5 p-4 sm:p-6 lg:p-8" dir={isAr ? "rtl" : "ltr"}>
      <header className="relative overflow-hidden rounded-3xl bg-[#1A1F36] px-5 py-6 text-white shadow-xl md:px-8 md:py-8 print-hide">
        <div className="absolute -start-16 -top-20 h-52 w-52 rounded-full bg-[#00C9B7]/25 blur-3xl" />
        <div className="absolute -bottom-20 end-12 h-40 w-40 rounded-full bg-[#FFB020]/10 blur-3xl" />
        <div className="relative">
          <Button asChild variant="ghost" size="sm" className="mb-5 -ms-2 text-white/70 hover:bg-white/10 hover:text-white">
            <Link href="/ai/requests">
              {isAr ? <ArrowRight className="me-2 h-4 w-4" /> : <ArrowLeft className="me-2 h-4 w-4" />}
              {isAr ? "العودة إلى أعمالي الذكية" : "Back to My AI Work"}
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00C9B7]/15 ring-1 ring-[#00C9B7]/30">
              <Sparkles className="h-6 w-6 text-[#57E2D6]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-bold text-[#57E2D6]">{isAr ? "نتيجة محفوظة" : "Saved result"}</p>
              <h1 className="text-xl font-black leading-8 md:text-3xl">{result.title}</h1>
            </div>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-white px-4 py-3 md:px-7">
          <Badge className={AI_TYPE_STYLES[result.type] || ""}>{typeLabels[result.type] || result.type}</Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", { dateStyle: "full", timeStyle: "short" }).format(new Date(result.createdAt))}
          </span>
          <div className="ms-auto flex items-center gap-2 print-hide">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={copyResult}>
              <Copy className="me-1.5 h-3.5 w-3.5" />{isAr ? "نسخ النتيجة" : "Copy result"}
            </Button>
            {/* Printing is done by the browser against this very page -- no
                popup window, no server round-trip, no second copy of the HTML
                to keep in sync. What is on screen is what comes out. */}
            <Button size="sm" className="rounded-xl" onClick={() => window.print()}>
              <Printer className="me-1.5 h-3.5 w-3.5" />{isAr ? "طباعة" : "Print"}
            </Button>
          </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8 print-area">
          {/* Paper has no header bar, so the printed sheet carries its own
              title, type and date -- otherwise it arrives unidentifiable. */}
          <div className="print-only mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-black">{result.title}</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {typeLabels[result.type] || result.type}
              {" · "}
              {new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", { dateStyle: "long" }).format(new Date(result.createdAt))}
            </p>
          </div>
          <AIResultContent value={result.content} isAr={isAr} />
        </div>
      </section>
    </main>
  );
}
