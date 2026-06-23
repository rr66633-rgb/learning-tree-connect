/**
 * SMS Service - Twilio Integration
 * Handles sending SMS messages (OTP codes, notifications) via Twilio
 */

import twilio from 'twilio';

// Environment variables for Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';

// Initialize Twilio client (lazy initialization)
let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (!SMS_ENABLED) return null;
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
 * Handles: 05xxxxxxxx, +9665xxxxxxxx, 9665xxxxxxxx
 */
function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If starts with 05, replace with +9665
  if (cleaned.startsWith('05')) {
    cleaned = '+966' + cleaned.substring(1);
  }
  // If starts with 5 and is 9 digits, add +966
  else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '+966' + cleaned;
  }
  // If starts with 966, add +
  else if (cleaned.startsWith('966')) {
    cleaned = '+' + cleaned;
  }
  // If doesn't start with +, add it
  else if (!cleaned.startsWith('+')) {
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
 * Send an SMS message via Twilio
 */
export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  const client = getClient();
  
  if (!client) {
    // Fallback: log to console when SMS is not enabled
    console.log(`[SMS Service - DISABLED] Would send to ${to}: ${body}`);
    return {
      sent: true,
      message: 'SMS service disabled - message logged',
    };
  }

  const formattedPhone = formatPhoneNumber(to);

  try {
    const message = await client.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(`[SMS Service] Message sent successfully: ${message.sid} to ${formattedPhone}`);
    return {
      sent: true,
      message: 'تم إرسال الرسالة بنجاح',
      messageId: message.sid,
    };
  } catch (error: any) {
    console.error(`[SMS Service] Failed to send SMS to ${formattedPhone}:`, error.message);
    return {
      sent: false,
      message: 'فشل في إرسال الرسالة القصيرة',
      error: error.message,
    };
  }
}

/**
 * Send OTP code via SMS
 */
export async function sendOtpSms(phone: string, code: string): Promise<SmsSendResult> {
  const body = `رمز التحقق الخاص بك في نشأة هو: ${code}\nصالح لمدة 5 دقائق.\nلا تشارك هذا الرمز مع أي شخص.`;
  return sendSms(phone, body);
}

/**
 * Send welcome SMS after registration
 */
export async function sendWelcomeSms(phone: string, name: string): Promise<SmsSendResult> {
  const body = `مرحباً ${name}! 🌳\nتم تسجيلك بنجاح في منصة نشأة.\nيمكنك الآن تسجيل الدخول والاستفادة من جميع خدماتنا.`;
  return sendSms(phone, body);
}

/**
 * Send password reset OTP via SMS
 */
export async function sendPasswordResetSms(phone: string, code: string): Promise<SmsSendResult> {
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
 * Check if SMS service is properly configured
 */
export function isSmsConfigured(): boolean {
  return SMS_ENABLED && !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_PHONE_NUMBER;
}
