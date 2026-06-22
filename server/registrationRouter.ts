import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as authService from "./_core/authService";
import { notifyOwner } from "./_core/notification";

// Saudi cities list
const saudiCities = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الظهران", "تبوك", "بريدة", "حائل", "الطائف",
  "أبها", "خميس مشيط", "نجران", "جازان", "ينبع", "الجبيل",
  "القطيف", "الأحساء", "عنيزة", "سكاكا", "الباحة", "عرعر",
  "حفر الباطن", "الخرج", "المجمعة"
];

export const registrationRouter = router({
  // Get available plans for the registration form
  getPlans: publicProcedure.query(async () => {
    return [
      {
        id: "basic",
        name: "أساسي",
        nameEn: "Basic",
        price: 6900,
        period: "سنوياً",
        maxChildren: 50,
        maxStaff: 10,
        features: [
          "حتى ٥٠ طفل",
          "حتى ١٠ موظفين",
          "الحضور وتسجيل الدخول/الخروج",
          "التقارير اليومية",
          "التواصل مع الأهالي",
          "تطبيق الأهل للجوال",
          "الدعم الفني",
        ],
      },
      {
        id: "professional",
        name: "احترافي",
        nameEn: "Professional",
        price: 10900,
        period: "سنوياً",
        maxChildren: 100,
        maxStaff: 25,
        popular: true,
        features: [
          "حتى ١٠٠ طفل",
          "حتى ٢٥ موظف",
          "جميع مزايا الخطة الأساسية",
          "المساعد الذكي (AI)",
          "التقييمات ومتابعة التطور",
          "أدوات التخطيط التعليمي",
          "التحليلات والتقارير المتقدمة",
          "تطبيق الأهل للجوال",
        ],
      },
      {
        id: "enterprise",
        name: "مؤسسي",
        nameEn: "Enterprise",
        price: 15900,
        period: "سنوياً",
        maxChildren: 200,
        maxStaff: 50,
        features: [
          "حتى ٢٠٠ طفل",
          "فروع متعددة",
          "جميع مزايا الخطة الاحترافية",
          "صلاحيات وأدوار متقدمة",
          "مدير حساب مخصص",
          "أولوية الدعم الفني",
          "التكامل والوصول عبر API",
          "خيارات العلامة التجارية المخصصة",
        ],
      },
    ];
  }),

  // Get Saudi cities list
  getCities: publicProcedure.query(() => saudiCities),

  // Submit nursery registration
  submit: publicProcedure
    .input(z.object({
      // Nursery info
      nurseryName: z.string().min(2, "اسم الحضانة مطلوب"),
      nurseryNameAr: z.string().min(2, "اسم الحضانة بالعربية مطلوب"),
      city: z.string().min(2, "المدينة مطلوبة"),
      district: z.string().optional(),
      childrenCount: z.number().min(1, "عدد الأطفال مطلوب").max(500),
      staffCount: z.number().min(1, "عدد الموظفين مطلوب").max(200),
      licenseNumber: z.string().optional(),
      // Owner info
      ownerName: z.string().min(2, "اسم المالك مطلوب"),
      ownerEmail: z.string().email("البريد الإلكتروني غير صحيح"),
      ownerPhone: z.string().min(9, "رقم الجوال غير صحيح").max(15),
      ownerPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
      // Plan
      selectedPlan: z.enum(["basic", "professional", "enterprise"]),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if email already registered
      const emailExists = await db.checkNurseryRegistrationEmailExists(input.ownerEmail);
      if (emailExists) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى استخدام بريد إلكتروني آخر أو التواصل مع الدعم الفني.',
        });
      }

      // Also check if user already exists in the system
      const existingUser = await db.findUserByIdentifier(input.ownerEmail);
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'هذا البريد الإلكتروني مسجل مسبقاً في النظام. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.',
        });
      }

      // Hash password
      const hashedPassword = await authService.hashPassword(input.ownerPassword);

      // Create registration request
      const registrationId = await db.createNurseryRegistration({
        nurseryName: input.nurseryName,
        nurseryNameAr: input.nurseryNameAr,
        city: input.city,
        district: input.district || null,
        childrenCount: input.childrenCount,
        staffCount: input.staffCount,
        licenseNumber: input.licenseNumber || null,
        ownerName: input.ownerName,
        ownerEmail: input.ownerEmail,
        ownerPhone: input.ownerPhone,
        ownerPassword: hashedPassword,
        selectedPlan: input.selectedPlan,
        billingCycle: "yearly",
        status: "pending",
        ipAddress: ctx.req?.ip || ctx.req?.socket?.remoteAddress || null,
        userAgent: ctx.req?.headers?.['user-agent'] || null,
      });

      // Notify platform owner
      const planNames: Record<string, string> = {
        basic: "أساسي (٦,٩٠٠ ر.س/سنة)",
        professional: "احترافي (١٠,٩٠٠ ر.س/سنة)",
        enterprise: "مؤسسي (١٥,٩٠٠ ر.س/سنة)",
      };

      await notifyOwner({
        title: `طلب تسجيل حضانة جديدة: ${input.nurseryNameAr}`,
        content: `تم استلام طلب تسجيل جديد:\n\n` +
          `الحضانة: ${input.nurseryNameAr} (${input.nurseryName})\n` +
          `المدينة: ${input.city}\n` +
          `عدد الأطفال: ${input.childrenCount}\n` +
          `عدد الموظفين: ${input.staffCount}\n` +
          `الخطة: ${planNames[input.selectedPlan]}\n` +
          `المالك: ${input.ownerName}\n` +
          `البريد: ${input.ownerEmail}\n` +
          `الجوال: ${input.ownerPhone}\n\n` +
          `يرجى مراجعة الطلب من لوحة تحكم المشرف.`,
      });

      // In-app notification for super admin
      try {
        const { ENV } = await import('./_core/env');
        const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
        if (ownerUser) {
          await db.createNotification({
            userId: ownerUser.id,
            title: 'طلب تسجيل حضانة جديدة',
            titleAr: 'طلب تسجيل حضانة جديدة',
            body: `${input.nurseryNameAr} - ${input.city} - ${input.ownerName}`,
            bodyAr: `${input.nurseryNameAr} - ${input.city} - ${input.ownerName}`,
            type: 'registration',
            link: '/super-admin/registrations',
          });
        }
      } catch (e) { /* non-critical */ }

      return {
        success: true,
        registrationId,
        message: "تم استلام طلب التسجيل بنجاح! سيتم مراجعة طلبك والتواصل معك خلال ٢٤ ساعة.",
      };
    }),

  // Super Admin: List all registration requests
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected", "converted", "all"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin' && ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'صلاحيات غير كافية' });
      }
      const status = input?.status === 'all' ? undefined : input?.status;
      return db.getNurseryRegistrations(status);
    }),

  // Super Admin: Get single registration details
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin' && ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'صلاحيات غير كافية' });
      }
      const registration = await db.getNurseryRegistrationById(input.id);
      if (!registration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'طلب التسجيل غير موجود' });
      }
      return registration;
    }),

  // Super Admin: Approve/Reject registration
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      notes: z.string().optional(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin' && ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'صلاحيات غير كافية' });
      }
      
      const registration = await db.getNurseryRegistrationById(input.id);
      if (!registration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'طلب التسجيل غير موجود' });
      }

      await db.updateNurseryRegistrationStatus(
        input.id,
        input.status,
        ctx.user.id,
        input.notes,
        input.rejectionReason
      );

      return { success: true, message: input.status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب' };
    }),
});
