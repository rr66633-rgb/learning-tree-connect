/**
 * توليد فاتورة PDF احترافية بالعربي
 * يستخدم html2canvas لتحويل HTML إلى صورة ثم jsPDF لإنشاء PDF
 * هذا يضمن عرض صحيح 100% للنصوص العربية والأرقام والرموز
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
  vatNumber?: string;
  commercialRegister?: string;
  logoUrl?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "معلقة",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
  partially_paid: "مدفوعة جزئياً",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#ca8a04",
  paid: "#16a34a",
  overdue: "#dc2626",
  cancelled: "#6b7280",
  partially_paid: "#2563eb",
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

function formatCurrency(value: string | number): string {
  const num = Number(value || 0);
  return num.toFixed(2) + ' ر.س';
}

function formatDate(date: string | Date): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(date);
  }
}

/**
 * Generate ZATCA QR code as base64 data URL
 */
async function generateQRDataUrl(invoice: InvoiceData, centerInfo?: CenterInfo): Promise<string | null> {
  try {
    const sellerName = centerInfo?.centerName || 'نشأة';
    const vatNumber = centerInfo?.vatNumber || '';
    if (!vatNumber) return null;

    const timestamp = new Date(invoice.createdAt).toISOString();
    const total = Number(invoice.total || 0).toFixed(2);
    const vatAmount = Number(invoice.vatAmount || 0).toFixed(2);

    const tlvEncode = (tag: number, value: string): Uint8Array => {
      const encoder = new TextEncoder();
      const valueBytes = encoder.encode(value);
      const result = new Uint8Array(2 + valueBytes.length);
      result[0] = tag;
      result[1] = valueBytes.length;
      result.set(valueBytes, 2);
      return result;
    };

    const parts = [
      tlvEncode(1, sellerName),
      tlvEncode(2, vatNumber),
      tlvEncode(3, timestamp),
      tlvEncode(4, total),
      tlvEncode(5, vatAmount),
    ];

    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const part of parts) {
      combined.set(part, offset);
      offset += part.length;
    }

    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    const base64Data = btoa(binary);

    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(base64Data, { width: 150, margin: 1, errorCorrectionLevel: 'M' });
  } catch (err) {
    console.warn('[PDF] QR generation failed:', err);
    return null;
  }
}

