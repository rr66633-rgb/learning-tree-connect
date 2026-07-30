import * as XLSX from "xlsx";
import type { jsPDF } from "jspdf";

interface PayrollRecord {
  id: number;
  userId: number;
  userName: string;
  month: number;
  year: number;
  basicSalary: string;
  totalAllowances: string;
  totalDeductions: string;
  netSalary: string;
  status: string;
  paidAt?: Date | null;
}

interface PayrollSummary {
  employeeCount: number;
  totalBasic: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNet: number;
  paidCount: number;
  pendingCount: number;
}

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  approved: "معتمد",
  paid: "مدفوع",
  cancelled: "ملغي",
};

/**
 * Export payroll data to Excel file
 */
export function exportPayrollToExcel(records: PayrollRecord[], summary: PayrollSummary, month: number, year: number) {
  const monthName = monthNames[month - 1];
  
  // Main payroll data
  const data = records.map((r, index) => ({
    "م": index + 1,
    "اسم الموظف": r.userName,
    "الراتب الأساسي": Number(r.basicSalary),
    "البدلات": Number(r.totalAllowances),
    "الخصومات": Number(r.totalDeductions),
    "صافي الراتب": Number(r.netSalary),
    "الحالة": statusLabels[r.status] || r.status,
  }));

  // Add summary row
  data.push({
    "م": 0,
    "اسم الموظف": "الإجمالي",
    "الراتب الأساسي": summary.totalBasic,
    "البدلات": summary.totalAllowances,
    "الخصومات": summary.totalDeductions,
    "صافي الراتب": summary.totalNet,
    "الحالة": "",
  });

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws["!cols"] = [
    { wch: 5 },   // م
    { wch: 25 },  // اسم الموظف
    { wch: 15 },  // الراتب الأساسي
    { wch: 12 },  // البدلات
    { wch: 12 },  // الخصومات
    { wch: 15 },  // صافي الراتب
    { wch: 12 },  // الحالة
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `مسيّر ${monthName} ${year}`);

  // Bank transfer sheet
  const bankData = records
    .filter(r => r.status === "approved" || r.status === "paid")
    .map((r, index) => ({
      "م": index + 1,
      "اسم الموظف": r.userName,
      "صافي الراتب": Number(r.netSalary),
    }));

  if (bankData.length > 0) {
    const bankWs = XLSX.utils.json_to_sheet(bankData);
    bankWs["!cols"] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, bankWs, "تحويلات بنكية");
  }

  XLSX.writeFile(wb, `مسيّر_الرواتب_${monthName}_${year}.xlsx`);
}

/**
 * Load Arabic font for jsPDF
 */
async function loadArabicFont(doc: jsPDF): Promise<void> {
  try {
    const fontUrl = "https://cdn.jsdelivr.net/npm/@fontsource/amiri@5.0.18/files/amiri-arabic-400-normal.woff";
    const response = await fetch(fontUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      doc.addFileToVFS("Amiri-Regular.ttf", base64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      doc.setFont("Amiri");
      return;
    }
  } catch {
    // Fallback to default font
  }
  doc.setFont("helvetica");
}

/**
 * Export payroll data to PDF file
 */
export async function exportPayrollToPdf(records: PayrollRecord[], summary: PayrollSummary, month: number, year: number, orgName?: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await loadArabicFont(doc);

  const monthName = monthNames[month - 1];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFontSize(18);
  doc.text(`مسيّر الرواتب - ${monthName} ${year}`, pageWidth / 2, 15, { align: "center" });
  
  if (orgName) {
    doc.setFontSize(12);
    doc.text(orgName, pageWidth / 2, 22, { align: "center" });
  }

  doc.setFontSize(10);
  doc.text(`تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}`, pageWidth - 15, 30, { align: "right" });
  doc.text(`عدد الموظفين: ${summary.employeeCount}`, 15, 30);

  // Table
  const tableData = records.map((r, index) => [
    statusLabels[r.status] || r.status,
    Number(r.netSalary).toLocaleString(),
    Number(r.totalDeductions).toLocaleString(),
    Number(r.totalAllowances).toLocaleString(),
    Number(r.basicSalary).toLocaleString(),
    r.userName,
    String(index + 1),
  ]);

  // Add total row
  tableData.push([
    "",
    summary.totalNet.toLocaleString(),
    summary.totalDeductions.toLocaleString(),
    summary.totalAllowances.toLocaleString(),
    summary.totalBasic.toLocaleString(),
    "الإجمالي",
    "",
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["الحالة", "صافي الراتب", "الخصومات", "البدلات", "الراتب الأساسي", "اسم الموظف", "م"]],
    body: tableData,
    styles: {
      font: "Amiri",
      fontSize: 10,
      halign: "center",
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    // Last row (total) styling
    didParseCell: (data: any) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
    margin: { top: 35, right: 15, bottom: 25, left: 15 },
  });

  // Footer summary
  const finalY = (doc as any).lastAutoTable?.finalY || pageHeight - 40;
  doc.setFontSize(11);
  doc.text(`إجمالي صافي الرواتب: ${summary.totalNet.toLocaleString()} ر.س`, pageWidth / 2, finalY + 10, { align: "center" });
  doc.text(`مدفوع: ${summary.paidCount} | معلّق: ${summary.pendingCount}`, pageWidth / 2, finalY + 17, { align: "center" });

  // Page footer
  doc.setFontSize(8);
  doc.text("وثيقة سرية - للاستخدام الداخلي فقط", pageWidth / 2, pageHeight - 5, { align: "center" });

  doc.save(`مسيّر_الرواتب_${monthName}_${year}.pdf`);
}
