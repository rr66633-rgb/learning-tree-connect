import { z } from "zod";
import { tenantProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  developmentAreas,
  developmentMilestones,
  developmentObservations,
  schoolReadinessScores,
  aiDevelopmentAnalysis,
  developmentRecommendations,
  developmentAlerts,
  childDevelopmentSummary,
  aiGeneratedContent,
  children,
  users,
} from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte, count, avg, inArray } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

// Helper: Get current academic year
function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

// Helper: Get current term period
function getCurrentTermPeriod(): "autumn_1" | "autumn_2" | "spring_1" | "spring_2" | "summer_1" | "summer_2" {
  const month = new Date().getMonth() + 1;
  if (month >= 9 && month <= 10) return "autumn_1";
  if (month >= 11 && month <= 12) return "autumn_2";
  if (month >= 1 && month <= 2) return "spring_1";
  if (month >= 3 && month <= 4) return "spring_2";
  if (month >= 5 && month <= 6) return "summer_1";
  return "summer_2";
}

// Helper: Convert level to numeric
function levelToNumber(level: string): number {
  switch (level) {
    case "emerging": return 1;
    case "developing": return 2;
    case "secure": return 3;
    case "exceeding": return 4;
    default: return 0;
  }
}

export const developmentRouter = router({
  // ============ DEVELOPMENT AREAS ============
  getAreas: tenantProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const areas = await db.select().from(developmentAreas).where(eq(developmentAreas.isActive, true)).orderBy(developmentAreas.sortOrder);
    // Structure as tree (parent areas with children)
    const parentAreas = areas.filter((a: any) => !a.parentAreaId);
    const result = parentAreas.map((parent: any) => ({
      ...parent,
      subAreas: areas.filter((a: any) => a.parentAreaId === parent.id),
    }));
    return result;
  }),

  getMilestones: tenantProcedure
    .input(z.object({ areaId: z.number().optional(), ageMonths: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [eq(developmentMilestones.isActive, true)];
      if (input.areaId) conditions.push(eq(developmentMilestones.areaId, input.areaId));
      if (input.ageMonths) {
        conditions.push(lte(developmentMilestones.ageRangeStart, input.ageMonths));
        conditions.push(gte(developmentMilestones.ageRangeEnd, input.ageMonths));
      }
      return db.select().from(developmentMilestones).where(and(...conditions)).orderBy(developmentMilestones.sortOrder);
    }),

  // ============ OBSERVATIONS ============
  createObservation: tenantProcedure
    .input(z.object({
      childId: z.number(),
      areaId: z.number(),
      level: z.enum(["emerging", "developing", "secure", "exceeding"]),
      confidenceLevel: z.enum(["low", "medium", "high"]).default("medium"),
      context: z.enum(["free_play", "guided_activity", "group_work", "outdoor", "routine", "assessment", "other"]).default("guided_activity"),
      observation: z.string().min(10),
      evidence: z.string().optional(),
      nextSteps: z.string().optional(),
      linkedMilestoneId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const orgId = ctx.organizationId;
      // SECURITY FIX: input.childId was previously trusted with no check that
      // the child belongs to the caller's organization -- any authenticated
      // user could create a development observation against another
      // organization's child, tagged with their own organizationId.
      const [ownedChild] = await db.select({ id: children.id }).from(children)
        .where(and(eq(children.id, input.childId), eq(children.organizationId, orgId)))
        .limit(1);
      if (!ownedChild) throw new TRPCError({ code: "NOT_FOUND", message: "الطفل غير موجود" });
      const [result] = await db.insert(developmentObservations).values({
        ...input,
        observedBy: ctx.user.id,
        termPeriod: getCurrentTermPeriod(),
        academicYear: getCurrentAcademicYear(),
        organizationId: orgId,
      });
      // Update child development summary
      await updateChildSummary(input.childId, orgId);
      return { id: result.insertId, message: "تم حفظ الملاحظة بنجاح" };
    }),

  listObservations: tenantProcedure
    .input(z.object({
      childId: z.number(),
      areaId: z.number().optional(),
      termPeriod: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.organizationId;
      const conditions: any[] = [
        eq(developmentObservations.childId, input.childId),
        eq(developmentObservations.organizationId, orgId),
      ];
      if (input.areaId) conditions.push(eq(developmentObservations.areaId, input.areaId));
      if (input.termPeriod) conditions.push(eq(developmentObservations.termPeriod, input.termPeriod as any));

      const observations = await db.select({
        observation: developmentObservations,
        area: developmentAreas,
        observer: { id: users.id, name: users.name },
      })
        .from(developmentObservations)
        .leftJoin(developmentAreas, eq(developmentObservations.areaId, developmentAreas.id))
        .leftJoin(users, eq(developmentObservations.observedBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(developmentObservations.observedAt))
        .limit(input.limit)
        .offset(input.offset);

      return observations;
    }),

  getChildProgress: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.organizationId;
      // Get all observations grouped by area
      const observations = await db.select({
        areaId: developmentObservations.areaId,
        level: developmentObservations.level,
        observedAt: developmentObservations.observedAt,
        termPeriod: developmentObservations.termPeriod,
      })
        .from(developmentObservations)
        .where(and(
          eq(developmentObservations.childId, input.childId),
          eq(developmentObservations.organizationId, orgId),
        ))
        .orderBy(developmentObservations.observedAt);

      // Get areas
      const areas = await db.select().from(developmentAreas).where(eq(developmentAreas.isActive, true));
      const parentAreas = areas.filter((a: any) => !a.parentAreaId);

      // Calculate progress per area
      const progress = parentAreas.map((area: any) => {
        const areaObs = observations.filter((o: any) => o.areaId === area.id || areas.find((a: any) => a.parentAreaId === area.id && a.id === o.areaId));
        const latestLevel = areaObs.length > 0 ? areaObs[areaObs.length - 1].level : null;
        const avgLevel = areaObs.length > 0 ? areaObs.reduce((sum: number, o: any) => sum + levelToNumber(o.level), 0) / areaObs.length : 0;
        return {
          area,
          observationCount: areaObs.length,
          latestLevel,
          averageLevel: Math.round(avgLevel * 100) / 100,
          trend: calculateTrend(areaObs),
        };
      });

      return progress;
    }),

  // ============ SCHOOL READINESS ============
  getReadinessScores: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.organizationId;
      const scores = await db.select()
        .from(schoolReadinessScores)
        .where(and(
          eq(schoolReadinessScores.childId, input.childId),
          eq(schoolReadinessScores.organizationId, orgId),
        ))
        .orderBy(desc(schoolReadinessScores.assessedAt));
      return scores;
    }),

  generateReadinessScore: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const orgId = ctx.organizationId;
      // Get all observations for this child
      const observations = await db.select({
        observation: developmentObservations,
        area: developmentAreas,
      })
        .from(developmentObservations)
        .leftJoin(developmentAreas, eq(developmentObservations.areaId, developmentAreas.id))
        .where(and(
          eq(developmentObservations.childId, input.childId),
          eq(developmentObservations.organizationId, orgId),
        ))
        .orderBy(desc(developmentObservations.observedAt))
        .limit(30);

      if (observations.length < 3) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يكون هناك 3 ملاحظات على الأقل لتوليد درجة الجاهزية" });
      }

      // Get child info
      const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, orgId)));
      if (!child) throw new TRPCError({ code: "NOT_FOUND", message: "الطفل غير موجود" });

      const observationSummary = observations.map((o: any) => ({
        area: o.area?.nameEn,
        level: o.observation.level,
        observation: o.observation.observation,
        context: o.observation.context,
      }));

      // Use AI to generate readiness scores
      const prompt = `You are an early years education specialist assessing school readiness based on EYFS framework.

Child: ${child.firstName} ${child.lastName}
Date of Birth: ${child.dateOfBirth}
Age: approximately ${calculateAgeMonths(child.dateOfBirth as any)} months

Recent observations (${observations.length} total):
${JSON.stringify(observationSummary, null, 2)}

Based on these observations, generate school readiness scores (0-100) for each dimension:
1. Language Readiness - Communication, vocabulary, understanding instructions
2. Social Readiness - Peer interaction, sharing, group participation
3. Emotional Readiness - Self-regulation, independence, confidence
4. Cognitive Readiness - Problem solving, curiosity, concentration
5. Physical Readiness - Fine motor, gross motor, self-care

Return ONLY a JSON object with this exact structure:
{
  "languageReadiness": <number 0-100>,
  "socialReadiness": <number 0-100>,
  "emotionalReadiness": <number 0-100>,
  "cognitiveReadiness": <number 0-100>,
  "physicalReadiness": <number 0-100>,
  "overallReadiness": <number 0-100>,
  "notes": "<brief assessment summary in Arabic>"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an EYFS specialist. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "readiness_scores",
            strict: true,
            schema: {
              type: "object",
              properties: {
                languageReadiness: { type: "integer" },
                socialReadiness: { type: "integer" },
                emotionalReadiness: { type: "integer" },
                cognitiveReadiness: { type: "integer" },
                physicalReadiness: { type: "integer" },
                overallReadiness: { type: "integer" },
                notes: { type: "string" },
              },
              required: ["languageReadiness", "socialReadiness", "emotionalReadiness", "cognitiveReadiness", "physicalReadiness", "overallReadiness", "notes"],
              additionalProperties: false,
            },
          },
        },
      });

      const scores = JSON.parse(String(response.choices[0].message.content) || "{}");

      // Save scores
      // SECURITY FIX: previously omitted organizationId entirely --
      // schoolReadinessScores.organizationId is NOT NULL with no default,
      // so this would fail outright; now stamped with the already-verified orgId.
      const [result] = await db.insert(schoolReadinessScores).values({
        childId: input.childId,
        assessedBy: ctx.user.id,
        organizationId: orgId,
        languageReadiness: Math.min(100, Math.max(0, scores.languageReadiness)),
        socialReadiness: Math.min(100, Math.max(0, scores.socialReadiness)),
        emotionalReadiness: Math.min(100, Math.max(0, scores.emotionalReadiness)),
        cognitiveReadiness: Math.min(100, Math.max(0, scores.cognitiveReadiness)),
        physicalReadiness: Math.min(100, Math.max(0, scores.physicalReadiness)),
        overallReadiness: Math.min(100, Math.max(0, scores.overallReadiness)),
        aiGenerated: true,
        notes: scores.notes,
        termPeriod: getCurrentTermPeriod(),
        academicYear: getCurrentAcademicYear(),
      });

      return { id: result.insertId, scores, message: "تم توليد درجة الجاهزية المدرسية بنجاح" };
    }),

  // ============ AI ANALYSIS ENGINE ============
  analyzeChild: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const orgId = ctx.organizationId;
      // Get observations
      const observations = await db.select({
        observation: developmentObservations,
        area: developmentAreas,
      })
        .from(developmentObservations)
        .leftJoin(developmentAreas, eq(developmentObservations.areaId, developmentAreas.id))
        .where(and(
          eq(developmentObservations.childId, input.childId),
          eq(developmentObservations.organizationId, orgId),
        ))
        .orderBy(desc(developmentObservations.observedAt))
        .limit(50);

      if (observations.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يكون هناك ملاحظتان على الأقل لإجراء التحليل" });
      }

      const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, orgId)));
      if (!child) throw new TRPCError({ code: "NOT_FOUND", message: "الطفل غير موجود" });

      const observationData = observations.map((o: any) => ({
        area: o.area?.nameEn,
        areaAr: o.area?.nameAr,
        level: o.observation.level,
        observation: o.observation.observation,
        context: o.observation.context,
        date: o.observation.observedAt,
      }));

      const prompt = `You are an expert early years education specialist using the British EYFS framework.

