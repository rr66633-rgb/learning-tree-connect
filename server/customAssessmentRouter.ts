import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { customAssessments, assessmentQuestions, customAssessmentResponses, children, parentChildren, classes } from "../drizzle/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const staffRoles = ['admin', 'super_admin', 'principal', 'teacher', 'assistant'];
  if (!staffRoles.includes(ctx.user?.role || '')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Staff access required' });
  }
  return next({ ctx });
});

export const customAssessmentRouter = router({
  // ============ CREATE ASSESSMENT ============
  create: staffProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      classId: z.number().optional(),
      ageGroup: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [result] = await db.insert(customAssessments).values({
        title: input.title,
        description: input.description || null,
        classId: input.classId || null,
        ageGroup: input.ageGroup || null,
        createdBy: ctx.user!.id,
        status: "draft",
        shareWithParents: false,
      });
      return { id: result.insertId };
    }),

  // ============ UPDATE ASSESSMENT ============
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      classId: z.number().nullable().optional(),
      ageGroup: z.string().nullable().optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
      shareWithParents: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [assessment] = await db.select().from(customAssessments).where(eq(customAssessments.id, input.id)).limit(1);
      if (!assessment) throw new TRPCError({ code: 'NOT_FOUND' });
      
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.classId !== undefined) updateData.classId = input.classId;
      if (input.ageGroup !== undefined) updateData.ageGroup = input.ageGroup;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.shareWithParents !== undefined) updateData.shareWithParents = input.shareWithParents;

      await db.update(customAssessments).set(updateData).where(eq(customAssessments.id, input.id));
      return { success: true };
    }),

  // ============ DELETE ASSESSMENT ============
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      // Delete responses first
      await db.delete(customAssessmentResponses).where(eq(customAssessmentResponses.assessmentId, input.id));
      // Delete questions
      await db.delete(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, input.id));
      // Delete assessment
      await db.delete(customAssessments).where(eq(customAssessments.id, input.id));
      return { success: true };
    }),

  // ============ LIST ASSESSMENTS ============
  list: staffProcedure
    .input(z.object({
      classId: z.number().optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      
      if (input.classId) conditions.push(eq(customAssessments.classId, input.classId));
      if (input.status) conditions.push(eq(customAssessments.status, input.status));

      const items = await db.select({
        id: customAssessments.id,
        title: customAssessments.title,
        description: customAssessments.description,
        classId: customAssessments.classId,
        ageGroup: customAssessments.ageGroup,
        createdBy: customAssessments.createdBy,
        status: customAssessments.status,
        shareWithParents: customAssessments.shareWithParents,
        createdAt: customAssessments.createdAt,
      })
      .from(customAssessments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customAssessments.createdAt));

      return items;
    }),

  // ============ GET SINGLE ASSESSMENT WITH QUESTIONS ============
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [assessment] = await db.select().from(customAssessments).where(eq(customAssessments.id, input.id)).limit(1);
      if (!assessment) throw new TRPCError({ code: 'NOT_FOUND' });

      const questions = await db.select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, input.id))
        .orderBy(asc(assessmentQuestions.sortOrder));

      return { ...assessment, questions };
    }),

  // ============ ADD QUESTION ============
  addQuestion: staffProcedure
    .input(z.object({
      assessmentId: z.number(),
      questionText: z.string().min(1),
      questionType: z.enum(["multiple_choice", "true_false", "rating", "text"]),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string().optional(),
      maxRating: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      // Get max sortOrder
      const existing = await db.select({ sortOrder: assessmentQuestions.sortOrder })
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, input.assessmentId))
        .orderBy(desc(assessmentQuestions.sortOrder))
        .limit(1);
      
      const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;

      const [result] = await db.insert(assessmentQuestions).values({
        assessmentId: input.assessmentId,
        questionText: input.questionText,
        questionType: input.questionType,
        options: input.options || null,
        correctAnswer: input.correctAnswer || null,
        maxRating: input.maxRating || 5,
        sortOrder: nextOrder,
      });
      return { id: result.insertId };
    }),

  // ============ UPDATE QUESTION ============
  updateQuestion: staffProcedure
    .input(z.object({
      id: z.number(),
      questionText: z.string().optional(),
      questionType: z.enum(["multiple_choice", "true_false", "rating", "text"]).optional(),
      options: z.array(z.string()).nullable().optional(),
      correctAnswer: z.string().nullable().optional(),
      maxRating: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const updateData: any = {};
      if (input.questionText !== undefined) updateData.questionText = input.questionText;
      if (input.questionType !== undefined) updateData.questionType = input.questionType;
      if (input.options !== undefined) updateData.options = input.options;
      if (input.correctAnswer !== undefined) updateData.correctAnswer = input.correctAnswer;
      if (input.maxRating !== undefined) updateData.maxRating = input.maxRating;
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

      await db.update(assessmentQuestions).set(updateData).where(eq(assessmentQuestions.id, input.id));
      return { success: true };
    }),

  // ============ DELETE QUESTION ============
  deleteQuestion: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      // Delete responses for this question
      await db.delete(customAssessmentResponses).where(eq(customAssessmentResponses.questionId, input.id));
      // Delete question
      await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, input.id));
      return { success: true };
    }),

  // ============ SAVE RESPONSES (batch) ============
  saveResponses: staffProcedure
    .input(z.object({
      assessmentId: z.number(),
      childId: z.number(),
      responses: z.array(z.object({
        questionId: z.number(),
        answer: z.string().nullable().optional(),
        rating: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      
      // Delete existing responses for this child + assessment
      await db.delete(customAssessmentResponses).where(
        and(
          eq(customAssessmentResponses.assessmentId, input.assessmentId),
          eq(customAssessmentResponses.childId, input.childId)
        )
      );

      // Insert new responses
      if (input.responses.length > 0) {
        await db.insert(customAssessmentResponses).values(
          input.responses.map(r => ({
            assessmentId: input.assessmentId,
            childId: input.childId,
            questionId: r.questionId,
            answer: r.answer || null,
            rating: r.rating || null,
            notes: r.notes || null,
            recordedBy: ctx.user!.id,
          }))
        );
      }

      return { success: true };
    }),

  // ============ GET RESPONSES FOR A CHILD ============
  getResponses: protectedProcedure
    .input(z.object({
      assessmentId: z.number(),
      childId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const responses = await db.select()
        .from(customAssessmentResponses)
        .where(and(
          eq(customAssessmentResponses.assessmentId, input.assessmentId),
          eq(customAssessmentResponses.childId, input.childId)
        ));
      return responses;
    }),

  // ============ GET ALL RESPONSES FOR AN ASSESSMENT ============
  getAllResponses: staffProcedure
    .input(z.object({ assessmentId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const responses = await db.select()
        .from(customAssessmentResponses)
        .where(eq(customAssessmentResponses.assessmentId, input.assessmentId));
      return responses;
    }),

  // ============ PARENT: LIST SHARED ASSESSMENTS ============
  parentList: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const userId = ctx.user!.id;

      // Get parent's children class IDs
      const parentLinks = await db.select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(eq(parentChildren.parentId, userId));

      const childIds = parentLinks.map((l: any) => l.childId);

      const directChildren = await db.select({ id: children.id, classId: children.classId })
        .from(children)
        .where(eq(children.parentId, userId));

      const allChildIds = Array.from(new Set([...childIds, ...directChildren.map((c: any) => c.id)]));
      if (allChildIds.length === 0) return [];

      const childRecords = await db.select({ id: children.id, classId: children.classId, firstName: children.firstName })
        .from(children)
        .where(inArray(children.id, allChildIds));

      const classIds: number[] = Array.from(new Set(childRecords.filter((c: any) => c.classId).map((c: any) => c.classId as number)));
      if (classIds.length === 0) return [];

      // Get shared assessments for these classes
      const assessments = await db.select({
        id: customAssessments.id,
        title: customAssessments.title,
        description: customAssessments.description,
        classId: customAssessments.classId,
        ageGroup: customAssessments.ageGroup,
        status: customAssessments.status,
        createdAt: customAssessments.createdAt,
      })
      .from(customAssessments)
      .where(and(
        inArray(customAssessments.classId, classIds),
        eq(customAssessments.shareWithParents, true),
        eq(customAssessments.status, "active")
      ))
      .orderBy(desc(customAssessments.createdAt))
      .limit(input.limit);

      // Get responses for parent's children
      const result = [];
      for (const assessment of assessments) {
        const relevantChildren = childRecords.filter((c: any) => c.classId === assessment.classId);
        const childResults = [];
        for (const child of relevantChildren) {
          const responses = await db.select()
            .from(customAssessmentResponses)
            .where(and(
              eq(customAssessmentResponses.assessmentId, assessment.id),
              eq(customAssessmentResponses.childId, child.id)
            ));
          if (responses.length > 0) {
            childResults.push({ childId: child.id, childName: child.firstName, responses });
          }
        }
        result.push({ ...assessment, childResults });
      }

      return result;
    }),
});