export async function generateInvoicePDF(invoice: InvoiceData, centerInfo?: CenterInfo): Promise<void> {
  console.log('[PDF] Starting PDF generation with html2canvas approach...');

  // Load libraries
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  console.log('[PDF] Libraries loaded');

  // Generate QR code
  const qrDataUrl = await generateQRDataUrl(invoice, centerInfo);

  // Build invoice HTML
  const centerName = centerInfo?.centerName || 'نشأة';
  const vatNumber = centerInfo?.vatNumber || '';
  const commercialRegister = centerInfo?.commercialRegister || '';
  const logoUrl = centerInfo?.logoUrl || '';
  const statusLabel = STATUS_LABELS[invoice.status] || invoice.status;
  const statusColor = STATUS_COLORS[invoice.status] || '#333';
  const subtotal = Number(invoice.subtotal || 0);
  const vatAmount = Number(invoice.vatAmount || 0);
  const total = Number(invoice.total || 0);
  const vatRate = Number(invoice.vatRate || 15);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-1';

  container.innerHTML = `
    <div style="font-family: 'Noto Sans Arabic', Tahoma, Arial, sans-serif; direction: rtl; color: #1a1a1a; padding: 40px; box-sizing: border-box;">
      
      <!-- Header Bar -->
      <div style="background: linear-gradient(135deg, #0d7c3d, #065f2e); color: white; padding: 25px 30px; border-radius: 10px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          ${logoUrl ? `<img src="${logoUrl}" style="max-height: 50px; max-width: 150px; margin-bottom: 8px; display: block;" crossorigin="anonymous" />` : ''}
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">${centerName}</h2>
          ${vatNumber ? `<p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9;">الرقم الضريبي: ${vatNumber}</p>` : ''}
          ${commercialRegister ? `<p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.9;">السجل التجاري: ${commercialRegister}</p>` : ''}
        </div>
        <div style="text-align: left;">
          <h1 style="margin: 0; font-size: 26px; font-weight: bold;">فاتورة ضريبية</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">${invoice.invoiceNumber}</p>
        </div>
      </div>

      <!-- Invoice Meta -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
        <div>
          <p style="margin: 4px 0;"><strong>تاريخ الإصدار:</strong> ${formatDate(invoice.createdAt)}</p>
          <p style="margin: 4px 0;"><strong>تاريخ الاستحقاق:</strong> ${formatDate(invoice.dueDate)}</p>
          ${invoice.paidAt ? `<p style="margin: 4px 0;"><strong>تاريخ الدفع:</strong> ${formatDate(invoice.paidAt)}</p>` : ''}
        </div>
        <div style="text-align: left;">
          <span style="background: ${statusColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">${statusLabel}</span>
        </div>
      </div>

      <!-- Parties -->
      <div style="display: flex; gap: 30px; margin-bottom: 25px; background: #f0fdf4; padding: 18px; border-radius: 8px; border: 1px solid #dcfce7;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0d7c3d;">معلومات الطفل</h4>
          <p style="margin: 3px 0; font-size: 13px;">${invoice.childName || '-'}</p>
          <p style="margin: 3px 0; font-size: 12px; color: #666;">${INVOICE_TYPE_LABELS[invoice.invoiceType || ''] || invoice.invoiceType || ''}</p>
        </div>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0d7c3d;">معلومات ولي الأمر</h4>
          <p style="margin: 3px 0; font-size: 13px;">${invoice.parentName || '-'}</p>
          ${invoice.parentPhone ? `<p style="margin: 3px 0; font-size: 12px; color: #666;">${invoice.parentPhone}</p>` : ''}
          ${invoice.parentEmail ? `<p style="margin: 3px 0; font-size: 12px; color: #666;">${invoice.parentEmail}</p>` : ''}
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #0d7c3d; color: white;">
            <th style="padding: 12px 15px; text-align: right; border-radius: 0 8px 0 0;">الوصف</th>
            <th style="padding: 12px 15px; text-align: left; width: 140px; border-radius: 8px 0 0 0;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 15px;">${invoice.description || 'خدمات تعليمية'}</td>
            <td style="padding: 12px 15px; text-align: left;">${subtotal.toFixed(2)} ر.س</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div style="width: 280px; margin-right: auto; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
          <span>المبلغ قبل الضريبة</span>
          <span>${subtotal.toFixed(2)} ر.س</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
          <span>ضريبة القيمة المضافة (${vatRate}%)</span>
          <span>${vatAmount.toFixed(2)} ر.س</span>
        </div>
        ${invoice.paymentMethod ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #666;">
          <span>طريقة الدفع</span>
          <span>${PAYMENT_METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; padding: 12px; background: #0d7c3d; color: white; border-radius: 0 0 8px 8px; font-weight: bold; font-size: 15px;">
          <span>الإجمالي المستحق</span>
          <span>${total.toFixed(2)} ر.س</span>
        </div>
      </div>

      <!-- QR Code & Footer -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #e5e7eb; padding-top: 20px;">
        <div>
          ${qrDataUrl ? `
            <img src="${qrDataUrl}" style="width: 100px; height: 100px;" />
            <p style="font-size: 10px; color: #999; margin: 4px 0 0 0; text-align: center;">رمز التحقق الضريبي</p>
          ` : ''}
        </div>
        <div style="text-align: left; font-size: 10px; color: #999;">
          ${centerInfo?.address ? `<p style="margin: 2px 0;">${centerInfo.address}</p>` : ''}
          ${centerInfo?.phone ? `<p style="margin: 2px 0;">هاتف: ${centerInfo.phone}</p>` : ''}
          ${centerInfo?.email ? `<p style="margin: 2px 0;">بريد: ${centerInfo.email}</p>` : ''}
          <p style="margin: 6px 0 0 0; font-size: 9px;">تم إصدار هذه الفاتورة إلكترونياً ولا تحتاج إلى توقيع أو ختم</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Wait for images to load
  const images = container.querySelectorAll('img');
  if (images.length > 0) {
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }));
  }

  console.log('[PDF] Rendering HTML to canvas...');

  // Convert to canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // Remove container
  document.body.removeChild(container);

  console.log('[PDF] Creating PDF from canvas...');

  // Create PDF
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  if (imgHeight <= pdfHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
  } else {
    // Multi-page
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
  }

  // Save
  const fileName = `فاتورة-${invoice.invoiceNumber}.pdf`;
  pdf.save(fileName);
  console.log('[PDF] Done! Saved as:', fileName);
}

/**
 * طباعة الفاتورة مباشرة عبر نافذة الطباعة في المتصفح
 */
