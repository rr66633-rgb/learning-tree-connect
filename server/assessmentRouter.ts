import { z } from "zod";
import { router, tenantProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { ASSESSMENT_ITEMS, RESPONSE_SCORES, getInterpretation } from "../shared/assessmentData";
import type { AgeGroup, ResponseValue, Domain } from "../shared/assessmentData";

export const assessmentRouter = router({
  // Get assessment items for a specific age group
  getItems: tenantProcedure
    .input(z.object({ ageGroup: z.enum(["24-36", "36-48", "48-60", "60-72"]) }))
    .query(({ input }) => {
      return ASSESSMENT_ITEMS[input.ageGroup as AgeGroup] || [];
    }),

  // Create a new assessment
  create: tenantProcedure
    .input(z.object({
      childId: z.number(),
      ageGroup: z.enum(["24-36", "36-48", "48-60", "60-72"]),
      responses: z.array(z.object({
        domain: z.enum(["communication", "gross_motor", "fine_motor", "problem_solving", "personal_social"]),
        itemIndex: z.number(),
        itemText: z.string(),
        response: z.enum(["yes", "sometimes", "not_yet"]),
      })),
      notes: z.string().optional(),
      assessmentDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Calculate scores
      let totalScore = 0;
      const maxScore = input.responses.length * 2; // max 2 per item

      const responsesWithScores = input.responses.map(r => {
        const score = RESPONSE_SCORES[r.response as ResponseValue];
        totalScore += score;
        return { ...r, score };
      });

      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const interpretation = getInterpretation(percentage);

      // SECURITY FIX: input.childId was previously trusted with no check that
      // it belongs to the caller's organization before creating an assessment
      // tagged with the caller's own org.
      const ownedChild = await db.getChildById(input.childId);
      if (!ownedChild || ownedChild.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطفل غير موجود" });
      }

      // Create assessment record
      // SECURITY FIX: was `ctx.user?.organizationId || 1` -- silently
      // defaulted to organization #1 whenever organizationId was missing,
      // instead of failing (ctx.organizationId is guaranteed non-null here by
      // tenantProcedure).
      const assessmentId = await db.createDevelopmentalAssessment({
        childId: input.childId,
        assessorId: userId,
        ageGroup: input.ageGroup as AgeGroup,
        totalScore,
        maxScore,
        percentage: percentage.toFixed(2),
        interpretation,
        notes: input.notes || null,
        assessmentDate: new Date(input.assessmentDate),
        organizationId: ctx.organizationId,
      });

      // Create response records
      if (responsesWithScores.length > 0) {
        await db.createAssessmentResponses(
          responsesWithScores.map(r => ({
            assessmentId,
            domain: r.domain as Domain,
            itemIndex: r.itemIndex,
            itemText: r.itemText,
            response: r.response as ResponseValue,
            score: r.score,
          }))
        );
      }

      return {
        id: assessmentId,
        totalScore,
        maxScore,
        percentage: parseFloat(percentage.toFixed(2)),
        interpretation,
      };
    }),

  // Get all assessments for a child
  // SECURITY FIX: previously called db.getAssessmentsByChild(childId) with no
  // organizationId at all -- any authenticated user could pull assessments
  // for any child in any organization by childId.
  getByChild: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAssessmentsByChild(input.childId, ctx.organizationId);
    }),

  // Get assessment details with responses
  // SECURITY FIX: previously fetched by id alone with no organizationId --
  // any user could read any organization's assessment + responses by id.
  getDetails: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const assessment = await db.getAssessmentById(input.id, ctx.organizationId);
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
      const responses = await db.getAssessmentResponsesByAssessmentId(input.id);
      return { ...assessment, responses };
    }),

  // Get all assessments for the organization
  getAll: tenantProcedure
    .query(async ({ ctx }) => {
      // SECURITY FIX: was `ctx.user?.organizationId || 1` -- see create's note.
      return db.getAllDevelopmentalAssessments(ctx.organizationId);
    }),

  // Delete an assessment
  delete: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // SECURITY FIX: previously fetched by id alone with no organizationId --
      // the assessorId/admin-role check that followed never actually verified
      // the assessment belonged to the caller's organization, so a
      // same-organization admin role check could still match an assessment
      // fetched from a foreign organization. Passing organizationId here means
      // a foreign-organization id now resolves to NOT_FOUND before that check.
      const assessment = await db.getAssessmentById(input.id, ctx.organizationId);
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
      // Only assessor or admin can delete
      if (assessment.assessorId !== ctx.user?.id && ctx.user?.role !== 'admin' && ctx.user?.role !== 'super_admin' && ctx.user?.role !== 'owner' && ctx.user?.role !== 'principal') {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.deleteDevelopmentalAssessment(input.id, ctx.organizationId);
      return { success: true };
    }),

  // Get assessments for parent's children
  getForParent: tenantProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      const childIds = await db.getChildIdsForParent(ctx.user.id);
      if (childIds.length === 0) return [];
      const allAssessments = [];
      for (const childId of childIds) {
        const assessments = await db.getAssessmentsByChild(childId, ctx.organizationId);
        allAssessments.push(...assessments);
      }
      return allAssessments.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
    }),
});
