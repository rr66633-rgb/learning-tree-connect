/**
 * Weekly Plan PDF Generator
 * Uses html2pdf.js which leverages the browser's native text rendering
 * for proper Arabic shaping, RTL support, and connected letters.
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

const AGE_GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  nursery: { ar: "حضانة (٢-٣ سنوات)", en: "Nursery (2-3 years)" },
  kg1: { ar: "تمهيدي أول (٣-٤ سنوات)", en: "KG1 (3-4 years)" },
  kg2: { ar: "تمهيدي ثاني (٤-٥ سنوات)", en: "KG2 (4-5 years)" },
  kg3: { ar: "تمهيدي ثالث (٥-٦ سنوات)", en: "KG3 (5-6 years)" },
};

const SECTION_COLORS: Record<string, string> = {
  theme_overview: "#10b981",
  learning_objectives: "#3b82f6",
  arabic_activities: "#f59e0b",
  english_activities: "#6366f1",
  math_activities: "#a855f7",
  science_activities: "#14b8a6",
  art_activities: "#ec4899",
  sensory_activities: "#f97316",
  physical_activities: "#ef4444",
  quran_islamic: "#10b981",
  story_of_week: "#8b5cf6",
  song_of_week: "#0ea5e9",
  home_activity: "#84cc16",
  parent_notes: "#06b6d4",
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

function flattenContentToHtml(content: any, isArabic: boolean): string {
  if (!content) return "<p>—</p>";
  if (typeof content === "string") {
    return `<p>${escapeHtml(content).replace(/\n/g, "<br>")}</p>`;
  }
  if (Array.isArray(content)) {
    const items = content.map((item, i) => {
      if (typeof item === "string") {
        return `<li>${escapeHtml(item)}</li>`;
      }
      if (typeof item === "object") {
        const parts: string[] = [];
        if (item.title || item.name) {
          parts.push(`<strong>${escapeHtml(item.title || item.name)}</strong>`);
        }
        if (item.description) parts.push(escapeHtml(item.description));
        if (item.materials) {
          const mats = Array.isArray(item.materials) ? item.materials.join("، ") : item.materials;
          parts.push(`<span style="color:#666">${isArabic ? "المواد:" : "Materials:"} ${escapeHtml(mats)}</span>`);
        }
        if (item.duration) {
          parts.push(`<span style="color:#666">${isArabic ? "المدة:" : "Duration:"} ${escapeHtml(item.duration)}</span>`);
        }
        if (item.implementation) parts.push(escapeHtml(item.implementation));
        if (item.steps) {
          const stepsStr = Array.isArray(item.steps) ? item.steps.join(isArabic ? " ← " : " → ") : item.steps;
          parts.push(`<span style="color:#555">${escapeHtml(stepsStr)}</span>`);
        }
        if (item.concept || item.math_concept) {
          parts.push(`<em>${escapeHtml(item.concept || item.math_concept)}</em>`);
        }
        if (item.experiment) parts.push(escapeHtml(item.experiment));
        if (item.targeted_senses) {
          const senses = Array.isArray(item.targeted_senses) ? item.targeted_senses.join("، ") : item.targeted_senses;
          parts.push(`<span style="color:#666">${escapeHtml(senses)}</span>`);
        }
        if (item.targeted_skills) {
          const skills = Array.isArray(item.targeted_skills) ? item.targeted_skills.join("، ") : item.targeted_skills;
          parts.push(`<span style="color:#666">${escapeHtml(skills)}</span>`);
        }
        if (item.surah || item.verse) {
          parts.push(`<em>${escapeHtml((item.surah || "") + " " + (item.verse || ""))}</em>`);
        }
        if (item.dua) parts.push(`<em>${escapeHtml(item.dua)}</em>`);
        return `<li>${parts.join("<br>")}</li>`;
      }
      return `<li>${escapeHtml(String(item))}</li>`;
    });
    return `<ol style="padding-${isArabic ? "right" : "left"}:20px;margin:0">${items.join("")}</ol>`;
  }
  if (typeof content === "object") {
    const entries = Object.entries(content).map(([key, value]) => {
      if (!value) return "";
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
      if (Array.isArray(value)) return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml((value as string[]).join("، "))}</p>`;
      if (typeof value === "object") return `<p><strong>${escapeHtml(label)}:</strong> ${flattenContentToHtml(value, isArabic)}</p>`;
      return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(String(value))}</p>`;
    }).filter(Boolean);
    return entries.join("");
  }
  return `<p>${escapeHtml(String(content))}</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPdfHtml(plan: any): string {
  const sections = plan.sections as Record<string, any>;
  if (!sections) return "";

  const isArabic = plan.language === "ar" || plan.language === "bilingual";
  const dir = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";
  const ageLabel = AGE_GROUP_LABELS[plan.ageGroup] || { ar: plan.ageGroup, en: plan.ageGroup };
  const langLabel = plan.language === "ar" ? "عربي" : plan.language === "en" ? "English" : "ثنائي اللغة";
  const statusLabel = plan.status === "published" ? (isArabic ? "منشورة" : "Published") : (isArabic ? "مسودة" : "Draft");

  // Build sections HTML
  const sectionKeys = Object.keys(SECTION_LABELS);
  let sectionsHtml = "";

  for (const key of sectionKeys) {
    const label = SECTION_LABELS[key];
    const color = SECTION_COLORS[key] || "#1e4632";
    const icon = SECTION_ICONS[key] || "📋";
    const content = sections[key];

    sectionsHtml += `
      <div style="page-break-inside:avoid;margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:${color};color:white;padding:12px 16px;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">${icon}</span>
          <div>
            <div style="font-size:14px;font-weight:bold">${isArabic ? escapeHtml(label.ar) : escapeHtml(label.en)}</div>
            ${!isArabic ? `<div style="font-size:10px;opacity:0.85">${escapeHtml(label.ar)}</div>` : ""}
          </div>
        </div>
        <div style="padding:14px 16px;font-size:11px;line-height:1.8;color:#333">
          ${flattenContentToHtml(content, isArabic)}
        </div>
      </div>
    `;
  }

  // Sections list for cover
  let sectionsList = "";
  for (let i = 0; i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    const label = SECTION_LABELS[key];
    const icon = SECTION_ICONS[key] || "📋";
    const color = SECTION_COLORS[key];
    sectionsList += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
      <span style="font-size:14px">${icon}</span>
      <span style="color:${color};font-weight:500">${i + 1}.</span>
      <span>${isArabic ? escapeHtml(label.ar) : escapeHtml(label.en)}</span>
    </div>`;
  }

  return `
    <div id="pdf-content" dir="${dir}" style="font-family:'Noto Sans Arabic','Cairo','Tajawal','IBM Plex Sans Arabic',sans-serif;direction:${dir};text-align:${textAlign};color:#1a1a1a;width:190mm;margin:0 auto">
      
      <!-- COVER PAGE -->
      <div style="page-break-after:always;min-height:270mm;display:flex;flex-direction:column">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e4632,#2d6b4a);color:white;padding:30px;border-radius:12px;text-align:center;margin-bottom:24px">
          <div style="font-size:24px;font-weight:bold;margin-bottom:8px">${isArabic ? "مركز شجرة التعلم" : "Learning Tree Kids Center"}</div>
          <div style="font-size:18px;margin-bottom:12px">${isArabic ? "الخطة الأسبوعية" : "Weekly Learning Plan"}</div>
          <div style="font-size:14px;opacity:0.9;margin-bottom:6px">${isArabic ? "الموضوع:" : "Theme:"} ${escapeHtml(plan.theme)}</div>
          <div style="font-size:12px;opacity:0.8">${plan.weekStartDate} — ${plan.weekEndDate}</div>
        </div>

        <!-- Plan Info -->
        <div style="background:#f8faf9;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="font-size:14px;font-weight:bold;margin-bottom:12px;color:#1e4632">${isArabic ? "تفاصيل الخطة" : "Plan Details"}</div>
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0;color:#666">${isArabic ? "الفئة العمرية:" : "Age Group:"}</td>
              <td style="padding:6px 0;font-weight:500">${isArabic ? escapeHtml(ageLabel.ar) : escapeHtml(ageLabel.en)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">${isArabic ? "الأسبوع:" : "Week:"}</td>
              <td style="padding:6px 0;font-weight:500">${plan.weekStartDate} ${isArabic ? "إلى" : "to"} ${plan.weekEndDate}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">${isArabic ? "لغة الخطة:" : "Language:"}</td>
              <td style="padding:6px 0;font-weight:500">${escapeHtml(langLabel)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">${isArabic ? "الحالة:" : "Status:"}</td>
              <td style="padding:6px 0;font-weight:500">${escapeHtml(statusLabel)}</td>
            </tr>
          </table>
        </div>

        <!-- Sections Overview -->
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px">
          <div style="font-size:13px;font-weight:bold;margin-bottom:12px;color:#1e4632">${isArabic ? "أقسام الخطة (١٤ مجالاً)" : "Plan Sections (14 Areas)"}</div>
          <div style="font-size:11px;line-height:1.8">
            ${sectionsList}
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top:auto;padding-top:20px;text-align:center;font-size:9px;color:#999">
          ${isArabic ? "تم إنشاؤها بواسطة مولد الخطة الأسبوعية الذكي — مركز شجرة التعلم" : "Generated by Learning Tree AI Weekly Plan Generator"}
          <br>
          ${isArabic ? "إطار EYFS | القيم السعودية | القيم الإسلامية" : "EYFS Framework | Saudi Cultural Values | Islamic Values"}
        </div>
      </div>

      <!-- CONTENT PAGES -->
      ${sectionsHtml}

      <!-- Final Footer -->
      <div style="text-align:center;font-size:9px;color:#aaa;padding:20px 0;border-top:1px solid #eee;margin-top:20px">
        ${isArabic ? `شجرة التعلم | ${escapeHtml(plan.theme)} | ${plan.weekStartDate}` : `Learning Tree | ${escapeHtml(plan.theme)} | ${plan.weekStartDate}`}
      </div>
    </div>
  `;
}

export async function generateWeeklyPlanPdf(plan: any) {
  const html2pdf = (await import("html2pdf.js")).default;

  // Create a temporary container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "210mm";
  container.innerHTML = buildPdfHtml(plan);
  document.body.appendChild(container);

  // Wait for fonts to load
  await document.fonts.ready;
  // Small delay to ensure rendering is complete
  await new Promise(resolve => setTimeout(resolve, 300));

  const isArabic = plan.language === "ar" || plan.language === "bilingual";
  const filename = `Weekly-Plan-${plan.theme.replace(/\s+/g, "-")}-${plan.weekStartDate}.pdf`;

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },

      })
      .from(container.querySelector("#pdf-content") as HTMLElement)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}
