import { describe, it, expect, vi } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getCalendarEvents: vi.fn().mockResolvedValue([
    { id: 1, titleAr: "إجازة اليوم الوطني", titleEn: "National Day", eventDate: "2026-09-23", category: "holiday", audience: "all", status: "published", createdBy: 1 },
    { id: 2, titleAr: "اجتماع أولياء الأمور", titleEn: null, eventDate: "2026-09-15", category: "meeting", audience: "parents", status: "draft", createdBy: 1 },
  ]),
  getCalendarEvent: vi.fn().mockImplementation((id: number) => {
    if (id === 1) return Promise.resolve({ id: 1, titleAr: "إجازة اليوم الوطني", titleEn: "National Day", eventDate: "2026-09-23", category: "holiday", audience: "all", status: "published", createdBy: 1 });
    if (id === 2) return Promise.resolve({ id: 2, titleAr: "اجتماع أولياء الأمور", titleEn: null, eventDate: "2026-09-15", category: "meeting", audience: "parents", status: "draft", createdBy: 1 });
    return Promise.resolve(null);
  }),
  createCalendarEvent: vi.fn().mockResolvedValue({ id: 3, titleAr: "حدث جديد", eventDate: "2026-10-01", category: "event", audience: "all", status: "draft", createdBy: 1 }),
  updateCalendarEvent: vi.fn().mockResolvedValue({ id: 1, titleAr: "إجازة اليوم الوطني المعدلة" }),
  deleteCalendarEvent: vi.fn().mockResolvedValue({ success: true }),
}));

// Import after mocking
import { calendarRouter } from "./calendarRouter";
import { router } from "./_core/trpc";

describe("calendarRouter", () => {
  it("should export a valid router", () => {
    expect(calendarRouter).toBeDefined();
    expect(calendarRouter._def).toBeDefined();
  });

  it("should have all required procedures", () => {
    const procedures = Object.keys(calendarRouter._def.procedures);
    expect(procedures).toContain("list");
    expect(procedures).toContain("get");
    expect(procedures).toContain("create");
    expect(procedures).toContain("update");
    expect(procedures).toContain("delete");
    expect(procedures).toContain("publish");
  });

  it("should have 6 procedures total", () => {
    const procedures = Object.keys(calendarRouter._def.procedures);
    expect(procedures.length).toBe(11);
  });
});
