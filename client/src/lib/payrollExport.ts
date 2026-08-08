import * as XLSX from "xlsx";
import type { jsPDF } from "jspdf";
import { saveOrShareFile } from "@/lib/fileExport";

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
export async function exportPayrollToExcel(records: PayrollRecord[], summary: PayrollSummary, month: number, year: number) {
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

  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return saveOrShareFile(
    bytes,
    `مسيّر_الرواتب_${monthName}_${year}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `مسيّر الرواتب ${monthName} ${year}`,
  );
}

/**
 * Load Arabic font for jsPDF
 */
async function loadArabicFont(doc: jsPDF): Promise<void> {
  try {
    const response = await fetch("/manus-storage/NotoSansArabic-Regular_e1f3d88c.ttf");
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      doc.addFileToVFS("NotoSansArabic-Regular.ttf", base64);
      doc.addFont("NotoSansArabic-Regular.ttf", "NotoSansArabic", "normal");
      doc.setFont("NotoSansArabic");
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
      font: "NotoSansArabic",
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

  return saveOrShareFile(
    doc.output("blob"),
    `مسيّر_الرواتب_${monthName}_${year}.pdf`,
    "application/pdf",
    `مسيّر الرواتب ${monthName} ${year}`,
  );
}

interface MonthlySummary {
  month: number;
  employeeCount: number;
  totalBasic: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNet: number;
  paidCount: number;
}

interface AnnualTotal {
  totalBasic: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNet: number;
  totalRecords: number;
}

/**
 * Export annual payroll report to Excel
 */
export async function exportAnnualPayrollToExcel(
  records: PayrollRecord[],
  monthlySummary: MonthlySummary[],
  annualTotal: AnnualTotal,
  year: number
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Monthly Summary
  const summaryData = monthlySummary
    .filter(m => m.employeeCount > 0)
    .map(m => ({
      "الشهر": monthNames[m.month - 1],
      "عدد الموظفين": m.employeeCount,
      "إجمالي الأساسي": m.totalBasic,
      "إجمالي البدلات": m.totalAllowances,
      "إجمالي الخصومات": m.totalDeductions,
      "إجمالي الصافي": m.totalNet,
      "مدفوع": m.paidCount,
    }));

  // Add annual total row
  summaryData.push({
    "الشهر": "الإجمالي السنوي",
    "عدد الموظفين": annualTotal.totalRecords,
    "إجمالي الأساسي": annualTotal.totalBasic,
    "إجمالي البدلات": annualTotal.totalAllowances,
    "إجمالي الخصومات": annualTotal.totalDeductions,
    "إجمالي الصافي": annualTotal.totalNet,
    "مدفوع": 0,
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [
    { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, `ملخص سنوي ${year}`);

  // Sheet 2: All records detail
  const detailData = records.map((r, index) => ({
    "م": index + 1,
    "اسم الموظف": r.userName,
    "الشهر": monthNames[r.month - 1],
    "الراتب الأساسي": Number(r.basicSalary),
    "البدلات": Number(r.totalAllowances),
    "الخصومات": Number(r.totalDeductions),
    "صافي الراتب": Number(r.netSalary),
    "الحالة": statusLabels[r.status] || r.status,
  }));

  const detailWs = XLSX.utils.json_to_sheet(detailData);
  detailWs["!cols"] = [
    { wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, detailWs, "تفاصيل كاملة");

  // Sheet 3: Per-employee annual summary
  const employeeMap = new Map<number, { name: string; totalBasic: number; totalAllowances: number; totalDeductions: number; totalNet: number; months: number }>();
  records.forEach(r => {
    const existing = employeeMap.get(r.userId) || { name: r.userName, totalBasic: 0, totalAllowances: 0, totalDeductions: 0, totalNet: 0, months: 0 };
    existing.totalBasic += Number(r.basicSalary);
    existing.totalAllowances += Number(r.totalAllowances);
    existing.totalDeductions += Number(r.totalDeductions);
    existing.totalNet += Number(r.netSalary);
    existing.months += 1;
    employeeMap.set(r.userId, existing);
  });

  const empData: any[] = [];
  let idx = 1;
  employeeMap.forEach((v) => {
    empData.push({
      "م": idx++,
      "اسم الموظف": v.name,
      "عدد الأشهر": v.months,
      "إجمالي الأساسي": v.totalBasic,
      "إجمالي البدلات": v.totalAllowances,
      "إجمالي الخصومات": v.totalDeductions,
      "إجمالي الصافي": v.totalNet,
    });
  });

  const empWs = XLSX.utils.json_to_sheet(empData);
  empWs["!cols"] = [
    { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, empWs, "ملخص الموظفين");

  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return saveOrShareFile(
    bytes,
    `التقرير_السنوي_للرواتب_${year}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `التقرير السنوي للرواتب ${year}`,
  );
}

/**
 * Export annual payroll report to PDF
 */
export async function exportAnnualPayrollToPdf(
  monthlySummary: MonthlySummary[],
  annualTotal: AnnualTotal,
  year: number,
  orgName?: string
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await loadArabicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFontSize(18);
  doc.text(`التقرير السنوي للرواتب - ${year}`, pageWidth / 2, 15, { align: "center" });

  if (orgName) {
    doc.setFontSize(12);
    doc.text(orgName, pageWidth / 2, 22, { align: "center" });
  }

  doc.setFontSize(10);
  doc.text(`تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}`, pageWidth - 15, 30, { align: "right" });

  // Monthly summary table
  const tableData = monthlySummary
    .filter(m => m.employeeCount > 0)
    .map(m => [
      String(m.paidCount),
      m.totalNet.toLocaleString(),
      m.totalDeductions.toLocaleString(),
      m.totalAllowances.toLocaleString(),
      m.totalBasic.toLocaleString(),
      String(m.employeeCount),
      monthNames[m.month - 1],
    ]);

  // Annual total row
  tableData.push([
    "",
    annualTotal.totalNet.toLocaleString(),
    annualTotal.totalDeductions.toLocaleString(),
    annualTotal.totalAllowances.toLocaleString(),
    annualTotal.totalBasic.toLocaleString(),
    String(annualTotal.totalRecords),
    "الإجمالي",
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["مدفوع", "إجمالي الصافي", "الخصومات", "البدلات", "الراتب الأساسي", "عدد الموظفين", "الشهر"]],
    body: tableData,
    styles: {
      font: "NotoSansArabic",
      fontSize: 10,
      halign: "center",
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [238, 242, 255],
    },
    didParseCell: (data: any) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [199, 210, 254];
      }
    },
    margin: { top: 35, right: 15, bottom: 25, left: 15 },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || pageHeight - 40;
  doc.setFontSize(12);
  doc.text(`إجمالي الرواتب السنوي: ${annualTotal.totalNet.toLocaleString()} ر.س`, pageWidth / 2, finalY + 12, { align: "center" });

  doc.setFontSize(8);
  doc.text("وثيقة سرية - للاستخدام الداخلي فقط", pageWidth / 2, pageHeight - 5, { align: "center" });

  return saveOrShareFile(
    doc.output("blob"),
    `التقرير_السنوي_للرواتب_${year}.pdf`,
    "application/pdf",
    `التقرير السنوي للرواتب ${year}`,
  );
}
