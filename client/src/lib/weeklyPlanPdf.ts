/**
 * Weekly Plan PDF Generator
 * Uses jsPDF to create a professional, branded PDF with Arabic RTL support.
 * Since jsPDF has limited Arabic support, we use a hybrid approach:
 * - English text for structural elements
 * - Arabic content rendered with proper encoding
 */

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  theme_overview: { ar: "نظرة عامة على الموضوع", en: "Theme Overview" },
  learning_objectives: { ar: "أهداف التعلم", en: "Learning Objectives" },
  arabic_activities: { ar: "أنشطة اللغة العربية", en: "Arabic Activities" },
  english_activities: { ar: "أنشطة اللغة الإنجليزية", en: "English Activities" },
  math_activities: { ar: "أنشطة الرياضيات", en: "Math Activities" },
  science_activities: { ar: "أنشطة العلوم", en: "Science Activities" },
  art_activities: { ar: "أنشطة الفنون", en: "Art Activities" },
  sensory_activities: { ar: "أنشطة حسية", en: "Sensory Activities" },
  physical_activities: { ar: "أنشطة بدنية", en: "Physical Activities" },
  quran_islamic: { ar: "القرآن والدراسات الإسلامية", en: "Quran & Islamic Studies" },
  story_of_week: { ar: "قصة الأسبوع", en: "Story of the Week" },
  song_of_week: { ar: "نشيد الأسبوع", en: "Song of the Week" },
  home_activity: { ar: "نشاط منزلي", en: "Home Activity" },
  parent_notes: { ar: "ملاحظات لأولياء الأمور", en: "Parent Notes" },
};

const AGE_GROUP_LABELS: Record<string, string> = {
  nursery: "Nursery (2-3 years)",
  kg1: "KG1 (3-4 years)",
  kg2: "KG2 (4-5 years)",
  kg3: "KG3 (5-6 years)",
};

const SECTION_COLORS: Record<string, [number, number, number]> = {
  theme_overview: [16, 185, 129],    // emerald
  learning_objectives: [59, 130, 246], // blue
  arabic_activities: [245, 158, 11],   // amber
  english_activities: [99, 102, 241],  // indigo
  math_activities: [168, 85, 247],     // purple
  science_activities: [20, 184, 166],  // teal
  art_activities: [236, 72, 153],      // pink
  sensory_activities: [249, 115, 22],  // orange
  physical_activities: [239, 68, 68],  // red
  quran_islamic: [16, 185, 129],       // emerald
  story_of_week: [139, 92, 246],       // violet
  song_of_week: [14, 165, 233],        // sky
  home_activity: [132, 204, 22],       // lime
  parent_notes: [6, 182, 212],         // cyan
};

function flattenContent(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item, i) => {
      if (typeof item === "string") return `${i + 1}. ${item}`;
      if (typeof item === "object") {
        const parts: string[] = [];
        if (item.title) parts.push(item.title);
        if (item.description) parts.push(item.description);
        if (item.materials) parts.push(`Materials: ${Array.isArray(item.materials) ? item.materials.join(", ") : item.materials}`);
        if (item.duration) parts.push(`Duration: ${item.duration}`);
        if (item.implementation) parts.push(`Implementation: ${item.implementation}`);
        if (item.steps) parts.push(`Steps: ${Array.isArray(item.steps) ? item.steps.join(" > ") : item.steps}`);
        if (item.concept || item.math_concept) parts.push(`Concept: ${item.concept || item.math_concept}`);
        if (item.experiment) parts.push(`Experiment: ${item.experiment}`);
        if (item.targeted_senses) parts.push(`Senses: ${Array.isArray(item.targeted_senses) ? item.targeted_senses.join(", ") : item.targeted_senses}`);
        if (item.targeted_skills) parts.push(`Skills: ${Array.isArray(item.targeted_skills) ? item.targeted_skills.join(", ") : item.targeted_skills}`);
        return `${i + 1}. ${parts.join("\n   ")}`;
      }
      return String(item);
    }).join("\n\n");
  }
  if (typeof content === "object") {
    return Object.entries(content).map(([key, value]) => {
      if (!value) return "";
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
      if (Array.isArray(value)) return `${label}: ${(value as string[]).join(", ")}`;
      return `${label}: ${String(value)}`;
    }).filter(Boolean).join("\n");
  }
  return String(content);
}

