/**
 * Email Service - SendGrid (Twilio Email) Integration
 * Handles sending transactional emails (OTP codes, notifications, receipts)
 */

import sgMail from '@sendgrid/mail';

// Environment variables for SendGrid configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@naashah.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'نشأة - Naashah';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailSendResult {
  sent: boolean;
  message: string;
  error?: string;
}

/**
 * Send an email via SendGrid
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<EmailSendResult> {
  if (!EMAIL_ENABLED || !SENDGRID_API_KEY) {
    console.log(`[Email Service - DISABLED] Would send to ${to}: ${subject}`);
    return {
      sent: true,
      message: 'Email service disabled - message logged',
    };
  }

  try {
    await sgMail.send({
      to,
      from: {
        email: EMAIL_FROM,
        name: EMAIL_FROM_NAME,
      },
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    });

    console.log(`[Email Service] Email sent successfully to ${to}: ${subject}`);
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

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; direction: rtl; background-color: #f8fafb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #1a5632; font-size: 28px; margin: 0; }
    .logo p { color: #6b7280; font-size: 14px; margin: 5px 0 0; }
    .otp-box { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border: 2px solid #4caf50; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .otp-code { font-size: 36px; font-weight: 700; color: #1a5632; letter-spacing: 8px; margin: 10px 0; font-family: monospace; }
    .otp-label { color: #4a5568; font-size: 14px; }
    .message { color: #374151; font-size: 16px; line-height: 1.8; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 20px; font-size: 13px; color: #856404; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🌳 نشأة</h1>
      <p>منصة إدارة الحضانات والروضات</p>
    </div>
    
    <p class="message">مرحباً ${name}،</p>
    <p class="message">لقد طلبت رمز تحقق لحسابك في منصة نشأة. استخدم الرمز التالي:</p>
    
    <div class="otp-box">
      <p class="otp-label">رمز التحقق</p>
      <p class="otp-code">${code}</p>
      <p class="otp-label">صالح لمدة 5 دقائق</p>
    </div>
    
    <div class="warning">
      ⚠️ لا تشارك هذا الرمز مع أي شخص. فريق نشأة لن يطلب منك رمز التحقق أبداً.
    </div>
    
    <div class="footer">
      <p>هذه رسالة آلية من منصة نشأة. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
      <p>© ${new Date().getFullYear()} نشأة - جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, subject, htmlContent);
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

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; direction: rtl; background-color: #f8fafb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #1a5632; font-size: 28px; margin: 0; }
    .logo p { color: #6b7280; font-size: 14px; margin: 5px 0 0; }
    .otp-box { background: linear-gradient(135deg, #fff3e0, #fce4ec); border: 2px solid #ff9800; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .otp-code { font-size: 36px; font-weight: 700; color: #e65100; letter-spacing: 8px; margin: 10px 0; font-family: monospace; }
    .otp-label { color: #4a5568; font-size: 14px; }
    .message { color: #374151; font-size: 16px; line-height: 1.8; }
    .warning { background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin-top: 20px; font-size: 13px; color: #991b1b; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🌳 نشأة</h1>
      <p>منصة إدارة الحضانات والروضات</p>
    </div>
    
    <p class="message">مرحباً ${name}،</p>
    <p class="message">لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. استخدم الرمز التالي:</p>
    
    <div class="otp-box">
      <p class="otp-label">رمز إعادة تعيين كلمة المرور</p>
      <p class="otp-code">${code}</p>
      <p class="otp-label">صالح لمدة 5 دقائق</p>
    </div>
    
    <div class="warning">
      🔒 إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة وتأمين حسابك فوراً.
    </div>
    
    <div class="footer">
      <p>هذه رسالة آلية من منصة نشأة. لا ترد على هذه الرسالة.</p>
      <p>© ${new Date().getFullYear()} نشأة - جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, subject, htmlContent);
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string
): Promise<EmailSendResult> {
  const subject = `مرحباً بك في نشأة! 🌳`;

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; direction: rtl; background-color: #f8fafb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #1a5632; font-size: 28px; margin: 0; }
    .message { color: #374151; font-size: 16px; line-height: 1.8; }
    .features { background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .features ul { list-style: none; padding: 0; }
    .features li { padding: 8px 0; color: #374151; }
    .features li::before { content: "✅ "; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { background: #1a5632; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🌳 نشأة</h1>
    </div>
    
    <p class="message">مرحباً ${userName}! 👋</p>
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
      <a href="https://naashah.com/login">تسجيل الدخول الآن</a>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} نشأة - جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, subject, htmlContent);
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

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; direction: rtl; background-color: #f8fafb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #1a5632; font-size: 28px; margin: 0; }
    .message { color: #374151; font-size: 16px; line-height: 1.8; }
    .invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .invoice-row:last-child { border-bottom: none; font-weight: 700; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🌳 نشأة</h1>
    </div>
    
    <p class="message">مرحباً ${userName}،</p>
    <p class="message">تم إصدار فاتورة جديدة لحساب طفلك ${childName}:</p>
    
    <div class="invoice-box">
      <div class="invoice-row"><span>الطفل:</span><span>${childName}</span></div>
      <div class="invoice-row"><span>المبلغ:</span><span>${amount} ر.س</span></div>
      <div class="invoice-row"><span>تاريخ الاستحقاق:</span><span>${dueDate}</span></div>
    </div>
    
    <p class="message">يرجى تسديد الفاتورة قبل تاريخ الاستحقاق. يمكنك الدفع عبر التطبيق أو التحويل البنكي.</p>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} نشأة - جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail(email, subject, htmlContent);
}

/**
 * Check if Email service is properly configured
 */
export function isEmailConfigured(): boolean {
  return EMAIL_ENABLED && !!SENDGRID_API_KEY;
}
