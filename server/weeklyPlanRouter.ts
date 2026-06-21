import { protectedProcedure, router } from "./_core/trpc";
import { safeJsonParse } from "./jsonParser";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { weeklyPlans, children, parentChildren, classes, notifications, pushSubscriptions } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sendPushToUsers } from "./_core/webPush";

let _db: any = null;
async function getDb() {
  if (!_db) {
    const mysql2 = await import("mysql2/promise");
    const pool = mysql2.createPool({ uri: ENV.databaseUrl, waitForConnections: true, connectionLimit: 5 });
    _db = drizzle(pool);
  }
  return _db!;
}

// Middleware: only teachers and admins can use weekly plan features
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== 'admin' && role !== 'super_admin' && role !== 'principal' && role !== 'teacher' && role !== 'assistant') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Weekly plan features are restricted to staff members' });
  }
  return next({ ctx });
});

// Cultural guidelines for Saudi Arabia
const CULTURAL_GUIDELINES = `
قواعد ثقافية مهمة يجب الالتزام بها:
- المحتوى يجب أن يحترم القيم الإسلامية والعربية
- لا تذكر: الخنازير، الكحول، القمار، السحر، الهالوين، الصلبان، الكنائس، قوس قزح
- ركز على مواضيع الطبيعة والتعليم والقيم الإسلامية
- استخدم أمثلة من البيئة السعودية والعربية
- لا تذكر مبالغ مالية محددة
`;

const SECTION_TYPES = [
  "theme_overview",
  "learning_objectives",
  "arabic_activities",
  "english_activities",
  "math_activities",
  "science_activities",
  "art_activities",
  "sensory_activities",
  "physical_activities",
  "quran_islamic",
  "story_of_week",
  "song_of_week",
  "home_activity",
  "parent_notes"
] as const;

const SECTION_LABELS_AR: Record<string, string> = {
  theme_overview: "نظرة عامة على الموضوع",
  learning_objectives: "أهداف التعلم",
  arabic_activities: "أنشطة اللغة العربية",
  english_activities: "أنشطة اللغة الإنجليزية",
  math_activities: "أنشطة الرياضيات",
  science_activities: "أنشطة العلوم",
  art_activities: "أنشطة الفنون",
  sensory_activities: "أنشطة حسية",
  physical_activities: "أنشطة بدنية",
  quran_islamic: "القرآن والدراسات الإسلامية",
  story_of_week: "قصة الأسبوع",
  song_of_week: "نشيد الأسبوع",
  home_activity: "نشاط منزلي",
  parent_notes: "ملاحظات لأولياء الأمور"
};

const SECTION_LABELS_EN: Record<string, string> = {
  theme_overview: "Weekly Theme Overview",
  learning_objectives: "Learning Objectives",
  arabic_activities: "Arabic Activities",
  english_activities: "English Activities",
  math_activities: "Math Activities",
  science_activities: "Science Activities",
  art_activities: "Art Activities",
  sensory_activities: "Sensory Activities",
  physical_activities: "Physical Activities",
  quran_islamic: "Quran and Islamic Studies",
  story_of_week: "Story of the Week",
  song_of_week: "Song of the Week",
  home_activity: "Home Activity",
  parent_notes: "Parent Notes"
};

const AGE_GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  nursery: { ar: "الحضانة (٢-٣ سنوات)", en: "Nursery (2-3 years)" },
  kg1: { ar: "تمهيدي أول (٣-٤ سنوات)", en: "KG1 (3-4 years)" },
  kg2: { ar: "تمهيدي ثاني (٤-٥ سنوات)", en: "KG2 (4-5 years)" },
  kg3: { ar: "تمهيدي ثالث (٥-٦ سنوات)", en: "KG3 (5-6 years)" },
};

