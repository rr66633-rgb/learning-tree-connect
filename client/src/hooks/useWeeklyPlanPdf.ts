import { useEffect } from "react";
import { toast } from "sonner";

export function useWeeklyPlanPdf() {
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.plan) {
        toast.error("لا توجد بيانات الخطة لتحميل PDF");
        return;
      }
      try {
        const { generateWeeklyPlanPdf } = await import("@/lib/weeklyPlanPdf");
        await generateWeeklyPlanPdf(detail.plan);
        toast.success("تم فتح صفحة الطباعة. اختر 'حفظ كـ PDF' من خيارات الطابعة.");
      } catch (err: any) {
        console.error("PDF generation failed:", err);
        const message = err?.message || "فشل في إنشاء ملف PDF. يرجى المحاولة مرة أخرى.";
        toast.error(message);
      }
    };

    window.addEventListener("download-weekly-plan-pdf", handler);
    return () => window.removeEventListener("download-weekly-plan-pdf", handler);
  }, []);
}
