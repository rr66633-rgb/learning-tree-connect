import { tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { aiGeneratedContent } from "../drizzle/schema";
import { getDb } from "./db";
// Image generation is handled by posterGenerator.ts

// Only staff can use marketing features
const marketingProcedure = tenantProcedure.use(({ ctx, next }) => {
  const role = ctx.user?.role;
  if (role !== 'admin' && role !== 'super_admin' && role !== 'principal' && role !== 'owner' && role !== 'teacher' && role !== 'assistant') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Marketing features are restricted to staff members' });
  }
  return next({ ctx });
});

const BRAND_GUIDELINES = `
أنت مسؤول التسويق في مركز نشأة - حضانة وروضة أطفال في المملكة العربية السعودية.

إرشادات العلامة التجارية:
- الاسم: نشأة / Nashaa
- الألوان: أخضر زمردي (#10B981)، أزرق داكن (#0F4C5C)، ذهبي (#F59E0B)
- الأسلوب: احترافي، دافئ، يركز على الطفل والأسرة
- القيم: التعليم، الرعاية، الإبداع، الأمان، التطور

قواعد ثقافية:
- احترم القيم الإسلامية والعربية
- لا تذكر: الخنازير، الكحول، القمار، السحر، الهالوين
- استخدم أمثلة من البيئة السعودية
- المحتوى يجب أن يكون مناسباً لأولياء الأمور
`;

