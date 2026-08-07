import { Streamdown } from "streamdown";

export const AI_TYPE_STYLES: Record<string, string> = {
  observation: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  weekly_plan: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  activity: "border-[#FFB020]/30 bg-[#FFB020]/12 text-[#9A6300]",
  progress_report: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  parent_message: "border-[#FF5CA8]/25 bg-[#FF5CA8]/10 text-[#C92C73]",
  newsletter: "border-[#FFB020]/30 bg-[#FFB020]/12 text-[#9A6300]",
  story: "border-[#00C9B7]/25 bg-[#00C9B7]/10 text-[#008F83]",
  marketing: "border-[#FF5CA8]/25 bg-[#FF5CA8]/10 text-[#C92C73]",
};

export function humanizeAiFieldKey(key: string, isAr: boolean) {
  const ar: Record<string, string> = {
    prompt: "الطلب",
    language: "اللغة",
    childId: "الطفل",
    classId: "الفصل",
    ageGroup: "الفئة العمرية",
    theme: "الموضوع",
    childName: "اسم الطفل",
    termPeriod: "الفترة الدراسية",
    academicYear: "العام الدراسي",
    reportType: "نوع التقرير",
    sourceObservations: "عدد الملاحظات المعتمدة",
    shortNote: "الملاحظة المختصرة",
    learningGoals: "أهداف إضافية",
    tone: "نبرة الرسالة",
    month: "الشهر",
    highlights: "أبرز الأحداث",
    period: "الفترة",
    assessmentType: "نوع التقييم",
    certificateType: "نوع الشهادة",
    title: "العنوان",
    titleAr: "العنوان بالعربية",
    titleEn: "العنوان بالإنجليزية",
    analysis: "التحليل التربوي",
    observation: "الملاحظة",
    nextSteps: "الخطوات التالية",
    next_steps: "الخطوات التالية",
    eyfsArea: "مجال EYFS",
    eyfsAreas: "مجالات EYFS",
    developmentLevel: "مستوى التطور",
    summary: "الملخص",
    overview: "نظرة عامة",
    strengths: "نقاط القوة",
    areasForDevelopment: "مجالات التطوير",
    teacherRecommendations: "توصيات للمعلمة",
    familyRecommendations: "توصيات للأسرة",
    recommendations: "التوصيات",
    learningObjectives: "أهداف التعلم",
    learning_objectives: "أهداف التعلم",
    weeklyMaterials: "مواد الأسبوع",
    parentInvolvement: "مشاركة الأسرة",
    weeklyAssessment: "التقييم الأسبوعي",
    theme_overview: "نظرة عامة على الموضوع",
    arabic_activities: "أنشطة اللغة العربية",
    english_activities: "أنشطة اللغة الإنجليزية",
    math_activities: "أنشطة الرياضيات",
    science_activities: "أنشطة العلوم والاستكشاف",
    art_activities: "الأنشطة الفنية والإبداعية",
    sensory_activities: "الأنشطة الحسية",
    physical_activities: "الأنشطة البدنية والحركية",
    quran_islamic: "القرآن والقيم الإسلامية",
    story_of_week: "قصة الأسبوع",
    song_of_week: "نشيد الأسبوع",
    home_activity: "النشاط المنزلي",
    parent_notes: "إرشادات الأسرة",
    days: "أيام الخطة",
    day: "اليوم",
    description: "الوصف",
    materials: "المواد",
    duration: "المدة",
    steps: "الخطوات",
    instructions: "خطوات التنفيذ",
    preparation: "التحضير",
    extensionIdeas: "أفكار للتوسّع",
    simplificationIdeas: "أفكار للتبسيط",
    assessmentMethod: "طريقة التقييم",
    vocabularyWords: "المفردات المستهدفة",
    safetyNotes: "ملاحظات السلامة",
    word: "الكلمة",
    meaning: "المعنى",
    moral: "القيمة المستفادة",
    story: "نص القصة",
    followUpActivities: "أنشطة المتابعة",
    ageAppropriate: "العمر المناسب",
    content: "المحتوى",
    body: "النص",
    messageAr: "نص الرسالة بالعربية",
    messageEn: "نص الرسالة بالإنجليزية",
    closingAr: "الخاتمة بالعربية",
    closingEn: "الخاتمة بالإنجليزية",
    greeting: "التحية",
    introduction: "المقدمة",
    sections: "أقسام المحتوى",
    upcomingEvents: "الفعاليات القادمة",
    parentTips: "نصائح للأسرة",
    closing: "الخاتمة",
    callToAction: "الدعوة للتفاعل",
    notes: "ملاحظات",
    attendance: "الحضور",
    percentage: "النسبة",
    nextLearningSteps: "خطوات التعلم التالية",
    socialEmotional: "النمو الاجتماعي والعاطفي",
    physicalDevelopment: "النمو الجسدي والحركي",
    communicationLanguage: "التواصل واللغة",
    parentRecommendations: "توصيات للأسرة",
    teacherComment: "تعليق المعلمة",
    overallReadiness: "الجاهزية العامة",
    languageReadiness: "الجاهزية اللغوية",
    socialReadiness: "الجاهزية الاجتماعية",
    emotionalReadiness: "الجاهزية العاطفية",
    cognitiveReadiness: "الجاهزية المعرفية",
    physicalReadiness: "الجاهزية الجسدية",
    parentAnnouncement: "إعلان أولياء الأمور",
    pushNotification: "الإشعار الفوري",
    whatsappMessage: "رسالة واتساب",
    smsMessage: "الرسالة النصية",
    instagramCaption: "محتوى إنستغرام",
    tiktokCaption: "محتوى تيك توك",
    snapchatCaption: "محتوى سناب شات",
    websiteArticle: "مقال الموقع",
    eventReport: "تقرير الفعالية",
    parentSummary: "ملخص أولياء الأمور",
    achievementSummary: "ملخص الإنجازات",
    socialPost: "منشور التواصل الاجتماعي",
    thankYouMessage: "رسالة الشكر",
    caption: "النص المنشور",
    hashtags: "الوسوم",
    circleTime: "وقت الحلقة",
    mainActivity: "النشاط الرئيس",
    learningObjective: "هدف التعلم",
    teacherInstructions: "إرشادات المعلمة",
    differentiation: "مراعاة الفروق الفردية",
    storyRecommendation: "القصة المقترحة",
    discussionQuestions: "أسئلة النقاش",
    author: "المؤلف",
    connection: "الارتباط بالموضوع",
    hadithOrAyah: "الحديث أو الآية",
    islamicValue: "القيمة الإسلامية",
    assessmentOpportunity: "فرصة التقييم",
    indicators: "المؤشرات",
    what: "ما الذي يُقيّم",
    how: "طريقة التقييم",
    totalDuration: "المدة الإجمالية",
    motivationalQuote: "العبارة التحفيزية",
    weekStartDate: "بداية الأسبوع",
    weekEndDate: "نهاية الأسبوع",
    subType: "نوع المحتوى",
  };
  if (isAr && ar[key]) return ar[key];
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, char => char.toUpperCase());
}

