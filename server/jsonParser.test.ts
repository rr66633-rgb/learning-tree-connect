import { describe, it, expect } from "vitest";
import { safeJsonParse, validateWeeklyPlan } from "./jsonParser";

describe("safeJsonParse", () => {
  it("parses valid JSON correctly", () => {
    const result = safeJsonParse('{"title": "خطة أسبوعية", "days": []}');
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("خطة أسبوعية");
    expect(result.repaired).toBe(false);
  });

  it("handles empty input", () => {
    const result = safeJsonParse("");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("handles null input", () => {
    const result = safeJsonParse(null as any);
    expect(result.success).toBe(false);
  });

  it("repairs trailing commas", () => {
    const result = safeJsonParse('{"title": "test", "items": [1, 2, 3,]}');
    expect(result.success).toBe(true);
    expect(result.data?.items).toEqual([1, 2, 3]);
    expect(result.repaired).toBe(true);
  });

  it("repairs unclosed brackets", () => {
    const result = safeJsonParse('{"title": "خطة", "days": [{"day": "الأحد"}');
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("خطة");
    expect(result.repaired).toBe(true);
  });

  it("repairs unterminated strings", () => {
    const result = safeJsonParse('{"title": "خطة أسبوعية للفصل الأول');
    expect(result.success).toBe(true);
    expect(result.repaired).toBe(true);
  });

  it("handles markdown code fences around JSON", () => {
    const result = safeJsonParse('```json\n{"title": "test"}\n```');
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("test");
  });

  it("handles Arabic text with special characters", () => {
    const json = '{"title": "خطة: الحيوانات \\"الأليفة\\" والنباتات", "description": "تعلّم عن الطبيعة"}';
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
    expect(result.data?.title).toContain("الحيوانات");
  });

  it("handles long Arabic descriptions with newlines", () => {
    const json = `{"title": "خطة أسبوعية", "description": "هذا وصف طويل جداً\\nيحتوي على عدة أسطر\\nوعلامات ترقيم: ، ؛ ؟ !"}`;
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
    expect(result.data?.description).toContain("هذا وصف طويل");
  });

  it("handles unescaped newlines inside strings", () => {
    const json = '{"title": "خطة", "text": "سطر أول\nسطر ثاني\nسطر ثالث"}';
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
    expect(result.repaired).toBe(true);
  });

  it("handles truncated JSON response (cut off mid-object)", () => {
    const truncated = '{"title": "خطة أسبوعية", "days": [{"day": "الأحد", "learningObjective": "تعلم الألوان", "circleTime": "نشاط الألوان", "mainActivity": "رسم بالأل';
    const result = safeJsonParse(truncated);
    expect(result.success).toBe(true);
    expect(result.repaired).toBe(true);
  });

  it("handles multiple learning objectives as array", () => {
    const json = '{"objectives": ["هدف 1", "هدف 2", "هدف 3"], "materials": ["ألوان", "أوراق", "مقص"]}';
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
    expect(result.data?.objectives).toHaveLength(3);
  });

  it("handles quotes and punctuation in Arabic text", () => {
    const json = '{"title": "نشاط \\"اكتشف الطبيعة\\"", "question": "ماذا تلاحظ؟ هل ترى الفرق بين اللونين؟"}';
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
  });

  it("extracts JSON from surrounding text", () => {
    const raw = 'Here is the weekly plan:\n{"title": "خطة", "days": []}\nEnd of plan.';
    const result = safeJsonParse(raw);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("خطة");
  });

  it("handles deeply nested structure", () => {
    const json = JSON.stringify({
      title: "خطة أسبوعية: الحيوانات",
      overview: "خطة شاملة لتعليم الأطفال عن الحيوانات",
      days: [
        {
          day: "الأحد",
          learningObjective: "التعرف على أنواع الحيوانات الأليفة",
          circleTime: { title: "دائرة الصباح", description: "نتحدث عن حيواناتنا المفضلة" },
          mainActivity: { title: "رسم حيوان", materials: ["ألوان", "أوراق"], duration: "30 دقيقة" },
          story: "قصة القطة الصغيرة",
          islamicValue: "الرفق بالحيوان",
          assessment: "ملاحظة مشاركة الأطفال"
        }
      ]
    });
    const result = safeJsonParse(json);
    expect(result.success).toBe(true);
    expect(result.data?.days[0].islamicValue).toBe("الرفق بالحيوان");
  });
});

describe("validateWeeklyPlan", () => {
  it("validates a complete plan", () => {
    const plan = {
      title: "خطة أسبوعية",
      days: [
        { day: "الأحد", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط رئيسي" },
        { day: "الاثنين", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط رئيسي" },
        { day: "الثلاثاء", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط رئيسي" },
        { day: "الأربعاء", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط رئيسي" },
        { day: "الخميس", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط رئيسي" },
      ]
    };
    const result = validateWeeklyPlan(plan);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("detects missing days array", () => {
    const plan = { title: "خطة" };
    const result = validateWeeklyPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("أيام الخطة مفقودة");
  });

  it("detects insufficient days", () => {
    const plan = {
      title: "خطة",
      days: [
        { day: "الأحد", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط" },
        { day: "الاثنين", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط" },
      ]
    };
    const result = validateWeeklyPlan(plan);
    expect(result.valid).toBe(false);
  });

  it("detects missing required fields in days", () => {
    const plan = {
      title: "خطة",
      days: [
        { day: "الأحد", circleTime: "نشاط", mainActivity: "نشاط" },
        { day: "الاثنين", learningObjective: "هدف", mainActivity: "نشاط" },
        { day: "الثلاثاء", learningObjective: "هدف", circleTime: "نشاط" },
        { day: "الأربعاء", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط" },
        { day: "الخميس", learningObjective: "هدف", circleTime: "نشاط", mainActivity: "نشاط" },
      ]
    };
    const result = validateWeeklyPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("handles null input", () => {
    const result = validateWeeklyPlan(null);
    expect(result.valid).toBe(false);
  });
});
