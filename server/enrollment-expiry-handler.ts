import type { Request, Response } from "express";
import { getDb } from "./db";
import { enrollment, children, notifications, users } from "../drizzle/schema";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";

/**
 * Enrollment Expiry Notification Handler
 * ----------------------------------------
 * Called by the Heartbeat cron system at /api/scheduled/enrollment-expiry
 * Sends notifications to parents when their child's enrollment is about to expire.
 * Runs daily at 8:00 AM UTC (11:00 AM Saudi time).
 * 
 * Sends notifications:
 * - 7 days before expiry
 * - 1 day before expiry
 */
export async function enrollmentExpiryHandler(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { sdk } = await import("./_core/sdk");
    const user = await sdk.authenticateRequest(req);
    // SECURITY FIX: this is a platform-wide scheduled job (iterates
    // enrollments across every organization, even though each individual
    // notification it sends is correctly organization-scoped); previously
    // any single organization's own regular admin could manually trigger
    // it. Per policy, the only allowed cross-organization actor is the
    // authenticated Super Admin (or the automated cron system itself).
    if (!user.isCron && (user as any).role !== "super_admin") {
      res.status(403).json({ error: "cron-only or super_admin" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 7 days from now
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysEnd = new Date(sevenDaysFromNow);
    sevenDaysEnd.setDate(sevenDaysEnd.getDate() + 1);

    // 1 day from now (tomorrow)
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const oneDayEnd = new Date(oneDayFromNow);
    oneDayEnd.setDate(oneDayEnd.getDate() + 1);

    let notificationsSent = 0;

    // SECURITY FIX: enrollment has no organizationId column of its own --
    // both queries below previously selected across ALL organizations
    // combined, and (more seriously) the admin-notify block further down
    // notified EVERY admin/principal/owner in the ENTIRE database with ONE
    // combined count mixing every organization's expiring enrollments. Both
    // queries now also select children.organizationId (via the existing
    // join) so notifications can be tagged and admins can be scoped
    // per-organization.

    // Find enrollments expiring in 7 days
    const expiringIn7Days = await db
      .select({
        enrollmentId: enrollment.id,
        childId: enrollment.childId,
        endDate: enrollment.endDate,
        childName: children.firstName,
        childArabicName: children.arabicName,
        parentId: children.parentId,
        organizationId: children.organizationId,
      })
      .from(enrollment)
      .innerJoin(children, eq(enrollment.childId, children.id))
      .where(
        and(
          eq(enrollment.status, "active"),
          gte(enrollment.endDate, sevenDaysFromNow),
          lte(enrollment.endDate, sevenDaysEnd)
        )
      );

    // Find enrollments expiring tomorrow
    const expiringTomorrow = await db
      .select({
        enrollmentId: enrollment.id,
        childId: enrollment.childId,
        endDate: enrollment.endDate,
        childName: children.firstName,
        childArabicName: children.arabicName,
        parentId: children.parentId,
        organizationId: children.organizationId,
      })
      .from(enrollment)
      .innerJoin(children, eq(enrollment.childId, children.id))
      .where(
        and(
          eq(enrollment.status, "active"),
          gte(enrollment.endDate, oneDayFromNow),
          lte(enrollment.endDate, oneDayEnd)
        )
      );

    // Send 7-day warning notifications
    for (const enr of expiringIn7Days) {
      if (!enr.parentId) continue;
      const childDisplayName = enr.childArabicName || enr.childName || "طفلك";
      const endDateStr = enr.endDate ? new Date(enr.endDate).toLocaleDateString("ar-SA") : "";

      await db.insert(notifications).values({
        userId: enr.parentId,
        organizationId: enr.organizationId,
        title: "تنبيه: اقتراب انتهاء الاشتراك",
        titleAr: "تنبيه: اقتراب انتهاء الاشتراك",
        body: `اشتراك ${childDisplayName} في الحضانة سينتهي خلال 7 أيام (${endDateStr}). يرجى التواصل مع الإدارة لتجديد الاشتراك.`,
        bodyAr: `اشتراك ${childDisplayName} في الحضانة سينتهي خلال 7 أيام (${endDateStr}). يرجى التواصل مع الإدارة لتجديد الاشتراك.`,
        type: "payment",
        isRead: false,
      });
      notificationsSent++;
    }

    // Send 1-day urgent notifications
    for (const enr of expiringTomorrow) {
      if (!enr.parentId) continue;
      const childDisplayName = enr.childArabicName || enr.childName || "طفلك";
      const endDateStr = enr.endDate ? new Date(enr.endDate).toLocaleDateString("ar-SA") : "";

      await db.insert(notifications).values({
        userId: enr.parentId,
        organizationId: enr.organizationId,
        title: "تنبيه عاجل: انتهاء الاشتراك غداً",
        titleAr: "تنبيه عاجل: انتهاء الاشتراك غداً",
        body: `اشتراك ${childDisplayName} في الحضانة سينتهي غداً (${endDateStr}). يرجى تجديد الاشتراك في أقرب وقت لضمان استمرار الخدمة.`,
        bodyAr: `اشتراك ${childDisplayName} في الحضانة سينتهي غداً (${endDateStr}). يرجى تجديد الاشتراك في أقرب وقت لضمان استمرار الخدمة.`,
        type: "payment",
        isRead: false,
      });
      notificationsSent++;
    }

    // Also notify each organization's own admins about their own expiring
    // enrollments (grouped per-organization, not a global combined count).
    const countsByOrg = new Map<number, { in7: number; tomorrow: number }>();
    for (const enr of expiringIn7Days) {
      const orgId = enr.organizationId;
      if (!orgId) continue;
      const entry = countsByOrg.get(orgId) || { in7: 0, tomorrow: 0 };
      entry.in7++;
      countsByOrg.set(orgId, entry);
    }
    for (const enr of expiringTomorrow) {
      const orgId = enr.organizationId;
      if (!orgId) continue;
      const entry = countsByOrg.get(orgId) || { in7: 0, tomorrow: 0 };
      entry.tomorrow++;
      countsByOrg.set(orgId, entry);
    }

    for (const [orgId, counts] of Array.from(countsByOrg)) {
      const totalExpiring = counts.in7 + counts.tomorrow;
      if (totalExpiring === 0) continue;

      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            sql`${users.role} IN ('admin', 'principal', 'owner')`,
            eq(users.isActive, true),
            eq(users.organizationId, orgId)
          )
        );

      for (const admin of adminUsers) {
        await db.insert(notifications).values({
          userId: admin.id,
          organizationId: orgId,
          title: "تنبيه: اشتراكات على وشك الانتهاء",
          titleAr: "تنبيه: اشتراكات على وشك الانتهاء",
          body: `يوجد ${totalExpiring} اشتراك(ات) على وشك الانتهاء. ${counts.tomorrow} تنتهي غداً و ${counts.in7} تنتهي خلال أسبوع.`,
          bodyAr: `يوجد ${totalExpiring} اشتراك(ات) على وشك الانتهاء. ${counts.tomorrow} تنتهي غداً و ${counts.in7} تنتهي خلال أسبوع.`,
          type: "system",
          isRead: false,
        });
      }
    }

    const elapsed = Date.now() - startTime;
    res.json({
      success: true,
      notificationsSent,
      expiringIn7Days: expiringIn7Days.length,
      expiringTomorrow: expiringTomorrow.length,
      elapsedMs: elapsed,
    });
  } catch (err: any) {
    console.error("[EnrollmentExpiry] Error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
