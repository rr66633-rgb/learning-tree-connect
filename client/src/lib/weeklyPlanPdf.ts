/**
 * Weekly Plan PDF Generator (Client-side)
 * Uses html2pdf.js which leverages the browser's native Arabic text rendering.
 * This approach works on all devices including iOS Safari without needing
 * server-side Chromium/Playwright.
 */

// Section colors matching the app UI
const SECTION_COLORS: Record<string, string> = {
  theme_overview: "#2E7D32",
  learning_objectives: "#1565C0",
  arabic_activities: "#6A1B9A",
  english_activities: "#00838F",
  math_activities: "#E65100",
  science_activities: "#2E7D32",
  art_activities: "#AD1457",
  sensory_activities: "#4527A0",
  physical_activities: "#EF6C00",
  quran_islamic: "#1B5E20",
  story_of_week: "#5D4037",
  song_of_week: "#C62828",
  home_activity: "#00695C",
  parent_notes: "#37474F",
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

const SECTION_ICONS: Record<string, string> = {
  theme_overview: "🌟",
  learning_objectives: "🎯",
  arabic_activities: "📖",
  english_activities: "🔤",
  math_activities: "🔢",
  science_activities: "🔬",
  art_activities: "🎨",
  sensory_activities: "🖐️",
  physical_activities: "⚽",
  quran_islamic: "🕌",
  story_of_week: "📚",
  song_of_week: "🎵",
  home_activity: "🏠",
  parent_notes: "💬",
};

const AGE_GROUP_LABELS: Record<string, string> = {
  nursery: "حضانة (٢-٣ سنوات)",
  kg1: "تمهيدي أول KG1 (٣-٤ سنوات)",
  kg2: "تمهيدي ثاني KG2 (٤-٥ سنوات)",
  kg3: "تمهيدي ثالث KG3 (٥-٦ سنوات)",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function buildHtmlForPdf(plan: any): string {
  const theme = plan.theme || "";
  const ageGroup = plan.ageGroup || "";
  const weekStart = plan.weekStartDate || plan.weekStart || "";
  const weekEnd = plan.weekEndDate || plan.weekEnd || "";
  const language = plan.language || "ar";
  const className = plan.className || "";
  const sections = prepareSections(plan);

  const ageLabel = AGE_GROUP_LABELS[ageGroup] || ageGroup;
  const langLabel = language === "ar" ? "عربي" : language === "en" ? "إنجليزي" : "ثنائي اللغة";

  const sectionKeys = Object.keys(SECTION_LABELS);

  // Build table of contents
  let tocHtml = "";
  let tocIndex = 0;
  for (const key of sectionKeys) {
    if (sections[key]) {
      tocIndex++;
      const icon = SECTION_ICONS[key] || "📋";
      const color = SECTION_COLORS[key] || "#333";
      tocHtml += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;direction:rtl">
        <span style="font-size:14px">${icon}</span>
        <span style="color:${color};font-weight:600">${tocIndex}.</span>
        <span>${escapeHtml(SECTION_LABELS[key])}</span>
      </div>`;
    }
  }

  // Build section pages
  let sectionsHtml = "";
  for (const key of sectionKeys) {
    const content = sections[key];
    if (!content) continue;

    const color = SECTION_COLORS[key] || "#333333";
    const icon = SECTION_ICONS[key] || "📋";
    const label = SECTION_LABELS[key] || key;

    // Format content - convert newlines to paragraphs/list items
    const lines = content.split("\n").filter((l: string) => l.trim());
    let contentHtml = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
        contentHtml += `<div style="padding:3px 0;padding-right:16px;direction:rtl">${escapeHtml(trimmed)}</div>`;
      } else if (/^\d+[\.\)]/.test(trimmed)) {
        contentHtml += `<div style="padding:3px 0;padding-right:16px;direction:rtl">${escapeHtml(trimmed)}</div>`;
      } else {
        contentHtml += `<p style="margin:6px 0;line-height:1.9;direction:rtl">${escapeHtml(trimmed)}</p>`;
      }
    }

    sectionsHtml += `
      <div style="page-break-before:always;padding-top:0">
        <div style="background:${color};color:white;padding:14px 20px;border-radius:8px;margin-bottom:16px;display:flex;align-items:center;gap:10px;direction:rtl">
          <span style="font-size:20px">${icon}</span>
          <span style="font-size:16px;font-weight:bold">${escapeHtml(label)}</span>
        </div>
        <div style="font-size:12px;line-height:1.9;color:#333;padding:0 8px;direction:rtl;text-align:right">
          ${contentHtml}
        </div>
      </div>
    `;
  }

  return `
<div id="pdf-content" style="font-family:'Noto Sans Arabic','Arial',sans-serif;direction:rtl;text-align:right;color:#1a1a1a;font-size:12px;line-height:1.6;width:100%">
  <!-- COVER PAGE -->
  <div style="min-height:90vh;display:flex;flex-direction:column">
    <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);color:white;padding:28px;border-radius:12px;text-align:center;margin-bottom:24px">
      <div style="font-size:14px;opacity:0.9;margin-bottom:6px">مركز شجرة التعلم</div>
      <div style="font-size:20px;font-weight:bold;margin-bottom:8px">الخطة الأسبوعية</div>
      <div style="font-size:18px;font-weight:bold;margin-top:10px">${escapeHtml(theme)}</div>
      <div style="font-size:11px;opacity:0.85;margin-top:6px">${escapeHtml(weekStart)} — ${escapeHtml(weekEnd)}</div>
    </div>

    <div style="background:#f8faf9;border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:20px">
      <div style="font-size:13px;color:#1B5E20;font-weight:bold;margin-bottom:10px">تفاصيل الخطة</div>
      <table style="width:100%;font-size:11px;direction:rtl">
        <tr><td style="padding:5px 0;color:#666;width:100px">الفئة العمرية:</td><td style="padding:5px 0;font-weight:500">${escapeHtml(ageLabel)}</td></tr>
        <tr><td style="padding:5px 0;color:#666">الأسبوع:</td><td style="padding:5px 0;font-weight:500">${escapeHtml(weekStart)} إلى ${escapeHtml(weekEnd)}</td></tr>
        <tr><td style="padding:5px 0;color:#666">لغة الخطة:</td><td style="padding:5px 0;font-weight:500">${escapeHtml(langLabel)}</td></tr>
        ${className ? `<tr><td style="padding:5px 0;color:#666">الفصل:</td><td style="padding:5px 0;font-weight:500">${escapeHtml(className)}</td></tr>` : ""}
      </table>
    </div>

    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:18px">
      <div style="font-size:13px;color:#1B5E20;font-weight:bold;margin-bottom:10px">أقسام الخطة (${tocIndex} مجالاً)</div>
      <div style="font-size:11px;line-height:1.8">
        ${tocHtml}
      </div>
    </div>

    <div style="margin-top:auto;text-align:center;font-size:8px;color:#999;padding-top:16px">
      تم إنشاؤها بواسطة مولد الخطة الأسبوعية الذكي — مركز شجرة التعلم
      <br>
      إطار EYFS | القيم السعودية | القيم الإسلامية
    </div>
  </div>

  <!-- SECTION PAGES -->
  ${sectionsHtml}

  <!-- Final Footer -->
  <div style="text-align:center;font-size:8px;color:#aaa;padding:16px 0;border-top:1px solid #eee;margin-top:16px">
    شجرة التعلم | ${escapeHtml(theme)} | ${escapeHtml(weekStart)}
  </div>
</div>`;
}

/**
 * Generates and downloads a PDF of the weekly plan using jsPDF directly.
 * Uses jsPDF's html() method with an iframe to completely isolate from
 * the page's oklch CSS variables that html2canvas cannot parse.
 */
export async function generateWeeklyPlanPdf(plan: any): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  // Build the HTML content
  const htmlContent = buildHtmlForPdf(plan);

  const theme = plan.theme || "خطة";
  const weekStart = plan.weekStartDate || plan.weekStart || "";
  const filename = `خطة-${theme}-${weekStart}.pdf`;

  // Create a hidden iframe to completely isolate from page CSS (oklch issue)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Cannot access iframe document");

    // Write a clean HTML document inside the iframe with NO oklch colors
    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Arabic', 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      color: #1a1a1a;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>${htmlContent}</body>
</html>`);
    iframeDoc.close();

    // Wait for fonts to load in the iframe
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Get the content element from the iframe
    const content = iframeDoc.body.firstElementChild as HTMLElement;
    if (!content) throw new Error("No content in iframe");

    // Use html2pdf on the iframe's content (which has no oklch)
    await html2pdf()
      .set({
        margin: [10, 12, 10, 12],
        filename: filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          windowWidth: iframeDoc.body.scrollWidth,
          windowHeight: iframeDoc.body.scrollHeight,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      })
      .from(content)
      .save();
  } finally {
    // Clean up the iframe
    document.body.removeChild(iframe);
  }
}
