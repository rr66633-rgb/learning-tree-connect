// مقياس الكشف المبكر للكشف المبكر عن التأخر النمائي
// Assessment items organized by age group and domain

export type AgeGroup = "24-36" | "36-48" | "48-60" | "60-72";
export type Domain = "communication" | "gross_motor" | "fine_motor" | "problem_solving" | "personal_social";
export type ResponseValue = "yes" | "sometimes" | "not_yet";

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "24-36": "٢٤–٣٦ شهراً",
  "36-48": "٣٦–٤٨ شهراً",
  "48-60": "٤٨–٦٠ شهراً",
  "60-72": "٦٠–٧٢ شهراً",
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  communication: "التواصل واللغة",
  gross_motor: "الحركية الكبرى",
  fine_motor: "الحركية الدقيقة",
  problem_solving: "حل المشكلات والإدراك",
  personal_social: "المهارات الشخصية والاجتماعية",
};

export const RESPONSE_LABELS: Record<ResponseValue, string> = {
  yes: "نعم",
  sometimes: "أحياناً",
  not_yet: "ليس بعد",
};

export const RESPONSE_SCORES: Record<ResponseValue, number> = {
  yes: 2,
  sometimes: 1,
  not_yet: 0,
};

export interface AssessmentItem {
  text: string;
  domain: Domain;
  index: number;
}

