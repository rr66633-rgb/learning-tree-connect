/**
 * Email Service - Production SMTP + SendGrid Support
 * Handles sending transactional emails (OTP codes, password reset, invitations, notifications)
 * 
 * Supports two providers:
 * 1. SMTP (Nodemailer) - default for production
 * 2. SendGrid API - alternative provider
 * 
 * Set EMAIL_PROVIDER=smtp or EMAIL_PROVIDER=sendgrid to choose
 */

import nodemailer from 'nodemailer';

// ─── Configuration ───────────────────────────────────────────────────────────

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp'; // 'smtp' | 'sendgrid'
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false'; // enabled by default

// SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true for 465, false for 587
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// SendGrid Configuration (fallback)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

// Resend Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// Sender Configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@naashah.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'نشأة - Nashaa';

// App URL for links in emails
const APP_URL = process.env.APP_URL || 'https://naashah.com';

// ─── Transport Setup ─────────────────────────────────────────────────────────

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (EMAIL_PROVIDER === 'smtp' && SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs in some environments
      },
    });
    console.log(`[Email Service] SMTP transport initialized (${SMTP_HOST}:${SMTP_PORT})`);
    return transporter;
  }

  if (EMAIL_PROVIDER === 'sendgrid' && SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: SENDGRID_API_KEY,
      },
    });
    console.log(`[Email Service] SendGrid SMTP transport initialized`);
    return transporter;
  }

  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailSendResult {
  sent: boolean;
  message: string;
  error?: string;
}

