import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  organizations,
  organizationBranding,
  organizationSubscriptions,
  organizationMembers,
  subscriptionPlans,
} from "../drizzle/schema";

async function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

export const onboardingRouter = router({
  // Get available subscription plans for onboarding
  getPlans: publicProcedure.query(async () => {
    const db = await getDb();
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);
  }),

  // Check if slug is available
  checkSlug: publicProcedure
    .input(z.object({ slug: z.string().min(2).regex(/^[a-z0-9-]+$/) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));
      return { available: !existing };
    }),

  // Complete onboarding - create organization
  completeOnboarding: protectedProcedure
    .input(z.object({
      // Step 1: Nursery Info
      name: z.string().min(2),
      nameAr: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().default("SA"),
      licenseNumber: z.string().optional(),
      // Step 2: Branding
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      logoUrl: z.string().optional(),
      // Step 3: Plan
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Check slug availability
      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "هذا المعرف مستخدم بالفعل. يرجى اختيار معرف آخر." });
      }

      // Get plan details
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, input.planId));

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الخطة المحددة غير موجودة" });
      }

      // Create organization
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
      
      const [orgResult] = await db.insert(organizations).values({
        name: input.name,
        nameAr: input.nameAr,
        slug: input.slug,
        edition: "nashaa",
        status: "trial",
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        country: input.country,
        licenseNumber: input.licenseNumber || null,
        maxChildren: plan.maxChildren,
        maxStaff: plan.maxStaff,
        subscriptionPlanId: plan.id,
        trialEndsAt,
      });

      const orgId = orgResult.insertId;

      // Create branding
      await db.insert(organizationBranding).values({
        organizationId: orgId,
        primaryColor: input.primaryColor || "#10b981",
        secondaryColor: input.secondaryColor || "#059669",
        accentColor: input.accentColor || "#34d399",
        logoUrl: input.logoUrl || null,
      });

      // Create subscription
      const now = new Date();
      const amount = input.billingCycle === "yearly"
        ? Number(plan.priceYearly)
        : Number(plan.priceMonthly);

      await db.insert(organizationSubscriptions).values({
        organizationId: orgId,
        planId: plan.id,
        status: "trialing",
        billingCycle: input.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        amount: amount.toFixed(2),
        currency: "SAR",
      });

      // Add current user as owner
      await db.insert(organizationMembers).values({
        organizationId: orgId,
        userId: ctx.user!.id,
        role: "owner",
        isActive: true,
      });

      return {
        success: true,
        organizationId: orgId,
        slug: input.slug,
        message: "تم إنشاء الحضانة بنجاح! يمكنك الآن البدء بإعداد النظام.",
        trialEndsAt: trialEndsAt.toISOString(),
      };
    }),
});
