import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, tenantProcedure, superAdminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getDb as getSharedDb } from "./db";
import * as authService from "./_core/authService";
import { loginAttempts, integrationConfig, organizations } from "../drizzle/schema";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { organizationMembers, users } from "../drizzle/schema";
import { sendNewDeviceLoginAlert } from "./services/emailService";
import { aiRouter } from "./aiRouter";
import { weeklyPlanRouter } from "./weeklyPlanRouter";
import { calendarRouter } from "./calendarRouter";
import { aiMarketingRouter } from "./aiMarketingRouter";
import { superAdminRouter } from "./superAdminRouter";
import { brandingRouter } from "./brandingRouter";
import { onboardingRouter } from "./onboardingRouter";
import { developmentRouter } from "./developmentRouter";
import { engagementRouter } from "./engagementRouter";
import { registrationRouter } from "./registrationRouter";
import { staffManagementRouter } from "./staffManagementRouter";
import { bulkImportRouter } from "./bulkImportRouter";
import { capiRouter } from "./capiRouter";
import { assessmentRouter } from "./assessmentRouter";
import { curriculumRouter } from "./curriculumRouter";
import { customAssessmentRouter } from "./customAssessmentRouter";
import { subscriptionPaymentRouter } from "./subscriptionPaymentRouter";
import { storeRouter } from "./storeRouter";
import { demoRouter } from "./demoRouter";
import { payrollRouter } from "./payrollRouter";
import { evaluationRouter } from "./evaluationRouter";
import { goalsRouter } from "./goalsRouter";
import { visitorAssistantRouter } from "./visitorAssistantRouter";
import { paymentSettingsRouter } from "./paymentSettingsRouter";
import { normalizeEmail } from "./emailIdentity";
import {
  createDirectMediaUpload,
  getStorageKey,
  storageDelete,
  storageGetSignedUrl,
  verifyDirectMediaUpload,
} from "./storage";

// SECURITY FIX (C2): these three procedures now build on `tenantProcedure` instead
// of `protectedProcedure` directly, so every endpoint below that uses one of them
// (the large majority of this file's business endpoints) is guaranteed a real,
// non-null `ctx.organizationId` before its handler runs -- closing the gap where a
// user with no organization on their account would previously fall through to
// `ctx.user?.organizationId ?? undefined` (skipping tenant filtering entirely) or
// `?? 1` (silently attributed to organization #1) at various call sites below.
const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
  const allowedRoles = ['super_admin', 'admin', 'principal', 'owner'];
  if (!allowedRoles.includes(ctx.user?.role ?? '')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  return next({ ctx });
});

const teacherProcedure = tenantProcedure.use(({ ctx, next }) => {
  const allowedRoles = ['super_admin', 'admin', 'principal', 'owner', 'teacher', 'assistant'];
  if (!allowedRoles.includes(ctx.user?.role ?? '')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Teacher access required' });
  return next({ ctx });
});

const parentProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (ctx.user.role === 'parent' && !ctx.user.isActive) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'حسابك قيد المراجعة. يرجى انتظار موافقة الإدارة.' });
  }
  return next({ ctx });
});

async function withDirectMediaUrls<T extends {
  url: string;
  fileKey?: string | null;
  thumbnailUrl?: string | null;
}>(items: T[]): Promise<T[]> {
  return Promise.all(items.map(async item => {
    try {
      const fileKey = getStorageKey(item.url, item.fileKey);
      const thumbnailKey = item.thumbnailUrl
        ? getStorageKey(item.thumbnailUrl)
        : null;

      return {
        ...item,
        url: fileKey ? await storageGetSignedUrl(fileKey, 6 * 60 * 60) : item.url,
        thumbnailUrl: thumbnailKey
          ? await storageGetSignedUrl(thumbnailKey, 6 * 60 * 60)
          : item.thumbnailUrl,
      } as T;
    } catch (error) {
      console.error("[Media] Failed to sign a direct view URL:", error);
      return item;
    }
  }));
}

// Haversine formula for GPS distance calculation
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Performance: In-memory cache for dashboard stats (30s TTL per org)
const _dashboardStatsCache: Record<string, { data: any; time: number }> = {};

