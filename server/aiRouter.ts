import { protectedProcedure, router } from "./_core/trpc";
import { safeJsonParse, validateWeeklyPlan } from "./jsonParser";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { eq, desc, and, like, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { aiGeneratedContent, aiLibrary, children, attendance, eyfsAssessments, learningObservations, dailyReports, calendarEvents, announcements } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: any = null;
async function getDb() {
  if (!_db) {
    const mysql2 = await import("mysql2/promise");
    const pool = mysql2.createPool({ uri: ENV.databaseUrl, waitForConnections: true, connectionLimit: 5 });
    _db = drizzle(pool);
  }
  return _db!;
}

// Middleware: only teachers and admins can use AI features
const aiProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== 'admin' && role !== 'super_admin' && role !== 'principal' && role !== 'teacher' && role !== 'assistant') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'AI features are restricted to staff members' });
  }
  return next({ ctx });
});

// Cultural guidelines for Saudi Arabia
const CULTURAL_GUIDELINES = `
قواعد ثقافية مهمة:
- المحتوى يجب أن يحترم القيم الإسلامية والعربية
- لا تذكر: الخنازير، الكحول، القمار، السحر، الهالوين، الصلبان، الكنائس
- لا تستخدم أنشطة قوس قزح
- ركز على مواضيع الطبيعة والتعليم
- استخدم أمثلة من البيئة السعودية والعربية
`;

const EYFS_AREAS = [
  "التواصل واللغة",
  "النمو الجسدي",
  "النمو الشخصي والاجتماعي والعاطفي",
  "القراءة والكتابة",
  "الرياضيات",
  "فهم العالم",
  "الفنون التعبيرية والتصميم"
];

