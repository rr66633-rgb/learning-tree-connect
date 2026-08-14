/**
 * Subscription Service
 * Handles subscription lifecycle: trial, activation, expiration, grace period, auto-disable
 * Sends email reminders before expiration
 */
import { eq, and, lt, gt, lte, sql } from "drizzle-orm";
import {
  organizations,
  organizationSubscriptions,
  subscriptionPlans,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { sendNotificationEmail } from "./emailService";

// Grace period: 7 days after subscription expires before auto-disable
const GRACE_PERIOD_DAYS = 7;

// Reminder schedule: days before expiration
const REMINDER_DAYS = [7, 3, 1];

/**
 * Check and process expired subscriptions
 * Called by scheduled job (daily)
 */
export async function processExpiredSubscriptions(): Promise<{
  expired: number;
  disabled: number;
  reminders: number;
}> {
  const db = await getDb();
  if (!db) return { expired: 0, disabled: 0, reminders: 0 };

  const now = new Date();
  let expired = 0;
  let disabled = 0;
  let reminders = 0;

  // 1. Find active subscriptions that have expired → move to grace period
  const expiredSubs = await db
    .select()
    .from(organizationSubscriptions)
    .where(
      and(
        eq(organizationSubscriptions.status, "active"),
        lt(organizationSubscriptions.currentPeriodEnd, now)
      )
    );

  for (const sub of expiredSubs) {
    const gracePeriodEnd = new Date(sub.currentPeriodEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    await db
      .update(organizationSubscriptions)
      .set({
        status: "past_due",
        gracePeriodEnd,
      })
      .where(eq(organizationSubscriptions.id, sub.id));

    // Send expiration notice to org owner
    await sendSubscriptionExpirationEmail(sub.organizationId);
    expired++;
  }

  // 2. Find past_due subscriptions where grace period has ended → disable org
  const pastDueSubs = await db
    .select()
    .from(organizationSubscriptions)
    .where(
      and(
        eq(organizationSubscriptions.status, "past_due"),
        lte(organizationSubscriptions.gracePeriodEnd, now)
      )
    );

  for (const sub of pastDueSubs) {
    // Mark subscription as expired
    await db
      .update(organizationSubscriptions)
      .set({ status: "expired" })
      .where(eq(organizationSubscriptions.id, sub.id));

    // Suspend the organization
    await db
      .update(organizations)
      .set({ status: "suspended" })
      .where(eq(organizations.id, sub.organizationId));

    // Send suspension notice
    await sendSubscriptionSuspensionEmail(sub.organizationId);
    disabled++;
  }

  // 3. Send renewal reminders for subscriptions expiring soon
  for (const daysBefore of REMINDER_DAYS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate);
    targetDateEnd.setHours(23, 59, 59, 999);

    const soonExpiring = await db
      .select()
      .from(organizationSubscriptions)
      .where(
        and(
          eq(organizationSubscriptions.status, "active"),
          gt(organizationSubscriptions.currentPeriodEnd, targetDateStart),
          lt(organizationSubscriptions.currentPeriodEnd, targetDateEnd),
          lt(organizationSubscriptions.remindersSent, sql`${daysBefore === 7 ? 1 : daysBefore === 3 ? 2 : 3}`)
        )
      );

    for (const sub of soonExpiring) {
      await sendRenewalReminderEmail(sub.organizationId, daysBefore);
      await db
        .update(organizationSubscriptions)
        .set({ remindersSent: sub.remindersSent + 1 })
        .where(eq(organizationSubscriptions.id, sub.id));
      reminders++;
    }
  }

  return { expired, disabled, reminders };
}

/**
 * Start a trial for a new organization
 */
export async function startTrial(organizationId: number, planId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, planId));

  if (!plan) return;

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

  // Create trial subscription
  await db.insert(organizationSubscriptions).values({
    organizationId,
    planId,
    status: "trialing",
    billingCycle: "monthly",
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    amount: "0.00",
    currency: "SAR",
    remindersSent: 0,
  });

  // Update organization status
  await db
    .update(organizations)
    .set({
      status: "trial",
      subscriptionPlanId: planId,
      trialEndsAt: trialEnd,
      maxChildren: plan.maxChildren,
      maxStaff: plan.maxStaff,
    })
    .where(eq(organizations.id, organizationId));
}

/**
 * Activate subscription after payment
 */
