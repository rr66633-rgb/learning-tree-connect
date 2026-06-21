import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== "admin" && role !== "super_admin" && role !== "principal") {
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحية الإدارة مطلوبة" });
  }
  return next({ ctx });
});

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== "admin" && role !== "super_admin" && role !== "principal" && role !== "teacher") {
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحية الموظفين مطلوبة" });
  }
  return next({ ctx });
});

export const calendarRouter = router({
  // List events with filters (admin/staff see all, parents see published only)
  list: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12).optional(),
      year: z.number().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const role = ctx.user?.role;
      const isStaff = role === "admin" || role === "super_admin" || role === "principal" || role === "teacher";
      
      const filters: any = {};
      if (input?.month) filters.month = input.month;
      if (input?.year) filters.year = input.year;
      
      // Parents only see published events
      if (!isStaff) {
        filters.status = "published";
        filters.audience = "parents";
      } else if (input?.status) {
        filters.status = input.status;
      }
      
      const events = await db.getCalendarEvents(filters);
      
      // Filter by category in-memory if needed
      if (input?.category) {
        return events.filter((e: any) => e.category === input.category);
      }
      
      return events;
    }),

  // Get single event
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const event = await db.getCalendarEvent(input.id);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      
      // Parents can only see published events
      const role = ctx.user?.role;
      const isStaff = role === "admin" || role === "super_admin" || role === "principal" || role === "teacher";
      if (!isStaff && event.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      }
      
      return event;
    }),

  // Create event (admin only)
  create: adminProcedure
    .input(z.object({
      titleAr: z.string().min(1, "العنوان بالعربية مطلوب"),
      titleEn: z.string().optional(),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ غير صحيحة"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      category: z.enum(["holiday", "event", "meeting", "exam", "activity", "celebration", "other"]),
      description: z.string().optional(),
      audience: z.enum(["all", "parents", "staff", "admin"]).default("all"),
      status: z.enum(["draft", "published"]).default("draft"),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.createCalendarEvent({
        ...input,
        titleEn: input.titleEn || null,
        endDate: input.endDate || null,
        description: input.description || null,
        createdBy: ctx.user!.id,
      });
      return result;
    }),

  // Update event (admin only)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      titleAr: z.string().min(1).optional(),
      titleEn: z.string().optional(),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      category: z.enum(["holiday", "event", "meeting", "exam", "activity", "celebration", "other"]).optional(),
      description: z.string().nullable().optional(),
      audience: z.enum(["all", "parents", "staff", "admin"]).optional(),
      status: z.enum(["draft", "published"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await db.getCalendarEvent(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      
      const result = await db.updateCalendarEvent(id, data);
      return result;
    }),

  // Delete event (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await db.getCalendarEvent(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      
      await db.deleteCalendarEvent(input.id);
      return { success: true };
    }),

  // Publish/Unpublish event (admin only)
  publish: adminProcedure
    .input(z.object({
      id: z.number(),
      published: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.getCalendarEvent(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      
      const status = input.published ? "published" : "draft";
      await db.updateCalendarEvent(input.id, { status });
      return { success: true, status };
    }),
});