export const aiRouter = router({
  // ============ AI OBSERVATION WRITER ============
  generateObservation: aiProcedure
    .input(z.object({
      childName: z.string().min(1),
      childId: z.number().optional(),
      shortNote: z.string().min(5),
      language: z.enum(["ar", "en"]).default("ar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const lang = input.language === "ar" ? "العربية" : "English";
      const prompt = input.language === "ar" 
        ? `أنت معلمة رياض أطفال محترفة في المملكة العربية السعودية. اكتبي ملاحظة تعليمية مهنية بناءً على هذه الملاحظة القصيرة.

اسم الطفل: ${input.childName}
الملاحظة: ${input.shortNote}

${CULTURAL_GUIDELINES}

اكتبي الرد بصيغة JSON بالهيكل التالي:
{
  "title": "عنوان الملاحظة",
  "observation": "وصف مهني مفصل لما لوحظ (3-5 جمل)",
  "eyfsArea": "مجال التعلم في EYFS (اختاري من: ${EYFS_AREAS.join('، ')})",
  "analysis": "تحليل تربوي لما يظهره هذا السلوك من تطور (2-3 جمل)",
  "nextSteps": "الخطوات التالية المقترحة لدعم تعلم الطفل (2-3 نقاط)",
  "developmentLevel": "مستوى التطور (ناشئ/متطور/متقن/متفوق)"
}

اكتبي كل شيء بالعربية فقط.`
        : `You are a professional early years teacher in Saudi Arabia. Write a professional learning observation based on this short note.

Child name: ${input.childName}
Note: ${input.shortNote}

${CULTURAL_GUIDELINES}

Write the response in JSON format with this structure:
{
  "title": "Observation title",
  "observation": "Detailed professional description of what was observed (3-5 sentences)",
  "eyfsArea": "EYFS learning area",
  "analysis": "Pedagogical analysis of what this behavior shows in terms of development (2-3 sentences)",
  "nextSteps": "Suggested next steps to support the child's learning (2-3 points)",
  "developmentLevel": "Development level (emerging/developing/secure/exceeding)"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert early years educator. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = (response.choices[0].message.content as string) || "{}";
      const parsed = safeJsonParse(rawContent);
      if (!parsed.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ في معالجة الاستجابة. يرجى المحاولة مرة أخرى.' });
      }
      const content = parsed.data;
      
      // Save to database
      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "observation",
        title: content.title || input.shortNote,
        content: content,
        language: input.language,
        childId: input.childId || null,
        inputPrompt: input.shortNote,
        createdBy: ctx.user!.id,
      });

      return { id: saved.insertId, ...content };
    }),

  // ============ AI WEEKLY PLANNER ============
  generateWeeklyPlan: aiProcedure
    .input(z.object({
      ageGroup: z.string().min(1),
      theme: z.string().min(1),
      learningGoals: z.array(z.string()).optional(),
      language: z.enum(["ar", "en"]).default("ar"),
      classId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const goals = input.learningGoals?.join("، ") || "";
      const isArabic = input.language === "ar";
      
      const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
      const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
      const days = isArabic ? DAYS_AR : DAYS_EN;

      // Step 1: Generate the overview/meta first (small JSON, reliable)
      const overviewPrompt = isArabic
        ? `أنتِ مخططة مناهج رياض أطفال خبيرة في المملكة العربية السعودية متخصصة في إطار EYFS.

الفئة العمرية: ${input.ageGroup}
الموضوع/الثيمة: ${input.theme}
${goals ? `أهداف التعلم: ${goals}` : ""}

${CULTURAL_GUIDELINES}

أنشئي فقط المعلومات العامة للخطة الأسبوعية (بدون الأيام). اكتبي JSON فقط:
{
  "title": "عنوان الخطة الأسبوعية",
  "theme": "${input.theme}",
  "ageGroup": "${input.ageGroup}",
  "overview": "نظرة عامة شاملة على الأسبوع (3-4 جمل)",
  "learningObjectives": ["هدف 1 مرتبط بـ EYFS", "هدف 2", "هدف 3", "هدف 4"],
  "eyfsAreas": ["مجال EYFS 1", "مجال 2", "مجال 3"],
  "weeklyMaterials": ["مادة 1", "مادة 2", "مادة 3", "مادة 4", "مادة 5"],
  "parentInvolvement": "أنشطة منزلية مقترحة لإشراك الأهل",
  "weeklyAssessment": "ملخص تقييم نهاية الأسبوع"
}
اكتبي بالعربية فقط.`
        : `You are an expert EYFS curriculum planner in Saudi Arabia.

Age group: ${input.ageGroup}
Theme: ${input.theme}
${goals ? `Learning goals: ${goals}` : ""}

${CULTURAL_GUIDELINES}

Generate ONLY the overview metadata for the weekly plan (no days). Return JSON only:
{
  "title": "Weekly plan title",
  "theme": "${input.theme}",
  "ageGroup": "${input.ageGroup}",
  "overview": "Comprehensive week overview (3-4 sentences)",
  "learningObjectives": ["EYFS objective 1", "objective 2", "objective 3", "objective 4"],
  "eyfsAreas": ["EYFS area 1", "area 2", "area 3"],
  "weeklyMaterials": ["material 1", "material 2", "material 3", "material 4", "material 5"],
  "parentInvolvement": "Suggested home activities",
  "weeklyAssessment": "End-of-week assessment summary"
}`;

      const overviewResponse = await invokeLLM({
        messages: [
          { role: "system", content: "You MUST respond with valid JSON only. No text outside JSON." },
          { role: "user", content: overviewPrompt }
        ],
        response_format: { type: "json_object" },
      });

      const overviewParsed = safeJsonParse((overviewResponse.choices[0].message.content as string) || "{}");
      const overview = overviewParsed.success ? overviewParsed.data : {
        title: isArabic ? `خطة أسبوعية: ${input.theme}` : `Weekly Plan: ${input.theme}`,
        theme: input.theme,
        ageGroup: input.ageGroup,
        overview: "",
        learningObjectives: [],
        eyfsAreas: [],
        weeklyMaterials: [],
        parentInvolvement: "",
        weeklyAssessment: ""
      };

      // Step 2: Generate each day individually (5 separate calls)
      const generatedDays: any[] = [];
      
      for (let i = 0; i < 5; i++) {
        const dayName = days[i];
        const dayNumber = i + 1;
        
        const dayPrompt = isArabic
          ? `أنتِ مخططة مناهج رياض أطفال خبيرة في المملكة العربية السعودية. أنشئي خطة يوم ${dayName} فقط (اليوم ${dayNumber} من 5).

الفئة العمرية: ${input.ageGroup}
الموضوع/الثيمة: ${input.theme}
${goals ? `أهداف التعلم: ${goals}` : ""}
هذا اليوم ${dayNumber} من 5 أيام. ${dayNumber > 1 ? "يجب أن يبني على ما سبق ويتدرج في الصعوبة." : "هذا أول يوم - ابدئي بالتعريف والاستكشاف."}

${CULTURAL_GUIDELINES}

اكتبي JSON فقط لهذا اليوم الواحد:
{
  "day": "${dayName}",
  "learningObjective": "الهدف التعليمي المحدد لهذا اليوم",
  "circleTime": {
    "activity": "اسم نشاط حلقة الصباح",
    "description": "وصف تفصيلي لما تفعله المعلمة خطوة بخطوة",
    "duration": "15 دقيقة",
    "teacherInstructions": "تعليمات واضحة ومرقمة للمعلمة"
  },
  "mainActivity": {
    "title": "عنوان النشاط الرئيسي",
    "description": "وصف تفصيلي للنشاط",
    "duration": "30 دقيقة",
    "teacherInstructions": "تعليمات تفصيلية خطوة بخطوة",
    "materials": ["مادة 1", "مادة 2", "مادة 3"],
    "differentiation": "تعديلات للمستويات المختلفة"
  },
  "storyRecommendation": {
    "title": "اسم القصة",
    "author": "المؤلف",
    "summary": "ملخص القصة",
    "connection": "ارتباط القصة بالموضوع"
  },
  "discussionQuestions": ["سؤال 1", "سؤال 2", "سؤال 3"],
  "materials": ["جميع المواد المطلوبة لهذا اليوم"],
  "islamicValue": {
    "value": "القيمة الإسلامية",
    "connection": "ربط القيمة بالأنشطة",
    "hadithOrAyah": "حديث أو آية مناسبة للأطفال"
  },
  "assessmentOpportunity": {
    "what": "ماذا نقيّم",
    "how": "طريقة التقييم",
    "indicators": ["مؤشر 1", "مؤشر 2"]
  },
  "totalDuration": "المدة الإجمالية"
}
اكتبي بالعربية فقط. لا تترك أي حقل فارغاً.`
          : `You are an expert EYFS curriculum planner in Saudi Arabia. Create the plan for ${dayName} ONLY (day ${dayNumber} of 5).

Age group: ${input.ageGroup}
Theme: ${input.theme}
${goals ? `Learning goals: ${goals}` : ""}
This is day ${dayNumber} of 5. ${dayNumber > 1 ? "Build on previous days and increase complexity." : "This is the first day - start with introduction and exploration."}

${CULTURAL_GUIDELINES}

Return JSON for this single day only:
{
  "day": "${dayName}",
  "learningObjective": "Specific learning objective for this day",
  "circleTime": {
    "activity": "Circle time activity name",
    "description": "Detailed step-by-step description",
    "duration": "15 minutes",
    "teacherInstructions": "Clear numbered instructions for teacher"
  },
  "mainActivity": {
    "title": "Main activity title",
    "description": "Detailed activity description",
    "duration": "30 minutes",
    "teacherInstructions": "Step-by-step teacher instructions",
    "materials": ["material 1", "material 2", "material 3"],
    "differentiation": "Modifications for different levels"
  },
  "storyRecommendation": {
    "title": "Story name",
    "author": "Author",
    "summary": "Brief summary",
    "connection": "Connection to theme"
  },
  "discussionQuestions": ["question 1", "question 2", "question 3"],
  "materials": ["All materials needed for this day"],
  "islamicValue": {
    "value": "Islamic value",
    "connection": "How to connect to activities",
    "hadithOrAyah": "Short hadith or ayah for children"
  },
  "assessmentOpportunity": {
    "what": "What to assess",
    "how": "Assessment method",
    "indicators": ["indicator 1", "indicator 2"]
  },
  "totalDuration": "Total duration"
}
Do NOT leave any field empty.`;

        let dayContent: any = null;
        let dayAttempts = 0;
        
        while (dayAttempts < 2 && !dayContent) {
          dayAttempts++;
          try {
            const dayResponse = await invokeLLM({
              messages: [
                { role: "system", content: "You MUST respond with valid JSON only for a single day plan. No text outside JSON. Keep response concise but complete." },
                { role: "user", content: dayPrompt }
              ],
              response_format: { type: "json_object" },
            });

            const rawDay = (dayResponse.choices[0].message.content as string) || "{}";
            const parsedDay = safeJsonParse(rawDay);
            
            if (parsedDay.success && parsedDay.data) {
              // Validate this day has required fields
              const d = parsedDay.data;
              if (d.learningObjective && (d.circleTime || d.circle_time) && (d.mainActivity || d.main_activity)) {
                // Normalize field names
                dayContent = {
                  day: dayName,
                  learningObjective: d.learningObjective || d.learning_objective || "",
                  circleTime: d.circleTime || d.circle_time || { activity: "", description: "", duration: "15 دقيقة", teacherInstructions: "" },
                  mainActivity: d.mainActivity || d.main_activity || { title: "", description: "", duration: "30 دقيقة", teacherInstructions: "", materials: [], differentiation: "" },
                  storyRecommendation: d.storyRecommendation || d.story_recommendation || d.story || { title: "", author: "", summary: "", connection: "" },
                  discussionQuestions: d.discussionQuestions || d.discussion_questions || [],
                  materials: d.materials || [],
                  islamicValue: d.islamicValue || d.islamic_value || { value: "", connection: "", hadithOrAyah: "" },
                  assessmentOpportunity: d.assessmentOpportunity || d.assessment_opportunity || d.assessment || { what: "", how: "", indicators: [] },
                  totalDuration: d.totalDuration || d.total_duration || (isArabic ? "ساعة ونصف" : "1.5 hours")
                };
              }
            }
          } catch (e) {
            // Retry on error
          }
        }
        
        // If day generation failed after retries, create a minimal placeholder
        if (!dayContent) {
          dayContent = {
            day: dayName,
            learningObjective: isArabic ? `استكشاف موضوع ${input.theme} - اليوم ${dayNumber}` : `Explore ${input.theme} - Day ${dayNumber}`,
            circleTime: {
              activity: isArabic ? "حلقة الصباح" : "Morning Circle",
              description: isArabic ? "مناقشة موضوع اليوم مع الأطفال" : "Discuss today's topic with children",
              duration: isArabic ? "15 دقيقة" : "15 minutes",
              teacherInstructions: isArabic ? "اجمعي الأطفال في الحلقة وابدئي بالمناقشة" : "Gather children and begin discussion"
            },
            mainActivity: {
              title: isArabic ? `نشاط ${input.theme}` : `${input.theme} Activity`,
              description: isArabic ? "نشاط تفاعلي مرتبط بالموضوع" : "Interactive activity related to theme",
              duration: isArabic ? "30 دقيقة" : "30 minutes",
              teacherInstructions: isArabic ? "يرجى إعادة التوليد للحصول على تعليمات مفصلة" : "Please regenerate for detailed instructions",
              materials: [],
              differentiation: ""
            },
            storyRecommendation: { title: "", author: "", summary: "", connection: "" },
            discussionQuestions: [],
            materials: [],
            islamicValue: { value: "", connection: "", hadithOrAyah: "" },
            assessmentOpportunity: { what: "", how: "", indicators: [] },
            totalDuration: isArabic ? "ساعة ونصف" : "1.5 hours"
          };
        }
        
        generatedDays.push(dayContent);
      }

      // Step 3: Assemble the complete plan
      const content: any = {
        ...overview,
        days: generatedDays
      };

      // Step 4: Final validation - ensure we have exactly 5 days
      if (content.days.length !== 5) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isArabic ? 'فشل في إنشاء خطة كاملة لـ 5 أيام. يرجى المحاولة مرة أخرى.' : 'Failed to generate complete 5-day plan. Please try again.'
        });
      }

      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "weekly_plan",
        title: content.title || `خطة أسبوعية: ${input.theme}`,
        content: content,
        language: input.language,
        classId: input.classId || null,
        ageGroup: input.ageGroup,
        theme: input.theme,
        inputPrompt: `${input.ageGroup} - ${input.theme}`,
        createdBy: ctx.user!.id,
      });

      return { id: saved.insertId, ...content };
    }),

  // ============ AI ACTIVITY GENERATOR ============
  generateActivity: aiProcedure
    .input(z.object({
      age: z.string().min(1),
      topic: z.string().min(1),
      language: z.enum(["ar", "en"]).default("ar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const prompt = input.language === "ar"
        ? `أنت معلمة رياض أطفال مبدعة في المملكة العربية السعودية. أنشئي نشاطاً تعليمياً مفصلاً.

العمر: ${input.age}
الموضوع: ${input.topic}

${CULTURAL_GUIDELINES}

اكتبي الرد بصيغة JSON:
{
  "title": "عنوان النشاط",
  "learningObjective": "الهدف التعليمي الرئيسي",
  "eyfsArea": "مجال EYFS المرتبط",
  "ageGroup": "${input.age}",
  "duration": "المدة المقترحة",
  "materials": ["مادة 1", "مادة 2", "مادة 3"],
  "preparation": "خطوات التحضير",
  "instructions": ["خطوة 1", "خطوة 2", "خطوة 3", "خطوة 4"],
  "extensionIdeas": ["فكرة توسيع 1", "فكرة توسيع 2"],
  "simplificationIdeas": ["تبسيط للأطفال الأصغر"],
  "assessmentMethod": "طريقة التقييم",
  "vocabularyWords": ["كلمة 1", "كلمة 2", "كلمة 3"],
  "safetyNotes": "ملاحظات السلامة إن وجدت"
}

اكتبي كل شيء بالعربية فقط.`
        : `You are a creative early years teacher in Saudi Arabia. Create a detailed learning activity.

Age: ${input.age}
Topic: ${input.topic}

${CULTURAL_GUIDELINES}

Write the response in JSON format:
{
  "title": "Activity title",
  "learningObjective": "Main learning objective",
  "eyfsArea": "Related EYFS area",
  "ageGroup": "${input.age}",
  "duration": "Suggested duration",
  "materials": ["material 1", "material 2", "material 3"],
  "preparation": "Preparation steps",
  "instructions": ["step 1", "step 2", "step 3", "step 4"],
  "extensionIdeas": ["extension idea 1", "extension idea 2"],
  "simplificationIdeas": ["simplification for younger children"],
  "assessmentMethod": "Assessment method",
  "vocabularyWords": ["word 1", "word 2", "word 3"],
  "safetyNotes": "Safety notes if applicable"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert early years educator. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = (response.choices[0].message.content as string) || "{}";
      const parsed = safeJsonParse(rawContent);
      if (!parsed.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ في معالجة الاستجابة. يرجى المحاولة مرة أخرى.' });
      }
      const content = parsed.data;
      
      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "activity",
        title: content.title || input.topic,
        content: content,
        language: input.language,
        ageGroup: input.age,
        theme: input.topic,
        inputPrompt: `${input.age} - ${input.topic}`,
        createdBy: ctx.user!.id,
      });

      return { id: saved.insertId, ...content };
    }),

  // ============ AI CHILD PROGRESS REPORT ============
  generateProgressReport: aiProcedure
    .input(z.object({
      childId: z.number(),
      language: z.enum(["ar", "en"]).default("ar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Fetch child data
      const [child] = await db.select().from(children).where(eq(children.id, input.childId)).limit(1);
      if (!child) throw new TRPCError({ code: 'NOT_FOUND', message: 'Child not found' });

      // Fetch attendance (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const attendanceRecords = await db.select().from(attendance)
        .where(and(eq(attendance.childId, input.childId), sql`${attendance.date} >= ${thirtyDaysAgo}`));

      // Fetch observations
      const observations = await db.select().from(learningObservations)
        .where(eq(learningObservations.childId, input.childId))
        .orderBy(desc(learningObservations.createdAt))
        .limit(10);

      // Fetch assessments
      const assessments = await db.select().from(eyfsAssessments)
        .where(eq(eyfsAssessments.childId, input.childId))
        .orderBy(desc(eyfsAssessments.createdAt))
        .limit(10);

      // Fetch daily reports
      const reports = await db.select().from(dailyReports)
        .where(eq(dailyReports.childId, input.childId))
        .orderBy(desc(dailyReports.date))
        .limit(10);

      const childName = child.arabicName || `${child.firstName} ${child.lastName}`;
      const presentDays = attendanceRecords.filter((a: any) => a.status === 'present' || a.status === 'checked_in').length;
      const totalDays = attendanceRecords.length;
      const observationSummary = observations.map((o: any) => `${o.area}: ${o.title}`).join("، ");
      const assessmentSummary = assessments.map((a: any) => `${a.area} (${a.level})`).join("، ");

      const prompt = input.language === "ar"
        ? `أنت معلمة رياض أطفال محترفة في المملكة العربية السعودية. اكتبي تقرير تقدم شامل لولي الأمر.

اسم الطفل: ${childName}
العمر: ${child.dateOfBirth ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'غير محدد'} سنوات
الحضور: ${presentDays} من ${totalDays} يوم (آخر 30 يوم)
الملاحظات التعليمية: ${observationSummary || 'لا توجد ملاحظات مسجلة'}
التقييمات: ${assessmentSummary || 'لا توجد تقييمات مسجلة'}

${CULTURAL_GUIDELINES}

اكتبي الرد بصيغة JSON:
{
  "title": "تقرير تقدم ${childName}",
  "period": "الشهر الحالي",
  "summary": "ملخص عام عن تقدم الطفل (3-4 جمل)",
  "attendance": {
    "summary": "ملخص الحضور",
    "percentage": ${totalDays > 0 ? Math.round(presentDays/totalDays*100) : 0}
  },
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "areasForDevelopment": ["مجال تطوير 1", "مجال تطوير 2"],
  "nextLearningSteps": ["خطوة تعلم 1", "خطوة تعلم 2", "خطوة تعلم 3"],
  "socialEmotional": "وصف النمو الاجتماعي والعاطفي",
  "physicalDevelopment": "وصف النمو الجسدي",
  "communicationLanguage": "وصف التواصل واللغة",
  "parentRecommendations": ["توصية لولي الأمر 1", "توصية 2"],
  "teacherComment": "تعليق المعلمة الختامي"
}

اكتبي كل شيء بالعربية فقط. اجعلي التقرير إيجابياً ومشجعاً.`
        : `You are a professional early years teacher in Saudi Arabia. Write a comprehensive progress report for parents.

Child name: ${childName}
Age: ${child.dateOfBirth ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'unknown'} years
Attendance: ${presentDays} out of ${totalDays} days (last 30 days)
Learning observations: ${observationSummary || 'No observations recorded'}
Assessments: ${assessmentSummary || 'No assessments recorded'}

${CULTURAL_GUIDELINES}

Write the response in JSON format:
{
  "title": "Progress Report for ${childName}",
  "period": "Current month",
  "summary": "General summary of child's progress (3-4 sentences)",
  "attendance": { "summary": "Attendance summary", "percentage": ${totalDays > 0 ? Math.round(presentDays/totalDays*100) : 0} },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForDevelopment": ["area 1", "area 2"],
  "nextLearningSteps": ["step 1", "step 2", "step 3"],
  "socialEmotional": "Social-emotional development description",
  "physicalDevelopment": "Physical development description",
  "communicationLanguage": "Communication and language description",
  "parentRecommendations": ["recommendation 1", "recommendation 2"],
  "teacherComment": "Teacher's closing comment"
}

Make the report positive and encouraging.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert early years educator. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = (response.choices[0].message.content as string) || "{}";
      const parsed = safeJsonParse(rawContent);
      if (!parsed.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ في معالجة الاستجابة. يرجى المحاولة مرة أخرى.' });
      }
      const content = parsed.data;
      
      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "progress_report",
        title: content.title || `تقرير تقدم ${childName}`,
        content: content,
        language: input.language,
        childId: input.childId,
        inputPrompt: `Progress report for ${childName}`,
        createdBy: ctx.user!.id,
      });

      return { id: saved.insertId, ...content };
    }),

  // ============ AI PARENT MESSAGE GENERATOR ============
  generateParentMessage: aiProcedure
    .input(z.object({
      idea: z.string().min(3),
      tone: z.enum(["formal", "friendly", "urgent"]).default("friendly"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const prompt = `أنت مسؤولة تواصل في حضانة أطفال في المملكة العربية السعودية. اكتبي رسالة مهنية لأولياء الأمور بناءً على هذه الفكرة:

الفكرة: ${input.idea}
النبرة: ${input.tone === 'formal' ? 'رسمية' : input.tone === 'urgent' ? 'عاجلة' : 'ودية'}

${CULTURAL_GUIDELINES}

اكتبي الرد بصيغة JSON:
{
  "titleAr": "عنوان الرسالة بالعربية",
  "titleEn": "Message title in English",
  "messageAr": "نص الرسالة الكاملة بالعربية (مهنية ومناسبة لأولياء الأمور)",
  "messageEn": "Full message text in English (professional and appropriate for parents)",
  "closingAr": "خاتمة مناسبة بالعربية",
  "closingEn": "Appropriate closing in English"
}

اكتبي رسالتين كاملتين: واحدة بالعربية وأخرى بالإنجليزية.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a bilingual communication specialist. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = (response.choices[0].message.content as string) || "{}";
      const parsed = safeJsonParse(rawContent);
      if (!parsed.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ في معالجة الاستجابة. يرجى المحاولة مرة أخرى.' });
      }
      const content = parsed.data;
      
      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "parent_message",
        title: content.titleAr || input.idea,
        content: content,
        language: "ar",
        inputPrompt: input.idea,
        createdBy: ctx.user!.id,
      });

      return { id: saved.insertId, ...content };
    }),

  // ============ AI NEWSLETTER GENERATOR ============
  generateNewsletter: aiProcedure
    .input(z.object({
      month: z.string().min(1),
      highlights: z.array(z.string()).optional(),
      language: z.enum(["ar", "en"]).default("ar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Fetch recent events and announcements
      const recentEvents = await db.select().from(calendarEvents)
        .orderBy(desc(calendarEvents.eventDate)).limit(5);
      const recentAnnouncements = await db.select().from(announcements)
        .orderBy(desc(announcements.createdAt)).limit(5);

      const eventsText = recentEvents.map((e: any) => e.title || e.titleAr).join("، ");
      const announcementsText = recentAnnouncements.map((a: any) => a.title).join("، ");
      const highlightsText = input.highlights?.join("، ") || "";

      const prompt = input.language === "ar"
        ? `أنت محررة نشرة إخبارية لحضانة أطفال في المملكة العربية السعودية. أنشئي نشرة شهرية جذابة لأولياء الأمور.

الشهر: ${input.month}
الأحداث الأخيرة: ${eventsText || 'لا توجد أحداث مسجلة'}
الإعلانات: ${announcementsText || 'لا توجد إعلانات'}
أبرز الأحداث: ${highlightsText || 'لا توجد'}

${CULTURAL_GUIDELINES}

اكتبي الرد بصيغة JSON:
{
  "title": "عنوان النشرة",
  "greeting": "تحية افتتاحية دافئة",
  "introduction": "مقدمة عن الشهر (2-3 جمل)",
  "sections": [
    {
      "title": "عنوان القسم",
      "content": "محتوى القسم"
    }
  ],
  "upcomingEvents": ["حدث قادم 1", "حدث قادم 2"],
  "parentTips": ["نصيحة لولي الأمر 1", "نصيحة 2"],
  "closing": "خاتمة دافئة",
  "callToAction": "دعوة للتفاعل"
}

اكتبي كل شيء بالعربية فقط. اجعلي النشرة دافئة ومهنية.`
        : `You are a newsletter editor for a nursery in Saudi Arabia. Create an engaging monthly newsletter for parents.

Month: ${input.month}
Recent events: ${eventsText || 'No events recorded'}
Announcements: ${announcementsText || 'No announcements'}
Highlights: ${highlightsText || 'None'}

${CULTURAL_GUIDELINES}

Write the response in JSON format:
{
  "title": "Newsletter title",
  "greeting": "Warm opening greeting",
  "introduction": "Introduction about the month (2-3 sentences)",
  "sections": [{ "title": "Section title", "content": "Section content" }],
  "upcomingEvents": ["upcoming event 1", "upcoming event 2"],
  "parentTips": ["parent tip 1", "tip 2"],
  "closing": "Warm closing",
  "callToAction": "Call to action"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert newsletter writer. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = (response.choices[0].message.content as string) || "{}";
      const parsed = safeJsonParse(rawContent);
      if (!parsed.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ في معالجة الاستجابة. يرجى المحاولة مرة أخرى.' });
      }
      const content = parsed.data;
      
      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "newsletter",
        title: content.title || `نشرة ${input.month}`,
        content: content,
        language: input.language,
        theme: input.month,
        inputPrompt: `Newsletter for ${input.month}`,
        createdBy: ctx.user!.id,
      });

      return { id: saved.insertId, ...content };
    }),

  // ============ AI STORY CREATOR ============
  generateStory: aiProcedure
    .input(z.object({
      theme: z.string().min(1),
      ageGroup: z.string().min(1),
      language: z.enum(["ar", "en"]).default("ar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const prompt = input.language === "ar"
        ? `أنت كاتبة قصص أطفال تعليمية في المملكة العربية السعودية. اكتبي قصة تعليمية قصيرة مناسبة للأطفال.

الموضوع: ${input.theme}
الفئة العمرية: ${input.ageGroup}

${CULTURAL_GUIDELINES}

اكتبي الرد بصيغة JSON:
{
  "title": "عنوان القصة",
  "story": "نص القصة الكاملة (مناسبة للقراءة بصوت عالٍ، 200-400 كلمة)",
  "moral": "العبرة من القصة",
  "discussionQuestions": ["سؤال للنقاش 1", "سؤال 2", "سؤال 3"],
  "vocabularyWords": [
    {"word": "كلمة", "meaning": "معناها البسيط"}
  ],
  "followUpActivities": ["نشاط متابعة 1", "نشاط 2", "نشاط 3"],
  "eyfsAreas": ["المجال التعليمي المرتبط"],
  "ageAppropriate": "${input.ageGroup}"
}

اكتبي كل شيء بالعربية فقط. اجعلي القصة ممتعة وتعليمية.`
        : `You are an educational children's story writer in Saudi Arabia. Write a short educational story appropriate for children.

Theme: ${input.theme}
Age group: ${input.ageGroup}

${CULTURAL_GUIDELINES}

Write the response in JSON format:
{
  "title": "Story title",
  "story": "Full story text (suitable for reading aloud, 200-400 words)",
  "moral": "Moral of the story",
  "discussionQuestions": ["discussion question 1", "question 2", "question 3"],
  "vocabularyWords": [{"word": "word", "meaning": "simple meaning"}],
  "followUpActivities": ["follow-up activity 1", "activity 2", "activity 3"],
  "eyfsAreas": ["Related learning area"],
  "ageAppropriate": "${input.ageGroup}"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert children's story writer. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = (response.choices[0].message.content as string) || "{}";
      const parsed = safeJsonParse(rawContent);
      if (!parsed.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ في معالجة الاستجابة. يرجى المحاولة مرة أخرى.' });
      }
      const content = parsed.data;
      
      const [saved] = await db.insert(aiGeneratedContent).values({
        type: "story",
        title: content.title || input.theme,
        content: content,
        language: input.language,
        ageGroup: input.ageGroup,
        theme: input.theme,
        inputPrompt: `${input.ageGroup} - ${input.theme}`,
        createdBy: ctx.user!.id,
      });

      return { id: saved.insertId, ...content };
    }),

  // ============ AI LIBRARY ============
  saveToLibrary: aiProcedure
    .input(z.object({
      contentId: z.number(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Get the content to determine category
      const [content] = await db.select().from(aiGeneratedContent).where(eq(aiGeneratedContent.id, input.contentId)).limit(1);
      if (!content) throw new TRPCError({ code: 'NOT_FOUND' });

      // Mark as saved
      await db.update(aiGeneratedContent).set({ isSaved: true }).where(eq(aiGeneratedContent.id, input.contentId));

      // Add to library
      const [saved] = await db.insert(aiLibrary).values({
        contentId: input.contentId,
        category: content.type,
        tags: input.tags || [],
        savedBy: ctx.user!.id,
      });

      return { id: saved.insertId, success: true };
    }),

  removeFromLibrary: aiProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [item] = await db.select().from(aiLibrary).where(eq(aiLibrary.id, input.id)).limit(1);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      
      await db.update(aiGeneratedContent).set({ isSaved: false }).where(eq(aiGeneratedContent.id, item.contentId));
      await db.delete(aiLibrary).where(eq(aiLibrary.id, input.id));
      return { success: true };
    }),

  toggleFavorite: aiProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [item] = await db.select().from(aiLibrary).where(eq(aiLibrary.id, input.id)).limit(1);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      await db.update(aiLibrary).set({ isFavorite: !item.isFavorite }).where(eq(aiLibrary.id, input.id));
      return { success: true, isFavorite: !item.isFavorite };
    }),

  getLibrary: aiProcedure
    .input(z.object({
      category: z.enum(["observation", "weekly_plan", "activity", "progress_report", "parent_message", "newsletter", "story"]).optional(),
      search: z.string().optional(),
      favoritesOnly: z.boolean().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions: any[] = [eq(aiLibrary.savedBy, ctx.user!.id)];
      
      if (input.category) conditions.push(eq(aiLibrary.category, input.category));
      if (input.favoritesOnly) conditions.push(eq(aiLibrary.isFavorite, true));

      const items = await db.select({
        libraryId: aiLibrary.id,
        contentId: aiLibrary.contentId,
        category: aiLibrary.category,
        tags: aiLibrary.tags,
        isFavorite: aiLibrary.isFavorite,
        usageCount: aiLibrary.usageCount,
        savedAt: aiLibrary.createdAt,
        title: aiGeneratedContent.title,
        content: aiGeneratedContent.content,
        language: aiGeneratedContent.language,
        type: aiGeneratedContent.type,
        createdAt: aiGeneratedContent.createdAt,
      })
      .from(aiLibrary)
      .innerJoin(aiGeneratedContent, eq(aiLibrary.contentId, aiGeneratedContent.id))
      .where(and(...conditions))
      .orderBy(desc(aiLibrary.createdAt))
      .limit(input.limit)
      .offset(input.offset);

      return items;
    }),

  // ============ HISTORY ============
  getHistory: aiProcedure
    .input(z.object({
      type: z.enum(["observation", "weekly_plan", "activity", "progress_report", "parent_message", "newsletter", "story"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions: any[] = [eq(aiGeneratedContent.createdBy, ctx.user!.id)];
      if (input.type) conditions.push(eq(aiGeneratedContent.type, input.type));

      const items = await db.select()
        .from(aiGeneratedContent)
        .where(and(...conditions))
        .orderBy(desc(aiGeneratedContent.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return items;
    }),

  getById: aiProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [item] = await db.select().from(aiGeneratedContent).where(eq(aiGeneratedContent.id, input.id)).limit(1);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      return item;
    }),

  // ============ AI CHILD ASSISTANT (Quran & Islamic) ============
  childAssistant: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(2000),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional().default([]),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = `أنت مساعد ذكي ودود مخصص للأطفال في حضانة Learning Tree.
مهمتك الأساسية:
- مساعدة الأطفال في حفظ القرآن الكريم بطريقة ممتعة ومشجعة
- المراجعة اليومية للسور المحفوظة
- الإجابة على أسئلة إسلامية بسيطة ومناسبة لعمر الأطفال (3-6 سنوات)
- تقديم التحفيز والتشجيع اليومي
- إنشاء خطط حفظ سهلة ومتدرجة
- إرسال رسائل تشجيعية

قواعد مهمة:
- استخدم لغة عربية بسيطة ومفهومة للأطفال
- لا تستخدم كلمات إنجليزية أبداً
- كن مشجعاً ولطيفاً دائماً
- استخدم الرموز التعبيرية باعتدال لجعل المحادثة ممتعة
- ابدأ بالسور القصيرة (جزء عمّ) للأطفال الصغار
- قدم المعلومات بطريقة قصصية وممتعة
- شجع الطفل بعد كل إجابة صحيحة
- إذا أخطأ الطفل، صحح بلطف وشجعه على المحاولة مرة أخرى
- احترم القيم الإسلامية والعربية في كل ردودك
- لا تذكر مواضيع غير مناسبة للأطفال
- ركز على الحب والرحمة والأخلاق الحسنة
- عند اختبار الطفل، اسأل سؤالاً واحداً في كل مرة وانتظر الإجابة
- عند طلب خطة حفظ، قدم خطة بسيطة يومية مع تكرار وتثبيت`;

      const messages: Array<{role: string; content: string}> = [
        { role: "system", content: systemPrompt },
        ...input.history.slice(-10).map((m: {role: string; content: string}) => ({ role: m.role, content: m.content })),
        { role: "user", content: input.message },
      ];

      const response = await invokeLLM({ messages: messages as any });
      const content = response.choices?.[0]?.message?.content || "عذراً، لم أستطع الرد. حاول مرة أخرى! 🌟";

      return { response: content as string };
    }),

  deleteContent: aiProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [item] = await db.select().from(aiGeneratedContent).where(eq(aiGeneratedContent.id, input.id)).limit(1);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      if (item.createdBy !== ctx.user!.id) throw new TRPCError({ code: 'FORBIDDEN' });
      
      // Remove from library if saved
      await db.delete(aiLibrary).where(eq(aiLibrary.contentId, input.id));
      await db.delete(aiGeneratedContent).where(eq(aiGeneratedContent.id, input.id));
      return { success: true };
    }),
});
