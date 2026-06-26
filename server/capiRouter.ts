/**
 * Meta Conversions API (CAPI) Router
 * Handles server-side event tracking with event deduplication.
 */

import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { sendCAPIEvent, hashValue } from "./lib/metaCapi";

const userDataSchema = z.object({
  fbc: z.string().optional(), // Facebook click ID from _fbc cookie
  fbp: z.string().optional(), // Facebook browser ID from _fbp cookie
  email: z.string().optional(), // Will be hashed before sending
  phone: z.string().optional(), // Will be hashed before sending
  externalId: z.string().optional(), // User ID in our system
});

const customDataSchema = z.object({
  currency: z.string().optional(),
  value: z.number().optional(),
  contentName: z.string().optional(),
  contentCategory: z.string().optional(),
  contentIds: z.array(z.string()).optional(),
  contentType: z.string().optional(),
  numItems: z.number().optional(),
  status: z.string().optional(),
});

export const capiRouter = router({
  /**
   * Generic event tracking endpoint
   * Called from the frontend alongside the browser pixel for deduplication
   */
  trackEvent: publicProcedure
    .input(z.object({
      eventName: z.enum([
        'PageView',
        'ViewContent',
        'Lead',
        'CompleteRegistration',
        'Contact',
        'Purchase',
      ]),
      eventId: z.string().min(1), // UUID generated on frontend for deduplication
      eventSourceUrl: z.string().url(),
      userData: userDataSchema.optional(),
      customData: customDataSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Extract IP and User Agent from the request
      const clientIp = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || ctx.req.socket.remoteAddress
        || '';
      const clientUserAgent = ctx.req.headers['user-agent'] || '';

      // Prepare user data with hashing
      const userData: Record<string, unknown> = {
        client_ip_address: clientIp,
        client_user_agent: clientUserAgent,
      };

      if (input.userData?.fbc) {
        userData.fbc = input.userData.fbc;
      }
      if (input.userData?.fbp) {
        userData.fbp = input.userData.fbp;
      }
      if (input.userData?.email) {
        userData.em = [await hashValue(input.userData.email)];
      }
      if (input.userData?.phone) {
        userData.ph = [await hashValue(input.userData.phone)];
      }
      if (input.userData?.externalId) {
        userData.external_id = [await hashValue(input.userData.externalId)];
      }

      // Prepare custom data
      const customData: Record<string, unknown> = {};
      if (input.customData) {
        if (input.customData.currency) customData.currency = input.customData.currency;
        if (input.customData.value !== undefined) customData.value = input.customData.value;
        if (input.customData.contentName) customData.content_name = input.customData.contentName;
        if (input.customData.contentCategory) customData.content_category = input.customData.contentCategory;
        if (input.customData.contentIds) customData.content_ids = input.customData.contentIds;
        if (input.customData.contentType) customData.content_type = input.customData.contentType;
        if (input.customData.numItems !== undefined) customData.num_items = input.customData.numItems;
        if (input.customData.status) customData.status = input.customData.status;
      }

      // Send to Meta CAPI (fire and forget for performance)
      const result = await sendCAPIEvent({
        eventName: input.eventName,
        eventId: input.eventId,
        eventSourceUrl: input.eventSourceUrl,
        userData: userData as any,
        customData: Object.keys(customData).length > 0 ? customData as any : undefined,
      });

      return { success: result.success };
    }),
});
