import type { Request, Response } from "express";
import * as db from "./db";
import { sendPushToUsers, PushPayload } from "./_core/webPush";
import { getDb } from "./db";
import { evaluations, staffProfiles, organizations } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Evaluation Reminder Handler
 * ----------------------------
 * Called by the Heartbeat cron system at /api/scheduled/evaluation-reminder
 * Sends reminders to admin/principal when periodic evaluations are due.
 * Runs weekly (every Sunday at 8:00 AM UTC).
 *
 * Logic:
 * - Check if current date is near the start of a new quarter (within 7 days)
 * - Check if there are employees who haven't been evaluated in the current/previous quarter
 * - Send notification to admin/principal to conduct evaluations
 *
 * SECURITY FIX: this handler previously queried staffProfiles/evaluations
 * with NO organizationId filter at all -- "never evaluated" and "not
 * evaluated this period" counts were computed across EVERY organization in
 * the database combined, and the resulting single aggregate message was
 * then broadcast (via the also-unscoped db.getUsersByRoles) to every
 * admin/principal in every organization. An admin in organization A would
 * see a staff count that was actually the sum of every other organization's
 * staff too. This is now computed and sent per-organization.
 */
export async function evaluationReminderHandler(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { sdk } = await import("./_core/sdk");
    const user = await sdk.authenticateRequest(req);
    // SECURITY FIX: this is a platform-wide scheduled job (iterates
    // evaluations/reminders across every organization); previously any
    // single organization's own regular admin could manually trigger it.
    // Per policy, the only allowed cross-organization actor is the
    // authenticated Super Admin (or the automated cron system itself).
    if (!user.isCron && (user as any).role !== "super_admin") {
      res.status(403).json({ error: "cron-only or super_admin" });
      return;
    }

    const database = await getDb();
    if (!database) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Determine current quarter
    const currentQuarter = Math.ceil(currentMonth / 3);

    // Check if we're in the first week of a new quarter (months 1, 4, 7, 10)
    const quarterStartMonths = [1, 4, 7, 10];
    const isQuarterStart = quarterStartMonths.includes(currentMonth) && now.getDate() <= 7;

    // Also check if we're in the last week of a quarter (months 3, 6, 9, 12)
    const quarterEndMonths = [3, 6, 9, 12];
    const isQuarterEnd = quarterEndMonths.includes(currentMonth) && now.getDate() >= 24;

    const shouldRemind = isQuarterStart || isQuarterEnd;

    const allOrgs = await database.select({ id: organizations.id }).from(organizations).where(eq(organizations.status, "active"));

    let totalSent = 0;
    const perOrgResults: any[] = [];

    for (const org of allOrgs) {
      const organizationId = org.id;

      if (!shouldRemind) {
        // Not near quarter boundary, check if there are employees never evaluated
        const orgStaff = await database.select().from(staffProfiles).where(and(eq(staffProfiles.status, "active"), eq(staffProfiles.organizationId, organizationId)));

        // Check for employees who have never been evaluated (within this org only)
        const orgEvals = await database.select({ visUserId: evaluations.userId }).from(evaluations).where(eq(evaluations.organizationId, organizationId));
        const evaluatedIds = new Set(orgEvals.map((e: any) => e.visUserId));
        const neverEvaluated = orgStaff.filter((s: any) => !evaluatedIds.has(s.userId));

        if (neverEvaluated.length === 0) {
          continue;
        }

        const admins = await db.getUsersByRoles(["admin", "super_admin", "principal"], organizationId);
        const adminIds = admins.map((u: any) => u.id);
        if (adminIds.length === 0) continue;

        const message = `يوجد ${neverEvaluated.length} موظف لم يتم تقييمهم بعد. يرجى إجراء تقييم الأداء لهم.`;

        const payload: PushPayload = {
          title: "تذكير: تقييم الأداء 📋",
          body: message,
          tag: `eval-reminder-${currentYear}-${currentQuarter}-org${organizationId}`,
          silent: false,
          data: {
            url: "/staff/performance-evaluation",
            type: "evaluation_reminder",
          },
        };

        const result = await sendPushToUsers(adminIds, payload, db.getPushSubscriptionsForUser);
        if (result.expiredIds.length > 0) {
          await db.removeExpiredSubscriptions(result.expiredIds);
        }

        for (const adminId of adminIds) {
          await db.createNotification({
            userId: adminId,
            organizationId,
            title: "تذكير: تقييم الأداء",
            titleAr: "تذكير: تقييم الأداء",
            body: message,
            bodyAr: message,
            type: "system",
            link: "/staff/performance-evaluation",
            metadata: { type: "evaluation_reminder", neverEvaluatedCount: neverEvaluated.length },
          });
        }

        totalSent += adminIds.length;
        perOrgResults.push({ organizationId, kind: "never_evaluated", sent: adminIds.length, neverEvaluatedCount: neverEvaluated.length });
        continue;
      }

      // Quarter boundary - remind about periodic evaluation
      const orgStaff = await database.select().from(staffProfiles).where(and(eq(staffProfiles.status, "active"), eq(staffProfiles.organizationId, organizationId)));
      const totalStaff = orgStaff.length;
      if (totalStaff === 0) continue;

      // Determine the period to check
      let checkPeriod: string;
      if (isQuarterEnd) {
        checkPeriod = `Q${currentQuarter}-${currentYear}`;
      } else {
        // Start of new quarter - check previous quarter
        const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
        const prevYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
        checkPeriod = `Q${prevQuarter}-${prevYear}`;
      }

      // Check how many have been evaluated for this period (within this org only)
      const periodEvals = await database.select({ visUserId: evaluations.userId })
        .from(evaluations)
        .where(and(eq(evaluations.period, checkPeriod), eq(evaluations.organizationId, organizationId)));
      const evaluatedCount = new Set(periodEvals.map((e: any) => e.visUserId)).size;
      const notEvaluatedCount = totalStaff - evaluatedCount;

      if (notEvaluatedCount <= 0) {
        continue;
      }

      const admins = await db.getUsersByRoles(["admin", "super_admin", "principal"], organizationId);
      const adminIds = admins.map((u: any) => u.id);
      if (adminIds.length === 0) continue;

      const periodLabel = isQuarterEnd
        ? `الربع الحالي (${checkPeriod})`
        : `الربع السابق (${checkPeriod})`;

      const message = `تذكير: يوجد ${notEvaluatedCount} موظف من أصل ${totalStaff} لم يتم تقييمهم لفترة ${periodLabel}. يرجى إكمال تقييمات الأداء.`;

      const payload: PushPayload = {
        title: "تذكير: موعد التقييم الدوري 📋",
        body: message,
        tag: `eval-reminder-${checkPeriod}-org${organizationId}`,
        silent: false,
        data: {
          url: "/staff/performance-evaluation",
          type: "evaluation_reminder",
          period: checkPeriod,
        },
      };

      const result = await sendPushToUsers(adminIds, payload, db.getPushSubscriptionsForUser);
      if (result.expiredIds.length > 0) {
        await db.removeExpiredSubscriptions(result.expiredIds);
      }

      for (const adminId of adminIds) {
        await db.createNotification({
          userId: adminId,
          organizationId,
          title: "تذكير: موعد التقييم الدوري",
          titleAr: "تذكير: موعد التقييم الدوري",
          body: message,
          bodyAr: message,
          type: "system",
          link: "/staff/performance-evaluation",
          metadata: { type: "evaluation_reminder", period: checkPeriod, notEvaluatedCount, totalStaff },
        });
      }

      totalSent += adminIds.length;
      perOrgResults.push({ organizationId, kind: "quarter_boundary", sent: adminIds.length, notEvaluatedCount, totalStaff, period: checkPeriod });
    }

    const duration = Date.now() - startTime;
    res.json({
      ok: true,
      sent: totalSent,
      organizations: perOrgResults,
      durationMs: duration,
    });
  } catch (error: any) {
    console.error("[EvaluationReminder] Handler error:", error);
    res.status(500).json({
      error: error.message || "Internal error",
      timestamp: new Date().toISOString(),
    });
  }
}
