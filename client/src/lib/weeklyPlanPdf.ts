/**
 * Weekly Plan PDF Generator
 * Uses jsPDF with embedded Noto Sans Arabic font for proper Arabic rendering.
 * Arabic text is shaped using arabic-reshaper and reversed for RTL display.
 */
import { convertArabic } from "arabic-reshaper";

const FONT_REGULAR_URL = "/manus-storage/NotoSansArabic-Regular_a2ec4241.ttf";
const FONT_BOLD_URL = "/manus-storage/NotoSansArabic-Bold_941a7de6.ttf";

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

const SECTION_COLORS: Record<string, [number, number, number]> = {
  theme_overview: [16, 185, 129],
  learning_objectives: [59, 130, 246],
  arabic_activities: [245, 158, 11],
  english_activities: [99, 102, 241],
  math_activities: [168, 85, 247],
  science_activities: [20, 184, 166],
  art_activities: [236, 72, 153],
  sensory_activities: [249, 115, 22],
  physical_activities: [239, 68, 68],
  quran_islamic: [16, 185, 129],
  story_of_week: [139, 92, 246],
  song_of_week: [14, 165, 233],
  home_activity: [132, 204, 22],
  parent_notes: [6, 182, 212],
};

// Cache for loaded fonts
let fontCache: { regular: ArrayBuffer | null; bold: ArrayBuffer | null } = {
  regular: null,
  bold: null,
};

/**
 * Load font file from URL and return as ArrayBuffer
 */
