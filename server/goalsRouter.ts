import { z } from "zod";
import { tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { performanceGoals, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";

export const goalsRouter = router({
  // List goals for a user (or all for admin)
  list: tenantProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      let conditions = [eq(performanceGoals.organizationId, orgId)];
      if (input.userId) {
        conditions.push(eq(performanceGoals.userId, input.userId));
      }
      const goals = await db
        .select()
        .from(performanceGoals)
        .where(and(...conditions))
        .orderBy(desc(performanceGoals.createdAt));
      return goals;
    }),

  // Create a new goal
  create: tenantProcedure
    .input(z.object({
      userId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(["professional", "personal", "training", "project"]).default("professional"),
      targetDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      // SECURITY FIX: input.userId was previously trusted with no check that
      // the target user belongs to the caller's organization -- a goal could
      // be assigned to a user from a different organization.
      const [targetUser] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser || targetUser.organizationId !== orgId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }
      await db.insert(performanceGoals).values({
        userId: input.userId,
        organizationId: orgId,
        title: input.title,
        description: input.description || null,
        category: input.category,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        progress: 0,
        status: "active",
        assignedBy: ctx.user.id,
        notes: input.notes || null,
      });
      return { success: true };
    }),

  // Update goal progress
  updateProgress: tenantProcedure
    .input(z.object({
      id: z.number(),
      progress: z.number().min(0).max(100),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      const updateData: any = { progress: input.progress };
      if (input.notes) updateData.notes = input.notes;
      if (input.progress >= 100) updateData.status = "completed";
      await db
        .update(performanceGoals)
        .set(updateData)
        .where(and(
          eq(performanceGoals.id, input.id),
          eq(performanceGoals.organizationId, orgId)
        ));
      return { success: true };
    }),

  // Update goal status
  updateStatus: tenantProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "completed", "cancelled", "overdue"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      const updateData: any = { status: input.status };
      if (input.status === "completed") updateData.progress = 100;
      await db
        .update(performanceGoals)
        .set(updateData)
        .where(and(
          eq(performanceGoals.id, input.id),
          eq(performanceGoals.organizationId, orgId)
        ));
      return { success: true };
    }),

  // Delete a goal
  delete: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      await db
        .delete(performanceGoals)
        .where(and(
          eq(performanceGoals.id, input.id),
          eq(performanceGoals.organizationId, orgId)
        ));
      return { success: true };
    }),

  // Get summary stats for goals
  summary: tenantProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      let conditions = [eq(performanceGoals.organizationId, orgId)];
      if (input.userId) {
        conditions.push(eq(performanceGoals.userId, input.userId));
      }
      const goals = await db
        .select()
        .from(performanceGoals)
        .where(and(...conditions));

      const active = goals.filter((g: any) => g.status === "active").length;
      const completed = goals.filter((g: any) => g.status === "completed").length;
      const overdue = goals.filter((g: any) => g.status === "overdue").length;
      const avgProgress = goals.length > 0
        ? Math.round(goals.reduce((s: number, g: any) => s + g.progress, 0) / goals.length)
        : 0;

      return { total: goals.length, active, completed, overdue, avgProgress };
    }),
});