Analyze the following observations for a child and provide a comprehensive development analysis.

Child: ${child.firstName} ${child.lastName}
Age: approximately ${calculateAgeMonths(child.dateOfBirth as any)} months
Total observations: ${observations.length}

Observations:
${JSON.stringify(observationData, null, 2)}

Provide a comprehensive analysis in the following JSON structure:
{
  "strengths": [{"area": "area name", "areaAr": "اسم المجال", "description": "English description", "descriptionAr": "وصف بالعربي"}],
  "concerns": [{"area": "area name", "areaAr": "اسم المجال", "description": "English description", "descriptionAr": "وصف بالعربي", "severity": "low|medium|high"}],
  "classroomActivities": [{"title": "English title", "titleAr": "عنوان بالعربي", "area": "area name", "description": "English description", "descriptionAr": "وصف بالعربي"}],
  "homeActivities": [{"title": "English title", "titleAr": "عنوان بالعربي", "area": "area name", "description": "English description", "descriptionAr": "وصف بالعربي"}],
  "interventionSuggestions": [{"title": "English title", "titleAr": "عنوان بالعربي", "priority": "low|medium|high|urgent", "description": "English description", "descriptionAr": "وصف بالعربي"}],
  "overallSummary": "English summary",
  "overallSummaryAr": "ملخص بالعربي"
}

