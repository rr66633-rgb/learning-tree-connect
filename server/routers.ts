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

// Haversine formula for GPS distance calculation
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    stats: protectedProcedure.query(async ({ ctx }) => {
      // Parents see only their children's stats
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return {
          totalChildren: childIds.length,
          totalStaff: 0,
          presentToday: 0,
          totalRevenue: 0,
        };
      }
      return db.getDashboardStats();
    }),
  }),

  children: router({
    list: protectedProcedure.input(z.object({ parentId: z.number().optional(), classId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // Parents can only see their own children
      if (ctx.user?.role === 'parent') {
        return db.getChildren(ctx.user.id);
      }
      // If classId filter is provided, return children for that class
      if (input?.classId) {
        return db.getChildrenByClass(input.classId);
      }
      // Teachers see children from their assigned class, fallback to all if no class assigned
      if (ctx.user?.role === 'teacher' || ctx.user?.role === 'assistant') {
        const teacherClass = await db.getClassForTeacher(ctx.user!.id);
        if (teacherClass) {
          return db.getChildrenByClass(teacherClass.id);
        }
      }
      // Admin or teacher without class: return all children
      return db.getChildren(input?.parentId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only view their own children's details
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.id)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
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
    update: teacherProcedure.input(z.object({
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
    byDate: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input, ctx }) => {
      // Parents can only see attendance for their own children
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getAttendanceByDateForChildren(input.date, childIds);
      }
      return db.getAttendanceByDate(input.date);
    }),
    byChild: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      // Parents can only see their own children's attendance
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getAttendanceByChild(input.childId);
    }),
    checkIn: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      droppedOffBy: z.string().optional(),
      droppedOffRelationship: z.enum(["mother", "father", "driver", "grandparent", "other"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const result = await db.createAttendance({
        childId: input.childId,
        date: new Date(input.date),
        status: "present",
        checkInTime: new Date(),
        checkedInBy: ctx.user!.id,
        droppedOffBy: input.droppedOffBy,
        droppedOffRelationship: input.droppedOffRelationship,
        notes: input.notes,
      });
      // Notify parent about child arrival
      const child = await db.getChildById(input.childId);
      if (child?.parentId) {
        await db.createNotification({
          userId: child.parentId,
          title: 'Child Arrival',
          titleAr: '\u0648\u0635\u0648\u0644 \u0627\u0644\u0637\u0641\u0644',
          body: `${child.firstName} has arrived at the center`,
          bodyAr: `\u0648\u0635\u0644 ${child.firstName} ${child.lastName} \u0625\u0644\u0649 \u0627\u0644\u0645\u0631\u0643\u0632`,
          type: 'attendance',
          metadata: { childId: input.childId, time: new Date().toISOString(), type: 'checkin' },
        });
      }
      return result;
    }),
    checkOut: teacherProcedure.input(z.object({
      id: z.number(),
      childId: z.number(),
      pickedUpBy: z.string().min(1),
      relationship: z.enum(["mother", "father", "driver", "grandparent", "guardian", "other"]),
      signatureData: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.updateAttendance(input.id, { checkOutTime: new Date(), checkedOutBy: ctx.user!.id });
      // Create departure record
      await db.createDeparture({
        childId: input.childId,
        attendanceId: input.id,
        departureTime: new Date(),
        pickedUpBy: input.pickedUpBy,
        relationship: input.relationship,
        signatureData: input.signatureData,
        notes: input.notes,
        recordedBy: ctx.user!.id,
      });
      // Notify parent about child departure
      const child = await db.getChildById(input.childId);
      if (child?.parentId) {
        await db.createNotification({
          userId: child.parentId,
          title: 'Child Departure',
          titleAr: '\u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u0637\u0641\u0644',
          body: `${child.firstName} has left the center`,
          bodyAr: `\u063a\u0627\u062f\u0631 ${child.firstName} ${child.lastName} \u0627\u0644\u0645\u0631\u0643\u0632`,
          type: 'attendance',
          metadata: { childId: input.childId, time: new Date().toISOString(), type: 'checkout', pickedUpBy: input.pickedUpBy },
        });
      }
      return { success: true };
    }),
    markAbsent: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      status: z.enum(["absent", "excused"]),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createAttendance({ childId: input.childId, date: new Date(input.date), status: input.status, notes: input.notes });
    }),
  }),

  dailyReports: router({
    list: protectedProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // Parents can only see reports for their own children
      if (ctx.user?.role === 'parent') {
        if (input?.childId) {
          const childIds = await db.getChildIdsForParent(ctx.user.id);
          if (!childIds.includes(input.childId)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
          return db.getDailyReports(input.childId);
        }
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getDailyReportsForChildren(childIds);
      }
      return db.getDailyReports(input?.childId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const report = await db.getDailyReportById(input.id);
      // Parents can only view reports for their own children
      if (ctx.user?.role === 'parent' && report) {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(report.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return report;
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      date: z.string(),
      meals: z.any().optional(),
      sleep: z.any().optional(),
      toileting: z.any().optional(),
      activities: z.string().optional(),
      mood: z.enum(["happy", "calm", "tired", "upset", "excited"]).optional(),
      teacherNotes: z.string().optional(),
      photos: z.array(z.string()).optional(),
      isPublished: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDailyReport({ ...input, date: new Date(input.date), teacherId: ctx.user!.id });
    }),
    update: teacherProcedure.input(z.object({
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
      // Admin sees all conversations, others see only their own
      if (ctx.user?.role === 'admin') {
        return db.getAllConversations();
      }
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
    invoices: protectedProcedure.input(z.object({ parentId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      // Parents can only see their own invoices
      if (ctx.user?.role === 'parent') {
        return db.getInvoices(ctx.user.id);
      }
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
    markPaid: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateInvoiceStatus(input.id, "paid", new Date());
      return { success: true };
    }),
    summary: protectedProcedure.query(async ({ ctx }) => {
      // Only admin/teacher can see financial summary
      if (ctx.user?.role === 'parent') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }
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
      if (!reward) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reward not found' });
      const balance = await db.getLoyaltyBalance(ctx.user!.id);
      if (balance.points < reward.pointsCost) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient points' });
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

  classes: router({
    list: protectedProcedure.query(async () => {
      return db.getClasses();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getClassById(input.id);
    }),
    children: protectedProcedure.input(z.object({ classId: z.number() })).query(async ({ input }) => {
      return db.getChildrenByClass(input.classId);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      ageGroup: z.string().optional(),
      capacity: z.number().optional(),
      teacherId: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createClass(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      ageGroup: z.string().optional(),
      capacity: z.number().optional(),
      teacherId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateClass(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteClass(input.id);
    }),
  }),

  staffAttendance: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      return db.getTodayStaffAttendance(ctx.user!.id);
    }),
    byDate: adminProcedure.input(z.object({ date: z.string() })).query(async ({ input }) => {
      return db.getStaffAttendanceByDate(input.date);
    }),
    myHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getStaffAttendanceByUser(ctx.user!.id);
    }),
    checkIn: protectedProcedure.input(z.object({
      gpsLat: z.number(),
      gpsLng: z.number(),
      device: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Verify GPS is within center radius
      const settings = await db.getCenterSettings();
      if (settings && settings.latitude && settings.longitude && settings.allowedRadius) {
        const distance = getDistanceKm(input.gpsLat, input.gpsLng, Number(settings.latitude), Number(settings.longitude));
        const radiusKm = Number(settings.allowedRadius) / 1000;
        if (distance > radiusKm) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'أنت خارج نطاق المركز. يرجى التواجد داخل المركز لتسجيل الحضور.' });
        }
      }
      return db.staffCheckIn({
        userId: ctx.user!.id,
        date: new Date(),
        checkInTime: new Date(),
        gpsLatIn: input.gpsLat.toString(),
        gpsLngIn: input.gpsLng.toString(),
        device: input.device,
        status: 'checked_in',
      });
    }),
    checkOut: protectedProcedure.input(z.object({
      id: z.number(),
      gpsLat: z.number(),
      gpsLng: z.number(),
    })).mutation(async ({ input }) => {
      await db.staffCheckOut(input.id, {
        checkOutTime: new Date(),
        gpsLatOut: input.gpsLat.toString(),
        gpsLngOut: input.gpsLng.toString(),
      });
      return { success: true };
    }),
  }),

  centerSettings: router({
    get: adminProcedure.query(async () => {
      return db.getCenterSettings();
    }),
    update: adminProcedure.input(z.object({
      name: z.string().optional(),
      nameAr: z.string().optional(),
      gpsLat: z.string().optional(),
      gpsLng: z.string().optional(),
      gpsRadius: z.number().optional(),
      workingHoursStart: z.string().optional(),
      workingHoursEnd: z.string().optional(),
      timezone: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.updateCenterSettings(input);
    }),
  }),

  dailyActivities: router({
    byChild: protectedProcedure.input(z.object({ childId: z.number(), date: z.string().optional() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getDailyActivities(input.childId, input.date);
    }),
    byClass: teacherProcedure.input(z.object({ classId: z.number(), date: z.string() })).query(async ({ input }) => {
      return db.getDailyActivitiesByClass(input.classId, input.date);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      classId: z.number().optional(),
      type: z.enum(['arrival', 'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'nap_start', 'nap_end', 'diaper', 'toilet', 'medication', 'mood', 'learning_activity', 'outdoor_play', 'departure', 'meal', 'snack', 'water', 'indoor_play', 'temperature', 'photo', 'note', 'observation']),
      title: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      metadata: z.any().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDailyActivity({ ...input, recordedBy: ctx.user!.id, recordedAt: new Date() });
    }),
  }),

  departures: router({
    byDate: protectedProcedure.input(z.object({ date: z.string() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        return db.getDeparturesByDateForChildren(input.date, childIds);
      }
      return db.getDeparturesByDate(input.date);
    }),
    byChild: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getDeparturesByChild(input.childId);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      attendanceId: z.number().optional(),
      departureTime: z.string(),
      pickedUpBy: z.string().min(1),
      relationship: z.enum(['parent', 'driver', 'guardian', 'other']),
      pickedUpById: z.number().optional(),
      notes: z.string().optional(),
      status: z.enum(['completed', 'pending', 'late']).optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDeparture({
        ...input,
        departureTime: new Date(input.departureTime),
        recordedBy: ctx.user!.id,
      });
    }),
  }),

  calendar: router({
    events: protectedProcedure.input(z.object({ classId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getCalendarEvents(input?.classId);
    }),
    create: adminProcedure.input(z.object({
      title: z.string().min(1),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      type: z.enum(['holiday', 'event', 'meeting', 'deadline', 'other']),
      classId: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createCalendarEvent({
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      });
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteCalendarEvent(input.id);
    }),
  }),

  announcements: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role === 'parent') {
        return db.getAnnouncements('parents');
      }
      if (ctx.user?.role === 'teacher') {
        return db.getAnnouncements('staff');
      }
      return db.getAnnouncements();
    }),
    create: adminProcedure.input(z.object({
      title: z.string().min(1),
      titleAr: z.string().optional(),
      content: z.string().min(1),
      contentAr: z.string().optional(),
      audience: z.enum(['all', 'parents', 'staff']),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createAnnouncement({ ...input, createdBy: ctx.user!.id });
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteAnnouncement(input.id);
    }),
  }),

  documents: router({
    list: protectedProcedure.input(z.object({ childId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (input?.childId && !childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        return db.getDocuments('parents', input?.childId);
      }
      return db.getDocuments(undefined, input?.childId);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      type: z.enum(['policy', 'form', 'report', 'certificate', 'other']),
      url: z.string(),
      childId: z.number().optional(),
      audience: z.enum(['all', 'parents', 'staff']).optional(),
      requiresSignature: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDocument({ ...input, uploadedBy: ctx.user!.id });
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteDocument(input.id);
    }),
    sign: protectedProcedure.input(z.object({ documentId: z.number() })).mutation(async ({ input, ctx }) => {
      return db.createSignature({ documentId: input.documentId, parentId: ctx.user!.id, signedAt: new Date() });
    }),
    signatures: protectedProcedure.input(z.object({ documentId: z.number() })).query(async ({ input }) => {
      return db.getSignaturesForDocument(input.documentId);
    }),
  }),

  medicalInfo: router({
    get: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getMedicalInfo(input.childId);
    }),
    upsert: teacherProcedure.input(z.object({
      childId: z.number(),
      bloodType: z.string().optional(),
      conditions: z.string().optional(),
      medications: z.string().optional(),
      allergies: z.string().optional(),
      doctorName: z.string().optional(),
      doctorPhone: z.string().optional(),
      insuranceProvider: z.string().optional(),
      insuranceNumber: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { childId, ...data } = input;
      return db.upsertMedicalInfo(childId, data);
    }),
  }),

  emergencyContacts: router({
    list: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getEmergencyContacts(input.childId);
    }),
    create: protectedProcedure.input(z.object({
      childId: z.number(),
      name: z.string().min(1),
      phone: z.string().min(1),
      relationship: z.string().min(1),
      isAuthorizedPickup: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.createEmergencyContact(input);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteEmergencyContact(input.id);
    }),
  }),

  enrollment: router({
    list: adminProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getEnrollments(input?.status);
    }),
    create: adminProcedure.input(z.object({
      childId: z.number(),
      classId: z.number().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      status: z.enum(['active', 'pending', 'withdrawn', 'graduated']).optional(),
    })).mutation(async ({ input }) => {
      return db.createEnrollment({
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['active', 'pending', 'withdrawn', 'graduated']).optional(),
      classId: z.number().optional(),
      endDate: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      await db.updateEnrollment(id, updateData);
      return { success: true };
    }),
  }),

  waitingList: router({
    list: adminProcedure.query(async () => {
      return db.getWaitingList();
    }),
    create: adminProcedure.input(z.object({
      childName: z.string().min(1),
      parentName: z.string().min(1),
      parentPhone: z.string().min(1),
      parentEmail: z.string().optional(),
      dateOfBirth: z.string().optional(),
      preferredClass: z.string().optional(),
      notes: z.string().optional(),
      priority: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.createWaitingListEntry({
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['waiting', 'contacted', 'enrolled', 'declined']).optional(),
      notes: z.string().optional(),
      priority: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateWaitingListEntry(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteWaitingListEntry(input.id);
    }),
  }),

  eyfs: router({
    assessments: protectedProcedure.input(z.object({ childId: z.number() })).query(async ({ input, ctx }) => {
      if (ctx.user?.role === 'parent') {
        const childIds = await db.getChildIdsForParent(ctx.user.id);
        if (!childIds.includes(input.childId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }
      return db.getEyfsAssessments(input.childId);
    }),
    create: teacherProcedure.input(z.object({
      childId: z.number(),
      area: z.string(),
      subArea: z.string().optional(),
      level: z.enum(['emerging', 'developing', 'secure', 'exceeding']),
      notes: z.string().optional(),
      evidence: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createEyfsAssessment({ ...input, assessedBy: ctx.user!.id, assessedAt: new Date() });
    }),
  }),

  auditLog: router({
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getAuditLogs(input?.limit);
    }),
  }),

  users: router({
    list: adminProcedure.input(z.object({ role: z.string().optional(), search: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getUsersByRole(input?.role, input?.search);
    }),
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getUserById(input.id);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      role: z.enum(['teacher', 'parent']),
    })).mutation(async ({ input }) => {
      // Generate a unique openId for manually created users
      const openId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      return db.createUser({ ...input, openId });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(['teacher', 'parent']).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateUser(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteUser(input.id);
    }),
    linkChild: adminProcedure.input(z.object({ parentId: z.number(), childId: z.number() })).mutation(async ({ input }) => {
      return db.linkParentToChild(input.parentId, input.childId);
    }),
    unlinkChild: adminProcedure.input(z.object({ childId: z.number() })).mutation(async ({ input }) => {
      return db.unlinkParentFromChild(input.childId);
    }),
    getChildren: adminProcedure.input(z.object({ parentId: z.number() })).query(async ({ input }) => {
      return db.getChildrenForParent(input.parentId);
    }),
    getUnlinkedChildren: adminProcedure.query(async () => {
      return db.getUnlinkedChildren();
    }),
  }),
});

export type AppRouter = typeof appRouter;
