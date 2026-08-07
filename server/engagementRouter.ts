import { z } from "zod";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import { tenantProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  homeLearningActivities,
  familyChallenges,
  challengeParticipations,
  homeJournalEntries,
  parentObservations,
  monthlyGrowthGoals,
  engagementScores,
  achievementBadges,
  parentBadges,
  familyEngagementConfig,
  aiGeneratedContent,
  children,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";

// SECURITY FIX helper: verifies a client-supplied childId actually belongs to
// the caller's organization before it's used to read/write any of the
// engagement tables in this file (homeLearningActivities, familyChallenges,
// challengeParticipations, homeJournalEntries, parentObservations,
// monthlyGrowthGoals). Every route below that takes a childId was previously
// trusting it with no such check.
async function assertChildInOrg(db: MySql2Database<any>, childId: number, organizationId: number) {
  const [child] = await db.select({ id: children.id }).from(children)
    .where(and(eq(children.id, childId), eq(children.organizationId, organizationId)))
    .limit(1);
  if (!child) throw new TRPCError({ code: "NOT_FOUND", message: "الطفل غير موجود" });
}

// ============ AI HELPERS ============

async function generateActivitiesWithAI(params: {
  childName: string;
  ageMonths: number;
  category: string;
  language: string;
  previousActivities?: string[];
}) {
  const { childName, ageMonths, category, language, previousActivities } = params;
  const prompt = `You are an early childhood education expert specializing in EYFS framework.
Generate 3 home learning activities for a child named ${childName} (age: ${ageMonths} months).
Category: ${category}
Language: ${language === "both" ? "Generate in both English and Arabic" : language}
${previousActivities?.length ? `Avoid repeating these: ${previousActivities.join(", ")}` : ""}

For each activity provide:
- titleEn, titleAr
- descriptionEn, descriptionAr (2-3 sentences explaining the activity)
- materialsEn, materialsAr (comma-separated list of materials needed)
- stepsEn, stepsAr (numbered steps)
- duration (in minutes, appropriate for age)
- difficulty (easy/medium/challenging based on age)

Return a JSON array of 3 activities. Only return the JSON array, no other text.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an EYFS early childhood education specialist. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_schema", json_schema: { name: "activities", strict: true, schema: {
      type: "object",
      properties: { activities: { type: "array", items: { type: "object", properties: {
        titleEn: { type: "string" }, titleAr: { type: "string" },
        descriptionEn: { type: "string" }, descriptionAr: { type: "string" },
        materialsEn: { type: "string" }, materialsAr: { type: "string" },
        stepsEn: { type: "string" }, stepsAr: { type: "string" },
        duration: { type: "integer" }, difficulty: { type: "string" }
      }, required: ["titleEn", "titleAr", "descriptionEn", "descriptionAr", "materialsEn", "materialsAr", "stepsEn", "stepsAr", "duration", "difficulty"], additionalProperties: false } } },
      required: ["activities"], additionalProperties: false
    } } },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.activities || parsed;
  } catch { return []; }
}

async function analyzeParentObservation(observationText: string, childAgeMonths: number) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an EYFS child development specialist. Analyze parent observations and identify development areas. Return only valid JSON." },
      { role: "user", content: `Analyze this parent observation about a ${childAgeMonths}-month-old child:
"${observationText}"

Identify:
1. suggestedAreas: array of EYFS development areas this observation relates to (from: communication_language, physical_development, personal_social_emotional, literacy, mathematics, understanding_world, expressive_arts)
2. significance: one of (routine, notable, significant, concern)
3. developmentIndicators: array of specific skills/behaviors demonstrated
4. recommendation: a brief suggestion for the parent

Return JSON only.` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "analysis", strict: true, schema: {
      type: "object",
      properties: {
        suggestedAreas: { type: "array", items: { type: "string" } },
        significance: { type: "string" },
        developmentIndicators: { type: "array", items: { type: "string" } },
        recommendation: { type: "string" }
      },
      required: ["suggestedAreas", "significance", "developmentIndicators", "recommendation"], additionalProperties: false
    } } },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) return null;
  try { return JSON.parse(content); } catch { return null; }
}

async function generateMonthlyGoals(params: {
  childName: string;
  ageMonths: number;
  strengths: string[];
  areasForImprovement: string[];
}) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an EYFS specialist. Generate personalized monthly growth goals. Return only valid JSON." },
      { role: "user", content: `Generate 3 monthly growth goals for ${params.childName} (${params.ageMonths} months old).
Strengths: ${params.strengths.join(", ") || "Not yet assessed"}
Areas for improvement: ${params.areasForImprovement.join(", ") || "Not yet assessed"}

For each goal provide:
- titleEn, titleAr
- descriptionEn, descriptionAr
- category (one of: vocabulary, fine_motor, gross_motor, social, independence, literacy, numeracy, creativity)
- suggestedActivities: array of 2-3 activity suggestions (each with titleEn, titleAr, description)

Return JSON array of 3 goals.` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "goals", strict: true, schema: {
      type: "object",
      properties: { goals: { type: "array", items: { type: "object", properties: {
        titleEn: { type: "string" }, titleAr: { type: "string" },
        descriptionEn: { type: "string" }, descriptionAr: { type: "string" },
        category: { type: "string" },
        suggestedActivities: { type: "array", items: { type: "object", properties: { titleEn: { type: "string" }, titleAr: { type: "string" }, description: { type: "string" } }, required: ["titleEn", "titleAr", "description"], additionalProperties: false } }
      }, required: ["titleEn", "titleAr", "descriptionEn", "descriptionAr", "category", "suggestedActivities"], additionalProperties: false } } },
      required: ["goals"], additionalProperties: false
    } } },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) return [];
  try { const parsed = JSON.parse(content); return parsed.goals || parsed; } catch { return []; }
}

async function parentChatbotResponse(params: {
  question: string;
  childName: string;
  childAge: number;
  language: string;
}) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: `You are a friendly and knowledgeable early childhood education advisor for parents. You specialize in EYFS framework and child development for ages 0-5. Always respond in ${params.language === "ar" ? "Arabic" : "English"}. Be warm, encouraging, and practical. Keep responses concise (2-3 paragraphs max).` },
      { role: "user", content: `Parent question about their child ${params.childName} (${params.childAge} months old): "${params.question}"` },
    ],
  });

  return response.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your question. Please try again.";
}

// ============ ROUTER ============

export const engagementRouter = router({
  // ---- HOME LEARNING ACTIVITIES ----
  
  activities: router({
    list: tenantProcedure
      .input(z.object({
        childId: z.number(),
        status: z.enum(["pending", "completed", "skipped"]).optional(),
        category: z.string().optional(),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously filtered by childId alone -- any
        // authenticated user could list another organization's home learning
        // activities for an arbitrary childId.
        const conditions = [eq(homeLearningActivities.childId, input.childId), eq(homeLearningActivities.organizationId, ctx.organizationId)];
        if (input.status) conditions.push(eq(homeLearningActivities.status, input.status));
        if (input.category) conditions.push(eq(homeLearningActivities.category, input.category as any));

        return db.select().from(homeLearningActivities)
          .where(and(...conditions))
          .orderBy(desc(homeLearningActivities.createdAt))
          .limit(input.limit);
      }),

    generate: tenantProcedure
      .input(z.object({
        childId: z.number(),
        category: z.enum(["language", "fine_motor", "gross_motor", "social_emotional", "early_math", "literacy", "creative", "outdoor"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously fetched by childId alone -- any
        // authenticated user could generate (and write) activities against
        // another organization's child.
        const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, ctx.organizationId)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });

        const ageMonths = Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        
        // Get previous activities to avoid repetition
        const previous = await db.select({ title: homeLearningActivities.titleEn })
          .from(homeLearningActivities)
          .where(and(eq(homeLearningActivities.childId, input.childId), eq(homeLearningActivities.category, input.category)))
          .limit(10);

        const activities = await generateActivitiesWithAI({
          childName: child.firstName,
          ageMonths,
          category: input.category,
          language: "both",
          previousActivities: previous.map(p => p.title),
        });

        const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

        const inserted = [];
        for (const activity of activities) {
          const [result] = await db.insert(homeLearningActivities).values({
            childId: input.childId,
            parentId: ctx.user.id,
            category: input.category,
            titleEn: activity.titleEn,
            titleAr: activity.titleAr,
            descriptionEn: activity.descriptionEn,
            descriptionAr: activity.descriptionAr,
            materialsEn: activity.materialsEn,
            materialsAr: activity.materialsAr,
            stepsEn: activity.stepsEn,
            stepsAr: activity.stepsAr,
            duration: activity.duration,
            difficulty: activity.difficulty as any,
            ageGroupMonths: ageMonths,
            weekNumber: currentWeek,
            organizationId: ctx.organizationId,
          });
          inserted.push(result);
        }

        return { count: inserted.length, message: "Activities generated successfully" };
      }),

    complete: tenantProcedure
      .input(z.object({
        activityId: z.number(),
        feedback: z.string().optional(),
        rating: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously updated by id alone -- any user could mark
        // another organization's activity completed.
        const [activity] = await db.select({ organizationId: homeLearningActivities.organizationId, childId: homeLearningActivities.childId })
          .from(homeLearningActivities).where(eq(homeLearningActivities.id, input.activityId)).limit(1);
        if (!activity || activity.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.update(homeLearningActivities)
          .set({
            status: "completed",
            completedAt: new Date(),
            parentFeedback: input.feedback,
            rating: input.rating,
          })
          .where(eq(homeLearningActivities.id, input.activityId));

        // Update engagement score
        await updateEngagementScore(ctx.user.id, activity.childId, ctx.organizationId, "activity");
        // Check for badge earning
        await checkAndAwardBadges(ctx.user.id, ctx.organizationId);

        return { success: true };
      }),

    skip: tenantProcedure
      .input(z.object({ activityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously updated by id alone -- any user could mark
        // another organization's activity skipped.
        const [activity] = await db.select({ organizationId: homeLearningActivities.organizationId })
          .from(homeLearningActivities).where(eq(homeLearningActivities.id, input.activityId)).limit(1);
        if (!activity || activity.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.update(homeLearningActivities)
          .set({ status: "skipped" })
          .where(eq(homeLearningActivities.id, input.activityId));
        return { success: true };
      }),
  }),

  // ---- FAMILY CHALLENGES ----
  
  challenges: router({
    listActive: tenantProcedure
      .input(z.object({ childId: z.number().optional() }))
      .query(async ({ ctx }) => {
        const db = (await getDb())!;
        const orgId = ctx.organizationId;
        const activeChallenges = await db.select().from(familyChallenges)
          .where(and(eq(familyChallenges.isActive, true), eq(familyChallenges.organizationId, orgId)))
          .orderBy(desc(familyChallenges.createdAt));
        return activeChallenges;
      }),

    myParticipations: tenantProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        return db.select().from(challengeParticipations)
          .where(and(
            eq(challengeParticipations.parentId, ctx.user.id),
            eq(challengeParticipations.childId, input.childId)
          ))
          .orderBy(desc(challengeParticipations.createdAt));
      }),

    enroll: tenantProcedure
      .input(z.object({ challengeId: z.number(), childId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously enrolled in any challengeId with no
        // organization check -- a user could enroll in another organization's
        // family challenge.
        const [challenge] = await db.select({ id: familyChallenges.id }).from(familyChallenges)
          .where(and(eq(familyChallenges.id, input.challengeId), eq(familyChallenges.organizationId, ctx.organizationId)))
          .limit(1);
        if (!challenge) throw new TRPCError({ code: "NOT_FOUND", message: "التحدي غير موجود" });

        // Check if already enrolled
        const existing = await db.select().from(challengeParticipations)
          .where(and(
            eq(challengeParticipations.challengeId, input.challengeId),
            eq(challengeParticipations.parentId, ctx.user.id),
            eq(challengeParticipations.childId, input.childId)
          ));
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Already enrolled" });

        await db.insert(challengeParticipations).values({
          challengeId: input.challengeId,
          parentId: ctx.user.id,
          childId: input.childId,
          status: "enrolled",
          organizationId: ctx.organizationId,
        });
        return { success: true };
      }),

    updateProgress: tenantProcedure
      .input(z.object({
        participationId: z.number(),
        progressPercent: z.number().min(0).max(100),
        notes: z.string().optional(),
        evidenceUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously updated by id alone -- any user could edit
        // another organization's challenge participation.
        const [participation] = await db.select().from(challengeParticipations)
          .where(eq(challengeParticipations.id, input.participationId));
        if (!participation || participation.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const isComplete = input.progressPercent >= 100;

        await db.update(challengeParticipations)
          .set({
            progressPercent: input.progressPercent,
            status: isComplete ? "completed" : "in_progress",
            completedAt: isComplete ? new Date() : undefined,
            notes: input.notes,
            evidenceUrl: input.evidenceUrl,
          })
          .where(eq(challengeParticipations.id, input.participationId));

        if (isComplete) {
          // Award points from the challenge
          const [challenge] = await db.select().from(familyChallenges)
            .where(eq(familyChallenges.id, participation.challengeId));
          if (challenge) {
            await db.update(challengeParticipations)
              .set({ pointsEarned: challenge.pointsReward })
              .where(eq(challengeParticipations.id, input.participationId));
          }
          await updateEngagementScore(ctx.user.id, participation.childId, ctx.organizationId, "challenge");
          await checkAndAwardBadges(ctx.user.id, ctx.organizationId);
        }

        return { success: true };
      }),

    // Admin: create challenge
    create: tenantProcedure
      .input(z.object({
        titleEn: z.string(),
        titleAr: z.string(),
        descriptionEn: z.string(),
        descriptionAr: z.string(),
        category: z.enum(["reading", "kindness", "creativity", "outdoor", "stem", "social", "health", "cultural"]),
        difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
        durationDays: z.number().default(7),
        pointsReward: z.number().default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "principal", "owner", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        
        await db.insert(familyChallenges).values({
          ...input,
          weekNumber: currentWeek,
          academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
          organizationId: ctx.organizationId,
        });
        return { success: true };
      }),
  }),

  // ---- HOME JOURNAL ----
  
  journal: router({
    list: tenantProcedure
      .input(z.object({
        childId: z.number(),
        entryType: z.enum(["photo", "video", "note", "achievement", "milestone"]).optional(),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously filtered by childId alone -- any user could
        // list another organization's home journal entries.
        const conditions = [eq(homeJournalEntries.childId, input.childId), eq(homeJournalEntries.organizationId, ctx.organizationId)];
        if (input.entryType) conditions.push(eq(homeJournalEntries.entryType, input.entryType));

        return db.select().from(homeJournalEntries)
          .where(and(...conditions))
          .orderBy(desc(homeJournalEntries.createdAt))
          .limit(input.limit);
      }),

    create: tenantProcedure
      .input(z.object({
        childId: z.number(),
        entryType: z.enum(["photo", "video", "note", "achievement", "milestone"]),
        title: z.string().optional(),
        description: z.string().optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.string().optional(),
        eyfsAreaId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: input.childId was previously trusted with no check
        // that it belongs to the caller's organization.
        await assertChildInOrg(db, input.childId, ctx.organizationId);
        await db.insert(homeJournalEntries).values({
          ...input,
          parentId: ctx.user.id,
          organizationId: ctx.organizationId,
        });
        await updateEngagementScore(ctx.user.id, input.childId, ctx.organizationId, "journal");
        await checkAndAwardBadges(ctx.user.id, ctx.organizationId);
        return { success: true };
      }),

    // Teacher: review journal entry
    review: tenantProcedure
      .input(z.object({
        entryId: z.number(),
        status: z.enum(["approved", "needs_revision", "rejected"]),
        reviewNotes: z.string().optional(),
        isHighlighted: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "principal", "owner", "teacher", "assistant"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        // SECURITY FIX: previously updated by id alone -- any teacher/admin
        // could review another organization's journal entry.
        const [entry] = await db.select({ organizationId: homeJournalEntries.organizationId }).from(homeJournalEntries).where(eq(homeJournalEntries.id, input.entryId)).limit(1);
        if (!entry || entry.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.update(homeJournalEntries)
          .set({
            status: input.status,
            teacherReviewNotes: input.reviewNotes,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            isHighlighted: input.isHighlighted ?? false,
          })
          .where(eq(homeJournalEntries.id, input.entryId));
        return { success: true };
      }),

    // Teacher: list pending reviews
    pendingReviews: tenantProcedure
      .query(async ({ ctx }) => {
        if (!["admin", "principal", "owner", "teacher", "assistant"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        return db.select().from(homeJournalEntries)
          .where(and(
            eq(homeJournalEntries.status, "pending_review"),
            eq(homeJournalEntries.organizationId, ctx.organizationId)
          ))
          .orderBy(desc(homeJournalEntries.createdAt));
      }),
  }),

  // ---- PARENT OBSERVATIONS ----
  
  observations: router({
    list: tenantProcedure
      .input(z.object({
        childId: z.number(),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously filtered by childId alone -- any user
        // could list another organization's parent observations.
        return db.select().from(parentObservations)
          .where(and(eq(parentObservations.childId, input.childId), eq(parentObservations.organizationId, ctx.organizationId)))
          .orderBy(desc(parentObservations.createdAt))
          .limit(input.limit);
      }),

    create: tenantProcedure
      .input(z.object({
        childId: z.number(),
        observationText: z.string().min(10),
        context: z.enum(["home_play", "outdoor", "social", "mealtime", "bedtime", "learning", "creative", "other"]),
        mediaUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;

        // SECURITY FIX: input.childId was previously trusted with no check
        // that it belongs to the caller's organization.
        const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, ctx.organizationId)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND", message: "الطفل غير موجود" });
        const ageMonths = Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));

        // AI analysis
        const analysis = await analyzeParentObservation(input.observationText, ageMonths);

        await db.insert(parentObservations).values({
          childId: input.childId,
          parentId: ctx.user.id,
          observationText: input.observationText,
          context: input.context,
          mediaUrl: input.mediaUrl,
          aiAnalysis: analysis,
          aiSuggestedAreaIds: analysis?.suggestedAreas || [],
          significance: (analysis?.significance as any) || "routine",
          organizationId: ctx.organizationId,
        });

        await updateEngagementScore(ctx.user.id, input.childId, ctx.organizationId, "observation");
        await checkAndAwardBadges(ctx.user.id, ctx.organizationId);
        return { success: true, analysis };
      }),

    // Teacher: review parent observation
    review: tenantProcedure
      .input(z.object({
        observationId: z.number(),
        status: z.enum(["reviewed", "flagged", "linked_to_assessment"]),
        teacherNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "principal", "owner", "teacher", "assistant"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        // SECURITY FIX: previously updated by id alone -- any teacher/admin
        // could review another organization's parent observation.
        const [obs] = await db.select({ organizationId: parentObservations.organizationId }).from(parentObservations).where(eq(parentObservations.id, input.observationId)).limit(1);
        if (!obs || obs.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.update(parentObservations)
          .set({
            teacherStatus: input.status,
            teacherNotes: input.teacherNotes,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
          })
          .where(eq(parentObservations.id, input.observationId));
        return { success: true };
      }),

    // Teacher: list pending observations
    pendingReview: tenantProcedure
      .query(async ({ ctx }) => {
        if (!["admin", "principal", "owner", "teacher", "assistant"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        return db.select().from(parentObservations)
          .where(and(
            eq(parentObservations.teacherStatus, "pending"),
            eq(parentObservations.organizationId, ctx.organizationId)
          ))
          .orderBy(desc(parentObservations.createdAt));
      }),
  }),

  // ---- MONTHLY GROWTH GOALS ----
  
  goals: router({
    list: tenantProcedure
      .input(z.object({
        childId: z.number(),
        month: z.number().optional(),
        year: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously filtered by childId alone -- any user could
        // list another organization's monthly growth goals.
        const conditions = [eq(monthlyGrowthGoals.childId, input.childId), eq(monthlyGrowthGoals.organizationId, ctx.organizationId)];
        if (input.month) conditions.push(eq(monthlyGrowthGoals.targetMonth, input.month));
        if (input.year) conditions.push(eq(monthlyGrowthGoals.targetYear, input.year));

        return db.select().from(monthlyGrowthGoals)
          .where(and(...conditions))
          .orderBy(desc(monthlyGrowthGoals.createdAt));
      }),

    generate: tenantProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously fetched by childId alone -- any user could
        // generate (and write) goals against another organization's child.
        const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, ctx.organizationId)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const ageMonths = Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const now = new Date();

        const goals = await generateMonthlyGoals({
          childName: child.firstName,
          ageMonths,
          strengths: [],
          areasForImprovement: [],
        });

        for (const goal of goals) {
          await db.insert(monthlyGrowthGoals).values({
            childId: input.childId,
            parentId: ctx.user.id,
            titleEn: goal.titleEn,
            titleAr: goal.titleAr,
            descriptionEn: goal.descriptionEn,
            descriptionAr: goal.descriptionAr,
            category: goal.category as any,
            targetMonth: now.getMonth() + 1,
            targetYear: now.getFullYear(),
            suggestedActivities: goal.suggestedActivities,
            organizationId: ctx.organizationId,
          });
        }

        return { count: goals.length };
      }),

    updateProgress: tenantProcedure
      .input(z.object({
        goalId: z.number(),
        progressPercent: z.number().min(0).max(100),
        parentNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously updated by id alone -- any user could edit
        // another organization's growth goal.
        const [goal] = await db.select().from(monthlyGrowthGoals).where(eq(monthlyGrowthGoals.id, input.goalId)).limit(1);
        if (!goal || goal.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const isComplete = input.progressPercent >= 100;

        await db.update(monthlyGrowthGoals)
          .set({
            progressPercent: input.progressPercent,
            status: isComplete ? "completed" : "active",
            completedAt: isComplete ? new Date() : undefined,
            parentNotes: input.parentNotes,
          })
          .where(eq(monthlyGrowthGoals.id, input.goalId));

        if (isComplete) {
          await updateEngagementScore(ctx.user.id, goal.childId, ctx.organizationId, "goal");
          await checkAndAwardBadges(ctx.user.id, ctx.organizationId);
        }
        return { success: true };
      }),
  }),

  // ---- ENGAGEMENT & GAMIFICATION ----
  
  engagement: router({
    myScore: tenantProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = new Date();
        const periodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        
        const [score] = await db.select().from(engagementScores)
          .where(and(
            eq(engagementScores.parentId, ctx.user.id),
            eq(engagementScores.childId, input.childId),
            eq(engagementScores.period, "monthly"),
            eq(engagementScores.periodValue, periodValue)
          ));

        return score || { score: 0, level: "inactive", streak: 0, totalPoints: 0, activitiesCompleted: 0, challengesCompleted: 0, journalEntries: 0, observationsSubmitted: 0, goalsCompleted: 0 };
      }),

    myBadges: tenantProcedure
      .query(async ({ ctx }) => {
        const db = (await getDb())!;
        const earned = await db.select().from(parentBadges)
          .where(eq(parentBadges.parentId, ctx.user.id));

        // SECURITY FIX: previously filtered only by isActive -- leaked every
        // organization's badge catalogue to any authenticated user.
        const allBadges = await db.select().from(achievementBadges)
          .where(and(eq(achievementBadges.isActive, true), eq(achievementBadges.organizationId, ctx.organizationId)));

        return {
          earned: earned.map(e => ({
            ...e,
            badge: allBadges.find(b => b.id === e.badgeId),
          })),
          available: allBadges.filter(b => !earned.some(e => e.badgeId === b.id)),
        };
      }),

    leaderboard: tenantProcedure
      .input(z.object({ period: z.enum(["weekly", "monthly", "term"]).default("monthly") }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const orgId = ctx.organizationId;
        const now = new Date();
        const periodValue = input.period === "weekly"
          ? `${now.getFullYear()}-W${Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`
          : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        return db.select().from(engagementScores)
          .where(and(
            eq(engagementScores.organizationId, orgId),
            eq(engagementScores.period, input.period),
            eq(engagementScores.periodValue, periodValue)
          ))
          .orderBy(desc(engagementScores.score))
          .limit(20);
      }),
  }),

  // ---- AI CHATBOT ----
  
  chatbot: router({
    ask: tenantProcedure
      .input(z.object({
        question: z.string().min(3),
        childId: z.number(),
        language: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        // SECURITY FIX: previously fetched by childId alone -- any user could
        // ask the chatbot about (and leak the name/age of) another
        // organization's child.
        const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, ctx.organizationId)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const ageMonths = Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));

        const answer = await parentChatbotResponse({
          question: input.question,
          childName: child.firstName,
          childAge: ageMonths,
          language: input.language,
        });

        return { answer };
      }),
  }),

  // ---- TEACHER/ADMIN ANALYTICS ----
  
  analytics: router({
    overview: tenantProcedure
      .query(async ({ ctx }) => {
        if (!["admin", "principal", "owner", "teacher", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        const orgId = ctx.organizationId;

        const [activitiesCount] = await db.select({ count: count() }).from(homeLearningActivities)
          .where(eq(homeLearningActivities.organizationId, orgId));
        const [completedActivities] = await db.select({ count: count() }).from(homeLearningActivities)
          .where(and(eq(homeLearningActivities.organizationId, orgId), eq(homeLearningActivities.status, "completed")));
        const [journalCount] = await db.select({ count: count() }).from(homeJournalEntries)
          .where(eq(homeJournalEntries.organizationId, orgId));
        const [observationCount] = await db.select({ count: count() }).from(parentObservations)
          .where(eq(parentObservations.organizationId, orgId));
        const [pendingJournals] = await db.select({ count: count() }).from(homeJournalEntries)
          .where(and(eq(homeJournalEntries.organizationId, orgId), eq(homeJournalEntries.status, "pending_review")));
        const [pendingObservations] = await db.select({ count: count() }).from(parentObservations)
          .where(and(eq(parentObservations.organizationId, orgId), eq(parentObservations.teacherStatus, "pending")));

        return {
          totalActivities: activitiesCount?.count || 0,
          completedActivities: completedActivities?.count || 0,
          completionRate: activitiesCount?.count ? Math.round(((completedActivities?.count || 0) / activitiesCount.count) * 100) : 0,
          totalJournalEntries: journalCount?.count || 0,
          totalObservations: observationCount?.count || 0,
          pendingJournalReviews: pendingJournals?.count || 0,
          pendingObservationReviews: pendingObservations?.count || 0,
        };
      }),

    engagementByFamily: tenantProcedure
      .query(async ({ ctx }) => {
        if (!["admin", "principal", "owner", "teacher", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        const orgId = ctx.organizationId;
        const now = new Date();
        const periodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        return db.select().from(engagementScores)
          .where(and(
            eq(engagementScores.organizationId, orgId),
            eq(engagementScores.period, "monthly"),
            eq(engagementScores.periodValue, periodValue)
          ))
          .orderBy(desc(engagementScores.score));
      }),
  }),

  // ---- FAMILY REPORTS ----
  
  reports: router({
    generate: tenantProcedure
      .input(z.object({
        childId: z.number(),
        period: z.enum(["weekly", "monthly", "term"]).default("monthly"),
        language: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const orgId = ctx.organizationId;
        // SECURITY FIX: previously fetched by childId alone -- any user could
        // generate a report using another organization's child data.
        const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, orgId)));
        if (!child) throw new TRPCError({ code: "NOT_FOUND" });

        const ageMonths = Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));

        // Gather engagement data
        const activities = await db.select().from(homeLearningActivities)
          .where(and(eq(homeLearningActivities.childId, input.childId), eq(homeLearningActivities.organizationId, orgId)))
          .orderBy(desc(homeLearningActivities.createdAt)).limit(20);
        const journals = await db.select().from(homeJournalEntries)
          .where(and(eq(homeJournalEntries.childId, input.childId), eq(homeJournalEntries.organizationId, orgId)))
          .orderBy(desc(homeJournalEntries.createdAt)).limit(10);
        const observations = await db.select().from(parentObservations)
          .where(and(eq(parentObservations.childId, input.childId), eq(parentObservations.organizationId, orgId)))
          .orderBy(desc(parentObservations.createdAt)).limit(10);
        // SECURITY FIX: unlike the sibling activities/journals/observations
        // queries above, this one previously had no organizationId condition.
        const goals = await db.select().from(monthlyGrowthGoals)
          .where(and(eq(monthlyGrowthGoals.childId, input.childId), eq(monthlyGrowthGoals.organizationId, orgId)))
          .orderBy(desc(monthlyGrowthGoals.createdAt)).limit(5);
        const now = new Date();
        const periodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const [score] = await db.select().from(engagementScores)
          .where(and(
            eq(engagementScores.parentId, ctx.user.id),
            eq(engagementScores.childId, input.childId),
            eq(engagementScores.period, "monthly"),
            eq(engagementScores.periodValue, periodValue)
          ));

        const isArabic = input.language === "ar";
        const prompt = `Generate a family engagement report in ${isArabic ? "Arabic" : "English"} for a child.

Child: ${child.firstName} ${child.lastName}
Age: ${ageMonths} months
Period: ${input.period}

Engagement Data:
- Activities assigned: ${activities.length}, Completed: ${activities.filter(a => a.status === "completed").length}
- Journal entries: ${journals.length}
- Parent observations: ${observations.length}
- Goals: ${goals.length}, Completed: ${goals.filter(g => g.status === "completed").length}
- Engagement score: ${score?.score || 0}/100, Level: ${score?.level || "inactive"}
- Streak: ${score?.streak || 0} weeks

Recent observations: ${observations.slice(0, 5).map(o => o.observationText).join("; ")}

Generate a comprehensive family engagement report with:
1. Summary of family participation
2. Home learning highlights
3. Child's progress through home activities
4. Areas of strong engagement
5. Suggestions for improvement
6. Next month's focus areas

${isArabic ? "Write ENTIRELY in Arabic. Do not include any English words. Use warm, encouraging language." : "Write in clear, encouraging English."}

Return as JSON: {"title": "Report title", "sections": [{"heading": "Section heading", "content": "Section content"}], "summary": "Brief summary"}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are an early childhood education specialist generating family engagement reports. Return only valid JSON.` },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "engagement_report",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  sections: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } }, required: ["heading", "content"], additionalProperties: false } },
                  summary: { type: "string" },
                },
                required: ["title", "sections", "summary"],
                additionalProperties: false,
              },
            },
          },
        });

        const report = JSON.parse(String(response.choices[0].message.content) || "{}");
        const childName = child.arabicName || `${child.firstName} ${child.lastName}`;
        const [saved] = await db.insert(aiGeneratedContent).values({
          type: "progress_report",
          title: report.title || `تقرير مشاركة الأسرة - ${childName}`,
          content: { subType: "family_engagement_report", report, score: score || null },
          language: input.language,
          childId: input.childId,
          inputPrompt: JSON.stringify({ childId: input.childId, period: input.period, language: input.language }),
          createdBy: ctx.user.id,
          organizationId: orgId,
        });
        return { id: saved.insertId, report, child: { name: childName, age: ageMonths }, score: score || null };
      }),
  }),

  // ---- MODULE CONFIG ----
  
  config: router({
    get: tenantProcedure
      .query(async ({ ctx }) => {
        const db = (await getDb())!;
        const orgId = ctx.organizationId;
        const [config] = await db.select().from(familyEngagementConfig)
          .where(eq(familyEngagementConfig.organizationId, orgId));
        return config || { isEnabled: true, activitiesPerWeek: 3, challengesEnabled: true, journalEnabled: true, parentObservationsEnabled: true, chatbotEnabled: true, gamificationEnabled: true, autoGenerateGoals: true, defaultLanguage: "both" };
      }),

    update: tenantProcedure
      .input(z.object({
        isEnabled: z.boolean().optional(),
        activitiesPerWeek: z.number().min(1).max(10).optional(),
        challengesEnabled: z.boolean().optional(),
        journalEnabled: z.boolean().optional(),
        parentObservationsEnabled: z.boolean().optional(),
        chatbotEnabled: z.boolean().optional(),
        gamificationEnabled: z.boolean().optional(),
        autoGenerateGoals: z.boolean().optional(),
        defaultLanguage: z.enum(["ar", "en", "both"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!["admin", "principal", "owner", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = (await getDb())!;
        const orgId = ctx.organizationId;
        
        const [existing] = await db.select().from(familyEngagementConfig)
          .where(eq(familyEngagementConfig.organizationId, orgId));
        
        if (existing) {
          await db.update(familyEngagementConfig).set(input).where(eq(familyEngagementConfig.id, existing.id));
        } else {
          await db.insert(familyEngagementConfig).values({ ...input, organizationId: orgId } as any);
        }
        return { success: true };
      }),
  }),
});

// ============ HELPER FUNCTIONS ============

// SECURITY FIX: previously took an unused `_itemId` and never received/stored
// organizationId at all -- new engagementScores rows were inserted with
// childId: 0 and no organizationId, and the "existing" lookup below matched
// purely on parentId + period, with no organization scoping either. Now takes
// the real childId and organizationId and uses both.
async function updateEngagementScore(parentId: number, childId: number, organizationId: number, type: "activity" | "challenge" | "journal" | "observation" | "goal") {
  const db = (await getDb())!;
  const now = new Date();
  const periodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Get or create monthly score
  const [existing] = await db.select().from(engagementScores)
    .where(and(
      eq(engagementScores.parentId, parentId),
      eq(engagementScores.childId, childId),
      eq(engagementScores.organizationId, organizationId),
      eq(engagementScores.period, "monthly"),
      eq(engagementScores.periodValue, periodValue)
    ));

  const pointsMap = { activity: 5, challenge: 15, journal: 3, observation: 10, goal: 20 };
  const points = pointsMap[type] || 5;

  if (existing) {
    const updates: any = { totalPoints: existing.totalPoints + points };
    if (type === "activity") updates.activitiesCompleted = existing.activitiesCompleted + 1;
    if (type === "challenge") updates.challengesCompleted = existing.challengesCompleted + 1;
    if (type === "journal") updates.journalEntries = existing.journalEntries + 1;
    if (type === "observation") updates.observationsSubmitted = existing.observationsSubmitted + 1;
    if (type === "goal") updates.goalsCompleted = existing.goalsCompleted + 1;

    // Calculate score (0-100)
    const totalActions = (updates.activitiesCompleted || existing.activitiesCompleted) + 
      (updates.challengesCompleted || existing.challengesCompleted) * 3 +
      (updates.journalEntries || existing.journalEntries) +
      (updates.observationsSubmitted || existing.observationsSubmitted) * 2 +
      (updates.goalsCompleted || existing.goalsCompleted) * 4;
    updates.score = Math.min(100, Math.round(totalActions * 3.3));
    
    // Determine level
    if (updates.score >= 90) updates.level = "champion";
    else if (updates.score >= 70) updates.level = "highly_engaged";
    else if (updates.score >= 50) updates.level = "active";
    else if (updates.score >= 30) updates.level = "developing";
    else if (updates.score >= 10) updates.level = "emerging";
    else updates.level = "inactive";

    await db.update(engagementScores).set(updates).where(eq(engagementScores.id, existing.id));
  } else {
    const initial: any = {
      parentId,
      childId,
      organizationId,
      period: "monthly",
      periodValue,
      totalPoints: points,
      score: Math.min(100, points * 3),
      level: "emerging",
      streak: 1,
    };
    if (type === "activity") initial.activitiesCompleted = 1;
    if (type === "challenge") initial.challengesCompleted = 1;
    if (type === "journal") initial.journalEntries = 1;
    if (type === "observation") initial.observationsSubmitted = 1;
    if (type === "goal") initial.goalsCompleted = 1;

    await db.insert(engagementScores).values(initial);
  }
}

async function checkAndAwardBadges(parentId: number, orgId: number) {
  const db = (await getDb())!;
  
  // Get all active badges
  const badges = await db.select().from(achievementBadges)
    .where(and(eq(achievementBadges.isActive, true), eq(achievementBadges.organizationId, orgId)));
  
  // Get already earned badges
  const earned = await db.select().from(parentBadges)
    .where(eq(parentBadges.parentId, parentId));
  const earnedIds = new Set(earned.map(e => e.badgeId));

  // Get current stats
  const now = new Date();
  const periodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [score] = await db.select().from(engagementScores)
    .where(and(eq(engagementScores.parentId, parentId), eq(engagementScores.period, "monthly"), eq(engagementScores.periodValue, periodValue)));

  if (!score) return;

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;
    
    const criteria = badge.criteria as any;
    if (!criteria) continue;

    let earned = false;
    switch (criteria.type) {
      case "activities_completed":
        earned = score.activitiesCompleted >= criteria.count;
        break;
      case "challenges_completed":
        earned = score.challengesCompleted >= criteria.count;
        break;
      case "journal_entries":
        earned = score.journalEntries >= criteria.count;
        break;
      case "observations_submitted":
        earned = score.observationsSubmitted >= criteria.count;
        break;
      case "goals_completed":
        earned = score.goalsCompleted >= criteria.count;
        break;
      case "streak_weeks":
        earned = score.streak >= criteria.count;
        break;
      case "total_points":
        earned = score.totalPoints >= criteria.count;
        break;
    }

    if (earned) {
      await db.insert(parentBadges).values({
        parentId,
        badgeId: badge.id,
        organizationId: orgId,
      });
    }
  }
}