function parseMarketingContent(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

async function saveMarketingResult(ctx: any, input: {
  title: string;
  subType: string;
  content: Record<string, unknown>;
  request: Record<string, unknown>;
  language: "ar" | "en" | "both";
}) {
  const db = (await getDb())!;
  const [saved] = await db.insert(aiGeneratedContent).values({
    organizationId: ctx.organizationId,
    createdBy: ctx.user!.id,
    type: "marketing",
    title: input.title,
    content: { subType: input.subType, ...input.content },
    inputPrompt: JSON.stringify(input.request),
    language: input.language === "both" ? "bilingual" : input.language,
  });
  return saved.insertId;
}

export const aiMarketingRouter = router({
  // ============ EVENT CONTENT GENERATOR ============
  generateEventContent: marketingProcedure.input(z.object({
    eventName: z.string().min(1),
    eventType: z.string().min(1),
    date: z.string().min(1),
    time: z.string().optional(),
    ageGroup: z.string().optional(),
    location: z.string().optional(),
    description: z.string().min(1),
    language: z.enum(["ar", "en", "both"]).default("both"),
  })).mutation(async ({ input, ctx }) => {
    const prompt = `
${BRAND_GUIDELINES}

أنشئ محتوى تسويقي شامل للفعالية التالية:
- اسم الفعالية: ${input.eventName}
- نوع الفعالية: ${input.eventType}
- التاريخ: ${input.date}
${input.time ? `- الوقت: ${input.time}` : ''}
${input.ageGroup ? `- الفئة العمرية: ${input.ageGroup}` : ''}
${input.location ? `- المكان: ${input.location}` : ''}
- الوصف: ${input.description}
- اللغة المطلوبة: ${input.language === 'ar' ? 'عربي فقط' : input.language === 'en' ? 'إنجليزي فقط' : 'عربي وإنجليزي'}

أنشئ المحتوى التالي بصيغة JSON:
{
  "parentAnnouncement": { "ar": "إعلان رسمي لأولياء الأمور بالعربي", "en": "English parent announcement" },
  "pushNotification": "إشعار قصير مناسب للهاتف (سطر واحد)",
  "whatsappMessage": "رسالة واتساب جاهزة مع إيموجي مناسبة",
  "smsMessage": "رسالة SMS قصيرة (160 حرف كحد أقصى)",
  "instagramCaption": { "ar": "كابشن انستقرام بالعربي", "en": "English Instagram caption", "hashtags": ["#hashtag1", "#hashtag2"] },
  "tiktokCaption": { "caption": "كابشن تيك توك قصير وجذاب", "hashtags": ["#hashtag1", "#hashtag2"] },
  "snapchatCaption": "كابشن سناب شات قصير وترويجي",
  "websiteArticle": { "title": "عنوان المقال", "body": "نص المقال الكامل للموقع" }
}

أجب بـ JSON فقط بدون أي نص إضافي.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "أنت خبير تسويق متخصص في محتوى الحضانات والروضات. أجب دائماً بـ JSON صالح فقط." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = parseMarketingContent(response.choices?.[0]?.message?.content as string);
    const id = await saveMarketingResult(ctx, {
      title: `محتوى فعالية: ${input.eventName}`,
      subType: "event_content",
      content,
      request: input,
      language: input.language,
    });
    return { id, content };
  }),

  // ============ EVENT SUMMARY GENERATOR ============
  generateEventSummary: marketingProcedure.input(z.object({
    eventName: z.string().min(1),
    eventType: z.string().min(1),
    date: z.string().min(1),
    attendeesCount: z.number().optional(),
    highlights: z.string().min(1),
    language: z.enum(["ar", "en", "both"]).default("both"),
  })).mutation(async ({ input, ctx }) => {
    const prompt = `
${BRAND_GUIDELINES}

أنشئ ملخص ما بعد الفعالية:
- اسم الفعالية: ${input.eventName}
- نوع الفعالية: ${input.eventType}
- التاريخ: ${input.date}
${input.attendeesCount ? `- عدد الحضور: ${input.attendeesCount}` : ''}
- أبرز اللحظات: ${input.highlights}
- اللغة: ${input.language === 'ar' ? 'عربي فقط' : input.language === 'en' ? 'إنجليزي فقط' : 'عربي وإنجليزي'}

أنشئ بصيغة JSON:
{
  "eventReport": "تقرير مفصل عن الفعالية (3-5 فقرات)",
  "parentSummary": "ملخص قصير لأولياء الأمور (فقرة واحدة)",
  "achievementSummary": "ملخص الإنجازات والنتائج",
  "socialPost": { "caption": "بوست سوشال ميديا عن نجاح الفعالية", "hashtags": ["#hashtag1"] },
  "thankYouMessage": "رسالة شكر لأولياء الأمور والمشاركين"
}

أجب بـ JSON فقط.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "أنت خبير تسويق متخصص في محتوى الحضانات والروضات. أجب دائماً بـ JSON صالح فقط." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = parseMarketingContent(response.choices?.[0]?.message?.content as string);
    const id = await saveMarketingResult(ctx, {
      title: `ملخص فعالية: ${input.eventName}`,
      subType: "event_summary",
      content,
      request: input,
      language: input.language,
    });
    return { id, content };
  }),

  // ============ SOCIAL MEDIA CONTENT GENERATOR ============
  generateSocialContent: marketingProcedure.input(z.object({
    topic: z.string().min(1),
    platform: z.enum(["instagram_post", "instagram_story", "instagram_reel", "tiktok", "snapchat"]),
    tone: z.enum(["professional", "fun", "educational", "promotional"]).default("professional"),
    language: z.enum(["ar", "en", "both"]).default("both"),
    additionalNotes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const platformNames: Record<string, string> = {
      instagram_post: "بوست انستقرام",
      instagram_story: "ستوري انستقرام",
      instagram_reel: "ريلز انستقرام",
      tiktok: "تيك توك",
      snapchat: "سناب شات",
    };
    const toneNames: Record<string, string> = {
      professional: "احترافي",
      fun: "مرح وممتع",
      educational: "تعليمي",
      promotional: "ترويجي",
    };

    const prompt = `
${BRAND_GUIDELINES}

أنشئ محتوى ${platformNames[input.platform]} بأسلوب ${toneNames[input.tone]} عن الموضوع التالي:
${input.topic}
${input.additionalNotes ? `ملاحظات إضافية: ${input.additionalNotes}` : ''}
اللغة: ${input.language === 'ar' ? 'عربي فقط' : input.language === 'en' ? 'إنجليزي فقط' : 'عربي وإنجليزي'}

أنشئ بصيغة JSON:
{
  "instagram": { "caption": "كابشن مناسب", "hashtags": ["#هاشتاق1", "#هاشتاق2"] },
  "tiktok": { "caption": "كابشن تيك توك قصير", "hashtags": ["#هاشتاق1"] },
  "snapchat": { "caption": "كابشن سناب شات" }
}

أجب بـ JSON فقط.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "أنت خبير سوشال ميديا متخصص في محتوى الحضانات والروضات. أجب دائماً بـ JSON صالح فقط." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = parseMarketingContent(response.choices?.[0]?.message?.content as string);
    const id = await saveMarketingResult(ctx, {
      title: `محتوى تسويقي: ${input.topic}`,
      subType: "social_content",
      content,
      request: input,
      language: input.language,
    });
    return { id, content };
  }),

  // ============ MEDIA CAPTION GENERATOR ============
  generateMediaCaption: marketingProcedure.input(z.object({
    mediaUrl: z.string().min(1),
    mediaType: z.enum(["photo", "video"]),
    context: z.string().optional(),
    platform: z.enum(["instagram", "tiktok", "snapchat", "whatsapp", "all"]).default("all"),
    language: z.enum(["ar", "en", "both"]).default("ar"),
  })).mutation(async ({ input, ctx }) => {
    const prompt = `
${BRAND_GUIDELINES}

بناءً على ${input.mediaType === 'photo' ? 'الصورة' : 'الفيديو'} المرفق${input.context ? ` والسياق: ${input.context}` : ''}، أنشئ كابشنات مناسبة لمنصات السوشال ميديا.
اللغة: ${input.language === 'ar' ? 'عربي فقط' : input.language === 'en' ? 'إنجليزي فقط' : 'عربي وإنجليزي'}

أنشئ بصيغة JSON:
{
  "instagram": { "caption": "كابشن انستقرام مع إيموجي", "hashtags": ["#هاشتاق1", "#هاشتاق2"] },
  "tiktok": { "caption": "كابشن تيك توك قصير وجذاب", "hashtags": ["#هاشتاق1"] },
  "snapchat": { "caption": "كابشن سناب شات قصير" },
  "whatsapp": { "caption": "رسالة واتساب مناسبة لمشاركة الصورة/الفيديو" }
}

أجب بـ JSON فقط.`;

    const messages: any[] = [
      { role: "system", content: "أنت خبير سوشال ميديا متخصص في محتوى الحضانات والروضات. أجب دائماً بـ JSON صالح فقط." },
    ];

    // If media URL is provided, include it as image content
    if (input.mediaType === 'photo' && input.mediaUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: input.mediaUrl } },
          { type: "text", text: prompt },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await invokeLLM({ messages, response_format: { type: "json_object" } });
    const content = parseMarketingContent(response.choices?.[0]?.message?.content as string);
    const id = await saveMarketingResult(ctx, {
      title: `وصف ${input.mediaType === "photo" ? "صورة" : "فيديو"}${input.context ? `: ${input.context.slice(0, 120)}` : ""}`,
      subType: "media_caption",
      content,
      // Signed media URLs are intentionally not persisted in history.
      request: {
        mediaType: input.mediaType,
        context: input.context,
        platform: input.platform,
        language: input.language,
      },
      language: input.language,
    });
    return { id, content };
  }),

  // ============ POSTER GENERATOR ============
  generatePoster: marketingProcedure.input(z.object({
    title: z.string().min(1),
    date: z.string().optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    ageGroup: z.string().optional(),
    template: z.string().optional(),
    language: z.enum(["ar", "en"]).default("ar"),
  })).mutation(async ({ input, ctx }) => {
    try {
      const { generatePoster: genPoster } = await import('./posterGenerator');
      const { posterUrl } = await genPoster({
        title: input.title,
        date: input.date,
        time: input.time,
        location: input.location,
        ageGroup: input.ageGroup,
        template: input.template,
        language: input.language,
      });
      const id = await saveMarketingResult(ctx, {
        title: `بوستر: ${input.title}`,
        subType: "poster",
        content: { posterUrl },
        request: input,
        language: input.language,
      });
      return { id, posterUrl };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `فشل إنشاء البوستر: ${error.message}`,
      });
    }
  }),
});
