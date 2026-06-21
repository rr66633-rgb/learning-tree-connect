/**
 * Weekly Plan PDF Generator (Client-side)
 * Calls the server-side PDFKit endpoint for proper Arabic text rendering.
 * Works on all devices including iOS Safari.
 */

interface WeeklyPlanPdfData {
  theme: string;
  ageGroup: string;
  weekStart: string;
  weekEnd: string;
  language: string;
  sections: Record<string, string>;
  className?: string;
}

/**
 * Downloads a PDF of the weekly plan by calling the server-side PDF generator.
 * The server uses PDFKit with embedded Noto Sans Arabic font for proper
 * Arabic letter shaping, RTL support, and connected letters.
 */
export async function generateWeeklyPlanPdf(plan: any): Promise<void> {
  // Prepare the data for the server
  const planData: WeeklyPlanPdfData = {
    theme: plan.theme || "",
    ageGroup: plan.ageGroup || "",
    weekStart: plan.weekStartDate || plan.weekStart || "",
    weekEnd: plan.weekEndDate || plan.weekEnd || "",
    language: plan.language || "ar",
    sections: {},
    className: plan.className,
  };

  // Flatten sections to strings for the server
  const sections = plan.sections as Record<string, any>;
  if (sections) {
    for (const [key, value] of Object.entries(sections)) {
      if (!value) continue;
      if (typeof value === "string") {
        planData.sections[key] = value;
      } else if (Array.isArray(value)) {
        planData.sections[key] = flattenArrayToText(value);
      } else if (typeof value === "object") {
        planData.sections[key] = flattenObjectToText(value);
      } else {
        planData.sections[key] = String(value);
      }
    }
  }

  // Call the server endpoint
  const response = await fetch("/api/generate-pdf/weekly-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(planData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "فشل في إنشاء ملف PDF" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  // Download the PDF blob
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `خطة-${planData.theme}-${planData.weekStart}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function flattenArrayToText(arr: any[]): string {
  return arr
    .map((item, i) => {
      if (typeof item === "string") return `${i + 1}. ${item}`;
      if (typeof item === "object" && item !== null) {
        const parts: string[] = [];
        if (item.title || item.name) parts.push(item.title || item.name);
        if (item.description) parts.push(item.description);
        if (item.implementation) parts.push(item.implementation);
        if (item.materials) {
          const mats = Array.isArray(item.materials) ? item.materials.join("، ") : item.materials;
          parts.push(`المواد: ${mats}`);
        }
        if (item.duration) parts.push(`المدة: ${item.duration}`);
        if (item.steps) {
          const steps = Array.isArray(item.steps) ? item.steps.join(" ← ") : item.steps;
          parts.push(`الخطوات: ${steps}`);
        }
        if (item.concept || item.math_concept) parts.push(item.concept || item.math_concept);
        if (item.experiment) parts.push(item.experiment);
        if (item.targeted_senses) {
          const senses = Array.isArray(item.targeted_senses) ? item.targeted_senses.join("، ") : item.targeted_senses;
          parts.push(`الحواس المستهدفة: ${senses}`);
        }
        if (item.targeted_skills) {
          const skills = Array.isArray(item.targeted_skills) ? item.targeted_skills.join("، ") : item.targeted_skills;
          parts.push(`المهارات المستهدفة: ${skills}`);
        }
        if (item.surah) parts.push(`السورة: ${item.surah}`);
        if (item.verse) parts.push(item.verse);
        if (item.dua) parts.push(`الدعاء: ${item.dua}`);
        if (item.islamic_value) parts.push(`القيمة الإسلامية: ${item.islamic_value}`);
        return `${i + 1}. ${parts.join("\n   ")}`;
      }
      return `${i + 1}. ${String(item)}`;
    })
    .join("\n");
}

function flattenObjectToText(obj: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (!value) continue;
    const label = key.replace(/_/g, " ");
    if (typeof value === "string") {
      lines.push(`${label}: ${value}`);
    } else if (Array.isArray(value)) {
      lines.push(`${label}: ${value.join("، ")}`);
    } else if (typeof value === "object") {
      lines.push(`${label}: ${flattenObjectToText(value)}`);
    } else {
      lines.push(`${label}: ${String(value)}`);
    }
  }
  return lines.join("\n");
}
