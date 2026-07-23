/**
 * Export custom assessment results to PDF (bilingual support)
 */

interface QuestionResponse {
  questionText: string;
  questionType: string;
  answer?: string | null;
  rating?: number | null;
  maxRating?: number;
  notes?: string | null;
  options?: string[];
}

interface ExportData {
  assessmentTitle: string;
  assessmentDescription?: string;
  childName: string;
  className?: string;
  date: string;
  responses: QuestionResponse[];
  language?: "ar" | "en";
}

function getLabels(lang: "ar" | "en") {
  if (lang === "ar") {
    return {
      reportTitle: "تقرير التقييم المخصص",
      assessmentDetails: "تفاصيل التقييم",
      child: "الطفل:",
      assessment: "التقييم:",
      class: "الفصل:",
      date: "التاريخ:",
      totalQuestions: "عدد الأسئلة:",
      questionsAndResponses: "الأسئلة والإجابات",
      rating: "التقييم:",
      answer: "الإجابة:",
      noAnswer: "لم يتم الإجابة",
      notes: "ملاحظات:",
      summary: "الملخص",
      questionsAnswered: "الأسئلة المجاب عنها:",
      averageRating: "متوسط التقييم:",
      footer: "ناشئة - تقرير التقييم المخصص",
      generated: "تاريخ التوليد:",
      page: "صفحة",
      of: "من",
      questionTypes: {
        multiple_choice: "اختيار من متعدد",
        true_false: "صح / خطأ",
        rating: "تقييم",
        text: "نص حر",
      },
    };
  }
  return {
    reportTitle: "Custom Assessment Report",
    assessmentDetails: "Assessment Details",
    child: "Child:",
    assessment: "Assessment:",
    class: "Class:",
    date: "Date:",
    totalQuestions: "Total Questions:",
    questionsAndResponses: "Questions & Responses",
    rating: "Rating:",
    answer: "Answer:",
    noAnswer: "No answer provided",
    notes: "Notes:",
    summary: "Summary",
    questionsAnswered: "Questions answered:",
    averageRating: "Average rating:",
    footer: "Nashaa - Custom Assessment Report",
    generated: "Generated:",
    page: "Page",
    of: "of",
    questionTypes: {
      multiple_choice: "Multiple Choice",
      true_false: "True / False",
      rating: "Rating",
      text: "Free Text",
    },
  };
}

export async function generateCustomAssessmentPDF(data: ExportData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const lang = data.language || "en";
  const labels = getLabels(lang);
  const dateLocale = lang === "ar" ? "ar-SA" : "en-US";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  let y = 0;

  // ============ HEADER ============
  doc.setFillColor(26, 86, 50); // Forest green
  doc.rect(0, 0, pageWidth, 38, "F");

  // Accent line
  doc.setFillColor(0, 201, 183); // Teal
  doc.rect(0, 36, pageWidth, 3, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Nashaa", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(labels.reportTitle, pageWidth / 2, 24, { align: "center" });

  doc.setFontSize(9);
  doc.text(data.assessmentTitle, pageWidth / 2, 32, { align: "center" });

  y = 48;

  // ============ CHILD INFO ============
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(labels.assessmentDetails, margin, y);
  y += 2;

  doc.setDrawColor(0, 201, 183);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);

  // Info rows
  const infoItems = [
    { label: labels.child, value: data.childName },
    { label: labels.assessment, value: data.assessmentTitle },
    ...(data.className ? [{ label: labels.class, value: data.className }] : []),
    { label: labels.date, value: new Date(data.date).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" }) },
    { label: labels.totalQuestions, value: String(data.responses.length) },
  ];

  for (const item of infoItems) {
    doc.setFont("helvetica", "bold");
    doc.text(item.label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(item.value, margin + 35, y);
    y += 6;
  }

  y += 8;

  // ============ RESPONSES ============
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(labels.questionsAndResponses, margin, y);
  y += 2;

  doc.setDrawColor(0, 201, 183);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  for (let i = 0; i < data.responses.length; i++) {
    const resp = data.responses[i];

    // Check page break
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 20;
    }

    // Question number and type badge
    doc.setFillColor(240, 250, 245);
    doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, "F");

    doc.setTextColor(26, 86, 50);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Q${i + 1}.`, margin + 3, y + 1);

    // Question type
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const typeLabel = labels.questionTypes[resp.questionType as keyof typeof labels.questionTypes] || resp.questionType;
    doc.text(`[${typeLabel}]`, margin + 12, y + 1);

    y += 8;

    // Question text
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const questionLines = doc.splitTextToSize(resp.questionText, pageWidth - 2 * margin - 10);
    doc.text(questionLines, margin + 5, y);
    y += questionLines.length * 4.5 + 3;

    // Answer
    if (resp.questionType === "rating" && resp.rating != null) {
      const maxR = resp.maxRating || 5;
      doc.setTextColor(180, 130, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${labels.rating} ${resp.rating}/${maxR}`, margin + 5, y);
      y += 5;
    } else if (resp.answer) {
      doc.setTextColor(0, 100, 60);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(labels.answer, margin + 5, y);
      doc.setFont("helvetica", "normal");
      const answerLines = doc.splitTextToSize(resp.answer, pageWidth - 2 * margin - 25);
      doc.text(answerLines, margin + 22, y);
      y += answerLines.length * 4 + 2;
    } else {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(labels.noAnswer, margin + 5, y);
      y += 5;
    }

    // Notes
    if (resp.notes) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      const noteLines = doc.splitTextToSize(`${labels.notes} ${resp.notes}`, pageWidth - 2 * margin - 10);
      doc.text(noteLines, margin + 5, y);
      y += noteLines.length * 3.5 + 2;
    }

    // Separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin + 5, y, pageWidth - margin - 5, y);
    y += 6;
  }

  // ============ SUMMARY ============
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  y += 5;
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(labels.summary, margin, y);
  y += 7;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const answered = data.responses.filter(r => r.answer || r.rating).length;
  const total = data.responses.length;
  doc.text(`${labels.questionsAnswered} ${answered} / ${total}`, margin + 5, y);
  y += 5;

  // Rating summary
  const ratingQuestions = data.responses.filter(r => r.questionType === "rating" && r.rating != null);
  if (ratingQuestions.length > 0) {
    const avgRating = ratingQuestions.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingQuestions.length;
    doc.text(`${labels.averageRating} ${avgRating.toFixed(1)} / ${ratingQuestions[0].maxRating || 5}`, margin + 5, y);
    y += 5;
  }

  // ============ FOOTER ============
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(0, 201, 183);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(labels.footer, margin, pageHeight - 10);
    doc.text(`${labels.generated} ${new Date().toLocaleDateString(dateLocale)}`, margin, pageHeight - 6);
    doc.text(`${labels.page} ${i} ${labels.of} ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  // Save
  const dateStr = new Date().toLocaleDateString("en-US").replace(/\//g, "-");
  doc.save(`Assessment-${data.childName.replace(/\s+/g, "-")}-${data.assessmentTitle.replace(/\s+/g, "-")}-${dateStr}.pdf`);
}