async function loadFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load font: ${url}`);
  return response.arrayBuffer();
}

/**
 * Load both font variants (cached)
 */
async function loadFonts() {
  if (!fontCache.regular) {
    const [regular, bold] = await Promise.all([
      loadFont(FONT_REGULAR_URL),
      loadFont(FONT_BOLD_URL),
    ]);
    fontCache.regular = regular;
    fontCache.bold = bold;
  }
  return fontCache;
}

/**
 * Check if text contains Arabic characters
 */
function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Process Arabic text for PDF rendering:
 * 1. Shape Arabic letters (connect them properly)
 * 2. Reverse the text for RTL display in jsPDF (which is LTR-only)
 */
function processArabicText(text: string): string {
  if (!text) return "";
  
  // Split into lines and process each
  return text.split("\n").map(line => {
    if (!hasArabic(line)) return line;
    
    // Split by spaces to handle mixed Arabic/English words
    const words = line.split(/(\s+)/);
    const processedWords = words.map(word => {
      if (!word.trim()) return word;
      if (hasArabic(word)) {
        // Shape Arabic characters and reverse for RTL
        const shaped = convertArabic(word);
        return shaped.split("").reverse().join("");
      }
      return word;
    });
    
    // Reverse word order for RTL
    const nonSpaceWords: string[] = [];
    const spaces: string[] = [];
    for (const w of processedWords) {
      if (/^\s+$/.test(w)) {
        spaces.push(w);
      } else {
        nonSpaceWords.push(w);
      }
    }
    
    // Reverse the word order for proper RTL display
    nonSpaceWords.reverse();
    
    // Reconstruct with spaces
    let result = "";
    for (let i = 0; i < nonSpaceWords.length; i++) {
      result += nonSpaceWords[i];
      if (i < nonSpaceWords.length - 1) result += " ";
    }
    return result;
  }).join("\n");
}

/**
 * Flatten complex content objects into readable text
 */
function flattenContent(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item, i) => {
      if (typeof item === "string") return `${i + 1}. ${item}`;
      if (typeof item === "object") {
        const parts: string[] = [];
        if (item.title) parts.push(item.title);
        if (item.name) parts.push(item.name);
        if (item.description) parts.push(item.description);
        if (item.materials) parts.push(`${hasArabic(item.materials?.toString() || "") ? "المواد:" : "Materials:"} ${Array.isArray(item.materials) ? item.materials.join("، ") : item.materials}`);
        if (item.duration) parts.push(`${hasArabic(item.duration) ? "المدة:" : "Duration:"} ${item.duration}`);
        if (item.implementation) parts.push(item.implementation);
        if (item.steps) {
          const stepsStr = Array.isArray(item.steps) ? item.steps.join(" ← ") : item.steps;
          parts.push(stepsStr);
        }
        if (item.concept || item.math_concept) parts.push(item.concept || item.math_concept);
        if (item.experiment) parts.push(item.experiment);
        if (item.targeted_senses) {
          const senses = Array.isArray(item.targeted_senses) ? item.targeted_senses.join("، ") : item.targeted_senses;
          parts.push(senses);
        }
        if (item.targeted_skills) {
          const skills = Array.isArray(item.targeted_skills) ? item.targeted_skills.join("، ") : item.targeted_skills;
          parts.push(skills);
        }
        if (item.surah || item.verse) parts.push(`${item.surah || ""} ${item.verse || ""}`);
        if (item.dua) parts.push(item.dua);
        return `${i + 1}. ${parts.join("\n   ")}`;
      }
      return String(item);
    }).join("\n\n");
  }
  if (typeof content === "object") {
    return Object.entries(content).map(([key, value]) => {
      if (!value) return "";
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
      if (Array.isArray(value)) return `${label}: ${(value as string[]).join("، ")}`;
      if (typeof value === "object") return `${label}: ${flattenContent(value)}`;
      return `${label}: ${String(value)}`;
    }).filter(Boolean).join("\n");
  }
  return String(content);
}

export async function generateWeeklyPlanPdf(plan: any) {
  const { default: jsPDF } = await import("jspdf");
  
  // Load Arabic fonts
  const fonts = await loadFonts();
  
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // Register Arabic fonts
  const regularFontBytes = new Uint8Array(fonts.regular!);
  const boldFontBytes = new Uint8Array(fonts.bold!);
  
  doc.addFileToVFS("NotoSansArabic-Regular.ttf", arrayBufferToBase64(regularFontBytes));
  doc.addFileToVFS("NotoSansArabic-Bold.ttf", arrayBufferToBase64(boldFontBytes));
  doc.addFont("NotoSansArabic-Regular.ttf", "NotoSansArabic", "normal");
  doc.addFont("NotoSansArabic-Bold.ttf", "NotoSansArabic", "bold");

  const sections = plan.sections as Record<string, any>;
  if (!sections) return;

  const isArabic = plan.language === "ar" || plan.language === "bilingual";

  // Helper to set Arabic font
  const setArabicFont = (style: "normal" | "bold" = "normal") => {
    doc.setFont("NotoSansArabic", style);
  };

  // Helper to write text with proper Arabic handling
  const writeText = (text: string, x: number, yPos: number, options?: any) => {
    if (hasArabic(text)) {
      setArabicFont(options?.fontStyle || "normal");
      const processed = processArabicText(text);
      doc.text(processed, x, yPos, { align: options?.align || "left", ...options });
    } else {
      doc.setFont("NotoSansArabic", options?.fontStyle || "normal");
      doc.text(text, x, yPos, options);
    }
  };

  // Helper to write RTL text aligned right
  const writeRtlText = (text: string, yPos: number, options?: { fontStyle?: "normal" | "bold"; fontSize?: number }) => {
    setArabicFont(options?.fontStyle || "normal");
    if (options?.fontSize) doc.setFontSize(options.fontSize);
    const processed = processArabicText(text);
    doc.text(processed, pageWidth - margin, yPos, { align: "right" });
  };

  // ============ COVER PAGE ============
  // Background gradient header
  doc.setFillColor(30, 70, 50); // Forest Green
  doc.rect(0, 0, pageWidth, 85, "F");

  // Decorative accent
  doc.setFillColor(134, 239, 172); // Sage Green accent
  doc.rect(0, 80, pageWidth, 8, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  setArabicFont("bold");
  
  if (isArabic) {
    const titleAr = processArabicText("مركز شجرة التعلم");
    doc.text(titleAr, pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(20);
    const subtitleAr = processArabicText("الخطة الأسبوعية");
    doc.text(subtitleAr, pageWidth / 2, 40, { align: "center" });
    
    doc.setFontSize(14);
    setArabicFont("normal");
    const themeAr = processArabicText(`الموضوع: ${plan.theme}`);
    doc.text(themeAr, pageWidth / 2, 55, { align: "center" });
    
    doc.setFontSize(11);
    const dateAr = processArabicText(`${plan.weekStartDate} - ${plan.weekEndDate}`);
    doc.text(dateAr, pageWidth / 2, 68, { align: "center" });
  } else {
    doc.setFont("NotoSansArabic", "bold");
    doc.text("Learning Tree Kids Center", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(20);
    doc.text("Weekly Learning Plan", pageWidth / 2, 40, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("NotoSansArabic", "normal");
    doc.text(`Theme: ${plan.theme}`, pageWidth / 2, 55, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`${plan.weekStartDate} - ${plan.weekEndDate}`, pageWidth / 2, 68, { align: "center" });
  }

  // Info section below header
  doc.setTextColor(50, 50, 50);
  y = 105;

  const ageLabel = AGE_GROUP_LABELS[plan.ageGroup] || { ar: plan.ageGroup, en: plan.ageGroup };
  
  if (isArabic) {
    doc.setFontSize(13);
    setArabicFont("bold");
    writeRtlText("تفاصيل الخطة", y, { fontStyle: "bold", fontSize: 13 });
    y += 12;

    doc.setFontSize(11);
    setArabicFont("normal");
    writeRtlText(`الفئة العمرية: ${ageLabel.ar}`, y, { fontSize: 11 });
    y += 8;
    writeRtlText(`الأسبوع: ${plan.weekStartDate} إلى ${plan.weekEndDate}`, y, { fontSize: 11 });
    y += 8;
    const langLabel = plan.language === "ar" ? "عربي" : plan.language === "en" ? "إنجليزي" : "ثنائي اللغة";
    writeRtlText(`لغة الخطة: ${langLabel}`, y, { fontSize: 11 });
    y += 8;
    const statusLabel = plan.status === "published" ? "منشورة" : "مسودة";
    writeRtlText(`الحالة: ${statusLabel}`, y, { fontSize: 11 });
    y += 18;

    // Sections overview
    doc.setFontSize(12);
    writeRtlText("أقسام الخطة (١٤ مجالاً):", y, { fontStyle: "bold", fontSize: 12 });
    y += 10;

    doc.setFontSize(10);
    const sectionKeys = Object.keys(SECTION_LABELS);
    for (let i = 0; i < sectionKeys.length; i++) {
      const key = sectionKeys[i];
      const label = SECTION_LABELS[key];
      const num = `${i + 1}`;
      writeRtlText(`${num}. ${label.ar}`, y, { fontSize: 10 });
      y += 7;
    }
  } else {
    doc.setFontSize(13);
    doc.setFont("NotoSansArabic", "bold");
    doc.text("Plan Details", margin, y);
    y += 12;

    doc.setFont("NotoSansArabic", "normal");
    doc.setFontSize(11);
    doc.text(`Age Group: ${ageLabel.en}`, margin, y);
    y += 8;
    doc.text(`Week: ${plan.weekStartDate} to ${plan.weekEndDate}`, margin, y);
    y += 8;
    doc.text(`Language: ${plan.language === "ar" ? "Arabic" : plan.language === "en" ? "English" : "Bilingual"}`, margin, y);
    y += 8;
    doc.text(`Status: ${plan.status === "published" ? "Published" : "Draft"}`, margin, y);
    y += 18;

    doc.setFont("NotoSansArabic", "bold");
    doc.setFontSize(12);
    doc.text("Plan Sections (14 Areas):", margin, y);
    y += 10;

    doc.setFont("NotoSansArabic", "normal");
    doc.setFontSize(10);
    const sectionKeys = Object.keys(SECTION_LABELS);
    for (let i = 0; i < sectionKeys.length; i++) {
      const key = sectionKeys[i];
      const label = SECTION_LABELS[key];
      doc.text(`${i + 1}. ${label.en}`, margin + 5, y);
      y += 7;
    }
  }

  // Footer on cover
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  setArabicFont("normal");
  if (isArabic) {
    const footer1 = processArabicText("تم إنشاؤها بواسطة مولد الخطة الأسبوعية الذكي - مركز شجرة التعلم");
    doc.text(footer1, pageWidth / 2, pageHeight - 15, { align: "center" });
    const footer2 = processArabicText("إطار EYFS | القيم السعودية | القيم الإسلامية");
    doc.text(footer2, pageWidth / 2, pageHeight - 10, { align: "center" });
  } else {
    doc.text("Generated by Learning Tree AI Weekly Plan Generator", pageWidth / 2, pageHeight - 15, { align: "center" });
    doc.text("EYFS Framework | Saudi Cultural Values | Islamic Values", pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  // ============ CONTENT PAGES ============
  const sectionKeys = Object.keys(SECTION_LABELS);
  
  for (const key of sectionKeys) {
    doc.addPage();
    y = margin;

    const label = SECTION_LABELS[key];
    const color = SECTION_COLORS[key] || [30, 70, 50];
    const content = sections[key];

    // Section header bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(0, 0, pageWidth, 22, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    setArabicFont("bold");
    
    if (isArabic) {
      const headerAr = processArabicText(label.ar);
      doc.text(headerAr, pageWidth / 2, 14, { align: "center" });
    } else {
      doc.text(label.en, pageWidth / 2, 10, { align: "center" });
      // Arabic subtitle
      doc.setFontSize(10);
      setArabicFont("normal");
      const subAr = processArabicText(label.ar);
      doc.text(subAr, pageWidth / 2, 18, { align: "center" });
    }

    y = 32;

    // Content
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    setArabicFont("normal");

    const textContent = flattenContent(content);
    const lines = textContent.split("\n");

    for (const rawLine of lines) {
      if (!rawLine.trim()) {
        y += 3;
        continue;
      }
      
      // Split long lines to fit page width
      const maxCharsPerLine = isArabic ? 70 : 85;
      const wrappedLines = wrapText(rawLine, maxCharsPerLine);
      
      for (const line of wrappedLines) {
        if (y > pageHeight - 25) {
          doc.addPage();
          y = margin;
          // Mini header on continuation pages
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(0, 0, pageWidth, 10, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          setArabicFont("normal");
          if (isArabic) {
            const contAr = processArabicText(`${label.ar} (تابع)`);
            doc.text(contAr, pageWidth / 2, 7, { align: "center" });
          } else {
            doc.text(`${label.en} (continued)`, pageWidth / 2, 7, { align: "center" });
          }
          y = 18;
          doc.setTextColor(40, 40, 40);
          doc.setFontSize(10);
        }

        setArabicFont("normal");
        if (hasArabic(line)) {
          const processed = processArabicText(line);
          doc.text(processed, pageWidth - margin, y, { align: "right" });
        } else {
          doc.text(line, margin, y);
        }
        y += 6;
      }
      y += 2; // Extra spacing between paragraphs
    }

    // Page footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    setArabicFont("normal");
    if (isArabic) {
      const footerText = processArabicText(`شجرة التعلم | ${plan.theme} | ${plan.weekStartDate}`);
      doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: "center" });
    } else {
      doc.text(`Learning Tree | ${plan.theme} | ${plan.weekStartDate}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    }
  }

  // Save
  const filename = `Weekly-Plan-${plan.theme.replace(/\s+/g, "-")}-${plan.weekStartDate}.pdf`;
  doc.save(filename);
}

/**
 * Convert ArrayBuffer/Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * Simple text wrapping by character count
 */
function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  
  const lines: string[] = [];
  let remaining = text;
  
  while (remaining.length > maxChars) {
    // Find a good break point (space)
    let breakPoint = remaining.lastIndexOf(" ", maxChars);
    if (breakPoint === -1 || breakPoint < maxChars * 0.4) {
      breakPoint = maxChars;
    }
    lines.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint).trimStart();
  }
  
  if (remaining) lines.push(remaining);
  return lines;
}
