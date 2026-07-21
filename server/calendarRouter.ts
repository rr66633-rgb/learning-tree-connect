import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { sendPushToUser, sendPushToUsers, PushPayload } from "./_core/webPush";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== "admin" && role !== "super_admin" && role !== "principal" && role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحية الإدارة مطلوبة" });
  }
  return next({ ctx });
});

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== "admin" && role !== "super_admin" && role !== "principal" && role !== "owner" && role !== "teacher") {
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحية الموظفين مطلوبة" });
  }
  return next({ ctx });
});

// Helper: generate Arabic reminder message
function generateReminderMessage(eventTitle: string, daysBefore: number, eventTime?: string | null): string {
  if (daysBefore === 0) {
    const timeStr = eventTime ? ` الساعة ${eventTime}` : "";
    return `${eventTitle} اليوم${timeStr}`;
  } else if (daysBefore === 1) {
    return `${eventTitle} غداً`;
  } else {
    return `${eventTitle} بعد ${daysBefore} أيام`;
  }
}

// Helper: calculate scheduled date for a reminder
function calculateScheduledDate(eventDate: string, daysBefore: number): Date {
  const date = new Date(eventDate + "T06:00:00Z"); // Send at 6 AM UTC (9 AM Saudi)
  date.setDate(date.getDate() - daysBefore);
  return date;
}

// Helper: auto-schedule reminders for an event (7, 3, 1, 0 days before)
async function autoScheduleReminders(eventId: number, eventDate: string, eventTitle: string, eventTime: string | null, createdBy: number) {
  const reminderDays = [7, 3, 1, 0];
  const now = new Date();

  for (const daysBefore of reminderDays) {
    const scheduledAt = calculateScheduledDate(eventDate, daysBefore);
    
    // Only schedule future reminders
    if (scheduledAt > now) {
      // Parent reminder
      const parentMessage = generateReminderMessage(eventTitle, daysBefore, eventTime);
      await db.createEventReminder({
        eventId,
        reminderType: "parent_upcoming",
        daysBefore,
        scheduledAt,
        status: "pending",
        audience: "parents",
        message: parentMessage,
        createdBy,
      });

      // Teacher preparation reminder (only for 7 and 3 days before)
      if (daysBefore >= 3) {
        const teacherType = daysBefore === 7 ? "teacher_preparation" : "teacher_materials";
        const teacherMessage = daysBefore === 7
          ? `تذكير: ${eventTitle} بعد أسبوع - يرجى البدء بالتحضير`
          : `تذكير: ${eventTitle} بعد 3 أيام - يرجى تجهيز المواد`;
        await db.createEventReminder({
          eventId,
          reminderType: teacherType,
          daysBefore,
          scheduledAt,
          status: "pending",
          audience: "staff",
          message: teacherMessage,
          createdBy,
        });
      }

      // Teacher setup reminder (1 day before)
      if (daysBefore === 1) {
        await db.createEventReminder({
          eventId,
          reminderType: "teacher_setup",
          daysBefore: 1,
          scheduledAt,
          status: "pending",
          audience: "staff",
          message: `تذكير: ${eventTitle} غداً - يرجى إعداد المكان والمواد`,
          createdBy,
        });
      }
    }
  }
}

