import { sendPushToUser, sendPushToUsers, PushPayload } from './webPush';
import * as db from '../db';

/**
 * Send HIGH-PRIORITY push notification to child's teacher(s) about parent arrival.
 * Uses requireInteraction=true so the notification persists until acknowledged.
 * Includes vibration pattern and special data flags for full-screen alert.
 */
export async function notifyStaffPickupRequest(childName: string, pickupRequestId: number, childId: number) {
  const payload: PushPayload = {
    title: '🚨 ولي أمر وصل للاستلام',
    body: `ولي أمر ${childName} وصل وينتظر - يرجى الاستجابة فوراً`,
    tag: `pickup-urgent-${pickupRequestId}`,
    requireInteraction: true,
    urgency: 'high',
    vibrate: [500, 200, 500, 200, 500, 200, 500],
    data: {
      url: '/staff/pickup',
      pickupRequestId,
      childId,
      type: 'parent_arrival',
      priority: 'urgent',
      fullScreenAlert: true,
      sound: 'urgent',
    },
    actions: [
      { action: 'acknowledge', title: 'تم الاستلام ✓' },
      { action: 'view', title: 'عرض التفاصيل' },
    ],
  };

  // First, try to notify the specific teacher(s) for this child's class
  const teachers = await db.getTeachersForChild(childId);
  let targetIds = teachers.map((t: any) => t.id);

  // Also notify admins/principals for visibility
  const staffUsers = await db.getStaffUsers();
  const adminIds = staffUsers
    .filter((u: any) => ['super_admin', 'admin', 'principal', 'receptionist'].includes(u.role))
    .map((u: any) => u.id);

  // Combine teacher IDs + admin IDs (deduplicated)
  const allTargetIds = Array.from(new Set([...targetIds, ...adminIds]));

  if (allTargetIds.length === 0) return;

  const result = await sendPushToUsers(allTargetIds, payload, db.getPushSubscriptionsForUser);
  if (result.expiredIds.length > 0) {
    await db.removeExpiredSubscriptions(result.expiredIds);
  }
}

/**
 * Send push notification to parent about pickup status change
 */
export async function notifyParentPickupStatus(parentId: number, childName: string, status: string, pickupRequestId: number) {
  const statusMessages: Record<string, string> = {
    called: `تم استدعاء ${childName}، يرجى الانتظار 📢`,
    ready: `${childName} جاهز للاستلام ✅`,
    picked_up: `تم تسليم ${childName} بنجاح 🎉`,
    cancelled: 'تم إلغاء طلب الاستلام',
  };

  const payload: PushPayload = {
    title: 'تحديث طلب الاستلام',
    body: statusMessages[status] || 'تم تحديث حالة طلب الاستلام',
    tag: `pickup-status-${pickupRequestId}`,
    data: { url: '/pickup', pickupRequestId, status },
  };

  const result = await sendPushToUser(parentId, payload, db.getPushSubscriptionsForUser);
  if (result.expired.length > 0) {
    await db.removeExpiredSubscriptions(result.expired);
  }
}

/**
 * Send push notification to parent about child check-in
 */
export async function notifyParentCheckIn(parentId: number, childName: string, childId: number) {
  const payload: PushPayload = {
    title: 'وصول الطفل ✅',
    body: `وصل ${childName} إلى المركز بسلامة`,
    tag: `checkin-${childId}-${Date.now()}`,
    data: { url: '/attendance', childId, type: 'checkin' },
  };

  const result = await sendPushToUser(parentId, payload, db.getPushSubscriptionsForUser);
  if (result.expired.length > 0) {
    await db.removeExpiredSubscriptions(result.expired);
  }
}

/**
 * Send push notification to parent about child check-out
 */
export async function notifyParentCheckOut(parentId: number, childName: string, childId: number, pickedUpBy: string) {
  const payload: PushPayload = {
    title: 'مغادرة الطفل 👋',
    body: `غادر ${childName} المركز مع ${pickedUpBy}`,
    tag: `checkout-${childId}-${Date.now()}`,
    data: { url: '/attendance', childId, type: 'checkout' },
  };

  const result = await sendPushToUser(parentId, payload, db.getPushSubscriptionsForUser);
  if (result.expired.length > 0) {
    await db.removeExpiredSubscriptions(result.expired);
  }
}

/**
 * Send push notification to parent about new invoice
 */
export async function notifyParentNewInvoice(parentId: number, childName: string, amount: number, invoiceId: number) {
  const payload: PushPayload = {
    title: 'فاتورة جديدة 📄',
    body: `فاتورة جديدة بقيمة ${amount} ر.س لـ ${childName}`,
    tag: `invoice-${invoiceId}`,
    data: { url: '/finance', invoiceId },
    actions: [
      { action: 'pay', title: 'دفع الآن' },
    ],
  };

  const result = await sendPushToUser(parentId, payload, db.getPushSubscriptionsForUser);
  if (result.expired.length > 0) {
    await db.removeExpiredSubscriptions(result.expired);
  }
}

/**
 * Send push notification to parent about new daily report
 */
export async function notifyParentDailyReport(parentId: number, childName: string, childId: number) {
  const payload: PushPayload = {
    title: 'تقرير يومي جديد 📝',
    body: `تم إرسال تقرير يومي جديد لـ ${childName}`,
    tag: `report-${childId}-${Date.now()}`,
    data: { url: '/daily-reports', childId },
  };

  const result = await sendPushToUser(parentId, payload, db.getPushSubscriptionsForUser);
  if (result.expired.length > 0) {
    await db.removeExpiredSubscriptions(result.expired);
  }
}
