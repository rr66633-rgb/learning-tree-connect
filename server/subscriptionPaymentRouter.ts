import { tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  organizations,
  organizationSubscriptions,
  subscriptionPlans,
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ IN-MEMORY CACHE FOR SUBSCRIPTION STATUS ============
// Cache subscription status per org for 60 seconds to reduce DB queries
const _subStatusCache = new Map<number, { data: any; time: number }>();
const SUB_STATUS_CACHE_TTL = 60 * 1000; // 60 seconds

// SECURITY FIX (cross-tenant billing takeover): both routes below previously ran
// on plain `protectedProcedure` with NO role check at all, and trusted a
// client-supplied `input.organizationId` directly to look up/insert/update
// `organizationSubscriptions` and `organizations`. Any authenticated user of any
// role (including a parent) could activate/overwrite the subscription plan,
// billing cycle, status, and maxChildren/maxStaff limits of ANY organization by
// id, or read any organization's subscription/billing status. Now both use
// `tenantProcedure` (ctx.organizationId guaranteed non-null) and reject if the
// caller's own organization doesn't match the target -- input.organizationId is
// no longer trusted as an authorization boundary, only ctx.organizationId is.
const ORG_ADMIN_ROLES = ["admin", "super_admin", "principal", "owner"];

export const subscriptionPaymentRouter = router({
  // Activate subscription after successful payment
  activate: tenantProcedure
    .input(z.object({
      moyasarPaymentId: z.string(),
      organizationId: z.number(),
      planId: z.number(),
      billingCycle: z.enum(["monthly", "yearly"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ORG_ADMIN_ROLES.includes(ctx.user?.role || "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "صلاحية الإدارة مطلوبة لتفعيل الاشتراك" });
      }
      if (input.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تفعيل اشتراك لمنظمة أخرى" });
      }

      const db = (await getDb())!;

      // Verify payment with Moyasar
      const { fetchMoyasarPayment, isMoyasarConfigured } = await import("./_core/moyasar");

      if (isMoyasarConfigured()) {
        const moyasarPayment = await fetchMoyasarPayment(input.moyasarPaymentId);
        if (moyasarPayment.status !== "paid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "الدفعة لم تكتمل بعد",
          });
        }
      }

      // Get plan details
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, input.planId));

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });
      }

      // Calculate subscription period
      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Price already reflects any admin-configured discount
      const amount = input.billingCycle === "yearly"
        ? Number(plan.priceYearly)
        : Number(plan.priceMonthly);

      // Check if organization already has a subscription
      const [existingSub] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.organizationId, input.organizationId));

      if (existingSub) {
        // Update existing subscription
        await db
          .update(organizationSubscriptions)
          .set({
            planId: input.planId,
            status: "active",
            billingCycle: input.billingCycle,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            amount: amount.toFixed(2),
            cancelledAt: null,
            cancelReason: null,
          })
          .where(eq(organizationSubscriptions.id, existingSub.id));
      } else {
        // Create new subscription
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
      }

      // Update organization status and plan
      await db
        .update(organizations)
        .set({
          status: "active",
          subscriptionPlanId: input.planId,
          maxChildren: plan.maxChildren,
          maxStaff: plan.maxStaff,
        })
        .where(eq(organizations.id, input.organizationId));

      return {
        success: true,
        message: "تم تفعيل الاشتراك بنجاح!",
        periodEnd: periodEnd.toISOString(),
      };
    }),

  // Get subscription status for an organization
  status: tenantProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (input.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك عرض اشتراك منظمة أخرى" });
      }

      // Check cache first
      const now = Date.now();
      const cached = _subStatusCache.get(ctx.organizationId);
      if (cached && (now - cached.time) < SUB_STATUS_CACHE_TTL) {
        return cached.data;
      }

      const db = (await getDb())!;

      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(eq(organizationSubscriptions.organizationId, input.organizationId));

      if (!subscription) {
        const result = { hasSubscription: false, status: "none" as const };
        _subStatusCache.set(ctx.organizationId, { data: result, time: now });
        return result;
      }

      const isExpired = new Date(subscription.currentPeriodEnd) < new Date();

      const result = {
        hasSubscription: true,
        status: isExpired ? "expired" as const : subscription.status,
        subscription,
      };
      _subStatusCache.set(ctx.organizationId, { data: result, time: now });
      return result;
    }),
});
