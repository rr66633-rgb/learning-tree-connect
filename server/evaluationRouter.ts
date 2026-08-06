import { z } from "zod";
import { tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { evaluationCriteria, evaluations, evaluationScores, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const evaluationRouter = router({
  // ============ CRITERIA MANAGEMENT ============
  listCriteria: tenantProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId;
    const db = (await getDb())!;
    const criteria = await db
      .select()
      .from(evaluationCriteria)
      .where(and(eq(evaluationCriteria.organizationId, orgId), eq(evaluationCriteria.isActive, true)))
      .orderBy(evaluationCriteria.category, evaluationCriteria.name);
    return criteria;
  }),

  upsertCriterion: tenantProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      maxScore: z.number().min(1).max(10).default(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      if (input.id) {
        // SECURITY FIX: previously updated by id alone -- any user could edit
        // another organization's evaluation criterion.
        const [existing] = await db.select({ organizationId: evaluationCriteria.organizationId }).from(evaluationCriteria).where(eq(evaluationCriteria.id, input.id)).limit(1);
        if (!existing || existing.organizationId !== orgId) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        await db.update(evaluationCriteria)
          .set({
            name: input.name,
            nameAr: input.nameAr || null,
            description: input.description || null,
            category: input.category || null,
            maxScore: input.maxScore,
          })
          .where(eq(evaluationCriteria.id, input.id));
        return { id: input.id };
      } else {
        const [result] = await db.insert(evaluationCriteria).values({
          organizationId: orgId,
          name: input.name,
          nameAr: input.nameAr || null,
          description: input.description || null,
          category: input.category || null,
          maxScore: input.maxScore,
        });
        return { id: result.insertId };
      }
    }),

  deleteCriterion: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously updated by id alone -- any user could
      // deactivate another organization's evaluation criterion.
      const [existing] = await db.select({ organizationId: evaluationCriteria.organizationId }).from(evaluationCriteria).where(eq(evaluationCriteria.id, input.id)).limit(1);
      if (!existing || existing.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      await db.update(evaluationCriteria)
        .set({ isActive: false })
        .where(eq(evaluationCriteria.id, input.id));
      return { success: true };
    }),

  // ============ EVALUATIONS ============
  listEvaluations: tenantProcedure
    .input(z.object({ userId: z.number().optional(), period: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      let conditions: any[] = [eq(evaluations.organizationId, orgId)];
      if (input.userId) conditions.push(eq(evaluations.userId, input.userId));
      if (input.period) conditions.push(eq(evaluations.period, input.period));

      const evals = await db
        .select({
          id: evaluations.id,
          userId: evaluations.userId,
          userName: users.name,
          evaluatorId: evaluations.evaluatorId,
          period: evaluations.period,
          overallScore: evaluations.overallScore,
          overallRating: evaluations.overallRating,
          strengths: evaluations.strengths,
          improvements: evaluations.improvements,
          goals: evaluations.goals,
          notes: evaluations.notes,
          status: evaluations.status,
          createdAt: evaluations.createdAt,
          updatedAt: evaluations.updatedAt,
        })
        .from(evaluations)
        .innerJoin(users, eq(users.id, evaluations.userId))
        .where(and(...conditions))
        .orderBy(desc(evaluations.createdAt));
      return evals;
    }),

  getEvaluation: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [evaluation] = await db
        .select({
          id: evaluations.id,
          userId: evaluations.userId,
          userName: users.name,
          evaluatorId: evaluations.evaluatorId,
          period: evaluations.period,
          overallScore: evaluations.overallScore,
          overallRating: evaluations.overallRating,
          strengths: evaluations.strengths,
          improvements: evaluations.improvements,
          goals: evaluations.goals,
          notes: evaluations.notes,
          status: evaluations.status,
          createdAt: evaluations.createdAt,
          updatedAt: evaluations.updatedAt,
          organizationId: evaluations.organizationId,
        })
        .from(evaluations)
        .innerJoin(users, eq(users.id, evaluations.userId))
        .where(eq(evaluations.id, input.id));

      // SECURITY FIX: previously had NO organization filter/check at all --
      // full cross-tenant read of any organization's evaluation (scores,
      // strengths, improvements, goals, notes) by id.
      if (!evaluation || evaluation.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'التقييم غير موجود' });
      }

      // Get scores
      const scores = await db
        .select({
          id: evaluationScores.id,
          criterionId: evaluationScores.criterionId,
          criterionName: evaluationCriteria.name,
          criterionNameAr: evaluationCriteria.nameAr,
          criterionCategory: evaluationCriteria.category,
          maxScore: evaluationCriteria.maxScore,
          score: evaluationScores.score,
          comment: evaluationScores.comment,
        })
        .from(evaluationScores)
        .innerJoin(evaluationCriteria, eq(evaluationCriteria.id, evaluationScores.criterionId))
        .where(eq(evaluationScores.evaluationId, input.id));

      return { ...evaluation, scores };
    }),

  createEvaluation: tenantProcedure
    .input(z.object({
      userId: z.number(),
      period: z.string().min(1),
      scores: z.array(z.object({
        criterionId: z.number(),
        score: z.number(),
        comment: z.string().optional(),
      })),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
      goals: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;

      // SECURITY FIX: input.userId was previously trusted with no check that
      // the target user belongs to the evaluator's own organization -- an
      // evaluator could create an evaluation record pointed at a user from a
      // different organization.
      const [targetUser] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser || targetUser.organizationId !== orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      }

      // Calculate overall score
      const criteria = await db
        .select()
        .from(evaluationCriteria)
        .where(and(eq(evaluationCriteria.organizationId, orgId), eq(evaluationCriteria.isActive, true)));

      let totalScore = 0;
      let totalMaxScore = 0;
      for (const s of input.scores) {
        const criterion = criteria.find((c: any) => c.id === s.criterionId);
        if (criterion) {
          totalScore += s.score;
          totalMaxScore += criterion.maxScore;
        }
      }
      const hasScores = input.scores.length > 0 && totalMaxScore > 0;
      const percentage = hasScores ? (totalScore / totalMaxScore) * 100 : null;
      let overallRating: "excellent" | "very_good" | "good" | "acceptable" | "poor" | null = null;
      if (percentage !== null) {
        if (percentage >= 90) overallRating = "excellent";
        else if (percentage >= 80) overallRating = "very_good";
        else if (percentage >= 70) overallRating = "good";
        else if (percentage >= 60) overallRating = "acceptable";
        else overallRating = "poor";
      }

      // Create evaluation
      const [evalResult] = await db.insert(evaluations).values({
        userId: input.userId,
        organizationId: orgId,
        evaluatorId: ctx.user.id,
        period: input.period,
        overallScore: percentage !== null ? String(percentage.toFixed(2)) : null,
        overallRating,
        strengths: input.strengths || null,
        improvements: input.improvements || null,
        goals: input.goals || null,
        notes: input.notes || null,
        status: "draft",
      });

      // Insert scores
      // SECURITY FIX: previously omitted organizationId entirely --
      // evaluationScores.organizationId is NOT NULL with no default, so
      // this would fail outright; now stamped with orgId (already used to
      // create the parent evaluation above).
      if (input.scores.length > 0) {
        await db.insert(evaluationScores).values(
          input.scores.map((s: any) => ({
            evaluationId: evalResult.insertId,
            criterionId: s.criterionId,
            score: s.score,
            comment: s.comment || null,
            organizationId: orgId,
          }))
        );
      }

      return { id: evalResult.insertId };
    }),

  updateEvaluation: tenantProcedure
    .input(z.object({
      id: z.number(),
      scores: z.array(z.object({
        criterionId: z.number(),
        score: z.number(),
        comment: z.string().optional(),
      })).optional(),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
      goals: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;

      // SECURITY FIX: previously updated by id alone -- any user could edit
      // another organization's evaluation.
      const [existingEval] = await db.select({ organizationId: evaluations.organizationId }).from(evaluations).where(eq(evaluations.id, input.id)).limit(1);
      if (!existingEval || existingEval.organizationId !== orgId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Update text fields
      await db.update(evaluations)
        .set({
          strengths: input.strengths ?? undefined,
          improvements: input.improvements ?? undefined,
          goals: input.goals ?? undefined,
          notes: input.notes ?? undefined,
        })
        .where(eq(evaluations.id, input.id));

      // Update scores if provided
      if (input.scores && input.scores.length > 0) {
        // Delete old scores
        await db.delete(evaluationScores).where(eq(evaluationScores.evaluationId, input.id));
        // Insert new scores
        // SECURITY FIX: previously omitted organizationId -- now stamped
        // with orgId (already verified above to match this evaluation).
        await db.insert(evaluationScores).values(
          input.scores.map((s: any) => ({
            evaluationId: input.id,
            criterionId: s.criterionId,
            score: s.score,
            comment: s.comment || null,
            organizationId: orgId,
          }))
        );

        // Recalculate overall
        const criteria = await db
          .select()
          .from(evaluationCriteria)
          .where(and(eq(evaluationCriteria.organizationId, orgId), eq(evaluationCriteria.isActive, true)));

        let totalScore = 0;
        let totalMaxScore = 0;
        for (const s of input.scores) {
          const criterion = criteria.find((c: any) => c.id === s.criterionId);
          if (criterion) {
            totalScore += s.score;
            totalMaxScore += criterion.maxScore;
          }
        }
        const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
        let overallRating: "excellent" | "very_good" | "good" | "acceptable" | "poor" = "poor";
        if (percentage >= 90) overallRating = "excellent";
        else if (percentage >= 80) overallRating = "very_good";
        else if (percentage >= 70) overallRating = "good";
        else if (percentage >= 60) overallRating = "acceptable";

        await db.update(evaluations)
          .set({ overallScore: String(percentage.toFixed(2)), overallRating })
          .where(eq(evaluations.id, input.id));
      }

      return { success: true };
    }),

  submitEvaluation: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously updated by id alone -- any user could change
      // another organization's evaluation status.
      const [existingEval] = await db.select({ organizationId: evaluations.organizationId }).from(evaluations).where(eq(evaluations.id, input.id)).limit(1);
      if (!existingEval || existingEval.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      await db.update(evaluations)
        .set({ status: "submitted" })
        .where(eq(evaluations.id, input.id));
      return { success: true };
    }),

  acknowledgeEvaluation: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously updated by id alone -- any user could change
      // another organization's evaluation status.
      const [existingEval] = await db.select({ organizationId: evaluations.organizationId }).from(evaluations).where(eq(evaluations.id, input.id)).limit(1);
      if (!existingEval || existingEval.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      await db.update(evaluations)
        .set({ status: "acknowledged" })
        .where(eq(evaluations.id, input.id));
      return { success: true };
    }),
});
