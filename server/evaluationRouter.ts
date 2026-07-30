import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { evaluationCriteria, evaluations, evaluationScores, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const evaluationRouter = router({
  // ============ CRITERIA MANAGEMENT ============
  listCriteria: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId ?? 1;
    const db = (await getDb())!;
    const criteria = await db
      .select()
      .from(evaluationCriteria)
      .where(and(eq(evaluationCriteria.organizationId, orgId), eq(evaluationCriteria.isActive, true)))
      .orderBy(evaluationCriteria.category, evaluationCriteria.name);
    return criteria;
  }),

  upsertCriterion: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      maxScore: z.number().min(1).max(10).default(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;
      if (input.id) {
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

  deleteCriterion: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(evaluationCriteria)
        .set({ isActive: false })
        .where(eq(evaluationCriteria.id, input.id));
      return { success: true };
    }),

  // ============ EVALUATIONS ============
  listEvaluations: protectedProcedure
    .input(z.object({ userId: z.number().optional(), period: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
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

  getEvaluation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
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
        })
        .from(evaluations)
        .innerJoin(users, eq(users.id, evaluations.userId))
        .where(eq(evaluations.id, input.id));

      if (!evaluation) return null;

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

  createEvaluation: protectedProcedure
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
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;

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
      const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      let overallRating: "excellent" | "very_good" | "good" | "acceptable" | "poor" = "poor";
      if (percentage >= 90) overallRating = "excellent";
      else if (percentage >= 80) overallRating = "very_good";
      else if (percentage >= 70) overallRating = "good";
      else if (percentage >= 60) overallRating = "acceptable";

      // Create evaluation
      const [evalResult] = await db.insert(evaluations).values({
        userId: input.userId,
        organizationId: orgId,
        evaluatorId: ctx.user.id,
        period: input.period,
        overallScore: String(percentage.toFixed(2)),
        overallRating,
        strengths: input.strengths || null,
        improvements: input.improvements || null,
        goals: input.goals || null,
        notes: input.notes || null,
        status: "draft",
      });

      // Insert scores
      if (input.scores.length > 0) {
        await db.insert(evaluationScores).values(
          input.scores.map((s: any) => ({
            evaluationId: evalResult.insertId,
            criterionId: s.criterionId,
            score: s.score,
            comment: s.comment || null,
          }))
        );
      }

      return { id: evalResult.insertId };
    }),

  updateEvaluation: protectedProcedure
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
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;

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
        await db.insert(evaluationScores).values(
          input.scores.map((s: any) => ({
            evaluationId: input.id,
            criterionId: s.criterionId,
            score: s.score,
            comment: s.comment || null,
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

  submitEvaluation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(evaluations)
        .set({ status: "submitted" })
        .where(eq(evaluations.id, input.id));
      return { success: true };
    }),

  acknowledgeEvaluation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(evaluations)
        .set({ status: "acknowledged" })
        .where(eq(evaluations.id, input.id));
      return { success: true };
    }),
});
