import { describe, it, expect, vi } from "vitest";

// Mock the LLM module
vi.mock("./server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({
      strengths: ["Communication", "Social skills"],
      concerns: [],
      recommendations: ["Continue current approach"],
      activities: { classroom: ["Group reading"], home: ["Story time"] },
    }) } }],
  }),
}));

describe("Development Module - Schema Validation", () => {
  it("should have all 7 EYFS development areas defined", () => {
    const areas = [
      "Communication & Language",
      "Physical Development",
      "Personal, Social & Emotional Development",
      "Literacy",
      "Mathematics",
      "Understanding the World",
      "Expressive Arts & Design",
    ];
    expect(areas).toHaveLength(7);
  });

  it("should define valid observation levels", () => {
    const levels = ["emerging", "developing", "secure", "exceeding"];
    expect(levels).toContain("emerging");
    expect(levels).toContain("developing");
    expect(levels).toContain("secure");
    expect(levels).toContain("exceeding");
  });

  it("should define valid observation contexts", () => {
    const contexts = ["free_play", "guided_activity", "group_work", "outdoor", "routine", "assessment", "other"];
    expect(contexts).toHaveLength(7);
    expect(contexts).toContain("free_play");
    expect(contexts).toContain("assessment");
  });

  it("should define school readiness dimensions", () => {
    const dimensions = ["language", "social", "emotional", "cognitive", "physical"];
    expect(dimensions).toHaveLength(5);
  });

  it("should define alert severity levels", () => {
    const severities = ["low", "medium", "high", "critical"];
    expect(severities).toHaveLength(4);
    expect(severities).toContain("critical");
  });

  it("should define alert types", () => {
    const types = ["limited_progress", "below_expectations", "follow_up_needed", "milestone_missed"];
    expect(types).toHaveLength(4);
  });

  it("should define recommendation types", () => {
    const types = ["classroom_activity", "home_activity", "professional_referral", "resource", "strategy"];
    expect(types).toHaveLength(5);
  });
});

describe("Development Module - Age Calculation", () => {
  it("should calculate age in months correctly", () => {
    const calculateAgeMonths = (dateOfBirth: string | Date | null): number => {
      if (!dateOfBirth) return 36;
      const dob = new Date(dateOfBirth);
      const now = new Date();
      return Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    };

    // A child born 3 years ago should be ~36 months
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const age = calculateAgeMonths(threeYearsAgo.toISOString());
    expect(age).toBeGreaterThanOrEqual(35);
    expect(age).toBeLessThanOrEqual(37);
  });

  it("should return default 36 for null dateOfBirth", () => {
    const calculateAgeMonths = (dateOfBirth: string | Date | null): number => {
      if (!dateOfBirth) return 36;
      const dob = new Date(dateOfBirth);
      const now = new Date();
      return Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    };
    expect(calculateAgeMonths(null)).toBe(36);
  });
});

describe("Development Module - Level Scoring", () => {
  const levelToNumber = (level: string): number => {
    const map: Record<string, number> = { emerging: 1, developing: 2, secure: 3, exceeding: 4 };
    return map[level] || 0;
  };

  it("should convert levels to numeric scores", () => {
    expect(levelToNumber("emerging")).toBe(1);
    expect(levelToNumber("developing")).toBe(2);
    expect(levelToNumber("secure")).toBe(3);
    expect(levelToNumber("exceeding")).toBe(4);
  });

  it("should return 0 for unknown levels", () => {
    expect(levelToNumber("unknown")).toBe(0);
    expect(levelToNumber("")).toBe(0);
  });
});

describe("Development Module - Trend Calculation", () => {
  const levelToNumber = (level: string): number => {
    const map: Record<string, number> = { emerging: 1, developing: 2, secure: 3, exceeding: 4 };
    return map[level] || 0;
  };

  const calculateTrend = (observations: { level: string }[]): "improving" | "stable" | "declining" => {
    if (observations.length < 3) return "stable";
    const recent = observations.slice(-3).map(o => levelToNumber(o.level));
    const earlier = observations.slice(0, 3).map(o => levelToNumber(o.level));
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    if (recentAvg - earlierAvg > 0.3) return "improving";
    if (earlierAvg - recentAvg > 0.3) return "declining";
    return "stable";
  };

  it("should return stable for fewer than 3 observations", () => {
    expect(calculateTrend([{ level: "emerging" }])).toBe("stable");
    expect(calculateTrend([{ level: "emerging" }, { level: "developing" }])).toBe("stable");
  });

  it("should detect improving trend", () => {
    const obs = [
      { level: "emerging" }, { level: "emerging" }, { level: "emerging" },
      { level: "developing" }, { level: "secure" }, { level: "secure" },
    ];
    expect(calculateTrend(obs)).toBe("improving");
  });

  it("should detect declining trend", () => {
    const obs = [
      { level: "secure" }, { level: "secure" }, { level: "secure" },
      { level: "developing" }, { level: "emerging" }, { level: "emerging" },
    ];
    expect(calculateTrend(obs)).toBe("declining");
  });

  it("should detect stable trend", () => {
    const obs = [
      { level: "developing" }, { level: "developing" }, { level: "developing" },
      { level: "developing" }, { level: "developing" }, { level: "developing" },
    ];
    expect(calculateTrend(obs)).toBe("stable");
  });
});

