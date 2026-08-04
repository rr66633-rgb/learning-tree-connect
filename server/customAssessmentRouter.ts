import { publicProcedure, tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { customAssessments, assessmentQuestions, customAssessmentResponses, children, parentChildren, classes } from "../drizzle/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

const staffProcedure = tenantProcedure.use(({ ctx, next }) => {
  const staffRoles = ['admin', 'super_admin', 'principal', 'owner', 'teacher', 'assistant'];
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
      // SECURITY FIX: previously trusted input.classId with no check that it
      // belongs to the caller's organization -- an assessment could be tagged
      // with a foreign organization's classId. Since parentList (below)
      // resolves shared assessments by matching a parent's own child's
      // classId, a mismatched classId would leak this organization's
      // assessment title/description into another organization's parent view.
      if (input.classId) {
        const [cls] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, input.classId), eq(classes.organizationId, ctx.organizationId))).limit(1);
        if (!cls) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفصل غير موجود' });
      }
      // SECURITY FIX: organizationId was previously never set on insert --
      // since customAssessments.organizationId still carries a schema
      // default(1), every assessment created by any organization's staff was
      // silently tagged as organizationId = 1.
      const [result] = await db.insert(customAssessments).values({
        title: input.title,
        description: input.description || null,
        classId: input.classId || null,
        ageGroup: input.ageGroup || null,
        createdBy: ctx.user!.id,
        status: "draft",
        shareWithParents: false,
        organizationId: ctx.organizationId,
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
      // SECURITY FIX: previously fetched by id alone -- any staff member could
      // edit another organization's custom assessment.
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // SECURITY FIX: previously allowed changing classId to any value with
      // no check it belongs to the caller's organization -- see the same fix
      // in `create` above for why this matters (parentList's classId join).
      if (input.classId) {
        const [cls] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, input.classId), eq(classes.organizationId, ctx.organizationId))).limit(1);
        if (!cls) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفصل غير موجود' });
      }

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
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously deleted by id alone with no organization
      // check -- any staff member could delete another organization's
      // assessment (and cascade into its questions/responses).
      const [existing] = await db.select({ organizationId: customAssessments.organizationId }).from(customAssessments).where(eq(customAssessments.id, input.id)).limit(1);
      if (!existing || existing.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
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
      // SECURITY FIX: previously had NO organization filter at all -- listed
      // every organization's custom assessments to any staff user.
      const conditions: any[] = [eq(customAssessments.organizationId, ctx.organizationId)];

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
  // SECURITY FIX: previously fetched by id alone with no organization check --
  // any authenticated user (including parents) could view any organization's
  // assessment and its questions by guessing/incrementing ids.
  get: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [assessment] = await db.select().from(customAssessments).where(eq(customAssessments.id, input.id)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

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
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously trusted input.assessmentId with no check that
      // it belongs to the caller's organization -- a question could be
      // attached to a foreign organization's assessment.
      const [assessment] = await db.select({ organizationId: customAssessments.organizationId }).from(customAssessments).where(eq(customAssessments.id, input.assessmentId)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الاختبار غير موجود' });
      }

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
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously updated by id alone with no ownership/org
      // check -- joined through to the parent assessment's organizationId.
      const [question] = await db.select({ assessmentId: assessmentQuestions.assessmentId }).from(assessmentQuestions).where(eq(assessmentQuestions.id, input.id)).limit(1);
      if (!question) throw new TRPCError({ code: 'NOT_FOUND' });
      const [assessment] = await db.select({ organizationId: customAssessments.organizationId }).from(customAssessments).where(eq(customAssessments.id, question.assessmentId)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

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
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously deleted by id alone with no ownership/org
      // check -- joined through to the parent assessment's organizationId.
      const [question] = await db.select({ assessmentId: assessmentQuestions.assessmentId }).from(assessmentQuestions).where(eq(assessmentQuestions.id, input.id)).limit(1);
      if (!question) throw new TRPCError({ code: 'NOT_FOUND' });
      const [assessment] = await db.select({ organizationId: customAssessments.organizationId }).from(customAssessments).where(eq(customAssessments.id, question.assessmentId)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
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

      // SECURITY FIX: previously trusted input.assessmentId/input.childId with
      // no check that either belongs to the caller's organization -- responses
      // could be written against a foreign organization's assessment/child.
      const [assessment] = await db.select({ organizationId: customAssessments.organizationId }).from(customAssessments).where(eq(customAssessments.id, input.assessmentId)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الاختبار غير موجود' });
      }
      const [child] = await db.select({ id: children.id }).from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, ctx.organizationId))).limit(1);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });

      // Delete existing responses for this child + assessment
      await db.delete(customAssessmentResponses).where(
        and(
          eq(customAssessmentResponses.assessmentId, input.assessmentId),
          eq(customAssessmentResponses.childId, input.childId)
        )
      );

      // Insert new responses
      // SECURITY FIX: previously omitted organizationId entirely --
      // customAssessmentResponses.organizationId is NOT NULL with no
      // default, so this would fail outright; now stamped with the
      // already-verified ctx.organizationId.
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
            organizationId: ctx.organizationId,
          }))
        );
      }

      return { success: true };
    }),

  // ============ GET RESPONSES FOR A CHILD ============
  // SECURITY FIX: previously had NO organization or ownership check at all --
  // any authenticated user (including parents) could read any organization's
  // assessment responses for an arbitrary childId/assessmentId pair.
  getResponses: tenantProcedure
    .input(z.object({
      assessmentId: z.number(),
      childId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [assessment] = await db.select({ organizationId: customAssessments.organizationId }).from(customAssessments).where(eq(customAssessments.id, input.assessmentId)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الاختبار غير موجود' });
      }
      if (ctx.user!.role === 'parent') {
        // Parents may only read responses for their own child.
        const [ownChild] = await db.select({ id: children.id }).from(children)
          .where(and(eq(children.id, input.childId), eq(children.parentId, ctx.user!.id)))
          .limit(1);
        if (!ownChild) throw new TRPCError({ code: 'FORBIDDEN' });
      } else {
        const [child] = await db.select({ id: children.id }).from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, ctx.organizationId))).limit(1);
        if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });
      }
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
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously had NO organization check -- any staff
      // member could read another organization's assessment responses.
      const [assessment] = await db.select({ organizationId: customAssessments.organizationId }).from(customAssessments).where(eq(customAssessments.id, input.assessmentId)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الاختبار غير موجود' });
      }
      const responses = await db.select()
        .from(customAssessmentResponses)
        .where(eq(customAssessmentResponses.assessmentId, input.assessmentId));
      return responses;
    }),

  // ============ EMAIL REPORT TO PARENTS ============
  emailReportToParents: staffProcedure
    .input(z.object({
      assessmentId: z.number(),
      childId: z.number(),
      additionalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { sendAssessmentReportEmail } = await import('./services/emailService');
      const { users } = await import('../drizzle/schema');

      // SECURITY FIX: previously fetched child and assessment by id alone --
      // a staff member could trigger delivery of another organization's child
      // assessment data via email by supplying a foreign childId/assessmentId.
      const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, ctx.organizationId))).limit(1);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'الطفل غير موجود' });

      // Get assessment info with questions
      const [assessment] = await db.select().from(customAssessments).where(eq(customAssessments.id, input.assessmentId)).limit(1);
      if (!assessment || assessment.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الاختبار غير موجود' });
      }

      const questions = await db.select().from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, input.assessmentId))
        .orderBy(asc(assessmentQuestions.sortOrder));

      // Get responses
      const responses = await db.select().from(customAssessmentResponses)
        .where(and(
          eq(customAssessmentResponses.assessmentId, input.assessmentId),
          eq(customAssessmentResponses.childId, input.childId)
        ));

      if (responses.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا توجد إجابات مسجلة لهذا الطفل' });

      // Get all parents for this child (from parent_children table + direct parentId)
      const parentLinks = await db.select({ parentId: parentChildren.parentId })
        .from(parentChildren)
        .where(eq(parentChildren.childId, input.childId));

      const parentIds = Array.from(new Set([
        ...parentLinks.map(l => l.parentId),
        ...(child.parentId ? [child.parentId] : []),
      ]));

      if (parentIds.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يوجد أولياء أمور مربوطين بهذا الطفل' });

      // Get parent emails
      const parents = await db.select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(inArray(users.id, parentIds));

      const parentEmails = parents.filter(p => p.email).map(p => ({ email: p.email!, name: p.name || '' }));
      if (parentEmails.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يوجد بريد إلكتروني لأولياء الأمور' });

      // Build report data
      const childName = `${child.firstName} ${child.lastName || ''}`.trim();
      const reportData = questions.map(q => {
        const resp = responses.find(r => r.questionId === q.id);
        return {
          questionText: q.questionText,
          questionType: q.questionType,
          answer: resp?.answer || null,
          rating: resp?.rating || null,
          maxRating: q.maxRating || 5,
          notes: resp?.notes || null,
        };
      });

      // Send email to all parents
      const results = [];
      for (const parent of parentEmails) {
        const result = await sendAssessmentReportEmail(
          parent.email,
          parent.name,
          childName,
          assessment.title,
          reportData,
          input.additionalNotes
        );
        results.push({ email: parent.email, ...result });
      }

      const successCount = results.filter(r => r.sent).length;
      return {
        success: successCount > 0,
        message: `تم إرسال التقرير إلى ${successCount} من ${parentEmails.length} أولياء أمور`,
        details: results,
      };
    }),

  // ============ PARENT: LIST SHARED ASSESSMENTS ============
  parentList: tenantProcedure
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
      // SECURITY FIX: previously had no explicit organizationId filter --
      // relying solely on classId matching. Added as defense in depth (on
      // top of the create/update classId-ownership fix above) so this query
      // can never return another organization's assessment even if a classId
      // mismatch existed from data created before that fix.
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
        eq(customAssessments.organizationId, ctx.organizationId),
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