// ─── Core Send Function ──────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<EmailSendResult> {
  if (!EMAIL_ENABLED) {
    console.log(`[Email Service - DISABLED] Would send to ${to}: ${subject}`);
    return {
      sent: true,
      message: 'Email service disabled - message logged',
    };
  }

  const transport = getTransporter();
  if (!transport) {
    console.warn(`[Email Service] No transport configured. EMAIL_PROVIDER=${EMAIL_PROVIDER}, SMTP_HOST=${SMTP_HOST ? 'set' : 'empty'}`);
    return {
      sent: false,
      message: 'خدمة البريد الإلكتروني غير مُعدّة',
      error: 'No email transport configured',
    };
  }

  try {
    const info = await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    });

    console.log(`[Email Service] Email sent successfully to ${to}: ${subject} (messageId: ${info.messageId})`);
    return {
      sent: true,
      message: 'تم إرسال البريد الإلكتروني بنجاح',
    };
  } catch (error: any) {
    console.error(`[Email Service] Failed to send email to ${to}:`, error.message);
    return {
      sent: false,
      message: 'فشل في إرسال البريد الإلكتروني',
      error: error.message,
    };
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  const logoUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663757302822/cscUgnSZqDVGFSpPSQMsV9/nashaa-official-logo-B6wEWwsMZLrsNvxGDzxUwN.webp';
  const brandGreen = '#1a5632';
  const brandGreenLight = '#e8f5e9';
  const brandGreenGradient = 'linear-gradient(135deg, #1a5632, #2d7a4a)';
  
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background-color: #f0fdf4; margin: 0; padding: 20px; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .header { background: ${brandGreenGradient}; border-radius: 12px 12px 0 0; padding: 30px 40px; text-align: center; }
    .header img { width: 60px; height: 60px; border-radius: 12px; margin-bottom: 12px; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); font-size: 13px; margin: 6px 0 0; }
    .container { background: #ffffff; border-radius: 0 0 12px 12px; padding: 40px; box-shadow: 0 4px 16px rgba(26,86,50,0.08); }
    .message { color: #374151; font-size: 16px; line-height: 1.8; }
    .otp-box { background: linear-gradient(135deg, ${brandGreenLight}, #f1f8e9); border: 2px solid #4caf50; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .otp-code { font-size: 36px; font-weight: 700; color: ${brandGreen}; letter-spacing: 8px; margin: 10px 0; font-family: monospace; }
    .otp-label { color: #4a5568; font-size: 14px; }
    .reset-box { background: linear-gradient(135deg, #fff3e0, #fce4ec); border: 2px solid #ff9800; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .reset-code { font-size: 36px; font-weight: 700; color: #e65100; letter-spacing: 8px; margin: 10px 0; font-family: monospace; }
    .info-box { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 20px; font-size: 13px; color: #856404; }
    .danger { background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin-top: 20px; font-size: 13px; color: #991b1b; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { background: ${brandGreenGradient}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(26,86,50,0.3); }
    .features { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .features ul { list-style: none; padding: 0; margin: 0; }
    .features li { padding: 8px 0; color: #374151; }
    .features li::before { content: "\\2705 "; }
    .invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .invoice-row:last-child { border-bottom: none; font-weight: 700; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .footer a { color: ${brandGreen}; text-decoration: none; font-weight: 500; }
    .social-links { margin: 12px 0; }
    .social-links a { display: inline-block; margin: 0 8px; color: ${brandGreen}; font-size: 13px; text-decoration: none; }
    @media (max-width: 600px) {
      .container { padding: 20px; }
      .header { padding: 20px; }
      .otp-code, .reset-code { font-size: 28px; letter-spacing: 5px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="${logoUrl}" alt="نشأة" />
      <h1>نشأة</h1>
      <p>منصة إدارة الحضانات والروضات</p>
    </div>
    <div class="container">
    ${content}
    <div class="footer">
      <div class="social-links">
        <a href="https://naashah.com">naashah.com</a>
      </div>
      <p>هذه رسالة آلية من منصة نشأة. لا ترد على هذه الرسالة.</p>
      <p>&copy; ${new Date().getFullYear()} نشأة - جميع الحقوق محفوظة</p>
      <p style="margin-top: 8px; font-size: 11px; color: #d1d5db;">info@naashah.com</p>
    </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Public Email Functions ──────────────────────────────────────────────────

/**
 * Send OTP verification code via email
 */
export async function sendOtpEmail(
  email: string,
  code: string,
  userName?: string
): Promise<EmailSendResult> {
  const name = userName || 'المستخدم';
  const subject = `رمز التحقق - نشأة | ${code}`;

  const content = `
    <p class="message">مرحباً ${name}،</p>
    <p class="message">لقد طلبت رمز تحقق لحسابك في منصة نشأة. استخدم الرمز التالي:</p>
    
    <div class="otp-box">
      <p class="otp-label">رمز التحقق</p>
      <p class="otp-code">${code}</p>
      <p class="otp-label">صالح لمدة 5 دقائق</p>
    </div>
    
    <div class="warning">
      &#9888;&#65039; لا تشارك هذا الرمز مع أي شخص. فريق نشأة لن يطلب منك رمز التحقق أبداً.
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send password reset OTP via email
 */
export async function sendPasswordResetEmail(
  email: string,
  code: string,
  userName?: string
): Promise<EmailSendResult> {
  const name = userName || 'المستخدم';
  const subject = `إعادة تعيين كلمة المرور - نشأة`;

  const content = `
    <p class="message">مرحباً ${name}،</p>
    <p class="message">لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. استخدم الرمز التالي:</p>
    
    <div class="reset-box">
      <p class="otp-label">رمز إعادة تعيين كلمة المرور</p>
      <p class="reset-code">${code}</p>
      <p class="otp-label">صالح لمدة 5 دقائق</p>
    </div>
    
    <div class="danger">
      &#128274; إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة وتأمين حسابك فوراً.
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send account invitation email (when admin creates a new user)
 */
export async function sendInvitationEmail(
  email: string,
  userName: string,
  role: string,
  tempPassword?: string,
  invitedBy?: string
): Promise<EmailSendResult> {
  const subject = `دعوة للانضمام إلى منصة نشأة`;

  const roleNames: Record<string, string> = {
    teacher: 'معلمة',
    parent: 'ولي أمر',
    assistant: 'مساعدة',
    accountant: 'محاسب/ة',
    receptionist: 'موظف/ة استقبال',
    admin: 'مدير/ة',
    principal: 'مدير/ة الحضانة',
  };

  const roleName = roleNames[role] || role;
  const inviterText = invitedBy ? `قام/ت ${invitedBy} بدعوتك` : 'تمت دعوتك';

  const passwordSection = tempPassword ? `
    <div class="info-box">
      <p style="margin: 0 0 10px; font-weight: 600;">بيانات الدخول المؤقتة:</p>
      <p style="margin: 5px 0;">البريد الإلكتروني: <strong>${email}</strong></p>
      <p style="margin: 5px 0;">كلمة المرور المؤقتة: <strong style="font-family: monospace; font-size: 18px; color: #1a5632;">${tempPassword}</strong></p>
      <p style="margin: 10px 0 0; font-size: 13px; color: #6b7280;">يرجى تغيير كلمة المرور بعد أول تسجيل دخول.</p>
    </div>` : '';

  const content = `
    <p class="message">مرحباً ${userName}،</p>
    <p class="message">${inviterText} للانضمام إلى منصة نشأة بصفتك <strong>${roleName}</strong>.</p>
    <p class="message">نشأة هي منصة متكاملة لإدارة الحضانات والروضات تساعدك على متابعة كل ما يخص أطفالك أو عملك بسهولة.</p>
    
    ${passwordSection}
    
    <div class="cta">
      <a href="${APP_URL}/login">تسجيل الدخول الآن</a>
    </div>
    
    <div class="features">
      <p style="font-weight: 600; margin-top: 0;">ما يمكنك فعله في نشأة:</p>
      <ul>
        <li>متابعة حضور وأنشطة الأطفال يومياً</li>
        <li>استلام التقارير اليومية والصور</li>
        <li>التواصل المباشر مع الفريق</li>
        <li>إدارة الفواتير والمدفوعات</li>
        <li>الاطلاع على التقييمات التعليمية</li>
      </ul>
    </div>
    
    <div class="warning">
      &#128161; إذا واجهت أي مشكلة في تسجيل الدخول، تواصل مع إدارة الحضانة للمساعدة.
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string
): Promise<EmailSendResult> {
  const subject = `مرحباً بك في نشأة! 🌳`;

  const content = `
    <p class="message">مرحباً ${userName}! &#128075;</p>
    <p class="message">تم تسجيلك بنجاح في منصة نشأة. نحن سعداء بانضمامك إلينا!</p>
    
    <div class="features">
      <p style="font-weight: 600; margin-top: 0;">يمكنك الآن الاستفادة من:</p>
      <ul>
        <li>متابعة حضور وأنشطة طفلك يومياً</li>
        <li>استلام التقارير اليومية والصور</li>
        <li>التواصل المباشر مع المعلمات</li>
        <li>إدارة الفواتير والمدفوعات</li>
        <li>الاطلاع على التقييمات التعليمية</li>
      </ul>
    </div>
    
    <div class="cta">
      <a href="${APP_URL}/login">تسجيل الدخول الآن</a>
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send welcome email to parent with login credentials after import
 */
export async function sendParentWelcomeWithCredentials(
  email: string,
  parentName: string,
  childName: string,
  loginIdentifier: string,
  defaultPassword: string,
  nurseryName?: string
): Promise<EmailSendResult> {
  const nursery = nurseryName || 'حضانة شجرة التعلم';
  const subject = `مرحباً بك في ${nursery} - بيانات تسجيل الدخول`;

  const content = `
    <p class="message">مرحباً ${parentName}!</p>
    <p class="message">تم تسجيل طفلك <strong>${childName}</strong> بنجاح في ${nursery}. تم إنشاء حسابك على منصة نشأة لمتابعة أنشطة طفلك والتواصل مع الحضانة.</p>
    
    <div class="otp-box" style="text-align: right;">
      <p style="font-weight: 700; font-size: 16px; color: #1a5632; margin-top: 0;">بيانات تسجيل الدخول:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="padding: 10px 0; color: #4a5568; font-size: 14px;">البريد / الجوال:</td>
          <td style="padding: 10px 0; font-weight: 700; color: #1a5632; font-size: 16px; direction: ltr; text-align: left;">${loginIdentifier}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #4a5568; font-size: 14px;">كلمة المرور:</td>
          <td style="padding: 10px 0; font-weight: 700; color: #1a5632; font-size: 16px; direction: ltr; text-align: left;">${defaultPassword}</td>
        </tr>
      </table>
    </div>

    <div class="warning">
      ننصحك بتغيير كلمة المرور بعد أول تسجيل دخول من إعدادات الحساب.
    </div>

    <div class="features">
      <p style="font-weight: 600; margin-top: 0;">يمكنك الآن الاستفادة من:</p>
      <ul>
        <li>متابعة حضور وأنشطة طفلك يومياً</li>
        <li>استلام التقارير اليومية والصور</li>
        <li>التواصل المباشر مع المعلمات</li>
        <li>إدارة الفواتير والمدفوعات</li>
        <li>الاطلاع على التقييمات النمائية</li>
      </ul>
    </div>
    
    <div class="cta">
      <a href="${APP_URL}/login">تسجيل الدخول الآن</a>
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send invoice notification email
 */
export async function sendInvoiceEmail(
  email: string,
  userName: string,
  childName: string,
  amount: number,
  dueDate: string
): Promise<EmailSendResult> {
  const subject = `فاتورة جديدة - نشأة`;

  const content = `
    <p class="message">مرحباً ${userName}،</p>
    <p class="message">تم إصدار فاتورة جديدة لحساب طفلك ${childName}:</p>
    
    <div class="invoice-box">
      <div class="invoice-row"><span>الطفل:</span><span>${childName}</span></div>
      <div class="invoice-row"><span>المبلغ:</span><span>${amount} ر.س</span></div>
      <div class="invoice-row"><span>تاريخ الاستحقاق:</span><span>${dueDate}</span></div>
    </div>
    
    <p class="message">يرجى تسديد الفاتورة قبل تاريخ الاستحقاق. يمكنك الدفع عبر التطبيق أو التحويل البنكي.</p>
    
    <div class="cta">
      <a href="${APP_URL}/parent/invoices">عرض الفاتورة</a>
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send system notification email (announcements, events, etc.)
 */
export async function sendNotificationEmail(
  email: string,
  userName: string,
  title: string,
  body: string,
  actionUrl?: string,
  actionLabel?: string
): Promise<EmailSendResult> {
  const subject = `${title} - نشأة`;

  const actionSection = actionUrl ? `
    <div class="cta">
      <a href="${actionUrl}">${actionLabel || 'عرض التفاصيل'}</a>
    </div>` : '';

  const content = `
    <p class="message">مرحباً ${userName}،</p>
    <p class="message">${body}</p>
    ${actionSection}`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send attendance notification to parent
 */
export async function sendAttendanceEmail(
  email: string,
  parentName: string,
  childName: string,
  type: 'checkin' | 'checkout',
  time: string,
  pickedUpBy?: string
): Promise<EmailSendResult> {
  const isCheckIn = type === 'checkin';
  const subject = isCheckIn
    ? `${childName} وصل/ت إلى الحضانة - نشأة`
    : `${childName} غادر/ت الحضانة - نشأة`;

  const statusText = isCheckIn
    ? `وصل/ت <strong>${childName}</strong> إلى الحضانة بأمان`
    : `غادر/ت <strong>${childName}</strong> الحضانة`;

  const pickedUpSection = pickedUpBy && !isCheckIn
    ? `<p class="message">تم الاستلام بواسطة: <strong>${pickedUpBy}</strong></p>`
    : '';

  const content = `
    <p class="message">مرحباً ${parentName}،</p>
    <p class="message">${statusText} في تمام الساعة <strong>${time}</strong>.</p>
    ${pickedUpSection}
    
    <div class="info-box">
      <p style="margin: 0; text-align: center; font-size: 14px;">
        ${isCheckIn ? '&#128994; تم تسجيل الوصول بنجاح' : '&#128308; تم تسجيل المغادرة بنجاح'}
      </p>
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send daily report notification to parent
 */
export async function sendDailyReportEmail(
  email: string,
  parentName: string,
  childName: string,
  reportSummary: string
): Promise<EmailSendResult> {
  const subject = `التقرير اليومي لـ ${childName} - نشأة`;

  const content = `
    <p class="message">مرحباً ${parentName}،</p>
    <p class="message">تم إعداد التقرير اليومي لطفلك <strong>${childName}</strong>:</p>
    
    <div class="info-box">
      <p style="margin: 0; white-space: pre-line;">${reportSummary}</p>
    </div>
    
    <div class="cta">
      <a href="${APP_URL}/parent/reports">عرض التقرير الكامل</a>
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Check if Email service is properly configured
 */
export function isEmailConfigured(): boolean {
  if (RESEND_API_KEY) return true;
  if (EMAIL_PROVIDER === 'smtp' && SMTP_HOST && SMTP_USER && SMTP_PASS) return true;
  if (EMAIL_PROVIDER === 'sendgrid' && SENDGRID_API_KEY) return true;
  return false;
}

/**
 * Verify SMTP connection (useful for health checks)
 */
export async function verifyEmailConnection(): Promise<{ connected: boolean; error?: string }> {
  const transport = getTransporter();
  if (!transport) {
    return { connected: false, error: 'No transport configured' };
  }

  try {
    await transport.verify();
    return { connected: true };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}


/**
 * Send assessment report email to parents
 */
export async function sendAssessmentReportEmail(
  email: string,
  parentName: string,
  childName: string,
  assessmentTitle: string,
  reportData: Array<{
    questionText: string;
    questionType: string;
    answer: string | null;
    rating: number | null;
    maxRating: number;
    notes: string | null;
  }>,
  additionalNotes?: string
): Promise<EmailSendResult> {
  const subject = `تقرير اختبار "${assessmentTitle}" - ${childName} | نشأة`;

  const questionTypeNames: Record<string, string> = {
    multiple_choice: 'اختيار من متعدد',
    true_false: 'صح / خطأ',
    rating: 'تقييم',
    text: 'نص حر',
  };

  const questionsHtml = reportData.map((q, idx) => {
    let answerDisplay = '';
    if (q.questionType === 'rating' && q.rating !== null) {
      const stars = '★'.repeat(q.rating) + '☆'.repeat(q.maxRating - q.rating);
      answerDisplay = `<span style="color: #f59e0b; font-size: 18px;">${stars}</span> (${q.rating}/${q.maxRating})`;
    } else if (q.answer) {
      answerDisplay = `<strong>${q.answer}</strong>`;
    } else {
      answerDisplay = '<span style="color: #9ca3af;">لم يتم الإجابة</span>';
    }

    const notesHtml = q.notes ? `<p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">ملاحظات: ${q.notes}</p>` : '';

    return `
      <div style="padding: 14px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="background: #e8f5e9; color: #1a5632; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">${idx + 1}</span>
          <span style="font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px;">${questionTypeNames[q.questionType] || q.questionType}</span>
        </div>
        <p style="margin: 6px 0; font-weight: 600;">${q.questionText}</p>
        <p style="margin: 6px 0;">الإجابة: ${answerDisplay}</p>
        ${notesHtml}
      </div>`;
  }).join('');

  // Summary stats
  const answeredCount = reportData.filter(q => q.answer || q.rating).length;
  const ratingQuestions = reportData.filter(q => q.questionType === 'rating' && q.rating !== null);
  const avgRating = ratingQuestions.length > 0
    ? (ratingQuestions.reduce((sum, q) => sum + (q.rating || 0), 0) / ratingQuestions.length).toFixed(1)
    : null;

  const summaryHtml = `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 20px;">
      <p style="font-weight: 600; margin: 0 0 8px;">ملخص التقرير:</p>
      <p style="margin: 4px 0;">عدد الأسئلة: <strong>${reportData.length}</strong></p>
      <p style="margin: 4px 0;">الأسئلة المجابة: <strong>${answeredCount}</strong> من ${reportData.length}</p>
      ${avgRating ? `<p style="margin: 4px 0;">متوسط التقييم: <strong>${avgRating}</strong></p>` : ''}
    </div>`;

  const content = `
    <p class="message">مرحباً ${parentName || 'ولي الأمر'}،</p>
    <p class="message">نود مشاركتكم نتائج اختبار <strong>"${assessmentTitle}"</strong> الخاص بطفلكم <strong>${childName}</strong>.</p>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">📋 اسم الاختبار: ${assessmentTitle}</p>
      <p style="margin: 6px 0 0;">👶 الطفل: ${childName}</p>
      <p style="margin: 6px 0 0;">📅 التاريخ: ${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div style="margin-top: 20px;">
      <h3 style="color: #1a5632; border-bottom: 2px solid #1a5632; padding-bottom: 8px;">تفاصيل الإجابات</h3>
      ${questionsHtml}
    </div>

    ${summaryHtml}

    ${additionalNotes ? `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 20px;">
      <p style="font-weight: 600; margin: 0 0 8px; color: #1e40af;">\u2709\uFE0F ملاحظات وتوصيات المعلمة:</p>
      <p style="margin: 0; white-space: pre-wrap;">${additionalNotes}</p>
    </div>` : ''}

    <div class="cta">
      <a href="${APP_URL}/parent/assessments">عرض جميع التقييمات</a>
    </div>

    <div class="warning">
      💡 يمكنك الاطلاع على جميع تقييمات طفلك من خلال تطبيق نشأة في قسم "التقييمات".
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send detailed invoice email with full breakdown to parent
 */
export async function sendDetailedInvoiceEmail(
  email: string,
  parentName: string,
  invoice: {
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
  }
): Promise<EmailSendResult> {
  const statusLabels: Record<string, string> = {
    pending: 'معلقة',
    paid: 'مدفوعة',
    overdue: 'متأخرة',
    cancelled: 'ملغاة',
    partially_paid: 'مدفوعة جزئياً',
  };
  const paymentMethodLabels: Record<string, string> = {
    cash: 'نقدي',
    bank_transfer: 'تحويل بنكي',
    card: 'بطاقة ائتمانية',
    apple_pay: 'Apple Pay',
    mada: 'مدى',
    stc_pay: 'STC Pay',
  };
  const invoiceTypeLabels: Record<string, string> = {
    tuition: 'رسوم دراسية',
    activity: 'نشاط',
    trip: 'رحلة',
    uniform: 'زي مدرسي',
    registration: 'تسجيل',
    other: 'أخرى',
  };

  const statusText = statusLabels[invoice.status] || invoice.status;
  const statusColor = invoice.status === 'paid' ? '#16a34a' : invoice.status === 'overdue' ? '#dc2626' : '#d97706';
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const createdDate = new Date(invoice.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const subject = `فاتورة ${invoice.invoiceNumber} - ${invoice.childName || ''} | نشأة`;

  const paymentInfo = invoice.paymentMethod ? `
    <div class="invoice-row"><span>طريقة الدفع:</span><span>${paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}</span></div>` : '';

  const paidAtInfo = invoice.paidAt ? `
    <div class="invoice-row"><span>تاريخ الدفع:</span><span>${new Date(invoice.paidAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>` : '';

  const content = `
    <p class="message">مرحباً ${parentName || 'ولي الأمر'}،</p>
    <p class="message">نرفق لكم تفاصيل الفاتورة الخاصة بطفلكم <strong>${invoice.childName || ''}</strong>:</p>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">رقم الفاتورة: ${invoice.invoiceNumber}</p>
      <p style="margin: 6px 0 0;">الطفل: ${invoice.childName || '-'}</p>
      <p style="margin: 6px 0 0;">تاريخ الإصدار: ${createdDate}</p>
      <p style="margin: 6px 0 0;">النوع: ${invoiceTypeLabels[invoice.invoiceType || 'tuition'] || 'رسوم دراسية'}</p>
      <p style="margin: 6px 0 0;">الحالة: <span style="color: ${statusColor}; font-weight: 700;">${statusText}</span></p>
    </div>

    <div class="invoice-box">
      <div class="invoice-row"><span>الوصف:</span><span>${invoice.description || 'خدمات تعليمية'}</span></div>
      <div class="invoice-row"><span>المبلغ قبل الضريبة:</span><span>${Number(invoice.subtotal).toLocaleString('ar-SA')} ر.س</span></div>
      <div class="invoice-row"><span>ضريبة القيمة المضافة (${Number(invoice.vatRate || 15)}%):</span><span>${Number(invoice.vatAmount).toLocaleString('ar-SA')} ر.س</span></div>
      <div class="invoice-row" style="font-size: 18px; color: #1a5632;"><span>الإجمالي المستحق:</span><span><strong>${Number(invoice.total).toLocaleString('ar-SA')} ر.س</strong></span></div>
      <div class="invoice-row"><span>تاريخ الاستحقاق:</span><span>${dueDate}</span></div>
      ${paymentInfo}
      ${paidAtInfo}
    </div>

    ${invoice.status !== 'paid' ? `
    <p class="message">يرجى تسديد الفاتورة قبل تاريخ الاستحقاق. يمكنك الدفع عبر التطبيق.</p>
    <div class="cta">
      <a href="${APP_URL}/parent/finance">دفع الفاتورة الآن</a>
    </div>` : `
    <p class="message" style="color: #16a34a;">تم تسديد هذه الفاتورة بنجاح. شكراً لكم.</p>`}

    <div class="warning">
      هذه فاتورة إلكترونية صادرة من منصة نشأة. يمكنك تحميلها كملف PDF من التطبيق.
    </div>`;

  return sendEmail(email, subject, baseTemplate(content));
}


/**
 * Send new device login alert email
 */
export async function sendNewDeviceLoginAlert(
  email: string,
  userName: string,
  loginInfo: {
    ip: string;
    userAgent: string;
    time: Date;
  }
): Promise<EmailSendResult> {
  const subject = 'تنبيه أمني: تسجيل دخول من جهاز جديد - نشأة';
  const timeStr = loginInfo.time.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Riyadh',
  });
  
  // Parse user agent for readable device info
  const deviceInfo = parseUserAgent(loginInfo.userAgent);
  
  const content = `
    <p class="message">مرحباً ${userName}،</p>
    <p class="message">تم تسجيل دخول جديد إلى حسابك من جهاز لم يُستخدم سابقاً:</p>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #92400e;">الجهاز:</td>
          <td style="padding: 8px 0; color: #78350f;">${deviceInfo}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #92400e;">عنوان IP:</td>
          <td style="padding: 8px 0; color: #78350f;" dir="ltr">${loginInfo.ip}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #92400e;">الوقت:</td>
          <td style="padding: 8px 0; color: #78350f;">${timeStr}</td>
        </tr>
      </table>
    </div>
    <p class="message">إذا كنت أنت من قام بتسجيل الدخول، يمكنك تجاهل هذه الرسالة.</p>
    <p class="message" style="color: #dc2626; font-weight: bold;">إذا لم تكن أنت، يرجى تغيير كلمة المرور فوراً من إعدادات الحساب.</p>`;
  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Parse user agent string into readable device info
 */
function parseUserAgent(ua: string): string {
  if (!ua) return 'جهاز غير معروف';
  
  let device = '';
  let browser = '';
  
  // Detect device/OS
  if (ua.includes('iPhone')) device = 'iPhone';
  else if (ua.includes('iPad')) device = 'iPad';
  else if (ua.includes('Android')) device = 'Android';
  else if (ua.includes('Windows')) device = 'Windows';
  else if (ua.includes('Mac')) device = 'Mac';
  else if (ua.includes('Linux')) device = 'Linux';
  else device = 'جهاز غير معروف';
  
  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else browser = '';
  
  return browser ? `${device} - ${browser}` : device;
}

// ─── Account Deletion & Recovery Emails ──────────────────────────────────────

/**
 * Send account deletion confirmation email with grace period info
 */
export async function sendAccountDeletionEmail(
  email: string,
  userName: string,
  scheduledDate: Date
): Promise<EmailSendResult> {
  const formattedDate = scheduledDate.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = 'تأكيد طلب حذف حسابك - نشأة';
  const content = `
    <div class="message">
      <p>مرحباً ${userName || 'عزيزي المستخدم'}،</p>
      <p>تم استلام طلبك لحذف حسابك على منصة نشأة.</p>
    </div>
    <div class="danger">
      <strong>⚠️ تنبيه مهم:</strong><br/>
      سيتم حذف حسابك نهائياً بتاريخ <strong>${formattedDate}</strong> (بعد 30 يوم من تاريخ الطلب).
    </div>
    <div class="info-box">
      <p><strong>ماذا سيحدث عند الحذف النهائي:</strong></p>
      <ul style="padding-right: 20px; margin: 10px 0;">
        <li>حذف بياناتك الشخصية (الاسم، البريد، رقم الجوال) بشكل نهائي</li>
        <li>بيانات طفلك التعليمية (الحضور، التقارير، التقييمات) ستبقى محفوظة لدى الحضانة</li>
        <li>لن تتمكن من استعادة الحساب بعد انتهاء فترة السماح</li>
      </ul>
    </div>
    <div class="message" style="margin-top: 20px;">
      <p><strong>هل غيرت رأيك؟</strong></p>
      <p>يمكنك استعادة حسابك في أي وقت خلال فترة الـ 30 يوم من خلال صفحة تسجيل الدخول واختيار "استعادة الحساب".</p>
    </div>
    <div class="warning">
      إذا لم تقم أنت بطلب حذف الحساب، يرجى التواصل معنا فوراً على info@naashah.com
    </div>
  `;

  return sendEmail(email, subject, baseTemplate(content));
}

/**
 * Send account recovery confirmation email
 */
export async function sendAccountRecoveryEmail(
  email: string,
  userName: string
): Promise<EmailSendResult> {
  const subject = 'تم استعادة حسابك بنجاح - نشأة';
  const content = `
    <div class="message">
      <p>مرحباً ${userName || 'عزيزي المستخدم'}،</p>
      <p>يسعدنا إبلاغك بأنه تم إلغاء طلب حذف حسابك واستعادته بنجاح.</p>
    </div>
    <div class="info-box">
      <p><strong>✅ حسابك نشط الآن</strong></p>
      <p>يمكنك تسجيل الدخول واستخدام جميع خدمات المنصة كالمعتاد.</p>
    </div>
    <div class="message" style="margin-top: 20px;">
      <p>جميع بياناتك وبيانات أطفالك محفوظة ولم يتم حذف أي شيء.</p>
    </div>
    <div class="warning">
      إذا لم تقم أنت باستعادة الحساب، يرجى تغيير كلمة المرور فوراً والتواصل معنا على info@naashah.com
    </div>
  `;

  return sendEmail(email, subject, baseTemplate(content));
}
