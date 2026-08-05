import type { Request, Response } from "express";
import * as db from "./db";
import { sendPushToUser, sendPushToUsers, PushPayload } from "./_core/webPush";

/**
 * Event Reminders Handler
 * -----------------------
 * Called by the Heartbeat cron system at /api/scheduled/event-reminders
 * Processes pending event reminders and sends notifications.
 * Runs every hour to check for reminders that are due.
 */
export async function eventRemindersHandler(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    // Authentication is handled by the requireCronSecret middleware in index.ts.
    // When CRON_SECRET is set, only requests with the correct Bearer token pass.
    // When running on Manus, the Heartbeat system is the only caller.

    const pendingReminders = await db.getPendingReminders();
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const reminder of pendingReminders) {
      try {
        // Get the event to check if it's still published
        const event = await db.getCalendarEvent(reminder.eventId);
        if (!event || event.status !== "published") {
          await db.cancelSingleReminder(reminder.id);
          skipped++;
          continue;
        }

        // Determine target users based on audience
        // SECURITY FIX: previously called db.getUsersByRoles() with no
        // organizationId at all -- every hourly event reminder was broadcast
        // to every matching-role user across EVERY organization, not just
        // the organization that owns this event. Scoped via the event's own
        // (trusted, server-side) organizationId.
        let targetUserIds: number[] = [];
        const audience = reminder.audience;

        if (audience === "parents" || audience === "all") {
          const parents = await db.getUsersByRoles(["parent"], event.organizationId);
          targetUserIds.push(...parents.map((u: any) => u.id));
        }
        if (audience === "staff" || audience === "all") {
          const staff = await db.getUsersByRoles(["admin", "super_admin", "principal", "teacher"], event.organizationId);
          targetUserIds.push(...staff.map((u: any) => u.id));
        }

        // Deduplicate
        targetUserIds = Array.from(new Set(targetUserIds));

        if (targetUserIds.length === 0) {
          await db.markReminderSent(reminder.id);
          skipped++;
          continue;
        }

        // Build the notification message
        const message = reminder.message || `تذكير: ${event.titleAr}`;

        // Send push notification (silent - no sound/vibration)
        const payload: PushPayload = {
          title: "تذكير حدث 📅",
          body: message,
          tag: `event-reminder-${reminder.eventId}-${reminder.id}`,
          silent: true,
          data: {
            url: audience === "staff" ? "/staff/calendar" : "/parent/calendar",
            eventId: reminder.eventId,
            type: "event_reminder",
          },
        };

        const result = await sendPushToUsers(targetUserIds, payload, db.getPushSubscriptionsForUser);
        if (result.expiredIds.length > 0) {
          await db.removeExpiredSubscriptions(result.expiredIds);
        }

        // Create in-app notifications
        for (const userId of targetUserIds) {
          await db.createNotification({
            userId,
            organizationId: event.organizationId,
            title: "تذكير حدث",
            titleAr: "تذكير حدث",
            body: message,
            bodyAr: message,
            type: "general",
            metadata: { eventId: reminder.eventId, type: "event_reminder" },
          });
        }

        // Mark reminder as sent
        await db.markReminderSent(reminder.id);
        processed++;
      } catch (error) {
        console.error(`[EventReminder] Failed to process reminder ${reminder.id}:`, error);
        failed++;
      }
    }

    const duration = Date.now() - startTime;
    res.json({
      ok: true,
      processed,
      skipped,
      failed,
      total: pendingReminders.length,
      durationMs: duration,
    });
  } catch (error: any) {
    console.error("[EventReminder] Handler error:", error);
    res.status(500).json({
      error: error.message || "Internal error",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
