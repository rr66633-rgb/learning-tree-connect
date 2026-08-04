import { Request, Response } from "express";
import { getDb } from "./db";
import { pickupRequests, users, children } from "../drizzle/schema";
import { eq, and, isNull, lte, inArray } from "drizzle-orm";

/**
 * Pickup Escalation Handler
 * -------------------------
 * Called by the Heartbeat cron system every minute at /api/scheduled/pickup-escalation
 * Checks for pickup requests that have been waiting for teacher response for more than 5 minutes.
 * If found, marks them as escalated and sends notification to admin/principal.
 */
export async function pickupEscalationHandler(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { sdk } = await import("./_core/sdk");
    const user = await sdk.authenticateRequest(req);
    // SECURITY FIX: this is a platform-wide scheduled job (escalates overdue
    // pickup requests across every organization); previously any single
    // organization's own regular admin could manually trigger it. Per
    // policy, the only allowed cross-organization actor is the
    // authenticated Super Admin (or the automated cron system itself).
    if (!user.isCron && user.role !== "super_admin") {
      res.status(403).json({ error: "cron-only or super_admin" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    // Find pickup requests waiting for teacher response for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // SECURITY FIX: previously selected with no organizationId at all, then
    // notified EVERY admin/owner/principal in the ENTIRE database with ONE
    // combined message naming every escalated child across every
    // organization. An admin in organization A would learn the names of
    // children waiting for pickup in organization B. organizationId is now
    // carried through and escalations are grouped and notified per
    // organization.
    const unrespondedRequests = await db.select({
      id: pickupRequests.id,
      childId: pickupRequests.childId,
      parentId: pickupRequests.parentId,
      requestedAt: pickupRequests.requestedAt,
      organizationId: pickupRequests.organizationId,
    })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, "waiting_teacher"),
      isNull(pickupRequests.escalatedAt),
      lte(pickupRequests.requestedAt, fiveMinutesAgo)
    ));

    if (unrespondedRequests.length === 0) {
      res.json({ ok: true, escalated: 0, duration: Date.now() - startTime });
      return;
    }

    // Get child names for the notification, grouped by organization
    const escalatedByOrg = new Map<number, Array<{ childName: string; waitMinutes: number; requestId: number }>>();

    for (const request of unrespondedRequests) {
      // Mark as escalated
      await db.update(pickupRequests)
        .set({ escalatedAt: new Date() })
        .where(eq(pickupRequests.id, request.id));

      // Get child name
      const child = await db.select({ firstName: children.firstName, lastName: children.lastName })
        .from(children)
        .where(eq(children.id, request.childId))
        .limit(1);

      const childName = child[0] ? `${child[0].firstName} ${child[0].lastName}` : `طفل #${request.childId}`;
      const waitMinutes = Math.round((Date.now() - new Date(request.requestedAt).getTime()) / 60000);

      const orgId = request.organizationId || 0;
      if (!escalatedByOrg.has(orgId)) escalatedByOrg.set(orgId, []);
      escalatedByOrg.get(orgId)!.push({ childName, waitMinutes, requestId: request.id });
    }

    // Import notification helper
    const { createNotification, getPushSubscriptionsForUser, removeExpiredSubscriptions } = await import("./db");
    const { sendPushToUsers } = await import("./_core/webPush");

    let totalEscalated = 0;
    const perOrgResults: any[] = [];

    for (const [orgId, escalatedDetails] of escalatedByOrg) {
      // Send notification to this organization's admins/principals/owner only
      // (exclude super_admin - manages all nurseries, handled separately if needed)
      const orgFilter = orgId ? [eq(users.organizationId, orgId)] : [];
      const adminUsers = await db.select({ id: users.id })
        .from(users)
        .where(and(inArray(users.role, ['admin', 'owner', 'principal'] as any), ...orgFilter));

      const childNames = escalatedDetails.map(d => d.childName).join("، ");
      const message = escalatedDetails.length === 1
        ? `تنبيه تصعيدي: طلب استلام ${escalatedDetails[0].childName} لم يُستجب له منذ ${escalatedDetails[0].waitMinutes} دقيقة`
        : `تنبيه تصعيدي: ${escalatedDetails.length} طلبات استلام لم يُستجب لها (${childNames})`;

      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          organizationId: orgId || undefined,
          title: "تنبيه تصعيدي - طلب استلام متأخر",
          body: message,
          type: "general",
        });
      }

      // Also try to send push notifications
      try {
        const adminIds = adminUsers.map(a => a.id);
        const payload = {
          title: 'تنبيه تصعيدي - طلب استلام متأخر',
          body: escalatedDetails.length === 1
            ? `طلب استلام ${escalatedDetails[0].childName} متأخر ${escalatedDetails[0].waitMinutes} دقيقة`
            : `${escalatedDetails.length} طلبات استلام متأخرة (${childNames})`,
          tag: `escalation-${Date.now()}-org${orgId}`,
          requireInteraction: true,
          urgency: 'high' as const,
          vibrate: [300, 100, 300, 100, 300],
          data: {
            url: '/staff/pickup',
            type: 'pickup_escalation',
            priority: 'high',
          },
        };
        const result = await sendPushToUsers(adminIds, payload, getPushSubscriptionsForUser);
        if (result.expiredIds.length > 0) {
          await removeExpiredSubscriptions(result.expiredIds);
        }
      } catch (pushErr) {
        // Push notification failure is non-critical
        console.error("[Escalation] Push notification failed:", pushErr);
      }

      totalEscalated += escalatedDetails.length;
      perOrgResults.push({ organizationId: orgId, escalated: escalatedDetails.length, details: escalatedDetails });
    }

    res.json({
      ok: true,
      escalated: totalEscalated,
      organizations: perOrgResults,
      duration: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error("[Escalation] Error:", error);
    res.status(500).json({
      error: error.message || "Unknown error",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
