/**
 * SMS Service - Twilio Verify Integration
 * Uses Twilio Verify API for OTP delivery (no phone number needed)
 * Falls back to direct SMS if TWILIO_PHONE_NUMBER is configured
 */
import twilio from 'twilio';

// Environment variables for Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || '';
const SMS_ENABLED = process.env.SMS_ENABLED === 'true' || !!TWILIO_VERIFY_SERVICE_SID;

// Initialize Twilio client (lazy initialization)
let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[SMS Service] Twilio credentials not configured');
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Format phone number to E.164 format for Saudi Arabia
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('05')) {
    cleaned = '+966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '+966' + cleaned;
  } else if (cleaned.startsWith('966')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export interface SmsSendResult {
  sent: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

/**
 * Send OTP via Twilio Verify (preferred - no phone number needed)
 */
export async function sendOtpViaVerify(phone: string): Promise<SmsSendResult> {
  const client = getClient();
  if (!client || !TWILIO_VERIFY_SERVICE_SID) {
    console.log(`[SMS Service - DISABLED] Would send OTP to ${phone}`);
    return { sent: false, message: 'خدمة الرسائل غير مفعّلة حالياً' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  try {
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: formattedPhone, channel: 'sms' });

    console.log(`[SMS Service] Verify OTP sent: ${verification.sid} to ${formattedPhone}`);
    return {
      sent: true,
      message: 'تم إرسال رمز التحقق بنجاح',
      messageId: verification.sid,
    };
  } catch (error: any) {
    console.error(`[SMS Service] Failed to send Verify OTP to ${formattedPhone}:`, error.message);
    return {
      sent: false,
      message: 'فشل في إرسال رمز التحقق',
      error: error.message,
    };
  }
}

/**
 * Verify OTP code via Twilio Verify
 */
export async function verifyOtpCode(phone: string, code: string): Promise<{ valid: boolean; message: string }> {
  const client = getClient();
  if (!client || !TWILIO_VERIFY_SERVICE_SID) {
    return { valid: false, message: 'خدمة التحقق غير مفعّلة' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  try {
    const verificationCheck = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code });

    if (verificationCheck.status === 'approved') {
      return { valid: true, message: 'تم التحقق بنجاح' };
    }
    return { valid: false, message: 'رمز التحقق غير صحيح' };
  } catch (error: any) {
    console.error(`[SMS Service] Verify check failed for ${formattedPhone}:`, error.message);
    return { valid: false, message: 'فشل في التحقق من الرمز' };
  }
}

/**
 * Send an SMS message via Twilio (direct - requires TWILIO_PHONE_NUMBER)
 */
export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  const client = getClient();
  if (!client) {
    console.log(`[SMS Service - DISABLED] Would send to ${to}: ${body}`);
    return { sent: true, message: 'SMS service disabled - message logged' };
  }

  const formattedPhone = formatPhoneNumber(to);

  // If no phone number, try using Verify for OTP-like messages
  if (!TWILIO_PHONE_NUMBER) {
    console.log(`[SMS Service] No TWILIO_PHONE_NUMBER - using Verify API`);
    return sendOtpViaVerify(to);
  }

  try {
    const message = await client.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    console.log(`[SMS Service] Message sent: ${message.sid} to ${formattedPhone}`);
    return { sent: true, message: 'تم إرسال الرسالة بنجاح', messageId: message.sid };
  } catch (error: any) {
    console.error(`[SMS Service] Failed to send SMS to ${formattedPhone}:`, error.message);
    return { sent: false, message: 'فشل في إرسال الرسالة القصيرة', error: error.message };
  }
}

/**
 * Send OTP code via SMS (uses Verify if available, falls back to direct SMS)
 */
export async function sendOtpSms(phone: string, code: string): Promise<SmsSendResult> {
  // Prefer Twilio Verify (no phone number needed)
  if (TWILIO_VERIFY_SERVICE_SID) {
    return sendOtpViaVerify(phone);
  }
  // Fallback to direct SMS
  const body = `رمز التحقق الخاص بك في نشأة هو: ${code}\nصالح لمدة 5 دقائق.\nلا تشارك هذا الرمز مع أي شخص.`;
  return sendSms(phone, body);
}

/**
 * Send password reset OTP via SMS
 */
export async function sendPasswordResetSms(phone: string, code: string): Promise<SmsSendResult> {
  if (TWILIO_VERIFY_SERVICE_SID) {
    return sendOtpViaVerify(phone);
  }
  const body = `رمز إعادة تعيين كلمة المرور في نشأة: ${code}\nصالح لمدة 5 دقائق.\nإذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.`;
  return sendSms(phone, body);
}

/**
 * Send pickup notification to parent
 */
export async function sendPickupNotificationSms(phone: string, childName: string): Promise<SmsSendResult> {
  const body = `تنبيه من نشأة: تم تسليم ${childName} بنجاح. شكراً لثقتكم بنا! 🌳`;
  return sendSms(phone, body);
}

/**
 * Send welcome SMS after registration
 */
export async function sendWelcomeSms(phone: string, name: string): Promise<SmsSendResult> {
  const body = `مرحباً ${name}! 🌳\nتم تسجيلك بنجاح في منصة نشأة.`;
  return sendSms(phone, body);
}

/**
 * Check if SMS service is properly configured
 */
export function isSmsConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_VERIFY_SERVICE_SID || TWILIO_PHONE_NUMBER));
}