export async function generateWeeklyPlanPdf(plan: any) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const sections = plan.sections as Record<string, any>;
  if (!sections) return;

  // ============ COVER PAGE ============
  // Background gradient header
  doc.setFillColor(30, 70, 50); // Forest Green
  doc.rect(0, 0, pageWidth, 80, "F");

  // Decorative accent
  doc.setFillColor(134, 239, 172); // Sage Green accent
  doc.rect(0, 75, pageWidth, 8, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Learning Tree Kids Center", pageWidth / 2, 25, { align: "center" });

  doc.setFontSize(18);
  doc.text("Weekly Learning Plan", pageWidth / 2, 40, { align: "center" });

  // Theme
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`Theme: ${plan.theme}`, pageWidth / 2, 55, { align: "center" });

  // Date and age group
  doc.setFontSize(11);
  doc.text(`${plan.weekStartDate} - ${plan.weekEndDate}`, pageWidth / 2, 67, { align: "center" });

  // Info section below header
  doc.setTextColor(50, 50, 50);
  y = 100;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Plan Details", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Age Group: ${AGE_GROUP_LABELS[plan.ageGroup] || plan.ageGroup}`, margin, y);
  y += 7;
  doc.text(`Week: ${plan.weekStartDate} to ${plan.weekEndDate}`, margin, y);
  y += 7;
  doc.text(`Language: ${plan.language === "ar" ? "Arabic" : plan.language === "en" ? "English" : "Bilingual"}`, margin, y);
  y += 7;
  doc.text(`Status: ${plan.status === "published" ? "Published" : "Draft"}`, margin, y);
  y += 15;

  // Sections overview
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Plan Sections (14 Areas):", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sectionKeys = Object.keys(SECTION_LABELS);
  for (let i = 0; i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    const label = SECTION_LABELS[key];
    const num = String(i + 1).padStart(2, "0");
    doc.text(`${num}. ${label.en} - ${label.ar}`, margin + 5, y);
    y += 6;
  }

  // Footer on cover
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Generated by Learning Tree AI Weekly Plan Generator", pageWidth / 2, pageHeight - 15, { align: "center" });
  doc.text("EYFS Framework | Saudi Cultural Values | Islamic Values", pageWidth / 2, pageHeight - 10, { align: "center" });

  // ============ CONTENT PAGES ============
  for (const key of sectionKeys) {
    doc.addPage();
    y = margin;

    const label = SECTION_LABELS[key];
    const color = SECTION_COLORS[key] || [30, 70, 50];
    const content = sections[key];

    // Section header bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(0, 0, pageWidth, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(label.en, pageWidth / 2, 13, { align: "center" });

    // Arabic subtitle
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(label.ar, pageWidth / 2, 18, { align: "center" });

    y = 30;

    // Content
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const textContent = flattenContent(content);
    const lines = doc.splitTextToSize(textContent, contentWidth);

    for (const line of lines) {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;
        // Mini header on continuation pages
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(0, 0, pageWidth, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${label.en} (continued)`, pageWidth / 2, 7, { align: "center" });
        y = 18;
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
      }
      doc.text(line, margin, y);
      y += 5;
    }

    // Page footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Learning Tree | ${plan.theme} | ${plan.weekStartDate}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  // Save
  const filename = `Weekly-Plan-${plan.theme.replace(/\s+/g, "-")}-${plan.weekStartDate}.pdf`;
  doc.save(filename);
}
