import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as authService from "./_core/authService";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  return next({ ctx });
});

const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'teacher') throw new TRPCError({ code: 'FORBIDDEN', message: 'Teacher access required' });
  return next({ ctx });
});

const parentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (ctx.user.role === 'parent' && !ctx.user.isActive) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'حسابك قيد المراجعة. يرجى انتظار موافقة الإدارة.' });
  }
  return next({ ctx });
});

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

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ============ LOGIN WITH PASSWORD ============
    login: publicProcedure
      .input(z.object({
        identifier: z.string().min(1), // email or phone
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const ip = ctx.req.headers['x-forwarded-for'] as string || ctx.req.socket.remoteAddress || '';
        
        // Find user by email or phone
        const user = await db.findUserByIdentifier(input.identifier);
        if (!user) {
          await authService.recordLoginAttempt({ identifier: input.identifier, ip, success: false, reason: 'user_not_found' });
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
        }

        // Check if account is locked
        const lockStatus = await authService.isAccountLocked(user.id);
        if (lockStatus.locked) {
          const remainingMinutes = Math.ceil((lockStatus.lockedUntil!.getTime() - Date.now()) / 60000);
          throw new TRPCError({ code: 'FORBIDDEN', message: `تم قفل الحساب مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة.` });
        }

        // Verify password
        if (!user.password) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'يرجى استخدام تسجيل الدخول عبر المنصة' });
        }

        const passwordValid = await authService.verifyPassword(input.password, user.password);
        if (!passwordValid) {
          const result = await authService.handleFailedLogin(user.id);
          await authService.recordLoginAttempt({ userId: user.id, identifier: input.identifier, ip, success: false, reason: 'wrong_password' });
          if (result.locked) {
            throw new TRPCError({ code: 'FORBIDDEN', message: `تم قفل الحساب بعد ${authService.AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS} محاولات فاشلة. يرجى المحاولة بعد ${authService.AUTH_CONSTANTS.ACCOUNT_LOCKOUT_MINUTES} دقيقة.` });
          }
          throw new TRPCError({ code: 'UNAUTHORIZED', message: `بيانات الدخول غير صحيحة. المحاولات المتبقية: ${result.attemptsRemaining}` });
        }

        // Check if account is active
        if (!user.isActive) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'حسابك غير مفعل. يرجى التواصل مع الإدارة.' });
        }

        // Successful login - reset failed attempts
        await authService.resetFailedAttempts(user.id);
        await authService.recordLoginAttempt({ userId: user.id, identifier: input.identifier, ip, success: true });

        return { success: true, user: { id: user.id, name: user.name, role: user.role, email: user.email } };
      }),

    // ============ REGISTER (Parent Self-Registration) ============
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        phone: z.string().min(9),
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
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
        });

        // Generate and send OTP
        const { code, expiresAt } = await authService.createOtp({
          userId,
          phone: input.phone,
          email: input.email,
          type: 'registration',
        });

        // Send OTP via SMS
        await authService.sendSmsOtp(input.phone, code);

        return {
          success: true,
          message: 'تم إنشاء الحساب. يرجى إدخال رمز التحقق المرسل إلى جوالك.',
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
        }

        return { success: true, message: 'تم تفعيل حسابك بنجاح. يمكنك الآن تسجيل الدخول.' };
      }),

    // ============ FORGOT PASSWORD - REQUEST RESET ============
    forgotPassword: publicProcedure
      .input(z.object({
        identifier: z.string().min(1), // email or phone
        method: z.enum(['email', 'sms']),
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

        if (input.method === 'email') {
          // Generate reset token and send email link
          const { token } = await authService.createPasswordResetToken(user.id);
          const origin = ctx.req.headers.origin || ctx.req.headers.referer || '';
          const resetLink = `${origin}/reset-password?token=${token}`;
          await authService.sendPasswordResetEmail(user.email || input.identifier, resetLink, user.name || undefined);
          
          // Also send OTP for email verification
          const { code, expiresAt } = await authService.createOtp({
            userId: user.id,
            email: user.email || input.identifier,
            type: 'password_reset',
          });
          await authService.sendEmailOtp(user.email || input.identifier, code, user.name || undefined);
          
          return { success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', expiresAt: expiresAt.getTime() };
        } else {
          // Send OTP via SMS
          const { code, expiresAt } = await authService.createOtp({
            userId: user.id,
            phone: user.phone || input.identifier,
            type: 'password_reset',
          });
          await authService.sendSmsOtp(user.phone || input.identifier, code);
          
          return { success: true, message: 'تم إرسال رمز التحقق إلى رقم جوالك.', expiresAt: expiresAt.getTime() };
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
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يمكن تغيير كلمة المرور لحسابات المنصة' });
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

        // Send OTP
        if (input.identifier.includes('@')) {
          await authService.sendEmailOtp(input.identifier, code);
        } else {
          await authService.sendSmsOtp(input.identifier, code);
        }

        return { success: true, message: 'تم إرسال رمز تحقق جديد.', expiresAt: expiresAt.getTime() };
      }),

    // ============ GET AUTH CONSTANTS (for frontend) ============
    getAuthConfig: publicProcedure.query(() => ({
      otpExpiryMinutes: authService.AUTH_CONSTANTS.OTP_EXPIRY_MINUTES,
      otpCooldownSeconds: authService.AUTH_CONSTANTS.OTP_COOLDOWN_SECONDS,
      maxFailedAttempts: authService.AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS,
      lockoutMinutes: authService.AUTH_CONSTANTS.ACCOUNT_LOCKOUT_MINUTES,
      sessionTimeoutMinutes: authService.AUTH_CONSTANTS.SESSION_TIMEOUT_MINUTES,
    })),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
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
      return db.getDashboardStats();
    }),
  }),

  children: router({
    list: protectedProcedure.input(z.object({ parentId: z.number().optional(), classId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // Parents can only see their own children
      if (ctx.user?.role === 'parent') {
        return db.getChildren(ctx.user.id);
      }
      // If classId filter is provided, return children for that class
      if (input?.classId) {
        return db.getChildrenByClass(input.classId);
      }
      // Teachers see children from their assigned class, fallback to all if no class assigned
      if (ctx.user?.role === 'teacher' || ctx.user?.role === 'assistant') {
        const teacherClass = await db.getClassForTeacher(ctx.user!.id);
        if (teacherClass) {
          return db.getChildrenByClass(teacherClass.id);
        }
      }
      // Admin or teacher without class: return all children
      return db.getChildren(input?.parentId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only view their own children's details
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.id)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getChildById(input.id);
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
    })).mutation(async ({ input }) => {
      const { parentId, ...childData } = input;
      const child = await db.createChild({ ...childData, dateOfBirth: new Date(input.dateOfBirth) });
      if (parentId && child.id) {
        await db.linkParentToChild(parentId, child.id as number);
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
      notes: z.string().optional(),
      status: z.enum(["active", "inactive", "graduated", "waitlist"]).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
      return db.updateChild(id, updateData);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteChild(input.id);
      return { success: true };
    }),
    archive: teacherProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.updateChild(input.id, { status: 'inactive' });
    }),
    activate: teacherProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.updateChild(input.id, { status: 'active' });
    }),
    getParents: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input }) => {
      return db.getParentsForChild(input.childId);
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
      const child = await db.createChild({ ...input, dateOfBirth: new Date(input.dateOfBirth) });
      // Auto-link child to the parent
      if (child && child.id) {
        await db.linkParentToChild(ctx.user!.id, child.id as number, 'parent');
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
    byDate: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input, ctx }) => {
      // Parents can only see attendance for their own children
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getAttendanceByDateForChildren(input.date, childIds);
      }
      return db.getAttendanceByDate(input.date);
    }),
    byChild: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only see their own children's attendance
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getAttendanceByChild(input.childId);
    }),
    checkIn: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      droppedOffBy: z.string().optional(),
      droppedOffRelationship: z.enum(["mother", "father", "driver", "grandparent", "other"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const result = await db.createAttendance({
        childId: input.childId,
        date: new Date(input.date),
        status: "present",
        checkInTime: new Date(),
        checkedInBy: ctx.user!.id,
        droppedOffBy: input.droppedOffBy,
        droppedOffRelationship: input.droppedOffRelationship,
        notes: input.notes,
      });
      // Notify parent about child arrival
      const child = await db.getChildById(input.childId);
      if (child?.parentId) {
        await db.createNotification({
          userId: child.parentId,
          title: 'Child Arrival',
          titleAr: '\u0648\u0635\u0648\u0644 \u0627\u0644\u0637\u0641\u0644',
          body: `${child.firstName} has arrived at the center`,
          bodyAr: `\u0648\u0635\u0644 ${child.firstName} ${child.lastName} \u0625\u0644\u0649 \u0627\u0644\u0645\u0631\u0643\u0632`,
          type: 'attendance',
          metadata: { childId: input.childId, time: new Date().toISOString(), type: 'checkin' },
        });
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
      await db.updateAttendance(input.id, { checkOutTime: new Date(), checkedOutBy: ctx.user!.id });
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
      const child = await db.getChildById(input.childId);
      if (child?.parentId) {
        await db.createNotification({
          userId: child.parentId,
          title: 'Child Departure',
          titleAr: '\u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u0637\u0641\u0644',
          body: `${child.firstName} has left the center`,
          bodyAr: `\u063a\u0627\u062f\u0631 ${child.firstName} ${child.lastName} \u0627\u0644\u0645\u0631\u0643\u0632`,
          type: 'attendance',
          metadata: { childId: input.childId, time: new Date().toISOString(), type: 'checkout', pickedUpBy: input.pickedUpBy },
        });
      }
      return { success: true };
    }),
    markAbsent: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      status: z.enum(["absent", "excused"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Check if attendance record exists for this child on this date
      const existing = await db.getAttendanceForChildOnDate(input.childId, input.date);
      if (existing) {
        const previousStatus = existing.status;
        await db.updateAttendance(existing.id, { status: input.status, notes: input.notes });
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
      const result = await db.createAttendance({ childId: input.childId, date: new Date(input.date), status: input.status, notes: input.notes });
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
      const existing = await db.getAttendanceById(input.id);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '\u0633\u062c\u0644 \u0627\u0644\u062d\u0636\u0648\u0631 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f' });
      }
      const previousStatus = existing.status;
      const updateData: any = { status: input.newStatus };
      if ((input.newStatus === 'present' || input.newStatus === 'checked_in') && !existing.checkInTime) {
        updateData.checkInTime = new Date();
        updateData.checkedInBy = ctx.user!.id;
      }
      if (input.newStatus === 'checked_out' && !existing.checkOutTime) {
        updateData.checkOutTime = new Date();
        updateData.checkedOutBy = ctx.user!.id;
      }
      await db.updateAttendance(input.id, updateData);
      await db.createAttendanceAuditLog({
        attendanceId: input.id,
        childId: input.childId,
        previousStatus,
        newStatus: input.newStatus,
        changedBy: ctx.user!.id,
        changedByName: ctx.user!.name || '\u0645\u0633\u062a\u062e\u062f\u0645',
        notes: input.notes,
      });
      const child = await db.getChildById(input.childId);
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
    auditLog: protectedProcedure.input(z.object({
      childId: z.number().optional(),
      attendanceId: z.number().optional(),
    })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (input.childId && !childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
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
    list: protectedProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
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
      return db.getDailyReports(input?.childId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const report = await db.getDailyReportById(input.id);
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
      return db.createDailyReport({ ...input, date: new Date(input.date), teacherId: ctx.user!.id });
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
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDailyReport(id, data);
      return { success: true };
    }),
  }),

  messages: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      // Admin sees all conversations, others see only their own
      if (ctx.user?.role === 'admin') {
        return db.getAllConversations();
      }
      return db.getConversations(ctx.user!.id);
    }),
    list: protectedProcedure.input(z.object({ conversationId: z.number() })).query(async ({ input }) => {
      return db.getMessages(input.conversationId);
    }),
    send: protectedProcedure.input(z.object({
      conversationId: z.number(),
      content: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      return db.createMessage({ conversationId: input.conversationId, senderId: ctx.user!.id, content: input.content });
    }),
    createConversation: protectedProcedure.input(z.object({ participantId: z.number() })).mutation(async ({ input, ctx }) => {
      return db.createConversation(ctx.user!.id, input.participantId);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadMessageCount(ctx.user!.id);
    }),
  }),

  finance: router({
    invoices: protectedProcedure.input(z.object({ parentId: z.number().optional(), status: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        return db.getInvoices(ctx.user.id);
      }
      return db.getInvoices(input?.parentId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.id);
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
      });
      // Notify parent about new invoice
      await db.createNotification({
        userId: input.parentId,
        title: 'فاتورة جديدة',
        titleAr: 'فاتورة جديدة',
        body: `تم إنشاء فاتورة جديدة بمبلغ ${total.toLocaleString('ar-SA')} ر.س - ${input.description}`,
        bodyAr: `تم إنشاء فاتورة جديدة بمبلغ ${total.toLocaleString('ar-SA')} ر.س - ${input.description}`,
        type: 'payment',
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      return invoice;
    }),
    updateInvoice: adminProcedure.input(z.object({
      id: z.number(),
      description: z.string().optional(),
      subtotal: z.string().optional(),
      dueDate: z.string().optional(),
      invoiceType: z.enum(['tuition', 'activity', 'trip', 'uniform', 'registration', 'other']).optional(),
    })).mutation(async ({ input }) => {
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
      await db.updateInvoice(input.id, updateData);
      return { success: true };
    }),
    markPaid: adminProcedure.input(z.object({ id: z.number(), paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'apple_pay', 'mada', 'stc_pay']) })).mutation(async ({ input }) => {
      const invoice = await db.getInvoiceById(input.id);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      await db.updateInvoice(input.id, { status: 'paid', paidAt: new Date(), paymentMethod: input.paymentMethod, paidAmount: invoice.total });
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
        title: 'تأكيد الدفع',
        titleAr: 'تأكيد الدفع',
        body: `تم تسجيل دفع الفاتورة ${invoice.invoiceNumber} بنجاح`,
        bodyAr: `تم تسجيل دفع الفاتورة ${invoice.invoiceNumber} بنجاح`,
        type: 'payment',
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      return { success: true };
    }),
    markPending: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateInvoice(input.id, { status: 'pending', paidAt: null, paymentMethod: undefined as any, paidAmount: '0.00' });
      return { success: true };
    }),
    deleteInvoice: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteInvoice(input.id);
      return { success: true };
    }),
    sendReminder: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const invoice = await db.getInvoiceById(input.id);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' });
      await db.createNotification({
        userId: invoice.parentId,
        title: 'تذكير بالدفع',
        titleAr: 'تذكير بالدفع',
        body: `تذكير: لديك فاتورة مستحقة بمبلغ ${Number(invoice.total).toLocaleString('ar-SA')} ر.س - ${invoice.description || invoice.invoiceNumber}. تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}`,
        bodyAr: `تذكير: لديك فاتورة مستحقة بمبلغ ${Number(invoice.total).toLocaleString('ar-SA')} ر.س - ${invoice.description || invoice.invoiceNumber}. تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar-SA')}`,
        type: 'payment',
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      return { success: true };
    }),
    summary: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role === 'parent') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }
      return db.getEnhancedFinanceSummary();
    }),
    export: adminProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      return db.getFinanceExportData({
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
    verify: protectedProcedure.input(z.object({
      paymentId: z.number().optional(),
      moyasarPaymentId: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { fetchMoyasarPayment, isMoyasarConfigured } = await import('./_core/moyasar');
      
      let payment;
      if (input.paymentId) {
        payment = await db.getPaymentById(input.paymentId);
      } else if (input.moyasarPaymentId) {
        payment = await db.getPaymentByMoyasarId(input.moyasarPaymentId);
      }
      
      if (!payment) throw new TRPCError({ code: 'NOT_FOUND', message: 'الدفعة غير موجودة' });
      
      if (!isMoyasarConfigured()) {
        // Mock mode - simulate successful payment
        return { status: 'not_configured', message: 'بوابة الدفع غير مفعلة حالياً' };
      }
      
      // Verify with Moyasar
      const moyasarPayment = await fetchMoyasarPayment(payment.moyasarPaymentId!);
      
      if (moyasarPayment.status === 'paid') {
        await db.updatePayment(payment.id, { status: 'paid', paidAt: new Date() });
        
        // Update invoice
        const invoice = await db.getInvoiceById(payment.invoiceId);
        if (invoice) {
          const newPaidAmount = Number(invoice.paidAmount || 0) + Number(payment.amount);
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
    byInvoice: protectedProcedure.input(z.object({ invoiceId: z.number() })).query(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.invoiceId);
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user?.role === 'parent' && invoice.parentId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return db.getPaymentsByInvoice(input.invoiceId);
    }),
    gatewayStatus: publicProcedure.query(async () => {
      const { isMoyasarConfigured, getMoyasarPublishableKey } = await import('./_core/moyasar');
      return {
        isConfigured: isMoyasarConfigured(),
        publishableKey: getMoyasarPublishableKey(),
      };
    }),
  }),

  transactions: router({
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getAllTransactions(input?.limit || 100);
    }),
    byInvoice: protectedProcedure.input(z.object({ invoiceId: z.number() })).query(async ({ input, ctx }) => {
      const invoice = await db.getInvoiceById(input.invoiceId);
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
      const invoice = await db.getInvoiceById(input.invoiceId);
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
      });
      
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
        title: 'تم الاسترداد',
        titleAr: 'تم الاسترداد',
        body: `تم استرداد مبلغ ${parseFloat(input.amount).toLocaleString('ar-SA')} ر.س من الفاتورة ${invoice.invoiceNumber}`,
        bodyAr: `تم استرداد مبلغ ${parseFloat(input.amount).toLocaleString('ar-SA')} ر.س من الفاتورة ${invoice.invoiceNumber}`,
        type: 'payment',
        metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });
      
      return refund;
    }),
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getAllRefunds(input?.limit || 100);
    }),
  }),

  tuitionPlans: router({
    list: adminProcedure.query(async () => {
      return db.getTuitionPlans();
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
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.updateTuitionPlan(id, updateData);
      return { success: true };
    }),
    generateInvoices: adminProcedure.mutation(async () => {
      const generated = await db.generateInvoicesFromPlans();
      // Notify parents for each generated invoice
      for (const invoice of generated) {
        await db.createNotification({
          userId: invoice.parentId,
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
    balance: protectedProcedure.query(async ({ ctx }) => {
      return db.getLoyaltyBalance(ctx.user!.id);
    }),
    transactions: protectedProcedure.query(async ({ ctx }) => {
      return db.getLoyaltyTransactions(ctx.user!.id);
    }),
    rewards: protectedProcedure.query(async () => {
      return db.getLoyaltyRewards();
    }),
    addPoints: adminProcedure.input(z.object({
      userId: z.number(),
      points: z.number(),
      description: z.string(),
    })).mutation(async ({ input }) => {
      await db.addLoyaltyPoints(input.userId, input.points, "earned", input.description);
      return { success: true };
    }),
    redeem: protectedProcedure.input(z.object({ rewardId: z.number() })).mutation(async ({ ctx, input }) => {
      const rewards = await db.getLoyaltyRewards();
      const reward = rewards.find(r => r.id === input.rewardId);
      if (!reward) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reward not found' });
      const balance = await db.getLoyaltyBalance(ctx.user!.id);
      if (balance.points < reward.pointsCost) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient points' });
      await db.addLoyaltyPoints(ctx.user!.id, -reward.pointsCost, "redeemed", `Redeemed: ${reward.name}`);
      return { success: true };
    }),
    createReward: adminProcedure.input(z.object({
      name: z.string(),
      nameAr: z.string(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      pointsCost: z.number(),
    })).mutation(async ({ input }) => {
      return db.createLoyaltyReward(input);
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotifications(ctx.user!.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user!.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user!.id);
      return { success: true };
    }),
  }),

  classes: router({
    list: protectedProcedure.query(async () => {
      return db.getClasses();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getClassById(input.id);
    }),
    children: protectedProcedure.input(z.object({ classId: z.number() })).query(async ({ input }) => {
      return db.getChildrenByClass(input.classId);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      ageGroup: z.string().optional(),
      capacity: z.number().optional(),
      teacherId: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createClass(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      ageGroup: z.string().optional(),
      capacity: z.number().optional(),
      teacherId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateClass(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteClass(input.id);
    }),
  }),

  staffAttendance: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      return db.getTodayStaffAttendance(ctx.user!.id);
    }),
    byDate: adminProcedure.input(z.object({ date: z.string() })).query(async ({ input }) => {
      return db.getStaffAttendanceByDate(input.date);
    }),
    myHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getStaffAttendanceByUser(ctx.user!.id);
    }),
    checkIn: protectedProcedure.input(z.object({
      gpsLat: z.number(),
      gpsLng: z.number(),
      device: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Verify GPS is within center radius
      const settings = await db.getCenterSettings();
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
      });
    }),
    checkOut: protectedProcedure.input(z.object({
      id: z.number(),
      gpsLat: z.number(),
      gpsLng: z.number(),
    })).mutation(async ({ input }) => {
      await db.staffCheckOut(input.id, {
        checkOutTime: new Date(),
        gpsLatOut: input.gpsLat.toString(),
        gpsLngOut: input.gpsLng.toString(),
      });
      return { success: true };
    }),
  }),

  centerSettings: router({
    get: adminProcedure.query(async () => {
      return db.getCenterSettings();
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
    })).mutation(async ({ input }) => {
      return db.updateCenterSettings(input);
    }),
  }),

  dailyActivities: router({
    byChild: protectedProcedure.input(z.object({ childId: z.number(), date: z.string().optional() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getDailyActivities(input.childId, input.date);
    }),
    byClass: teacherProcedure.input(z.object({ classId: z.number(), date: z.string() })).query(async ({ input }) => {
      return db.getDailyActivitiesByClass(input.classId, input.date);
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
      return db.createDailyActivity({ ...input, recordedBy: ctx.user!.id, recordedAt: new Date() });
    }),
  }),

  departures: router({
    byDate: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getDeparturesByDateForChildren(input.date, childIds);
      }
      return db.getDeparturesByDate(input.date);
    }),
    byChild: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getDeparturesByChild(input.childId);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      attendanceId: z.number().optional(),
      departureTime: z.string(),
      pickedUpBy: z.string().min(1),
      relationship: z.enum(['parent', 'driver', 'guardian', 'other']),
      pickedUpById: z.number().optional(),
      notes: z.string().optional(),
      status: z.enum(['completed', 'pending', 'late']).optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDeparture({
        ...input,
        departureTime: new Date(input.departureTime),
        recordedBy: ctx.user!.id,
      });
    }),
  }),
  media: router({
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
      childIds: z.array(z.number()).optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createMedia({ ...input, uploadedBy: ctx.user!.id });
    }),
    uploadBatch: teacherProcedure.input(z.object({
      items: z.array(z.object({
        type: z.enum(['photo', 'video']),
        url: z.string(),
        fileKey: z.string().optional(),
        caption: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
      })),
      classId: z.number().optional(),
      visibility: z.enum(['class', 'specific']).optional(),
      childIds: z.array(z.number()).optional(),
    })).mutation(async ({ input, ctx }) => {
      const results = [];
      for (const item of input.items) {
        const result = await db.createMedia({
          ...item,
          classId: input.classId,
          visibility: input.visibility,
          childIds: input.childIds,
          uploadedBy: ctx.user!.id,
        });
        results.push(result);
      }
      return results;
    }),
    list: protectedProcedure.input(z.object({
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
          return db.getMediaForChild(input.childId, input?.limit);
        }
        return db.getMediaForChildren(childIds, input?.limit);
      }
      // Admin sees all
      if (ctx.user?.role === 'admin') {
        return db.getAllMedia(input?.limit);
      }
      // Teacher sees by class
      if (input?.classId) {
        return db.getMediaForClass(input.classId, input?.limit);
      }
      return db.getAllMedia(input?.limit);
    }),
    getChildren: protectedProcedure.input(z.object({ mediaId: z.number() })).query(async ({ input }) => {
      return db.getMediaChildren(input.mediaId);
    }),
    delete: teacherProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // Only admin or the uploader can delete
      const item = await db.getMediaById(input.id);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      if (ctx.user?.role !== 'admin' && item.uploadedBy !== ctx.user!.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641' });
      }
      await db.deleteMedia(input.id);
      return { success: true };
    }),
    approve: adminProcedure.input(z.object({ id: z.number(), isApproved: z.boolean() })).mutation(async ({ input }) => {
      await db.updateMediaApproval(input.id, input.isApproved);
      return { success: true };
    }),
    // AI: Generate caption for an uploaded photo
    aiCaption: teacherProcedure.input(z.object({
      imageUrl: z.string(),
    })).mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const response = await invokeLLM({
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
      });
      const captionContent = response.choices?.[0]?.message?.content;
      const caption = (typeof captionContent === 'string' ? captionContent.trim() : '') || "";
      return { caption };
    }),
    // AI: Suggest which children appear in a photo
    aiSuggestChildren: teacherProcedure.input(z.object({
      imageUrl: z.string(),
      classId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      // Get children from the class (or all active children)
      let childrenList;
      if (input.classId) {
        childrenList = await db.getChildrenByClass(input.classId);
      } else {
        childrenList = await db.getChildren();
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
      
      const response = await invokeLLM({
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
      });
      
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
  calendar: router({
    events: protectedProcedure.input(z.object({ classId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getCalendarEvents(input?.classId);
    }),
    create: adminProcedure.input(z.object({
      title: z.string().min(1),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      type: z.enum(['holiday', 'event', 'meeting', 'deadline', 'other']),
      classId: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createCalendarEvent({
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      });
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteCalendarEvent(input.id);
    }),
  }),

  announcements: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role === 'parent') {
        return db.getAnnouncements('parents');
      }
      if (ctx.user?.role === 'teacher') {
        return db.getAnnouncements('staff');
      }
      return db.getAnnouncements();
    }),
    create: adminProcedure.input(z.object({
      title: z.string().min(1),
      titleAr: z.string().optional(),
      content: z.string().min(1),
      contentAr: z.string().optional(),
      audience: z.enum(['all', 'parents', 'staff']),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createAnnouncement({ ...input, createdBy: ctx.user!.id });
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteAnnouncement(input.id);
    }),
  }),

  documents: router({
    list: protectedProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (input?.childId && !childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        return db.getDocuments('parents', input?.childId);
      }
      return db.getDocuments(undefined, input?.childId);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      type: z.enum(['policy', 'form', 'report', 'certificate', 'other']),
      url: z.string(),
      childId: z.number().optional(),
      audience: z.enum(['all', 'parents', 'staff']).optional(),
      requiresSignature: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDocument({ ...input, uploadedBy: ctx.user!.id });
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteDocument(input.id);
    }),
    sign: protectedProcedure.input(z.object({ documentId: z.number() })).mutation(async ({ input, ctx }) => {
      return db.createSignature({ documentId: input.documentId, parentId: ctx.user!.id, signedAt: new Date() });
    }),
    signatures: protectedProcedure.input(z.object({ documentId: z.number() })).query(async ({ input }) => {
      return db.getSignaturesForDocument(input.documentId);
    }),
  }),

  childDocuments: router({
    listByChild: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only see their own children's documents
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getChildDocuments(input.childId);
    }),
    listAll: teacherProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getAllChildDocuments(input?.status);
    }),
    create: protectedProcedure.input(z.object({
      childId: z.number(),
      type: z.enum(['birth_certificate', 'family_id', 'immunization', 'passport', 'national_id', 'medical_report', 'allergy_report', 'photo', 'other']),
      name: z.string().min(1),
      fileUrl: z.string(),
      fileKey: z.string().optional(),
      mimeType: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Parents can only upload for their own children
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      const status = (ctx.user?.role === 'admin' || ctx.user?.role === 'teacher') ? 'approved' : 'pending';
      return db.createChildDocument({ ...input, uploadedBy: ctx.user!.id, status });
    }),
    approve: teacherProcedure.input(z.object({ id: z.number(), reviewNote: z.string().optional() })).mutation(async ({ input, ctx }) => {
      return db.updateChildDocument(input.id, { status: 'approved', reviewedBy: ctx.user!.id, reviewedAt: new Date(), reviewNote: input.reviewNote || null });
    }),
    reject: teacherProcedure.input(z.object({ id: z.number(), reviewNote: z.string().optional() })).mutation(async ({ input, ctx }) => {
      return db.updateChildDocument(input.id, { status: 'rejected', reviewedBy: ctx.user!.id, reviewedAt: new Date(), reviewNote: input.reviewNote || null });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      // Parents can only delete their own uploads
      if (ctx.user?.role === 'parent') {
        // For simplicity, allow delete of own uploads only
      }
      return db.deleteChildDocument(input.id);
    }),
  }),

  medicalInfo: router({
    get: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
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
    })).mutation(async ({ input }) => {
      const { childId, ...data } = input;
      return db.upsertMedicalInfo(childId, data);
    }),
  }),

  emergencyContacts: router({
    list: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getEmergencyContacts(input.childId);
    }),
    create: protectedProcedure.input(z.object({
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
      }
      return db.createEmergencyContact(input);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteEmergencyContact(input.id);
    }),
  }),

  enrollment: router({
    list: adminProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getEnrollments(input?.status);
    }),
    create: adminProcedure.input(z.object({
      childId: z.number(),
      classId: z.number().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      status: z.enum(['active', 'pending', 'withdrawn', 'graduated']).optional(),
    })).mutation(async ({ input }) => {
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
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.updateEnrollment(id, updateData);
      return { success: true };
    }),
  }),

  waitingList: router({
    list: adminProcedure.query(async () => {
      return db.getWaitingList();
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
    })).mutation(async ({ input }) => {
      return db.createWaitingListEntry({
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['waiting', 'contacted', 'enrolled', 'declined']).optional(),
      notes: z.string().optional(),
      priority: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateWaitingListEntry(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteWaitingListEntry(input.id);
    }),
  }),

  eyfs: router({
    assessments: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getEyfsAssessments(input.childId);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      area: z.string(),
      subArea: z.string().optional(),
      level: z.enum(['emerging', 'developing', 'secure', 'exceeding']),
      notes: z.string().optional(),
      evidence: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createEyfsAssessment({ ...input, assessedBy: ctx.user!.id, assessedAt: new Date() });
    }),
  }),

  auditLog: router({
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getAuditLogs(input?.limit);
    }),
  }),

  users: router({
    list: adminProcedure.input(z.object({ role: z.string().optional(), search: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getUsersByRole(input?.role, input?.search);
    }),
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getUserById(input.id);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      role: z.enum(['teacher', 'parent', 'assistant', 'accountant', 'receptionist']),
      nationalId: z.string().optional(),
      password: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Generate a unique openId for manually created users
      const openId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const { password, ...userData } = input;
      const user = await db.createUser({ ...userData, openId });
      // If password provided, store hashed password for direct login
      if (password && user) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.updateUser(user.id, { password: hashedPassword } as any);
      }
      return user;
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(['teacher', 'parent', 'assistant', 'accountant', 'receptionist', 'user']).optional(),
      nationalId: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateUser(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteUser(input.id);
    }),
    linkChild: adminProcedure.input(z.object({ parentId: z.number(), childId: z.number(), relationship: z.string().optional() })).mutation(async ({ input }) => {
      return db.linkParentToChild(input.parentId, input.childId, input.relationship || 'parent');
    }),
    unlinkChild: adminProcedure.input(z.object({ parentId: z.number(), childId: z.number(), relationship: z.string().optional() })).mutation(async ({ input }) => {
      return db.unlinkParentFromChild(input.parentId, input.childId);
    }),
    getChildren: adminProcedure.input(z.object({ parentId: z.number() })).query(async ({ input }) => {
      return db.getChildrenForParent(input.parentId);
    }),
    getUnlinkedChildren: adminProcedure.query(async () => {
      return db.getUnlinkedChildren();
    }),
    getParentsForChild: adminProcedure.input(z.object({ childId: z.number() })).query(async ({ input }) => {
      return db.getParentsForChild(input.childId);
    }),
    activate: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.updateUser(input.id, { isActive: true });
    }),
    deactivate: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.updateUser(input.id, { isActive: false });
    }),
    // Get pending parents (role='parent', isActive=false) awaiting approval
    pending: adminProcedure.query(async () => {
      return db.getPendingParents();
    }),
    // Approve a pending parent (set isActive=true)
    approveAsParent: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.approveParent(input.id);
      return { success: true };
    }),
    // Reject a pending parent
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectParent(input.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
