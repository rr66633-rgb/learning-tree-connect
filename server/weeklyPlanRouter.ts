import { protectedProcedure, tenantProcedure, router } from "./_core/trpc";
import { safeJsonParse } from "./jsonParser";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { weeklyPlans, weeklyPlanGenerationJobs, children, parentChildren, classes, notifications, pushSubscriptions } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sendPushToUsers } from "./_core/webPush";
import { getDb } from "./db";

// SECURITY FIX (cross-tenant weekly-plan access): this file never referenced
// organizationId at all -- generated plans were inserted with no
// organizationId (silently defaulting to the schema's default(1)), and every
// by-id lookup (save/get/update/publish/duplicate/delete) had no organization
// check whatsoever, so staff from ANY organization could read, edit, publish,
// duplicate, or delete ANY other organization's weekly plans. `staffProcedure`
// now builds on `tenantProcedure` so ctx.organizationId is guaranteed non-null,
// and every route below scopes its query/insert to it.
const staffProcedure = tenantProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== 'admin' && role !== 'super_admin' && role !== 'principal' && role !== 'owner' && role !== 'teacher' && role !== 'assistant') {
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

// A strict schema prevents partially-shaped JSON from reaching the editor.
// Each section remains a rich formatted string because that is the storage/UI
// contract used by existing plans and keeps old drafts fully compatible.
const WEEKLY_PLAN_OUTPUT_SCHEMA = {
  name: "weekly_plan_sections",
  strict: true,
  schema: {
    type: "object",
    properties: Object.fromEntries(
      SECTION_TYPES.map(section => [section, { type: "string" }])
    ),
    required: [...SECTION_TYPES],
    additionalProperties: false,
  },
};

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

function buildGenerationPromptLegacy(input: { ageGroup: string; theme: string; language: string; weekStart: string; weekEnd: string }) {
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
- اللغة: ${isBilingual ? "ثنائي اللغة (عربي وإنجليزي) - يجب كتابة كل محتوى بالعربية أولاً ثم الإنجليزية" : "العربية فقط"}

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
`;
  }
  return "";
}

const WEEKLY_PLAN_INPUT_SCHEMA = z.object({
  classId: z.number().optional(),
  ageGroup: z.enum(["nursery", "kg1", "kg2", "kg3"]),
  weekStartDate: z.string().min(1),
  weekEndDate: z.string().min(1),
  theme: z.string().trim().min(1).max(300),
  language: z.enum(["ar", "en", "bilingual"]).default("ar"),
});

type WeeklyPlanGenerationInput = z.infer<typeof WEEKLY_PLAN_INPUT_SCHEMA>;

type GenerationStage = "queued" | "generating" | "validating" | "saving" | "completed" | "failed";

function userFacingGenerationError(error: unknown, language: WeeklyPlanGenerationInput["language"]) {
  const raw = error instanceof Error ? error.message : String(error || "");
  const normalized = raw.toLowerCase();
  const isAr = language !== "en";

  if (normalized.includes("timed out") || normalized.includes("abort") || normalized.includes("deadline")) {
    return {
      code: "GENERATION_TIMEOUT",
      message: isAr
        ? "استغرق إعداد الخطة وقتاً أطول من المعتاد. لم يتم حفظ نتيجة ناقصة؛ يمكنك إعادة المحاولة وسيبدأ الطلب من جديد."
        : "The plan took longer than usual. No partial result was saved; please try again.",
    };
  }
  if (normalized.includes("429") || normalized.includes("rate limit") || normalized.includes("quota")) {
    return {
      code: "AI_BUSY",
      message: isAr
        ? "خدمة إنشاء الخطط مشغولة حالياً. انتظر دقيقة ثم أعد المحاولة."
        : "The plan generator is busy right now. Please try again in a minute.",
    };
  }
  if (normalized.includes("401") || normalized.includes("api key") || normalized.includes("no llm api key")) {
    return {
      code: "AI_NOT_CONFIGURED",
      message: isAr
        ? "ميزة إنشاء الخطط غير مفعلة حالياً. يرجى التواصل مع مسؤول النظام."
        : "Plan generation is not configured. Please contact the administrator.",
    };
  }
  if (normalized.includes("max completion tokens") || normalized.includes("finish_reason=length")) {
    return {
      code: "INCOMPLETE_OUTPUT",
      message: isAr
        ? "لم تكتمل جميع أقسام الخطة، لذلك لم نحفظ محتوى ناقصاً. أعد المحاولة للحصول على خطة مكتملة."
        : "Not all plan sections were completed, so no partial content was saved. Please try again.",
    };
  }
  return {
    code: "GENERATION_FAILED",
    message: isAr
      ? "تعذّر إكمال الخطة هذه المرة. لم يتم حفظ أي محتوى ناقص، ويمكنك إعادة المحاولة."
      : "The plan could not be completed this time. No partial content was saved; please try again.",
  };
}

async function generateWeeklyPlanSections(
  input: WeeklyPlanGenerationInput,
  onStage?: (stage: GenerationStage, progress: number) => Promise<void>,
) {
  const prompt = buildGenerationPrompt({
    ageGroup: input.ageGroup,
    theme: input.theme,
    language: input.language,
    weekStart: input.weekStartDate,
    weekEnd: input.weekEndDate,
  });

  await onStage?.("generating", 18);
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert Saudi kindergarten curriculum planner. Produce a complete, practical EYFS weekly plan that follows every requested quality and cultural requirement. The response schema is authoritative; do not omit or abbreviate any section.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: WEEKLY_PLAN_OUTPUT_SCHEMA,
    },
    // This is intentionally a generous ceiling. It prevents incomplete plans,
    // while the model still stops naturally when the full plan is finished.
    max_tokens: 32_000,
    // Weekly planning is a structured content task, not a hard reasoning task.
    // GPT-5.6 otherwise defaults to medium reasoning, adding latency and using
    // completion budget before it writes any visible plan content.
    reasoning_effort: /^gpt-5\.6/i.test(ENV.openaiDefaultModel) ? "none" : undefined,
    // The browser no longer waits for this call, so allow a genuinely large
    // plan to finish. Provider timeouts are never automatically duplicated.
    requestTimeoutMs: 8 * 60_000,
    totalDeadlineMs: 9 * 60_000,
    maxRetries: 1,
  });

  await onStage?.("validating", 86);
  const choice = response.choices[0];
  if (choice?.finish_reason === "length") {
    throw new Error("finish_reason=length: max completion tokens reached");
  }

  const rawContent = (choice?.message?.content as string) || "{}";
  const parsed = safeJsonParse(rawContent);
  if (!parsed.success || !parsed.data) {
    throw new Error(`JSON parse failed: ${parsed.error || "unknown"}`);
  }

  const data = parsed.data as Record<string, unknown>;
  const presentSections = SECTION_TYPES.filter(section =>
    typeof data[section] === "string" && (data[section] as string).trim().length > 0
  );
  if (presentSections.length !== SECTION_TYPES.length) {
    throw new Error(`Only ${presentSections.length}/14 sections generated`);
  }

  return Object.fromEntries(SECTION_TYPES.map(section => [section, data[section]]));
}

async function updateGenerationJob(jobId: number, values: {
  status?: "pending" | "processing" | "completed" | "failed";
  stage?: GenerationStage;
  progress?: number;
  planId?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: Date;
  completedAt?: Date;
}) {
  const db = (await getDb())!;
  await db.update(weeklyPlanGenerationJobs).set(values).where(eq(weeklyPlanGenerationJobs.id, jobId));
}

const scheduledGenerationJobs = new Set<number>();

async function processWeeklyPlanGenerationJob(jobId: number) {
  if (scheduledGenerationJobs.has(jobId)) return;
  scheduledGenerationJobs.add(jobId);

  try {
    const db = (await getDb())!;
    const [claim] = await db.update(weeklyPlanGenerationJobs)
      .set({
        status: "processing",
        stage: "generating",
        progress: 12,
        startedAt: new Date(),
        attempts: sql`${weeklyPlanGenerationJobs.attempts} + 1`,
        errorCode: null,
        errorMessage: null,
      })
      .where(and(
        eq(weeklyPlanGenerationJobs.id, jobId),
        eq(weeklyPlanGenerationJobs.status, "pending"),
      ));

    if (!(claim as any)?.affectedRows) return;

    const [job] = await db.select().from(weeklyPlanGenerationJobs)
      .where(eq(weeklyPlanGenerationJobs.id, jobId))
      .limit(1);
    if (!job) return;

    const input: WeeklyPlanGenerationInput = {
      classId: job.classId ?? undefined,
      ageGroup: job.ageGroup,
      weekStartDate: job.weekStartDate,
      weekEndDate: job.weekEndDate,
      theme: job.theme,
      language: job.language,
    };

    const sections = await generateWeeklyPlanSections(input, (stage, progress) =>
      updateGenerationJob(jobId, { stage, progress })
    );
    await updateGenerationJob(jobId, { stage: "saving", progress: 94 });

    await db.transaction(async tx => {
      const [saved] = await tx.insert(weeklyPlans).values({
        classId: input.classId || null,
        teacherId: job.teacherId,
        organizationId: job.organizationId,
        ageGroup: input.ageGroup,
        weekStartDate: input.weekStartDate,
        weekEndDate: input.weekEndDate,
        theme: input.theme,
        language: input.language,
        status: "draft",
        sections,
      });
      await tx.update(weeklyPlanGenerationJobs).set({
        status: "completed",
        stage: "completed",
        progress: 100,
        planId: saved.insertId,
        completedAt: new Date(),
      }).where(eq(weeklyPlanGenerationJobs.id, jobId));
    });
  } catch (error) {
    console.error(`[WeeklyPlan] background job ${jobId} failed:`, error);
    const db = (await getDb())!;
    const [job] = await db.select({ language: weeklyPlanGenerationJobs.language })
      .from(weeklyPlanGenerationJobs)
      .where(eq(weeklyPlanGenerationJobs.id, jobId))
      .limit(1);
    const safeError = userFacingGenerationError(error, job?.language || "ar");
    await updateGenerationJob(jobId, {
      status: "failed",
      stage: "failed",
      progress: 100,
      errorCode: safeError.code,
      errorMessage: safeError.message,
      completedAt: new Date(),
    });
  } finally {
    scheduledGenerationJobs.delete(jobId);
  }
}

function scheduleWeeklyPlanGeneration(jobId: number) {
  setImmediate(() => {
    void processWeeklyPlanGenerationJob(jobId);
  });
}

/* Legacy prompt tail kept temporarily as historical context while the active
   prompt below uses a stable, cache-friendly prefix.
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

${isBilingual
  ? `اكتبي كل قسم بالعربية أولاً ثم أضيفي الترجمة الإنجليزية الكاملة بعده مباشرة. كل عنوان نشاط يكتب بالعربية ثم بالإنجليزية بين قوسين. مثال: "استكشاف الألوان (Exploring Colors)". كل وصف يكتب بالعربية ثم ترجمته الإنجليزية في سطر جديد.`
  : `اكتبي كل المحتوى بالعربية فقط. لا تضيفي أي ترجمة إنجليزية.`}

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
*/

function buildGenerationPrompt(input: { ageGroup: string; theme: string; language: string; weekStart: string; weekEnd: string }) {
  const ageLabel = AGE_GROUP_LABELS[input.ageGroup] || { ar: input.ageGroup, en: input.ageGroup };
  const isEnglish = input.language === "en";
  const isBilingual = input.language === "bilingual";

  if (isEnglish) {
    return `Create a complete, detailed and immediately usable kindergarten weekly plan.

Quality contract:
- Keep every activity age-appropriate and aligned with EYFS.
- Respect Saudi, Arab and Islamic values. Do not include pigs, alcohol, gambling, magic, Halloween, crosses, churches or rainbows.
- Use varied, engaging and interactive activities grounded in the Saudi environment.
- Do not abbreviate sections or replace details with generic advice.
- For every activity include a clear title, purpose/description, materials, ordered implementation steps, duration and an observable assessment method.
- Format each section string for professional display using short headings, numbered steps and clean bullet points. Avoid markdown tables inside section strings.

Required depth for the 14 schema sections:
1. theme_overview: 3-5 sentences explaining the theme and the week's learning journey.
2. learning_objectives: 5-7 specific measurable objectives linked to EYFS areas.
3. arabic_activities: 3-4 complete Arabic language activities.
4. english_activities: 3-4 complete English language activities.
5. math_activities: 3-4 complete math activities including the math concept.
6. science_activities: 2-3 exploration activities including expected observations.
7. art_activities: 3-4 creative activities with ordered steps.
8. sensory_activities: 2-3 activities naming the targeted senses.
9. physical_activities: 3-4 activities naming the targeted motor skills.
10. quran_islamic: memorization, dua, Islamic value and a detailed religious activity.
11. story_of_week: title, rich summary, discussion questions and lessons.
12. song_of_week: title, appropriate words or description and accompanying movements.
13. home_activity: 2-3 detailed activities using simple home materials.
14. parent_notes: practical guidance for supporting learning at home.

Requested plan:
- Age group: ${ageLabel.en}
- Theme: ${input.theme}
- Week: ${input.weekStart} to ${input.weekEnd}
- Output language: English only.`;
  }

  return `أنشئي خطة أسبوعية كاملة ومفصلة وجاهزة للتطبيق المباشر في رياض الأطفال.

عقد الجودة:
- اجعلي كل نشاط مناسباً للعمر ومتوافقاً مع مجالات إطار EYFS.
- التزمي بالقيم الإسلامية والعربية والسعودية، ولا تذكري الخنازير أو الكحول أو القمار أو السحر أو الهالوين أو الصلبان أو الكنائس أو قوس قزح.
- استخدمي أنشطة متنوعة وتفاعلية مرتبطة بالبيئة السعودية، ولا تذكري مبالغ مالية محددة.
- لا تختصري أي قسم ولا تستبدلي التفاصيل بإرشادات عامة.
- يجب أن يتضمن كل نشاط عنواناً واضحاً، والهدف أو الوصف، والمواد، وخطوات تنفيذ مرتبة، والمدة، وطريقة تقييم قابلة للملاحظة.
- نسّقي نص كل قسم للعرض الاحترافي بعناوين قصيرة ونقاط وخطوات مرقمة واضحة، وتجنبي جداول Markdown داخل نصوص الأقسام.

العمق المطلوب للأقسام الأربعة عشر في المخطط:
1. theme_overview: من 3 إلى 5 جمل تشرح الموضوع ورحلة التعلم خلال الأسبوع.
2. learning_objectives: من 5 إلى 7 أهداف محددة وقابلة للقياس ومرتبطة بمجالات EYFS.
3. arabic_activities: من 3 إلى 4 أنشطة لغة عربية مكتملة التفاصيل.
4. english_activities: من 3 إلى 4 أنشطة لغة إنجليزية مكتملة التفاصيل.
5. math_activities: من 3 إلى 4 أنشطة رياضيات مع توضيح المفهوم الرياضي.
6. science_activities: من نشاطين إلى 3 أنشطة استكشاف مع الملاحظات المتوقعة.
7. art_activities: من 3 إلى 4 أنشطة إبداعية بخطوات مرتبة.
8. sensory_activities: من نشاطين إلى 3 أنشطة مع ذكر الحواس المستهدفة.
9. physical_activities: من 3 إلى 4 أنشطة مع ذكر المهارات الحركية المستهدفة.
10. quran_islamic: حفظ مناسب، ودعاء، وقيمة إسلامية، ونشاط ديني مفصل.
11. story_of_week: عنوان وملخص ثري وأسئلة مناقشة ودروس مستفادة.
12. song_of_week: عنوان وكلمات مناسبة أو وصف للنشيد وحركات مصاحبة.
13. home_activity: من نشاطين إلى 3 أنشطة مفصلة بمواد منزلية بسيطة.
14. parent_notes: إرشادات عملية لدعم تعلم الطفل في المنزل.

بيانات الخطة المطلوبة:
- الفئة العمرية: ${ageLabel.ar}
- الموضوع: ${input.theme}
- الأسبوع: من ${input.weekStart} إلى ${input.weekEnd}
- لغة المخرجات: ${isBilingual ? "ثنائية اللغة؛ اكتبي المحتوى العربي أولاً ثم الترجمة الإنجليزية الكاملة داخل كل قسم، دون اختصار أي لغة" : "العربية فقط دون ترجمة إنجليزية"}.`;
}

export const weeklyPlanRouter = router({
  // Accept the request immediately. The expensive model call runs independently
  // of the browser connection, so navigation, refreshes and proxy timeouts do
  // not discard an otherwise valid plan.
  startGeneration: staffProcedure
    .input(WEEKLY_PLAN_INPUT_SCHEMA.extend({ requestId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      if (input.classId) {
        const [cls] = await db.select({ id: classes.id }).from(classes)
          .where(and(eq(classes.id, input.classId), eq(classes.organizationId, ctx.organizationId)))
          .limit(1);
        if (!cls) throw new TRPCError({ code: "NOT_FOUND", message: "الفصل غير موجود" });
      }

      // Idempotency protects against a repeated browser submission without
      // creating two costly generations or duplicate plans.
      const [existing] = await db.select().from(weeklyPlanGenerationJobs)
        .where(and(
          eq(weeklyPlanGenerationJobs.requestId, input.requestId),
          eq(weeklyPlanGenerationJobs.organizationId, ctx.organizationId),
          eq(weeklyPlanGenerationJobs.teacherId, ctx.user!.id),
        ))
        .limit(1);
      if (existing) {
        if (existing.status === "pending") scheduleWeeklyPlanGeneration(existing.id);
        return { jobId: existing.id, status: existing.status, accepted: true as const };
      }

      const [created] = await db.insert(weeklyPlanGenerationJobs).values({
        requestId: input.requestId,
        organizationId: ctx.organizationId,
        teacherId: ctx.user!.id,
        classId: input.classId || null,
        ageGroup: input.ageGroup,
        weekStartDate: input.weekStartDate,
        weekEndDate: input.weekEndDate,
        theme: input.theme,
        language: input.language,
        status: "pending",
        stage: "queued",
        progress: 5,
      });

      scheduleWeeklyPlanGeneration(created.insertId);
      return { jobId: created.insertId, status: "pending" as const, accepted: true as const };
    }),

  generationStatus: staffProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      let [job] = await db.select({
        id: weeklyPlanGenerationJobs.id,
        status: weeklyPlanGenerationJobs.status,
        stage: weeklyPlanGenerationJobs.stage,
        progress: weeklyPlanGenerationJobs.progress,
        planId: weeklyPlanGenerationJobs.planId,
        errorCode: weeklyPlanGenerationJobs.errorCode,
        errorMessage: weeklyPlanGenerationJobs.errorMessage,
        theme: weeklyPlanGenerationJobs.theme,
        language: weeklyPlanGenerationJobs.language,
        createdAt: weeklyPlanGenerationJobs.createdAt,
        startedAt: weeklyPlanGenerationJobs.startedAt,
        completedAt: weeklyPlanGenerationJobs.completedAt,
        updatedAt: weeklyPlanGenerationJobs.updatedAt,
      }).from(weeklyPlanGenerationJobs).where(and(
        eq(weeklyPlanGenerationJobs.id, input.jobId),
        eq(weeklyPlanGenerationJobs.organizationId, ctx.organizationId),
        eq(weeklyPlanGenerationJobs.teacherId, ctx.user!.id),
      )).limit(1);

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "مهمة إنشاء الخطة غير موجودة" });

      // Recover a queued job after a server restart. Processing jobs get a
      // generous lease because large bilingual plans are allowed to finish.
      if (job.status === "pending") {
        scheduleWeeklyPlanGeneration(job.id);
      } else if (
        job.status === "processing" &&
        Date.now() - new Date(job.updatedAt).getTime() > 11 * 60_000
      ) {
        const [released] = await db.update(weeklyPlanGenerationJobs)
          .set({ status: "pending", stage: "queued", progress: 8 })
          .where(and(
            eq(weeklyPlanGenerationJobs.id, job.id),
            eq(weeklyPlanGenerationJobs.status, "processing"),
            eq(weeklyPlanGenerationJobs.updatedAt, job.updatedAt),
          ));
        if ((released as any)?.affectedRows) {
          job = { ...job, status: "pending", stage: "queued", progress: 8, updatedAt: new Date() };
          scheduleWeeklyPlanGeneration(job.id);
        }
      }

      return job;
    }),

  // ============ GENERATE WEEKLY PLAN ============
  generate: staffProcedure
    .input(WEEKLY_PLAN_INPUT_SCHEMA)
    .mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously trusted input.classId with no check that it
      // belongs to the caller's organization -- a saved/published plan with a
      // foreign classId would then be matched by parentList's classId-based
      // join (see below), leaking this organization's weekly plan content
      // into another organization's parent view.
      if (input.classId) {
        const db0 = (await getDb())!;
        const [cls] = await db0.select({ id: classes.id }).from(classes)
          .where(and(eq(classes.id, input.classId), eq(classes.organizationId, ctx.organizationId)))
          .limit(1);
        if (!cls) throw new TRPCError({ code: 'NOT_FOUND', message: 'الفصل غير موجود' });
      }

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

      // PERFORMANCE FIX: this used to be a flat "try 3 times" loop wrapped
      // around a client that itself retried up to 5 times, so a bad run could
      // burn ~15 model calls. invokeLLM now bounds its own retries and applies
      // a hard deadline, so this loop only needs to cover the one thing it
      // actually guards against: a syntactically valid reply that is missing
      // sections. Two attempts is enough for that, and the whole procedure is
      // bounded below so the user is never left waiting indefinitely.
      const MAX_ATTEMPTS = 2;
      const startedAt = Date.now();
      const OVERALL_BUDGET_MS = 300_000; // 5 minutes, ceiling for the whole call

      while (attempts < MAX_ATTEMPTS && !sections) {
        if (Date.now() - startedAt > OVERALL_BUDGET_MS) {
          console.warn('[WeeklyPlan] overall budget exhausted, stopping retries');
          break;
        }
        attempts++;
        try {
          console.log(`[WeeklyPlan] Generate attempt ${attempts}/${MAX_ATTEMPTS} for theme: ${input.theme}, ageGroup: ${input.ageGroup}`);
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are an expert curriculum planner for kindergartens in Saudi Arabia. You MUST respond with valid JSON only. No markdown, no code fences, no text outside JSON. The JSON object must contain all 14 required section keys as string values." },
              { role: "user", content: prompt }
            ],
            // Structured Outputs guarantees the exact 14-key contract. JSON
            // mode only guaranteed parseable JSON and was the reason valid but
            // incomplete plans had to be retried.
            response_format: {
              type: "json_schema",
              json_schema: WEEKLY_PLAN_OUTPUT_SCHEMA,
            },
            // BUGFIX: this was 8000, which is not enough for what the prompt
            // above actually asks for -- 14 sections, each written in Arabic
            // AND then fully translated to English. Measured against the real
            // prompt, a complete answer needs ~10,600 completion tokens.
            //
            // On a reasoning-capable model the too-small budget did not merely
            // truncate the answer, it produced NOTHING: with 8000 the model
            // spent all 8000 tokens reasoning, returned finish_reason
            // "length" with an empty body, and the handler saw "{}" -> 0/14
            // sections -> all three retries failed -> the user got
            // "فشل في إنشاء الخطة الأسبوعية". Given 16000 the same model
            // finishes normally using only ~290 reasoning tokens.
            //
            // This is a ceiling, not a target: the model stops when done, so
            // raising it does not increase cost for requests that finish
            // early (measured: identical output at 16000 and 32000).
            max_tokens: 32_000,
            reasoning_effort: /^gpt-5\.6/i.test(ENV.openaiDefaultModel) ? "none" : undefined,
            requestTimeoutMs: 8 * 60_000,
            totalDeadlineMs: 9 * 60_000,
            maxRetries: 1,
          });

          const choice = response.choices[0];
          if (choice?.finish_reason === "length") {
            throw new Error("LLM response reached max completion tokens before finishing");
          }
          const rawContent = (choice?.message?.content as string) || "{}";
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
        // UX FIX: every failure used to produce the same sentence, so a teacher
        // could not tell "the service is busy, try in a minute" from "this will
        // never work until an administrator fixes the configuration". The cause
        // is classified here into the few outcomes a user can actually act on.
        // The raw provider text is only ever logged, never shown -- it names the
        // provider and the model.
        const err = lastError.toLowerCase();
        const isAr = input.language !== "en";
        let message: string;
        if (err.includes("timed out") || err.includes("abort") || err.includes("deadline") || err.includes("max completion tokens")) {
          message = isAr
            ? 'استغرق إنشاء الخطة وقتاً أطول من المتوقع. جرّبي موضوعاً أقصر أو أعيدي المحاولة بعد قليل.'
            : 'Generating the plan took longer than expected. Try a shorter theme, or try again shortly.';
        } else if (err.includes("429") || err.includes("rate limit") || err.includes("quota")) {
          message = isAr
            ? 'الخدمة مشغولة الآن. يرجى إعادة المحاولة بعد دقيقة.'
            : 'The service is busy right now. Please try again in a minute.';
        } else if (err.includes("401") || err.includes("api key") || err.includes("no llm api key")) {
          message = isAr
            ? 'ميزة الذكاء الاصطناعي غير مفعّلة. يرجى التواصل مع مسؤول النظام.'
            : 'The AI feature is not enabled. Please contact your system administrator.';
        } else if (err.includes("sections generated")) {
          message = isAr
            ? 'تعذّر إنشاء خطة مكتملة لهذا الموضوع. جرّبي صياغة الموضوع بشكل أوضح ثم أعيدي المحاولة.'
            : 'A complete plan could not be produced for this theme. Try rephrasing the theme and generating again.';
        } else {
          message = isAr
            ? 'تعذّر إنشاء الخطة الأسبوعية. يرجى المحاولة مرة أخرى.'
            : 'Could not generate the weekly plan. Please try again.';
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }

      // Save as draft
      const db = (await getDb())!;
      const [saved] = await db.insert(weeklyPlans).values({
        classId: input.classId || null,
        teacherId: ctx.user!.id,
        organizationId: ctx.organizationId,
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
      const db = (await getDb())!;
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      // SECURITY FIX: previously fetched/authorized by id alone -- an
      // admin/principal/super_admin from ANY organization could bypass the
      // teacherId-ownership check entirely since there was no org boundary.
      if (!plan || plan.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
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
      const db = (await getDb())!;
      // SECURITY FIX: previously admins/principals/super_admins got NO filter at
      // all here and saw every organization's weekly plans. organizationId is
      // now always applied first, regardless of role; the teacherId filter is
      // then layered on top only for non-privileged roles.
      const conditions: any[] = [eq(weeklyPlans.organizationId, ctx.organizationId)];

      // Teachers see their own plans, admins see all (within their own org)
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
  // SECURITY FIX: upgraded from plain protectedProcedure (any authenticated
  // user, any role, any organization) to tenantProcedure + explicit org check
  // -- previously any user could fetch any organization's plan by id.
  get: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      if (!plan || plan.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return plan;
    }),

  // ============ UPDATE SECTIONS ============
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      sections: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      // SECURITY FIX: same cross-org bypass as `save` -- admin-role check no
      // longer overrides the organization boundary.
      if (!plan || plan.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
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
      const db = (await getDb())!;
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      // SECURITY FIX: previously had NO ownership/role/org check before
      // publishing -- any staff member from any organization could publish
      // another organization's plan by id, which then fired real notifications
      // to that other organization's parents.
      if (!plan || plan.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
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
              organizationId: ctx.organizationId,
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
      const db = (await getDb())!;
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      // SECURITY FIX: previously had NO ownership/role/org check -- any staff
      // member could clone another organization's plan content into their own.
      if (!plan || plan.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const [newPlan] = await db.insert(weeklyPlans).values({
        classId: plan.classId,
        teacherId: ctx.user!.id,
        organizationId: ctx.organizationId,
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
      const db = (await getDb())!;
      const [plan] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, input.id)).limit(1);
      // SECURITY FIX: same cross-org bypass as save/update -- admin-role check
      // no longer overrides the organization boundary.
      if (!plan || plan.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      if (plan.teacherId !== ctx.user!.id && !['admin', 'super_admin', 'principal'].includes(ctx.user!.role || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await db.delete(weeklyPlans).where(eq(weeklyPlans.id, input.id));
      return { success: true };
    }),

  // ============ PARENT LIST (Published plans for child's class) ============
  parentList: tenantProcedure
    .input(z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
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

      // SECURITY FIX: previously resolved shared plans by matching classId
      // alone, with no organizationId filter -- as defense in depth on top of
      // the classId-ownership check added to `generate` above (in case any
      // plan created before that fix still has a mismatched classId), the
      // caller's own organizationId is now required to match too. ctx.user is
      // guaranteed non-null by protectedProcedure, and organizationId is a
      // NOT NULL column on users, so this is a real, trustworthy value here.
      const orgId = ctx.organizationId;
      if (!orgId) return [];

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
        eq(weeklyPlans.organizationId, orgId),
        eq(weeklyPlans.status, "published")
      ))
      .orderBy(desc(weeklyPlans.publishedAt))
      .limit(input.limit)
      .offset(input.offset);

      return plans;
    }),
});
