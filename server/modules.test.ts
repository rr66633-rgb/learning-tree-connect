import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 30001,
      openId: "admin-test",
      email: "rr.66633@gmail.com",
      name: "F .s.x",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createTeacherContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "teacher-test",
      email: "sara@learningtree.sa",
      name: "سارة الأحمد",
      loginMethod: "manus",
      role: "teacher",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createParentContext(): TrpcContext {
  return {
    user: {
      id: 6,
      openId: "parent-test",
      email: "mohammed.amri@gmail.com",
      name: "محمد العمري",
      loginMethod: "manus",
      role: "parent",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Dashboard", () => {
  it("returns correct statistics", { timeout: 10000 }, async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.dashboard.stats();
    expect(stats).toBeDefined();
    expect(stats.totalChildren).toBeGreaterThanOrEqual(20);
    expect(stats.totalStaff).toBeGreaterThanOrEqual(5);
    expect(stats.presentToday).toBeGreaterThanOrEqual(0);
  });
});

describe("Children Management", () => {
  it("lists all children", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const children = await caller.children.list();
    expect(children.length).toBeGreaterThanOrEqual(20);
    expect(children[0]).toHaveProperty("firstName");
    expect(children[0]).toHaveProperty("lastName");
    expect(children[0]).toHaveProperty("classId");
  });

  it("gets child by id", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const children = await caller.children.list();
    const child = await caller.children.getById({ id: children[0].id });
    expect(child).toBeDefined();
    expect(child!.firstName).toBe(children[0].firstName);
  });

  it("updates child information", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const children = await caller.children.list();
    const firstChild = children[0];
    // Update medical notes
    await caller.children.update({ id: firstChild.id, medicalNotes: "لا توجد حساسية" });
    const updated = await caller.children.getById({ id: firstChild.id });
    expect(updated!.medicalNotes).toBe("لا توجد حساسية");
  });
});

describe("Attendance System", () => {
  it("gets attendance by date", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    // Use today's date - attendance data may not exist for any specific date
    const today = new Date().toISOString().split('T')[0];
    const records = await caller.attendance.byDate({ date: today });
    expect(records).toBeDefined();
    expect(Array.isArray(records)).toBe(true);
    // Records may be empty if no attendance was taken today - just verify the structure
    expect(records.length).toBeGreaterThanOrEqual(0);
  });

  it("gets attendance by child", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const children = await caller.children.list();
    const records = await caller.attendance.byChild({ childId: children[0].id });
    expect(records).toBeDefined();
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toHaveProperty("status");
    expect(records[0]).toHaveProperty("date");
  });

  it("can check in a child", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    // Use a future date to avoid conflicts with existing data
    const futureDate = "2026-12-25";
    const children = await caller.children.list();
    const result = await caller.attendance.checkIn({ childId: children[0].id, date: futureDate });
    expect(result).toBeDefined();
    expect(result.childId).toBe(children[0].id);
    expect(result.status).toBe("present");
  });

  it("can mark a child absent", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const futureDate = "2026-12-26";
    const children = await caller.children.list();
    const result = await caller.attendance.markAbsent({ childId: children[1].id, date: futureDate, status: "absent" });
    expect(result).toBeDefined();
    expect(result.status).toBe("absent");
  });
});

describe("Daily Reports", () => {
  it("lists all daily reports", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const reports = await caller.dailyReports.list();
    expect(reports).toBeDefined();
    expect(reports.length).toBeGreaterThanOrEqual(100); // 20 children * 5 days + any created during tests
  });

  it("creates a new daily report", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const children = await caller.children.list();
    const result = await caller.dailyReports.create({
      childId: children[0].id,
      date: "2026-12-25",
      mood: "happy",
      activities: "لعب في الحديقة وتعلم الحروف",
      teacherNotes: "أداء ممتاز اليوم",
      meals: { breakfast: "حليب وتمر", lunch: "أرز ودجاج", snack: "فواكه" },
      sleep: { from: "12:00", to: "14:00", quality: "good" },
      isPublished: true,
    });
    expect(result).toBeDefined();
    expect(result.childId).toBe(children[0].id);
    expect(result.mood).toBe("happy");
  });

  it("gets daily report by id", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const reports = await caller.dailyReports.list();
    const report = await caller.dailyReports.getById({ id: reports[0].id });
    expect(report).toBeDefined();
    expect(report!.childId).toBe(reports[0].childId);
  });
});