function buildGenerationPrompt(input: { ageGroup: string; theme: string; language: string; weekStart: string; weekEnd: string }) {
  const ageLabel = AGE_GROUP_LABELS[input.ageGroup] || { ar: input.ageGroup, en: input.ageGroup };
  const isArabic = input.language === "ar";
  const isBilingual = input.language === "bilingual";

  const sectionsList = SECTION_TYPES.map(s => {
    const label = isArabic ? SECTION_LABELS_AR[s] : SECTION_LABELS_EN[s];
    return `"${s}": "${label}"`;
  }).join("\n  ");

  if (isArabic || isBilingual) {
    return `أنتِ خبيرة مناهج رياض أطفال في المملكة العربية السعودية متخصصة في إطار EYFS (المرحلة التأسيسية للسنوات المبكرة).

مهمتك: إنشاء خطة أسبوعية كاملة ومفصلة وجاهزة للاستخدام.

المعلومات:
- الفئة العمرية: ${ageLabel.ar}
- الموضوع الأسبوعي: ${input.theme}
- الأسبوع: من ${input.weekStart} إلى ${input.weekEnd}
${isBilingual ? "- اللغة: ثنائي اللغة (عربي وإنجليزي)" : "- اللغة: عربي فقط"}

${CULTURAL_GUIDELINES}

متطلبات الجودة:
- الأنشطة يجب أن تكون مناسبة للعمر ومتوافقة مع إطار EYFS
- كل قسم يجب أن يكون مفصلاً وعملياً وجاهزاً للتطبيق المباشر
- يجب تضمين القيم الإسلامية والثقافة السعودية
- الأنشطة يجب أن تكون متنوعة وممتعة وتفاعلية
- كل نشاط يتضمن: الوصف، المواد المطلوبة، الخطوات، المدة، طريقة التقييم

أنشئي خطة أسبوعية كاملة بصيغة JSON تحتوي على الأقسام الـ 14 التالية:

{
  ${sectionsList}
}

لكل قسم، اكتبي محتوى مفصلاً وعملياً. التفاصيل المطلوبة لكل قسم:

1. theme_overview: نظرة شاملة عن الموضوع وأهميته وكيف سيتم استكشافه خلال الأسبوع (3-5 جمل)
2. learning_objectives: قائمة بـ 5-7 أهداف تعليمية محددة وقابلة للقياس مرتبطة بمجالات EYFS
3. arabic_activities: 3-4 أنشطة لغة عربية (كل نشاط يشمل: العنوان، الوصف، المواد، المدة، طريقة التنفيذ)
4. english_activities: 3-4 أنشطة لغة إنجليزية (كل نشاط يشمل: العنوان، الوصف، المواد، المدة، طريقة التنفيذ)
5. math_activities: 3-4 أنشطة رياضيات (كل نشاط يشمل: العنوان، الوصف، المواد، المدة، المفهوم الرياضي)
6. science_activities: 2-3 أنشطة علوم واستكشاف (كل نشاط يشمل: العنوان، التجربة، المواد، الملاحظات المتوقعة)
7. art_activities: 3-4 أنشطة فنية وإبداعية (كل نشاط يشمل: العنوان، الوصف، المواد، الخطوات)
8. sensory_activities: 2-3 أنشطة حسية (كل نشاط يشمل: العنوان، الوصف، المواد، الحواس المستهدفة)
9. physical_activities: 3-4 أنشطة بدنية وحركية (كل نشاط يشمل: العنوان، الوصف، المهارات المستهدفة)
10. quran_islamic: سورة للحفظ، دعاء، قيمة إسلامية، نشاط ديني (مع التفاصيل)
11. story_of_week: قصة مرتبطة بالموضوع (العنوان، الملخص، أسئلة المناقشة، الدروس المستفادة)
12. song_of_week: نشيد أو أنشودة مرتبطة بالموضوع (العنوان، الكلمات أو وصف النشيد، الحركات المصاحبة)
13. home_activity: 2-3 أنشطة منزلية يمكن للأهل تنفيذها مع أطفالهم (الوصف، المواد البسيطة المتاحة)
14. parent_notes: ملاحظات وإرشادات لأولياء الأمور حول الموضوع وكيفية دعم تعلم الطفل في المنزل

${isBilingual ? "اكتبي كل قسم بالعربية ثم أضيفي ترجمة إنجليزية مختصرة بعده." : "اكتبي كل شيء بالعربية فقط. لا تستخدمي أي كلمات إنجليزية."}

أعيدي الرد بصيغة JSON فقط. لا تكتبي أي نص خارج JSON.`;
  } else {
    return `You are an expert Early Years curriculum planner in Saudi Arabia specializing in the EYFS Framework.

Task: Create a complete, detailed, ready-to-use weekly plan.

Details:
- Age Group: ${ageLabel.en}
- Weekly Theme: ${input.theme}
- Week: ${input.weekStart} to ${input.weekEnd}
- Language: English

${CULTURAL_GUIDELINES}

Quality Requirements:
- Activities must be age-appropriate and aligned with EYFS framework
- Each section must be detailed, practical, and ready for direct implementation
- Include Islamic values and Saudi cultural context
- Activities should be varied, engaging, and interactive
- Each activity includes: description, materials needed, steps, duration, assessment method

Generate a complete weekly plan in JSON format with these 14 sections:

{
  ${sectionsList}
}

Section details required:

1. theme_overview: Comprehensive overview of the theme and how it will be explored (3-5 sentences)
2. learning_objectives: List of 5-7 specific, measurable learning objectives linked to EYFS areas
3. arabic_activities: 3-4 Arabic language activities (each with: title, description, materials, duration, implementation)
4. english_activities: 3-4 English language activities (each with: title, description, materials, duration, implementation)
5. math_activities: 3-4 math activities (each with: title, description, materials, duration, math concept)
6. science_activities: 2-3 science/exploration activities (each with: title, experiment, materials, expected observations)
7. art_activities: 3-4 art/creative activities (each with: title, description, materials, steps)
8. sensory_activities: 2-3 sensory activities (each with: title, description, materials, targeted senses)
9. physical_activities: 3-4 physical/motor activities (each with: title, description, targeted skills)
10. quran_islamic: Surah for memorization, dua, Islamic value, religious activity (with details)
11. story_of_week: Theme-related story (title, summary, discussion questions, lessons learned)
12. song_of_week: Theme-related song/nasheed (title, lyrics or description, accompanying movements)
13. home_activity: 2-3 home activities parents can do with children (description, simple materials)
14. parent_notes: Notes and guidance for parents about the theme and supporting learning at home

Return JSON only. No text outside JSON.`;
  }
}

