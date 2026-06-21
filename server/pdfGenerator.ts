import { chromium, type Browser } from "playwright";

// Browser instance cache for performance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

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

interface WeeklyPlanData {
  theme: string;
  ageGroup: string;
  weekStart: string;
  weekEnd: string;
  language: string;
  sections: Record<string, string>;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(plan: WeeklyPlanData): string {
  const sectionKeys = Object.keys(SECTION_LABELS);
  const ageLabel = AGE_GROUP_LABELS[plan.ageGroup] || plan.ageGroup;
  const langLabel = plan.language === "ar" ? "عربي" : plan.language === "en" ? "إنجليزي" : "ثنائي اللغة";

  // Build table of contents
  let tocHtml = "";
  let tocIndex = 0;
  for (const key of sectionKeys) {
    if (plan.sections[key]) {
      tocIndex++;
      const icon = SECTION_ICONS[key] || "📋";
      const color = SECTION_COLORS[key] || "#333";
      tocHtml += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
        <span style="font-size:16px">${icon}</span>
        <span style="color:${color};font-weight:600">${tocIndex}.</span>
        <span>${escapeHtml(SECTION_LABELS[key])}</span>
      </div>`;
    }
  }

  // Build section pages
  let sectionsHtml = "";
  for (const key of sectionKeys) {
    const content = plan.sections[key];
    if (!content) continue;

    const color = SECTION_COLORS[key] || "#333333";
    const icon = SECTION_ICONS[key] || "📋";
    const label = SECTION_LABELS[key] || key;

    // Format content - convert newlines to paragraphs/list items
    const lines = content.split("\n").filter((l) => l.trim());
    let contentHtml = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
        contentHtml += `<div style="padding:3px 0;padding-right:16px">${escapeHtml(trimmed)}</div>`;
      } else if (/^\d+[\.\)]/.test(trimmed)) {
        contentHtml += `<div style="padding:3px 0;padding-right:16px">${escapeHtml(trimmed)}</div>`;
      } else {
        contentHtml += `<p style="margin:6px 0;line-height:1.9">${escapeHtml(trimmed)}</p>`;
      }
    }

    sectionsHtml += `
      <div style="page-break-before:always;padding-top:0">
        <div style="background:${color};color:white;padding:16px 24px;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">${icon}</span>
          <span style="font-size:18px;font-weight:bold">${escapeHtml(label)}</span>
        </div>
        <div style="font-size:13px;line-height:1.9;color:#333;padding:0 8px">
          ${contentHtml}
        </div>
        <div style="position:fixed;bottom:20px;left:40px;right:40px;text-align:center;font-size:9px;color:#aaa">
          ${escapeHtml(label)} - ${escapeHtml(plan.theme)}
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Noto Sans Arabic', 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      color: #1a1a1a;
      font-size: 12px;
      line-height: 1.6;
      padding: 0;
    }

    @page {
      size: A4;
      margin: 30px 40px;
    }

    .cover {
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }

    .cover-header {
      background: linear-gradient(135deg, #1B5E20, #2E7D32);
      color: white;
      padding: 32px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 28px;
    }

    .cover-header h1 {
      font-size: 22px;
      margin-bottom: 8px;
    }

    .cover-header h2 {
      font-size: 16px;
      font-weight: 400;
      opacity: 0.9;
    }

    .info-box {
      background: #f8faf9;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .info-box h3 {
      font-size: 14px;
      color: #1B5E20;
      margin-bottom: 12px;
    }

    .info-table {
      width: 100%;
      font-size: 12px;
    }

    .info-table td {
      padding: 6px 0;
    }

    .info-table td:first-child {
      color: #666;
      width: 120px;
    }

    .info-table td:last-child {
      font-weight: 500;
    }

    .toc-box {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }

    .toc-box h3 {
      font-size: 14px;
      color: #1B5E20;
      margin-bottom: 12px;
    }

    .cover-footer {
      margin-top: auto;
      text-align: center;
      font-size: 9px;
      color: #999;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-header">
      <h2>مركز شجرة التعلم</h2>
      <h1>الخطة الأسبوعية</h1>
      <div style="margin-top:12px;font-size:18px;font-weight:bold">${escapeHtml(plan.theme)}</div>
      <div style="margin-top:6px;font-size:12px;opacity:0.85">${escapeHtml(plan.weekStart)} — ${escapeHtml(plan.weekEnd)}</div>
    </div>

    <div class="info-box">
      <h3>تفاصيل الخطة</h3>
      <table class="info-table">
        <tr><td>الفئة العمرية:</td><td>${escapeHtml(ageLabel)}</td></tr>
        <tr><td>الأسبوع:</td><td>${escapeHtml(plan.weekStart)} إلى ${escapeHtml(plan.weekEnd)}</td></tr>
        <tr><td>لغة الخطة:</td><td>${escapeHtml(langLabel)}</td></tr>
        ${plan.className ? `<tr><td>الفصل:</td><td>${escapeHtml(plan.className)}</td></tr>` : ""}
      </table>
    </div>

    <div class="toc-box">
      <h3>أقسام الخطة (${tocIndex} مجالاً)</h3>
      <div style="font-size:12px;line-height:1.8">
        ${tocHtml}
      </div>
    </div>

    <div class="cover-footer">
      تم إنشاؤها بواسطة مولد الخطة الأسبوعية الذكي — مركز شجرة التعلم
      <br>
      إطار EYFS | القيم السعودية | القيم الإسلامية
    </div>
  </div>

  <!-- SECTION PAGES -->
  ${sectionsHtml}

  <!-- Final Footer -->
  <div style="text-align:center;font-size:9px;color:#aaa;padding:20px 0;border-top:1px solid #eee;margin-top:20px">
    شجرة التعلم | ${escapeHtml(plan.theme)} | ${escapeHtml(plan.weekStart)}
  </div>
</body>
</html>`;
}

export async function generateWeeklyPlanPdf(plan: WeeklyPlanData): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = buildHtml(plan);
    await page.setContent(html, { waitUntil: "networkidle" });

    // Wait for fonts to load
    await page.waitForTimeout(500);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "30px", right: "30px" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

// Cleanup on process exit
process.on("exit", () => {
  if (browserInstance) {
    browserInstance.close().catch(() => {});
  }
});
