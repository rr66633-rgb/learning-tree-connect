import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { demoRequests } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

export const demoRouter = router({
  // Public procedure - no auth required
  submitDemoRequest: publicProcedure
    .input(z.object({
      nurseryName: z.string().min(2, "اسم المركز مطلوب"),
      contactName: z.string().min(2, "اسم المسؤول مطلوب"),
      phone: z.string().min(9, "رقم الجوال مطلوب"),
      email: z.string().email().optional().or(z.literal("")),
      city: z.string().optional(),
      childrenCount: z.string().optional(),
      centerType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      
      // Save to database
      const [result] = await db.insert(demoRequests).values({
        nurseryName: input.nurseryName,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email || null,
        city: input.city || null,
        childrenCount: input.childrenCount || null,
        centerType: input.centerType || null,
        notes: input.notes || null,
      });

      // Notify owner about new demo request
      const centerTypeLabel = input.centerType || "غير محدد";
      const cityLabel = input.city || "غير محدد";
      
      await notifyOwner({
        title: `طلب عرض تعريفي جديد - ${input.nurseryName}`,
        content: `تم استلام طلب عرض تعريفي جديد:\n\n` +
          `المركز: ${input.nurseryName}\n` +
          `المسؤول: ${input.contactName}\n` +
          `الجوال: ${input.phone}\n` +
          `${input.email ? `البريد: ${input.email}\n` : ''}` +
          `المدينة: ${cityLabel}\n` +
          `نوع المركز: ${centerTypeLabel}\n` +
          `${input.childrenCount ? `عدد الأطفال: ${input.childrenCount}\n` : ''}` +
          `${input.notes ? `ملاحظات: ${input.notes}` : ''}`,
      });

      return { success: true, id: result.insertId };
    }),
});
