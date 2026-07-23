import type { jsPDF } from "jspdf";

// Assessment data types
interface AssessmentData {
  id: number;
  childName: string;
  ageGroup: string;
  assessmentDate: string;
  totalScore: number;
  maxScore: number;
  percentage: string;
  interpretation: string;
  notes?: string | null;
  responses?: AssessmentResponse[];
}

interface AssessmentResponse {
  domain: string;
  itemIndex: number;
  itemText: string;
  response: string;
  score: number;
}

const AGE_GROUP_LABELS: Record<string, string> = {
  "24-36": "24 - 36",
  "36-48": "36 - 48",
  "48-60": "48 - 60",
  "60-72": "60 - 72",
};

const DOMAIN_LABELS: Record<string, string> = {
  communication: "Communication & Language",
  gross_motor: "Gross Motor Skills",
  fine_motor: "Fine Motor Skills",
  problem_solving: "Problem Solving & Cognition",
  personal_social: "Personal & Social Skills",
  cognitive: "Cognitive Skills",
  social_emotional: "Social & Emotional Skills",
};

const DOMAIN_LABELS_AR: Record<string, string> = {
  communication: "التواصل واللغة",
  gross_motor: "المهارات الحركية الكبرى",
  fine_motor: "المهارات الحركية الدقيقة",
  problem_solving: "حل المشكلات والإدراك",
  personal_social: "المهارات الشخصية والاجتماعية",
  cognitive: "المهارات الإدراكية والمعرفية",
  social_emotional: "المهارات الاجتماعية والعاطفية",
};

const RESPONSE_LABELS_AR: Record<string, string> = {
  yes: "نعم",
  sometimes: "أحيانا",
  not_yet: "ليس بعد",
};

const INTERPRETATION_LABELS: Record<string, string> = {
  on_track: "Normal development for age",
  needs_support: "Needs follow-up and support",
  needs_referral: "Recommended for specialist referral",
};

const INTERPRETATION_LABELS_AR: Record<string, string> = {
  on_track: "نمو ضمن المتوقع للعمر",
  needs_support: "يحتاج متابعة ودعم",
  needs_referral: "يوصى بإعادة التقييم والإحالة لمختص",
};

function getInterpretationColor(interpretation: string): [number, number, number] {
  switch (interpretation) {
    case "on_track":
      return [16, 185, 129]; // green
    case "needs_support":
      return [245, 158, 11]; // yellow/amber
    case "needs_referral":
      return [239, 68, 68]; // red
    default:
      return [107, 114, 128]; // gray
  }
}

