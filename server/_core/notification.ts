import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { isEmailConfigured, sendNotificationEmail } from "../services/emailService";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Best-effort fallback used when the Manus "Forge" owner-notification
 * service isn't configured (e.g. running outside Manus): emails
 * ADMIN_NOTIFICATION_EMAIL instead, if both an address and email sending
 * are configured. Never throws -- returns whether the email actually went
 * out.
 */
async function notifyOwnerByEmail(
  payload: NotificationPayload
): Promise<boolean> {
  if (!ENV.adminNotificationEmail || !isEmailConfigured()) {
    return false;
  }
  try {
    const result = await sendNotificationEmail(
      ENV.adminNotificationEmail,
      "Owner",
      payload.title,
      payload.content
    );
    return result.success !== false;
  } catch (error) {
    console.warn("[Notification] Email fallback failed:", error);
    return false;
  }
}

/**
 * Dispatches a project-owner notification through the Manus Notification
 * Service, falling back to ADMIN_NOTIFICATION_EMAIL (see env.ts) when Forge
 * isn't configured -- this is the normal case once running outside Manus.
 * Returns `true` if the request was accepted, `false` when neither channel
 * is available or reachable. Never throws for missing configuration:
 * callers rely on this staying best-effort so a notification failure never
 * blocks the registration/demo-request flow that triggered it. Validation
 * errors (bad payload) still bubble up as TRPC errors so callers can fix
 * the payload.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return notifyOwnerByEmail({ title, content });
  }

  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
