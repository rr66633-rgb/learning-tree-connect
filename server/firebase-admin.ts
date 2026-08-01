import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getDb } from "./db";
import { fcmTokens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Initialize Firebase Admin SDK (v14 modular API)
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: "naashah-8d07e",
      clientEmail: "firebase-adminsdk-fbsvc@naashah-8d07e.iam.gserviceaccount.com",
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId: number, payload: PushNotificationPayload): Promise<number> {
  try {
    // Get all active tokens for this user
    const db = (await getDb())!;
    const tokens = await db
      .select()
      .from(fcmTokens)
      .where(and(eq(fcmTokens.userId, userId), eq(fcmTokens.active, true)));

    if (tokens.length === 0) {
      return 0;
    }

    const tokenStrings = tokens.map((t: any) => t.token as string);

    const messaging = getMessaging();

    const message = {
      tokens: tokenStrings,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      webpush: {
        notification: {
          icon: payload.icon || "/favicon.ico",
          badge: "/favicon.ico",
          dir: "rtl" as const,
          lang: "ar",
        },
        fcmOptions: {
          link: payload.data?.url || "/",
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // Deactivate failed tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            failedTokens.push(tokenStrings[idx]);
          }
        }
      });

      // Deactivate invalid tokens
      for (const failedToken of failedTokens) {
        await db
          .update(fcmTokens)
          .set({ active: false })
          .where(eq(fcmTokens.token, failedToken));
      }
    }

    return response.successCount;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return 0;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(userIds: number[], payload: PushNotificationPayload): Promise<number> {
  let totalSent = 0;
  for (const userId of userIds) {
    const sent = await sendPushToUser(userId, payload);
    totalSent += sent;
  }
  return totalSent;
}

/**
 * Register or update FCM token for a user
 */
export async function registerFcmToken(
  userId: number,
  token: string,
  platform: "web" | "android" | "ios" = "web",
  device?: string
): Promise<void> {
  const db = (await getDb())!;
  // Check if token already exists
  const existing = await db
    .select()
    .from(fcmTokens)
    .where(eq(fcmTokens.token, token));

  if (existing.length > 0) {
    // Update existing token - reassign to current user and reactivate
    await db
      .update(fcmTokens)
      .set({ userId, active: true, platform, device })
      .where(eq(fcmTokens.token, token));
  } else {
    // Insert new token
    await db.insert(fcmTokens).values({
      userId,
      token,
      platform,
      device,
      active: true,
    });
  }
}

/**
 * Remove FCM token (on logout)
 */
export async function removeFcmToken(token: string): Promise<void> {
  const db = (await getDb())!;
  await db
    .update(fcmTokens)
    .set({ active: false })
    .where(eq(fcmTokens.token, token));
}