export async function generateAssessmentPDF(assessment: AssessmentData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  let y = 0;

  // ============ HEADER ============
  // Green gradient header
  doc.setFillColor(26, 86, 50); // #1a5632
  doc.rect(0, 0, pageWidth, 40, "F");

  // Lighter green accent
  doc.setFillColor(0, 201, 183); // #00C9B7
  doc.rect(0, 38, pageWidth, 3, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Nashaa", pageWidth / 2, 16, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Nashaa Developmental Assessment Report", pageWidth / 2, 26, { align: "center" });

  doc.setFontSize(9);
  doc.text("Early Detection of Developmental Delays Scale", pageWidth / 2, 33, { align: "center" });

  y = 50;

  // ============ CHILD INFO ============
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Child Information", margin, y);
  y += 2;

  // Separator line
  doc.setDrawColor(0, 201, 183);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Info grid
  const col1 = margin;
  const col2 = margin + 40;
  const col3 = pageWidth / 2 + 5;
  const col4 = pageWidth / 2 + 45;

  doc.setFont("helvetica", "bold");
  doc.text("Child Name:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(assessment.childName, col2, y);

  doc.setFont("helvetica", "bold");
  doc.text("Age Group:", col3, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${AGE_GROUP_LABELS[assessment.ageGroup] || assessment.ageGroup} months`, col4, y);

  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Assessment Date:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(assessment.assessmentDate).toLocaleDateString("en-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }), col2, y);

  y += 14;

  // ============ OVERALL RESULT ============
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Result", margin, y);
  y += 2;

  doc.setDrawColor(0, 201, 183);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Score box
  const percentage = parseFloat(assessment.percentage);
  const [r, g, b] = getInterpretationColor(assessment.interpretation);

  // Score circle area
  const circleX = pageWidth / 2;
  const circleY = y + 15;
  const circleR = 15;

  // Draw circle
  doc.setFillColor(r, g, b);
  doc.circle(circleX, circleY, circleR, "F");

  // Percentage text in circle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(percentage)}%`, circleX, circleY + 2, { align: "center" });

  doc.setFontSize(8);
  doc.text(`${assessment.totalScore}/${assessment.maxScore}`, circleX, circleY + 8, { align: "center" });

  y = circleY + circleR + 8;

  // Interpretation label
  doc.setTextColor(r, g, b);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(INTERPRETATION_LABELS[assessment.interpretation] || assessment.interpretation, pageWidth / 2, y, { align: "center" });

  y += 5;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`( ${INTERPRETATION_LABELS_AR[assessment.interpretation] || ""} )`, pageWidth / 2, y, { align: "center" });

  y += 12;

  // Progress bar
  const barX = margin + 20;
  const barWidth = pageWidth - 2 * margin - 40;
  const barHeight = 6;

  doc.setFillColor(230, 230, 230);
  doc.roundedRect(barX, y, barWidth, barHeight, 3, 3, "F");

  doc.setFillColor(r, g, b);
  doc.roundedRect(barX, y, barWidth * (percentage / 100), barHeight, 3, 3, "F");

  y += 16;

  // ============ DOMAIN BREAKDOWN ============
  if (assessment.responses && assessment.responses.length > 0) {
    doc.setTextColor(26, 86, 50);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Domain Breakdown", margin, y);
    y += 2;

    doc.setDrawColor(0, 201, 183);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Group responses by domain
    const domainGroups: Record<string, AssessmentResponse[]> = {};
    for (const resp of assessment.responses) {
      if (!domainGroups[resp.domain]) domainGroups[resp.domain] = [];
      domainGroups[resp.domain].push(resp);
    }

    // Domain summary table
    const domains = Object.keys(domainGroups);

    // Table header
    doc.setFillColor(26, 86, 50);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Domain", margin + 3, y + 5.5);
    doc.text("Score", pageWidth - margin - 45, y + 5.5);
    doc.text("Percentage", pageWidth - margin - 22, y + 5.5);
    y += 8;

    doc.setFontSize(9);
    let rowBg = false;
    for (const domain of domains) {
      const items = domainGroups[domain];
      const domainScore = items.reduce((sum, r) => sum + r.score, 0);
      const domainMax = items.length * 2;
      const domainPct = domainMax > 0 ? (domainScore / domainMax) * 100 : 0;
      const [dr, dg, db] = getInterpretationColor(
        domainPct >= 80 ? "on_track" : domainPct >= 60 ? "needs_support" : "needs_referral"
      );

      if (rowBg) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, pageWidth - 2 * margin, 7, "F");
      }
      rowBg = !rowBg;

      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      const domainLabel = DOMAIN_LABELS[domain] || domain;
      const domainLabelAr = DOMAIN_LABELS_AR[domain] || "";
      doc.text(`${domainLabel}`, margin + 3, y + 5);

      doc.text(`${domainScore}/${domainMax}`, pageWidth - margin - 45, y + 5);

      doc.setTextColor(dr, dg, db);
      doc.setFont("helvetica", "bold");
      doc.text(`${Math.round(domainPct)}%`, pageWidth - margin - 22, y + 5);

      y += 7;

      // Check if we need a new page
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
    }

    y += 10;

    // ============ DETAILED RESPONSES ============
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(26, 86, 50);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Responses", margin, y);
    y += 2;

    doc.setDrawColor(0, 201, 183);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    for (const domain of domains) {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }

      const items = domainGroups[domain];
      const domainLabel = DOMAIN_LABELS[domain] || domain;
      const domainLabelAr = DOMAIN_LABELS_AR[domain] || "";

      // Domain header
      doc.setFillColor(240, 250, 245);
      doc.rect(margin, y - 1, pageWidth - 2 * margin, 7, "F");
      doc.setTextColor(26, 86, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${domainLabel} (${domainLabelAr})`, margin + 3, y + 4);
      y += 10;

      // Items
      doc.setFontSize(8.5);
      for (const item of items) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }

        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");

        // Response indicator
        const responseColor: [number, number, number] = item.response === "yes" ? [16, 185, 129] :
          item.response === "sometimes" ? [245, 158, 11] : [239, 68, 68];
        doc.setFillColor(...responseColor);
        doc.circle(margin + 3, y - 1, 1.5, "F");

        // Item text (truncate if too long)
        const maxTextWidth = pageWidth - 2 * margin - 50;
        let itemText = item.itemText;
        if (doc.getTextWidth(itemText) > maxTextWidth) {
          while (doc.getTextWidth(itemText + "...") > maxTextWidth && itemText.length > 0) {
            itemText = itemText.slice(0, -1);
          }
          itemText += "...";
        }
        doc.text(itemText, margin + 8, y);

        // Response label
        const responseLabel = RESPONSE_LABELS_AR[item.response] || item.response;
        doc.setTextColor(...responseColor);
        doc.setFont("helvetica", "bold");
        doc.text(`${responseLabel} (${item.score}/2)`, pageWidth - margin - 25, y);

        y += 5.5;
      }

      y += 5;
    }
  }

  // ============ NOTES ============
  if (assessment.notes) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(26, 86, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, y);
    y += 6;

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(assessment.notes, pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 5;
  }

  // ============ INTERPRETATION GUIDE ============
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 20;
  }

  y += 5;
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Interpretation Guide", margin, y);
  y += 7;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");

  // Green
  doc.setFillColor(16, 185, 129);
  doc.circle(margin + 3, y - 1, 2, "F");
  doc.setTextColor(60, 60, 60);
  doc.text("80% or above: Normal development for age", margin + 8, y);
  y += 5;

  // Yellow
  doc.setFillColor(245, 158, 11);
  doc.circle(margin + 3, y - 1, 2, "F");
  doc.text("60% - 79%: Needs follow-up and additional support", margin + 8, y);
  y += 5;

  // Red
  doc.setFillColor(239, 68, 68);
  doc.circle(margin + 3, y - 1, 2, "F");
  doc.text("Below 60%: Recommended for re-assessment and specialist referral", margin + 8, y);
  y += 10;

  // ============ FOOTER ============
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(0, 201, 183);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Footer text
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("Nashaa Developmental Assessment", margin, pageHeight - 10);
    doc.text("This report is for informational purposes. Consult a specialist for clinical evaluation.", margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  // Save the file
  const dateStr = new Date(assessment.assessmentDate).toLocaleDateString("en-SA").replace(/\//g, "-");
  doc.save(`Assessment-${assessment.childName.replace(/\s+/g, "-")}-${dateStr}.pdf`);
}
