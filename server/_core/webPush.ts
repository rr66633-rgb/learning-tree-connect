import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = 'mailto:admin@learningtree.sa';

// Configure web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function isWebPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  vibrate?: number[];
  silent?: boolean;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
): Promise<boolean> {
  if (!isWebPushConfigured()) {
    console.log('[WebPush] Not configured, skipping notification');
    return false;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      {
        TTL: 60 * 60, // 1 hour
        urgency: payload.urgency || 'high',
      }
    );
    return true;
  } catch (error: any) {
    // 410 Gone or 404 means subscription is expired/invalid
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('[WebPush] Subscription expired:', subscription.endpoint.slice(0, 50));
      return false;
    }
    console.error('[WebPush] Error sending notification:', error.message);
    return false;
  }
}

/**
 * Send push notification to all subscriptions for a user
 */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
  getSubscriptions: (userId: number) => Promise<Array<{ endpoint: string; p256dh: string; auth: string; id: number }>>
): Promise<{ sent: number; failed: number; expired: number[] }> {
  const subscriptions = await getSubscriptions(userId);
  let sent = 0;
  const expired: number[] = [];

  for (const sub of subscriptions) {
    const success = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    if (success) {
      sent++;
    } else {
      expired.push(sub.id);
    }
  }

  return { sent, failed: subscriptions.length - sent, expired };
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: number[],
  payload: PushPayload,
  getSubscriptions: (userId: number) => Promise<Array<{ endpoint: string; p256dh: string; auth: string; id: number }>>
): Promise<{ totalSent: number; totalFailed: number; expiredIds: number[] }> {
  let totalSent = 0;
  let totalFailed = 0;
  const expiredIds: number[] = [];

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload, getSubscriptions);
    totalSent += result.sent;
    totalFailed += result.failed;
    expiredIds.push(...result.expired);
  }

  return { totalSent, totalFailed, expiredIds };
}