export async function printInvoice(invoice: InvoiceData, centerInfo?: CenterInfo): Promise<void> {
  console.log('[Print] Starting direct print...');

  // Generate QR code
  const qrDataUrl = await generateQRDataUrl(invoice, centerInfo);

  // Build invoice HTML
  const centerName = centerInfo?.centerName || 'نشأة';
  const vatNumber = centerInfo?.vatNumber || '';
  const commercialRegister = centerInfo?.commercialRegister || '';
  const logoUrl = centerInfo?.logoUrl || '';
  const statusLabel = STATUS_LABELS[invoice.status] || invoice.status;
  const statusColor = STATUS_COLORS[invoice.status] || '#333';
  const subtotal = Number(invoice.subtotal || 0);
  const vatAmount = Number(invoice.vatAmount || 0);
  const total = Number(invoice.total || 0);
  const vatRate = Number(invoice.vatRate || 15);

  const invoiceHtml = `
    <div style="font-family: 'Noto Sans Arabic', Tahoma, Arial, sans-serif; direction: rtl; color: #1a1a1a; padding: 40px; box-sizing: border-box; max-width: 794px; margin: 0 auto;">
      
      <!-- Header Bar -->
      <div style="background: linear-gradient(135deg, #0d7c3d, #065f2e); color: white; padding: 25px 30px; border-radius: 10px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          ${logoUrl ? `<img src="${logoUrl}" style="max-height: 50px; max-width: 150px; margin-bottom: 8px; display: block;" />` : ''}
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">${centerName}</h2>
          ${vatNumber ? `<p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9;">الرقم الضريبي: ${vatNumber}</p>` : ''}
          ${commercialRegister ? `<p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.9;">السجل التجاري: ${commercialRegister}</p>` : ''}
        </div>
        <div style="text-align: left;">
          <h1 style="margin: 0; font-size: 26px; font-weight: bold;">فاتورة ضريبية</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">${invoice.invoiceNumber}</p>
        </div>
      </div>

      <!-- Invoice Meta -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
        <div>
          <p style="margin: 4px 0;"><strong>تاريخ الإصدار:</strong> ${formatDate(invoice.createdAt)}</p>
          <p style="margin: 4px 0;"><strong>تاريخ الاستحقاق:</strong> ${formatDate(invoice.dueDate)}</p>
          ${invoice.paidAt ? `<p style="margin: 4px 0;"><strong>تاريخ الدفع:</strong> ${formatDate(invoice.paidAt)}</p>` : ''}
        </div>
        <div style="text-align: left;">
          <span style="background: ${statusColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">${statusLabel}</span>
        </div>
      </div>

      <!-- Parties -->
      <div style="display: flex; gap: 30px; margin-bottom: 25px; background: #f0fdf4; padding: 18px; border-radius: 8px; border: 1px solid #dcfce7;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0d7c3d;">معلومات الطفل</h4>
          <p style="margin: 3px 0; font-size: 13px;">${invoice.childName || '-'}</p>
          <p style="margin: 3px 0; font-size: 12px; color: #666;">${INVOICE_TYPE_LABELS[invoice.invoiceType || ''] || invoice.invoiceType || ''}</p>
        </div>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0d7c3d;">معلومات ولي الأمر</h4>
          <p style="margin: 3px 0; font-size: 13px;">${invoice.parentName || '-'}</p>
          ${invoice.parentPhone ? `<p style="margin: 3px 0; font-size: 12px; color: #666;">${invoice.parentPhone}</p>` : ''}
          ${invoice.parentEmail ? `<p style="margin: 3px 0; font-size: 12px; color: #666;">${invoice.parentEmail}</p>` : ''}
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #0d7c3d; color: white;">
            <th style="padding: 12px 15px; text-align: right; border-radius: 0 8px 0 0;">الوصف</th>
            <th style="padding: 12px 15px; text-align: left; width: 140px; border-radius: 8px 0 0 0;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 15px;">${invoice.description || 'خدمات تعليمية'}</td>
            <td style="padding: 12px 15px; text-align: left;">${subtotal.toFixed(2)} ر.س</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div style="width: 280px; margin-right: auto; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
          <span>المبلغ قبل الضريبة</span>
          <span>${subtotal.toFixed(2)} ر.س</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
          <span>ضريبة القيمة المضافة (${vatRate}%)</span>
          <span>${vatAmount.toFixed(2)} ر.س</span>
        </div>
        ${invoice.paymentMethod ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #666;">
          <span>طريقة الدفع</span>
          <span>${PAYMENT_METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; padding: 12px; background: #0d7c3d; color: white; border-radius: 0 0 8px 8px; font-weight: bold; font-size: 15px;">
          <span>الإجمالي المستحق</span>
          <span>${total.toFixed(2)} ر.س</span>
        </div>
      </div>

      <!-- QR Code & Footer -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #e5e7eb; padding-top: 20px;">
        <div>
          ${qrDataUrl ? `
            <img src="${qrDataUrl}" style="width: 100px; height: 100px;" />
            <p style="font-size: 10px; color: #999; margin: 4px 0 0 0; text-align: center;">رمز التحقق الضريبي</p>
          ` : ''}
        </div>
        <div style="text-align: left; font-size: 10px; color: #999;">
          ${centerInfo?.address ? `<p style="margin: 2px 0;">${centerInfo.address}</p>` : ''}
          ${centerInfo?.phone ? `<p style="margin: 2px 0;">هاتف: ${centerInfo.phone}</p>` : ''}
          ${centerInfo?.email ? `<p style="margin: 2px 0;">بريد: ${centerInfo.email}</p>` : ''}
          <p style="margin: 6px 0 0 0; font-size: 9px;">تم إصدار هذه الفاتورة إلكترونياً ولا تحتاج إلى توقيع أو ختم</p>
        </div>
      </div>
    </div>
  `;

  // Open print window
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>طباعة فاتورة - ${invoice.invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans Arabic', Tahoma, Arial, sans-serif; direction: rtl; background: white; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${invoiceHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
  console.log('[Print] Print window opened');
}
