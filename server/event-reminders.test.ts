import { describe, it, expect, vi } from "vitest";

// Test the reminder message generation logic
describe("Event Reminders - Message Generation", () => {
  function generateReminderMessage(eventTitle: string, daysBefore: number, eventTime?: string | null): string {
    if (daysBefore === 0) {
      const timeStr = eventTime ? ` الساعة ${eventTime}` : "";
      return `${eventTitle} اليوم${timeStr}`;
    } else if (daysBefore === 1) {
      return `${eventTitle} غداً`;
    } else {
      return `${eventTitle} بعد ${daysBefore} أيام`;
    }
  }

  it("generates correct message for event today without time", () => {
    const msg = generateReminderMessage("يوم المرح المائي", 0);
    expect(msg).toBe("يوم المرح المائي اليوم");
  });

  it("generates correct message for event today with time", () => {
    const msg = generateReminderMessage("ورشة أولياء الأمور", 0, "17:00");
    expect(msg).toBe("ورشة أولياء الأمور اليوم الساعة 17:00");
  });

  it("generates correct message for event tomorrow", () => {
    const msg = generateReminderMessage("يوم الرياضة", 1);
    expect(msg).toBe("يوم الرياضة غداً");
  });

  it("generates correct message for event in 3 days", () => {
    const msg = generateReminderMessage("يوم المرح المائي", 3);
    expect(msg).toBe("يوم المرح المائي بعد 3 أيام");
  });

  it("generates correct message for event in 7 days", () => {
    const msg = generateReminderMessage("حفل التخرج", 7);
    expect(msg).toBe("حفل التخرج بعد 7 أيام");
  });
});

describe("Event Reminders - Schedule Calculation", () => {
  function calculateScheduledDate(eventDate: string, daysBefore: number): Date {
    const date = new Date(eventDate + "T06:00:00Z");
    date.setDate(date.getDate() - daysBefore);
    return date;
  }

  it("calculates correct date for 7 days before", () => {
    const scheduled = calculateScheduledDate("2026-07-15", 7);
    expect(scheduled.toISOString()).toBe("2026-07-08T06:00:00.000Z");
  });

  it("calculates correct date for 3 days before", () => {
    const scheduled = calculateScheduledDate("2026-07-15", 3);
    expect(scheduled.toISOString()).toBe("2026-07-12T06:00:00.000Z");
  });

  it("calculates correct date for 1 day before", () => {
    const scheduled = calculateScheduledDate("2026-07-15", 1);
    expect(scheduled.toISOString()).toBe("2026-07-14T06:00:00.000Z");
  });

  it("calculates correct date for event day", () => {
    const scheduled = calculateScheduledDate("2026-07-15", 0);
    expect(scheduled.toISOString()).toBe("2026-07-15T06:00:00.000Z");
  });

  it("handles month boundary correctly", () => {
    const scheduled = calculateScheduledDate("2026-08-03", 7);
    expect(scheduled.toISOString()).toBe("2026-07-27T06:00:00.000Z");
  });
});

describe("Event Reminders - Auto Schedule Logic", () => {
  it("only schedules future reminders", () => {
    const now = new Date();
    const reminderDays = [7, 3, 1, 0];
    
    // Event tomorrow - only 1-day and 0-day reminders should be scheduled
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = tomorrow.toISOString().split("T")[0];
    
    const scheduledReminders: number[] = [];
    for (const daysBefore of reminderDays) {
      const scheduledAt = new Date(eventDate + "T06:00:00Z");
      scheduledAt.setDate(scheduledAt.getDate() - daysBefore);
      if (scheduledAt > now) {
        scheduledReminders.push(daysBefore);
      }
    }
    
    // Should include at least 0 (event day) and possibly 1 (tomorrow)
    expect(scheduledReminders).toContain(0);
    // 7 and 3 days before should NOT be included since event is tomorrow
    expect(scheduledReminders).not.toContain(7);
    expect(scheduledReminders).not.toContain(3);
  });

  it("schedules all reminders for event far in the future", () => {
    const now = new Date();
    const reminderDays = [7, 3, 1, 0];
    
    // Event 30 days from now - all reminders should be scheduled
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 30);
    const eventDate = futureDate.toISOString().split("T")[0];
    
    const scheduledReminders: number[] = [];
    for (const daysBefore of reminderDays) {
      const scheduledAt = new Date(eventDate + "T06:00:00Z");
      scheduledAt.setDate(scheduledAt.getDate() - daysBefore);
      if (scheduledAt > now) {
        scheduledReminders.push(daysBefore);
      }
    }
    
    expect(scheduledReminders).toEqual([7, 3, 1, 0]);
  });
});
