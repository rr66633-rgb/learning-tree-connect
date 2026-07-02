/**
 * توليد فاتورة PDF احترافية بالعربي
 * يستخدم jsPDF مع خط Noto Sans Arabic
 */

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  description?: string | null;
  subtotal: string | number;
  vatRate: string | number;
  vatAmount: string | number;
  total: string | number;
  paidAmount?: string | number;
  status: string;
  dueDate: string | Date;
  paidAt?: string | Date | null;
  paymentMethod?: string | null;
  invoiceType?: string;
  createdAt: string | Date;
  childName?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

interface CenterInfo {
  centerName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "معلقة",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
  partially_paid: "مدفوعة جزئياً",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة ائتمانية",
  apple_pay: "Apple Pay",
  mada: "مدى",
  stc_pay: "STC Pay",
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  tuition: "رسوم دراسية",
  activity: "نشاط",
  trip: "رحلة",
  uniform: "زي مدرسي",
  registration: "تسجيل",
  other: "أخرى",
};

// Font loading cache
let fontLoaded = false;
let fontRegularBase64: string | null = null;
let fontBoldBase64: string | null = null;

async function loadArabicFont(): Promise<{ regular: string; bold: string }> {
  if (fontRegularBase64 && fontBoldBase64) {
    return { regular: fontRegularBase64, bold: fontBoldBase64 };
  }

  const [regularResp, boldResp] = await Promise.all([
    fetch('/manus-storage/NotoSansArabic-Regular_45c2e652.ttf'),
    fetch('/manus-storage/NotoSansArabic-Bold_3a0e721d.ttf'),
  ]);

  const [regularBuf, boldBuf] = await Promise.all([
    regularResp.arrayBuffer(),
    boldResp.arrayBuffer(),
  ]);

  // Convert to base64
  const toBase64 = (buf: ArrayBuffer) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  fontRegularBase64 = toBase64(regularBuf);
  fontBoldBase64 = toBase64(boldBuf);

  return { regular: fontRegularBase64, bold: fontBoldBase64 };
}

function reverseArabicText(text: string): string {
  // jsPDF doesn't support RTL natively, so we reverse Arabic text for display
  // This is a simplified approach - for complex text, use a shaping library
  return text;
}