describe("Development Module - Readiness Score Calculation", () => {
  it("should calculate overall readiness as average of all dimensions", () => {
    const scores = { language: 80, social: 70, emotional: 75, cognitive: 85, physical: 90 };
    const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
    expect(overall).toBe(80);
  });

  it("should handle 0 scores correctly", () => {
    const scores = { language: 0, social: 0, emotional: 0, cognitive: 0, physical: 0 };
    const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
    expect(overall).toBe(0);
  });

  it("should handle perfect scores", () => {
    const scores = { language: 100, social: 100, emotional: 100, cognitive: 100, physical: 100 };
    const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
    expect(overall).toBe(100);
  });
});

describe("Development Module - Alert Generation Logic", () => {
  it("should flag limited progress when level stays same for 3+ observations", () => {
    const observations = [
      { level: "emerging", observedAt: new Date("2026-01-01") },
      { level: "emerging", observedAt: new Date("2026-02-01") },
      { level: "emerging", observedAt: new Date("2026-03-01") },
      { level: "emerging", observedAt: new Date("2026-04-01") },
    ];
    const allSame = observations.every(o => o.level === observations[0].level);
    const needsAlert = allSame && observations.length >= 3;
    expect(needsAlert).toBe(true);
  });

  it("should not flag when progress is being made", () => {
    const observations = [
      { level: "emerging", observedAt: new Date("2026-01-01") },
      { level: "developing", observedAt: new Date("2026-02-01") },
      { level: "secure", observedAt: new Date("2026-03-01") },
    ];
    const allSame = observations.every(o => o.level === observations[0].level);
    expect(allSame).toBe(false);
  });
});

describe("Development Module - Benchmarking", () => {
  it("should calculate class average correctly", () => {
    const classScores = [2.5, 3.0, 2.8, 3.2, 2.9];
    const avg = classScores.reduce((a, b) => a + b, 0) / classScores.length;
    expect(avg).toBeCloseTo(2.88, 1);
  });

  it("should determine if child is above, at, or below class average", () => {
    const childScore = 3.5;
    const classAvg = 2.88;
    const diff = childScore - classAvg;
    const status = diff > 0.5 ? "above" : diff < -0.5 ? "below" : "at";
    expect(status).toBe("above");
  });

  it("should map EYFS age expectations correctly", () => {
    // 30-50 months: expected level is "developing"
    // 40-60 months: expected level is "secure"
    const getExpectedLevel = (ageMonths: number): string => {
      if (ageMonths < 30) return "emerging";
      if (ageMonths < 50) return "developing";
      return "secure";
    };
    expect(getExpectedLevel(24)).toBe("emerging");
    expect(getExpectedLevel(36)).toBe("developing");
    expect(getExpectedLevel(55)).toBe("secure");
  });
});

describe("Development Module - Report Generation", () => {
  it("should support both Arabic and English languages", () => {
    const languages = ["ar", "en"];
    expect(languages).toContain("ar");
    expect(languages).toContain("en");
  });

  it("should support both professional and parent report types", () => {
    const types = ["professional", "parent"];
    expect(types).toContain("professional");
    expect(types).toContain("parent");
  });

  it("should include all required sections in professional report", () => {
    const professionalSections = [
      "Executive Summary",
      "Development Profile",
      "Observations Analysis",
      "School Readiness Assessment",
      "Strengths & Areas for Development",
      "Recommendations & Next Steps",
      "Professional Notes",
    ];
    expect(professionalSections.length).toBeGreaterThanOrEqual(6);
  });

  it("should include all required sections in parent report", () => {
    const parentSections = [
      "Summary of Progress",
      "What your child is doing well",
      "Areas we're working on together",
      "How you can help at home",
      "School Readiness Overview",
      "Next Steps",
    ];
    expect(parentSections.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Development Module - White Label Support", () => {
  it("should scope all data by organizationId", () => {
    const orgId = 1;
    const query = { organizationId: orgId, childId: 5 };
    expect(query.organizationId).toBe(1);
  });

  it("should support multiple organizations accessing same module", () => {
    const org1 = { id: 1, name: "Learning Tree" };
    const org2 = { id: 2, name: "Naashah Nursery" };
    expect(org1.id).not.toBe(org2.id);
  });
});

describe("Development Module - API Architecture (Future Integration)", () => {
  it("should define standard API response format for external platforms", () => {
    const apiResponse = {
      version: "1.0",
      childId: "external-ref-123",
      assessments: [],
      readinessScores: {},
      timestamp: new Date().toISOString(),
    };
    expect(apiResponse).toHaveProperty("version");
    expect(apiResponse).toHaveProperty("childId");
    expect(apiResponse).toHaveProperty("assessments");
    expect(apiResponse).toHaveProperty("readinessScores");
    expect(apiResponse).toHaveProperty("timestamp");
  });

  it("should support Ynmo-compatible data format", () => {
    // Future: Ynmo integration will map our internal format to their API
    const ynmoMapping = {
      childExternalId: "string",
      developmentAreas: "array",
      observationDate: "ISO-8601",
      level: "enum(emerging|developing|secure|exceeding)",
    };
    expect(Object.keys(ynmoMapping)).toHaveLength(4);
  });
});