Important: Ensure all Arabic content is culturally appropriate and respects Islamic values. Focus on nature-inspired activities. Never suggest activities involving animals that are not appropriate in Islamic culture.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an EYFS specialist. Return only valid JSON. All Arabic text must be exclusively in Arabic with no English words mixed in." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "development_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                strengths: { type: "array", items: { type: "object", properties: { area: { type: "string" }, areaAr: { type: "string" }, description: { type: "string" }, descriptionAr: { type: "string" } }, required: ["area", "areaAr", "description", "descriptionAr"], additionalProperties: false } },
                concerns: { type: "array", items: { type: "object", properties: { area: { type: "string" }, areaAr: { type: "string" }, description: { type: "string" }, descriptionAr: { type: "string" }, severity: { type: "string" } }, required: ["area", "areaAr", "description", "descriptionAr", "severity"], additionalProperties: false } },
                classroomActivities: { type: "array", items: { type: "object", properties: { title: { type: "string" }, titleAr: { type: "string" }, area: { type: "string" }, description: { type: "string" }, descriptionAr: { type: "string" } }, required: ["title", "titleAr", "area", "description", "descriptionAr"], additionalProperties: false } },
                homeActivities: { type: "array", items: { type: "object", properties: { title: { type: "string" }, titleAr: { type: "string" }, area: { type: "string" }, description: { type: "string" }, descriptionAr: { type: "string" } }, required: ["title", "titleAr", "area", "description", "descriptionAr"], additionalProperties: false } },
                interventionSuggestions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, titleAr: { type: "string" }, priority: { type: "string" }, description: { type: "string" }, descriptionAr: { type: "string" } }, required: ["title", "titleAr", "priority", "description", "descriptionAr"], additionalProperties: false } },
                overallSummary: { type: "string" },
                overallSummaryAr: { type: "string" },
              },
              required: ["strengths", "concerns", "classroomActivities", "homeActivities", "interventionSuggestions", "overallSummary", "overallSummaryAr"],
              additionalProperties: false,
            },
          },
        },
      });

      const analysis = JSON.parse(String(response.choices[0].message.content) || "{}");

      // Save analysis
      await db.insert(aiDevelopmentAnalysis).values({
        childId: input.childId,
        analysisType: "full_report",
        content: JSON.stringify(analysis),
        contentAr: analysis.overallSummaryAr,
        confidence: "0.85",
        basedOnObservations: observations.length,
        termPeriod: getCurrentTermPeriod(),
        academicYear: getCurrentAcademicYear(),
        organizationId: orgId,
      });

      // Save recommendations
      const allActivities = [
        ...analysis.classroomActivities.map((a: any) => ({ ...a, type: "classroom_activity" as const })),
        ...analysis.homeActivities.map((a: any) => ({ ...a, type: "home_activity" as const })),
        ...analysis.interventionSuggestions.map((a: any) => ({ ...a, type: "intervention" as const })),
      ];

      const allAreas = await db.select().from(developmentAreas).where(eq(developmentAreas.isActive, true));
      for (const activity of allActivities.slice(0, 10)) {
        const matchedArea = allAreas.find((a: any) => a.nameEn === activity.area || a.code === activity.area);
        await db.insert(developmentRecommendations).values({
          childId: input.childId,
          areaId: matchedArea?.id || 1,
          type: activity.type,
          titleEn: activity.title,
          titleAr: activity.titleAr,
          descriptionEn: activity.description,
          descriptionAr: activity.descriptionAr,
          priority: activity.priority || "medium",
          aiGenerated: true,
          organizationId: orgId,
        });
      }

      // Generate alerts if concerns exist
      for (const concern of analysis.concerns.filter((c: any) => c.severity === "high")) {
        const matchedArea = allAreas.find((a: any) => a.nameEn === concern.area);
        await db.insert(developmentAlerts).values({
          childId: input.childId,
          areaId: matchedArea?.id || null,
          alertType: "below_expectations",
          severity: "warning",
          titleEn: `Concern: ${concern.area}`,
          titleAr: `مخاوف: ${concern.areaAr}`,
          descriptionEn: concern.description,
          descriptionAr: concern.descriptionAr,
          suggestedAction: JSON.stringify(analysis.interventionSuggestions.slice(0, 3)),
          organizationId: orgId,
        });
      }

      // Update summary
      await updateChildSummary(input.childId, orgId);

      await db.insert(aiGeneratedContent).values({
        type: "progress_report",
        title: `تحليل النمو - ${child.arabicName || `${child.firstName} ${child.lastName}`}`,
        content: { subType: "development_analysis", ...analysis },
        language: "bilingual",
        childId: input.childId,
        inputPrompt: JSON.stringify({ childId: input.childId, sourceObservations: observations.length }),
        createdBy: ctx.user.id,
        organizationId: orgId,
      });

      return { analysis, message: "تم إنشاء التحليل بنجاح" };
    }),

  getLatestAnalysis: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = ctx.organizationId;
      const [latest] = await db.select()
        .from(aiDevelopmentAnalysis)
        .where(and(
          eq(aiDevelopmentAnalysis.childId, input.childId),
          eq(aiDevelopmentAnalysis.organizationId, orgId),
          eq(aiDevelopmentAnalysis.analysisType, "full_report"),
        ))
        .orderBy(desc(aiDevelopmentAnalysis.generatedAt))
        .limit(1);
      if (!latest) return null;
      return { ...latest, content: JSON.parse(latest.content) };
    }),

  // ============ RECOMMENDATIONS ============
  getRecommendations: tenantProcedure
    .input(z.object({
      childId: z.number(),
      type: z.enum(["classroom_activity", "home_activity", "intervention", "enrichment", "parent_tip"]).optional(),
      status: z.enum(["pending", "in_progress", "completed", "dismissed"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.organizationId;
      const conditions: any[] = [
        eq(developmentRecommendations.childId, input.childId),
        eq(developmentRecommendations.organizationId, orgId),
      ];
      if (input.type) conditions.push(eq(developmentRecommendations.type, input.type));
      if (input.status) conditions.push(eq(developmentRecommendations.status, input.status));

      return db.select({
        recommendation: developmentRecommendations,
        area: developmentAreas,
      })
        .from(developmentRecommendations)
        .leftJoin(developmentAreas, eq(developmentRecommendations.areaId, developmentAreas.id))
        .where(and(...conditions))
        .orderBy(desc(developmentRecommendations.createdAt));
    }),

  updateRecommendationStatus: tenantProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "in_progress", "completed", "dismissed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // SECURITY FIX: previously updated by id alone with no organization
      // check -- any user could change another organization's recommendation.
      const [existingRec] = await db.select({ organizationId: developmentRecommendations.organizationId }).from(developmentRecommendations).where(eq(developmentRecommendations.id, input.id)).limit(1);
      if (!existingRec || existingRec.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.update(developmentRecommendations)
        .set({
          status: input.status,
          completedAt: input.status === "completed" ? new Date() : null,
          completedBy: input.status === "completed" ? ctx.user.id : null,
        })
        .where(eq(developmentRecommendations.id, input.id));
      return { message: "تم تحديث حالة التوصية" };
    }),

  // ============ ALERTS ============
  getAlerts: tenantProcedure
    .input(z.object({
      childId: z.number().optional(),
      status: z.enum(["active", "acknowledged", "resolved", "dismissed"]).optional(),
      severity: z.enum(["info", "warning", "critical"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const orgId = ctx.organizationId;
      const conditions: any[] = [eq(developmentAlerts.organizationId, orgId)];
      if (input.childId) conditions.push(eq(developmentAlerts.childId, input.childId));
      if (input.status) conditions.push(eq(developmentAlerts.status, input.status));
      if (input.severity) conditions.push(eq(developmentAlerts.severity, input.severity));

      return db.select({
        alert: developmentAlerts,
        child: { id: children.id, firstName: children.firstName, lastName: children.lastName },
        area: developmentAreas,
      })
        .from(developmentAlerts)
        .leftJoin(children, eq(developmentAlerts.childId, children.id))
        .leftJoin(developmentAreas, eq(developmentAlerts.areaId, developmentAreas.id))
        .where(and(...conditions))
        .orderBy(desc(developmentAlerts.createdAt));
    }),

  acknowledgeAlert: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // SECURITY FIX: previously updated by id alone with no organization
      // check -- any user could acknowledge another organization's alert.
      const [existingAlert] = await db.select({ organizationId: developmentAlerts.organizationId }).from(developmentAlerts).where(eq(developmentAlerts.id, input.id)).limit(1);
      if (!existingAlert || existingAlert.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.update(developmentAlerts)
        .set({ status: "acknowledged", acknowledgedBy: ctx.user.id, acknowledgedAt: new Date() })
        .where(eq(developmentAlerts.id, input.id));
      return { message: "تم الإقرار بالتنبيه" };
    }),

  resolveAlert: tenantProcedure
    .input(z.object({ id: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // SECURITY FIX: previously updated by id alone with no organization
      // check -- any user could resolve another organization's alert.
      const [existingAlert] = await db.select({ organizationId: developmentAlerts.organizationId }).from(developmentAlerts).where(eq(developmentAlerts.id, input.id)).limit(1);
      if (!existingAlert || existingAlert.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.update(developmentAlerts)
        .set({ status: "resolved", resolvedBy: ctx.user.id, resolvedAt: new Date(), resolutionNotes: input.notes || null })
        .where(eq(developmentAlerts.id, input.id));
      return { message: "تم حل التنبيه" };
    }),

  // ============ TEACHER DASHBOARD ============
  teacherDashboard: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalChildren: 0, childrenNeedingAttention: 0, childrenExceeding: 0, childrenBelowExpected: 0, missingAssessments: 0, activeAlerts: 0, recentAlerts: [], childrenNeedingAttentionList: [], exceedingList: [], belowExpectedList: [], missingAssessmentsList: [] };
    const orgId = ctx.organizationId;

    // Get all children in this org
    const allChildren = await db.select().from(children).where(and(eq(children.organizationId, orgId), eq(children.status, "active")));

    // Get active alerts
    const activeAlerts = await db.select()
      .from(developmentAlerts)
      .where(and(eq(developmentAlerts.organizationId, orgId), eq(developmentAlerts.status, "active")));

    // Get children with summaries
    const summaries = await db.select()
      .from(childDevelopmentSummary)
      .where(eq(childDevelopmentSummary.organizationId, orgId));

    // Children needing attention (have active alerts or below average)
    const childrenWithAlerts = Array.from(new Set(activeAlerts.map((a: any) => a.childId)));

    // Children exceeding expectations
    const exceedingChildren = summaries.filter(s => s.averageLevel && parseFloat(String(s.averageLevel)) >= 3.5);

    // Children below expected
    const belowExpected = summaries.filter(s => s.averageLevel && parseFloat(String(s.averageLevel)) < 1.5);

    // Children missing assessments (no observations in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const missingAssessments = allChildren.filter(child => {
      const summary = summaries.find(s => s.childId === child.id);
      if (!summary || !summary.lastObservationDate) return true;
      return new Date(summary.lastObservationDate) < thirtyDaysAgo;
    });

    return {
      totalChildren: allChildren.length,
      childrenNeedingAttention: childrenWithAlerts.length,
      childrenExceeding: exceedingChildren.length,
      childrenBelowExpected: belowExpected.length,
      missingAssessments: missingAssessments.length,
      activeAlerts: activeAlerts.length,
      recentAlerts: activeAlerts.slice(0, 5),
      childrenNeedingAttentionList: allChildren.filter(c => childrenWithAlerts.includes(c.id)).slice(0, 10),
      exceedingList: allChildren.filter(c => exceedingChildren.some(s => s.childId === c.id)).slice(0, 10),
      belowExpectedList: allChildren.filter(c => belowExpected.some(s => s.childId === c.id)).slice(0, 10),
      missingAssessmentsList: missingAssessments.slice(0, 10),
    };
  }),

  // ============ BENCHMARKING ============
  getBenchmark: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const orgId = ctx.organizationId;

      // Get child info
      const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, orgId)));
      if (!child) throw new TRPCError({ code: "NOT_FOUND" });

      const ageMonths = calculateAgeMonths(child.dateOfBirth as any);

      // Get child's observations
      const childObs = await db.select()
        .from(developmentObservations)
        .where(and(eq(developmentObservations.childId, input.childId), eq(developmentObservations.organizationId, orgId)));

      // Get class average (all children in same org)
      const allObs = await db.select({
        areaId: developmentObservations.areaId,
        level: developmentObservations.level,
      })
        .from(developmentObservations)
        .where(eq(developmentObservations.organizationId, orgId));

      // Get EYFS expectations for this age
      const milestones = await db.select()
        .from(developmentMilestones)
        .where(and(
          lte(developmentMilestones.ageRangeStart, ageMonths),
          gte(developmentMilestones.ageRangeEnd, ageMonths),
        ));

      // Get areas
      const areas = await db.select().from(developmentAreas).where(and(eq(developmentAreas.isActive, true), sql`${developmentAreas.parentAreaId} IS NULL`));

      // Calculate benchmarks per area
      const benchmarks = areas.map((area: any) => {
        const childAreaObs = childObs.filter((o: any) => o.areaId === area.id);
        const classAreaObs = allObs.filter((o: any) => o.areaId === area.id);
        const areaMilestones = milestones.filter((m: any) => m.areaId === area.id);

        const childAvg = childAreaObs.length > 0 ? childAreaObs.reduce((s: number, o: any) => s + levelToNumber(o.level), 0) / childAreaObs.length : 0;
        const classAvg = classAreaObs.length > 0 ? classAreaObs.reduce((s: number, o: any) => s + levelToNumber(o.level), 0) / classAreaObs.length : 0;
        const expectedAvg = areaMilestones.length > 0 ? areaMilestones.reduce((s: number, m: any) => s + levelToNumber(m.expectedLevel), 0) / areaMilestones.length : 2;

        return {
          area,
          childLevel: Math.round(childAvg * 100) / 100,
          classAverage: Math.round(classAvg * 100) / 100,
          eyfsExpectation: Math.round(expectedAvg * 100) / 100,
          vsClass: childAvg - classAvg,
          vsExpectation: childAvg - expectedAvg,
        };
      });

      // Get previous term scores for comparison
      const previousScores = await db.select()
        .from(schoolReadinessScores)
        .where(and(eq(schoolReadinessScores.childId, input.childId), eq(schoolReadinessScores.organizationId, orgId)))
        .orderBy(desc(schoolReadinessScores.assessedAt))
        .limit(3) as any[];

      return { benchmarks, previousScores, ageMonths };
    }),

  // ============ CHILD SUMMARY ============
  getChildSummary: tenantProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = ctx.organizationId;
      const [summary] = await db.select()
        .from(childDevelopmentSummary)
        .where(and(eq(childDevelopmentSummary.childId, input.childId), eq(childDevelopmentSummary.organizationId, orgId)));
      return summary || null;
    }),

  // ============ REPORT GENERATION ============
  generateReport: tenantProcedure
    .input(z.object({
      childId: z.number(),
      language: z.enum(["ar", "en"]).default("ar"),
      type: z.enum(["professional", "parent"]).default("parent"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const orgId = ctx.organizationId;

      // Get child
      const [child] = await db.select().from(children).where(and(eq(children.id, input.childId), eq(children.organizationId, orgId)));
      if (!child) throw new TRPCError({ code: "NOT_FOUND" });

      // Get observations
      const observations = await db.select({
        observation: developmentObservations,
        area: developmentAreas,
      })
        .from(developmentObservations)
        .leftJoin(developmentAreas, eq(developmentObservations.areaId, developmentAreas.id))
        .where(and(eq(developmentObservations.childId, input.childId), eq(developmentObservations.organizationId, orgId)))
        .orderBy(desc(developmentObservations.observedAt))
        .limit(30);

      // Get readiness scores
      const [latestReadiness] = await db.select()
        .from(schoolReadinessScores)
        .where(and(eq(schoolReadinessScores.childId, input.childId), eq(schoolReadinessScores.organizationId, orgId)))
        .orderBy(desc(schoolReadinessScores.assessedAt))
        .limit(1);

      // Get latest analysis
      const [latestAnalysis] = await db.select()
        .from(aiDevelopmentAnalysis)
        .where(and(eq(aiDevelopmentAnalysis.childId, input.childId), eq(aiDevelopmentAnalysis.organizationId, orgId)))
        .orderBy(desc(aiDevelopmentAnalysis.generatedAt))
        .limit(1);

      const childName = `${child.firstName} ${child.lastName}`;

      const isArabic = input.language === "ar";
      const isProfessional = input.type === "professional";

      const prompt = `Generate a ${isProfessional ? "professional detailed" : "parent-friendly"} child development report in ${isArabic ? "Arabic" : "English"}.

Child: ${childName}
Age: ${calculateAgeMonths(child.dateOfBirth as any)} months
Term: ${getCurrentTermPeriod()}
Academic Year: ${getCurrentAcademicYear()}

Observations (${observations.length}):
${observations.map(o => `- [${o.area?.nameEn}] Level: ${o.observation.level} - ${o.observation.observation}`).join("\n")}

${latestReadiness ? `School Readiness Scores:
- Language: ${latestReadiness.languageReadiness}%
- Social: ${latestReadiness.socialReadiness}%
- Emotional: ${latestReadiness.emotionalReadiness}%
- Cognitive: ${latestReadiness.cognitiveReadiness}%
- Physical: ${latestReadiness.physicalReadiness}%
- Overall: ${latestReadiness.overallReadiness}%` : "No readiness scores yet."}

${latestAnalysis ? `Previous Analysis: ${latestAnalysis.content}` : ""}

Generate a comprehensive report with:
${isProfessional ? `
1. Executive Summary
2. Development Profile (per EYFS area)
3. Detailed Observations Analysis
4. School Readiness Assessment
5. Strengths & Areas for Development
6. Recommendations & Next Steps
7. Professional Notes` : `
1. Summary of Progress
2. What your child is doing well
3. Areas we're working on together
4. How you can help at home
5. School Readiness Overview
6. Next Steps`}

${isArabic ? "Write ENTIRELY in Arabic. Do not include any English words." : "Write in clear, professional English."}
${!isProfessional ? (isArabic ? "Use warm, encouraging language that parents can easily understand." : "Use warm, encouraging language that parents can easily understand.") : ""}

Return the report as a JSON object:
{
  "title": "Report title",
  "sections": [{"heading": "Section heading", "content": "Section content in markdown format"}],
  "summary": "Brief one-paragraph summary"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are an EYFS specialist generating ${isProfessional ? "professional" : "parent-friendly"} development reports. Return only valid JSON.` },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "development_report",
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
      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "progress_report",
        title: report.title || `${isProfessional ? "تقرير نمو مهني" : "تقرير نمو للأسرة"} - ${childName}`,
        content: { subType: "development_report", report },
        language: input.language,
        childId: input.childId,
        inputPrompt: JSON.stringify({ childId: input.childId, language: input.language, reportType: input.type }),
        createdBy: ctx.user.id,
        organizationId: orgId,
      });
      return { id: saved.insertId, report, child: { name: childName, age: calculateAgeMonths(child.dateOfBirth as any) } };
    }),
});