export const appRouter = router({
  system: systemRouter,
  visitorAssistant: visitorAssistantRouter,
  
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { password, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ============ MY ORGANIZATIONS (for multi-org owners) ============
    myOrganizations: protectedProcedure.query(async ({ ctx }) => {
      const db = (await getSharedDb())!;
      // Find all organizations where this user is a member (via organizationMembers table)
      const memberships = await db
        .select({
          organizationId: organizationMembers.organizationId,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, ctx.user!.id),
            eq(organizationMembers.isActive, true)
          )
        );

      // Also include the user's primary organization
      const orgIds = Array.from(new Set([
        ctx.user!.organizationId,
        ...memberships.map(m => m.organizationId),
      ]));

      if (orgIds.length === 0) return [];

      const orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          nameAr: organizations.nameAr,
          logoUrl: organizations.logoUrl,
          city: organizations.city,
          status: organizations.status,
        })
        .from(organizations)
        .where(inArray(organizations.id, orgIds));

      // Attach role to each org
      return orgs.map(org => {
        const membership = memberships.find(m => m.organizationId === org.id);
        return {
          ...org,
          role: membership?.role || ctx.user!.role,
        };
      });
    }),

    // ============ SWITCH ORGANIZATION ============
    switchOrganization: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = (await getSharedDb())!;

        // Verify user has access to this organization
        const [membership] = await db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, ctx.user!.id),
              eq(organizationMembers.organizationId, input.organizationId),
              eq(organizationMembers.isActive, true)
            )
          );

        // Also allow if it's their primary org
        if (!membership && ctx.user!.organizationId !== input.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية الوصول لهذه المنظمة" });
        }

        // Update user's current organizationId
        await db
          .update(users)
          .set({ organizationId: input.organizationId })
          .where(eq(users.id, ctx.user!.id));

        // Re-issue session token with updated user
        const sessionToken = await sdk.createSessionToken(ctx.user!.openId, {
          name: ctx.user!.name || '',
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, organizationId: input.organizationId };
      }),

    // ============ LOGIN WITH PASSWORD ============
    login: publicProcedure
      .input(z.object({
        identifier: z.string().min(1), // email or phone
        password: z.string().min(1),
        accountId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const ip = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket.remoteAddress || '';
        
        // Legacy production data can contain the same email/phone on more
        // than one account. Verify credentials against all candidates before
        // choosing an account; selecting the first row here caused valid old
        // users to be rejected and incremented failures on the wrong account.
        const candidates = await db.findUsersByIdentifier(input.identifier);
        if (candidates.length === 0) {
          await authService.recordLoginAttempt({ identifier: input.identifier, ip, success: false, reason: 'user_not_found' });
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
        }

        const candidatesToVerify = input.accountId
          ? candidates.filter(candidate => candidate.id === input.accountId)
          : candidates;
        if (candidatesToVerify.length === 0) {
          await authService.recordLoginAttempt({ identifier: input.identifier, ip, success: false, reason: 'invalid_account_selection' });
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
        }

        const passwordCandidates = candidatesToVerify.filter(candidate => Boolean(candidate.password));
        if (passwordCandidates.length === 0) {
          await authService.recordLoginAttempt({ identifier: input.identifier, ip, success: false, reason: 'password_not_set' });
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'لم يتم تعيين كلمة مرور لهذا الحساب. استخدم رمز التحقق أو تواصل مع الإدارة.' });
        }

        const matchingUsers = await authService.findPasswordMatches(input.password, passwordCandidates);
        if (matchingUsers.length === 0) {
          // Only increment a per-account lockout counter when the identifier
          // maps unambiguously to one password account. Otherwise an attacker
          // could lock several tenants' users through one shared identifier.
          const failureTarget = passwordCandidates.length === 1 ? passwordCandidates[0] : undefined;
          if (failureTarget) {
            const result = await authService.handleFailedLogin(failureTarget.id);
            await authService.recordLoginAttempt({ userId: failureTarget.id, identifier: input.identifier, ip, success: false, reason: 'wrong_password' });
            if (result.locked) {
              throw new TRPCError({ code: 'FORBIDDEN', message: `تم قفل الحساب بعد ${authService.AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS} محاولات فاشلة. يرجى المحاولة بعد ${authService.AUTH_CONSTANTS.ACCOUNT_LOCKOUT_MINUTES} دقيقة.` });
            }
            throw new TRPCError({ code: 'UNAUTHORIZED', message: `بيانات الدخول غير صحيحة. المحاولات المتبقية: ${result.attemptsRemaining}` });
          }

          await authService.recordLoginAttempt({ identifier: input.identifier, ip, success: false, reason: 'wrong_password_shared_identifier' });
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
        }

        if (!input.accountId && matchingUsers.length > 1) {
          const accounts = await Promise.all(matchingUsers.map(async candidate => {
            const organization = await db.getOrganizationById(candidate.organizationId);
            return {
              accountId: candidate.id,
              displayName: candidate.name || '',
              role: candidate.role,
              organizationName: organization?.nameAr || organization?.name || 'الحضانة',
            };
          }));
          return {
            success: false as const,
            requiresAccountSelection: true as const,
            accounts,
          };
        }

        const now = new Date();
        const user = matchingUsers.find(candidate =>
          candidate.isActive && (!candidate.accountLockedUntil || candidate.accountLockedUntil <= now),
        ) || matchingUsers[0];

        // Check if account is locked
        const lockStatus = await authService.isAccountLocked(user.id);
        if (lockStatus.locked) {
          const remainingMinutes = Math.ceil((lockStatus.lockedUntil!.getTime() - Date.now()) / 60000);
          throw new TRPCError({ code: 'FORBIDDEN', message: `تم قفل الحساب مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة.` });
        }

        // Check if account is active
        if (!user.isActive) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'حسابك غير مفعل. يرجى التواصل مع الإدارة.' });
        }

        // Successful login - reset failed attempts
        const userAgent = ctx.req.headers['user-agent'] || '';
        await authService.resetFailedAttempts(user.id);
        await authService.recordLoginAttempt({ userId: user.id, identifier: input.identifier, ip, userAgent, success: true });

        if (user.password && authService.needsPasswordRehash(user.password)) {
          try {
            await authService.upgradeLegacyPasswordHash(user.id, input.password);
          } catch (error) {
            console.error('[Auth] Failed to upgrade legacy password hash:', error);
          }
        }

        // Check if this is a new device (IP + userAgent combination not seen before)
        try {
          const dbInstance = await getSharedDb();
          if (dbInstance && user.email) {
            const previousLogins = await dbInstance.select()
              .from(loginAttempts)
              .where(and(
                eq(loginAttempts.userId, user.id),
                eq(loginAttempts.success, true)
              ))
              .orderBy(desc(loginAttempts.createdAt))
              .limit(50);
            // Check if this IP+UA combo was seen before (excluding the one we just inserted)
            const isNewDevice = !previousLogins.some(l => 
              l.ip === ip && l.userAgent === userAgent && l.id !== undefined
            ) || previousLogins.length <= 1;
            if (isNewDevice && previousLogins.length > 1) {
              // Send new device alert email (non-blocking)
              sendNewDeviceLoginAlert(user.email, user.name || '', { ip, userAgent, time: new Date() }).catch(() => {});
            }
          }
        } catch (e) {
          // Non-critical - don't block login
          console.error('[Auth] New device check failed:', e);
        }

        // Set session cookie
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, role: user.role, email: user.email } };
      }),

    // ============ REGISTER (Parent Self-Registration) ============
    // SECURITY FIX: previously took no organization identifier at all --
    // createUserWithPassword never set organizationId, and users.organizationId
    // used to default to 1 at the schema level, so every publicly
    // self-registered parent account was silently created as a member of
    // organization #1 regardless of which nursery they actually intended to
    // join. Registration now requires `orgSlug` (the same public,
    // opaque-identifier pattern used by the waiting-list public form), which
    // is resolved server-side to a real, active organization -- never
    // trusted as a raw id -- and rejected if it doesn't match one.
    register: publicProcedure
      .input(z.object({
        orgSlug: z.string().min(1, "رابط التسجيل غير صحيح"),
        name: z.string().min(2),
        phone: z.string().min(9),
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const org = await db.getOrganizationBySlug(input.orgSlug);
        if (!org || org.status === 'suspended') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'رابط التسجيل غير صحيح أو الحضانة غير متاحة حالياً' });
        }

        // Check if email or phone already exists
        const existingByEmail = await db.findUserByIdentifier(input.email);
        if (existingByEmail) {
          throw new TRPCError({ code: 'CONFLICT', message: 'البريد الإلكتروني مسجل مسبقاً' });
        }
        const existingByPhone = await db.findUserByIdentifier(input.phone);
        if (existingByPhone) {
          throw new TRPCError({ code: 'CONFLICT', message: 'رقم الجوال مسجل مسبقاً' });
        }

        // Hash password
        const hashedPassword = await authService.hashPassword(input.password);

        // Create user (inactive until OTP verification)
        const userId = await db.createUserWithPassword({
          name: input.name,
          phone: input.phone,
          email: input.email,
          password: hashedPassword,
          role: 'parent',
          isActive: false,
          organizationId: org.id,
        });

        // Generate and send OTP
        const { code, expiresAt } = await authService.createOtp({
          userId,
          phone: input.phone,
          email: input.email,
          type: 'registration',
        });

        // Send OTP via Email (primary) with SMS as optional fallback
        if (input.email) {
          await authService.sendEmailOtp(input.email, code, input.name);
        } else {
          await authService.sendSmsOtp(input.phone, code);
        }

        return {
          success: true,
          message: input.email ? 'تم إنشاء الحساب. يرجى إدخال رمز التحقق المرسل إلى بريدك الإلكتروني.' : 'تم إنشاء الحساب. يرجى إدخال رمز التحقق.',
          userId,
          expiresAt: expiresAt.getTime(),
        };
      }),

    // ============ VERIFY REGISTRATION OTP ============
    verifyRegistration: publicProcedure
      .input(z.object({
        identifier: z.string().min(1), // phone or email
        code: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const result = await authService.verifyOtp({
          identifier: input.identifier,
          code: input.code,
          type: 'registration',
        });

        if (!result.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'رمز التحقق غير صحيح' });
        }

        // Activate the user account
        if (result.userId) {
          await db.activateUser(result.userId);
          // Send welcome email (fire-and-forget)
          try {
            const user = await db.getUserById(result.userId);
            if (user?.email) {
              const { sendWelcomeEmail } = await import("./services/emailService");
              sendWelcomeEmail(user.email, user.name || "المستخدم")
                .catch(err => console.error("[Email] Welcome email failed:", err.message));
            }
          } catch (e) { /* non-blocking */ }
        }

        return { success: true, message: 'تم تفعيل حسابك بنجاح. يمكنك الآن تسجيل الدخول.' };
      }),

    // ============ FORGOT PASSWORD - REQUEST RESET ============
    forgotPassword: publicProcedure
      .input(z.object({
        identifier: z.string().min(1), // email or phone
        method: z.enum(['email', 'sms']).default('email'),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.findUserByIdentifier(input.identifier);
        if (!user) {
          // Don't reveal whether user exists
          return { success: true, message: 'إذا كان الحساب موجوداً، سيتم إرسال رمز التحقق.' };
        }

        // Rate limit check
        const canRequest = await authService.canRequestOtp(input.identifier);
        if (!canRequest.allowed) {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: `يرجى الانتظار ${canRequest.waitSeconds} ثانية قبل طلب رمز جديد.` });
        }

        // Respect user's chosen method
        if (input.method === 'sms') {
          // Send OTP via SMS
          const userPhone = user.phone || (!input.identifier.includes('@') ? input.identifier : null);
          if (!userPhone) {
            // User chose SMS but has no phone - fall back to email
            const userEmail = user.email || input.identifier;
            const { code, expiresAt } = await authService.createOtp({
              userId: user.id,
              email: userEmail,
              type: 'password_reset',
            });
            await authService.sendEmailOtp(userEmail, code, user.name || undefined);
            return { success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', expiresAt: expiresAt.getTime() };
          }
          const { code, expiresAt } = await authService.createOtp({
            userId: user.id,
            phone: userPhone,
            type: 'password_reset',
          });
          await authService.sendSmsOtp(userPhone, code);
          return { success: true, message: 'تم إرسال رمز التحقق إلى رقم جوالك.', expiresAt: expiresAt.getTime() };
        } else {
          // Send OTP via email
          const userEmail = user.email || (input.identifier.includes('@') ? input.identifier : null);
          if (!userEmail) {
            // User chose email but has no email - fall back to SMS
            const userPhone = user.phone || input.identifier;
            const { code, expiresAt } = await authService.createOtp({
              userId: user.id,
              phone: userPhone,
              type: 'password_reset',
            });
            await authService.sendSmsOtp(userPhone, code);
            return { success: true, message: 'تم إرسال رمز التحقق إلى رقم جوالك.', expiresAt: expiresAt.getTime() };
          }
          // Generate OTP and send via email (single email to avoid timeout)
          const { code, expiresAt } = await authService.createOtp({
            userId: user.id,
            email: userEmail,
            type: 'password_reset',
          });
          // Fire-and-forget: send email in background to avoid mobile timeout
          authService.sendEmailOtp(userEmail, code, user.name || undefined).catch(err => {
            console.error('[ForgotPassword] Email send failed:', err);
          });
          return { success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', expiresAt: expiresAt.getTime() };
        }
      }),

    // ============ VERIFY RESET OTP ============
    verifyResetOtp: publicProcedure
      .input(z.object({
        identifier: z.string().min(1),
        code: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const result = await authService.verifyOtp({
          identifier: input.identifier,
          code: input.code,
          type: 'password_reset',
        });

        if (!result.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'رمز التحقق غير صحيح' });
        }

        // Generate a temporary token for password reset
        const { token } = await authService.createPasswordResetToken(result.userId!);
        return { success: true, resetToken: token };
      }),

    // ============ VERIFY RESET TOKEN (from email link) ============
    verifyResetToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const result = await authService.verifyResetToken(input.token);
        if (!result.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'الرابط غير صالح' });
        }
        return { success: true, valid: true };
      }),

    // ============ RESET PASSWORD ============
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        // Verify the token
        const tokenResult = await authService.verifyResetToken(input.token);
        if (!tokenResult.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: tokenResult.error || 'رابط إعادة التعيين غير صالح' });
        }

        // Update password
        await authService.updatePassword(tokenResult.userId!, input.newPassword);
        
        // Mark token as used
        await authService.markTokenUsed(input.token);

        return { success: true, message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.' };
      }),

    // ============ CHANGE PASSWORD (logged in user) ============
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = ctx.user!;
        
        // Verify current password
        if (!user.password) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'لم يتم تعيين كلمة مرور لهذا الحساب بعد. يرجى التواصل مع الإدارة.' });
        }

        const isValid = await authService.verifyPassword(input.currentPassword, user.password);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'كلمة المرور الحالية غير صحيحة' });
        }

        await authService.updatePassword(user.id, input.newPassword);
        return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
      }),

    // ============ RESEND OTP ============
    resendOtp: publicProcedure
      .input(z.object({
        identifier: z.string().min(1), // phone or email
        type: z.enum(['registration', 'password_reset', 'login_verification', 'phone_verification', 'email_verification']),
      }))
      .mutation(async ({ input }) => {
        // Rate limit check
        const canRequest = await authService.canRequestOtp(input.identifier);
        if (!canRequest.allowed) {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: `يرجى الانتظار ${canRequest.waitSeconds} ثانية قبل طلب رمز جديد.` });
        }

        // Find user
        const user = await db.findUserByIdentifier(input.identifier);
        
        // Generate new OTP
        const { code, expiresAt } = await authService.createOtp({
          userId: user?.id,
          phone: input.identifier.includes('@') ? undefined : input.identifier,
          email: input.identifier.includes('@') ? input.identifier : undefined,
          type: input.type,
        });

        // Send OTP - prefer email, fallback to SMS
        if (input.identifier.includes('@')) {
          await authService.sendEmailOtp(input.identifier, code);
        } else {
          // Try to find user's email first
          const userRecord = await db.findUserByIdentifier(input.identifier);
          if (userRecord?.email) {
            await authService.sendEmailOtp(userRecord.email, code, userRecord.name || undefined);
          } else {
            await authService.sendSmsOtp(input.identifier, code);
          }
        }

        return { success: true, message: 'تم إرسال رمز تحقق جديد.', expiresAt: expiresAt.getTime() };
      }),

    // ============ PHONE OTP LOGIN (passwordless) ============
    sendPhoneOtp: publicProcedure
      .input(z.object({
        phone: z.string().min(9),
      }))
      .mutation(async ({ input }) => {
        const deliveryAvailability = authService.getOtpDeliveryAvailability();
        if (!deliveryAvailability.email && !deliveryAvailability.sms) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'خدمة إرسال رمز التحقق غير مفعلة حالياً. استخدم كلمة المرور أو تواصل مع إدارة الحضانة لتعيين كلمة مرور.',
          });
        }

        // Rate limit check
        const canRequest = await authService.canRequestOtp(input.phone);
        if (!canRequest.allowed) {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: `يرجى الانتظار ${canRequest.waitSeconds} ثانية قبل طلب رمز جديد.` });
        }

        // Find user by phone
        const user = await db.findUserByIdentifier(input.phone);
        if (!user) {
          // Don't reveal whether user exists - still return success
          return { success: true, message: 'إذا كان الرقم مسجلاً، سيتم إرسال رمز التحقق.', expiresAt: Date.now() + 5 * 60 * 1000 };
        }

        // Check if account is locked
        const lockStatus = await authService.isAccountLocked(user.id);
        if (lockStatus.locked) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'تم قفل الحساب مؤقتاً. يرجى المحاولة لاحقاً.' });
        }

        // Check if account is active
        if (!user.isActive) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'حسابك غير مفعل. يرجى التواصل مع الإدارة.' });
        }

        // Generate and send OTP
        const { code, expiresAt } = await authService.createOtp({
          userId: user.id,
          phone: input.phone,
          type: 'login_verification',
        });

        // Prefer email when it is configured, then fall back to SMS. Never
        // claim delivery when production has no working provider.
        let deliveryResult = user.email && deliveryAvailability.email
          ? await authService.sendEmailOtp(user.email, code, user.name || undefined)
          : deliveryAvailability.sms
            ? await authService.sendSmsOtp(input.phone, code)
            : { sent: false, message: 'No configured delivery channel' };

        if (!deliveryResult.sent && deliveryAvailability.sms) {
          deliveryResult = await authService.sendSmsOtp(input.phone, code);
        }
        if (!deliveryResult.sent) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'تعذر إرسال رمز التحقق الآن. استخدم كلمة المرور أو تواصل مع إدارة الحضانة.',
          });
        }

        return { success: true, message: 'تم إرسال رمز التحقق.', expiresAt: expiresAt.getTime() };
      }),

    // ============ VERIFY PHONE OTP & LOGIN ============
    verifyPhoneOtp: publicProcedure
      .input(z.object({
        phone: z.string().min(9),
        code: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const ip = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket.remoteAddress || '';

        // Find user
        const user = await db.findUserByIdentifier(input.phone);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'رمز التحقق غير صحيح' });
        }

        // Verify OTP
        const result = await authService.verifyOtp({
          identifier: input.phone,
          code: input.code,
          type: 'login_verification',
        });

        if (!result.valid) {
          await authService.recordLoginAttempt({ userId: user.id, identifier: input.phone, ip, success: false, reason: 'invalid_otp' });
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'رمز التحقق غير صحيح' });
        }

        // Successful login
        await authService.resetFailedAttempts(user.id);
        await authService.recordLoginAttempt({ userId: user.id, identifier: input.phone, ip, success: true });

        // Set session cookie
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, role: user.role, email: user.email } };
      }),

    // ============ UPDATE PROFILE ============
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(9).optional(),
        language: z.enum(['ar', 'en']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = ctx.user!;
        const updateData: Record<string, any> = {};

        // Check if email is already taken by another user
        if (input.email && normalizeEmail(input.email) !== user.email) {
          const normalizedEmail = normalizeEmail(input.email);
          const existing = await db.findUserByIdentifier(normalizedEmail);
          if (existing && existing.id !== user.id) {
            throw new TRPCError({ code: 'CONFLICT', message: 'البريد الإلكتروني مستخدم من حساب آخر' });
          }
          updateData.email = normalizedEmail;
        }

        // Check if phone is already taken by another user
        if (input.phone && input.phone !== user.phone) {
          const existing = await db.findUserByIdentifier(input.phone);
          if (existing && existing.id !== user.id) {
            throw new TRPCError({ code: 'CONFLICT', message: 'رقم الجوال مستخدم من حساب آخر' });
          }
          updateData.phone = input.phone;
        }

        if (input.name) updateData.name = input.name;
        if (input.language) updateData.language = input.language;

        if (Object.keys(updateData).length === 0) {
          return { success: true, message: 'لا توجد تغييرات' };
        }

        await db.updateUser(user.id, updateData);
        return { success: true, message: 'تم تحديث البيانات بنجاح' };
      }),

    // ============ GET LOGIN SESSIONS ============
    getLoginSessions: protectedProcedure.query(async ({ ctx }) => {
      const dbInstance = await getSharedDb();
      if (!dbInstance) return [];
      const sessions = await dbInstance.select()
        .from(loginAttempts)
        .where(and(eq(loginAttempts.userId, ctx.user!.id), eq(loginAttempts.success, true)))
        .orderBy(desc(loginAttempts.createdAt))
        .limit(20);
      return sessions;
    }),

    // ============ GET AUTH CONSTANTS (for frontend) ============
    getAuthConfig: publicProcedure.query(() => {
      const deliveryAvailability = authService.getOtpDeliveryAvailability();
      return {
        otpExpiryMinutes: authService.AUTH_CONSTANTS.OTP_EXPIRY_MINUTES,
        otpCooldownSeconds: authService.AUTH_CONSTANTS.OTP_COOLDOWN_SECONDS,
        maxFailedAttempts: authService.AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS,
        lockoutMinutes: authService.AUTH_CONSTANTS.ACCOUNT_LOCKOUT_MINUTES,
        sessionTimeoutMinutes: authService.AUTH_CONSTANTS.SESSION_TIMEOUT_MINUTES,
        otpLoginAvailable: deliveryAvailability.email || deliveryAvailability.sms,
      };
    }),

    // ============ DELETE ACCOUNT ============
    deleteAccount: protectedProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const user = ctx.user!;
        // Verify password
        if (!user.password) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'لم يتم تعيين كلمة مرور لهذا الحساب. يرجى التواصل مع الإدارة لحذف حسابك.' });
        }
        const isValid = await authService.verifyPassword(input.password, user.password);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'كلمة المرور غير صحيحة' });
        }
        // Mark account for deletion with 30-day grace period
        const now = new Date();
        const scheduledDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        await db.markAccountForDeletion(user.id, now, scheduledDate);
        // Send confirmation email
        if (user.email) {
          const { sendAccountDeletionEmail } = await import('./services/emailService');
          await sendAccountDeletionEmail(user.email, user.name || '', scheduledDate);
        }
        // Clear session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true, message: 'تم تقديم طلب حذف حسابك. سيتم حذف الحساب نهائياً بعد 30 يوم. يمكنك استعادة حسابك خلال هذه الفترة.', scheduledDate: scheduledDate.toISOString() };
      }),

    // ============ RECOVER ACCOUNT ============
    recoverAccount: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.deletionRequestedAt) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'لا يوجد طلب حذف لهذا الحساب' });
        }
        if (!user.password) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يمكن استعادة هذا الحساب. يرجى التواصل مع الإدارة.' });
        }
        const isValid = await authService.verifyPassword(input.password, user.password);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'كلمة المرور غير صحيحة' });
        }
        // Check if grace period has expired
        if (user.deletionScheduledAt && new Date() > new Date(user.deletionScheduledAt)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'انتهت فترة السماح. تم حذف الحساب نهائياً.' });
        }
        // Cancel deletion
        await db.cancelAccountDeletion(user.id);
        // Send recovery confirmation email
        if (user.email) {
          const { sendAccountRecoveryEmail } = await import('./services/emailService');
          await sendAccountRecoveryEmail(user.email, user.name || '');
        }
        return { success: true, message: 'تم استعادة حسابك بنجاح. يمكنك تسجيل الدخول الآن.' };
      }),
  }),

  dashboard: router({
    stats: tenantProcedure.query(async ({ ctx }) => {
      // Parents see only their children's stats
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return {
          totalChildren: childIds.length,
          totalStaff: 0,
          presentToday: 0,
          totalRevenue: 0,
        };
      }
      // Fix #5: Cache dashboard stats per org for 30 seconds
      const orgId = ctx.user?.organizationId;
      const cacheKey = `dashboard_stats_${orgId ?? 'all'}`;
      const now = Date.now();
      if (_dashboardStatsCache[cacheKey] && (now - _dashboardStatsCache[cacheKey].time) < 30000) {
        return _dashboardStatsCache[cacheKey].data;
      }
      const result = await db.getDashboardStats(orgId ?? undefined);
      _dashboardStatsCache[cacheKey] = { data: result, time: now };
      return result;
    }),
  }),

  children: router({
    list: tenantProcedure.input(z.object({ parentId: z.number().optional(), classId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // Parents can only see their own children
      if (ctx.user?.role === 'parent') {
        return db.getChildren(ctx.user.id);
      }
      // SECURITY FIX: previously called getChildrenByClass with no
      // organizationId at all -- any authenticated user, of any role and any
      // organization, could pass an arbitrary classId belonging to a
      // DIFFERENT organization and receive that organization's full child
      // roster (names, medical info, parent contacts). getChildrenByClass
      // already supported an optional organizationId filter (used elsewhere)
      // -- this call site just never passed it.
      if (input?.classId) {
        return db.getChildrenByClass(input.classId, ctx.organizationId ?? undefined);
      }
      // All staff (teachers, assistants, admins) see all children in their organization
      // This ensures children appear in assessments and media upload regardless of class assignment
      return db.getChildren(input?.parentId, ctx.user?.organizationId ?? undefined);
    }),
    getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only view their own children's details
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.id)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        return db.getChildById(input.id);
      }
      // SECURITY FIX: staff/admin previously had no organization check at
      // all -- any authenticated non-parent user could read another
      // organization's child profile (medical info, national ID, parent
      // contacts) by id.
      const child = await db.getChildById(input.id, ctx.organizationId ?? undefined);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return child;
    }),
    create: teacherProcedure.input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      arabicName: z.string().optional(),
      dateOfBirth: z.string(),
      gender: z.enum(["male", "female"]),
      nationality: z.string().optional(),
      childNationalId: z.string().optional(),
      classId: z.number().optional(),
      parentId: z.number().optional(),
      photo: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      parentEmail: z.string().optional(),
      parentMobile: z.string().optional(),
      altPhone: z.string().optional(),
      homeAddress: z.string().optional(),
      allergies: z.string().optional(),
      medicalConditions: z.string().optional(),
      medications: z.string().optional(),
      specialNeeds: z.string().optional(),
      doctorName: z.string().optional(),
      bloodType: z.string().optional(),
      medicalNotes: z.string().optional(),
      pickupAuthorization: z.string().optional(),
      busRequired: z.boolean().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { parentId, ...childData } = input;
      // SECURITY/DATA-INTEGRITY FIX (C3): previously omitted organizationId entirely,
      // silently relying on the schema's now-removed `.default(1)` -- every new child
      // created here would have landed in organization #1 regardless of which
      // organization the creating teacher/admin actually belonged to.
      const child = await db.createChild({ ...childData, organizationId: ctx.organizationId, dateOfBirth: new Date(input.dateOfBirth) });
      if (parentId && child.id) {
        // SECURITY FIX: previously linked with no organizationId check --
        // an admin/teacher could link this new child to a parent user
        // account belonging to a DIFFERENT organization, giving that
        // other organization's parent visibility into this child.
        await db.linkParentToChild(parentId, child.id as number, 'parent', ctx.organizationId);
      }
      return child;
    }),
    update: teacherProcedure.input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      arabicName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(["male", "female"]).optional(),
      nationality: z.string().optional(),
      childNationalId: z.string().optional(),
      classId: z.number().nullable().optional(),
      photo: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      parentEmail: z.string().optional(),
      parentMobile: z.string().optional(),
      altPhone: z.string().optional(),
      homeAddress: z.string().optional(),
      allergies: z.string().optional(),
      medicalConditions: z.string().optional(),
      medications: z.string().optional(),
      specialNeeds: z.string().optional(),
      doctorName: z.string().optional(),
      bloodType: z.string().optional(),
      medicalNotes: z.string().optional(),
      pickupAuthorization: z.string().optional(),
      busRequired: z.boolean().optional(),
      attendanceDays: z.array(z.number().min(0).max(6)).optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "inactive", "graduated", "waitlist"]).optional(),
    // SECURITY FIX: previously called updateChild with no organizationId at
    // all -- any teacher/admin (from any organization) could update any
    // other organization's child (medical info, allergies, contacts,
    // everything) by id. Now scoped with ctx.organizationId, matching the
    // pattern already used by getById/create above.
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
      const child = await db.updateChild(id, updateData, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return child;
    }),
    // SECURITY FIX: previously called deleteChild with no organizationId --
    // any admin could delete any other organization's child by id.
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const child = await db.getChildById(input.id, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      await db.deleteChild(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_child', resource: 'children', resourceId: input.id, details: `Deleted child #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
    // SECURITY FIX: previously called updateChild with no organizationId --
    // any teacher could archive any other organization's child by id.
    archive: teacherProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const child = await db.updateChild(input.id, { status: 'inactive' }, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return child;
    }),
    // SECURITY FIX: same as archive above.
    activate: teacherProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const child = await db.updateChild(input.id, { status: 'active' }, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return child;
    }),
    // SECURITY FIX: previously called getParentsForChild with no
    // organizationId -- any authenticated user could list every parent
    // (name/email/phone) linked to any other organization's child by
    // childId. Now scoped with ctx.organizationId.
    getParents: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return db.getParentsForChild(input.childId, ctx.organizationId ?? undefined);
    }),
    // Parent can register a new child and auto-link to their account
    parentRegisterChild: parentProcedure.input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      arabicName: z.string().optional(),
      dateOfBirth: z.string(),
      gender: z.enum(["male", "female"]),
      nationality: z.string().optional(),
      childNationalId: z.string().optional(),
      photo: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      parentEmail: z.string().optional(),
      parentMobile: z.string().optional(),
      altPhone: z.string().optional(),
      homeAddress: z.string().optional(),
      allergies: z.string().optional(),
      medicalConditions: z.string().optional(),
      medications: z.string().optional(),
      specialNeeds: z.string().optional(),
      doctorName: z.string().optional(),
      bloodType: z.string().optional(),
      medicalNotes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Create the child
      // SECURITY/DATA-INTEGRITY FIX (C3): previously omitted organizationId entirely
      // (see the equivalent fix on children.create above for the full rationale).
      const child = await db.createChild({ ...input, organizationId: ctx.organizationId, dateOfBirth: new Date(input.dateOfBirth) });
      // Auto-link child to the parent
      if (child && child.id) {
        await db.linkParentToChild(ctx.user!.id, child.id as number, 'parent', ctx.organizationId);
      }
      return child;
    }),
    parentUpdate: parentProcedure.input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      arabicName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(["male", "female"]).optional(),
      nationality: z.string().optional(),
      childNationalId: z.string().optional(),
      photo: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      parentEmail: z.string().optional(),
      parentMobile: z.string().optional(),
      altPhone: z.string().optional(),
      homeAddress: z.string().optional(),
      allergies: z.string().optional(),
      medicalConditions: z.string().optional(),
      medications: z.string().optional(),
      specialNeeds: z.string().optional(),
      doctorName: z.string().optional(),
      bloodType: z.string().optional(),
      medicalNotes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const childIds = await db.getChildIdsForParent(ctx.user!.id);
      if (!childIds.includes(input.id)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u062a\u0639\u062f\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0637\u0641\u0644' });
      }
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
      return db.updateChild(id, updateData);
    }),
  }),

  attendance: router({
    byDate: tenantProcedure.input(z.object({ date: z.string() })).query(async ({ input, ctx }) => {
      // Parents can only see attendance for their own children
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getAttendanceByDateForChildren(input.date, childIds);
      }
      return db.getAttendanceByDate(input.date, ctx.user?.organizationId ?? undefined);
    }),
    byChild: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only see their own children's attendance
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        // SECURITY FIX: staff/admin previously had no ownership check at
        // all -- any authenticated non-parent user could read another
        // organization's child's attendance history by id.
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getAttendanceByChild(input.childId, ctx.organizationId ?? undefined);
    }),
    checkIn: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      droppedOffBy: z.string().optional(),
      droppedOffRelationship: z.enum(["mother", "father", "driver", "grandparent", "other"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created an attendance record for any
      // childId with no verification it belongs to the caller's
      // organization -- a teacher in org A could check in/mark attendance
      // for org B's child.
      const child = await db.getChildById(input.childId, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      const result = await db.createAttendance({
        childId: input.childId,
        date: new Date(input.date),
        status: "present",
        checkInTime: new Date(),
        checkedInBy: ctx.user!.id,
        droppedOffBy: input.droppedOffBy,
        droppedOffRelationship: input.droppedOffRelationship,
        notes: input.notes,
        organizationId: ctx.organizationId,
      } as any);
      // Notify parent about child arrival
      if (child?.parentId) {
        await db.createNotification({
          userId: child.parentId,
          organizationId: ctx.organizationId,
          title: 'Child Arrival',
          titleAr: 'وصول الطفل',
          body: `${child.firstName} has arrived at the center`,
          bodyAr: `وصل ${child.firstName} ${child.lastName} إلى المركز`,
          type: 'attendance',
          link: '/parent/attendance',
          metadata: { childId: input.childId, time: new Date().toISOString(), type: 'checkin' },
        });
        // Send push notification
        try {
          const { notifyParentCheckIn } = await import('./_core/pushTriggers');
          await notifyParentCheckIn(child.parentId, `${child.firstName} ${child.lastName}`, input.childId);
        } catch (e) { /* push failure shouldn't block */ }
      }
      return result;
    }),
    checkOut: teacherProcedure.input(z.object({
      id: z.number(),
      childId: z.number(),
      pickedUpBy: z.string().min(1),
      relationship: z.enum(["mother", "father", "driver", "grandparent", "guardian", "other"]),
      signatureData: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously trusted input.id/input.childId with no
      // ownership check -- any teacher/admin could check out (and record a
      // pickup for) another organization's child.
      const attendanceRecord = await db.getAttendanceById(input.id, ctx.organizationId);
      if (!attendanceRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'سجل الحضور غير موجود' });
      const child = await db.getChildById(input.childId, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      await db.updateAttendance(input.id, { checkOutTime: new Date(), checkedOutBy: ctx.user!.id }, ctx.organizationId);
      // Create departure record
      await db.createDeparture({
        childId: input.childId,
        attendanceId: input.id,
        departureTime: new Date(),
        pickedUpBy: input.pickedUpBy,
        relationship: input.relationship,
        signatureData: input.signatureData,
        notes: input.notes,
        recordedBy: ctx.user!.id,
      });
      // Notify parent about child departure
      if (child?.parentId) {
        await db.createNotification({
          userId: child.parentId,
          organizationId: ctx.organizationId,
          title: 'Child Departure',
          titleAr: 'مغادرة الطفل',
          body: `${child.firstName} has left the center`,
          bodyAr: `غادر ${child.firstName} ${child.lastName} المركز`,
          type: 'attendance',
          link: '/parent/attendance',
          metadata: { childId: input.childId, time: new Date().toISOString(), type: 'checkout', pickedUpBy: input.pickedUpBy },
        });
        // Send push notification
        try {
          const { notifyParentCheckOut } = await import('./_core/pushTriggers');
          await notifyParentCheckOut(child.parentId, `${child.firstName} ${child.lastName}`, input.childId, input.pickedUpBy);
        } catch (e) { /* push failure shouldn't block */ }
      }
      return { success: true };
    }),
    markAbsent: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      status: z.enum(["absent", "excused"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously trusted input.childId with no ownership
      // check -- any teacher/admin could mark another organization's child
      // absent/excused.
      const childCheck = await db.getChildById(input.childId, ctx.organizationId);
      if (!childCheck) throw new TRPCError({ code: 'NOT_FOUND', message: '\u0627\u0644\u0637\u0641\u0644 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
      // Check if attendance record exists for this child on this date
      const existing = await db.getAttendanceForChildOnDate(input.childId, input.date, ctx.organizationId);
      if (existing) {
        const previousStatus = existing.status;
        await db.updateAttendance(existing.id, { status: input.status, notes: input.notes }, ctx.organizationId);
        await db.createAttendanceAuditLog({
          attendanceId: existing.id,
          childId: input.childId,
          previousStatus,
          newStatus: input.status,
          changedBy: ctx.user!.id,
          changedByName: ctx.user!.name || '\u0645\u0633\u062a\u062e\u062f\u0645',
          notes: input.notes,
        });
        return { id: existing.id, childId: input.childId, status: input.status };
      }
      const result = await db.createAttendance({ childId: input.childId, date: new Date(input.date), status: input.status, notes: input.notes, organizationId: ctx.organizationId } as any);
      await db.createAttendanceAuditLog({
        attendanceId: result.id,
        childId: input.childId,
        previousStatus: 'none',
        newStatus: input.status,
        changedBy: ctx.user!.id,
        changedByName: ctx.user!.name || '\u0645\u0633\u062a\u062e\u062f\u0645',
        notes: input.notes,
      });
      return result;
    }),
    updateStatus: teacherProcedure.input(z.object({
      id: z.number(),
      childId: z.number(),
      newStatus: z.enum(["present", "absent", "late", "excused", "checked_in", "checked_out"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously fetched by id with no organizationId
      // filter -- any teacher/admin could edit another organization's
      // attendance record by guessing/enumerating its id.
      const existing = await db.getAttendanceById(input.id, ctx.organizationId);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '\u0633\u062c\u0644 \u0627\u0644\u062d\u0636\u0648\u0631 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
      }
      const previousStatus = existing.status;
      const updateData: any = { status: input.newStatus };
      if ((input.newStatus === 'present' || input.newStatus === 'checked_in' || input.newStatus === 'late') && !existing.checkInTime) {
        updateData.checkInTime = new Date();
        updateData.checkedInBy = ctx.user!.id;
      }
      // When reverting to present/checked_in/late, clear checkOutTime so child appears in "currently in center"
      if ((input.newStatus === 'present' || input.newStatus === 'checked_in' || input.newStatus === 'late') && existing.checkOutTime) {
        updateData.checkOutTime = null;
        updateData.checkedOutBy = null;
      }
      if (input.newStatus === 'checked_out' && !existing.checkOutTime) {
        updateData.checkOutTime = new Date();
        updateData.checkedOutBy = ctx.user!.id;
      }
      await db.updateAttendance(input.id, updateData, ctx.organizationId);
      await db.createAttendanceAuditLog({
        attendanceId: input.id,
        childId: input.childId,
        previousStatus,
        newStatus: input.newStatus,
        changedBy: ctx.user!.id,
        changedByName: ctx.user!.name || '\u0645\u0633\u062a\u062e\u062f\u0645',
        notes: input.notes,
      });
      const child = await db.getChildById(input.childId, ctx.organizationId);
      if (child?.parentId) {
        const statusLabels: Record<string, string> = {
          present: '\u062d\u0627\u0636\u0631',
          absent: '\u063a\u0627\u0626\u0628',
          late: '\u0645\u062a\u0623\u062e\u0631',
          excused: '\u063a\u064a\u0627\u0628 \u0628\u0639\u0630\u0631',
          checked_in: '\u062a\u0645 \u0627\u0644\u062a\u0633\u062c\u064a\u0644',
          checked_out: '\u062a\u0645 \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629',
        };
        await db.createNotification({
          userId: child.parentId,
          organizationId: ctx.organizationId,
          title: '\u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
          titleAr: '\u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
          body: `Attendance status updated for ${child.firstName}`,
          bodyAr: `\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u062d\u0636\u0648\u0631 ${child.firstName} ${child.lastName} \u0625\u0644\u0649: ${statusLabels[input.newStatus] || input.newStatus}`,
          type: 'attendance',
          metadata: { childId: input.childId, previousStatus, newStatus: input.newStatus, time: new Date().toISOString() },
        });
      }
      return { success: true, previousStatus, newStatus: input.newStatus };
    }),
    auditLog: tenantProcedure.input(z.object({
      childId: z.number().optional(),
      attendanceId: z.number().optional(),
    })).query(async ({ input, ctx }) => {
      // SECURITY FIX: the attendanceId path previously had NO ownership
      // check at all, for any role including parents -- any authenticated
      // user could read another organization's (or another parent's)
      // attendance audit trail by guessing an attendanceId. The childId
      // path only checked ownership for parents, not staff/admin. Both
      // paths now verify the referenced attendance/child belongs to the
      // caller's organization (and, for parents, to one of their own
      // children) before returning anything.
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (input.childId && !childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        if (input.attendanceId) {
          const record = await db.getAttendanceById(input.attendanceId, ctx.organizationId ?? undefined);
          if (!record || !childIds.includes(record.childId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }
      } else {
        if (input.attendanceId) {
          const record = await db.getAttendanceById(input.attendanceId, ctx.organizationId ?? undefined);
          if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'سجل الحضور غير موجود' });
        }
        if (input.childId) {
          const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
          if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
        }
      }
      if (input.attendanceId) {
        return db.getAttendanceAuditLogByAttendance(input.attendanceId);
      }
      if (input.childId) {
        return db.getAttendanceAuditLogByChild(input.childId);
      }
      return [];
    }),
  }),

  dailyReports: router({
    list: tenantProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // Parents can only see reports for their own children
      if (ctx.user?.role === 'parent') {
        if (input?.childId) {
          const childIds = await db.getChildIdsForParent(ctx.user.id);
          if (!childIds.includes(input.childId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
          return db.getDailyReports(input.childId);
        }
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getDailyReportsForChildren(childIds);
      }
      return db.getDailyReports(input?.childId, ctx.user?.organizationId ?? undefined);
    }),
    getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      // SECURITY FIX: previously fetched by id with no organizationId
      // filter -- any authenticated staff member of ANY organization could
      // read another organization's daily report by id.
      const report = await db.getDailyReportById(input.id, ctx.organizationId ?? undefined);
      // Parents can only view reports for their own children
      if (ctx.user?.role === 'parent' && report) {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(report.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return report;
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      meals: z.any().optional(),
      sleep: z.any().optional(),
      toileting: z.any().optional(),
      activities: z.string().optional(),
      mood: z.enum(["happy", "calm", "tired", "upset", "excited"]).optional(),
      teacherNotes: z.string().optional(),
      photos: z.array(z.string()).optional(),
      isPublished: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created a daily report for any childId
      // with no verification it belongs to the caller's organization.
      const ownedChild = await db.getChildById(input.childId, ctx.organizationId);
      if (!ownedChild) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      const report = await db.createDailyReport({ ...input, date: new Date(input.date), teacherId: ctx.user!.id, organizationId: ctx.organizationId } as any);
      // Notify parent about new daily report + push
      try {
        const child = ownedChild;
        if (child?.parentId) {
          await db.createNotification({
            userId: child.parentId,
            organizationId: ctx.organizationId,
            title: 'تقرير يومي جديد',
            titleAr: 'تقرير يومي جديد',
            body: `تم إضافة تقرير يومي جديد لـ ${child.firstName} ${child.lastName}`,
            bodyAr: `تم إضافة تقرير يومي جديد لـ ${child.firstName} ${child.lastName}`,
            type: 'report',
            link: '/parent/daily-report',
          });
          // Push notification to parent
          const { sendPushToUser } = await import('./_core/webPush');
          const pushResult = await sendPushToUser(child.parentId, {
            title: 'تقرير يومي جديد 📝',
            body: `تم إضافة تقرير يومي جديد لـ ${child.firstName}`,
            tag: 'daily_report',
            data: { type: 'daily_report', childId: input.childId, url: '/parent/daily-report' },
          }, db.getPushSubscriptionsForUser);
          if (pushResult.expired.length > 0) await db.removeExpiredSubscriptions(pushResult.expired);
        }
      } catch (e) { /* non-critical */ }
      return report;
    }),
    update: teacherProcedure.input(z.object({
      id: z.number(),
      meals: z.any().optional(),
      sleep: z.any().optional(),
      toileting: z.any().optional(),
      activities: z.string().optional(),
      mood: z.enum(["happy", "calm", "tired", "upset", "excited"]).optional(),
      teacherNotes: z.string().optional(),
      isPublished: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id with no organizationId
      // filter -- any teacher/admin could edit another organization's
      // daily report by guessing/enumerating its id.
      const { id, ...data } = input;
      const existing = await db.getDailyReportById(id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'التقرير غير موجود' });
      await db.updateDailyReport(id, data, ctx.organizationId);
      return { success: true };
    }),
  }),

  messages: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      return db.getConversations(ctx.user!.id);
    }),
    allConversations: adminProcedure.input(z.object({ search: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      // SECURITY FIX: previously listed every organization's conversations
      // to any admin -- now scoped to the caller's organization.
      return db.getAllConversations(input?.search, ctx.organizationId);
    }),
    list: tenantProcedure.input(z.object({ conversationId: z.number() })).query(async ({ input, ctx }) => {
      // SECURITY FIX: the isAdmin bypass previously granted access to a
      // conversation regardless of which organization it belonged to --
      // any admin of ANY organization could read any other organization's
      // conversation by id. The conversation is now fetched pre-filtered
      // by the caller's own organization, so an admin from a different org
      // gets NOT_FOUND instead of a silent cross-tenant read.
      const conv = await db.getConversationById(input.conversationId, ctx.organizationId ?? undefined);
      if (!conv) throw new TRPCError({ code: 'NOT_FOUND', message: 'المحادثة غير موجودة' });
      const isAdmin = ctx.user?.role === 'admin' || ctx.user?.role === 'super_admin' || ctx.user?.role === 'owner' || ctx.user?.role === 'principal';
      if (!isAdmin && conv.participantOneId !== ctx.user!.id && conv.participantTwoId !== ctx.user!.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح بالوصول' });
      }
      // Mark messages as read
      await db.markMessagesAsRead(input.conversationId, ctx.user!.id);
      return db.getMessages(input.conversationId);
    }),
    send: tenantProcedure.input(z.object({
      conversationId: z.number(),
      content: z.string().min(1),
      attachmentUrl: z.string().optional(),
      attachmentType: z.string().optional(),
      attachmentName: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: same cross-tenant admin bypass as `list` above --
      // conversation is now fetched pre-filtered by the caller's org.
      const conv = await db.getConversationById(input.conversationId, ctx.organizationId ?? undefined);
      if (!conv) throw new TRPCError({ code: 'NOT_FOUND', message: 'المحادثة غير موجودة' });
      const isAdmin = ctx.user?.role === 'admin' || ctx.user?.role === 'super_admin' || ctx.user?.role === 'owner' || ctx.user?.role === 'principal';
      if (!isAdmin && conv.participantOneId !== ctx.user!.id && conv.participantTwoId !== ctx.user!.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح بالإرسال' });
      }
      const message = await db.createMessage({
        conversationId: input.conversationId,
        senderId: ctx.user!.id,
        content: input.content,
        attachmentUrl: input.attachmentUrl,
        attachmentType: input.attachmentType,
        attachmentName: input.attachmentName,
      });
      // Send push notification + in-app notification to the other participant
      const recipientId = conv.participantOneId === ctx.user!.id ? conv.participantTwoId : conv.participantOneId;
      // In-app notification
      try {
        await db.createNotification({
          userId: recipientId,
          organizationId: ctx.organizationId ?? undefined,
          title: 'رسالة جديدة',
          titleAr: 'رسالة جديدة',
          body: `${ctx.user!.name || 'مستخدم'}: ${input.content.slice(0, 100)}`,
          bodyAr: `${ctx.user!.name || 'مستخدم'}: ${input.content.slice(0, 100)}`,
          type: 'message',
          link: '/messages',
        });
      } catch (e) { /* non-critical */ }
      // Web push notification
      try {
        const { sendPushToUser } = await import('./_core/webPush');
        const result = await sendPushToUser(recipientId, {
          title: 'رسالة جديدة',
          body: `${ctx.user!.name || 'مستخدم'}: ${input.content.slice(0, 80)}`,
          tag: 'new_message',
          data: { type: 'new_message', conversationId: input.conversationId },
        }, db.getPushSubscriptionsForUser);
        if (result.expired.length > 0) {
          await db.removeExpiredSubscriptions(result.expired);
        }
      } catch (e) { /* push notification failure is non-critical */ }
      return message;
    }),
    createConversation: tenantProcedure.input(z.object({
      participantId: z.number(),
      childId: z.number().optional(),
      subject: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created a conversation with any
      // participantId with no check they belong to the same organization,
      // and never stamped organizationId on the new row at all.
      const participant = await db.getUserById(input.participantId);
      if (!participant || participant.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      }
      return db.createConversation(ctx.user!.id, input.participantId, input.childId, input.subject, ctx.organizationId);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadMessageCount(ctx.user!.id);
    }),
    markRead: protectedProcedure.input(z.object({ conversationId: z.number() })).mutation(async ({ input, ctx }) => {
      await db.markMessagesAsRead(input.conversationId, ctx.user!.id);
      return { success: true };
    }),
    archive: adminProcedure.input(z.object({ conversationId: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously archived by id with no ownership check --
      // any admin of ANY organization could archive another organization's
      // conversation.
      const conv = await db.getConversationById(input.conversationId, ctx.organizationId);
      if (!conv) throw new TRPCError({ code: 'NOT_FOUND', message: 'المحادثة غير موجودة' });
      await db.archiveConversation(input.conversationId, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'archive_conversation', resource: 'conversations', resourceId: input.conversationId, details: `Archived conversation #${input.conversationId}`, ipAddress: '' });
      return { success: true };
    }),
    unarchive: adminProcedure.input(z.object({ conversationId: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: same as archive above.
      const conv = await db.getConversationById(input.conversationId, ctx.organizationId);
      if (!conv) throw new TRPCError({ code: 'NOT_FOUND', message: 'المحادثة غير موجودة' });
      await db.unarchiveConversation(input.conversationId, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'unarchive_conversation', resource: 'conversations', resourceId: input.conversationId, details: `Unarchived conversation #${input.conversationId}`, ipAddress: '' });
      return { success: true };
    }),
    deleteMessage: adminProcedure.input(z.object({ messageId: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously deleted by id with no ownership check --
      // any admin of ANY organization could soft-delete another
      // organization's message. Ownership is verified via the message's
      // parent conversation.
      await db.deleteMessage(input.messageId, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_message', resource: 'messages', resourceId: input.messageId, details: `Deleted message #${input.messageId}`, ipAddress: '' });
      return { success: true };
    }),
    getContacts: tenantProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      const role = ctx.user?.role;
      if (role === 'parent') {
        // Parents get teachers of their children
        if (input?.childId) {
          // SECURITY FIX: previously passed input.childId straight through
          // with no check that it's actually one of the caller's own
          // children -- any parent could pass another parent's (or
          // another organization's) childId and get that child's teacher
          // contacts back.
          const childIds = await db.getChildIdsForParent(ctx.user!.id);
          if (!childIds.includes(input.childId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
          return db.getTeachersForChild(input.childId, ctx.organizationId ?? undefined);
        }
        return [];
      } else if (role === 'teacher' || role === 'assistant') {
        // Teachers get parents of children in their class
        return db.getParentsForTeacher(ctx.user!.id, ctx.organizationId ?? undefined);
      } else {
        // SECURITY FIX: previously returned every active staff/parent user
        // across ALL organizations -- now scoped to the caller's org.
        return db.getAllActiveStaffAndParents(ctx.organizationId ?? undefined);
      }
    }),
  }),

  finance: router({
    // SECURITY FIX: previously called db.getInvoices()/db.getInvoiceById() with no
    // organizationId at all -- any authenticated non-parent user could list or
    // fetch ANY organization's invoices. Now upgraded to tenantProcedure so
    // ctx.organizationId is guaranteed non-null and always applied as a filter.
    invoices: tenantProcedure.input(z.object({ parentId: z.number().optional(), status: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        return db.getInvoices(ctx.organizationId, ctx.user.id);
      }
      return db.getInvoices(ctx.organizationId, input?.parentId);
    }),
    getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.id, ctx.organizationId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      if (ctx.user?.role === 'parent' && invoice.parentId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }
      return invoice;
    }),
    createInvoice: adminProcedure.input(z.object({
      childId: z.number(),
      parentId: z.number(),
      description: z.string(),
      subtotal: z.string(),
      dueDate: z.string(),
      invoiceType: z.enum(['tuition', 'activity', 'trip', 'uniform', 'registration', 'other']).optional(),
      isRecurring: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: input.childId/input.parentId were previously trusted with
      // no check that either belongs to the caller's organization -- an invoice
      // (and its notification) could be created against a child/parent from a
      // different organization entirely.
      const targetChild = await db.getChildById(input.childId);
      if (!targetChild || targetChild.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      if (targetChild.parentId !== input.parentId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'ولي الأمر غير مرتبط بهذا الطفل' });
      }
      const subtotal = parseFloat(input.subtotal);
      const vatAmount = subtotal * 0.15;
      const total = subtotal + vatAmount;
      const invoice = await db.createInvoice({
        childId: input.childId,
        parentId: input.parentId,
        description: input.description,
        subtotal: input.subtotal,
        invoiceNumber: `INV-${Date.now()}`,
        vatRate: "15.00",
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        dueDate: new Date(input.dueDate),
        invoiceType: input.invoiceType || 'tuition',
        isRecurring: input.isRecurring || false,
        paidAmount: '0.00',
        createdBy: ctx.user!.id,
        // SECURITY FIX: previously omitted -- the invoices.organizationId column
        // defaults to 1, so every invoice ever created via this route silently
        // landed on organization #1 regardless of the creating admin's real org.
        organizationId: ctx.organizationId,
      });
      // Notify parent about new invoice
      await db.createNotification({
        userId: input.parentId,
        organizationId: ctx.organizationId,
        title: 'فاتورة جديدة',
        titleAr: 'فاتورة جديدة',
        body: `تم إنشاء فاتورة جديدة بمبلغ ${total.toLocaleString('ar-SA')} ر.س - ${input.description}`,
        bodyAr: `تم إنشاء فاتورة جديدة بمبلغ ${total.toLocaleString('ar-SA')} ر.س - ${input.description}`,
        type: 'payment',
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      await db.createAuditLog({ userId: ctx.user!.id, action: 'create_invoice', resource: 'invoices', resourceId: invoice.id, details: `Created invoice ${invoice.invoiceNumber} for ${total.toFixed(2)} SAR`, ipAddress: '' });
      // Send invoice email to parent (fire-and-forget)
      try {
        const parent = await db.getUserById(input.parentId);
        const child = await db.getChildById(input.childId);
        if (parent?.email && child) {
          const { sendInvoiceEmail } = await import('./services/emailService');
          sendInvoiceEmail(
            parent.email,
            parent.name || 'ولي الأمر',
            child?.firstName || 'الطفل',
            total,
            new Date(input.dueDate).toLocaleDateString('ar-SA')
          ).catch(err => console.error('[Email] Invoice email failed:', err.message));
        }
      } catch (e) { /* non-blocking */ }
      return invoice;
    }),
    updateInvoice: adminProcedure.input(z.object({
      id: z.number(),
      description: z.string().optional(),
      subtotal: z.string().optional(),
      dueDate: z.string().optional(),
      invoiceType: z.enum(['tuition', 'activity', 'trip', 'uniform', 'registration', 'other']).optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id alone with no organizationId check
      // at all -- an admin from any organization could edit any other
      // organization's invoice by guessing/enumerating ids.
      const existing = await db.getInvoiceById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      const updateData: any = {};
      if (input.description) updateData.description = input.description;
      if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
      if (input.invoiceType) updateData.invoiceType = input.invoiceType;
      if (input.subtotal) {
        const subtotal = parseFloat(input.subtotal);
        const vatAmount = subtotal * 0.15;
        const total = subtotal + vatAmount;
        updateData.subtotal = input.subtotal;
        updateData.vatAmount = vatAmount.toFixed(2);
        updateData.total = total.toFixed(2);
      }
      await db.updateInvoice(input.id, updateData, ctx.organizationId);
      return { success: true };
    }),
    markPaid: adminProcedure.input(z.object({ id: z.number(), paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'apple_pay', 'mada', 'stc_pay']) })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: getInvoiceById previously had no organizationId check --
      // an admin from another organization could mark a foreign invoice as paid.
      const invoice = await db.getInvoiceById(input.id, ctx.organizationId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      await db.updateInvoice(input.id, { status: 'paid', paidAt: new Date(), paymentMethod: input.paymentMethod, paidAmount: invoice.total }, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'mark_paid', resource: 'invoices', resourceId: input.id, details: `Marked invoice ${invoice.invoiceNumber} as paid via ${input.paymentMethod}`, ipAddress: '' });
      // Create a manual payment record
      await db.createPayment({
        invoiceId: input.id,
        parentId: invoice.parentId,
        amount: invoice.total,
        currency: 'SAR',
        method: input.paymentMethod as any,
        status: 'paid',
        paidAt: new Date(),
      });
      // Create transaction record
      await db.createTransaction({
        paymentId: 0, // Will be updated
        invoiceId: input.id,
        parentId: invoice.parentId,
        type: 'payment',
        amount: invoice.total,
        currency: 'SAR',
        status: 'completed',
        method: input.paymentMethod,
        description: `دفع يدوي - ${invoice.description || invoice.invoiceNumber}`,
      });
      // Notify parent
      await db.createNotification({
       userId: invoice.parentId,
       organizationId: ctx.organizationId,
       title: 'تأكيد الدفع',
       titleAr: 'تأكيد الدفع',
       body: `تم تسجيل دفع الفاتورة ${invoice.invoiceNumber} بنجاح`,
       bodyAr: `تم تسجيل دفع الفاتورة ${invoice.invoiceNumber} بنجاح`,
       type: 'payment',
       metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      // Send payment receipt email (fire-and-forget)
      try {
        const parent = await db.getUserById(invoice.parentId);
        const child = await db.getChildById(invoice.childId);
        if (parent?.email && child) {
          const { sendPaymentReceiptEmail } = await import('./services/emailService');
          sendPaymentReceiptEmail(
            parent.email,
            parent.name || 'ولي الأمر',
            invoice.invoiceNumber,
            invoice.total,
            input.paymentMethod,
            child?.firstName || 'الطفل',
            new Date().toLocaleDateString('ar-SA')
          ).catch(err => console.error('[Email] Receipt email failed:', err.message));
        }
      } catch (e) { /* non-blocking */ }
      return { success: true };
    }),
    markPending: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id alone with no fetch/org check at
      // all -- an admin from another organization could revert any invoice to
      // pending. Now fetch-and-verify before mutating.
      const existing = await db.getInvoiceById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      await db.updateInvoice(input.id, { status: 'pending', paidAt: null, paymentMethod: undefined as any, paidAmount: '0.00' }, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'mark_pending', resource: 'invoices', resourceId: input.id, details: `Marked invoice #${input.id} as pending`, ipAddress: '' });
      return { success: true };
    }),
    deleteInvoice: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously deleted by id alone with no fetch/org check --
      // an admin from another organization could delete any invoice by id.
      const existing = await db.getInvoiceById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      await db.deleteInvoice(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_invoice', resource: 'invoices', resourceId: input.id, details: `Deleted invoice #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
    sendReminder: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: getInvoiceById previously had no organizationId check --
      // an admin from another organization could send a payment reminder
      // (an in-app notification) about a foreign invoice to a foreign parent.
      const invoice = await db.getInvoiceById(input.id, ctx.organizationId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      await db.createNotification({
        userId: invoice.parentId,
        organizationId: ctx.organizationId,
        title: 'تذكير بالدفع',
        titleAr: 'تذكير بالدفع',
        body: `تذكير: لديك فاتورة مستحقة بمبلغ ${Number(invoice.total).toLocaleString('ar-SA')} ر.س - ${invoice.description || invoice.invoiceNumber}. تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}`,
        bodyAr: `تذكير: لديك فاتورة مستحقة بمبلغ ${Number(invoice.total).toLocaleString('ar-SA')} ر.س - ${invoice.description || invoice.invoiceNumber}. تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}`,
        type: 'payment',
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      return { success: true };
    }),
    sendInvoiceEmail: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: getInvoiceById previously had no organizationId check --
      // an admin from another organization could email a foreign parent about
      // a foreign invoice.
      const invoice = await db.getInvoiceById(input.id, ctx.organizationId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      if (!invoice.parentEmail) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يوجد بريد إلكتروني لولي الأمر' });
      const { sendDetailedInvoiceEmail } = await import('./services/emailService');
      const result = await sendDetailedInvoiceEmail(
        invoice.parentEmail,
        invoice.parentName || 'ولي الأمر',
        {
          invoiceNumber: invoice.invoiceNumber,
          description: invoice.description,
          subtotal: invoice.subtotal,
          vatRate: invoice.vatRate,
          vatAmount: invoice.vatAmount,
          total: invoice.total,
          paidAmount: invoice.paidAmount,
          status: invoice.status,
          dueDate: invoice.dueDate,
          paidAt: invoice.paidAt,
          paymentMethod: invoice.paymentMethod,
          invoiceType: invoice.invoiceType,
          createdAt: invoice.createdAt,
          childName: invoice.childName,
        }
      );
      if (!result.sent) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.message || 'فشل إرسال البريد الإلكتروني' });
      }
      return { success: true, message: 'تم إرسال الفاتورة بالبريد الإلكتروني بنجاح' };
    }),
    // SECURITY FIX (C2): was `protectedProcedure` -- upgraded to `tenantProcedure` so
    // `ctx.organizationId` is guaranteed non-null here (required since the C1 fix
    // below passes it directly to a function expecting a real number).
    summary: tenantProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role === 'parent') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }
      // SECURITY FIX (C1): pass the caller's own organizationId (from the trusted
      // server-side context, never client input) so results are scoped to their org.
      return db.getEnhancedFinanceSummary(ctx.organizationId);
    }),
    export: adminProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      // SECURITY FIX (C1): pass the caller's own organizationId so the export is
      // scoped to their org instead of returning every organization's invoices.
      return db.getFinanceExportData(ctx.organizationId, {
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
        status: input?.status,
      });
    }),
  }),

  payments: router({
    initiate: parentProcedure.input(z.object({
      invoiceId: z.number(),
      method: z.enum(['apple_pay', 'mada', 'visa', 'mastercard', 'stc_pay']),
      callbackUrl: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.invoiceId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      if (invoice.parentId !== ctx.user!.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      if (invoice.status === 'paid') throw new TRPCError({ code: 'BAD_REQUEST', message: 'الفاتورة مدفوعة بالفعل' });
      
      const { isMoyasarConfigured, createMoyasarPayment } = await import('./_core/moyasar');
      const amountInHalalas = Math.round(Number(invoice.total) * 100);
      
      // Determine source type based on payment method
      let sourceType: 'creditcard' | 'applepay' | 'stcpay' = 'creditcard';
      if (input.method === 'apple_pay') sourceType = 'applepay';
      if (input.method === 'stc_pay') sourceType = 'stcpay';
      
      const moyasarResponse = await createMoyasarPayment({
        amount: amountInHalalas,
        currency: 'SAR',
        description: `فاتورة ${invoice.invoiceNumber} - ${invoice.description || ''}`,
        callbackUrl: input.callbackUrl,
        source: { type: sourceType },
        metadata: {
          invoiceId: String(invoice.id),
          invoiceNumber: invoice.invoiceNumber,
          parentId: String(ctx.user!.id),
        },
      });
      
      // Create payment record
      const payment = await db.createPayment({
        invoiceId: input.invoiceId,
        parentId: ctx.user!.id,
        amount: invoice.total,
        currency: 'SAR',
        method: input.method,
        status: 'initiated',
        moyasarPaymentId: moyasarResponse.id,
        moyasarPaymentUrl: moyasarResponse.source?.transaction_url || '',
        callbackUrl: input.callbackUrl,
        metadata: moyasarResponse as any,
      });
      
      return {
        paymentId: payment.id,
        moyasarPaymentId: moyasarResponse.id,
        transactionUrl: moyasarResponse.source?.transaction_url || '',
        status: moyasarResponse.status,
        isConfigured: isMoyasarConfigured(),
      };
    }),
    // Save payment record from Moyasar on_completed callback (before redirect)
    saveFromMoyasar: protectedProcedure.input(z.object({
      moyasarPaymentId: z.string(),
      invoiceId: z.number(),
      amount: z.number(),
      method: z.enum(['apple_pay', 'mada', 'visa', 'mastercard', 'stc_pay']),
      status: z.string(),
    })).mutation(async ({ input, ctx }) => {
      // Check if payment already exists
      const existing = await db.getPaymentByMoyasarId(input.moyasarPaymentId);
      if (existing) return { paymentId: existing.id, status: 'exists' };
      // Verify invoice belongs to this parent
      const invoice = await db.getInvoiceById(input.invoiceId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: '\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629' });
      if (invoice.parentId !== ctx.user!.id) throw new TRPCError({ code: 'FORBIDDEN' });

      // SECURITY FIX (C5): previously trusted the client-supplied `input.status`
      // directly ('status: input.status === 'paid' ? 'paid' : 'initiated'') with no
      // server-side verification -- any authenticated parent could fabricate a
      // moyasarPaymentId and pass status:'paid' to create a fraudulent 'paid'
      // payment record with no real money having moved. Fixed by verifying the real
      // status with Moyasar first, the same pattern already used correctly by the
      // sibling `verify` procedure below -- input.status is no longer trusted at all.
      const { fetchMoyasarPayment, isMoyasarConfigured } = await import('./_core/moyasar');
      let verifiedStatus: 'paid' | 'initiated' = 'initiated';
      if (isMoyasarConfigured()) {
        const moyasarPayment = await fetchMoyasarPayment(input.moyasarPaymentId);
        if (moyasarPayment.status === 'paid') {
          verifiedStatus = 'paid';
        }
      }
      // If Moyasar isn't configured, the payment cannot be verified -- it is never
      // recorded as 'paid' in that case either, regardless of what the client
      // claims (matches how the sibling `verify` procedure also never marks
      // anything paid without an actual Moyasar confirmation).

      // Create payment record
      const payment = await db.createPayment({
        invoiceId: input.invoiceId,
        parentId: ctx.user!.id,
        amount: String(input.amount),
        currency: 'SAR',
        method: input.method,
        status: verifiedStatus,
        moyasarPaymentId: input.moyasarPaymentId,
        callbackUrl: '',
      });
      return { paymentId: payment.id, status: 'created' };
    }),
    verify: tenantProcedure.input(z.object({
      paymentId: z.number().optional(),
      moyasarPaymentId: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { fetchMoyasarPayment, isMoyasarConfigured } = await import('./_core/moyasar');

      let payment;
      if (input.paymentId) {
        payment = await db.getPaymentById(input.paymentId);
      } else if (input.moyasarPaymentId) {
        payment = await db.getPaymentByMoyasarId(input.moyasarPaymentId);
      }

      if (!payment) throw new TRPCError({ code: 'NOT_FOUND', message: 'الدفعة غير موجودة' });

      // SECURITY FIX: this procedure previously had NO ownership or organization
      // check at all -- ANY authenticated user, of any role and any
      // organization, could verify (and thereby mark paid, update the invoice,
      // and create a transaction record for) ANY payment in the entire system
      // by id or moyasarPaymentId. Restrict to the paying parent themselves, or
      // an admin-tier user whose organization matches the invoice's.
      const isAdminTier = ['admin', 'super_admin', 'principal', 'owner'].includes(ctx.user?.role || '');
      if (payment.parentId !== ctx.user!.id) {
        if (!isAdminTier) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }
        const relatedInvoice = await db.getInvoiceById(payment.invoiceId, ctx.organizationId ?? undefined);
        if (!relatedInvoice) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }
      }

      if (!isMoyasarConfigured()) {
        // Mock mode - simulate successful payment
        return { status: 'not_configured', message: 'بوابة الدفع غير مفعلة حالياً' };
      }
      
      // Verify with Moyasar
      const moyasarPayment = await fetchMoyasarPayment(payment.moyasarPaymentId!);
      
      if (moyasarPayment.status === 'paid') {
        // Use amount from Moyasar API (in halalas, convert to SAR) if local amount is 0 or missing
        const paymentAmount = Number(payment.amount) > 0 ? Number(payment.amount) : (moyasarPayment.amount / 100);
        await db.updatePayment(payment.id, { status: 'paid', paidAt: new Date(), amount: String(paymentAmount) });
        
        // Update invoice
        const invoice = await db.getInvoiceById(payment.invoiceId);
        if (invoice) {
          const newPaidAmount = Number(invoice.paidAmount || 0) + paymentAmount;
          const totalAmount = Number(invoice.total);
          const newStatus = newPaidAmount >= totalAmount ? 'paid' : 'partially_paid';
          await db.updateInvoice(payment.invoiceId, {
            status: newStatus,
            paidAt: newStatus === 'paid' ? new Date() : undefined,
            paymentMethod: payment.method,
            paidAmount: newPaidAmount.toFixed(2),
          });
          
          // Create transaction record
          await db.createTransaction({
            paymentId: payment.id,
            invoiceId: payment.invoiceId,
            parentId: payment.parentId,
            moyasarTransactionId: moyasarPayment.id,
            type: 'payment',
            amount: payment.amount,
            currency: 'SAR',
            status: 'completed',
            method: payment.method,
            cardBrand: moyasarPayment.source?.company || null,
            cardLast4: moyasarPayment.source?.number?.slice(-4) || null,
            description: `دفع فاتورة ${invoice.invoiceNumber}`,
          });
          
          // Notify parent of successful payment
          await db.createNotification({
            userId: payment.parentId,
            organizationId: invoice.organizationId,
            title: 'تم الدفع بنجاح',
            titleAr: 'تم الدفع بنجاح',
            body: `تم دفع الفاتورة ${invoice.invoiceNumber} بنجاح. المبلغ: ${Number(payment.amount).toLocaleString('ar-SA')} ر.س`,
            bodyAr: `تم دفع الفاتورة ${invoice.invoiceNumber} بنجاح. المبلغ: ${Number(payment.amount).toLocaleString('ar-SA')} ر.س`,
            type: 'payment',
            metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
          });
        }
        
        return { status: 'paid', message: 'تم الدفع بنجاح' };
      } else if (moyasarPayment.status === 'failed') {
        await db.updatePayment(payment.id, { status: 'failed' });
        
        // Notify parent of failed payment
        const invoice = await db.getInvoiceById(payment.invoiceId);
        if (invoice) {
          await db.createNotification({
            userId: payment.parentId,
            organizationId: invoice.organizationId,
            title: 'فشل الدفع',
            titleAr: 'فشل الدفع',
            body: `فشلت عملية دفع الفاتورة ${invoice.invoiceNumber}. يرجى المحاولة مرة أخرى.`,
            bodyAr: `فشلت عملية دفع الفاتورة ${invoice.invoiceNumber}. يرجى المحاولة مرة أخرى.`,
            type: 'payment',
            metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
          });
        }
        
        return { status: 'failed', message: 'فشلت عملية الدفع' };
      }
      
      return { status: moyasarPayment.status, message: 'جاري المعالجة' };
    }),
    history: parentProcedure.query(async ({ ctx }) => {
      return db.getPaymentsByParent(ctx.user!.id);
    }),
    // SECURITY FIX: getInvoiceById previously had no organizationId check --
    // any authenticated non-parent user (staff of ANY organization) could view
    // payment records for an invoice belonging to a different organization.
    byInvoice: tenantProcedure.input(z.object({ invoiceId: z.number() })).query(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.invoiceId, ctx.organizationId ?? undefined);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user?.role === 'parent' && invoice.parentId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return db.getPaymentsByInvoice(input.invoiceId);
    }),
    gatewayStatus: protectedProcedure.query(async ({ ctx }) => {
      const { isMoyasarConfigured, getMoyasarPublishableKey } = await import('./_core/moyasar');
      const db = await import('./db').then(m => m.getDb());
      let orgPublishableKey: string | null = null;
      let orgPaymentEnabled = false;
      if (db && ctx.user.organizationId) {
        const { organizations } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const [org] = await db.select({
          paymentEnabled: organizations.paymentEnabled,
          moyasarPublishableKey: organizations.moyasarPublishableKey,
        }).from(organizations).where(eq(organizations.id, ctx.user.organizationId));
        if (org) {
          orgPaymentEnabled = org.paymentEnabled;
          orgPublishableKey = org.moyasarPublishableKey;
        }
      }
      // Use org key if available and enabled, otherwise fall back to platform default
      const publishableKey = (orgPaymentEnabled && orgPublishableKey) 
        ? orgPublishableKey 
        : getMoyasarPublishableKey();
      return {
        isConfigured: isMoyasarConfigured() || orgPaymentEnabled,
        publishableKey,
      };
    }),
  }),

  transactions: router({
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // SECURITY FIX (C1): pass the caller's own organizationId so this only returns
      // their organization's transactions instead of every organization's.
      return db.getAllTransactions(ctx.organizationId, input?.limit || 100);
    }),
    // SECURITY FIX: getInvoiceById previously had no organizationId check --
    // any authenticated non-parent user (staff of ANY organization) could view
    // transaction records for an invoice belonging to a different organization.
    byInvoice: tenantProcedure.input(z.object({ invoiceId: z.number() })).query(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.invoiceId, ctx.organizationId ?? undefined);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user?.role === 'parent' && invoice.parentId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return db.getTransactionsByInvoice(input.invoiceId);
    }),
    byParent: parentProcedure.query(async ({ ctx }) => {
      return db.getTransactionsByParent(ctx.user!.id);
    }),
  }),

  refunds: router({
    create: adminProcedure.input(z.object({
      invoiceId: z.number(),
      transactionId: z.number(),
      amount: z.string(),
      reason: z.string(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: getInvoiceById previously had no organizationId check --
      // an admin from another organization could issue a refund against any
      // other organization's invoice by id.
      const invoice = await db.getInvoiceById(input.invoiceId, ctx.organizationId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });

      const { isMoyasarConfigured, createMoyasarRefund } = await import('./_core/moyasar');
      
      let moyasarRefundId: string | undefined;
      
      // Try to refund via Moyasar if configured
      if (isMoyasarConfigured()) {
        const payment = (await db.getPaymentsByInvoice(input.invoiceId)).find(p => p.status === 'paid');
        if (payment?.moyasarPaymentId) {
          const amountInHalalas = Math.round(parseFloat(input.amount) * 100);
          const refundResponse = await createMoyasarRefund(payment.moyasarPaymentId, amountInHalalas);
          moyasarRefundId = refundResponse.id;
        }
      }
      
      const refund = await db.createRefund({
        transactionId: input.transactionId,
        invoiceId: input.invoiceId,
        parentId: invoice.parentId,
        amount: input.amount,
        currency: 'SAR',
        reason: input.reason,
        status: moyasarRefundId ? 'completed' : 'pending',
        moyasarRefundId: moyasarRefundId || null,
        processedBy: ctx.user!.id,
        processedAt: new Date(),
      });
      
      // Update invoice paid amount
      const newPaidAmount = Math.max(0, Number(invoice.paidAmount || 0) - parseFloat(input.amount));
      await db.updateInvoice(input.invoiceId, {
        paidAmount: newPaidAmount.toFixed(2),
        status: newPaidAmount <= 0 ? 'pending' : 'partially_paid',
      }, ctx.organizationId);
      
      // Create refund transaction
      await db.createTransaction({
        paymentId: 0,
        invoiceId: input.invoiceId,
        parentId: invoice.parentId,
        moyasarTransactionId: moyasarRefundId || null,
        type: 'refund',
        amount: input.amount,
        currency: 'SAR',
        status: 'completed',
        method: 'refund',
        description: `استرداد - ${input.reason}`,
      });
      
      // Notify parent
      await db.createNotification({
        userId: invoice.parentId,
        organizationId: ctx.organizationId,
        title: 'تم الاسترداد',
        titleAr: 'تم الاسترداد',
        body: `تم استرداد مبلغ ${parseFloat(input.amount).toLocaleString('ar-SA')} ر.س من الفاتورة ${invoice.invoiceNumber}`,
        bodyAr: `تم استرداد مبلغ ${parseFloat(input.amount).toLocaleString('ar-SA')} ر.س من الفاتورة ${invoice.invoiceNumber}`,
        type: 'payment',
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      
      await db.createAuditLog({ userId: ctx.user!.id, action: 'create_refund', resource: 'refunds', resourceId: input.invoiceId, details: `Refund ${input.amount} SAR for invoice #${input.invoiceId}: ${input.reason}`, ipAddress: '' });
      return refund;
    }),
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // SECURITY FIX (C1): scope to the caller's own organization.
      return db.getAllRefunds(ctx.organizationId, input?.limit || 100);
    }),
  }),

  tuitionPlans: router({
    list: adminProcedure.query(async ({ ctx }) => {
      // SECURITY FIX (C1): scope to the caller's own organization.
      return db.getTuitionPlans(ctx.organizationId);
    }),
    create: adminProcedure.input(z.object({
      childId: z.number(),
      parentId: z.number(),
      name: z.string(),
      amount: z.string(),
      frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
      description: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously trusted input.childId/input.parentId with no
      // check that either belongs to the caller's organization -- since
      // tuition_plans has no organizationId column of its own (it's only
      // reachable via a join to children.organizationId, see
      // getTuitionPlanById/getTuitionPlans above), an admin from any
      // organization could attach a billing plan (amount, frequency,
      // recurring invoices) to another organization's child and parent.
      const child = await db.getChildById(input.childId, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      const planParent = await db.getUserById(input.parentId, ctx.organizationId);
      if (!planParent) throw new TRPCError({ code: 'NOT_FOUND', message: 'ولي الأمر غير موجود' });

      // Calculate next billing date based on start date
      const startDate = new Date(input.startDate);
      return db.createTuitionPlan({
        childId: input.childId,
        parentId: input.parentId,
        name: input.name,
        amount: input.amount,
        frequency: input.frequency,
        description: input.description || '',
        startDate,
        endDate: input.endDate ? new Date(input.endDate) : null,
        nextBillingDate: startDate,
        isActive: true,
        createdBy: ctx.user!.id,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      amount: z.string().optional(),
      frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      endDate: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id alone with no organization
      // check at all -- an admin from another organization could edit any
      // other organization's tuition plan (tuitionPlans has no organizationId
      // column of its own, so it's enforced via a join to children here).
      const existing = await db.getTuitionPlanById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'خطة الدفع غير موجودة' });
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.updateTuitionPlan(id, updateData);
      return { success: true };
    }),
    generateInvoices: adminProcedure.mutation(async ({ ctx }) => {
      // SECURITY FIX: previously took no organizationId at all -- ANY admin,
      // from ANY organization, calling this would generate recurring
      // invoices for every organization's due tuition plans in one shot, and
      // each invoice's organizationId was left unset (silently defaulting to
      // organization #1). Now scoped to the caller's own organization only.
      const generated = await db.generateInvoicesFromPlans(ctx.organizationId);
      // Notify parents for each generated invoice
      for (const invoice of generated) {
        await db.createNotification({
          userId: invoice.parentId,
          organizationId: ctx.organizationId,
          title: 'فاتورة شهرية جديدة',
          titleAr: 'فاتورة شهرية جديدة',
          body: `تم إنشاء فاتورة شهرية بمبلغ ${Number(invoice.total).toLocaleString('ar-SA')} ر.س - ${invoice.description}`,
          bodyAr: `تم إنشاء فاتورة شهرية بمبلغ ${Number(invoice.total).toLocaleString('ar-SA')} ر.س - ${invoice.description}`,
          type: 'payment',
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        });
      }
      return { generated: generated.length, invoices: generated };
    }),
  }),

  loyalty: router({
    // === Parent endpoints ===
    balance: protectedProcedure.query(async ({ ctx }) => {
      return db.getLoyaltyBalance(ctx.user!.id);
    }),
    transactions: protectedProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
      return db.getLoyaltyTransactions(ctx.user!.id, input?.limit);
    }),
    rewards: tenantProcedure.query(async ({ ctx }) => {
      // SECURITY FIX: previously returned every organization's reward
      // catalog with no filter.
      return db.getLoyaltyRewards(ctx.organizationId ?? undefined);
    }),
    redeem: tenantProcedure.input(z.object({ rewardId: z.number() })).mutation(async ({ ctx, input }) => {
      const rewards = await db.getLoyaltyRewards(ctx.organizationId ?? undefined);
      const reward = rewards.find(r => r.id === input.rewardId);
      if (!reward) throw new TRPCError({ code: 'NOT_FOUND', message: 'المكافأة غير موجودة' });
      const balance = await db.getLoyaltyBalance(ctx.user!.id);
      if (balance.points < reward.pointsCost) throw new TRPCError({ code: 'BAD_REQUEST', message: 'رصيد النقاط غير كافٍ' });
      if (reward.maxRedemptions && (reward.currentRedemptions ?? 0) >= reward.maxRedemptions) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تم استنفاد هذه المكافأة' });
      }
      await db.addLoyaltyPoints(ctx.user!.id, -reward.pointsCost, "redeemed", `استبدال: ${reward.nameAr}`);
      await db.createLoyaltyRedemption(ctx.user!.id, reward.id, reward.pointsCost);
      await db.incrementRewardRedemptions(reward.id);
      return { success: true };
    }),
    myRedemptions: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserRedemptions(ctx.user!.id);
    }),

    // === Admin endpoints ===
    addPoints: adminProcedure.input(z.object({
      userId: z.number(),
      points: z.number(),
      description: z.string(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously trusted input.userId with no check that
      // the target user belongs to the caller's organization -- any admin
      // could grant loyalty points to a user in a completely different
      // organization.
      const target = await db.getUserById(input.userId);
      if (!target || target.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      }
      await db.addLoyaltyPoints(input.userId, input.points, "earned", input.description);
      return { success: true };
    }),
    deductPoints: adminProcedure.input(z.object({
      userId: z.number(),
      points: z.number(),
      description: z.string(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: same as addPoints above.
      const target = await db.getUserById(input.userId);
      if (!target || target.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      }
      await db.addLoyaltyPoints(input.userId, -Math.abs(input.points), "adjusted", input.description);
      return { success: true };
    }),
    createReward: adminProcedure.input(z.object({
      name: z.string(),
      nameAr: z.string(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      pointsCost: z.number(),
      category: z.enum(["discount", "free_day", "gift", "upgrade", "custom"]).optional(),
      maxRedemptions: z.number().nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously never stamped organizationId -- every
      // organization's reward catalog was shared.
      return db.createLoyaltyReward({ ...input, organizationId: ctx.organizationId ?? undefined });
    }),
    updateReward: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      pointsCost: z.number().optional(),
      category: z.enum(["discount", "free_day", "gift", "upgrade", "custom"]).optional(),
      isActive: z.boolean().optional(),
      maxRedemptions: z.number().nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id with no ownership check --
      // any admin could edit another organization's reward by id.
      const { id, ...data } = input;
      const existing = await db.getLoyaltyRewardById(id, ctx.organizationId ?? undefined);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'المكافأة غير موجودة' });
      return db.updateLoyaltyReward(id, data, ctx.organizationId ?? undefined);
    }),
    deleteReward: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: same as updateReward above.
      const existing = await db.getLoyaltyRewardById(input.id, ctx.organizationId ?? undefined);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'المكافأة غير موجودة' });
      return db.deleteLoyaltyReward(input.id, ctx.organizationId ?? undefined);
    }),
    // Settings
    getSettings: adminProcedure.query(async ({ ctx }) => {
      // SECURITY FIX: previously read an arbitrary settings row with no
      // WHERE clause at all -- every organization's loyalty program
      // configuration was reading from whichever row happened to come
      // back first.
      return db.getLoyaltySettings(ctx.organizationId);
    }),
    updateSettings: adminProcedure.input(z.object({
      pointsPerReferral: z.number().optional(),
      pointsPerOnTimePayment: z.number().optional(),
      pointsPerPerfectAttendanceWeek: z.number().optional(),
      pointsPerEventParticipation: z.number().optional(),
      pointsPerSurveyCompletion: z.number().optional(),
      pointsPerEarlyPickup: z.number().optional(),
      isActive: z.boolean().optional(),
      welcomeBonus: z.number().optional(),
      birthdayBonus: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously hardcoded `WHERE id = 1` -- every
      // organization's admin was silently overwriting the SAME single
      // settings row (points-per-action rules, welcome/birthday bonus)
      // shared by every other organization.
      return db.updateLoyaltySettings(input, ctx.organizationId);
    }),
    // All parents points (admin view)
    allParentsPoints: adminProcedure.query(async ({ ctx }) => {
      // SECURITY FIX: previously returned every parent's loyalty balance
      // across every organization on the platform.
      return db.getAllParentsLoyaltyPoints(ctx.organizationId ?? undefined);
    }),
    // All redemptions (admin view)
    allRedemptions: adminProcedure.query(async ({ ctx }) => {
      // SECURITY FIX: previously returned every organization's redemptions.
      return db.getAllRedemptions(ctx.organizationId ?? undefined);
    }),
    // Update redemption status
    updateRedemptionStatus: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["approved", "fulfilled", "rejected"]),
      adminNote: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id with no ownership check --
      // any admin could approve/reject/fulfill any other organization's
      // redemption by id.
      return db.updateRedemptionStatus(input.id, input.status, input.adminNote, ctx.organizationId ?? undefined);
    }),

    // SECURITY FIX (policy: full tenant isolation, Super Admin is the only
    // cross-org exception): loyalty_partners, loyalty_cards, and
    // loyalty_card_templates have NO organizationId column -- this is a
    // single shared "Nashaa loyalty" partner network, card, and template
    // catalog spanning every nursery on the platform (confirmed intentional
    // by the shared branding in the QR payload: `naashah_loyalty`, and by
    // there being no per-org variant of this feature anywhere in the UI).
    // Read-only catalog data (`partners`, `cardTemplates`) contains no
    // tenant-identifying or per-user PII -- it is just the shared list of
    // discount partners and card designs -- so it staying visible to any
    // authenticated user cannot expose one nursery's private data to
    // another and is left as `protectedProcedure`. `myCard`/`generateCard`
    // only ever read/write the calling user's own card (`ctx.user!.id`), so
    // they are also safe as-is. Everything else here is either (a) a
    // platform-wide catalog *write* (adding/editing/deleting a shared
    // partner or template that every nursery's parents will see) or (b) a
    // bulk read of every nursery's cardholders' names/emails/points in one
    // call (`allCards`) -- both were previously gated only by the local
    // per-organization `adminProcedure` (any org's own admin), which let
    // any single nursery's admin edit the platform-wide shared catalog or
    // view every other nursery's parents' loyalty data. These are now
    // restricted to the real platform Super Admin via the shared
    // `superAdminProcedure`. `validateCard` (used to scan/validate one
    // specific card by number) is by-id, not bulk, but previously had no
    // ownership check at all, so any authenticated staff member could
    // validate any other nursery's parent's card by number and see that
    // parent's name and points balance -- it now verifies the card's owner
    // is in the caller's own organization unless the caller is super_admin.
    // === Partners ===
    partners: protectedProcedure.query(async () => {
      return db.getLoyaltyPartners();
    }),
    allPartners: superAdminProcedure.query(async () => {
      return db.getAllLoyaltyPartners();
    }),
    createPartner: superAdminProcedure.input(z.object({
      name: z.string(),
      nameAr: z.string(),
      logoUrl: z.string().optional(),
      discountDescription: z.string().optional(),
      discountDescriptionAr: z.string().optional(),
      discountPercentage: z.number().optional(),
      contactInfo: z.string().optional(),
      website: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createLoyaltyPartner(input);
    }),
    updatePartner: superAdminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      logoUrl: z.string().optional(),
      discountDescription: z.string().optional(),
      discountDescriptionAr: z.string().optional(),
      discountPercentage: z.number().optional(),
      contactInfo: z.string().optional(),
      website: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateLoyaltyPartner(id, data);
    }),
    deletePartner: superAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteLoyaltyPartner(input.id);
    }),

    // === Cards ===
    myCard: protectedProcedure.query(async ({ ctx }) => {
      return db.getLoyaltyCard(ctx.user!.id);
    }),
    generateCard: protectedProcedure.input(z.object({ templateId: z.number().optional() }).optional()).mutation(async ({ ctx, input }) => {
      // Check if user already has a card
      const existing = await db.getLoyaltyCard(ctx.user!.id);
      if (existing) return existing;
      // Generate unique card number: NSH-XXXX-XXXX-XXXX
      const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      const cardNumber = `NSH-${rand()}-${rand()}-${rand()}`;
      const qrCodeData = JSON.stringify({ type: 'naashah_loyalty', card: cardNumber, userId: ctx.user!.id });
      const templateId = input?.templateId ?? 1;
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      await db.createLoyaltyCard(ctx.user!.id, cardNumber, qrCodeData, templateId, expiryDate);
      return db.getLoyaltyCard(ctx.user!.id);
    }),
    allCards: superAdminProcedure.query(async () => {
      return db.getAllLoyaltyCards();
    }),
    validateCard: tenantProcedure.input(z.object({ cardNumber: z.string() })).query(async ({ ctx, input }) => {
      const card = await db.getCardByNumber(input.cardNumber);
      if (!card) return null;
      // SECURITY FIX: reject cross-tenant card validation -- a card whose
      // owning user belongs to a different organization than the caller
      // must not be readable, unless the caller is the platform super_admin.
      // Returning null (not FORBIDDEN) so this behaves identically to "card
      // not found" from the caller's point of view and doesn't confirm the
      // card number exists in another org.
      if (ctx.user!.role !== 'super_admin' && card.userOrganizationId !== (ctx.organizationId ?? null)) {
        return null;
      }
      return card;
    }),
    cardTemplates: protectedProcedure.query(async () => {
      return db.getCardTemplates();
    }),
    createCardTemplate: superAdminProcedure.input(z.object({
      name: z.string(),
      nameAr: z.string(),
      backgroundColor: z.string(),
      textColor: z.string(),
      accentColor: z.string(),
      backgroundPattern: z.enum(["solid", "gradient", "dots", "waves"]).optional(),
      logoUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createCardTemplate(input);
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotifications(ctx.user!.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user!.id);
    }),
    // SECURITY FIX: previously called markNotificationRead with no
    // ownership check -- any authenticated user could mark any other
    // user's notification as read by guessing/enumerating its id.
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.markNotificationRead(input.id, ctx.user!.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user!.id);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteNotification(input.id, ctx.user!.id);
      return { success: true };
    }),
    deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
      await db.deleteAllNotifications(ctx.user!.id);
      return { success: true };
    }),
    // ============ INTEGRATION STATUS ============
    integrationStatus: adminProcedure.query(async () => {
      const { isSmsConfigured } = await import('./services/smsService');
      const { isEmailConfigured } = await import('./services/emailService');
      
      const smsConfigured = isSmsConfigured();
      const emailConfigured = isEmailConfigured();
      
      return {
        sms: {
          configured: smsConfigured,
          details: {
            hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
            hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
            hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
            phoneNumber: process.env.TWILIO_PHONE_NUMBER ? process.env.TWILIO_PHONE_NUMBER.replace(/(.{4}).*(.{4})/, '$1****$2') : undefined,
            enabled: process.env.SMS_ENABLED === 'true',
          },
        },
        email: {
          configured: emailConfigured,
          details: {
            hasApiKey: !!process.env.SENDGRID_API_KEY,
            hasFromAddress: !!process.env.EMAIL_FROM,
            fromAddress: process.env.EMAIL_FROM || undefined,
            hasFromName: !!process.env.EMAIL_FROM_NAME,
            fromName: process.env.EMAIL_FROM_NAME || undefined,
            enabled: process.env.EMAIL_ENABLED === 'true',
          },
        },
      };
    }),
    testSms: adminProcedure.mutation(async () => {
      const { sendOtpSms, isSmsConfigured } = await import('./services/smsService');
      if (!isSmsConfigured()) {
        return { success: false, message: 'خدمة الرسائل القصيرة غير مُفعّلة' };
      }
      try {
        const result = await sendOtpSms(process.env.TWILIO_PHONE_NUMBER || '', '123456');
        return { success: result.sent, message: result.message };
      } catch (e: any) {
        return { success: false, message: e.message || 'فشل إرسال الرسالة التجريبية' };
      }
    }),
    getConfig: adminProcedure.query(async ({ ctx }) => {
      const dbConn = await getSharedDb();
      if (!dbConn) return {};
      // SECURITY FIX: previously `ctx.user?.organizationId ?? 1` -- an admin
      // whose user record somehow lacked organizationId would silently read
      // organization #1's live SMS/email provider credentials (Twilio
      // account SID/auth token, SendGrid API key) instead of being rejected.
      // adminProcedure is built on tenantProcedure, so ctx.organizationId is
      // guaranteed non-null; use it directly.
      const orgId = ctx.organizationId;
      const rows = await dbConn.select().from(integrationConfig).where(eq(integrationConfig.organizationId, orgId));
      const config: Record<string, Record<string, string>> = {};
      for (const row of rows) {
        if (!config[row.provider]) config[row.provider] = {};
        config[row.provider][row.configKey] = row.configValue || '';
      }
      return config;
    }),
    saveConfig: adminProcedure.input(z.object({
      provider: z.enum(['twilio', 'sendgrid']),
      settings: z.record(z.string(), z.string()),
    })).mutation(async ({ ctx, input }) => {
      const dbConn = await getSharedDb();
      if (!dbConn) throw new Error('Database connection failed');
      // SECURITY FIX: previously `ctx.user?.organizationId ?? 1` -- an admin
      // whose user record somehow lacked organizationId would silently
      // OVERWRITE organization #1's live Twilio/SendGrid credentials instead
      // of being rejected. Use the guaranteed-non-null ctx.organizationId.
      const orgId = ctx.organizationId;
      for (const [key, value] of Object.entries(input.settings)) {
        await dbConn.insert(integrationConfig).values({
          organizationId: orgId,
          provider: input.provider,
          configKey: key,
          configValue: value,
        }).onDuplicateKeyUpdate({
          set: { configValue: value },
        });
      }
      // Update process.env so the service picks up new values immediately
      if (input.provider === 'twilio') {
        if (input.settings.account_sid) process.env.TWILIO_ACCOUNT_SID = input.settings.account_sid;
        if (input.settings.auth_token) process.env.TWILIO_AUTH_TOKEN = input.settings.auth_token;
        if (input.settings.phone_number) process.env.TWILIO_PHONE_NUMBER = input.settings.phone_number;
        if (input.settings.enabled !== undefined) process.env.SMS_ENABLED = input.settings.enabled;
      } else if (input.provider === 'sendgrid') {
        if (input.settings.api_key) process.env.SENDGRID_API_KEY = input.settings.api_key;
        if (input.settings.from_address) process.env.EMAIL_FROM = input.settings.from_address;
        if (input.settings.from_name) process.env.EMAIL_FROM_NAME = input.settings.from_name;
        if (input.settings.enabled !== undefined) process.env.EMAIL_ENABLED = input.settings.enabled;
      }
      return { success: true };
    }),
    testEmail: adminProcedure.mutation(async () => {
      const { sendOtpEmail, isEmailConfigured } = await import('./services/emailService');
      if (!isEmailConfigured()) {
        return { success: false, message: 'خدمة البريد الإلكتروني غير مُفعّلة' };
      }
      try {
        const result = await sendOtpEmail(process.env.EMAIL_FROM || 'test@naashah.com', '123456');
        return { success: result.sent, message: result.message };
      } catch (e: any) {
        return { success: false, message: e.message || 'فشل إرسال البريد التجريبي' };
      }
    }),
  }),

  // SECURITY FIX: getById/children previously had no organizationId check
  // at all (any authenticated user could read another organization's class
  // or list its children by id); create never set organizationId (silently
  // defaulted to organization #1); update/delete had no fetch-and-verify
  // before mutating by id.
  classes: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      const classList = await db.getClasses(ctx.organizationId);
      const enriched = await Promise.all(classList.map(async (cls: any) => {
        let teacherName = '';
        if (cls.teacherId) {
          const teacher = await db.getUserById(cls.teacherId);
          teacherName = teacher?.name || '';
        }
        return { ...cls, teacherName };
      }));
      return enriched;
    }),
    getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const classRecord = await db.getClassById(input.id, ctx.organizationId);
      if (!classRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفصل غير موجود' });
      return classRecord;
    }),
    children: tenantProcedure.input(z.object({ classId: z.number() })).query(async ({ input, ctx }) => {
      return db.getChildrenByClass(input.classId, ctx.organizationId);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      ageGroup: z.string().optional(),
      capacity: z.number().optional(),
      teacherId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createClass({ ...input, organizationId: ctx.organizationId });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      ageGroup: z.string().optional(),
      capacity: z.number().optional(),
      teacherId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const existing = await db.getClassById(id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفصل غير موجود' });
      return db.updateClass(id, data, ctx.organizationId);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const existing = await db.getClassById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفصل غير موجود' });
      const result = await db.deleteClass(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_class', resource: 'classes', resourceId: input.id, details: `Deleted class #${input.id}`, ipAddress: '' });
      return result;
    }),
  }),

  staffAttendance: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      return db.getTodayStaffAttendance(ctx.user!.id);
    }),
    byDate: adminProcedure.input(z.object({ date: z.string() })).query(async ({ input, ctx }) => {
      return db.getStaffAttendanceByDate(input.date, ctx.organizationId);
    }),
    myHistory: tenantProcedure.query(async ({ ctx }) => {
      return db.getStaffAttendanceByUser(ctx.user!.id, ctx.organizationId ?? undefined);
    }),
    userHistory: adminProcedure.input(z.object({ userId: z.number() })).query(async ({ input, ctx }) => {
      return db.getStaffAttendanceByUser(input.userId, ctx.organizationId);
    }),
    checkIn: tenantProcedure.input(z.object({
      gpsLat: z.number(),
      gpsLng: z.number(),
      device: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Verify GPS is within center radius
      const settings = await db.getCenterSettings(ctx.organizationId ?? undefined);
      if (settings && settings.latitude && settings.longitude && settings.allowedRadius) {
        const distance = getDistanceKm(input.gpsLat, input.gpsLng, Number(settings.latitude), Number(settings.longitude));
        const radiusKm = Number(settings.allowedRadius) / 1000;
        if (distance > radiusKm) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'أنت خارج نطاق المركز. يرجى التواجد داخل المركز لتسجيل الحضور.' });
        }
      }
      return db.staffCheckIn({
        userId: ctx.user!.id,
        date: new Date(),
        checkInTime: new Date(),
        gpsLatIn: input.gpsLat.toString(),
        gpsLngIn: input.gpsLng.toString(),
        device: input.device,
        status: 'checked_in',
        organizationId: ctx.organizationId,
      });
    }),
    checkOut: protectedProcedure.input(z.object({
      id: z.number(),
      gpsLat: z.number(),
      gpsLng: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // SECURITY FIX: previously updated the attendance record by id alone
      // with NO check that it even belongs to the caller -- any
      // authenticated user, of any role and any organization, could check
      // out (overwriting checkOutTime/GPS) any other staff member's
      // attendance record on the entire platform by guessing/enumerating
      // its numeric id.
      const record = await db.getStaffAttendanceById(input.id);
      if (!record || record.userId !== ctx.user!.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'سجل الحضور غير موجود' });
      }
      await db.staffCheckOut(input.id, {
        checkOutTime: new Date(),
        gpsLatOut: input.gpsLat.toString(),
        gpsLngOut: input.gpsLng.toString(),
      });
      return { success: true };
    }),
    adminCheckOut: adminProcedure.input(z.object({
      id: z.number(),
      checkOutTime: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // SECURITY FIX: previously updated the attendance record by id alone
      // with no organization check -- any admin could manually check out
      // (and attach admin notes to) another organization's staff attendance
      // record by id.
      const record = await db.getStaffAttendanceById(input.id, ctx.organizationId);
      if (!record) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'سجل الحضور غير موجود' });
      }
      const checkOutTime = input.checkOutTime ? new Date(input.checkOutTime) : new Date();
      await db.staffCheckOut(input.id, {
        checkOutTime,
        notes: input.notes ? `[تسجيل خروج يدوي بواسطة الإدارة] ${input.notes}` : '[تسجيل خروج يدوي بواسطة الإدارة]',
      });
      return { success: true };
    }),

    // ============ QUICK CHECK-IN (No GPS required) ============
    quickCheckIn: tenantProcedure.input(z.object({
      device: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Check if already checked in today
      const existing = await db.getTodayStaffAttendance(ctx.user!.id);
      if (existing && existing.checkInTime) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تم تسجيل وصولك مسبقاً اليوم.' });
      }
      return db.staffCheckIn({
        userId: ctx.user!.id,
        date: new Date(),
        checkInTime: new Date(),
        device: input.device,
        status: 'checked_in',
        isLateRecord: false,
        organizationId: ctx.organizationId,
      });
    }),

    // ============ QUICK CHECK-OUT (No GPS required) ============
    quickCheckOut: protectedProcedure.input(z.object({
      device: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const existing = await db.getTodayStaffAttendance(ctx.user!.id);
      if (!existing || !existing.checkInTime) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'لم يتم تسجيل وصولك اليوم بعد.' });
      }
      if (existing.checkOutTime) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تم تسجيل انصرافك مسبقاً اليوم.' });
      }
      await db.staffCheckOut(existing.id, {
        checkOutTime: new Date(),
        status: 'checked_out',
      });
      return { success: true };
    }),

    // ============ LATE CHECK-IN (with reason) ============
    lateCheckIn: tenantProcedure.input(z.object({
      actualTime: z.string(), // ISO string of the actual arrival time
      reason: z.string().min(1, 'يرجى كتابة سبب التسجيل المتأخر'),
      device: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Check if already checked in today
      const existing = await db.getTodayStaffAttendance(ctx.user!.id);
      if (existing && existing.checkInTime) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تم تسجيل وصولك مسبقاً اليوم.' });
      }
      const actualTime = new Date(input.actualTime);
      return db.staffCheckIn({
        userId: ctx.user!.id,
        date: new Date(),
        checkInTime: new Date(), // recorded now
        actualCheckInTime: actualTime, // actual arrival time
        device: input.device,
        status: 'checked_in',
        isLateRecord: true,
        lateReason: input.reason,
        organizationId: ctx.organizationId,
      });
    }),

    // ============ LATE CHECK-OUT (with reason) ============
    lateCheckOut: protectedProcedure.input(z.object({
      actualTime: z.string(), // ISO string of the actual departure time
      reason: z.string().min(1, 'يرجى كتابة سبب التسجيل المتأخر'),
      device: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const existing = await db.getTodayStaffAttendance(ctx.user!.id);
      if (!existing || !existing.checkInTime) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'لم يتم تسجيل وصولك اليوم بعد.' });
      }
      if (existing.checkOutTime) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تم تسجيل انصرافك مسبقاً اليوم.' });
      }
      const actualTime = new Date(input.actualTime);
      await db.staffCheckOut(existing.id, {
        checkOutTime: new Date(), // recorded now
        actualCheckOutTime: actualTime, // actual departure time
        status: 'checked_out',
        isLateRecord: true,
        lateReason: input.reason,
      });
      return { success: true };
    }),

    // ============ ADMIN: Get all attendance with late records highlighted ============
    // SECURITY FIX: previously called getStaffAttendanceByDate with no
    // organizationId at all -- any organization's admin saw every
    // organization's staff attendance (check-in/out times, status, late
    // reasons) for the current day, platform-wide. Now filtered by
    // ctx.organizationId, same as the sibling `byDate` endpoint above.
    allToday: adminProcedure.query(async ({ ctx }) => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      return db.getStaffAttendanceByDate(dateStr, ctx.organizationId);
    }),
  }),

  centerSettings: router({
    get: adminProcedure.query(async ({ ctx }) => {
      return db.getCenterSettings(ctx.organizationId);
    }),
    update: adminProcedure.input(z.object({
      name: z.string().optional(),
      nameAr: z.string().optional(),
      gpsLat: z.string().optional(),
      gpsLng: z.string().optional(),
      gpsRadius: z.number().optional(),
      workingHoursStart: z.string().optional(),
      workingHoursEnd: z.string().optional(),
      timezone: z.string().optional(),
      vatNumber: z.string().optional(),
      commercialRegister: z.string().optional(),
      logoUrl: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const mapped: any = {};
      if (input.name) mapped.centerName = input.name;
      if (input.gpsLat) mapped.latitude = input.gpsLat;
      if (input.gpsLng) mapped.longitude = input.gpsLng;
      if (input.gpsRadius) mapped.allowedRadius = input.gpsRadius;
      if (input.workingHoursStart) mapped.workingHoursStart = input.workingHoursStart;
      if (input.workingHoursEnd) mapped.workingHoursEnd = input.workingHoursEnd;
      if (input.vatNumber !== undefined) mapped.vatNumber = input.vatNumber;
      if (input.commercialRegister !== undefined) mapped.commercialRegister = input.commercialRegister;
      if (input.logoUrl !== undefined) mapped.logoUrl = input.logoUrl;
      return db.updateCenterSettings(mapped, ctx.organizationId);
    }),
  }),

  dailyActivities: router({
    byChild: tenantProcedure.input(z.object({ childId: z.number(), date: z.string().optional() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        // SECURITY FIX: staff/admin previously had no ownership check --
        // any authenticated non-parent user could read another
        // organization's child activity log by id.
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getDailyActivities(input.childId, input.date, ctx.organizationId ?? undefined);
    }),
    byClass: teacherProcedure.input(z.object({ classId: z.number(), date: z.string() })).query(async ({ input, ctx }) => {
      // SECURITY FIX: previously had no organization check at all -- any
      // teacher/admin could read another organization's class activity log
      // by classId.
      const cls = await db.getClassById(input.classId, ctx.organizationId);
      if (!cls) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفصل غير موجود' });
      return db.getDailyActivitiesByClass(input.classId, input.date, ctx.organizationId);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      classId: z.number().optional(),
      type: z.enum(['arrival', 'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'nap_start', 'nap_end', 'diaper', 'toilet', 'medication', 'mood', 'learning_activity', 'outdoor_play', 'departure', 'meal', 'snack', 'water', 'indoor_play', 'temperature', 'photo', 'note', 'observation']),
      title: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      metadata: z.any().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created an activity for any childId with
      // no verification it belongs to the caller's organization, and never
      // stamped organizationId on the new row.
      const ownedChild = await db.getChildById(input.childId, ctx.organizationId);
      if (!ownedChild) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      const activity = await db.createDailyActivity({ ...input, recordedBy: ctx.user!.id, recordedAt: new Date(), organizationId: ctx.organizationId });
      // Push notification to parent for key activities
      const notifiableTypes = ['arrival', 'departure', 'medication', 'mood', 'learning_activity', 'photo', 'observation', 'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'meal', 'snack', 'nap_start', 'nap_end', 'diaper', 'toilet', 'water', 'temperature', 'outdoor_play', 'indoor_play'];
      if (notifiableTypes.includes(input.type)) {
        try {
          const child = ownedChild;
          if (child?.parentId) {
            const activityLabels: Record<string, string> = {
              arrival: 'وصول', departure: 'مغادرة', medication: 'دواء',
              mood: 'حالة مزاجية', learning_activity: 'نشاط تعليمي',
              photo: 'صورة جديدة', observation: 'ملاحظة',
              breakfast: 'إفطار', morning_snack: 'وجبة خفيفة صباحية',
              lunch: 'غداء', afternoon_snack: 'وجبة خفيفة مسائية',
              meal: 'وجبة', snack: 'وجبة خفيفة',
              nap_start: 'بداية القيلولة', nap_end: 'نهاية القيلولة',
              diaper: 'تغيير حفاض', toilet: 'دورة مياه',
              water: 'شرب ماء', temperature: 'درجة الحرارة',
              outdoor_play: 'لعب خارجي', indoor_play: 'لعب داخلي',
            };
            const label = activityLabels[input.type] || 'نشاط';
            await db.createNotification({
              userId: child.parentId,
              organizationId: ctx.organizationId,
              title: `${label} - ${child.firstName}`,
              titleAr: `${label} - ${child.firstName}`,
              body: input.title || `تم تسجيل ${label} لـ ${child.firstName}`,
              bodyAr: input.title || `تم تسجيل ${label} لـ ${child.firstName}`,
              type: 'activity',
              link: '/parent/daily-report',
            });
            const { sendPushToUser } = await import('./_core/webPush');
            const pushResult = await sendPushToUser(child.parentId, {
              title: `${label} - ${child.firstName}`,
              body: input.title || `تم تسجيل ${label} لـ ${child.firstName}`,
              tag: `activity_${input.type}`,
              data: { type: 'activity', childId: input.childId, url: '/parent/daily-report' },
            }, db.getPushSubscriptionsForUser);
            if (pushResult.expired.length > 0) await db.removeExpiredSubscriptions(pushResult.expired);
          }
        } catch (e) { /* non-critical */ }
      }
      return activity;
    }),
  }),

  // SECURITY FIX: child_departures has no organizationId column, so
  // byDate/byChild previously leaked every organization's pickup records
  // platform-wide to any authenticated staff/admin, and create() never
  // verified the childId belongs to the caller's organization. Fixed via
  // an org-scoped join in db.ts (same pattern as childDocuments) plus a
  // fetch-and-verify on childId before create.
  departures: router({
    byDate: tenantProcedure.input(z.object({ date: z.string() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getDeparturesByDateForChildren(input.date, childIds);
      }
      return db.getDeparturesByDate(input.date, ctx.organizationId ?? undefined);
    }),
    byChild: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        return db.getDeparturesByChild(input.childId);
      }
      const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return db.getDeparturesByChild(input.childId, ctx.organizationId ?? undefined);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      attendanceId: z.number().optional(),
      departureTime: z.string(),
      pickedUpBy: z.string().min(1),
      relationship: z.enum(['mother', 'father', 'driver', 'grandparent', 'guardian', 'other']),
      pickedUpById: z.number().optional(),
      notes: z.string().optional(),
      status: z.enum(['completed', 'pending', 'late']).optional(),
    })).mutation(async ({ input, ctx }) => {
      const ownedChild = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
      if (!ownedChild) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return db.createDeparture({
        ...input,
        departureTime: new Date(input.departureTime),
        recordedBy: ctx.user!.id,
      });
    }),
  }),
  media: router({
    createUploadUrl: teacherProcedure.input(z.object({
      type: z.enum(['photo', 'video']),
      contentType: z.string().trim().min(1).max(100),
      fileSize: z.number().int().positive(),
    })).mutation(async ({ input, ctx }) => {
      try {
        return await createDirectMediaUpload({
          organizationId: ctx.organizationId,
          userId: ctx.user!.id,
          type: input.type,
          contentType: input.contentType,
          fileSize: input.fileSize,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'UNSUPPORTED_MEDIA_TYPE') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP أو MP4 أو MOV أو WebM',
          });
        }
        if (error instanceof Error && error.message === 'INVALID_MEDIA_SIZE') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: input.type === 'video'
              ? 'حجم الفيديو يتجاوز الحد المسموح (250 ميجابايت)'
              : 'حجم الصورة يتجاوز الحد المسموح (20 ميجابايت)',
          });
        }
        console.error('[Media] Failed to create direct upload URL:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'تعذّر تجهيز رابط الرفع حالياً',
        });
      }
    }),
    upload: teacherProcedure.input(z.object({
      type: z.enum(['photo', 'video']),
      url: z.string(),
      fileKey: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      caption: z.string().optional(),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
      classId: z.number().optional(),
      visibility: z.enum(['class', 'specific']).optional(),
      childIds: z.array(z.number()).max(200).optional(),
    })).mutation(async ({ input, ctx }) => {
      // Backward-compatible single-file finalization. File bytes still must
      // have been uploaded directly to an organization-owned R2 staging key;
      // arbitrary client URLs are never trusted as stored media.
      if (!input.fileKey) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'مفتاح ملف R2 مطلوب' });
      }
      if (input.classId && !await db.getClassById(input.classId, ctx.organizationId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'الفصل المحدد غير موجود' });
      }
      const uniqueChildIds = Array.from(new Set(input.childIds || []));
      const ownedChildren = await db.getChildrenByIds(uniqueChildIds, ctx.organizationId);
      if (ownedChildren.length !== uniqueChildIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تتضمن القائمة طفلاً غير صالح' });
      }
      let verified;
      try {
        verified = await verifyDirectMediaUpload({
          organizationId: ctx.organizationId,
          type: input.type,
          fileKey: input.fileKey,
        });
      } catch (error) {
        console.error('[Media] Direct single upload verification failed:', error);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تعذّر التحقق من الملف المرفوع؛ أعد رفعه وحاول مجدداً' });
      }
      let media;
      try {
        media = await db.createMedia({
          ...input,
          ...verified,
          childIds: uniqueChildIds,
          uploadedBy: ctx.user!.id,
          organizationId: ctx.organizationId,
        });
      } catch (error) {
        await storageDelete(verified.fileKey).catch(() => undefined);
        console.error('[Media] Failed to persist verified single upload:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'تعذّر حفظ الملف المرفوع' });
      }
      // Push notification to parents of tagged children
      if (input.childIds && input.childIds.length > 0) {
        try {
          const { sendPushToUser } = await import('./_core/webPush');
          const notifiedParents = new Set<number>();
          for (const childId of uniqueChildIds) {
            const child = ownedChildren.find(item => item.id === childId);
            if (child?.parentId && !notifiedParents.has(child.parentId)) {
              notifiedParents.add(child.parentId);
              const mediaLabel = input.type === 'photo' ? 'صورة جديدة' : 'فيديو جديد';
              await db.createNotification({
                userId: child.parentId,
                organizationId: ctx.organizationId,
                title: `${mediaLabel} لـ ${child.firstName}`,
                titleAr: `${mediaLabel} لـ ${child.firstName}`,
                body: input.caption || `تم إضافة ${mediaLabel} لـ ${child.firstName}`,
                bodyAr: input.caption || `تم إضافة ${mediaLabel} لـ ${child.firstName}`,
                type: 'activity',
                link: '/parent/photos',
              });
              await sendPushToUser(child.parentId, {
                title: `${mediaLabel} 📷`,
                body: input.caption || `تم إضافة ${mediaLabel} لـ ${child.firstName}`,
                tag: 'new_media',
                data: { type: 'media', childId, url: '/parent/photos' },
              }, db.getPushSubscriptionsForUser);
            }
          }
        } catch (e) { /* non-critical */ }
      }
      return media;
    }),
    uploadBatch: teacherProcedure.input(z.object({
      items: z.array(z.object({
        type: z.enum(['photo', 'video']),
        fileKey: z.string().trim().min(1).max(500),
        caption: z.string().trim().max(1_000).optional(),
      })).min(1).max(20),
      classId: z.number().optional(),
      visibility: z.enum(['class', 'specific']).optional(),
      childIds: z.array(z.number()).max(200).optional(),
    })).mutation(async ({ input, ctx }) => {
      if (input.classId) {
        const ownedClass = await db.getClassById(input.classId, ctx.organizationId);
        if (!ownedClass) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'الفصل المحدد غير موجود' });
        }
      }

      const uniqueChildIds = Array.from(new Set(input.childIds || []));
      const ownedChildren = await db.getChildrenByIds(uniqueChildIds, ctx.organizationId);
      if (ownedChildren.length !== uniqueChildIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'تتضمن القائمة طفلاً غير صالح' });
      }

      const verificationResults = await Promise.allSettled(input.items.map(async item => ({
          ...await verifyDirectMediaUpload({
            organizationId: ctx.organizationId,
            type: item.type,
            fileKey: item.fileKey,
          }),
          type: item.type,
          caption: item.caption,
      })));
      const verifiedItems = verificationResults.flatMap(result =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      const verificationFailed = verificationResults.some(result => result.status === 'rejected');
      if (verificationFailed) {
        // Some objects may already have been promoted from staging. Remove
        // those successful promotions so a failed batch never leaves orphaned
        // R2 data behind.
        await Promise.allSettled(verifiedItems.map(item => storageDelete(item.fileKey)));
        const firstFailure = verificationResults.find(result => result.status === 'rejected');
        console.error('[Media] Direct upload verification failed:', firstFailure);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'تعذّر التحقق من أحد الملفات المرفوعة؛ أعد رفعه وحاول مجدداً',
        });
      }

      let results;
      try {
        results = await db.createMediaBatch(verifiedItems.map(item => ({
          ...item,
          classId: input.classId,
          visibility: input.visibility,
          childIds: uniqueChildIds,
          uploadedBy: ctx.user!.id,
          organizationId: ctx.organizationId,
        })));
      } catch (error) {
        // The database transaction rolled back, so no row references these
        // promoted objects. Clean them from R2 before surfacing the failure.
        await Promise.allSettled(verifiedItems.map(item => storageDelete(item.fileKey)));
        console.error('[Media] Failed to persist verified upload batch:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'تعذّر حفظ الملفات المرفوعة' });
      }
      // Push notification to parents of tagged children (batch)
      if (uniqueChildIds.length > 0) {
        try {
          const { sendPushToUser } = await import('./_core/webPush');
          const notifiedParents = new Set<number>();
          for (const childId of uniqueChildIds) {
            const child = ownedChildren.find(item => item.id === childId);
            if (child?.parentId && !notifiedParents.has(child.parentId)) {
              notifiedParents.add(child.parentId);
              await db.createNotification({
                userId: child.parentId,
                organizationId: ctx.organizationId,
                title: `صور جديدة لـ ${child.firstName}`,
                titleAr: `صور جديدة لـ ${child.firstName}`,
                body: `تم إضافة ${input.items.length} صور/فيديو جديدة لـ ${child.firstName}`,
                bodyAr: `تم إضافة ${input.items.length} صور/فيديو جديدة لـ ${child.firstName}`,
                type: 'activity',
                link: '/parent/photos',
              });
              await sendPushToUser(child.parentId, {
                title: 'صور جديدة 📷',
                body: `تم إضافة ${input.items.length} صور/فيديو جديدة لـ ${child.firstName}`,
                tag: 'new_media_batch',
                data: { type: 'media', childId, url: '/parent/photos' },
              }, db.getPushSubscriptionsForUser);
            }
          }
        } catch (e) { /* non-critical */ }
      }
      return results;
    }),
    list: tenantProcedure.input(z.object({
      classId: z.number().optional(),
      childId: z.number().optional(),
      limit: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      // Parents can only see media for their own children
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (input?.childId) {
          if (!childIds.includes(input.childId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
            return withDirectMediaUrls(await db.getMediaForChild(input.childId, input?.limit, ctx.organizationId ?? undefined));
          }
          return withDirectMediaUrls(await db.getMediaForChildren(childIds, input?.limit, ctx.organizationId ?? undefined));
      }
      // SECURITY FIX: admin/teacher/fallback branches previously called
      // getAllMedia()/getMediaForClass() with no organizationId at all --
      // any admin (or teacher hitting the fallback with no classId) could
      // see every organization's photos and videos of children.
      // Admin sees all (within their own organization)
      if (ctx.user?.role === 'admin' || ctx.user?.role === 'owner' || ctx.user?.role === 'principal' || ctx.user?.role === 'super_admin') {
        return withDirectMediaUrls(await db.getAllMedia(input?.limit, ctx.organizationId ?? undefined));
      }
      // Teacher sees by class
      if (input?.classId) {
        return withDirectMediaUrls(await db.getMediaForClass(input.classId, input?.limit, ctx.organizationId ?? undefined));
      }
      return withDirectMediaUrls(await db.getAllMedia(input?.limit, ctx.organizationId ?? undefined));
    }),
    getChildren: tenantProcedure.input(z.object({ mediaId: z.number() })).query(async ({ input, ctx }) => {
      // SECURITY FIX: previously had no organization check -- any
      // authenticated user could look up which children are tagged in any
      // organization's media item by id.
      const item = await db.getMediaById(input.mediaId, ctx.organizationId ?? undefined);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      return db.getMediaChildren(input.mediaId);
    }),
    delete: teacherProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously fetched by id with no organizationId
      // filter -- any admin/uploader-role check ran without verifying the
      // media even belongs to the caller's organization, so an admin in
      // one organization could delete another organization's media.
      const item = await db.getMediaById(input.id, ctx.organizationId ?? undefined);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      if (!['admin', 'owner', 'principal', 'super_admin'].includes(ctx.user?.role || '') && item.uploadedBy !== ctx.user!.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641' });
      }
      await db.deleteMedia(input.id, ctx.organizationId ?? undefined);
      const fileKey = getStorageKey(item.url, item.fileKey);
      if (fileKey) {
        try {
          await storageDelete(fileKey);
        } catch (error) {
          // The database record is already gone, so do not make the user's
          // delete appear to fail. Log the orphan for storage cleanup instead.
          console.error('[Media] Failed to remove deleted media from storage:', error);
        }
      }
      return { success: true };
    }),
    approve: adminProcedure.input(z.object({ id: z.number(), isApproved: z.boolean() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously had no ownership check at all -- any
      // admin of ANY organization could approve/reject another
      // organization's media by id.
      const item = await db.getMediaById(input.id, ctx.organizationId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      await db.updateMediaApproval(input.id, input.isApproved, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: input.isApproved ? 'approve_media' : 'reject_media', resource: 'media', resourceId: input.id, details: `${input.isApproved ? 'Approved' : 'Rejected'} media #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
    // AI: Generate caption for an uploaded photo
    aiCaption: teacherProcedure.input(z.object({
      imageUrl: z.string(),
    })).mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const { withRetry } = await import("../shared/retry");
      const response = await withRetry(() => invokeLLM({
        messages: [
          {
            role: "system",
            content: "أنت مساعد في حضانة أطفال. مهمتك هي كتابة وصف قصير وجذاب باللغة العربية للصور المرفوعة. الوصف يجب أن يكون مناسباً لأولياء الأمور ويصف النشاط أو اللحظة الظاهرة في الصورة. اكتب وصفاً واحداً مختصراً (جملة أو جملتين) بدون أي كلمات إنجليزية."
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: input.imageUrl, detail: "low" } },
              { type: "text", text: "اكتب وصفاً قصيراً وجذاباً لهذه الصورة باللغة العربية. الوصف يجب أن يكون مناسباً لمشاركته مع أولياء الأمور في تطبيق الحضانة." }
            ]
          }
        ],
      }), { maxRetries: 2, initialDelayMs: 1000 });
      const captionContent = response.choices?.[0]?.message?.content;
      const caption = (typeof captionContent === 'string' ? captionContent.trim() : '') || "";
      return { caption };
    }),
    // AI: Suggest which children appear in a photo
    aiSuggestChildren: teacherProcedure.input(z.object({
      imageUrl: z.string(),
      classId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { invokeLLM } = await import("./_core/llm");
      const { withRetry } = await import("../shared/retry");
      // SECURITY FIX: previously fetched children with no organizationId
      // filter at all -- any teacher could get the AI to suggest tagging
      // children from a different organization's entire roster.
      let childrenList;
      if (input.classId) {
        childrenList = await db.getChildrenByClass(input.classId, ctx.organizationId ?? undefined);
      } else {
        childrenList = await db.getChildren(undefined, ctx.organizationId ?? undefined);
      }
      const activeChildren = childrenList.filter((c: any) => c.status === 'active');
      // Build a list of children with their photos for the AI to compare
      const childrenWithPhotos = activeChildren.filter((c: any) => c.photo);
      const childrenWithoutPhotos = activeChildren.filter((c: any) => !c.photo);
      
      if (childrenWithPhotos.length === 0) {
        // No photos to compare - just return the count of children
        return { suggestedChildIds: [], message: "لا توجد صور مرجعية للأطفال للمقارنة. يرجى إضافة صور للأطفال في ملفاتهم الشخصية." };
      }
      
      // Use AI vision to analyze the uploaded photo and compare with children's photos
      const childrenInfo = childrenWithPhotos.map((c: any) => ({
        id: c.id,
        name: c.arabicName || `${c.firstName} ${c.lastName}`,
        photoUrl: c.photo
      }));
      
      // Build message content with the uploaded image and children reference photos
      const messageContent: any[] = [
        { type: "image_url", image_url: { url: input.imageUrl, detail: "low" } },
        { type: "text", text: `هذه صورة تم رفعها في الحضانة. أريد منك تحديد أي من الأطفال التالية أسماؤهم قد يظهرون في هذه الصورة بناءً على مقارنة الوجوه.\n\nقائمة الأطفال المسجلين:\n${childrenInfo.map((c: any) => `- معرف: ${c.id} | الاسم: ${c.name}`).join('\n')}\n\nأعد فقط أرقام المعرفات (IDs) للأطفال الذين تعتقد أنهم يظهرون في الصورة، مفصولة بفواصل. إذا لم تتمكن من التعرف على أي طفل، أعد كلمة "لا يوجد". أعد الأرقام فقط بدون أي نص إضافي.` }
      ];
      
      // Add children reference photos (max 5 to avoid token limits)
      const limitedChildren = childrenInfo.slice(0, 5);
      for (const child of limitedChildren) {
        messageContent.push({ type: "image_url", image_url: { url: child.photoUrl, detail: "low" } });
        messageContent.push({ type: "text", text: `الصورة أعلاه هي للطفل: ${child.name} (معرف: ${child.id})` });
      }
      
      const response = await withRetry(() => invokeLLM({
        messages: [
          {
            role: "system",
            content: "أنت نظام ذكاء اصطناعي متخصص في التعرف على الوجوه في بيئة حضانة أطفال. مهمتك هي مقارنة الوجوه في الصورة المرفوعة مع صور الأطفال المرجعية وتحديد من يظهر في الصورة. أعد فقط أرقام المعرفات مفصولة بفواصل أو كلمة 'لا يوجد'."
          },
          {
            role: "user",
            content: messageContent
          }
        ],
      }), { maxRetries: 2, initialDelayMs: 1000 });
      
      const rawContent = response.choices?.[0]?.message?.content;
      const aiResponse = (typeof rawContent === 'string' ? rawContent.trim() : '') || "";
      
      // Parse the response to extract child IDs
      let suggestedChildIds: number[] = [];
      if (aiResponse && !aiResponse.includes("لا يوجد")) {
        const ids = aiResponse.match(/\d+/g);
        if (ids) {
          suggestedChildIds = ids.map(Number).filter((id: number) => 
            activeChildren.some((c: any) => c.id === id)
          );
        }
      }
      
      return { 
        suggestedChildIds,
        childrenNames: suggestedChildIds.map(id => {
          const child = activeChildren.find((c: any) => c.id === id);
          return child ? (child.arabicName || `${child.firstName} ${child.lastName}`) : '';
        }),
        message: suggestedChildIds.length > 0 
          ? `تم التعرف على ${suggestedChildIds.length} طفل/أطفال في الصورة`
          : "لم يتم التعرف على أي طفل. يمكنك تحديد الأطفال يدوياً."
      };
    }),
  }),
  calendar: calendarRouter,

  // SECURITY FIX: this entire router previously had NO organizationId
  // scoping anywhere -- getAnnouncements() returned every organization's
  // announcements to every user (filtered only by audience, never by
  // organization), create/update/delete operated with no organization
  // isolation at all, and create's parent-broadcast used the also-unscoped
  // db.getUsersByRoles() to notify every parent in the ENTIRE database
  // regardless of organization. `list` is upgraded to tenantProcedure so
  // ctx.organizationId is guaranteed; admin mutations now fetch-and-verify
  // or explicitly stamp organizationId before acting.
  announcements: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user?.role === 'admin' || ctx.user?.role === 'principal' || ctx.user?.role === 'super_admin' || ctx.user?.role === 'owner';
      if (ctx.user?.role === 'parent') {
        return db.getAnnouncements(ctx.organizationId, 'parents', false);
      }
      if (ctx.user?.role === 'teacher') {
        return db.getAnnouncements(ctx.organizationId, 'staff', false);
      }
      return db.getAnnouncements(ctx.organizationId, undefined, isAdmin);
    }),
    create: adminProcedure.input(z.object({
      title: z.string().min(1),
      titleAr: z.string().optional(),
      content: z.string().min(1),
      contentAr: z.string().optional(),
      audience: z.enum(['all', 'parents', 'staff']),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      imageUrl: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { expiresAt, ...rest } = input;
      // SECURITY FIX: previously omitted -- announcements.organizationId
      // defaults to 1 in the schema, so every announcement ever created here
      // silently landed on organization #1 regardless of the creating
      // admin's real organization.
      const data: any = { ...rest, createdBy: ctx.user!.id, organizationId: ctx.organizationId };
      if (expiresAt) data.expiresAt = new Date(expiresAt);
      const result = await db.createAnnouncement(data);
      // Send notification to parents if audience includes them
      if (input.audience === 'all' || input.audience === 'parents') {
        // SECURITY FIX: previously called db.getUsersByRoles(['parent']) with
        // no organizationId -- this notified every parent in every
        // organization about an announcement that belongs to only one of
        // them.
        const parents = await db.getUsersByRoles(['parent'], ctx.organizationId);
        for (const parent of parents) {
          await db.createNotification({
            userId: parent.id,
            organizationId: ctx.organizationId,
            title: 'إعلان جديد',
            titleAr: 'إعلان جديد',
            body: input.title,
            bodyAr: input.title,
            type: 'announcement',
            link: '/parent/announcements',
          });
        }
        // Send announcement email to parents with email (fire-and-forget)
        try {
          const org = await db.getOrganizationById(ctx.organizationId);
          const { sendAnnouncementEmail } = await import('./services/emailService');
          for (const parent of parents) {
            if (parent.email) {
              sendAnnouncementEmail(
                parent.email,
                parent.name || 'ولي الأمر',
                input.title,
                input.content,
                org?.name || 'الحضانة'
              ).catch(err => console.error('[Email] Announcement email failed:', err.message));
            }
          }
        } catch (e) { /* non-blocking */ }
      }
      return result;
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      audience: z.enum(['all', 'parents', 'staff']).optional(),
      isPinned: z.boolean().optional(),
      imageUrl: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id alone with no organization
      // check -- an admin from another organization could edit any other
      // organization's announcement.
      const existing = await db.getAnnouncementById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الإعلان غير موجود' });
      const { id, expiresAt, ...rest } = input;
      const data: any = { ...rest };
      if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
      await db.updateAnnouncement(id, data, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'update_announcement', resource: 'announcements', resourceId: id, details: `Updated announcement #${id}`, ipAddress: '' });
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously deleted by id alone with no organization
      // check -- an admin from another organization could delete any other
      // organization's announcement.
      const existing = await db.getAnnouncementById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الإعلان غير موجود' });
      await db.deleteAnnouncement(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_announcement', resource: 'announcements', resourceId: input.id, details: `Deleted announcement #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
    markRead: tenantProcedure.input(z.object({ announcementId: z.number() })).mutation(async ({ input, ctx }) => {
      return db.markAnnouncementRead(input.announcementId, ctx.user!.id, ctx.organizationId);
    }),
    myReadStatus: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserReadAnnouncements(ctx.user!.id);
    }),
    readers: adminProcedure.input(z.object({ announcementId: z.number() })).query(async ({ input, ctx }) => {
      // SECURITY FIX: previously returned reader identities for any
      // announcementId with no organization check -- an admin from another
      // organization could read who has/hasn't seen a foreign announcement.
      const existing = await db.getAnnouncementById(input.announcementId, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الإعلان غير موجود' });
      return db.getAnnouncementReaders(input.announcementId);
    }),
    readCount: adminProcedure.input(z.object({ announcementId: z.number() })).query(async ({ input, ctx }) => {
      const existing = await db.getAnnouncementById(input.announcementId, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'الإعلان غير موجود' });
      return db.getAnnouncementReadCount(input.announcementId);
    }),
  }),

  // SECURITY FIX: this router previously had NO organizationId scoping --
  // getDocuments() returned every organization's policy/consent/form
  // documents to every user (filtered only by audience), and delete
  // operated on any document id with no organization check.
  documents: router({
    list: tenantProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (input?.childId && !childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        const docs = await db.getDocuments(ctx.organizationId, 'parents', input?.childId);
        // Add signed status for each document
        const docsWithSignedStatus = await Promise.all(docs.map(async (doc: any) => {
          if (doc.requiresSignature) {
            const sigs = await db.getSignaturesForDocument(doc.id);
            const signed = sigs.some((s: any) => s.parentId === ctx.user!.id);
            return { ...doc, signed };
          }
          return { ...doc, signed: false };
        }));
        return docsWithSignedStatus;
      }
      return db.getDocuments(ctx.organizationId, undefined, input?.childId);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      type: z.enum(['policy', 'form', 'consent', 'report', 'other']),
      url: z.string(),
      childId: z.number().optional(),
      audience: z.enum(['all', 'parents', 'staff']).optional(),
      requiresSignature: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously omitted -- documents.organizationId
      // defaults to 1, so every document ever created here silently landed
      // on organization #1.
      return db.createDocument({ ...input, createdBy: ctx.user!.id, organizationId: ctx.organizationId });
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.deleteDocument(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_document', resource: 'documents', resourceId: input.id, details: `Deleted document #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
    sign: tenantProcedure.input(z.object({ documentId: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created a signature for any documentId with
      // no check it belongs to the caller's organization -- a user could
      // "sign" a document belonging to a completely different organization.
      const document = await db.getDocumentById(input.documentId, ctx.organizationId ?? undefined);
      if (!document) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستند غير موجود' });
      return db.createSignature({ documentId: input.documentId, parentId: ctx.user!.id, signedAt: new Date() });
    }),
    signatures: tenantProcedure.input(z.object({ documentId: z.number() })).query(async ({ input, ctx }) => {
      // SECURITY FIX: previously returned the signature list (which parent
      // ids signed) for ANY documentId with no organization check at all --
      // any authenticated user of any organization could enumerate another
      // organization's policy/consent document signatures.
      const document = await db.getDocumentById(input.documentId, ctx.organizationId ?? undefined);
      if (!document) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستند غير موجود' });
      return db.getSignaturesForDocument(input.documentId);
    }),
  }),

  // SECURITY FIX: child_documents (birth certificates, national IDs, medical
  // reports, immunization/passport scans) has no organizationId column of
  // its own, and this router previously had NO organization scoping
  // anywhere -- listAll returned every organization's identity/medical
  // documents to any teacher, and approve/reject/delete acted on any
  // document id with no ownership check at all.
  childDocuments: router({
    listByChild: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only see their own children's documents
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        const child = await db.getChildById(input.childId);
        if (!child || child.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
        }
      }
      return db.getChildDocuments(input.childId);
    }),
    listAll: teacherProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      return db.getAllChildDocuments(input?.status, ctx.organizationId);
    }),
    create: tenantProcedure.input(z.object({
      childId: z.number(),
      type: z.enum(['birth_certificate', 'family_id', 'immunization', 'passport', 'national_id', 'medical_report', 'allergy_report', 'photo', 'other']),
      name: z.string().min(1),
      fileUrl: z.string(),
      fileKey: z.string().optional(),
      mimeType: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Parents can only upload for their own children; everyone else must
      // still be within the same organization as the child.
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        const child = await db.getChildById(input.childId);
        if (!child || child.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
        }
      }
      const status = (ctx.user?.role === 'admin' || ctx.user?.role === 'teacher') ? 'approved' : 'pending';
      return db.createChildDocument({ ...input, uploadedBy: ctx.user!.id, status });
    }),
    approve: teacherProcedure.input(z.object({ id: z.number(), reviewNote: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await db.getChildDocumentById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستند غير موجود' });
      return db.updateChildDocument(input.id, { status: 'approved', reviewedBy: ctx.user!.id, reviewedAt: new Date(), reviewNote: input.reviewNote || null });
    }),
    reject: teacherProcedure.input(z.object({ id: z.number(), reviewNote: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const existing = await db.getChildDocumentById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستند غير موجود' });
      return db.updateChildDocument(input.id, { status: 'rejected', reviewedBy: ctx.user!.id, reviewedAt: new Date(), reviewNote: input.reviewNote || null });
    }),
    delete: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously deleted by id alone with no ownership or
      // organization check whatsoever.
      const existing = await db.getChildDocumentById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستند غير موجود' });
      if (ctx.user?.role === 'parent' && existing.uploadedBy !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }
      return db.deleteChildDocument(input.id);
    }),
  }),

  medicalInfo: router({
    get: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        // SECURITY FIX: staff/admin previously had NO organization check at
        // all -- any teacher/admin could read another organization's
        // child's medical info (blood type, conditions, medications,
        // allergies, insurance) by passing any childId.
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getMedicalInfo(input.childId);
    }),
    upsert: teacherProcedure.input(z.object({
      childId: z.number(),
      bloodType: z.string().optional(),
      conditions: z.string().optional(),
      medications: z.string().optional(),
      allergies: z.string().optional(),
      doctorName: z.string().optional(),
      doctorPhone: z.string().optional(),
      insuranceProvider: z.string().optional(),
      insuranceNumber: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: input.childId was previously trusted with no check
      // that it belongs to the caller's organization -- a teacher from one
      // organization could read/overwrite another organization's child's
      // medical record (conditions, medications, allergies).
      const child = await db.getChildById(input.childId);
      if (!child || child.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      const { childId, ...data } = input;
      return db.upsertMedicalInfo(childId, data);
    }),
  }),

  emergencyContacts: router({
    list: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        // SECURITY FIX: staff/admin previously had no organization check
        // at all -- any authenticated non-parent user could read another
        // organization's child's emergency contacts (names, phone numbers,
        // pickup authorization) by passing any childId.
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getEmergencyContacts(input.childId);
    }),
    create: tenantProcedure.input(z.object({
      childId: z.number(),
      name: z.string().min(1),
      phone: z.string().min(1),
      relationship: z.string().min(1),
      isAuthorizedPickup: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        // SECURITY FIX: staff/admin previously had no organization check
        // at all -- any non-parent could add an emergency contact (with
        // pickup authorization!) to another organization's child.
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.createEmergencyContact(input);
    }),
    delete: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously deleted by id with NO check whatsoever --
      // any authenticated user of ANY role, in ANY organization, could
      // delete any other organization's (or any other family's) emergency
      // contact record by guessing/enumerating its numeric id. Ownership
      // is now verified via the contact's child.
      const existing = await db.getEmergencyContactById(input.id);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'جهة الاتصال غير موجودة' });
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(existing.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        const child = await db.getChildById(existing.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.deleteEmergencyContact(input.id);
    }),
  }),

  enrollment: router({
    list: adminProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      // SECURITY FIX: previously listed every organization's enrollment
      // records to any admin (enrollment has no organizationId column of
      // its own -- ownership is now enforced via a join against
      // children.organizationId).
      return db.getEnrollments(input?.status, ctx.organizationId);
    }),
    create: adminProcedure.input(z.object({
      childId: z.number(),
      classId: z.number().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      status: z.enum(['active', 'pending', 'withdrawn', 'graduated']).optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created an enrollment for any childId with
      // no verification it belongs to the caller's organization.
      const child = await db.getChildById(input.childId, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return db.createEnrollment({
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['active', 'pending', 'withdrawn', 'graduated']).optional(),
      classId: z.number().optional(),
      endDate: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id with no ownership check at
      // all -- any admin could edit another organization's enrollment
      // record by id.
      const existing = await db.getEnrollmentById(input.id);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'سجل التسجيل غير موجود' });
      const ownedChild = await db.getChildById(existing.childId, ctx.organizationId);
      if (!ownedChild) throw new TRPCError({ code: 'NOT_FOUND', message: 'سجل التسجيل غير موجود' });
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.updateEnrollment(id, updateData);
      return { success: true };
    }),
  }),

  waitingList: router({
    // Public discovery exposes only the minimum fields needed by the generic
    // registration forms. Mutations still resolve the selected opaque slug
    // server-side and never trust a client-supplied organization id.
    publicOrganizations: publicProcedure.query(async () => {
      const database = (await getSharedDb())!;
      return database.select({
        name: organizations.name,
        nameAr: organizations.nameAr,
        slug: organizations.slug,
        city: organizations.city,
      })
        .from(organizations)
        .where(inArray(organizations.status, ['active', 'trial']))
        .orderBy(organizations.nameAr);
    }),
    list: adminProcedure.query(async ({ ctx }) => {
      // SECURITY FIX: previously returned every organization's prospective-
      // family waiting list to any admin -- see the organizationId column
      // added to the waiting_list schema (nullable; existing rows predate
      // the column and are not backfilled in this sandbox).
      return db.getWaitingList(ctx.organizationId);
    }),
    create: adminProcedure.input(z.object({
      childName: z.string().min(1),
      parentName: z.string().min(1),
      parentPhone: z.string().min(1),
      parentEmail: z.string().optional(),
      dateOfBirth: z.string().optional(),
      preferredClass: z.string().optional(),
      notes: z.string().optional(),
      priority: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createWaitingListEntry({
        childName: input.childName,
        parentName: input.parentName,
        phone: input.parentPhone,
        email: input.parentEmail || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        preferredClass: input.preferredClass || null,
        notes: input.notes || null,
        priority: input.priority || 0,
        organizationId: ctx.organizationId,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['waiting', 'contacted', 'enrolled', 'cancelled']).optional(),
      notes: z.string().optional(),
      priority: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously updated by id with no ownership check.
      const { id, ...data } = input;
      const existing = await db.getWaitingListEntryById(id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'السجل غير موجود' });
      await db.updateWaitingListEntry(id, data, ctx.organizationId);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously deleted by id with no ownership check --
      // any admin could delete another organization's waiting-list entry.
      const existing = await db.getWaitingListEntryById(input.id, ctx.organizationId);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'السجل غير موجود' });
      await db.deleteWaitingListEntry(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_waiting_list', resource: 'waiting_list', resourceId: input.id, details: `Deleted waiting list entry #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
    // Public registration - no auth required, for parents to register via a
    // shareable per-nursery link.
    // SECURITY FIX: this endpoint previously accepted no organization
    // identifier at all, so a public submission could never be attributed
    // to a specific nursery -- organizationId was left null, meaning the
    // entry would not appear in ANY organization's tenant-scoped waiting
    // list view (an availability bug) and, before the waiting_list.
    // organizationId column existed, would have been visible to every
    // organization's admin. The shareable link now must include the
    // target nursery's slug (e.g. /waitlist/:orgSlug), which the frontend
    // reads from the URL and passes here; the slug is resolved to a real,
    // active organization server-side (never trusted as a raw id) and the
    // request is rejected if the slug doesn't match an active organization.
    publicRegister: publicProcedure.input(z.object({
      orgSlug: z.string().min(1, "رابط الحضانة غير صحيح"),
      childName: z.string().min(1),
      parentName: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().optional(),
      dateOfBirth: z.string().optional(),
      preferredClass: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const org = await db.getOrganizationBySlug(input.orgSlug);
      if (!org || org.status === 'suspended') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'رابط التسجيل غير صحيح أو الحضانة غير متاحة حالياً' });
      }
      const entry = await db.createWaitingListEntry({
        childName: input.childName,
        parentName: input.parentName,
        phone: input.phone,
        email: input.email || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        preferredClass: input.preferredClass || null,
        notes: input.notes || null,
        status: 'waiting',
        priority: 0,
        organizationId: org.id,
      });
      // Notify this organization's own admins about the new waitlist
      // registration (not a platform-wide broadcast).
      try {
        const orgAdmins = await db.getUsersByRoles(['admin', 'owner', 'principal'], org.id);
        for (const admin of orgAdmins) {
          await db.createNotification({
            userId: admin.id,
            organizationId: org.id,
            title: 'تسجيل جديد في قائمة الانتظار',
            titleAr: 'تسجيل جديد في قائمة الانتظار',
            body: `${input.childName} (ولي الأمر: ${input.parentName})`,
            bodyAr: `${input.childName} (ولي الأمر: ${input.parentName})`,
            type: 'registration',
            link: '/admin/waiting-list',
          });
        }
      } catch {}
      return { success: true, id: entry.id };
    }),
  }),

  eyfs: router({
    assessments: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        // SECURITY FIX: staff/admin previously had no organization check.
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getEyfsAssessments(input.childId, ctx.organizationId ?? undefined);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      area: z.string(),
      subArea: z.string().optional(),
      level: z.enum(['emerging', 'developing', 'secure', 'exceeding']),
      notes: z.string().optional(),
      evidence: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created an assessment for any childId with
      // no verification it belongs to the caller's organization, and never
      // stamped organizationId on the new row.
      const child = await db.getChildById(input.childId, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return db.createEyfsAssessment({ ...input, assessedBy: ctx.user!.id, assessedAt: new Date(), organizationId: ctx.organizationId });
    }),
  }),

  observations: router({
    list: tenantProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        // SECURITY FIX: staff/admin previously had no organization check.
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getLearningObservations(input.childId, ctx.organizationId ?? undefined);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      area: z.string(),
      title: z.string(),
      description: z.string(),
      evidence: z.string().optional(),
      nextSteps: z.string().optional(),
      linkedAssessmentId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously created an observation for any childId
      // with no verification it belongs to the caller's organization, and
      // never stamped organizationId on the new row.
      const child = await db.getChildById(input.childId, ctx.organizationId);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      return db.createLearningObservation({ ...input, observedBy: ctx.user!.id, observedAt: new Date(), organizationId: ctx.organizationId });
    }),
    byArea: tenantProcedure.input(z.object({ childId: z.number(), area: z.string() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else {
        const child = await db.getChildById(input.childId, ctx.organizationId ?? undefined);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getLearningObservationsByArea(input.childId, input.area, ctx.organizationId ?? undefined);
    }),
  }),

  auditLog: router({
    // SECURITY FIX: previously called getAuditLogs with no organizationId at
    // all -- audit_log has no organizationId column of its own, so this
    // returned every organization's audit trail (user actions, resource
    // ids, IP addresses) to any single organization's admin, platform-wide.
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      return db.getAuditLogs(input?.limit, ctx.organizationId);
    }),
    create: protectedProcedure.input(z.object({
      action: z.string(),
      resource: z.string(),
      resourceId: z.number().optional(),
      details: z.any().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createAuditLog({ ...input, userId: ctx.user!.id, ipAddress: '' });
    }),
  }),

  users: router({
    list: adminProcedure.input(z.object({ role: z.string().optional(), search: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      const result = await db.getUsersByRole(input?.role, input?.search, ctx.user?.organizationId ?? undefined);
      return result.map(({ password, ...user }) => ({ ...user, hasPassword: Boolean(password) }));
    }),
    // SECURITY FIX: previously called getUserById with no organizationId --
    // any organization's admin could view any other organization's user's
    // full profile (name, email, phone, nationalId, role) by id.
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const user = await db.getUserById(input.id, ctx.organizationId);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      const { password, ...safeUser } = user;
      return { ...safeUser, hasPassword: Boolean(password) };
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().trim().email(),
      phone: z.string().optional(),
      role: z.enum(['admin', 'principal', 'teacher', 'parent', 'assistant', 'accountant', 'receptionist']),
      nationalId: z.string().optional(),
      password: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Clean email from invisible RTL/LTR characters
      const cleanEmail = normalizeEmail(input.email);
      input = { ...input, email: cleanEmail };
      
      // Check for duplicate email
      const existingUser = await db.findUserByIdentifier(cleanEmail);
      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: `يوجد حساب مسجل بهذا البريد الإلكتروني (${existingUser.role === 'parent' ? 'ولي أمر' : existingUser.role === 'teacher' ? 'معلمة' : existingUser.role === 'admin' ? 'مشرفة' : existingUser.role}). يرجى استخدام بريد إلكتروني آخر.` });
      }
      
      // Check for duplicate phone if provided
      if (input.phone) {
        const existingByPhone = await db.findUserByIdentifier(input.phone);
        if (existingByPhone) {
          throw new TRPCError({ code: 'CONFLICT', message: `يوجد حساب مسجل بهذا الرقم (${existingByPhone.role === 'parent' ? 'ولي أمر' : existingByPhone.role === 'teacher' ? 'معلمة' : existingByPhone.role === 'admin' ? 'مشرفة' : existingByPhone.role}). يرجى استخدام رقم آخر.` });
        }
      }
      
      // Generate a unique openId for manually created users
      const openId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const { password, ...userData } = input;
      // SECURITY FIX: previously `ctx.user!.organizationId ?? 1` -- the exact
      // silent-default-to-org-1 anti-pattern eradicated everywhere else in
      // this codebase, missed here. adminProcedure is built on
      // tenantProcedure, so ctx.organizationId is guaranteed non-null; use
      // it directly instead of re-deriving from ctx.user with a fallback.
      const orgId = ctx.organizationId;
      const user = await db.createUser({ ...userData, openId, organizationId: orgId });
      // If password provided, store hashed password for direct login (PBKDF2 format)
      if (password && user) {
        const { hashPassword } = await import('./_core/authService');
        const hashedPassword = await hashPassword(password);
        await db.updateUser(user.id, { password: hashedPassword } as any);
      }
      await db.createAuditLog({ userId: ctx.user!.id, action: 'create_user', resource: 'users', resourceId: user?.id, details: `Created user ${input.name} (${input.role})`, ipAddress: '' });
      // Send invitation email to the new user
      try {
        const { sendInvitationEmail } = await import('./services/emailService');
        await sendInvitationEmail(
          input.email,
          input.name,
          input.role,
          password || undefined,
          ctx.user?.name || undefined
        );
      } catch (emailErr) {
        console.error('[User Create] Failed to send invitation email:', emailErr);
      }
      return user;
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(['admin', 'principal', 'teacher', 'parent', 'assistant', 'accountant', 'receptionist', 'user']).optional(),
      nationalId: z.string().optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(6).optional(),
    // SECURITY FIX: previously called updateUser with no organizationId --
    // any organization's admin could update any other organization's user
    // (including role/contact info) by id.
    })).mutation(async ({ input, ctx }) => {
      const { id, password, ...data } = input;
      const target = await db.getUserById(id, ctx.organizationId);
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });

      await db.updateUser(id, data, ctx.organizationId);
      if (password) {
        await authService.updatePassword(id, password);
      }

      await db.createAuditLog({
        userId: ctx.user!.id,
        action: 'update_user',
        resource: 'users',
        resourceId: id,
        details: `Updated user #${id}: ${JSON.stringify({ ...data, passwordReset: Boolean(password) })}`,
        ipAddress: '',
      });

      const updated = await db.getUserById(id, ctx.organizationId);
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      const { password: updatedPassword, ...safeUser } = updated;
      return { ...safeUser, hasPassword: Boolean(updatedPassword) };
    }),
    // SECURITY FIX: previously called deleteUser with no organizationId --
    // any admin could delete any other organization's user by id.
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const target = await db.getUserById(input.id, ctx.organizationId);
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      await db.createAuditLog({ userId: ctx.user!.id, action: 'delete_user', resource: 'users', resourceId: input.id, details: `Deleted user #${input.id}`, ipAddress: '' });
      return db.deleteUser(input.id, ctx.organizationId);
    }),
    // SECURITY FIX: previously linked with no organizationId -- any admin
    // could link a child in their own organization to a parent user
    // account belonging to a DIFFERENT organization (or vice versa).
    linkChild: adminProcedure.input(z.object({ parentId: z.number(), childId: z.number(), relationship: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const [parent, child] = await Promise.all([
        db.getUserById(input.parentId, ctx.organizationId),
        db.getChildById(input.childId, ctx.organizationId),
      ]);
      if (!parent || !child) throw new TRPCError({ code: 'NOT_FOUND', message: 'ولي الأمر أو الطفل غير موجود' });
      const result = await db.linkParentToChild(input.parentId, input.childId, input.relationship || 'parent', ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'link_child', resource: 'parent_children', resourceId: input.childId, details: `Linked parent #${input.parentId} to child #${input.childId}`, ipAddress: '' });
      return result;
    }),
    // SECURITY FIX: same as linkChild above.
    unlinkChild: adminProcedure.input(z.object({ parentId: z.number(), childId: z.number(), relationship: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const [parent, child] = await Promise.all([
        db.getUserById(input.parentId, ctx.organizationId),
        db.getChildById(input.childId, ctx.organizationId),
      ]);
      if (!parent || !child) throw new TRPCError({ code: 'NOT_FOUND', message: 'ولي الأمر أو الطفل غير موجود' });
      const result = await db.unlinkParentFromChild(input.parentId, input.childId, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'unlink_child', resource: 'parent_children', resourceId: input.childId, details: `Unlinked parent #${input.parentId} from child #${input.childId}`, ipAddress: '' });
      return result;
    }),
    // SECURITY FIX: previously called getChildrenForParent with no
    // organizationId -- any admin could list any other organization's
    // parent's linked children by parentId.
    getChildren: adminProcedure.input(z.object({ parentId: z.number() })).query(async ({ input, ctx }) => {
      return db.getChildrenForParent(input.parentId, ctx.organizationId);
    }),
    // SECURITY FIX: previously returned every organization's unlinked
    // active children platform-wide.
    getUnlinkedChildren: adminProcedure.query(async ({ ctx }) => {
      return db.getUnlinkedChildren(ctx.organizationId);
    }),
    // SECURITY FIX: previously called getParentsForChild with no
    // organizationId -- any admin could list every parent linked to any
    // other organization's child by childId.
    getParentsForChild: adminProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      return db.getParentsForChild(input.childId, ctx.organizationId);
    }),
    // SECURITY FIX: previously called updateUser with no organizationId --
    // any admin could activate any other organization's user by id.
    activate: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const result = await db.updateUser(input.id, { isActive: true }, ctx.organizationId);
      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      await db.createAuditLog({ userId: ctx.user!.id, action: 'activate_user', resource: 'users', resourceId: input.id, details: `Activated user #${input.id}`, ipAddress: '' });
      return result;
    }),
    // SECURITY FIX: same as activate above -- previously any admin could
    // deactivate (lock out) any other organization's user by id.
    deactivate: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const result = await db.updateUser(input.id, { isActive: false }, ctx.organizationId);
      if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      await db.createAuditLog({ userId: ctx.user!.id, action: 'deactivate_user', resource: 'users', resourceId: input.id, details: `Deactivated user #${input.id}`, ipAddress: '' });
      return result;
    }),
    // Get pending parents (role='parent', isActive=false) awaiting approval
    // SECURITY FIX: previously returned every pending self-registered
    // parent from every organization on the platform (name/phone/email).
    pending: adminProcedure.query(async ({ ctx }) => {
      return db.getPendingParents(ctx.organizationId);
    }),
    // Approve a pending parent (set isActive=true)
    // SECURITY FIX: previously any admin could approve (activate) any
    // other organization's pending parent by id.
    approveAsParent: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.approveParent(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'approve_parent', resource: 'users', resourceId: input.id, details: `Approved parent #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
    // Reject a pending parent
    // SECURITY FIX: same as approveAsParent above.
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.rejectParent(input.id, ctx.organizationId);
      await db.createAuditLog({ userId: ctx.user!.id, action: 'reject_parent', resource: 'users', resourceId: input.id, details: `Rejected parent #${input.id}`, ipAddress: '' });
      return { success: true };
    }),
  }),

  // ============ PICKUP WORKFLOW (6-Step) ============
  pickup: router({
    // STEP 1: Parent requests pickup
    request: parentProcedure.input(z.object({
      childId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // SECURITY FIX: input.childId was previously trusted with no check that
      // it belongs to the caller's organization -- and
      // getActivePickupForChild ran with no organizationId, so a parent
      // could probe any childId across organizations.
      const child = await db.getChildById(input.childId);
      if (!child || child.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      const existing = await db.getActivePickupForChild(input.childId, ctx.organizationId);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'يوجد طلب استلام نشط لهذا الطفل بالفعل' });
      }
      const childName = child ? `${child.firstName} ${child.lastName}` : 'طفل';

      // Find the teacher for this child's class
      let teacherId: number | undefined;
      if (child?.classId) {
        const classInfo = await db.getClassById(child.classId);
        teacherId = classInfo?.teacherId || undefined;
      }

      const id = await db.createPickupRequest({
        childId: input.childId,
        parentId: ctx.user!.id,
        status: 'waiting_teacher',
        teacherId: teacherId || null,
        // SECURITY FIX: previously omitted -- pickup_requests.organizationId
        // defaults to 1, so every pickup request ever created here silently
        // landed on organization #1.
        organizationId: ctx.organizationId,
      });

      // Notify ON DUTY staff only (operational alert)
      try {
        const onDutyIds = await db.getOnDutyStaffIds(ctx.organizationId);
        // Notify classroom teacher (if on duty)
        if (teacherId && onDutyIds.includes(teacherId)) {
          await db.createNotification({
            userId: teacherId,
            organizationId: ctx.organizationId,
            title: '\u26a0\ufe0f \u0637\u0644\u0628 \u0627\u0633\u062a\u0644\u0627\u0645 \u0639\u0627\u062c\u0644',
            titleAr: '\u26a0\ufe0f \u0637\u0644\u0628 \u0627\u0633\u062a\u0644\u0627\u0645 \u0639\u0627\u062c\u0644',
            body: `\u0648\u0644\u064a \u0623\u0645\u0631 ${childName} \u0648\u0635\u0644 \u0644\u0627\u0633\u062a\u0644\u0627\u0645\u0647 - \u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0641\u0648\u0631\u0627\u064b`,
            bodyAr: `\u0648\u0644\u064a \u0623\u0645\u0631 ${childName} \u0648\u0635\u0644 \u0644\u0627\u0633\u062a\u0644\u0627\u0645\u0647 - \u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0641\u0648\u0631\u0627\u064b`,
            type: 'attendance',
            metadata: JSON.stringify({ pickupRequestId: id, childId: input.childId, step: 'request', isOperationalAlert: true }),
          });
        }
        // Notify reception staff (if on duty)
        const receptionStaff = await db.getUsersByRole('receptionist', undefined, ctx.organizationId);
        for (const staff of receptionStaff) {
          if (onDutyIds.includes(staff.id)) {
            await db.createNotification({
              userId: staff.id,
              organizationId: ctx.organizationId,
              title: '\u26a0\ufe0f \u0637\u0644\u0628 \u0627\u0633\u062a\u0644\u0627\u0645 \u0639\u0627\u062c\u0644',
              titleAr: '\u26a0\ufe0f \u0637\u0644\u0628 \u0627\u0633\u062a\u0644\u0627\u0645 \u0639\u0627\u062c\u0644',
              body: `\u0648\u0644\u064a \u0623\u0645\u0631 ${childName} \u0648\u0635\u0644 \u0644\u0627\u0633\u062a\u0644\u0627\u0645\u0647`,
              bodyAr: `\u0648\u0644\u064a \u0623\u0645\u0631 ${childName} \u0648\u0635\u0644 \u0644\u0627\u0633\u062a\u0644\u0627\u0645\u0647`,
              type: 'attendance',
              metadata: JSON.stringify({ pickupRequestId: id, childId: input.childId, step: 'request', isOperationalAlert: true }),
            });
          }
        }
        // Also notify class assistant if on duty
        if (child?.classId) {
          const classInfo = await db.getClassById(child.classId);
          if (classInfo?.assistantId && onDutyIds.includes(classInfo.assistantId)) {
            await db.createNotification({
              userId: classInfo.assistantId,
              organizationId: ctx.organizationId,
              title: '\u26a0\ufe0f \u0637\u0644\u0628 \u0627\u0633\u062a\u0644\u0627\u0645 \u0639\u0627\u062c\u0644',
              titleAr: '\u26a0\ufe0f \u0637\u0644\u0628 \u0627\u0633\u062a\u0644\u0627\u0645 \u0639\u0627\u062c\u0644',
              body: `\u0648\u0644\u064a \u0623\u0645\u0631 ${childName} \u0648\u0635\u0644 \u0644\u0627\u0633\u062a\u0644\u0627\u0645\u0647`,
              bodyAr: `\u0648\u0644\u064a \u0623\u0645\u0631 ${childName} \u0648\u0635\u0644 \u0644\u0627\u0633\u062a\u0644\u0627\u0645\u0647`,
              type: 'attendance',
              metadata: JSON.stringify({ pickupRequestId: id, childId: input.childId, step: 'request', isOperationalAlert: true }),
            });
          }
        }
        // Push notifications to on-duty staff only
        const { notifyStaffPickupRequest } = await import('./_core/pushTriggers');
        await notifyStaffPickupRequest(childName, id, input.childId, ctx.organizationId);
      } catch (e) { /* notification failure shouldn't block */ }
      return { id, status: 'waiting_teacher' };
    }),

    // STEP 2: Teacher sends child to reception
    teacherSendToReception: tenantProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // SECURITY FIX: previously updated (and later fetched/notified about)
      // this pickup request by id alone with no organization check at all --
      // any authenticated staff user in ANY organization could advance
      // another organization's pickup workflow by guessing/enumerating a
      // pickup request id.
      //
      // SECURITY FIX (round 2): the first fix above was written as
      // `orgId ? <scoped query> : <UNSCOPED query>` on `protectedProcedure`.
      // ctx.organizationId is nullable (users.organizationId is a NULLABLE
      // column in the live database -- see migration 0024), so any caller
      // whose account had no organization fell into the else-branch and got
      // the original unscoped behaviour back: the ownership check failed
      // OPEN. Now on tenantProcedure, which rejects a null/invalid
      // organizationId before the handler runs, so the scoped query is the
      // only path that exists.
      const dbConn = await (await import('./db')).getDb();
      const { pickupRequests: pr } = await import('../drizzle/schema');
      const { eq: eqOp, and: andOp } = await import('drizzle-orm');
      const orgId = ctx.organizationId;
      const existingRows = await dbConn!.select().from(pr)
        .where(andOp(eqOp(pr.id, input.id), eqOp(pr.organizationId, orgId))).limit(1);
      if (!existingRows[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'طلب الاستلام غير موجود' });
      }

      await db.updatePickupRequestStatus(input.id, 'sent_to_reception', { teacherId: ctx.user!.id }, orgId);

      // Get request details for notifications
      try {
        const rows = await dbConn!.select().from(pr).where(eqOp(pr.id, input.id)).limit(1);
        const req = rows[0];
        if (req) {
          const child = await db.getChildById(req.childId);
          const childName = child ? `${child.firstName} ${child.lastName}` : 'طفل';
          // Notify parent
          await db.createNotification({
            userId: req.parentId,
            organizationId: orgId,
            title: 'طفلك في الطريق',
            titleAr: 'طفلك في الطريق',
            body: `${childName} في طريقه إلى الاستقبال`,
            bodyAr: `${childName} في طريقه إلى الاستقبال`,
            type: 'attendance',
            metadata: JSON.stringify({ pickupRequestId: input.id, step: 'sent_to_reception' }),
          });
          // Notify reception
          const receptionStaff = await db.getUsersByRole('receptionist', undefined, orgId);
          for (const staff of receptionStaff) {
            await db.createNotification({
              userId: staff.id,
              organizationId: orgId,
              title: 'طفل في الطريق للاستقبال',
              titleAr: 'طفل في الطريق للاستقبال',
              body: `${childName} تم إرساله من الفصل إلى الاستقبال`,
              bodyAr: `${childName} تم إرساله من الفصل إلى الاستقبال`,
              type: 'attendance',
              metadata: JSON.stringify({ pickupRequestId: input.id, step: 'sent_to_reception' }),
            });
          }
          // Push notification to parent
          const { notifyParentPickupStatus } = await import('./_core/pushTriggers');
          await notifyParentPickupStatus(req.parentId, childName, 'sent_to_reception', input.id);
        }
      } catch (e) { /* notification failure shouldn't block */ }
      return { success: true };
    }),

    // STEP 3: Reception marks child as waiting
    markWaitingAtReception: tenantProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      // SECURITY FIX: previously updated by id alone with no organization
      // check -- see teacherSendToReception above for the same class of bug,
      // including the fail-open `orgId ? scoped : unscoped` second round.
      const dbConn = await (await import('./db')).getDb();
      const { pickupRequests: pr } = await import('../drizzle/schema');
      const { eq: eqOp, and: andOp } = await import('drizzle-orm');
      const orgId = ctx.organizationId;
      const existingRows = await dbConn!.select().from(pr)
        .where(andOp(eqOp(pr.id, input.id), eqOp(pr.organizationId, orgId))).limit(1);
      if (!existingRows[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'طلب الاستلام غير موجود' });
      }
      await db.updatePickupRequestStatus(input.id, 'waiting_at_reception', { receptionStaffId: ctx.user!.id }, orgId);
      return { success: true };
    }),

    // STEP 4 & 5: Reception completes pickup with authorized person
    completePickup: tenantProcedure.input(z.object({
      id: z.number(),
      pickedUpBy: z.string(),
      pickedUpByRelationship: z.string(),
    })).mutation(async ({ ctx, input }) => {
      if (!input.pickedUpBy || !input.pickedUpByRelationship) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'يجب تحديد شخص الاستلام المخول' });
      }
      // SECURITY FIX: previously updated by id alone with no organization
      // check -- any authenticated staff user in ANY organization could mark
      // another organization's child as picked up by an arbitrary named
      // person, by guessing/enumerating a pickup request id. The follow-up
      // fix then reintroduced that exact capability through its
      // `orgId ? scoped : unscoped` fallback whenever the caller had no
      // organization; tenantProcedure now removes that branch entirely.
      // This is the most safety-critical handler in the pickup workflow --
      // it is the record of WHO a child was released to.
      const dbConn = await (await import('./db')).getDb();
      const { pickupRequests: pr } = await import('../drizzle/schema');
      const { eq: eqOp, and: andOp } = await import('drizzle-orm');
      const orgId = ctx.organizationId;
      const existingRows = await dbConn!.select().from(pr)
        .where(andOp(eqOp(pr.id, input.id), eqOp(pr.organizationId, orgId))).limit(1);
      if (!existingRows[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'طلب الاستلام غير موجود' });
      }
      await db.updatePickupRequestStatus(input.id, 'picked_up', {
        pickedUpBy: input.pickedUpBy,
        pickedUpByRelationship: input.pickedUpByRelationship,
        receptionStaffId: ctx.user!.id,
      }, orgId);

      // Notify parent and teacher
      try {
        const rows = await dbConn!.select().from(pr).where(eqOp(pr.id, input.id)).limit(1);
        const req = rows[0];
        if (req) {
          const child = await db.getChildById(req.childId);
          const childName = child ? `${child.firstName} ${child.lastName}` : 'طفل';
          // Notify parent
          await db.createNotification({
            userId: req.parentId,
            organizationId: orgId,
            title: 'تم الاستلام بنجاح',
            titleAr: 'تم الاستلام بنجاح',
            body: `تم تسليم ${childName} بنجاح`,
            bodyAr: `تم تسليم ${childName} بنجاح`,
            type: 'attendance',
            metadata: JSON.stringify({ pickupRequestId: input.id, step: 'picked_up' }),
          });
          // Notify teacher
          if (req.teacherId) {
            await db.createNotification({
              userId: req.teacherId,
              organizationId: orgId,
              title: 'تم استلام الطفل',
              titleAr: 'تم استلام الطفل',
              body: `تم استلام ${childName} بنجاح`,
              bodyAr: `تم استلام ${childName} بنجاح`,
              type: 'attendance',
              metadata: JSON.stringify({ pickupRequestId: input.id, step: 'picked_up' }),
            });
          }
          // Push notification
          const { notifyParentPickupStatus } = await import('./_core/pushTriggers');
          await notifyParentPickupStatus(req.parentId, childName, 'picked_up', input.id);
        }
      } catch (e) { /* notification failure shouldn't block */ }
      return { success: true };
    }),

    // Parent cancels their pickup request
    // SECURITY FIX: previously updated by id alone with no check that the
    // request belongs to the caller at all -- any authenticated parent
    // could cancel any other parent's (possibly another organization's)
    // active pickup request by guessing/enumerating an id.
    cancel: parentProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const dbConn = await (await import('./db')).getDb();
      const { pickupRequests: pr } = await import('../drizzle/schema');
      const { eq: eqOp, and: andOp } = await import('drizzle-orm');
      const rows = await dbConn!.select().from(pr).where(andOp(
        eqOp(pr.id, input.id),
        eqOp(pr.parentId, ctx.user!.id),
        eqOp(pr.organizationId, ctx.organizationId)
      )).limit(1);
      if (!rows[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'طلب الاستلام غير موجود' });
      }
      await db.updatePickupRequestStatus(input.id, 'cancelled', {}, ctx.organizationId);
      return { success: true };
    }),

    // Parent views their pickup requests
    myRequests: parentProcedure.query(async ({ ctx }) => {
      return db.getPickupRequestsByParent(ctx.user!.id);
    }),

    // Parent checks active pickup for a child
    // SECURITY FIX: previously ran with no organizationId, and no check that
    // childId belongs to the caller's organization at all.
    activeForChild: parentProcedure.input(z.object({
      childId: z.number(),
    })).query(async ({ input, ctx }) => {
      const child = await db.getChildById(input.childId);
      if (!child || child.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getActivePickupForChild(input.childId, ctx.organizationId);
    }),

    // Staff views all active pickup requests
    // SECURITY FIX: previously ran with no organizationId -- any
    // authenticated staff user (of ANY organization) saw every
    // organization's active pickup requests.
    active: tenantProcedure.query(async ({ ctx }) => {
      return db.getActivePickupRequests(ctx.organizationId);
    }),

    // Teacher views pickup requests for their classes
    teacherRequests: protectedProcedure.query(async ({ ctx }) => {
      return db.getPickupRequestsForTeacher(ctx.user!.id);
    }),

    // Staff gets pickup dashboard stats
    // SECURITY FIX: previously computed across ALL organizations combined.
    stats: tenantProcedure.query(async ({ ctx }) => {
      return db.getPickupStats(ctx.organizationId);
    }),

    // Get authorized pickup persons for a child
    // SECURITY FIX: previously had no check that childId belongs to the
    // caller's organization -- any authenticated staff user could read
    // (or add/remove) authorized pickup persons -- names, phone numbers,
    // national IDs -- for a child in a completely different organization.
    authorizedPersons: tenantProcedure.input(z.object({
      childId: z.number(),
    })).query(async ({ input, ctx }) => {
      const child = await db.getChildById(input.childId);
      if (!child || child.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      return db.getAuthorizedPickupPersons(input.childId);
    }),

    // Add authorized pickup person
    addAuthorizedPerson: tenantProcedure.input(z.object({
      childId: z.number(),
      name: z.string(),
      relationship: z.enum(['father', 'mother', 'grandfather', 'grandmother', 'driver', 'relative', 'other']),
      phone: z.string().optional(),
      nationalId: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const child = await db.getChildById(input.childId);
      if (!child || child.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
      const id = await db.addAuthorizedPickupPerson(input);
      return { id };
    }),

    // Remove authorized pickup person
    // SECURITY FIX: previously deleted by id alone with no check that the
    // authorized-person row's child belongs to the caller's organization.
    removeAuthorizedPerson: tenantProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input, ctx }) => {
      const dbConn = await (await import('./db')).getDb();
      const { authorizedPickupPersons: app, children: childrenTbl } = await import('../drizzle/schema');
      const { eq: eqOp } = await import('drizzle-orm');
      const rows = await dbConn!.select({ childOrgId: childrenTbl.organizationId })
        .from(app)
        .leftJoin(childrenTbl, eqOp(app.childId, childrenTbl.id))
        .where(eqOp(app.id, input.id))
        .limit(1);
      if (!rows[0] || rows[0].childOrgId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'غير موجود' });
      }
      await db.removeAuthorizedPickupPerson(input.id);
      return { success: true };
    }),

    // Staff views pickup history
    // SECURITY FIX: previously ran with no organizationId.
    history: tenantProcedure.input(z.object({
      limit: z.number().min(1).max(500).default(100),
    }).optional()).query(async ({ input, ctx }) => {
      return db.getPickupHistory(input?.limit || 100, ctx.organizationId);
    }),

    // ===== OPERATIONAL ALERTS =====

    // Acknowledge pickup alert (stops repeating sound)
    acknowledge: tenantProcedure.input(z.object({
      pickupRequestId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.acknowledgePickupAlert(input.pickupRequestId, ctx.user!.id, ctx.organizationId);
      return { success: true };
    }),

    // Get unacknowledged alerts for current user
    // SECURITY FIX: previously ran with no organizationId -- a staff member
    // would receive urgent alert entries for children in OTHER
    // organizations too.
    unacknowledgedAlerts: tenantProcedure.query(async ({ ctx }) => {
      return db.getUnacknowledgedPickupAlerts(ctx.user!.id, ctx.organizationId ?? undefined);
    }),

    // Get alert settings
    // SECURITY FIX: previously a single global row shared by every
    // organization -- any org's admin changing "alert settings" changed the
    // pickup-alarm volume/tone/escalation for every other organization's
    // staff. Per policy (full tenant isolation, Super Admin is the only
    // cross-org exception), this is now scoped per organization.
    alertSettings: tenantProcedure.query(async ({ ctx }) => {
      return db.getPickupAlertSettings(ctx.organizationId ?? undefined);
    }),

    // Update alert settings (admin only)
    updateAlertSettings: tenantProcedure.input(z.object({
      volume: z.number().min(0).max(100).optional(),
      tone: z.enum(['urgent', 'gentle', 'alarm', 'chime']).optional(),
      repeatIntervalSeconds: z.number().min(2).max(30).optional(),
      escalationMinutes: z.number().min(1).max(10).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (!['super_admin', 'admin', 'principal'].includes(ctx.user!.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      await db.updatePickupAlertSettings(input, ctx.organizationId ?? undefined);
      return { success: true };
    }),

    // Test pickup alert (admin only)
    testAlert: tenantProcedure.mutation(async ({ ctx }) => {
      if (!['super_admin', 'admin', 'principal'].includes(ctx.user!.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      // SECURITY FIX: previously called db.getOnDutyStaffIds() with no
      // organizationId -- a test alert push was sent to every organization's
      // on-duty staff, not just the caller's own.
      // Send a test operational alert push to all on-duty staff
      const { sendPushToUser } = await import('./_core/webPush');
      const onDutyIds = await db.getOnDutyStaffIds(ctx.organizationId ?? undefined);
      let sent = 0;
      for (const userId of onDutyIds) {
        try {
          const result = await sendPushToUser(
            userId,
            {
              title: '\u062a\u062c\u0631\u0628\u0629 \u062a\u0646\u0628\u064a\u0647 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645',
              body: '\u0647\u0630\u0627 \u062a\u0646\u0628\u064a\u0647 \u062a\u062c\u0631\u064a\u0628\u064a - \u0627\u0644\u0635\u0648\u062a \u0648\u0627\u0644\u0627\u0647\u062a\u0632\u0627\u0632 \u064a\u0639\u0645\u0644\u0627\u0646',
              tag: 'test-pickup-alert',
              data: { url: '/staff/pickup', type: 'pickup_alert', priority: 'urgent', isTest: true },
            },
            db.getPushSubscriptionsForUser
          );
          sent += result.sent;
        } catch {}
      }
      return { sent, onDutyCount: onDutyIds.length };
    }),

    // ===== DUTY STATUS =====
    
    // Get current user's duty status
    dutyStatus: protectedProcedure.query(async ({ ctx }) => {
      const status = await db.getStaffDutyStatus(ctx.user!.id);
      return { isOnDuty: status?.isOnDuty ?? true };
    }),

    // Toggle duty status
    toggleDuty: protectedProcedure.input(z.object({
      isOnDuty: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      await db.setStaffDutyStatus(ctx.user!.id, input.isOnDuty);
      return { isOnDuty: input.isOnDuty };
    }),
  }),

  // ============ PUSH NOTIFICATIONS ============
  push: router({
    getVapidPublicKey: publicProcedure.query(async () => {
      const { getVapidPublicKey } = await import('./_core/webPush');
      return { publicKey: getVapidPublicKey() };
    }),
    subscribe: protectedProcedure.input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
      userAgent: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.savePushSubscription({
        userId: ctx.user!.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      });
      return { success: true };
    }),
    unsubscribe: protectedProcedure.input(z.object({
      endpoint: z.string(),
    })).mutation(async ({ input, ctx }) => {
      await db.removePushSubscription(input.endpoint, ctx.user!.id);
      return { success: true };
    }),
    // Test push notification (for debugging)
    test: tenantProcedure.input(z.object({
      targetUserId: z.number().optional(),
    }).optional()).mutation(async ({ ctx, input }) => {
      const { sendPushToUser } = await import('./_core/webPush');
      // SECURITY FIX: previously trusted input.targetUserId with no check it
      // belongs to the caller's organization -- any authenticated user could
      // trigger a push notification (and a persisted notification row) to an
      // arbitrary user id anywhere on the platform, and use the
      // success/failure result to probe whether a given user id exists and
      // has an active push subscription. super_admin is exempt (sanctioned
      // cross-org exception); everyone else may only target themselves or a
      // user confirmed to be in their own organization.
      let targetId = ctx.user!.id;
      if (input?.targetUserId && input.targetUserId !== ctx.user!.id) {
        if (ctx.user!.role === 'super_admin') {
          targetId = input.targetUserId;
        } else {
          const targetUser = await db.getUserById(input.targetUserId, ctx.organizationId ?? undefined);
          if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
          targetId = input.targetUserId;
        }
      }
      const result = await sendPushToUser(
        targetId,
        {
          title: '\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',
          body: '\u0645\u0631\u062d\u0628\u0627\u064b! \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u062f\u0641\u0639 \u062a\u0639\u0645\u0644 \u0628\u0646\u062c\u0627\u062d. \u0627\u0644\u0635\u0648\u062a \u0648\u0627\u0644\u0627\u0647\u062a\u0632\u0627\u0632 \u064a\u0639\u0645\u0644\u0627\u0646 \u0628\u0634\u0643\u0644 \u0635\u062d\u064a\u062d.',
          tag: 'test',
          data: { url: '/', type: 'parent_arrival', priority: 'urgent' },
        },
        db.getPushSubscriptionsForUser
      );
      // Clean up expired subscriptions
      if (result.expired.length > 0) {
        await db.removeExpiredSubscriptions(result.expired);
      }
      // Log the test notification event
      try {
        await db.createNotification({
          userId: targetId,
          organizationId: ctx.organizationId ?? undefined,
          title: '\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',
          body: '\u0625\u0634\u0639\u0627\u0631 \u062a\u062c\u0631\u064a\u0628\u064a \u0645\u0646 \u0627\u0644\u0625\u062f\u0627\u0631\u0629',
          type: 'general',
        });
      } catch {}
      return { sent: result.sent, failed: result.failed, targetUserId: targetId };
    }),
    // Get push subscription status for all staff (admin only)
    staffStatus: tenantProcedure.query(async ({ ctx }) => {
      if (!['super_admin', 'admin', 'principal'].includes(ctx.user!.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      // SECURITY FIX: getUsersByRoles previously ran with no organizationId --
      // this admin dashboard would list every organization's staff push
      // subscription status, not just the caller's own organization.
      const staffUsers = await db.getUsersByRoles(['teacher', 'assistant', 'receptionist', 'admin', 'principal', 'super_admin'], ctx.organizationId);
      const statuses = await Promise.all(
        staffUsers.map(async (u) => {
          const subs = await db.getPushSubscriptionsForUser(u.id);
          return {
            userId: u.id,
            name: u.name || '',
            role: u.role,
            subscriptionCount: subs.length,
            hasActiveSubscription: subs.length > 0,
          };
        })
      );
      return statuses;
    }),
  }),
  // ============ AI TEACHER ASSISTANT ============
  ai: aiRouter,
  // ============ WEEKLY PLAN GENERATOR ============
  weeklyPlan: weeklyPlanRouter,
  // ============ AI MARKETING ============
  aiMarketing: aiMarketingRouter,
  // ============ SUPER ADMIN ============
  emailLogs: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), type: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
      const db2 = await (await import("./db")).getDb();
      if (!db2) return { items: [], stats: { sent: 0, failed: 0, total: 0 } };
      const { emailLogs } = await import("../drizzle/schema");
      const { desc, eq, and, like, or, sql } = await import("drizzle-orm");
      const conditions: any[] = [];
      // Staff sees only their org, super_admin sees all
      if (ctx.user?.role !== "super_admin" && ctx.organizationId) {
        conditions.push(eq(emailLogs.organizationId, ctx.organizationId));
      }
      if (input?.type && input.type !== "all") {
        conditions.push(eq(emailLogs.type, input.type));
      }
      if (input?.search) {
        conditions.push(or(like(emailLogs.recipientEmail, `%${input.search}%`), like(emailLogs.subject, `%${input.search}%`)));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const items = await db2.select().from(emailLogs).where(where).orderBy(desc(emailLogs.createdAt)).limit(100);
      const [statsResult] = await db2.select({ total: sql<number>`count(*)`, sent: sql<number>`sum(case when status='sent' then 1 else 0 end)`, failed: sql<number>`sum(case when status='failed' then 1 else 0 end)` }).from(emailLogs).where(conditions.length > 0 ? and(...conditions) : undefined);
      return { items, stats: { total: Number(statsResult?.total || 0), sent: Number(statsResult?.sent || 0), failed: Number(statsResult?.failed || 0) } };
    }),
  }),
  superAdmin: superAdminRouter,
  // ============ BRANDING ============
  branding: brandingRouter,
  // ============ ONBOARDING ============
  onboarding: onboardingRouter,
  // ============ GROWTH & DEVELOPMENT CENTER ============
  development: developmentRouter,
  // ============ PARENT ENGAGEMENT CENTER ============
  engagement: engagementRouter,
  // ============ NURSERY SELF-REGISTRATION ============
  registration: registrationRouter,
  // ============ STAFF MANAGEMENT ============
  staffManagement: staffManagementRouter,
  // ============ BULK IMPORT ============
  bulkImport: bulkImportRouter,
  // ============ META CONVERSIONS API ============
  capi: capiRouter,
  // ============ DEVELOPMENTAL ASSESSMENT (مقياس الكشف المبكر) ============
  assessment: assessmentRouter,
  curriculum: curriculumRouter,
  customAssessment: customAssessmentRouter,
  // ============ SUBSCRIPTION PAYMENT (MOYASAR) ============
  subscriptionPayment: subscriptionPaymentRouter,
  // ============ MARKETPLACE / STORE ============
  store: storeRouter,
  paymentSettings: paymentSettingsRouter,
  // ============ DEMO REQUESTS (Landing Page) ============
  demo: demoRouter,
  // ============ PAYROLL MANAGEMENT ============
  payroll: payrollRouter,
  // ============ PERFORMANCE EVALUATION ============
  evaluation: evaluationRouter,
  goals: goalsRouter,
});
export type AppRouter = typeof appRouter;