export async function activateSubscription(params: {
  organizationId: number;
  planId: number;
  billingCycle: "monthly" | "yearly";
  moyasarPaymentId: string;
}): Promise<{ success: boolean; periodEnd: Date }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, params.planId));

  if (!plan) throw new Error("Plan not found");

  const now = new Date();
  const periodEnd = new Date(now);
  if (params.billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Check if discount is still valid
  let amount: number;
  if (params.billingCycle === "yearly") {
    if (plan.discountEnabled && plan.discountExpiresAt && plan.discountExpiresAt > now) {
      amount = Number(plan.priceYearly); // Already discounted price
    } else {
      amount = Number(plan.originalPriceYearly || plan.priceYearly);
    }
  } else {
    amount = Number(plan.priceMonthly);
  }

  // Check for existing subscription
  const [existingSub] = await db
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, params.organizationId));

  if (existingSub) {
    await db
      .update(organizationSubscriptions)
      .set({
        planId: params.planId,
        status: "active",
        billingCycle: params.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amount: amount.toFixed(2),
        moyasarPaymentId: params.moyasarPaymentId,
        gracePeriodEnd: null,
        remindersSent: 0,
        cancelledAt: null,
        cancelReason: null,
      })
      .where(eq(organizationSubscriptions.id, existingSub.id));
  } else {
    await db.insert(organizationSubscriptions).values({
      organizationId: params.organizationId,
      planId: params.planId,
      status: "active",
      billingCycle: params.billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      amount: amount.toFixed(2),
      currency: "SAR",
      moyasarPaymentId: params.moyasarPaymentId,
      remindersSent: 0,
    });
  }

  // Reactivate organization
  await db
    .update(organizations)
    .set({
      status: "active",
      subscriptionPlanId: params.planId,
      maxChildren: plan.maxChildren,
      maxStaff: plan.maxStaff,
    })
    .where(eq(organizations.id, params.organizationId));

  return { success: true, periodEnd };
}

/**
 * Get subscription status for an organization
 */
export async function getSubscriptionStatus(organizationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [sub] = await db
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId));

  if (!sub) return { status: "none" as const, hasSubscription: false };

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, sub.planId));

  const now = new Date();
  const isExpired = new Date(sub.currentPeriodEnd) < now;
  const daysRemaining = Math.ceil(
    (new Date(sub.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    hasSubscription: true,
    status: isExpired ? "expired" as const : sub.status,
    subscription: sub,
    plan,
    daysRemaining: Math.max(0, daysRemaining),
    isInGracePeriod: sub.status === "past_due",
  };
}

// ─── Email Helpers ──────────────────────────────────────────────────────────

async function getOrgOwnerEmail(organizationId: number): Promise<{ email: string; name: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const [owner] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.role, "owner"),
        eq(users.isActive, true)
      )
    )
    .limit(1);

  if (!owner?.email) {
    // Try principal
    const [principal] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.role, "principal"),
          eq(users.isActive, true)
        )
      )
      .limit(1);
    return principal?.email ? { email: principal.email, name: principal.name || "" } : null;
  }

  return { email: owner.email, name: owner.name || "" };
}

async function sendRenewalReminderEmail(organizationId: number, daysBefore: number) {
  const owner = await getOrgOwnerEmail(organizationId);
  if (!owner) return;

  const db = await getDb();
  if (!db) return;
  const [org] = await db.select({ name: organizations.nameAr }).from(organizations).where(eq(organizations.id, organizationId));

  await sendNotificationEmail(
    owner.email,
    owner.name,
    `تذكير: اشتراكك ينتهي خلال ${daysBefore} ${daysBefore === 1 ? "يوم" : "أيام"}`,
    `اشتراك "${org?.name || "حضانتك"}" في منصة نشأة سينتهي خلال ${daysBefore} ${daysBefore === 1 ? "يوم" : "أيام"}. يرجى تجديد الاشتراك لتجنب تعليق الخدمة.`,
    "https://naashah.com/staff/subscription",
    "تجديد الاشتراك"
  );
}

async function sendSubscriptionExpirationEmail(organizationId: number) {
  const owner = await getOrgOwnerEmail(organizationId);
  if (!owner) return;

  await sendNotificationEmail(
    owner.email,
    owner.name,
    "انتهى اشتراكك — فترة سماح 7 أيام",
    `انتهى اشتراكك في منصة نشأة. لديك فترة سماح ${GRACE_PERIOD_DAYS} أيام لتجديد الاشتراك قبل تعليق حسابك. جميع بياناتك محفوظة بأمان.`,
    "https://naashah.com/staff/subscription",
    "تجديد الاشتراك الآن"
  );
}

async function sendSubscriptionSuspensionEmail(organizationId: number) {
  const owner = await getOrgOwnerEmail(organizationId);
  if (!owner) return;

  await sendNotificationEmail(
    owner.email,
    owner.name,
    "تم تعليق حسابك — جدّد اشتراكك",
    "تم تعليق حساب حضانتك في منصة نشأة لعدم تجديد الاشتراك. جميع بياناتك محفوظة بأمان ويمكنك استعادة الوصول فوراً بتجديد الاشتراك.",
    "https://naashah.com/staff/subscription",
    "إعادة تفعيل الاشتراك"
  );
}
