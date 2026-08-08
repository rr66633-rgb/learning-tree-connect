/**
 * Authentication Service
 * Handles OTP generation/verification, password reset, account lockout, and registration
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { otpCodes, passwordResetTokens, loginAttempts, users } from '../../drizzle/schema';
import { getDb as getSharedDb } from '../db';
import { sendOtpSms, sendPasswordResetSms, isSmsConfigured } from '../services/smsService';
import { sendOtpEmail, sendPasswordResetEmail as sendResetEmail, isEmailConfigured } from '../services/emailService';

// Wrapper to maintain the non-null return type expected by this module
async function getDb() {
  const db = await getSharedDb();
  if (!db) throw new Error('Database not available');
  return db;
}

// ============ CONSTANTS ============
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_REQUESTS_PER_10_MIN = 3;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_MINUTES = 30;
const SESSION_TIMEOUT_MINUTES = 30;

// ============ OTP GENERATION ============

/**
 * Generate a secure random 6-digit OTP code
 */
export function generateOtpCode(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(crypto.randomInt(min, max + 1));
}

/**
 * Generate a secure random token for password reset links
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Hash a password in the application's current PBKDF2 format. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Legacy and Excel-imported accounts were stored with bcrypt. Supporting
  // them here restores access without resetting or exposing their passwords.
  if (/^\$2[aby]\$/.test(storedHash)) {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }

  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash || !/^[0-9a-f]{32}$/i.test(salt) || !/^[0-9a-f]{128}$/i.test(hash)) {
    return false;
  }

  try {
    const expected = Buffer.from(hash, 'hex');
    const actual = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function findPasswordMatches<T extends { password: string | null }>(
  password: string,
  candidates: T[],
): Promise<T[]> {
  const results = await Promise.all(
    candidates.map(candidate => candidate.password
      ? verifyPassword(password, candidate.password)
      : Promise.resolve(false)),
  );
  return candidates.filter((_, index) => results[index]);
}

export function needsPasswordRehash(storedHash: string): boolean {
  return /^\$2[aby]\$/.test(storedHash);
}

/** Upgrade a verified legacy hash without treating it as a password change. */
export async function upgradeLegacyPasswordHash(userId: number, password: string): Promise<void> {
  const db = await getDb();
  const hashedPassword = await hashPassword(password);
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));
}

// ============ OTP OPERATIONS ============

/**
 * Check if user can request a new OTP (rate limiting)
 */
export async function canRequestOtp(identifier: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const db = await getDb();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  const recentOtps = await db.select()
    .from(otpCodes)
    .where(
      and(
        sql`(${otpCodes.phone} = ${identifier} OR ${otpCodes.email} = ${identifier})`,
        gt(otpCodes.createdAt, tenMinutesAgo)
      )
    );
  
  if (recentOtps.length >= OTP_MAX_REQUESTS_PER_10_MIN) {
    const oldestRecent = recentOtps[0];
    const waitUntil = new Date(oldestRecent.createdAt.getTime() + 10 * 60 * 1000);
    const waitSeconds = Math.ceil((waitUntil.getTime() - Date.now()) / 1000);
    return { allowed: false, waitSeconds: Math.max(0, waitSeconds) };
  }
  
  // Check cooldown (60 seconds between requests)
  if (recentOtps.length > 0) {
    const lastOtp = recentOtps[recentOtps.length - 1];
    const cooldownEnd = new Date(lastOtp.createdAt.getTime() + OTP_COOLDOWN_SECONDS * 1000);
    if (cooldownEnd > new Date()) {
      const waitSeconds = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
      return { allowed: false, waitSeconds };
    }
  }
  
  return { allowed: true };
}

/**
 * Create and store a new OTP code
 */
