/**
 * Payment Settings Router
 * Allows each organization admin to configure their own Moyasar payment keys
 */
import { z } from "zod";
import { router, tenantProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { organizations } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Only admin/owner/principal can manage payment settings
const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (!['admin', 'owner', 'principal', 'super_admin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
  }
  return next({ ctx });
});

export const paymentSettingsRouter = router({
  // Get payment settings for current organization
  get: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user.organizationId) return null;
    const [org] = await db.select({
      paymentEnabled: organizations.paymentEnabled,
      moyasarPublishableKey: organizations.moyasarPublishableKey,
      // Don't expose full secret key - only show last 4 chars
      hasMoyasarSecretKey: organizations.moyasarSecretKey,
    }).from(organizations).where(eq(organizations.id, ctx.user.organizationId));
    if (!org) return null;
    return {
      paymentEnabled: org.paymentEnabled,
      moyasarPublishableKey: org.moyasarPublishableKey || '',
      hasMoyasarSecretKey: !!org.hasMoyasarSecretKey,
      moyasarSecretKeyLast4: org.hasMoyasarSecretKey ? '****' + org.hasMoyasarSecretKey.slice(-4) : '',
    };
  }),

  // Update payment settings
  update: adminProcedure.input(z.object({
    paymentEnabled: z.boolean(),
    moyasarPublishableKey: z.string().optional(),
    moyasarSecretKey: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db || !ctx.user.organizationId) throw new Error("غير مصرح");
    
    const updateData: any = {
      paymentEnabled: input.paymentEnabled,
    };
    
    if (input.moyasarPublishableKey !== undefined) {
      updateData.moyasarPublishableKey = input.moyasarPublishableKey || null;
    }
    if (input.moyasarSecretKey !== undefined && input.moyasarSecretKey !== '') {
      updateData.moyasarSecretKey = input.moyasarSecretKey;
    }
    
    await db.update(organizations)
      .set(updateData)
      .where(eq(organizations.id, ctx.user.organizationId));
    
    return { success: true };
  }),

  // Test connection with provided keys
  test: adminProcedure.input(z.object({
    publishableKey: z.string(),
    secretKey: z.string(),
  })).mutation(async ({ input }) => {
    try {
      // Try to fetch payments list to verify the key works
      const response = await fetch('https://api.moyasar.com/v1/payments?page=1&per=1', {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${input.secretKey}:`).toString('base64')}`,
        },
      });
      if (response.ok) {
        return { success: true, message: 'تم التحقق بنجاح - المفاتيح صحيحة' };
      } else {
        return { success: false, message: 'المفاتيح غير صحيحة - تأكد من إدخال المفاتيح الصحيحة' };
      }
    } catch (e) {
      return { success: false, message: 'خطأ في الاتصال - حاول مرة أخرى' };
    }
  }),
});