function firstReadableText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstReadableText(item);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = firstReadableText(nested);
      if (found) return found;
    }
  }
  return "";
}

function resultDirection(value: unknown): "rtl" | "ltr" {
  const firstStrongCharacter = firstReadableText(value).match(/[A-Za-z\u0600-\u06FF]/)?.[0];
  return firstStrongCharacter && /[\u0600-\u06FF]/.test(firstStrongCharacter) ? "rtl" : "ltr";
}

export function AIResultContent({ value, depth = 0, isAr, fieldKey }: { value: unknown; depth?: number; isAr: boolean; fieldKey?: string }) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return <AIResultContent value={JSON.parse(trimmed)} depth={depth} isAr={isAr} fieldKey={fieldKey} />;
      } catch {
        // Historical plain text that merely begins like JSON is still shown.
      }
    }
    const readable = trimmed.replace(/\s+(?=[0-9٠-٩]+[.)]\s+)/g, "\n");
    return (
      <div className="prose prose-slate max-w-none text-[15px] leading-8 prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-headings:font-bold prose-headings:text-slate-900" dir={resultDirection(readable)}>
        <Streamdown>{readable}</Streamdown>
      </div>
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    const readiness = fieldKey ? /readiness/i.test(fieldKey) : false;
    return readiness && typeof value === "number"
      ? <div className="flex items-end gap-1"><span className="text-3xl font-black tabular-nums text-slate-950">{value}</span><span className="pb-1 text-sm font-bold text-slate-400">%</span></div>
      : <p className="text-[15px] leading-7 text-slate-800">{typeof value === "boolean" ? (value ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")) : value}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <div className={`grid gap-2.5 ${value.some(item => typeof item === "object" && item !== null) ? "xl:grid-cols-2" : ""}`}>
        {value.map((item, index) => (
          <div key={index} dir={resultDirection(item)} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-[0_8px_25px_-24px_rgba(15,23,42,0.45)]">
            <span className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg bg-[#1A1F36] px-1.5 text-[10px] font-black text-white">{index + 1}</span>
            <div className="min-w-0 flex-1"><AIResultContent value={item} depth={depth + 1} isAr={isAr} /></div>
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key, nested]) =>
      nested !== null && nested !== undefined && nested !== "" && !(depth === 0 && (key === "title" || key === "subType"))
    );
    return (
      <div className={depth === 0 ? "grid items-start gap-4 md:grid-cols-2" : "space-y-3"}>
        {entries.map(([key, nested]) => {
          const longField = Array.isArray(nested)
            || (typeof nested === "object" && nested !== null)
            || (typeof nested === "string" && (nested.length > 110 || /\n/.test(nested)))
            || /analysis|observation|summary|overview|next|description|recommend|content|body|steps|notes|days/i.test(key);
          return (
            <section key={key} className={depth === 0
              ? `self-start overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_35px_-28px_rgba(15,23,42,0.5)] ${longField ? "md:col-span-2" : ""}`
              : "border-s border-slate-200 ps-3"}>
              <div className={depth === 0 ? "flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3" : "mb-1.5"}>
                {depth === 0 && <span className="h-2 w-2 rounded-full bg-[#00C9B7]" />}
                <h4 className="text-xs font-black tracking-wide text-slate-600">{humanizeAiFieldKey(key, isAr)}</h4>
              </div>
              <div className={depth === 0 ? "p-4 md:p-5" : ""}>
                <AIResultContent value={nested} depth={depth + 1} isAr={isAr} fieldKey={key} />
              </div>
            </section>
          );
        })}
      </div>
    );
  }
  return null;
}
