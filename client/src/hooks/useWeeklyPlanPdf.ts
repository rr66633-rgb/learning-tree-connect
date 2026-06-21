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
        toast.info("جاري إنشاء ملف PDF...");
        const { generateWeeklyPlanPdf } = await import("@/lib/weeklyPlanPdf");
        await generateWeeklyPlanPdf(detail.plan);
        toast.success("تم تحميل PDF بنجاح");
      } catch (err) {
        console.error("PDF generation failed:", err);
        toast.error("فشل في إنشاء ملف PDF");
      }
    };

    window.addEventListener("download-weekly-plan-pdf", handler);
    return () => window.removeEventListener("download-weekly-plan-pdf", handler);
  }, []);
}