// Helper: Calculate age in months
function calculateAgeMonths(dateOfBirth: string | Date | null): number {
  if (!dateOfBirth) return 36; // default
  const dob = new Date(dateOfBirth);
  const now = new Date();
  return Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

// Helper: Calculate trend from observations
function calculateTrend(observations: { level: string; observedAt: Date | null }[]): "improving" | "stable" | "declining" {
  if (observations.length < 3) return "stable";
  const recent = observations.slice(-3).map(o => levelToNumber(o.level));
  const earlier = observations.slice(0, 3).map(o => levelToNumber(o.level));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  if (recentAvg - earlierAvg > 0.3) return "improving";
  if (earlierAvg - recentAvg > 0.3) return "declining";
  return "stable";
}

// Helper: Update child development summary
async function updateChildSummary(childId: number, orgId: number) {
  const db = await getDb();
  if (!db) return;
  const observations = await db.select()
    .from(developmentObservations)
    .where(and(eq(developmentObservations.childId, childId), eq(developmentObservations.organizationId, orgId)));

  const avgLevel = observations.length > 0
    ? observations.reduce((sum, o) => sum + levelToNumber(o.level), 0) / observations.length
    : 0;

  const lastObs = observations.length > 0 ? observations.sort((a, b) => (b.observedAt?.getTime() || 0) - (a.observedAt?.getTime() || 0))[0] : null;

  // Find strongest and weakest areas
  const areaScores: Record<number, { sum: number; count: number }> = {};
  observations.forEach(o => {
    if (!areaScores[o.areaId]) areaScores[o.areaId] = { sum: 0, count: 0 };
    areaScores[o.areaId].sum += levelToNumber(o.level);
    areaScores[o.areaId].count++;
  });

  const areaAvgs = Object.entries(areaScores).map(([id, s]) => ({ id: parseInt(id), avg: s.sum / s.count }));
  const strongest = areaAvgs.sort((a, b) => b.avg - a.avg)[0];
  const weakest = areaAvgs.sort((a, b) => a.avg - b.avg)[0];

  // Get active alerts count
  const alerts = await db.select({ cnt: count() })
    .from(developmentAlerts)
    .where(and(eq(developmentAlerts.childId, childId), eq(developmentAlerts.status, "active")));

  // Upsert summary
  const [existing] = await db.select()
    .from(childDevelopmentSummary)
    .where(and(eq(childDevelopmentSummary.childId, childId), eq(childDevelopmentSummary.organizationId, orgId)));

  const summaryData = {
    childId,
    totalObservations: observations.length,
    lastObservationDate: lastObs?.observedAt || null,
    averageLevel: String(Math.round(avgLevel * 100) / 100),
    strongestAreaId: strongest?.id || null,
    weakestAreaId: weakest?.id || null,
    alertCount: alerts[0]?.cnt || 0,
    termPeriod: getCurrentTermPeriod(),
    academicYear: getCurrentAcademicYear(),
    organizationId: orgId,
  };

  if (existing) {
    await db.update(childDevelopmentSummary).set(summaryData).where(eq(childDevelopmentSummary.id, existing.id));
  } else {
    await db.insert(childDevelopmentSummary).values(summaryData);
  }
}
