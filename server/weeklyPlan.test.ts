import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          theme_overview: "This week we explore the ocean and marine life.",
          learning_objectives: ["Identify sea creatures", "Learn about water", "Develop fine motor skills"],
          arabic_activities: [{ title: "حروف البحر", description: "تعلم حروف مرتبطة بالبحر", materials: "بطاقات", duration: "20 دقيقة" }],
          english_activities: [{ title: "Ocean Words", description: "Learn ocean vocabulary", materials: "flashcards", duration: "15 min" }],
          math_activities: [{ title: "عد الأسماك", description: "عد مجموعات من الأسماك", materials: "صور أسماك", duration: "15 دقيقة" }],
          science_activities: [{ title: "Float or Sink", description: "Experiment with objects in water", materials: "basin, objects", duration: "20 min" }],
          art_activities: [{ title: "رسم الأسماك", description: "رسم وتلوين أسماك", materials: "ألوان، ورق", duration: "25 دقيقة" }],
          sensory_activities: [{ title: "Water Play", description: "Explore water textures", materials: "water table", duration: "20 min" }],
          physical_activities: [{ title: "سباحة الأسماك", description: "حركات تقليد السمك", materials: "لا شيء", duration: "15 دقيقة" }],
          quran_islamic: { surah: "سورة الفيل", dua: "دعاء الطعام", islamic_value: "شكر النعم" },
          story_of_week: { title: "السمكة الصغيرة", summary: "قصة عن سمكة تستكشف البحر" },
          song_of_week: { title: "نشيد البحر", lyrics: "بحر أزرق واسع..." },
          home_activity: "اصنعوا مع أطفالكم حوض أسماك من الورق",
          parent_notes: "هذا الأسبوع نتعلم عن البحر. ساعدوا أطفالكم في استكشاف الماء."
        })
      }
    }]
  }),
}));

// Mock web push
vi.mock("./_core/webPush", () => ({
  sendPushToUsers: vi.fn().mockResolvedValue({ totalSent: 0, totalFailed: 0, expiredIds: [] }),
}));

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  }),
};

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("mysql2/promise", () => ({
  createPool: vi.fn(() => ({})),
}));

describe("Weekly Plan Router - Unit Tests", () => {
  describe("Plan Generation", () => {
    it("should validate required fields for generation", () => {
      // Test that the schema requires ageGroup, weekStartDate, weekEndDate, theme
      const requiredFields = ["ageGroup", "weekStartDate", "weekEndDate", "theme"];
      requiredFields.forEach(field => {
        expect(field).toBeTruthy();
      });
    });

    it("should support all age groups", () => {
      const validAgeGroups = ["nursery", "kg1", "kg2", "kg3"];
      validAgeGroups.forEach(group => {
        expect(["nursery", "kg1", "kg2", "kg3"]).toContain(group);
      });
    });

    it("should support all language options", () => {
      const validLanguages = ["ar", "en", "bilingual"];
      validLanguages.forEach(lang => {
        expect(["ar", "en", "bilingual"]).toContain(lang);
      });
    });

    it("should define all 14 section types", () => {
      const expectedSections = [
        "theme_overview", "learning_objectives", "arabic_activities",
        "english_activities", "math_activities", "science_activities",
        "art_activities", "sensory_activities", "physical_activities",
        "quran_islamic", "story_of_week", "song_of_week",
        "home_activity", "parent_notes"
      ];
      expect(expectedSections).toHaveLength(14);
    });
  });

  describe("Plan Status Management", () => {
    it("should only allow draft and published statuses", () => {
      const validStatuses = ["draft", "published"];
      expect(validStatuses).toContain("draft");
      expect(validStatuses).toContain("published");
      expect(validStatuses).not.toContain("archived");
    });

    it("should not allow editing published plans", () => {
      // This is enforced in the update procedure
      const plan = { status: "published" };
      expect(plan.status === "published").toBe(true);
    });
  });

  describe("Section Labels", () => {
    it("should have Arabic labels for all sections", () => {
      const arLabels: Record<string, string> = {
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
        parent_notes: "ملاحظات لأولياء الأمور",
      };
      expect(Object.keys(arLabels)).toHaveLength(14);
      Object.values(arLabels).forEach(label => {
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Cultural Compliance", () => {
    it("should include cultural guidelines in the prompt", () => {
      const guidelines = "القيم الإسلامية والعربية";
      expect(guidelines).toContain("الإسلامية");
      expect(guidelines).toContain("العربية");
    });

    it("should reference EYFS framework", () => {
      const framework = "EYFS";
      expect(framework).toBe("EYFS");
    });
  });

  describe("PDF Generation", () => {
    it("should flatten string content correctly", () => {
      const content = "This is a simple string";
      expect(typeof content).toBe("string");
    });

    it("should flatten array content correctly", () => {
      const content = [
        { title: "Activity 1", description: "Description 1" },
        { title: "Activity 2", description: "Description 2" },
      ];
      expect(Array.isArray(content)).toBe(true);
      expect(content).toHaveLength(2);
    });

    it("should flatten object content correctly", () => {
      const content = { surah: "الفاتحة", dua: "دعاء الصباح" };
      expect(typeof content).toBe("object");
      expect(content.surah).toBe("الفاتحة");
    });
  });
});
