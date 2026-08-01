/**
 * Weekly Plan PDF Generator (Client-side)
 * Uses jsPDF to generate a real PDF file and download it directly.
 * Works on all devices including iOS Safari without needing print dialog.
 */
import jsPDF from "jspdf";
import "jspdf-autotable";

// Section colors matching the app UI
const SECTION_COLORS: Record<string, [number, number, number]> = {
  theme_overview: [46, 125, 50],
  learning_objectives: [21, 101, 192],
  arabic_activities: [106, 27, 154],
  english_activities: [0, 131, 143],
  math_activities: [230, 81, 0],
  science_activities: [46, 125, 50],
  art_activities: [173, 20, 87],
  sensory_activities: [69, 39, 160],
  physical_activities: [239, 108, 0],
  quran_islamic: [27, 94, 32],
  story_of_week: [93, 64, 55],
  song_of_week: [198, 40, 40],
  home_activity: [0, 105, 92],
  parent_notes: [55, 71, 79],
};

const SECTION_LABELS: Record<string, string> = {
  theme_overview: "نظرة عامة على الموضوع",
  learning_objectives: "أهداف التعلم",
  arabic_activities: "أنشطة اللغة العربية",
  english_activities: "أنشطة اللغة الإنجليزية",
  math_activities: "أنشطة الرياضيات",
  science_activities: "أنشطة العلوم",
  art_activities: "أنشطة الفنون",
  sensory_activities: "أنشطة حسية",
  physical_activities: "أنشطة بدنية",
  quran_islamic: "القرآن والدراسات الإسلامية",
  story_of_week: "قصة الأسبوع",
  song_of_week: "نشيد الأسبوع",
  home_activity: "نشاط منزلي",
  parent_notes: "ملاحظات لأولياء الأمور",
};

const AGE_GROUP_LABELS: Record<string, string> = {
  nursery: "حضانة (٢-٣ سنوات)",
  kg1: "تمهيدي أول KG1 (٣-٤ سنوات)",
  kg2: "تمهيدي ثاني KG2 (٤-٥ سنوات)",
  kg3: "تمهيدي ثالث KG3 (٥-٦ سنوات)",
};

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
        return `${i + 1}. ${parts.join(" | ")}`;
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

function prepareSections(plan: any): Record<string, string> {
  const result: Record<string, string> = {};
  const sections = plan.sections as Record<string, any>;
  if (sections) {
    for (const [key, value] of Object.entries(sections)) {
      if (!value) continue;
      if (typeof value === "string") {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = flattenArrayToText(value);
      } else if (typeof value === "object") {
        result[key] = flattenObjectToText(value);
      } else {
        result[key] = String(value);
      }
    }
  }
  return result;
}

/**
 * Load the Noto Sans Arabic font for jsPDF.
 * Uses the uploaded TTF font from storage for reliable Arabic rendering.
 */
async function loadArabicFont(doc: jsPDF): Promise<void> {
  const fontUrls = [
    { url: "/manus-storage/NotoSansArabic-Regular_e1f3d88c.ttf", name: "NotoSansArabic-Regular.ttf", family: "NotoSansArabic", style: "normal" },
    { url: "/manus-storage/NotoSansArabic-Bold_d29d5a95.ttf", name: "NotoSansArabic-Bold.ttf", family: "NotoSansArabic", style: "bold" },
  ];

  let fontLoaded = false;

  for (const font of fontUrls) {
    try {
      const response = await fetch(font.url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        // Convert to binary string in chunks to avoid stack overflow
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);
        doc.addFileToVFS(font.name, base64);
        doc.addFont(font.name, font.family, font.style);
        if (!fontLoaded) {
          doc.setFont(font.family, font.style);
          fontLoaded = true;
        }
      }
    } catch (e) {
      console.warn(`[WeeklyPlanPDF] Failed to load font ${font.name}:`, e);
    }
  }

  // Fallback: try CDN Amiri font if storage fonts failed
  if (!fontLoaded) {
    try {
      const cdnUrl = "https://cdn.jsdelivr.net/gh/nicholasgasior/gfonts-woff2-to-base64/fonts/amiri/amiri-regular.base64.txt";
      const response = await fetch(cdnUrl);
      if (response.ok) {
        const base64Text = await response.text();
        doc.addFileToVFS("Amiri-Regular.ttf", base64Text.trim());
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        doc.setFont("Amiri");
        fontLoaded = true;
      }
    } catch {
      console.warn("[WeeklyPlanPDF] All font loading attempts failed, using default font");
    }
  }
}

/**
 * Generates and downloads a PDF of the weekly plan directly.
 * No print dialog needed - works on iOS Safari, Android, and desktop.
 */