export async function generateInvoicePDF(invoice: InvoiceData, centerInfo?: CenterInfo): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // Load Arabic fonts
  const fonts = await loadArabicFont();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Register Arabic fonts
  doc.addFileToVFS('NotoSansArabic-Regular.ttf', fonts.regular);
  doc.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
  doc.addFileToVFS('NotoSansArabic-Bold.ttf', fonts.bold);
  doc.addFont('NotoSansArabic-Bold.ttf', 'NotoSansArabic', 'bold');

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // ============ HEADER ============
  // Green gradient header
  doc.setFillColor(0, 201, 183); // #00C9B7 - brand teal
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Darker accent strip
  doc.setFillColor(26, 31, 54); // #1A1F36 - brand dark
  doc.rect(0, 37, pageWidth, 3, 'F');

  // Header text
  doc.setFont('NotoSansArabic', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('نشأة', pageWidth / 2, 18, { align: 'center' });

  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(11);
  doc.text('فاتورة ضريبية مبسطة', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(9);
  const centerName = centerInfo?.centerName || 'حضانة شجرة التعلم';
  doc.text(centerName, pageWidth / 2, 34, { align: 'center' });

  // ============ INVOICE INFO ============
  let y = 50;

  // Invoice number and date - right aligned for Arabic
  doc.setFont('NotoSansArabic', 'bold');
  doc.setTextColor(26, 31, 54);
  doc.setFontSize(14);
  doc.text(`فاتورة رقم: ${invoice.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });

  y += 8;
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(10);
  doc.text(`تاريخ الإصدار: ${new Date(invoice.createdAt).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });

  y += 6;
  doc.text(`تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });

  // Status badge
  y += 6;
  const statusText = STATUS_LABELS[invoice.status] || invoice.status;
  doc.text(`الحالة: ${statusText}`, pageWidth - margin, y, { align: 'right' });

  if (invoice.paidAt) {
    y += 6;
    doc.text(`تاريخ الدفع: ${new Date(invoice.paidAt).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });
  }

  // ============ PARTIES INFO ============
  y += 12;

  // Divider
  doc.setDrawColor(0, 201, 183);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // Two columns: Child info (right) and Parent info (left)
  doc.setFont('NotoSansArabic', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 201, 183);
  doc.text('معلومات الطفل', pageWidth - margin, y, { align: 'right' });
  doc.text('معلومات ولي الأمر', pageWidth / 2 - 10, y, { align: 'right' });

  y += 7;
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  // Child info
  doc.text(`الاسم: ${invoice.childName || '-'}`, pageWidth - margin, y, { align: 'right' });
  // Parent info
  doc.text(`الاسم: ${invoice.parentName || '-'}`, pageWidth / 2 - 10, y, { align: 'right' });

  y += 6;
  if (invoice.invoiceType) {
    doc.text(`النوع: ${INVOICE_TYPE_LABELS[invoice.invoiceType] || invoice.invoiceType}`, pageWidth - margin, y, { align: 'right' });
  }
  if (invoice.parentPhone) {
    doc.text(`الجوال: ${invoice.parentPhone}`, pageWidth / 2 - 10, y, { align: 'right' });
  }

  y += 6;
  if (invoice.parentEmail) {
    doc.text(`البريد: ${invoice.parentEmail}`, pageWidth / 2 - 10, y, { align: 'right' });
  }

  // ============ INVOICE TABLE ============
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['المبلغ (ر.س)', 'الوصف', '#']],
    body: [
      [
        `${Number(invoice.subtotal || 0).toLocaleString('ar-SA')} ر.س`,
        invoice.description || 'خدمات تعليمية',
        '1',
      ],
    ],
    foot: [
      [`${Number(invoice.subtotal || 0).toLocaleString('ar-SA')} ر.س`, 'المبلغ قبل الضريبة', ''],
      [`${Number(invoice.vatAmount || 0).toLocaleString('ar-SA')} ر.س`, `ضريبة القيمة المضافة (${Number(invoice.vatRate || 15)}%)`, ''],
      [`${Number(invoice.total || 0).toLocaleString('ar-SA')} ر.س`, 'الإجمالي المستحق', ''],
    ],
    theme: 'grid',
    styles: {
      font: 'NotoSansArabic',
      halign: 'right',
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [0, 201, 183],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [242, 244, 247],
      textColor: [26, 31, 54],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 50, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
    },
  });

  // ============ PAYMENT INFO ============
  const finalY = (doc as any).lastAutoTable?.finalY || y + 60;
  let currentY = finalY + 12;

  if (invoice.paymentMethod) {
    doc.setFont('NotoSansArabic', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`طريقة الدفع: ${PAYMENT_METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 7;
  }

  if (invoice.paidAmount && Number(invoice.paidAmount) > 0) {
    doc.text(`المبلغ المدفوع: ${Number(invoice.paidAmount).toLocaleString('ar-SA')} ر.س`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 7;
    const remaining = Number(invoice.total) - Number(invoice.paidAmount);
    if (remaining > 0) {
      doc.setTextColor(220, 50, 50);
      doc.text(`المبلغ المتبقي: ${remaining.toLocaleString('ar-SA')} ر.س`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 7;
    }
  }

  // ============ FOOTER ============
  // Footer divider
  doc.setDrawColor(0, 201, 183);
  doc.setLineWidth(0.3);
  doc.line(margin, 270, pageWidth - margin, 270);

  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);

  const footerY = 276;
  doc.text('نشأة - منصة إدارة الحضانات والروضات', pageWidth / 2, footerY, { align: 'center' });
  doc.text('www.naashah.com', pageWidth / 2, footerY + 5, { align: 'center' });

  if (centerInfo?.phone) {
    doc.text(`هاتف: ${centerInfo.phone}`, pageWidth / 2, footerY + 10, { align: 'center' });
  }

  doc.text(`تم إصدار هذه الفاتورة إلكترونياً ولا تحتاج إلى توقيع أو ختم`, pageWidth / 2, footerY + 15, { align: 'center' });

  // Save the PDF
  doc.save(`فاتورة-${invoice.invoiceNumber}.pdf`);
}

/**
 * Generate PDF as Blob (for email attachment)
 */
export async function generateInvoicePDFBlob(invoice: InvoiceData, centerInfo?: CenterInfo): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const fonts = await loadArabicFont();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.addFileToVFS('NotoSansArabic-Regular.ttf', fonts.regular);
  doc.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
  doc.addFileToVFS('NotoSansArabic-Bold.ttf', fonts.bold);
  doc.addFont('NotoSansArabic-Bold.ttf', 'NotoSansArabic', 'bold');

  const pageWidth = 210;
  const margin = 15;

  // Same content as generateInvoicePDF but returns blob
  doc.setFillColor(0, 201, 183);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(26, 31, 54);
  doc.rect(0, 37, pageWidth, 3, 'F');

  doc.setFont('NotoSansArabic', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('نشأة', pageWidth / 2, 18, { align: 'center' });
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(11);
  doc.text('فاتورة ضريبية مبسطة', pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(9);
  doc.text(centerInfo?.centerName || 'حضانة شجرة التعلم', pageWidth / 2, 34, { align: 'center' });

  let y = 50;
  doc.setFont('NotoSansArabic', 'bold');
  doc.setTextColor(26, 31, 54);
  doc.setFontSize(14);
  doc.text(`فاتورة رقم: ${invoice.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });
  y += 8;
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(10);
  doc.text(`تاريخ الإصدار: ${new Date(invoice.createdAt).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });
  y += 6;
  doc.text(`تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });
  y += 6;
  doc.text(`الحالة: ${STATUS_LABELS[invoice.status] || invoice.status}`, pageWidth - margin, y, { align: 'right' });

  y += 12;
  doc.setDrawColor(0, 201, 183);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('NotoSansArabic', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 201, 183);
  doc.text('معلومات الطفل', pageWidth - margin, y, { align: 'right' });
  doc.text('معلومات ولي الأمر', pageWidth / 2 - 10, y, { align: 'right' });
  y += 7;
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`الاسم: ${invoice.childName || '-'}`, pageWidth - margin, y, { align: 'right' });
  doc.text(`الاسم: ${invoice.parentName || '-'}`, pageWidth / 2 - 10, y, { align: 'right' });
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [['المبلغ (ر.س)', 'الوصف', '#']],
    body: [[`${Number(invoice.subtotal || 0).toLocaleString('ar-SA')} ر.س`, invoice.description || 'خدمات تعليمية', '1']],
    foot: [
      [`${Number(invoice.subtotal || 0).toLocaleString('ar-SA')} ر.س`, 'المبلغ قبل الضريبة', ''],
      [`${Number(invoice.vatAmount || 0).toLocaleString('ar-SA')} ر.س`, `ضريبة القيمة المضافة (${Number(invoice.vatRate || 15)}%)`, ''],
      [`${Number(invoice.total || 0).toLocaleString('ar-SA')} ر.س`, 'الإجمالي المستحق', ''],
    ],
    theme: 'grid',
    styles: { font: 'NotoSansArabic', halign: 'right', fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [0, 201, 183], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [242, 244, 247], textColor: [26, 31, 54], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 50, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 15, halign: 'center' } },
  });

  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('نشأة - منصة إدارة الحضانات والروضات | www.naashah.com', pageWidth / 2, 280, { align: 'center' });

  return doc.output('blob');
}
