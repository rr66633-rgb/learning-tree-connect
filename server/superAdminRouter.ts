import { router, superAdminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, sql, and, like, or, gte, lte, inArray } from "drizzle-orm";
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
  payments,
  invoices,
} from "../drizzle/schema";
import { getDb } from "./db";
import { hashPassword } from "./_core/authService";
import crypto from "crypto";

// SECURITY FIX: superAdminProcedure moved to server/_core/trpc.ts as the
// single canonical cross-organization gate, imported here instead of being
// redefined locally -- see the comment there for why centralizing this one
// check matters. Behavior is unchanged (still ctx.user.role !== 'super_admin').

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
      orgType: z.enum(["nursery"]).default("nursery"),
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

  // Update plan pricing and discount
  updatePlanPricing: superAdminProcedure
    .input(z.object({
      planId: z.number(),
      priceYearly: z.string().optional(),
      priceMonthly: z.string().optional(),
      discountPercentage: z.number().min(0).max(100).optional(),
      discountEnabled: z.boolean().optional(),
      originalPriceYearly: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const updateData: any = {};
      if (input.priceYearly !== undefined) updateData.priceYearly = input.priceYearly;
      if (input.priceMonthly !== undefined) updateData.priceMonthly = input.priceMonthly;
      if (input.discountPercentage !== undefined) updateData.discountPercentage = input.discountPercentage.toFixed(2);
      if (input.discountEnabled !== undefined) updateData.discountEnabled = input.discountEnabled;
      if (input.originalPriceYearly !== undefined) updateData.originalPriceYearly = input.originalPriceYearly;

      await db
        .update(subscriptionPlans)
        .set(updateData)
        .where(eq(subscriptionPlans.id, input.planId));

      return { success: true, message: "تم تحديث الخطة بنجاح" };
    }),

  // Assign plan to organization
  assignPlan: superAdminProcedure
    .input(z.object({
      organizationId: z.number(),
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
      discountPercent: z.number().min(0).max(100).default(0),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, input.planId));

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

      const baseAmount = input.billingCycle === "yearly" 
        ? Number(plan.priceYearly) 
        : Number(plan.priceMonthly);
      const amount = input.discountPercent > 0 
        ? baseAmount * (1 - input.discountPercent / 100) 
        : baseAmount;

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

  // ============ PAYMENTS REPORT ============
  
  paymentsReport: superAdminProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.enum(["initiated", "paid", "failed", "expired", "refunded", "all"]).default("all"),
      method: z.enum(["apple_pay", "mada", "visa", "mastercard", "stc_pay", "cash", "bank_transfer", "all"]).default("all"),
      page: z.number().default(1),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const filters: any[] = [];
      const params = input || {} as any;

      if (params.status && params.status !== "all") {
        filters.push(eq(payments.status, params.status));
      }
      if (params.method && params.method !== "all") {
        filters.push(eq(payments.method, params.method));
      }
      if (params.dateFrom) {
        filters.push(gte(payments.createdAt, new Date(params.dateFrom)));
      }
      if (params.dateTo) {
        filters.push(lte(payments.createdAt, new Date(params.dateTo + "T23:59:59")));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;
      const offset = ((params.page || 1) - 1) * (params.limit || 50);

      const [paymentsList, countResult, statsResult] = await Promise.all([
        db.select({
          id: payments.id,
          invoiceId: payments.invoiceId,
          parentId: payments.parentId,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          status: payments.status,
          moyasarPaymentId: payments.moyasarPaymentId,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
          invoiceNumber: invoices.invoiceNumber,
          invoiceDescription: invoices.description,
          parentName: users.name,
          parentEmail: users.email,
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .leftJoin(users, eq(payments.parentId, users.id))
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(params.limit || 50)
        .offset(offset),

        db.select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(whereClause),

        db.select({
          totalPaid: sql<string>`COALESCE(SUM(CASE WHEN ${payments.status} = 'paid' THEN ${payments.amount} ELSE 0 END), 0)`,
          totalInitiated: sql<string>`COALESCE(SUM(CASE WHEN ${payments.status} = 'initiated' THEN ${payments.amount} ELSE 0 END), 0)`,
          totalFailed: sql<string>`COALESCE(SUM(CASE WHEN ${payments.status} = 'failed' THEN ${payments.amount} ELSE 0 END), 0)`,
          countPaid: sql<number>`SUM(CASE WHEN ${payments.status} = 'paid' THEN 1 ELSE 0 END)`,
          countFailed: sql<number>`SUM(CASE WHEN ${payments.status} = 'failed' THEN 1 ELSE 0 END)`,
          countTotal: sql<number>`count(*)`,
        })
        .from(payments)
        .where(whereClause),
      ]);

      return {
        payments: paymentsList,
        total: countResult[0]?.count || 0,
        page: params.page || 1,
        limit: params.limit || 50,
        stats: statsResult[0] || { totalPaid: "0", totalInitiated: "0", totalFailed: "0", countPaid: 0, countFailed: 0, countTotal: 0 },
      };
    }),

  // ============ DELETE ORGANIZATION ============

  deleteOrganization: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.id));

      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "المنظمة غير موجودة" });

      // Delete related data in order (child tables first)
      await db.delete(organizationMembers).where(eq(organizationMembers.organizationId, input.id));
      await db.delete(organizationBranding).where(eq(organizationBranding.organizationId, input.id));
      await db.delete(organizationSubscriptions).where(eq(organizationSubscriptions.organizationId, input.id));
      await db.delete(children).where(eq(children.organizationId, input.id));
      await db.delete(classes).where(eq(classes.organizationId, input.id));
      // Delete users that belong only to this org
      await db.delete(users).where(eq(users.organizationId, input.id));
      // Finally delete the organization
      await db.delete(organizations).where(eq(organizations.id, input.id));

      // Audit log
      await db.insert(auditLog).values({
        userId: ctx.user!.id,
        action: "delete_organization",
        resource: "organization",
        resourceId: input.id,
        details: JSON.stringify({ name: org.name, slug: org.slug }),
      });

      return { success: true, message: "تم حذف المنظمة نهائياً" };
    }),

  // ============ MEMBER MANAGEMENT ============

  // Add member to organization (create user if not exists)
  // CONFIRMED SAFE (not a tenant-isolation issue): this can add an existing
  // user (who already belongs to some other organization, via their
  // `users.organizationId`) as a member of a *second* organization here, by
  // inserting a row into `organization_members`. That could look like a
  // cross-tenant access grant, but it is not one: `ctx.organizationId` --
  // the ONLY value ever consulted anywhere in this codebase to scope a
  // request to a tenant (see server/_core/context.ts) -- is derived solely
  // from `users.organizationId`, a single column, which this function does
  // NOT modify for an existing user. `organization_members` rows are never
  // read by any authorization check; they only back the org's own
  // "members list" UI. So adding a user to a second org's membership here
  // does not grant that user any tenant-scoped access to that org's data --
  // their session will still resolve to their original, single
  // `users.organizationId` until/unless that column itself is changed
  // (which only happens through the normal user-management flows, which
  // are already org-scoped). Confirmed via full-codebase search: this
  // route is restricted to `superAdminProcedure` already, so only the
  // platform Super Admin exception can even reach this path.
  addMember: superAdminProcedure
    .input(z.object({
      organizationId: z.number(),
      name: z.string().min(2),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(["admin", "principal", "teacher", "assistant", "accountant", "receptionist", "parent"]),
      password: z.string().min(4).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // Check org exists
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId));

      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "المنظمة غير موجودة" });

      // Check if user already exists by email or phone
      let existingUser = null;
      if (input.email) {
        const [found] = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email));
        existingUser = found || null;
      }
      if (!existingUser && input.phone) {
        const [found] = await db
          .select()
          .from(users)
          .where(eq(users.phone, input.phone));
        existingUser = found || null;
      }

      let userId: number;

      if (existingUser) {
        // Check if already a member of this org
        const [existingMembership] = await db
          .select()
          .from(organizationMembers)
          .where(and(
            eq(organizationMembers.organizationId, input.organizationId),
            eq(organizationMembers.userId, existingUser.id)
          ));

        if (existingMembership) {
          throw new TRPCError({ code: "CONFLICT", message: "هذا المستخدم عضو بالفعل في هذه المنظمة" });
        }

        userId = existingUser.id;
      } else {
        // Create new user
        const openId = crypto.randomUUID();
        const hashedPw = input.password ? await hashPassword(input.password) : await hashPassword("1234");

        const [result] = await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          role: input.role,
          password: hashedPw,
          organizationId: input.organizationId,
          isActive: true,
        });

        userId = result.insertId;
      }

      // Add to organization_members
      await db.insert(organizationMembers).values({
        organizationId: input.organizationId,
        userId,
        role: input.role,
        isActive: true,
      });

      // Audit log
      await db.insert(auditLog).values({
        userId: ctx.user!.id,
        action: "add_member",
        resource: "organization_member",
        resourceId: input.organizationId,
        details: JSON.stringify({ memberUserId: userId, role: input.role, name: input.name }),
      });

      return { success: true, userId, message: "تم إضافة العضو بنجاح" };
    }),

  // Remove member from organization
  removeMember: superAdminProcedure
    .input(z.object({
      membershipId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.id, input.membershipId));

      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "العضوية غير موجودة" });

      // Deactivate instead of delete
      await db
        .update(organizationMembers)
        .set({ isActive: false })
        .where(eq(organizationMembers.id, input.membershipId));

      // Audit log
      await db.insert(auditLog).values({
        userId: ctx.user!.id,
        action: "remove_member",
        resource: "organization_member",
        resourceId: membership.organizationId,
        details: JSON.stringify({ membershipId: input.membershipId, memberUserId: membership.userId }),
      });

      return { success: true, message: "تم إزالة العضو بنجاح" };
    }),

  // Toggle member active status
  toggleMemberStatus: superAdminProcedure
    .input(z.object({
      membershipId: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      await db
        .update(organizationMembers)
        .set({ isActive: input.isActive })
        .where(eq(organizationMembers.id, input.membershipId));

      return { success: true, message: input.isActive ? "تم تفعيل العضو" : "تم تعطيل العضو" };
    }),
});