export async function createOtp(params: {
  userId?: number;
  phone?: string;
  email?: string;
  type: 'registration' | 'password_reset' | 'login_verification' | 'phone_verification' | 'email_verification';
}): Promise<{ code: string; expiresAt: Date }> {
  const db = await getDb();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  await db.insert(otpCodes).values({
    userId: params.userId || null,
    phone: params.phone || null,
    email: params.email || null,
    code,
    type: params.type,
    expiresAt,
    verified: false,
    attempts: 0,
  });
  
  return { code, expiresAt };
}

/**
 * Verify an OTP code
 */
export async function verifyOtp(params: {
  identifier: string; // phone or email
  code: string;
  type: 'registration' | 'password_reset' | 'login_verification' | 'phone_verification' | 'email_verification';
}): Promise<{ valid: boolean; error?: string; userId?: number }> {
  const db = await getDb();
  const now = new Date();
  
  // Find the latest OTP for this identifier and type
  const otps = await db.select()
    .from(otpCodes)
    .where(
      and(
        sql`(${otpCodes.phone} = ${params.identifier} OR ${otpCodes.email} = ${params.identifier})`,
        eq(otpCodes.type, params.type),
        eq(otpCodes.verified, false),
        gt(otpCodes.expiresAt, now)
      )
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  
  if (otps.length === 0) {
    return { valid: false, error: 'رمز التحقق غير صالح أو منتهي الصلاحية' };
  }
  
  const otp = otps[0];
  
  // Check max attempts
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { valid: false, error: 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد.' };
  }
  
  // Increment attempts
  await db.update(otpCodes)
    .set({ attempts: otp.attempts + 1 })
    .where(eq(otpCodes.id, otp.id));
  
  // Verify code
  if (otp.code !== params.code) {
    return { valid: false, error: 'رمز التحقق غير صحيح' };
  }
  
  // Mark as verified
  await db.update(otpCodes)
    .set({ verified: true })
    .where(eq(otpCodes.id, otp.id));
  
  return { valid: true, userId: otp.userId || undefined };
}

// ============ PASSWORD RESET ============

/**
 * Create a password reset token (for email link)
 */
export async function createPasswordResetToken(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);
  
  // Invalidate previous tokens
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(and(eq(passwordResetTokens.userId, userId), eq(passwordResetTokens.used, false)));
  
  await db.insert(passwordResetTokens).values({
    userId,
    token,
    type: 'email_link',
    expiresAt,
    used: false,
  });
  
  return { token, expiresAt };
}

/**
 * Verify a password reset token
 */
export async function verifyResetToken(token: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
  const db = await getDb();
  const now = new Date();
  
  const tokens = await db.select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);
  
  if (tokens.length === 0) {
    return { valid: false, error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' };
  }
  
  return { valid: true, userId: tokens[0].userId };
}

/**
 * Mark a reset token as used
 */
export async function markTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.token, token));
}

// ============ ACCOUNT LOCKOUT ============

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(params: {
  userId?: number;
  identifier: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
}): Promise<void> {
  const db = await getDb();
  await db.insert(loginAttempts).values({
    userId: params.userId || null,
    identifier: params.identifier,
    ip: params.ip || null,
    userAgent: params.userAgent || null,
    success: params.success,
    reason: params.reason || null,
  });
}

/**
 * Check if an account is locked
 */
export async function isAccountLocked(userId: number): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const db = await getDb();
  const userResults = await db.select({
    accountLockedUntil: users.accountLockedUntil,
    failedLoginAttempts: users.failedLoginAttempts,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (userResults.length === 0) return { locked: false };
  
  const user = userResults[0];
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    return { locked: true, lockedUntil: user.accountLockedUntil };
  }
  
  return { locked: false };
}

/**
 * Increment failed login attempts and potentially lock account
 */
