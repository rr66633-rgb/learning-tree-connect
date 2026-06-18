import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  return next({ ctx });
});

const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'teacher') throw new TRPCError({ code: 'FORBIDDEN', message: 'Teacher access required' });
  return next({ ctx });
});

const parentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
  }),

  children: router({
    list: protectedProcedure.input(z.object({ parentId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getChildren(input?.parentId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getChildById(input.id);
    }),
    create: teacherProcedure.input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      dateOfBirth: z.string(),
      gender: z.enum(["male", "female"]),
      className: z.string().optional(),
      parentId: z.number().optional(),
      medicalNotes: z.string().optional(),
      allergies: z.string().optional(),
      emergencyContact: z.string().optional(),
      emergencyPhone: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createChild({ ...input, dateOfBirth: new Date(input.dateOfBirth) });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(["male", "female"]).optional(),
      className: z.string().optional(),
      medicalNotes: z.string().optional(),
      allergies: z.string().optional(),
      emergencyContact: z.string().optional(),
      emergencyPhone: z.string().optional(),
      status: z.enum(["active", "inactive", "graduated"]).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
      return db.updateChild(id, updateData);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteChild(input.id);
      return { success: true };
    }),
  }),

  attendance: router({
    byDate: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input }) => {
      return db.getAttendanceByDate(input.date);
    }),
    byChild: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input }) => {
      return db.getAttendanceByChild(input.childId);
    }),
    checkIn: protectedProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createAttendance({
        childId: input.childId,
        date: new Date(input.date),
        status: "present",
        checkInTime: new Date(),
        checkedInBy: ctx.user!.id,
        notes: input.notes,
      });
    }),
    checkOut: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.updateAttendance(input.id, { checkOutTime: new Date(), checkedOutBy: ctx.user!.id });
      return { success: true };
    }),
    markAbsent: protectedProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      status: z.enum(["absent", "excused"]),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createAttendance({ childId: input.childId, date: new Date(input.date), status: input.status, notes: input.notes });
    }),
  }),

  dailyReports: router({
    list: protectedProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getDailyReports(input?.childId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getDailyReportById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      meals: z.any().optional(),
      sleep: z.any().optional(),
      toileting: z.any().optional(),
      activities: z.string().optional(),
      mood: z.enum(["happy", "calm", "tired", "upset", "excited"]).optional(),
      teacherNotes: z.string().optional(),
      isPublished: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDailyReport({ ...input, date: new Date(input.date), teacherId: ctx.user!.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      meals: z.any().optional(),
      sleep: z.any().optional(),
      toileting: z.any().optional(),
      activities: z.string().optional(),
      mood: z.enum(["happy", "calm", "tired", "upset", "excited"]).optional(),
      teacherNotes: z.string().optional(),
      isPublished: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDailyReport(id, data);
      return { success: true };
    }),
  }),

  messages: router({
    conversations: protectedProcedure.query(async ({ ctx }) => {
      return db.getConversations(ctx.user!.id);
    }),
    list: protectedProcedure.input(z.object({ conversationId: z.number() })).query(async ({ input }) => {
      return db.getMessages(input.conversationId);
    }),
    send: protectedProcedure.input(z.object({
      conversationId: z.number(),
      content: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      return db.createMessage({ conversationId: input.conversationId, senderId: ctx.user!.id, content: input.content });
    }),
    createConversation: protectedProcedure.input(z.object({ participantId: z.number() })).mutation(async ({ input, ctx }) => {
      return db.createConversation(ctx.user!.id, input.participantId);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadMessageCount(ctx.user!.id);
    }),
  }),

  finance: router({
    invoices: protectedProcedure.input(z.object({ parentId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getInvoices(input?.parentId);
    }),
    createInvoice: adminProcedure.input(z.object({
      childId: z.number(),
      parentId: z.number(),
      description: z.string(),
      subtotal: z.string(),
      dueDate: z.string(),
    })).mutation(async ({ input }) => {
      const subtotal = parseFloat(input.subtotal);
      const vatAmount = subtotal * 0.15;
      const total = subtotal + vatAmount;
      return db.createInvoice({
        ...input,
        invoiceNumber: `INV-${Date.now()}`,
        vatRate: "15.00",
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        dueDate: new Date(input.dueDate),
      });
    }),
    markPaid: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateInvoiceStatus(input.id, "paid", new Date());
      return { success: true };
    }),
    summary: protectedProcedure.query(async () => {
      return db.getFinanceSummary();
    }),
  }),

  loyalty: router({
    balance: protectedProcedure.query(async ({ ctx }) => {
      return db.getLoyaltyBalance(ctx.user!.id);
    }),
    transactions: protectedProcedure.query(async ({ ctx }) => {
      return db.getLoyaltyTransactions(ctx.user!.id);
    }),
    rewards: protectedProcedure.query(async () => {
      return db.getLoyaltyRewards();
    }),
    addPoints: adminProcedure.input(z.object({
      userId: z.number(),
      points: z.number(),
      description: z.string(),
    })).mutation(async ({ input }) => {
      await db.addLoyaltyPoints(input.userId, input.points, "earned", input.description);
      return { success: true };
    }),
    redeem: protectedProcedure.input(z.object({ rewardId: z.number() })).mutation(async ({ ctx, input }) => {
      const rewards = await db.getLoyaltyRewards();
      const reward = rewards.find(r => r.id === input.rewardId);
      if (!reward) throw new Error("Reward not found");
      const balance = await db.getLoyaltyBalance(ctx.user!.id);
      if (balance.points < reward.pointsCost) throw new Error("Insufficient points");
      await db.addLoyaltyPoints(ctx.user!.id, -reward.pointsCost, "redeemed", `Redeemed: ${reward.name}`);
      return { success: true };
    }),
    createReward: adminProcedure.input(z.object({
      name: z.string(),
      nameAr: z.string(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      pointsCost: z.number(),
    })).mutation(async ({ input }) => {
      return db.createLoyaltyReward(input);
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotifications(ctx.user!.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user!.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user!.id);
      return { success: true };
    }),
  }),

  users: router({
    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
  }),
});

export type AppRouter = typeof appRouter;