// Helper: send notification to users by audience
async function sendEventNotification(audience: string, message: string, eventId: number, silent: boolean = true) {
  const payload: PushPayload = {
    title: "تذكير حدث 📅",
    body: message,
    tag: `event-reminder-${eventId}-${Date.now()}`,
    silent,
    data: {
      url: audience === "staff" ? "/staff/calendar" : "/parent/calendar",
      eventId,
      type: "event_reminder",
    },
  };

  let targetUserIds: number[] = [];

  if (audience === "parents" || audience === "all") {
    const parents = await db.getUsersByRoles(["parent"]);
    targetUserIds.push(...parents.map((u: any) => u.id));
  }
  if (audience === "staff" || audience === "all") {
    const staff = await db.getUsersByRoles(["admin", "super_admin", "principal", "teacher"]);
    targetUserIds.push(...staff.map((u: any) => u.id));
  }

  // Deduplicate
  targetUserIds = Array.from(new Set(targetUserIds));

  if (targetUserIds.length === 0) return { sent: 0 };

  // Send push notifications (silent)
  const result = await sendPushToUsers(targetUserIds, payload, db.getPushSubscriptionsForUser);
  if (result.expiredIds.length > 0) {
    await db.removeExpiredSubscriptions(result.expiredIds);
  }

  // Create in-app notifications for each user
  for (const userId of targetUserIds) {
    await db.createNotification({
      userId,
      title: "تذكير حدث",
      titleAr: "تذكير حدث",
      body: message,
      bodyAr: message,
      type: "general",
      metadata: { eventId, type: "event_reminder" },
    });
  }

  return { sent: targetUserIds.length };
}

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
      const isStaff = role === "admin" || role === "super_admin" || role === "principal" || role === "owner" || role === "teacher";
      
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

  // Get single event with full details
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const event = await db.getCalendarEvent(input.id);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      
      // Parents can only see published events
      const role = ctx.user?.role;
      const isStaff = role === "admin" || role === "super_admin" || role === "principal" || role === "owner" || role === "teacher";
      if (!isStaff && event.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      }
      
      return event;
    }),

  // Create event with enhanced fields (admin only)
  create: adminProcedure
    .input(z.object({
      titleAr: z.string().min(1, "العنوان بالعربية مطلوب"),
      titleEn: z.string().optional(),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ غير صحيحة"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      eventTime: z.string().optional(), // HH:MM
      location: z.string().optional(),
      requiredMaterials: z.string().optional(),
      dressCode: z.string().optional(),
      category: z.enum(["holiday", "event", "meeting", "exam", "activity", "celebration", "other"]),
      description: z.string().optional(),
      audience: z.enum(["all", "parents", "staff", "admin"]).default("all"),
      status: z.enum(["draft", "published"]).default("draft"),
      autoReminders: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { autoReminders, ...eventData } = input;
      const result = await db.createCalendarEvent({
        ...eventData,
        titleEn: eventData.titleEn || null,
        endDate: eventData.endDate || null,
        eventTime: eventData.eventTime || null,
        location: eventData.location || null,
        requiredMaterials: eventData.requiredMaterials || null,
        dressCode: eventData.dressCode || null,
        description: eventData.description || null,
        createdBy: ctx.user!.id,
      });

      // Auto-schedule reminders if event is published and autoReminders is true
      if (autoReminders && input.status === "published") {
        await autoScheduleReminders(
          result.id,
          input.eventDate,
          input.titleAr,
          input.eventTime || null,
          ctx.user!.id
        );
      }

      return result;
    }),

  // Update event with enhanced fields (admin only)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      titleAr: z.string().min(1).optional(),
      titleEn: z.string().nullable().optional(),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      eventTime: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      requiredMaterials: z.string().nullable().optional(),
      dressCode: z.string().nullable().optional(),
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

      // If date changed, reschedule reminders
      if (data.eventDate && data.eventDate !== existing.eventDate) {
        await db.cancelEventReminders(id);
        if ((data.status || existing.status) === "published") {
          await autoScheduleReminders(
            id,
            data.eventDate,
            data.titleAr || existing.titleAr,
            data.eventTime !== undefined ? data.eventTime : (existing as any).eventTime,
            ctx.user!.id
          );
        }

        // Send update notification to parents
        await sendEventNotification(
          "parents",
          `تم تغيير موعد ${existing.titleAr} إلى ${data.eventDate}`,
          id,
          true
        );
      }

      return result;
    }),

  // Delete event (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getCalendarEvent(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      
      // Cancel all pending reminders before deleting
      await db.cancelEventReminders(input.id);

      // Send cancellation notification if event was published
      if (existing.status === "published") {
        await sendEventNotification(
          "all",
          `تم إلغاء: ${existing.titleAr}`,
          input.id,
          true
        );
      }

      await db.deleteCalendarEvent(input.id);
      return { success: true };
    }),

  // Publish/Unpublish event (admin only)
  publish: adminProcedure
    .input(z.object({
      id: z.number(),
      published: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getCalendarEvent(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });
      
      const status = input.published ? "published" : "draft";
      await db.updateCalendarEvent(input.id, { status });

      // When publishing, auto-schedule reminders
      if (input.published) {
        await autoScheduleReminders(
          input.id,
          existing.eventDate,
          existing.titleAr,
          (existing as any).eventTime || null,
          ctx.user!.id
        );
      } else {
        // When unpublishing, cancel pending reminders
        await db.cancelEventReminders(input.id);
      }

      return { success: true, status };
    }),

  // ============ REMINDER MANAGEMENT ============

  // Send manual reminder (admin only)
  sendReminder: adminProcedure
    .input(z.object({
      eventId: z.number(),
      audience: z.enum(["all", "parents", "staff"]),
      message: z.string().min(1, "الرسالة مطلوبة"),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await db.getCalendarEvent(input.eventId);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });

      // Create a manual reminder record
      const reminder = await db.createEventReminder({
        eventId: input.eventId,
        reminderType: "manual",
        daysBefore: 0,
        scheduledAt: new Date(),
        sentAt: new Date(),
        status: "sent",
        audience: input.audience,
        message: input.message,
        createdBy: ctx.user!.id,
      });

      // Send the notification immediately
      const result = await sendEventNotification(input.audience, input.message, input.eventId, true);

      return { success: true, sentTo: result.sent, reminderId: reminder.id };
    }),

  // Schedule a custom reminder (admin only)
  scheduleReminder: adminProcedure
    .input(z.object({
      eventId: z.number(),
      audience: z.enum(["all", "parents", "staff"]),
      message: z.string().min(1),
      scheduledAt: z.string(), // ISO date string
      reminderType: z.enum(["parent_upcoming", "parent_update", "teacher_preparation", "teacher_materials", "teacher_setup", "manual"]).default("manual"),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await db.getCalendarEvent(input.eventId);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "الحدث غير موجود" });

      const scheduledDate = new Date(input.scheduledAt);
      if (scheduledDate <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن جدولة تذكير في الماضي" });
      }

      const reminder = await db.createEventReminder({
        eventId: input.eventId,
        reminderType: input.reminderType,
        daysBefore: Math.ceil((new Date(event.eventDate).getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24)),
        scheduledAt: scheduledDate,
        status: "pending",
        audience: input.audience,
        message: input.message,
        createdBy: ctx.user!.id,
      });

      return { success: true, reminder };
    }),

  // Cancel pending reminders for an event (admin only)
  cancelReminders: adminProcedure
    .input(z.object({
      eventId: z.number(),
      reminderId: z.number().optional(), // Cancel specific or all
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.reminderId) {
        await db.cancelSingleReminder(input.reminderId);
      } else {
        await db.cancelEventReminders(input.eventId);
      }
      return { success: true };
    }),

  // Get reminder history for an event (admin only)
  reminderHistory: adminProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const reminders = await db.getEventReminders(input.eventId);
      return reminders;
    }),

  // Process pending reminders (called by heartbeat job)
  processPendingReminders: publicProcedure
    .input(z.object({ secret: z.string() }).optional())
    .mutation(async () => {
      const pendingReminders = await db.getPendingReminders();
      let processed = 0;

      for (const reminder of pendingReminders) {
        try {
          // Get the event to check if it's still published
          const event = await db.getCalendarEvent(reminder.eventId);
          if (!event || event.status !== "published") {
            await db.cancelSingleReminder(reminder.id);
            continue;
          }

          // Send the notification
          const message = reminder.message || generateReminderMessage(event.titleAr, reminder.daysBefore, (event as any).eventTime);
          await sendEventNotification(reminder.audience, message, reminder.eventId, true);
          await db.markReminderSent(reminder.id);
          processed++;
        } catch (error) {
          console.error(`[EventReminder] Failed to process reminder ${reminder.id}:`, error);
        }
      }

      return { processed, total: pendingReminders.length };
    }),
});
