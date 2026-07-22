import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function useWeeklyPlanPdf() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.plan) {
        toast.error(isAr ? "لا توجد بيانات الخطة لتحميل PDF" : "No plan data available for PDF download");
        return;
      }
      try {
        const { generateWeeklyPlanPdf } = await import("@/lib/weeklyPlanPdf");
        await generateWeeklyPlanPdf(detail.plan);
        toast.success(isAr ? "تم فتح صفحة الطباعة. اختر 'حفظ كـ PDF' من خيارات الطابعة." : "Print page opened. Choose 'Save as PDF' from printer options.");
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
