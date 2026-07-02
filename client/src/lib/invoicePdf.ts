/**
 * توليد فاتورة PDF احترافية بالعربي
 * يستخدم jsPDF مع خط Noto Sans Arabic + QR Code + الرقم الضريبي
 */
import QRCode from 'qrcode';

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
  vatNumber?: string;
  commercialRegister?: string;
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

  if (!regularResp.ok || !boldResp.ok) {
    throw new Error('فشل تحميل الخطوط العربية');
  }

  const [regularBuf, boldBuf] = await Promise.all([
    regularResp.arrayBuffer(),
    boldResp.arrayBuffer(),
  ]);

  // Convert to base64
  const toBase64 = (buf: ArrayBuffer) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

  fontRegularBase64 = toBase64(regularBuf);
  fontBoldBase64 = toBase64(boldBuf);

  return { regular: fontRegularBase64, bold: fontBoldBase64 };
}

/**
 * Generate QR code as data URL for ZATCA-style invoice
 */
async function generateInvoiceQR(invoice: InvoiceData, centerInfo?: CenterInfo): Promise<string> {
  // ZATCA simplified invoice QR contains: seller name, VAT number, timestamp, total, VAT amount
  const sellerName = centerInfo?.centerName || 'نشأة';
  const vatNumber = centerInfo?.vatNumber || '';
  const timestamp = new Date(invoice.createdAt).toISOString();
  const total = Number(invoice.total || 0).toFixed(2);
  const vatAmount = Number(invoice.vatAmount || 0).toFixed(2);

  // TLV encoding for ZATCA QR (Tag-Length-Value)
  const tlvEncode = (tag: number, value: string): Uint8Array => {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
  };

  const tag1 = tlvEncode(1, sellerName);
  const tag2 = tlvEncode(2, vatNumber);
  const tag3 = tlvEncode(3, timestamp);
  const tag4 = tlvEncode(4, total);
  const tag5 = tlvEncode(5, vatAmount);

  // Combine all TLV tags
  const combined = new Uint8Array(tag1.length + tag2.length + tag3.length + tag4.length + tag5.length);
  let offset = 0;
  combined.set(tag1, offset); offset += tag1.length;
  combined.set(tag2, offset); offset += tag2.length;
  combined.set(tag3, offset); offset += tag3.length;
  combined.set(tag4, offset); offset += tag4.length;
  combined.set(tag5, offset);

  // Base64 encode the TLV data
  const base64Data = btoa(String.fromCharCode.apply(null, Array.from(combined)));

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(base64Data, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return qrDataUrl;
}

export async function generateInvoicePDF(invoice: InvoiceData, centerInfo?: CenterInfo): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  // Import autotable as side-effect (it patches jsPDF prototype)
  await import('jspdf-autotable');

  // Load Arabic fonts
  const fonts = await loadArabicFont();

  // Generate QR code
  const qrDataUrl = await generateInvoiceQR(invoice, centerInfo);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Register Arabic fonts
  doc.addFileToVFS('NotoSansArabic-Regular.ttf', fonts.regular);
  doc.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
  doc.addFileToVFS('NotoSansArabic-Bold.ttf', fonts.bold);
  doc.addFont('NotoSansArabic-Bold.ttf', 'NotoSansArabic', 'bold');

  const pageWidth = 210;
  const margin = 15;

  // ============ HEADER ============
  doc.setFillColor(26, 86, 50); // Forest green
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Accent strip
  doc.setFillColor(0, 201, 183); // Teal accent
  doc.rect(0, 38, pageWidth, 2, 'F');

  // Header text
  doc.setFont('NotoSansArabic', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('نشأة', pageWidth / 2, 16, { align: 'center' });

  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(11);
  doc.text('فاتورة ضريبية مبسطة', pageWidth / 2, 26, { align: 'center' });

  doc.setFontSize(9);
  const centerName = centerInfo?.centerName || 'نشأة لإدارة الحضانات';
  doc.text(centerName, pageWidth / 2, 33, { align: 'center' });

  // VAT number in header if available
  const vatNumber = centerInfo?.vatNumber || '';
  if (vatNumber) {
    doc.setFontSize(8);
    doc.text(`الرقم الضريبي: ${vatNumber}`, pageWidth / 2, 38, { align: 'center' });
  }

  // ============ INVOICE INFO ============
  let y = 48;

  // Invoice number and date
  doc.setFont('NotoSansArabic', 'bold');
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(13);
  doc.text(`فاتورة رقم: ${invoice.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });

  y += 7;
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`تاريخ الإصدار: ${new Date(invoice.createdAt).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });

  y += 6;
  doc.text(`تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });

  y += 6;
  const statusText = STATUS_LABELS[invoice.status] || invoice.status;
  doc.text(`الحالة: ${statusText}`, pageWidth - margin, y, { align: 'right' });

  if (invoice.paidAt) {
    y += 6;
    doc.text(`تاريخ الدفع: ${new Date(invoice.paidAt).toLocaleDateString('ar-SA')}`, pageWidth - margin, y, { align: 'right' });
  }

  // ============ PARTIES INFO ============
  y += 10;

  // Divider
  doc.setDrawColor(0, 201, 183);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // Two columns
  doc.setFont('NotoSansArabic', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 86, 50);
  doc.text('معلومات الطفل', pageWidth - margin, y, { align: 'right' });
  doc.text('معلومات ولي الأمر', pageWidth / 2 - 10, y, { align: 'right' });

  y += 6;
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  doc.text(`الاسم: ${invoice.childName || '-'}`, pageWidth - margin, y, { align: 'right' });
  doc.text(`الاسم: ${invoice.parentName || '-'}`, pageWidth / 2 - 10, y, { align: 'right' });

  y += 5;
  if (invoice.invoiceType) {
    doc.text(`النوع: ${INVOICE_TYPE_LABELS[invoice.invoiceType] || invoice.invoiceType}`, pageWidth - margin, y, { align: 'right' });
  }
  if (invoice.parentPhone) {
    doc.text(`الجوال: ${invoice.parentPhone}`, pageWidth / 2 - 10, y, { align: 'right' });
  }

  y += 5;
  if (invoice.parentEmail) {
    doc.text(`البريد: ${invoice.parentEmail}`, pageWidth / 2 - 10, y, { align: 'right' });
  }

  // ============ INVOICE TABLE ============
  y += 8;

  (doc as any).autoTable({
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
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [26, 86, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [26, 86, 50],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 45, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 12, halign: 'center' },
    },
  });

  // ============ PAYMENT INFO ============
  const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
  let currentY = finalY + 10;

  if (invoice.paymentMethod) {
    doc.setFont('NotoSansArabic', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`طريقة الدفع: ${PAYMENT_METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;
  }

  if (invoice.paidAmount && Number(invoice.paidAmount) > 0) {
    doc.text(`المبلغ المدفوع: ${Number(invoice.paidAmount).toLocaleString('ar-SA')} ر.س`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;
    const remaining = Number(invoice.total) - Number(invoice.paidAmount);
    if (remaining > 0) {
      doc.setTextColor(200, 50, 50);
      doc.text(`المبلغ المتبقي: ${remaining.toLocaleString('ar-SA')} ر.س`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 6;
    }
  }

  // ============ QR CODE ============
  // Add QR code at bottom-left
  const qrSize = 30;
  const qrX = margin;
  const qrY = 250;
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // QR label
  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('رمز الفاتورة الإلكترونية', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });

  // ============ TAX INFO (right of QR) ============
  if (vatNumber) {
    doc.setFont('NotoSansArabic', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`الرقم الضريبي: ${vatNumber}`, pageWidth - margin, qrY + 5, { align: 'right' });
  }
  if (centerInfo?.commercialRegister) {
    doc.text(`السجل التجاري: ${centerInfo.commercialRegister}`, pageWidth - margin, qrY + 11, { align: 'right' });
  }
  if (centerInfo?.address) {
    doc.text(`العنوان: ${centerInfo.address}`, pageWidth - margin, qrY + 17, { align: 'right' });
  }

  // ============ FOOTER ============
  doc.setDrawColor(26, 86, 50);
  doc.setLineWidth(0.3);
  doc.line(margin, 287, pageWidth - margin, 287);

  doc.setFont('NotoSansArabic', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('نشأة - منصة إدارة الحضانات والروضات | www.naashah.com', pageWidth / 2, 291, { align: 'center' });
  doc.text('تم إصدار هذه الفاتورة إلكترونياً ولا تحتاج إلى توقيع أو ختم', pageWidth / 2, 295, { align: 'center' });

  // Save the PDF
  doc.save(`فاتورة-${invoice.invoiceNumber}.pdf`);
}
