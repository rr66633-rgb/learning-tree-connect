import { sendPushToUser, sendPushToUsers, PushPayload } from './webPush';
import * as db from '../db';

/**
 * Send push notification to all staff (teachers, admins, etc.) about a pickup request
 */
export async function notifyStaffPickupRequest(childName: string, pickupRequestId: number, childId: number) {
  const payload: PushPayload = {
    title: 'طلب استلام جديد 🚗',
    body: `ولي أمر ${childName} وصل لاستلامه`,
    tag: `pickup-${pickupRequestId}`,
    data: { url: '/pickup', pickupRequestId, childId },
    actions: [
      { action: 'view', title: 'عرض' },
    ],
  };

  // Get all staff users
  const staffUsers = await db.getStaffUsers();
  const staffIds = staffUsers.map((u: any) => u.id);

  if (staffIds.length === 0) return;

  const result = await sendPushToUsers(staffIds, payload, db.getPushSubscriptionsForUser);
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