export async function handleFailedLogin(userId: number): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const db = await getDb();
  const userResults = await db.select({
    failedLoginAttempts: users.failedLoginAttempts,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (userResults.length === 0) return { locked: false, attemptsRemaining: MAX_FAILED_LOGIN_ATTEMPTS };
  
  const newAttempts = (userResults[0].failedLoginAttempts || 0) + 1;
  
  if (newAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    // Lock the account
    const lockedUntil = new Date(Date.now() + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000);
    await db.update(users)
      .set({ failedLoginAttempts: newAttempts, accountLockedUntil: lockedUntil })
      .where(eq(users.id, userId));
    return { locked: true, attemptsRemaining: 0 };
  }
  
  await db.update(users)
    .set({ failedLoginAttempts: newAttempts })
    .where(eq(users.id, userId));
  
  return { locked: false, attemptsRemaining: MAX_FAILED_LOGIN_ATTEMPTS - newAttempts };
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedAttempts(userId: number): Promise<void> {
  const db = await getDb();
  await db.update(users)
    .set({ failedLoginAttempts: 0, accountLockedUntil: null, lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Update user password
 */
export async function updatePassword(userId: number, newPassword: string): Promise<void> {
  const db = await getDb();
  const hashedPassword = await hashPassword(newPassword);
  await db.update(users)
    .set({ password: hashedPassword, passwordChangedAt: new Date(), failedLoginAttempts: 0, accountLockedUntil: null })
    .where(eq(users.id, userId));
}

// ============ SMS / EMAIL SENDING (Twilio + SendGrid) ============

/**
 * Send OTP via SMS using Twilio
 * Falls back to console logging if Twilio is not configured
 */
export async function sendSmsOtp(phone: string, code: string): Promise<{ sent: boolean; message: string }> {
  console.log(`[SMS OTP] Attempting to send code to ${phone} (configured: ${isSmsConfigured()})`);
  
  const result = await sendOtpSms(phone, code);
  
  if (!result.sent && isSmsConfigured()) {
    // If SMS failed but was configured, log the error but still return the code for debugging
    console.error(`[SMS OTP] Failed to send to ${phone}: ${result.error}`);
    return { sent: false, message: 'فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.' };
  }
  
  return { sent: true, message: 'تم إرسال رمز التحقق إلى رقم الجوال' };
}

/**
 * Send OTP via Email using SendGrid
 * Falls back to console logging if SendGrid is not configured
 */
export async function sendEmailOtp(email: string, code: string, userName?: string): Promise<{ sent: boolean; message: string }> {
  console.log(`[EMAIL OTP] Attempting to send code to ${email} (configured: ${isEmailConfigured()})`);
  
  const result = await sendOtpEmail(email, code, userName);
  
  if (!result.sent && isEmailConfigured()) {
    console.error(`[EMAIL OTP] Failed to send to ${email}: ${result.error}`);
    return { sent: false, message: 'فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.' };
  }
  
  return { sent: true, message: 'تم إرسال رمز التحقق إلى البريد الإلكتروني' };
}

/**
 * Send password reset OTP via email
 */
export async function sendPasswordResetEmail(email: string, resetCodeOrLink: string, userName?: string): Promise<{ sent: boolean; message: string }> {
  console.log(`[PASSWORD RESET] Attempting to send reset code to ${email} (configured: ${isEmailConfigured()})`);
  
  const result = await sendResetEmail(email, resetCodeOrLink, userName);
  
  if (!result.sent && isEmailConfigured()) {
    console.error(`[PASSWORD RESET] Failed to send to ${email}: ${result.error}`);
    return { sent: false, message: 'فشل في إرسال رمز إعادة التعيين. يرجى المحاولة مرة أخرى.' };
  }
  
  return { sent: true, message: 'تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' };
}

// ============ EXPORTS ============
export const AUTH_CONSTANTS = {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_COOLDOWN_SECONDS,
  OTP_MAX_REQUESTS_PER_10_MIN,
  PASSWORD_RESET_EXPIRY_HOURS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  ACCOUNT_LOCKOUT_MINUTES,
  SESSION_TIMEOUT_MINUTES,
};