export async function generateWeeklyPlanPdf(plan: any): Promise<void> {
  const theme = plan.theme || "خطة";
  const ageGroup = plan.ageGroup || "";
  const weekStart = plan.weekStartDate || plan.weekStart || "";
  const weekEnd = plan.weekEndDate || plan.weekEnd || "";
  const className = plan.className || "";
  const sections = prepareSections(plan);
  const ageLabel = AGE_GROUP_LABELS[ageGroup] || ageGroup;

  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Try to load Arabic font
  await loadArabicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Helper function to add RTL text
  const addRtlText = (text: string, x: number, y: number, options?: any) => {
    doc.text(text, x, y, { align: "right", ...options });
  };

  // ===== COVER PAGE =====
  // Header background
  doc.setFillColor(27, 94, 32);
  doc.roundedRect(margin, 20, contentWidth, 50, 3, 3, "F");

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  addRtlText("نشأة", pageWidth - margin - 5, 35);
  doc.setFontSize(20);
  addRtlText("الخطة الأسبوعية", pageWidth - margin - 5, 48);
  doc.setFontSize(16);
  addRtlText(theme, pageWidth - margin - 5, 60);
  doc.setFontSize(10);
  addRtlText(`${weekStart} — ${weekEnd}`, pageWidth - margin - 5, 68);

  // Plan details box
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(248, 250, 249);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, 80, contentWidth, 40, 2, 2, "FD");

  doc.setFontSize(12);
  doc.setTextColor(27, 94, 32);
  addRtlText("تفاصيل الخطة", pageWidth - margin - 5, 90);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  let detailY = 100;
  addRtlText(`الفئة العمرية: ${ageLabel}`, pageWidth - margin - 5, detailY);
  detailY += 7;
  addRtlText(`الأسبوع: ${weekStart} إلى ${weekEnd}`, pageWidth - margin - 5, detailY);
  detailY += 7;
  if (className) {
    addRtlText(`الفصل: ${className}`, pageWidth - margin - 5, detailY);
  }

  // Table of contents
  let tocY = 130;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, tocY - 5, contentWidth, 10, 2, 2, "FD");

  doc.setFontSize(12);
  doc.setTextColor(27, 94, 32);
  const sectionKeys = Object.keys(SECTION_LABELS);
  const activeSections = sectionKeys.filter(k => sections[k]);
  addRtlText(`أقسام الخطة (${activeSections.length} مجالاً)`, pageWidth - margin - 5, tocY + 2);

  tocY += 12;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  let tocIndex = 0;
  for (const key of activeSections) {
    tocIndex++;
    const label = SECTION_LABELS[key] || key;
    const color = SECTION_COLORS[key] || [51, 51, 51];
    doc.setTextColor(color[0], color[1], color[2]);
    addRtlText(`${tocIndex}. ${label}`, pageWidth - margin - 5, tocY);
    tocY += 6;
    if (tocY > pageHeight - 30) break;
  }

  // Footer
  doc.setTextColor(170, 170, 170);
  doc.setFontSize(7);
  doc.text("نشأة | الخطة الأسبوعية الذكية", pageWidth / 2, pageHeight - 10, { align: "center" });

  // ===== SECTION PAGES =====
  for (const key of activeSections) {
    const content = sections[key];
    if (!content) continue;

    doc.addPage();

    const color = SECTION_COLORS[key] || [51, 51, 51];
    const label = SECTION_LABELS[key] || key;

    // Section header
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(margin, 15, contentWidth, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    addRtlText(label, pageWidth - margin - 5, 24);

    // Section content
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);

    const lines = content.split("\n").filter((l: string) => l.trim());
    let y = 40;
    const lineHeight = 6;
    const maxY = pageHeight - 20;

    for (const line of lines) {
      if (y > maxY) {
        doc.addPage();
        // Re-add section header on continuation
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(margin, 15, contentWidth, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        addRtlText(`${label} (تابع)`, pageWidth - margin - 5, 22);
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        y = 35;
      }

      const trimmed = line.trim();
      // Wrap long lines
      const splitLines = doc.splitTextToSize(trimmed, contentWidth - 10);
      for (const splitLine of splitLines) {
        if (y > maxY) {
          doc.addPage();
          doc.setFillColor(color[0], color[1], color[2]);
          doc.roundedRect(margin, 15, contentWidth, 10, 2, 2, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          addRtlText(`${label} (تابع)`, pageWidth - margin - 5, 22);
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(10);
          y = 35;
        }
        addRtlText(splitLine, pageWidth - margin - 5, y);
        y += lineHeight;
      }
      y += 1; // Extra spacing between items
    }

    // Page footer
    doc.setTextColor(170, 170, 170);
    doc.setFontSize(7);
    doc.text(`نشأة | ${theme} | ${weekStart}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  // Download the PDF
  const fileName = `خطة-${theme}-${weekStart}.pdf`;
  doc.save(fileName);
}
