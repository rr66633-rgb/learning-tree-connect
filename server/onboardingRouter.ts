import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  organizations,
  organizationBranding,
  organizationSubscriptions,
  organizationMembers,
  subscriptionPlans,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ IN-MEMORY CACHE FOR PLANS ============
// Plans rarely change, so cache them for 5 minutes to avoid DB round-trip on every request
let _plansCache: any[] | null = null;
let _plansCacheTime: number = 0;
const PLANS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Export warm-up function for server startup
export async function warmUpPlansCache() {
  const db = (await getDb())!;
  if (!db) return;
  const plans = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true))
    .orderBy(subscriptionPlans.sortOrder);
  _plansCache = plans;
  _plansCacheTime = Date.now();
  console.log("[Cache] Subscription plans pre-loaded:", plans.length, "plans");
}

export const onboardingRouter = router({
  // Get available subscription plans for onboarding
  getPlans: publicProcedure.query(async () => {
    // Return cached plans if still fresh
    const now = Date.now();
    if (_plansCache && (now - _plansCacheTime) < PLANS_CACHE_TTL) {
      return _plansCache;
    }
    const db = (await getDb())!;
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);
    // Update cache
    _plansCache = plans;
    _plansCacheTime = now;
    return plans;
  }),

  // Check if slug is available
  checkSlug: publicProcedure
    .input(z.object({ slug: z.string().min(2).regex(/^[a-z0-9-]+$/) }))
    .query(async ({ input }) => {
      // Reserved words that cannot be used as slugs
      const reserved = ['api', 'admin', 'super-admin', 'superadmin', 'app', 'www', 'mail', 'ftp', 'cdn', 'static', 'assets', 'login', 'register', 'auth', 'oauth', 'dashboard', 'system', 'platform', 'nashaa', 'learning-tree', 'learningtree', 'support', 'help', 'docs', 'blog'];
      if (reserved.includes(input.slug)) {
        return { available: false, reason: 'هذا الاسم محجوز للنظام' };
      }
      const db = (await getDb())!;
      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));
      return { available: !existing };
    }),

  // Complete onboarding - create organization
  completeOnboarding: protectedProcedure
    .input(z.object({
      // Step 1: Organization Info
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
      const db = (await getDb())!;

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
        orgType: "nursery",
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

      // SECURITY FIX (critical): this handler previously created the
      // organization, its branding, its subscription, and an
      // organizationMembers row for the caller -- but NEVER updated the
      // caller's own users.organizationId column. Every tenantProcedure
      // check across the entire codebase (the mechanism this whole audit
      // has been hardening) reads ctx.organizationId, which is derived
      // directly from users.organizationId (see server/_core/context.ts),
      // NOT from organizationMembers. Since users.organizationId defaults
      // to 1 at the schema level, a brand-new nursery owner who just
      // completed onboarding would have every subsequent tenantProcedure-
      // gated action (creating children, staff, invoices, calendar events,
      // etc.) silently applied to organization #1 instead of the
      // organization they just created -- mixing every new signup's data
      // into a single default organization. Fixed by stamping the new
      // organizationId onto the owner's own user row here.
      await db.update(users).set({ organizationId: orgId }).where(eq(users.id, ctx.user!.id));

      return {
        success: true,
        organizationId: orgId,
        slug: input.slug,
        message: "تم إنشاء الحضانة بنجاح! يمكنك الآن البدء بإعداد النظام.",
        trialEndsAt: trialEndsAt.toISOString(),
      };
    }),
});