export const ASSESSMENT_ITEMS: Record<AgeGroup, AssessmentItem[]> = {
  "24-36": [
    // التواصل واللغة
    { text: "يستجيب لاسمه عند مناداته", domain: "communication", index: 0 },
    { text: "يستخدم كلمات للتعبير عن احتياجاته", domain: "communication", index: 1 },
    { text: "يفهم التعليمات البسيطة", domain: "communication", index: 2 },
    { text: "يشير إلى الأشياء التي يريدها", domain: "communication", index: 3 },
    { text: "يسمي أشخاصاً مألوفين", domain: "communication", index: 4 },
    { text: "يقلد الكلمات الجديدة", domain: "communication", index: 5 },
    // الحركية الكبرى
    { text: "يمشي بثبات", domain: "gross_motor", index: 0 },
    { text: "يركض لمسافة قصيرة", domain: "gross_motor", index: 1 },
    { text: "يصعد الدرج بمساعدة", domain: "gross_motor", index: 2 },
    { text: "يركل الكرة", domain: "gross_motor", index: 3 },
    { text: "يجلس ويقف باستقلالية", domain: "gross_motor", index: 4 },
    { text: "يحاول القفز", domain: "gross_motor", index: 5 },
    // الحركية الدقيقة
    { text: "يمسك القلم أو الملعقة", domain: "fine_motor", index: 0 },
    { text: "يبني برجاً من المكعبات", domain: "fine_motor", index: 1 },
    { text: "يقلب صفحات الكتاب", domain: "fine_motor", index: 2 },
    { text: "يلتقط الأشياء الصغيرة", domain: "fine_motor", index: 3 },
    { text: "يضع الأشياء داخل الحاويات", domain: "fine_motor", index: 4 },
    { text: "يخربش بالقلم", domain: "fine_motor", index: 5 },
    // حل المشكلات والإدراك
    { text: "يبحث عن الأشياء المخفية", domain: "problem_solving", index: 0 },
    { text: "يطابق الأشياء المتشابهة", domain: "problem_solving", index: 1 },
    { text: "يميز بين بعض الأشكال", domain: "problem_solving", index: 2 },
    { text: "يستخدم الأدوات البسيطة", domain: "problem_solving", index: 3 },
    { text: "يقلد الحركات الجديدة", domain: "problem_solving", index: 4 },
    { text: "يتعرف على الأشياء المألوفة", domain: "problem_solving", index: 5 },
    // المهارات الشخصية والاجتماعية
    { text: "يلعب بجوار الأطفال الآخرين", domain: "personal_social", index: 0 },
    { text: "يقلد الكبار", domain: "personal_social", index: 1 },
    { text: "يظهر مشاعره", domain: "personal_social", index: 2 },
    { text: "يشارك في الأنشطة اليومية", domain: "personal_social", index: 3 },
    { text: "يستجيب للتوجيه", domain: "personal_social", index: 4 },
    { text: "يتفاعل مع أفراد الأسرة", domain: "personal_social", index: 5 },
  ],
  "36-48": [
    // التواصل واللغة
    { text: "يتحدث بجمل من 3 كلمات أو أكثر", domain: "communication", index: 0 },
    { text: "يجيب عن أسئلة بسيطة", domain: "communication", index: 1 },
    { text: "يذكر اسمه", domain: "communication", index: 2 },
    { text: "يفهم التعليمات من خطوتين", domain: "communication", index: 3 },
    { text: "يسمي الألوان الأساسية", domain: "communication", index: 4 },
    { text: "يصف ما يريده بالكلمات", domain: "communication", index: 5 },
    // الحركية الكبرى
    { text: "يقفز بكلتا القدمين", domain: "gross_motor", index: 0 },
    { text: "يصعد الدرج بالتبادل", domain: "gross_motor", index: 1 },
    { text: "يرمي الكرة للأمام", domain: "gross_motor", index: 2 },
    { text: "يقف على قدم واحدة لثانيتين", domain: "gross_motor", index: 3 },
    { text: "يجري دون سقوط متكرر", domain: "gross_motor", index: 4 },
    { text: "يقود دراجة ثلاثية", domain: "gross_motor", index: 5 },
    // الحركية الدقيقة
    { text: "يرسم دائرة", domain: "fine_motor", index: 0 },
    { text: "يستخدم المقص بإشراف", domain: "fine_motor", index: 1 },
    { text: "يبني برجاً من 8 مكعبات", domain: "fine_motor", index: 2 },
    { text: "يمسك القلم بطريقة مناسبة", domain: "fine_motor", index: 3 },
    { text: "يفتح الأغطية الكبيرة", domain: "fine_motor", index: 4 },
    { text: "يركب قطع تركيب بسيطة", domain: "fine_motor", index: 5 },
    // حل المشكلات والإدراك
    { text: "يصنف الأشياء حسب اللون", domain: "problem_solving", index: 0 },
    { text: "يعد حتى 3", domain: "problem_solving", index: 1 },
    { text: "يطابق الصور المتشابهة", domain: "problem_solving", index: 2 },
    { text: "يكمل لغزاً بسيطاً", domain: "problem_solving", index: 3 },
    { text: "يتعرف على الأنماط البسيطة", domain: "problem_solving", index: 4 },
    { text: "يحل مشكلات بسيطة أثناء اللعب", domain: "problem_solving", index: 5 },
    // المهارات الشخصية والاجتماعية
    { text: "يغسل يديه بمساعدة بسيطة", domain: "personal_social", index: 0 },
    { text: "يشارك الألعاب", domain: "personal_social", index: 1 },
    { text: "ينتظر دوره أحياناً", domain: "personal_social", index: 2 },
    { text: "يعبر عن مشاعره بالكلمات", domain: "personal_social", index: 3 },
    { text: "يشارك في اللعب التخيلي", domain: "personal_social", index: 4 },
    { text: "يطلب المساعدة عند الحاجة", domain: "personal_social", index: 5 },
  ],
  "48-60": [
    // التواصل واللغة
    { text: "يروي حدثاً قصيراً", domain: "communication", index: 0 },
    { text: "يجيب عن أسئلة لماذا", domain: "communication", index: 1 },
    { text: "يتبع 3 تعليمات متتالية", domain: "communication", index: 2 },
    { text: "يستخدم مفردات متنوعة", domain: "communication", index: 3 },
    { text: "يفهم القصص القصيرة", domain: "communication", index: 4 },
    { text: "يعبر عن أفكاره بوضوح", domain: "communication", index: 5 },
    // الحركية الكبرى
    { text: "يقف على قدم واحدة 5 ثوانٍ", domain: "gross_motor", index: 0 },
    { text: "يلتقط الكرة", domain: "gross_motor", index: 1 },
    { text: "يتوازن أثناء المشي", domain: "gross_motor", index: 2 },
    { text: "يقفز للأمام", domain: "gross_motor", index: 3 },
    { text: "يجري ويتحكم بحركته", domain: "gross_motor", index: 4 },
    { text: "يشارك في الألعاب الحركية", domain: "gross_motor", index: 5 },
    // الحركية الدقيقة
    { text: "يرسم مربعاً", domain: "fine_motor", index: 0 },
    { text: "يقص على خط مستقيم", domain: "fine_motor", index: 1 },
    { text: "ينسخ أشكالاً بسيطة", domain: "fine_motor", index: 2 },
    { text: "يكتب بعض الحروف", domain: "fine_motor", index: 3 },
    { text: "يستخدم أدوات الرسم بدقة", domain: "fine_motor", index: 4 },
    { text: "يركب أحجية متعددة القطع", domain: "fine_motor", index: 5 },
    // حل المشكلات والإدراك
    { text: "يعد حتى 10", domain: "problem_solving", index: 0 },
    { text: "يميز الأنماط", domain: "problem_solving", index: 1 },
    { text: "يصنف الأشياء حسب أكثر من خاصية", domain: "problem_solving", index: 2 },
    { text: "يحل ألغازاً بسيطة", domain: "problem_solving", index: 3 },
    { text: "يحدد أوجه التشابه والاختلاف", domain: "problem_solving", index: 4 },
    { text: "يتوقع النتائج البسيطة", domain: "problem_solving", index: 5 },
    // المهارات الشخصية والاجتماعية
    { text: "يلعب تعاونياً مع الآخرين", domain: "personal_social", index: 0 },
    { text: "يلتزم بالقواعد البسيطة", domain: "personal_social", index: 1 },
    { text: "يعتني بأغراضه", domain: "personal_social", index: 2 },
    { text: "يعبر عن مشاعره بوضوح", domain: "personal_social", index: 3 },
    { text: "يساعد الآخرين", domain: "personal_social", index: 4 },
    { text: "يظهر استقلالية في الروتين اليومي", domain: "personal_social", index: 5 },
  ],
  "60-72": [
    // التواصل واللغة
    { text: "يروي قصة متسلسلة", domain: "communication", index: 0 },
    { text: "يصف أحداث يومه", domain: "communication", index: 1 },
    { text: "يشارك في النقاش الجماعي", domain: "communication", index: 2 },
    { text: "يفهم الأسئلة المركبة", domain: "communication", index: 3 },
    { text: "يستخدم مفردات مناسبة لعمره", domain: "communication", index: 4 },
    { text: "يتواصل بثقة مع الكبار والأطفال", domain: "communication", index: 5 },
    // الحركية الكبرى
    { text: "يقفز على قدم واحدة", domain: "gross_motor", index: 0 },
    { text: "يحافظ على توازنه أثناء الحركة", domain: "gross_motor", index: 1 },
    { text: "يرمي ويلتقط الكرة بدقة", domain: "gross_motor", index: 2 },
    { text: "يغير اتجاهه أثناء الجري بسهولة", domain: "gross_motor", index: 3 },
    { text: "يشارك في الألعاب المنظمة", domain: "gross_motor", index: 4 },
    { text: "يتحرك بثقة في البيئة المحيطة", domain: "gross_motor", index: 5 },
    // الحركية الدقيقة
    { text: "يكتب اسمه الأول", domain: "fine_motor", index: 0 },
    { text: "يرسم شخصاً بأجزاء متعددة", domain: "fine_motor", index: 1 },
    { text: "ينسخ الحروف والأرقام", domain: "fine_motor", index: 2 },
    { text: "يستخدم المقص بدقة", domain: "fine_motor", index: 3 },
    { text: "يلون داخل الحدود", domain: "fine_motor", index: 4 },
    { text: "يتحكم في أدوات الكتابة جيداً", domain: "fine_motor", index: 5 },
    // حل المشكلات والإدراك
    { text: "يعد حتى 20", domain: "problem_solving", index: 0 },
    { text: "يتعرف على الأشكال الأساسية", domain: "problem_solving", index: 1 },
    { text: "يقارن الأحجام", domain: "problem_solving", index: 2 },
    { text: "يكمل الأنماط المعقدة", domain: "problem_solving", index: 3 },
    { text: "يفهم التسلسل الزمني البسيط", domain: "problem_solving", index: 4 },
    { text: "يحل المشكلات اليومية المناسبة لعمره", domain: "problem_solving", index: 5 },
    // المهارات الشخصية والاجتماعية
    { text: "يتبع التعليمات الصفية", domain: "personal_social", index: 0 },
    { text: "يتعاون مع المجموعة", domain: "personal_social", index: 1 },
    { text: "يتحمل مسؤوليات بسيطة", domain: "personal_social", index: 2 },
    { text: "يحترم دور الآخرين", domain: "personal_social", index: 3 },
    { text: "ينظم احتياجاته الشخصية", domain: "personal_social", index: 4 },
    { text: "يتعامل مع الإحباط بطريقة مناسبة", domain: "personal_social", index: 5 },
  ],
};

export function getInterpretation(percentage: number): "on_track" | "needs_support" | "needs_referral" {
  if (percentage >= 80) return "on_track";
  if (percentage >= 60) return "needs_support";
  return "needs_referral";
}

export const INTERPRETATION_LABELS: Record<string, string> = {
  on_track: "نمو ضمن المتوقع للعمر",
  needs_support: "يحتاج متابعة ودعم",
  needs_referral: "يوصى بإعادة التقييم والإحالة لمختص",
};

export const INTERPRETATION_COLORS: Record<string, string> = {
  on_track: "green",
  needs_support: "yellow",
  needs_referral: "red",
};
