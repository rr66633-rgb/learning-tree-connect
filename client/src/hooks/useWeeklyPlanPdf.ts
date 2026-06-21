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
      const toastId = toast.loading("جاري تحميل الخطوط العربية وإنشاء ملف PDF...");
      try {
        const { generateWeeklyPlanPdf } = await import("@/lib/weeklyPlanPdf");
        await generateWeeklyPlanPdf(detail.plan);
        toast.success("تم تحميل PDF بنجاح", { id: toastId });
      } catch (err) {
        console.error("PDF generation failed:", err);
        toast.error("فشل في إنشاء ملف PDF. يرجى المحاولة مرة أخرى.", { id: toastId });
      }
    };

    window.addEventListener("download-weekly-plan-pdf", handler);
    return () => window.removeEventListener("download-weekly-plan-pdf", handler);
  }, []);
}
