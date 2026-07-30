import type { Request, Response } from "express";
import * as db from "./db";
import { sendPushToUsers, PushPayload } from "./_core/webPush";
import { getDb } from "./db";
import { evaluations, staffProfiles } from "../drizzle/schema";
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
 */
export async function evaluationReminderHandler(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { sdk } = await import("./_core/sdk");
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron && (user as any).role !== "admin") {
      res.status(403).json({ error: "cron-only or admin" });
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

    if (!shouldRemind) {
      // Not near quarter boundary, check if there are employees never evaluated
      const allStaff = await database.select().from(staffProfiles).where(eq(staffProfiles.status, "active"));
      
      // Check for employees who have never been evaluated
      const allEvals = await database.select({ visUserId: evaluations.userId }).from(evaluations);
      const evaluatedIds = new Set(allEvals.map((e: any) => e.visUserId));
      const neverEvaluated = allStaff.filter((s: any) => !evaluatedIds.has(s.userId));

      if (neverEvaluated.length === 0) {
        res.json({ ok: true, message: "No reminders needed", sent: 0 });
        return;
      }

      // Send reminder about never-evaluated employees
      const admins = await db.getUsersByRoles(["admin", "super_admin", "principal"]);
      const adminIds = admins.map((u: any) => u.id);

      if (adminIds.length === 0) {
        res.json({ ok: true, message: "No admins to notify", sent: 0 });
        return;
      }

      const message = `يوجد ${neverEvaluated.length} موظف لم يتم تقييمهم بعد. يرجى إجراء تقييم الأداء لهم.`;

      const payload: PushPayload = {
        title: "تذكير: تقييم الأداء 📋",
        body: message,
        tag: `eval-reminder-${currentYear}-${currentQuarter}`,
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
          title: "تذكير: تقييم الأداء",
          titleAr: "تذكير: تقييم الأداء",
          body: message,
          bodyAr: message,
          type: "system",
          link: "/staff/performance-evaluation",
          metadata: { type: "evaluation_reminder", neverEvaluatedCount: neverEvaluated.length },
        });
      }

      res.json({ ok: true, message: "Sent reminder for never-evaluated employees", sent: adminIds.length, neverEvaluatedCount: neverEvaluated.length });
      return;
    }

    // Quarter boundary - remind about periodic evaluation
    const allStaff = await database.select().from(staffProfiles).where(eq(staffProfiles.status, "active"));
    const totalStaff = allStaff.length;

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

    // Check how many have been evaluated for this period
    const periodEvals = await database.select({ visUserId: evaluations.userId })
      .from(evaluations)
      .where(eq(evaluations.period, checkPeriod));
    const evaluatedCount = new Set(periodEvals.map((e: any) => e.visUserId)).size;
    const notEvaluatedCount = totalStaff - evaluatedCount;

    if (notEvaluatedCount <= 0) {
      res.json({ ok: true, message: "All employees evaluated for this period", sent: 0 });
      return;
    }

    // Send reminder to admins
    const admins = await db.getUsersByRoles(["admin", "super_admin", "principal"]);
    const adminIds = admins.map((u: any) => u.id);

    if (adminIds.length === 0) {
      res.json({ ok: true, message: "No admins to notify", sent: 0 });
      return;
    }

    const periodLabel = isQuarterEnd 
      ? `الربع الحالي (${checkPeriod})`
      : `الربع السابق (${checkPeriod})`;

    const message = `تذكير: يوجد ${notEvaluatedCount} موظف من أصل ${totalStaff} لم يتم تقييمهم لفترة ${periodLabel}. يرجى إكمال تقييمات الأداء.`;

    const payload: PushPayload = {
      title: "تذكير: موعد التقييم الدوري 📋",
      body: message,
      tag: `eval-reminder-${checkPeriod}`,
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
        title: "تذكير: موعد التقييم الدوري",
        titleAr: "تذكير: موعد التقييم الدوري",
        body: message,
        bodyAr: message,
        type: "system",
        link: "/staff/performance-evaluation",
        metadata: { type: "evaluation_reminder", period: checkPeriod, notEvaluatedCount, totalStaff },
      });
    }

    const duration = Date.now() - startTime;
    res.json({
      ok: true,
      sent: adminIds.length,
      period: checkPeriod,
      notEvaluatedCount,
      totalStaff,
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