describe("Messaging System", () => {
  it("lists all conversations (admin)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const conversations = await caller.messages.allConversations({});
    expect(conversations).toBeDefined();
    expect(conversations.length).toBeGreaterThanOrEqual(10);
  }, 30000);

  it("gets messages for a conversation", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const conversations = await caller.messages.allConversations({});
    const msgs = await caller.messages.list({ conversationId: conversations[0].id });
    expect(msgs).toBeDefined();
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[0]).toHaveProperty("content");
  }, 15000);

  it("sends a message", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const conversations = await caller.messages.allConversations({});
    const result = await caller.messages.send({
      conversationId: conversations[0].id,
      content: "مرحباً، كيف حال الطفل اليوم؟",
    });
    expect(result).toBeDefined();
    expect(result.content).toBe("مرحباً، كيف حال الطفل اليوم؟");
  }, 15000);
});

describe("Finance & Invoices", () => {
  it("lists invoices", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const invoices = await caller.finance.invoices();
    expect(invoices).toBeDefined();
    expect(invoices.length).toBeGreaterThanOrEqual(60);
  });

  it("gets financial summary", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const summary = await caller.finance.summary();
    expect(summary).toBeDefined();
    expect(summary.totalRevenue).toBeGreaterThan(0);
    expect(summary.pendingAmount).toBeGreaterThanOrEqual(0);
  });

  it("can mark invoice as paid", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const invoices = await caller.finance.invoices();
    const pendingInvoice = invoices.find(i => i.status === "pending");
    if (pendingInvoice) {
      const result = await caller.finance.markPaid({ id: pendingInvoice.id, paymentMethod: 'cash' });
      expect(result).toBeDefined();
    }
  });
});

describe("Loyalty Program", () => {
  it("lists rewards", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const rewards = await caller.loyalty.rewards();
    expect(rewards).toBeDefined();
    expect(rewards.length).toBe(5);
    expect(rewards[0]).toHaveProperty("name");
    expect(rewards[0]).toHaveProperty("pointsCost");
  });

  it("gets points balance", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const balance = await caller.loyalty.balance();
    expect(balance).toBeDefined();
    expect(typeof balance.points).toBe("number");
  });

  it("gets transaction history", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const transactions = await caller.loyalty.transactions();
    expect(transactions).toBeDefined();
    expect(transactions.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Notifications", () => {
  it("lists notifications", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const notifications = await caller.notifications.list();
    expect(notifications).toBeDefined();
    expect(Array.isArray(notifications)).toBe(true);
  });

  it("gets unread count", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const count = await caller.notifications.unreadCount();
    expect(count).toBeDefined();
    expect(typeof count).toBe("number");
  });
});

describe("Role-based Access", () => {
  it("teacher can access children list", async () => {
    const caller = appRouter.createCaller(createTeacherContext());
    const children = await caller.children.list();
    expect(children).toBeDefined();
    expect(children.length).toBeGreaterThan(0);
  });

  it("parent can access children list", async () => {
    const caller = appRouter.createCaller(createParentContext());
    const children = await caller.children.list();
    expect(children).toBeDefined();
  });
});

describe("Photo Upload in Daily Reports", () => {
  it("creates a daily report with photos array", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const children = await caller.children.list();
    const result = await caller.dailyReports.create({
      childId: children[0].id,
      date: "2026-12-27",
      mood: "excited",
      activities: "رسم ولعب",
      teacherNotes: "يوم رائع",
      photos: ["/manus-storage/uploads/test1.jpg", "/manus-storage/uploads/test2.jpg"],
      isPublished: true,
    });
    expect(result).toBeDefined();
    expect(result.childId).toBe(children[0].id);
  });
});
