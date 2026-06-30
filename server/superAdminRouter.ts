import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, sql, and, like, or } from "drizzle-orm";
import {
  organizations,
  organizationBranding,
  subscriptionPlans,
  organizationSubscriptions,
  organizationMembers,
  users,
  children,
  classes,
  auditLog,
} from "../drizzle/schema";
import { getDb } from "./db";

// Super Admin procedure - ONLY super_admin role can access (not regular admin)
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحيات المدير العام مطلوبة" });
  }
  return next({ ctx });
});

export const superAdminRouter = router({
  // ============ ORGANIZATIONS ============
  
  // List all organizations
  listOrganizations: superAdminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["active", "suspended", "pending", "trial"]).optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const filters: any[] = [];
      
      if (input?.status) {
        filters.push(eq(organizations.status, input.status));
      }
      if (input?.search) {
        filters.push(
          or(
            like(organizations.name, `%${input.search}%`),
            like(organizations.nameAr, `%${input.search}%`),
            like(organizations.slug, `%${input.search}%`)
          )
        );
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      
      const orgs = await db
        .select()
        .from(organizations)
        .where(whereClause)
        .orderBy(desc(organizations.createdAt))
        .limit(input?.limit || 20)
        .offset(((input?.page || 1) - 1) * (input?.limit || 20));

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(organizations)
        .where(whereClause);

      return {
        organizations: orgs,
        total: countResult?.count || 0,
        page: input?.page || 1,
        totalPages: Math.ceil((countResult?.count || 0) / (input?.limit || 20)),
      };
    }),

  // Get single organization with details
  getOrganization: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.id));

      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "المنظمة غير موجودة" });

      const [branding] = await db
        .select()
        .from(organizationBranding)
        .where(eq(organizationBranding.organizationId, input.id));

      const [childCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(children)
        .where(eq(children.organizationId, input.id));

      const [staffCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.organizationId, input.id),
          eq(organizationMembers.isActive, true),
          sql`${organizationMembers.role} != 'parent'`
        ));

      const [classCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(classes)
        .where(eq(classes.organizationId, input.id));

      const subscription = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.organizationId, input.id))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      return {
        ...org,
        branding: branding || null,
        stats: {
          children: childCount?.count || 0,
          staff: staffCount?.count || 0,
          classes: classCount?.count || 0,
        },
        subscription: subscription[0] || null,
      };
    }),

  // Create new organization
  createOrganization: superAdminProcedure
    .input(z.object({
      name: z.string().min(2),
      nameAr: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      edition: z.enum(["learning_tree", "nashaa"]).default("nashaa"),
      status: z.enum(["active", "suspended", "pending", "trial"]).default("trial"),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().default("SA"),
      licenseNumber: z.string().optional(),
      maxChildren: z.number().default(50),
      maxStaff: z.number().default(20),
      subscriptionPlanId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // Check slug uniqueness
      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "هذا المعرف مستخدم بالفعل" });
      }

      const [result] = await db.insert(organizations).values({
        ...input,
        trialEndsAt: input.status === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      });

      const orgId = result.insertId;

      // Create default branding
      await db.insert(organizationBranding).values({
        organizationId: orgId,
      });

      // Audit log
      await db.insert(auditLog).values({
        userId: ctx.user!.id,
        action: "create_organization",
        resource: "organization",
        resourceId: orgId,
        details: JSON.stringify({ name: input.name, slug: input.slug, edition: input.edition }),
      });

      return { id: orgId, message: "تم إنشاء المنظمة بنجاح" };
    }),

  // Update organization
  updateOrganization: superAdminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      status: z.enum(["active", "suspended", "pending", "trial"]).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      maxChildren: z.number().optional(),
      maxStaff: z.number().optional(),
      licenseNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      
      await db
        .update(organizations)
        .set(updates)
        .where(eq(organizations.id, id));

      // Audit log
      await db.insert(auditLog).values({
        userId: ctx.user!.id,
        action: "update_organization",
        resource: "organization",
        resourceId: id,
        details: JSON.stringify(updates),
      });

      return { success: true, message: "تم تحديث المنظمة بنجاح" };
    }),

  // Suspend/Activate organization
  toggleOrganizationStatus: superAdminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "suspended"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      
      await db
        .update(organizations)
        .set({ status: input.status })
        .where(eq(organizations.id, input.id));

      // Audit log
      await db.insert(auditLog).values({
        userId: ctx.user!.id,
        action: "toggle_organization_status",
        resource: "organization",
        resourceId: input.id,
        details: JSON.stringify({ newStatus: input.status }),
      });

      return { success: true, message: input.status === "active" ? "تم تفعيل المنظمة" : "تم تعليق المنظمة" };
    }),

  // ============ BRANDING ============
  
  // Get branding for organization
  getBranding: superAdminProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [branding] = await db
        .select()
        .from(organizationBranding)
        .where(eq(organizationBranding.organizationId, input.organizationId));
      return branding || null;
    }),

  // Update branding
  updateBranding: superAdminProcedure
    .input(z.object({
      organizationId: z.number(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      logoUrl: z.string().optional(),
      logoLightUrl: z.string().optional(),
      appIcon: z.string().optional(),
      splashScreenUrl: z.string().optional(),
      fontFamily: z.string().optional(),
      borderRadius: z.string().optional(),
      sidebarStyle: z.enum(["dark", "light", "gradient"]).optional(),
      customCss: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { organizationId, ...updates } = input;

      const [existing] = await db
        .select()
        .from(organizationBranding)
        .where(eq(organizationBranding.organizationId, organizationId));

      if (existing) {
        await db
          .update(organizationBranding)
          .set(updates)
          .where(eq(organizationBranding.organizationId, organizationId));
      } else {
        await db.insert(organizationBranding).values({
          organizationId,
          ...updates,
        });
      }

      return { success: true, message: "تم تحديث الهوية البصرية بنجاح" };
    }),

  // ============ SUBSCRIPTION PLANS ============
  
  // List all plans
  listPlans: superAdminProcedure.query(async () => {
    const db = (await getDb())!;
    return db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder);
  }),

  // Assign plan to organization
  assignPlan: superAdminProcedure
    .input(z.object({
      organizationId: z.number(),
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, input.planId));

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const amount = input.billingCycle === "yearly" 
        ? Number(plan.priceYearly) 
        : Number(plan.priceMonthly);

      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await db.insert(organizationSubscriptions).values({
        organizationId: input.organizationId,
        planId: input.planId,
        status: "active",
        billingCycle: input.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amount: amount.toFixed(2),
        currency: "SAR",
      });

      // Update organization limits based on plan
      await db
        .update(organizations)
        .set({
          maxChildren: plan.maxChildren,
          maxStaff: plan.maxStaff,
          subscriptionPlanId: plan.id,
          status: "active",
        })
        .where(eq(organizations.id, input.organizationId));

      return { success: true, message: "تم تعيين الخطة بنجاح" };
    }),

  // ============ ORGANIZATION MEMBERS ============
  
  // List members of an organization
  listMembers: superAdminProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      
      const members = await db
        .select({
          id: organizationMembers.id,
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          isActive: organizationMembers.isActive,
          joinedAt: organizationMembers.joinedAt,
          userName: users.name,
          userEmail: users.email,
          userPhone: users.phone,
          userAvatar: users.avatar,
        })
        .from(organizationMembers)
        .leftJoin(users, eq(organizationMembers.userId, users.id))
        .where(eq(organizationMembers.organizationId, input.organizationId));

      return members;
    }),

  // ============ SUBSCRIPTIONS MANAGEMENT ============
  
  // List all organization subscriptions with details
  listSubscriptions: superAdminProcedure
    .input(z.object({
      status: z.enum(["all", "active", "expired", "cancelled", "past_due", "trialing"]).default("all"),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const conditions = [];
      if (input.status !== "all") {
        conditions.push(eq(organizationSubscriptions.status, input.status));
      }
      if (input.search) {
        conditions.push(
          or(
            like(organizations.name, `%${input.search}%`),
            like(organizations.nameAr, `%${input.search}%`)
          )
        );
      }

      const results = await db
        .select({
          id: organizationSubscriptions.id,
          organizationId: organizationSubscriptions.organizationId,
          orgName: organizations.name,
          orgNameAr: organizations.nameAr,
          orgStatus: organizations.status,
          planId: organizationSubscriptions.planId,
          planName: subscriptionPlans.name,
          planNameAr: subscriptionPlans.nameAr,
          planTier: subscriptionPlans.tier,
          status: organizationSubscriptions.status,
          billingCycle: organizationSubscriptions.billingCycle,
          amount: organizationSubscriptions.amount,
          currency: organizationSubscriptions.currency,
          currentPeriodStart: organizationSubscriptions.currentPeriodStart,
          currentPeriodEnd: organizationSubscriptions.currentPeriodEnd,
          cancelledAt: organizationSubscriptions.cancelledAt,
          cancelReason: organizationSubscriptions.cancelReason,
          createdAt: organizationSubscriptions.createdAt,
        })
        .from(organizationSubscriptions)
        .leftJoin(organizations, eq(organizationSubscriptions.organizationId, organizations.id))
        .leftJoin(subscriptionPlans, eq(organizationSubscriptions.planId, subscriptionPlans.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(organizationSubscriptions.createdAt));

      // Calculate stats
      const allSubs = await db
        .select({
          status: organizationSubscriptions.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(organizationSubscriptions)
        .groupBy(organizationSubscriptions.status);

      const stats = {
        total: allSubs.reduce((acc, s) => acc + (s.count || 0), 0),
        active: allSubs.find(s => s.status === "active")?.count || 0,
        expired: allSubs.find(s => s.status === "expired")?.count || 0,
        trialing: allSubs.find(s => s.status === "trialing")?.count || 0,
        cancelled: allSubs.find(s => s.status === "cancelled")?.count || 0,
        pastDue: allSubs.find(s => s.status === "past_due")?.count || 0,
      };

      return { subscriptions: results, stats };
    }),

  // Renew subscription
  renewSubscription: superAdminProcedure
    .input(z.object({
      subscriptionId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]).default("yearly"),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const [sub] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.id, input.subscriptionId));

      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "الاشتراك غير موجود" });

      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, sub.planId));

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const amount = input.billingCycle === "yearly" 
        ? Number(plan.priceYearly) 
        : Number(plan.priceMonthly);

      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await db
        .update(organizationSubscriptions)
        .set({
          status: "active",
          billingCycle: input.billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          amount: amount.toFixed(2),
          cancelledAt: null,
          cancelReason: null,
        })
        .where(eq(organizationSubscriptions.id, input.subscriptionId));

      // Update organization status
      await db
        .update(organizations)
        .set({ status: "active" })
        .where(eq(organizations.id, sub.organizationId));

      return { success: true, message: "تم تجديد الاشتراك بنجاح" };
    }),

  // Cancel subscription
  cancelSubscription: superAdminProcedure
    .input(z.object({
      subscriptionId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const [sub] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.id, input.subscriptionId));

      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "الاشتراك غير موجود" });

      await db
        .update(organizationSubscriptions)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: input.reason || null,
        })
        .where(eq(organizationSubscriptions.id, input.subscriptionId));

      return { success: true, message: "تم إلغاء الاشتراك" };
    }),

  // ============ DASHBOARD STATS ============
  
  // Get platform-wide statistics
  platformStats: superAdminProcedure.query(async () => {
    const db = (await getDb())!;

    const [orgCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(organizations);

    const [activeOrgCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(organizations)
      .where(eq(organizations.status, "active"));

    const [totalChildren] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(children);

    const [totalUsers] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);

    const [totalClasses] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(classes);

    return {
      totalOrganizations: orgCount?.count || 0,
      activeOrganizations: activeOrgCount?.count || 0,
      totalChildren: totalChildren?.count || 0,
      totalUsers: totalUsers?.count || 0,
      totalClasses: totalClasses?.count || 0,
    };
  }),
});
