/**
 * Weekly Plan PDF Generator (Client-side)
 * Uses html2canvas + jsPDF to render Arabic text correctly.
 * Creates a hidden HTML element, renders it to canvas, then converts to PDF.
 * Works on all devices including iOS Safari.
 */

// Section colors matching the app UI
const SECTION_COLORS: Record<string, string> = {
  theme_overview: "#2e7d32",
  learning_objectives: "#1565c0",
  arabic_activities: "#6a1b9a",
  english_activities: "#00838f",
  math_activities: "#e65100",
  science_activities: "#2e7d32",
  art_activities: "#ad1457",
  sensory_activities: "#4527a0",
  physical_activities: "#ef6c00",
  quran_islamic: "#1b5e20",
  story_of_week: "#5d4037",
  song_of_week: "#c62828",
  home_activity: "#00695c",
  parent_notes: "#37474f",
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

function flattenArrayToHtml(arr: any[]): string {
  return arr
    .map((item, i) => {
      if (typeof item === "string") return `<div class="plan-item"><span class="item-num">${i + 1}.</span> ${escapeHtml(item)}</div>`;
      if (typeof item === "object" && item !== null) {
        const parts: string[] = [];
        if (item.title || item.name) parts.push(`<strong>${escapeHtml(item.title || item.name)}</strong>`);
        if (item.description) parts.push(escapeHtml(item.description));
        if (item.implementation) parts.push(escapeHtml(item.implementation));
        if (item.materials) {
          const mats = Array.isArray(item.materials) ? item.materials.join("، ") : item.materials;
          parts.push(`<span class="label">المواد:</span> ${escapeHtml(mats)}`);
        }
        if (item.duration) parts.push(`<span class="label">المدة:</span> ${escapeHtml(item.duration)}`);
        if (item.steps) {
          const steps = Array.isArray(item.steps) ? item.steps.join(" ← ") : item.steps;
          parts.push(`<span class="label">الخطوات:</span> ${escapeHtml(steps)}`);
        }
        if (item.concept || item.math_concept) parts.push(escapeHtml(item.concept || item.math_concept));
        if (item.experiment) parts.push(escapeHtml(item.experiment));
        if (item.targeted_senses) {
          const senses = Array.isArray(item.targeted_senses) ? item.targeted_senses.join("، ") : item.targeted_senses;
          parts.push(`<span class="label">الحواس المستهدفة:</span> ${escapeHtml(senses)}`);
        }
        if (item.targeted_skills) {
          const skills = Array.isArray(item.targeted_skills) ? item.targeted_skills.join("، ") : item.targeted_skills;
          parts.push(`<span class="label">المهارات المستهدفة:</span> ${escapeHtml(skills)}`);
        }
        if (item.surah) parts.push(`<span class="label">السورة:</span> ${escapeHtml(item.surah)}`);
        if (item.verse) parts.push(escapeHtml(item.verse));
        if (item.dua) parts.push(`<span class="label">الدعاء:</span> ${escapeHtml(item.dua)}`);
        if (item.islamic_value) parts.push(`<span class="label">القيمة الإسلامية:</span> ${escapeHtml(item.islamic_value)}`);
        return `<div class="plan-item"><span class="item-num">${i + 1}.</span> ${parts.join(" <span class='sep'>|</span> ")}</div>`;
      }
      return `<div class="plan-item"><span class="item-num">${i + 1}.</span> ${escapeHtml(String(item))}</div>`;
    })
    .join("");
}

function flattenObjectToHtml(obj: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (!value) continue;
    const label = key.replace(/_/g, " ");
    if (typeof value === "string") {
      lines.push(`<div class="plan-item"><span class="label">${escapeHtml(label)}:</span> ${escapeHtml(value)}</div>`);
    } else if (Array.isArray(value)) {
      lines.push(`<div class="plan-item"><span class="label">${escapeHtml(label)}:</span> ${escapeHtml(value.join("، "))}</div>`);
    } else if (typeof value === "object") {
      lines.push(`<div class="plan-item"><span class="label">${escapeHtml(label)}:</span> ${flattenObjectToHtml(value)}</div>`);
    } else {
      lines.push(`<div class="plan-item"><span class="label">${escapeHtml(label)}:</span> ${escapeHtml(String(value))}</div>`);
    }
  }
  return lines.join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function prepareSectionsHtml(plan: any): Record<string, string> {
  const result: Record<string, string> = {};
  const sections = plan.sections as Record<string, any>;
  if (sections) {
    for (const [key, value] of Object.entries(sections)) {
      if (!value) continue;
      if (typeof value === "string") {
        result[key] = `<div class="plan-item">${escapeHtml(value)}</div>`;
      } else if (Array.isArray(value)) {
        result[key] = flattenArrayToHtml(value);
      } else if (typeof value === "object") {
        result[key] = flattenObjectToHtml(value);
      } else {
        result[key] = `<div class="plan-item">${escapeHtml(String(value))}</div>`;
      }
    }
  }
  return result;
}

/**
 * Build the full HTML document for the weekly plan
 */
function buildPlanHtml(plan: any): string {
  const theme = plan.theme || "خطة";
  const ageGroup = plan.ageGroup || "";
  const weekStart = plan.weekStartDate || plan.weekStart || "";
  const weekEnd = plan.weekEndDate || plan.weekEnd || "";
  const className = plan.className || "";
  const sections = prepareSectionsHtml(plan);
  const ageLabel = AGE_GROUP_LABELS[ageGroup] || ageGroup;

  const sectionKeys = Object.keys(SECTION_LABELS);
  const activeSections = sectionKeys.filter(k => sections[k]);

  // Build table of contents
  const tocHtml = activeSections
    .map((key, i) => {
      const label = SECTION_LABELS[key] || key;
      const color = SECTION_COLORS[key] || "#333";
      return `<div class="toc-item" style="color: ${color}">${i + 1}. ${label}</div>`;
    })
    .join("");

  // Build section pages
  const sectionPages = activeSections
    .map(key => {
      const content = sections[key];
      if (!content) return "";
      const color = SECTION_COLORS[key] || "#333";
      const label = SECTION_LABELS[key] || key;
      return `
        <div class="page section-page">
          <div class="section-header" style="background-color: ${color}">
            <h2>${label}</h2>
          </div>
          <div class="section-content">
            ${content}
          </div>
          <div class="page-footer">نشأة | ${escapeHtml(theme)} | ${escapeHtml(weekStart)}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div id="weekly-plan-pdf-container" dir="rtl" style="font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; width: 794px; background: white; color: #333;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
        
        #weekly-plan-pdf-container * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        #weekly-plan-pdf-container {
          font-size: 14px;
          line-height: 1.6;
        }
        .page {
          width: 794px;
          min-height: 1123px;
          padding: 40px;
          position: relative;
          page-break-after: always;
          background: white;
        }
        .cover-header {
          background-color: #1b5e20;
          border-radius: 8px;
          padding: 30px 25px;
          color: white;
          margin-bottom: 25px;
        }
        .cover-header .brand {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .cover-header h1 {
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .cover-header .theme-name {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .cover-header .dates {
          font-size: 13px;
          opacity: 0.85;
        }
        .details-box {
          background: #f8faf9;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 20px 25px;
          margin-bottom: 25px;
        }
        .details-box h3 {
          color: #1b5e20;
          font-size: 15px;
          margin-bottom: 12px;
        }
        .details-box .detail-line {
          color: #555;
          font-size: 13px;
          margin-bottom: 6px;
        }
        .toc-box {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 20px 25px;
        }
        .toc-box h3 {
          color: #1b5e20;
          font-size: 15px;
          margin-bottom: 12px;
        }
        .toc-item {
          font-size: 13px;
          padding: 3px 0;
          font-weight: 600;
        }
        .section-header {
          border-radius: 6px;
          padding: 12px 20px;
          color: white;
          margin-bottom: 20px;
        }
        .section-header h2 {
          font-size: 18px;
          font-weight: 700;
        }
        .section-content {
          padding: 0 5px;
        }
        .plan-item {
          margin-bottom: 10px;
          font-size: 13px;
          line-height: 1.7;
          padding: 6px 10px;
          border-radius: 4px;
          background: #fafafa;
          border-right: 3px solid #e0e0e0;
        }
        .plan-item .item-num {
          font-weight: 700;
          color: #1b5e20;
          margin-left: 4px;
        }
        .plan-item .label {
          font-weight: 600;
          color: #444;
        }
        .plan-item .sep {
          color: #ccc;
          margin: 0 4px;
        }
        .page-footer {
          position: absolute;
          bottom: 20px;
          left: 40px;
          right: 40px;
          text-align: center;
          font-size: 10px;
          color: #aaa;
        }
      </style>

      <!-- Cover Page -->
      <div class="page cover-page">
        <div class="cover-header">
          <div class="brand">نشأة</div>
          <h1>الخطة الأسبوعية</h1>
          <div class="theme-name">${escapeHtml(theme)}</div>
          <div class="dates">${escapeHtml(weekStart)} — ${escapeHtml(weekEnd)}</div>
        </div>

        <div class="details-box">
          <h3>تفاصيل الخطة</h3>
          <div class="detail-line">الفئة العمرية: ${escapeHtml(ageLabel)}</div>
          <div class="detail-line">الأسبوع: ${escapeHtml(weekStart)} إلى ${escapeHtml(weekEnd)}</div>
          ${className ? `<div class="detail-line">الفصل: ${escapeHtml(className)}</div>` : ""}
        </div>

        <div class="toc-box">
          <h3>أقسام الخطة (${activeSections.length} مجالاً)</h3>
          ${tocHtml}
        </div>

        <div class="page-footer">نشأة | الخطة الأسبوعية</div>
      </div>

      <!-- Section Pages -->
      ${sectionPages}
    </div>
  `;
}

/**
 * Generates and downloads a PDF of the weekly plan directly.
 * Uses html2canvas to render HTML with proper Arabic text, then converts to PDF.
 * Works on all devices including iOS Safari without needing print dialog.
 */
export async function generateWeeklyPlanPdf(plan: any): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const theme = plan.theme || "خطة";
  const weekStart = plan.weekStartDate || plan.weekStart || "";

  // Create an iframe to isolate from page CSS (avoids oklch color parsing errors)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-99999px";
  iframe.style.left = "-99999px";
  iframe.style.width = "794px";
  iframe.style.height = "20000px";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Failed to create iframe for PDF rendering");
  }

  // Write the HTML content into the iframe (completely isolated from page CSS)
  const htmlContent = buildPlanHtml(plan);
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:white;">${htmlContent}</body></html>`);
  iframeDoc.close();

  // Wait for fonts to load in iframe
  await new Promise(resolve => setTimeout(resolve, 1500));
  try {
    await iframeDoc.fonts?.ready;
  } catch {
    // fonts.ready may not be available in all contexts
  }
  // Extra delay for font rendering
  await new Promise(resolve => setTimeout(resolve, 500));

  const pdfContainer = iframeDoc.querySelector("#weekly-plan-pdf-container") as HTMLElement;
  if (!pdfContainer) {
    document.body.removeChild(iframe);
    throw new Error("Failed to find PDF container");
  }

  const pages = pdfContainer.querySelectorAll(".page");

  // Create PDF (A4 size)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;

    if (i > 0) {
      doc.addPage();
    }

    // Render page to canvas using html2canvas
    const canvas = await html2canvas(page, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794,
      height: 1123,
      logging: false,
      windowWidth: 794,
      windowHeight: 1123,
    });

    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  }

  // Clean up
  document.body.removeChild(iframe);

  // Download the PDF
  const fileName = `خطة-${theme}-${weekStart}.pdf`;
  doc.save(fileName);
}
