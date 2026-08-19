import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb as getSharedDb } from "./db";
import { eq } from "drizzle-orm";
import { organizations } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

// Tabby API base URL for KSA
const TABBY_API_BASE = "https://api.tabby.sa";

export const tabbyRouter = router({
  // Check if Tabby is available for the user's organization
  status: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId || ctx.user?.organizationId;
    if (!orgId) return { available: false, publicKey: null, merchantCode: null };
    const db = (await getSharedDb())!;
    const [org] = await db.select({
      tabbyPublicKey: organizations.tabbyPublicKey,
      tabbyMerchantCode: organizations.tabbyMerchantCode,
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return {
      available: !!(org?.tabbyPublicKey && org?.tabbyMerchantCode),
      publicKey: org?.tabbyPublicKey || null,
      merchantCode: org?.tabbyMerchantCode || null,
    };
  }),

  // Create a Tabby checkout session
  createSession: protectedProcedure.input(z.object({
    invoiceId: z.number(),
    amount: z.number(), // in SAR (e.g. 1150.00)
    description: z.string(),
    buyerEmail: z.string(),
    buyerPhone: z.string(),
    buyerName: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.organizationId || ctx.user?.organizationId;
    if (!orgId) throw new TRPCError({ code: "FORBIDDEN", message: "No organization" });
    const db = (await getSharedDb())!;
    
    const [org] = await db.select({
      tabbySecretKey: organizations.tabbySecretKey,
      tabbyMerchantCode: organizations.tabbyMerchantCode,
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    
    if (!org?.tabbySecretKey || !org?.tabbyMerchantCode) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Tabby not configured for this organization" });
    }

    const payload = {
      payment: {
        amount: input.amount.toFixed(2),
        currency: "SAR",
        description: input.description,
        buyer: {
          phone: input.buyerPhone,
          email: input.buyerEmail,
          name: input.buyerName || "Parent",
        },
        order: {
          reference_id: String(input.invoiceId),
          items: [{
            title: input.description,
            quantity: 1,
            unit_price: input.amount.toFixed(2),
            category: "Education",
          }],
        },
        buyer_history: {
          registered_since: "2024-01-01T00:00:00Z",
          loyalty_level: 0,
        },
      },
      lang: "ar",
      merchant_code: org.tabbyMerchantCode,
      merchant_urls: {
        success: `https://naashah.com/tabby-callback?status=success&invoiceId=${input.invoiceId}`,
        cancel: `https://naashah.com/tabby-callback?status=cancel&invoiceId=${input.invoiceId}`,
        failure: `https://naashah.com/tabby-callback?status=failure&invoiceId=${input.invoiceId}`,
      },
    };

    const response = await fetch(`${TABBY_API_BASE}/api/v2/checkout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${org.tabbySecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status === "created" && data.configuration?.available_products?.installments?.[0]?.web_url) {
      return {
        success: true as const,
        checkoutUrl: data.configuration.available_products.installments[0].web_url as string,
        paymentId: data.payment?.id as string,
      };
    } else if (data.status === "rejected") {
      const reason = data.configuration?.products?.installments?.rejection_reason || "not_available";
      return {
        success: false as const,
        rejected: true,
        reason: reason as string,
      };
    } else {
      console.error("Tabby session creation failed:", JSON.stringify(data));
      return {
        success: false as const,
        error: "Failed to create Tabby session",
      };
    }
  }),
});