export const weeklyPlanRouter = router({
  // ============ GENERATE WEEKLY PLAN ============
  generate: staffProcedure
    .input(z.object({
      classId: z.number().optional(),
      ageGroup: z.enum(["nursery", "kg1", "kg2", "kg3"]),
      weekStartDate: z.string().min(1),
      weekEndDate: z.string().min(1),
      theme: z.string().min(1),
      language: z.enum(["ar", "en", "bilingual"]).default("ar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const prompt = buildGenerationPrompt({
        ageGroup: input.ageGroup,
        theme: input.theme,
        language: input.language,
        weekStart: input.weekStartDate,
        weekEnd: input.weekEndDate,
      });

      let sections: any = null;
      let attempts = 0;
      let lastError: string = '';

      while (attempts < 3 && !sections) {
        attempts++;
        try {
          console.log(`[WeeklyPlan] Generate attempt ${attempts}/3 for theme: ${input.theme}, ageGroup: ${input.ageGroup}`);
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are an expert curriculum planner for kindergartens in Saudi Arabia. You MUST respond with valid JSON only. No markdown, no code fences, no text outside JSON. The JSON object must contain all 14 required section keys as string values." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 8000,
          });

          const rawContent = (response.choices[0]?.message?.content as string) || "{}";
          console.log(`[WeeklyPlan] LLM response received, length: ${rawContent.length}`);
          const parsed = safeJsonParse(rawContent);

          if (parsed.success && parsed.data) {
            // Validate that we have most sections
            const data = parsed.data;
            const presentSections = SECTION_TYPES.filter(s => data[s] !== undefined && data[s] !== null && data[s] !== "");
            console.log(`[WeeklyPlan] Parsed sections: ${presentSections.length}/14`);
            if (presentSections.length >= 8) {
              // Fill in any missing sections with empty content
              sections = {};
              for (const sType of SECTION_TYPES) {
                sections[sType] = data[sType] || (input.language === "ar" ? "لم يتم إنشاء هذا القسم. يرجى التعديل يدوياً." : "This section was not generated. Please edit manually.");
              }
            } else {
              lastError = `Only ${presentSections.length} sections generated (need 8+). Present: ${presentSections.join(', ')}`;
              console.warn(`[WeeklyPlan] ${lastError}`);
            }
          } else {
            lastError = `JSON parse failed: ${parsed.error || 'unknown'}`;
            console.warn(`[WeeklyPlan] ${lastError}`);
          }
        } catch (e: any) {
          lastError = e?.message || String(e);
          console.error(`[WeeklyPlan] Attempt ${attempts} error:`, lastError);
        }
      }

      if (!sections) {
        console.error(`[WeeklyPlan] All ${attempts} attempts failed. Last error: ${lastError}`);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: input.language === "ar" 
            ? 'فشل في إنشاء الخطة الأسبوعية. يرجى المحاولة مرة أخرى.' 
            : 'Failed to generate weekly plan. Please try again.'
        });
      }

      // Save as draft
      const db = await getDb();
      const [saved] = await db.insert(weeklyPlans).values({
        classId: input.classId || null,
        teacherId: ctx.user!.id,
        ageGroup: input.ageGroup,
        weekStartDate: input.weekStartDate,
        weekEndDate: input.weekEndDate,
        theme: input.theme,
        language: input.language,
        status: "draft",
        sections: sections,
      });

      return { 
        id: saved.insertId, 
        sections,
        theme: input.theme,
        ageGroup: input.ageGroup,
        weekStartDate: input.weekStartDate,
        weekEndDate: input.weekEndDate,
        language: input.language,
        status: "draft" as const,
      };
    }),

  // ============ SAVE/UPDATE PLAN ============
  save: staffProcedure
    .input(z.object({
      id: z.number(),
      sections: z.any(),
      theme: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND' });
      if (plan.teacherId !== ctx.user!.id && !['admin', 'super_admin', 'principal'].includes(ctx.user!.role || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const updateData: any = { sections: input.sections };
      if (input.theme) updateData.theme = input.theme;

      await db.update(weeklyPlans).set(updateData).where(eq(weeklyPlans.id, input.id));
      return { success: true };
    }),

  // ============ LIST PLANS ============
  list: staffProcedure
    .input(z.object({
      classId: z.number().optional(),
      status: z.enum(["draft", "published"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions: any[] = [];
      
      // Teachers see their own plans, admins see all
      if (!['admin', 'super_admin', 'principal'].includes(ctx.user!.role || '')) {
        conditions.push(eq(weeklyPlans.teacherId, ctx.user!.id));
      }
      if (input.classId) conditions.push(eq(weeklyPlans.classId, input.classId));
      if (input.status) conditions.push(eq(weeklyPlans.status, input.status));

      const items = await db.select({
        id: weeklyPlans.id,
        classId: weeklyPlans.classId,
        teacherId: weeklyPlans.teacherId,
        ageGroup: weeklyPlans.ageGroup,
        weekStartDate: weeklyPlans.weekStartDate,
        weekEndDate: weeklyPlans.weekEndDate,
        theme: weeklyPlans.theme,
        language: weeklyPlans.language,
        status: weeklyPlans.status,
        publishedAt: weeklyPlans.publishedAt,
        createdAt: weeklyPlans.createdAt,
      })
      .from(weeklyPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(weeklyPlans.createdAt))
      .limit(input.limit)
      .offset(input.offset);

      return items;
    }),

  // ============ GET SINGLE PLAN ============
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND' });
      return plan;
    }),

  // ============ UPDATE SECTIONS ============
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      sections: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND' });
      if (plan.status === 'published') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot edit a published plan. Duplicate it first.' });
      }
      if (plan.teacherId !== ctx.user!.id && !['admin', 'super_admin', 'principal'].includes(ctx.user!.role || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await db.update(weeklyPlans).set({ sections: input.sections }).where(eq(weeklyPlans.id, input.id));
      return { success: true };
    }),

  // ============ PUBLISH PLAN ============
  publish: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND' });
      if (plan.status === 'published') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Plan is already published.' });
      }

      await db.update(weeklyPlans).set({ 
        status: "published", 
        publishedAt: new Date() 
      }).where(eq(weeklyPlans.id, input.id));

      // Notify parents of children in this class
      if (plan.classId) {
        try {
          // Get all children in this class
          const classChildren = await db.select({ id: children.id, parentId: children.parentId })
            .from(children)
            .where(eq(children.classId, plan.classId));

          // Get parent IDs from children table
          const parentIdsFromChildren = classChildren
            .filter((c: any) => c.parentId)
            .map((c: any) => c.parentId);

          // Get parent IDs from parent_children table
          const childIds = classChildren.map((c: any) => c.id);
          let parentIdsFromLink: number[] = [];
          if (childIds.length > 0) {
            const links = await db.select({ parentId: parentChildren.parentId })
              .from(parentChildren)
              .where(inArray(parentChildren.childId, childIds));
            parentIdsFromLink = links.map((l: any) => l.parentId);
          }

          // Combine unique parent IDs
          const allParentIds = Array.from(new Set([...parentIdsFromChildren, ...parentIdsFromLink]));

          // Create in-app notifications for each parent
          for (const parentId of allParentIds) {
            await db.insert(notifications).values({
              userId: parentId,
              title: "Weekly Plan Published",
              titleAr: "تم نشر الخطة الأسبوعية",
              body: `A new weekly plan "${plan.theme}" has been published for your child's class.`,
              bodyAr: `تم نشر خطة أسبوعية جديدة "${plan.theme}" لفصل طفلك.`,
              type: "general",
              metadata: { planId: input.id, type: "weekly_plan" },
            });
          }

          // Send push notifications
          if (allParentIds.length > 0) {
            const getSubscriptions = async (userId: number) => {
              const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
              return subs.map((s: any) => ({
                endpoint: s.endpoint,
                p256dh: s.p256dh,
                auth: s.auth,
                id: s.id,
              }));
            };

            await sendPushToUsers(allParentIds, {
              title: "الخطة الأسبوعية الجديدة 📋",
              body: `تم نشر خطة "${plan.theme}" - اطلعي عليها الآن`,
              tag: `weekly-plan-${input.id}`,
              data: { url: `/parent/weekly-plan/${input.id}` },
            }, getSubscriptions);
          }
        } catch (e) {
          // Don't fail the publish if notifications fail
          console.error("Failed to send weekly plan notifications:", e);
        }
      }

      return { success: true };
    }),

  // ============ DUPLICATE PLAN ============
  duplicate: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND' });

      const [newPlan] = await db.insert(weeklyPlans).values({
        classId: plan.classId,
        teacherId: ctx.user!.id,
        ageGroup: plan.ageGroup,
        weekStartDate: plan.weekStartDate,
        weekEndDate: plan.weekEndDate,
        theme: plan.theme,
        language: plan.language,
        status: "draft",
        sections: plan.sections,
      });

      return { id: newPlan.insertId };
    }),

  // ============ DELETE PLAN ============
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND' });
      if (plan.teacherId !== ctx.user!.id && !['admin', 'super_admin', 'principal'].includes(ctx.user!.role || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await db.delete(weeklyPlans).where(eq(weeklyPlans.id, input.id));
      return { success: true };
    }),

  // ============ PARENT LIST (Published plans for child's class) ============
  parentList: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const userId = ctx.user!.id;

      // Get classes of parent's children
      const parentLinks = await db.select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(eq(parentChildren.parentId, userId));

      const childIds = parentLinks.map((l: any) => l.childId);

      // Also get children directly linked via parentId
      const directChildren = await db.select({ id: children.id, classId: children.classId })
        .from(children)
        .where(eq(children.parentId, userId));

      const allChildIds = Array.from(new Set([...childIds, ...directChildren.map((c: any) => c.id)]));

      if (allChildIds.length === 0) return [];

      // Get class IDs for these children
      const childRecords = await db.select({ classId: children.classId })
        .from(children)
        .where(inArray(children.id, allChildIds));

      const classIds: number[] = Array.from(new Set(childRecords.filter((c: any) => c.classId).map((c: any) => c.classId as number)));

      if (classIds.length === 0) return [];

      // Get published plans for these classes
      const plans = await db.select({
        id: weeklyPlans.id,
        classId: weeklyPlans.classId,
        ageGroup: weeklyPlans.ageGroup,
        weekStartDate: weeklyPlans.weekStartDate,
        weekEndDate: weeklyPlans.weekEndDate,
        theme: weeklyPlans.theme,
        language: weeklyPlans.language,
        status: weeklyPlans.status,
        publishedAt: weeklyPlans.publishedAt,
        createdAt: weeklyPlans.createdAt,
      })
      .from(weeklyPlans)
      .where(and(
        inArray(weeklyPlans.classId, classIds),
        eq(weeklyPlans.status, "published")
      ))
      .orderBy(desc(weeklyPlans.publishedAt))
      .limit(input.limit)
      .offset(input.offset);

      return plans;
    }),
});
