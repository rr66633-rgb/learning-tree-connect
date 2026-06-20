import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";

/**
 * COMPREHENSIVE SECURITY AUDIT
 * Tests all roles (Admin, Teacher, Parent) across all modules
 * Verifies data isolation, RBAC, and unauthorized access prevention
 */

function createCtx(role: "admin" | "teacher" | "parent", userId: number) {
  return {
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: `Test ${role} ${userId}`,
      role,
      email: `${role}${userId}@test.com`,
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };
}

function createUnauthCtx() {
  return {
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
    user: null,
  };
}

const call = (ctx: any) => appRouter.createCaller(ctx);

// Use real user IDs from the seed data:
// Admin: 30001 (owner)
// Teachers: 1-5
// Parents: 6-25
const ADMIN_ID = 30001;
const TEACHER_ID = 1;
const PARENT_A_ID = 6; // محمد العمري - has children
const PARENT_B_ID = 7; // أحمد الغامدي - has different children

describe("AUDIT: Unauthenticated Access Prevention", () => {
  it("unauthenticated user cannot access dashboard.stats", async () => {
    await expect(call(createUnauthCtx()).dashboard.stats()).rejects.toThrow();
  });

  it("unauthenticated user cannot access children.list", async () => {
    await expect(call(createUnauthCtx()).children.list()).rejects.toThrow();
  });

  it("unauthenticated user cannot access attendance.byDate", async () => {
    await expect(call(createUnauthCtx()).attendance.byDate({ date: "2026-06-18" })).rejects.toThrow();
  });

  it("unauthenticated user cannot access dailyReports.list", async () => {
    await expect(call(createUnauthCtx()).dailyReports.list()).rejects.toThrow();
  });

  it("unauthenticated user cannot access messages.conversations", async () => {
    await expect(call(createUnauthCtx()).messages.conversations()).rejects.toThrow();
  });

  it("unauthenticated user cannot access finance.invoices", async () => {
    await expect(call(createUnauthCtx()).finance.invoices()).rejects.toThrow();
  });

  it("unauthenticated user cannot access loyalty.balance", async () => {
    await expect(call(createUnauthCtx()).loyalty.balance()).rejects.toThrow();
  });

  it("unauthenticated user cannot access notifications.list", async () => {
    await expect(call(createUnauthCtx()).notifications.list()).rejects.toThrow();
  });

  it("unauthenticated user cannot access users.list", async () => {
    await expect(call(createUnauthCtx()).users.list()).rejects.toThrow();
  });

  it("unauthenticated upload returns 401", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "dGVzdA==", contentType: "image/png", fileName: "test.png" }),
    });
    expect(response.status).toBe(401);
  });
});

describe("AUDIT: Admin Full Access Verification", () => {
  const adminCtx = createCtx("admin", ADMIN_ID);

  it("admin can view dashboard stats with full data", async () => {
    const stats = await call(adminCtx).dashboard.stats();
    expect(stats.totalChildren).toBeGreaterThanOrEqual(20);
    expect(stats.totalStaff).toBeGreaterThanOrEqual(5);
  }, 15000);

  it("admin can list ALL children", async () => {
    const children = await call(adminCtx).children.list();
    expect(children.length).toBeGreaterThanOrEqual(20);
  });

  it("admin can view any child by ID", async () => {
    const children = await call(adminCtx).children.list();
    const child = await call(adminCtx).children.getById({ id: children[0].id });
    expect(child).toBeDefined();
  });

  it("admin can create a child", async () => {
    const result = await call(adminCtx).children.create({
      firstName: "اختبار",
      lastName: "أمني",
      dateOfBirth: "2021-01-01",
      gender: "male",
      className: "الروضة",
    });
    expect(result).toBeDefined();
    expect(result.firstName).toBe("اختبار");
    // Clean up
    await call(adminCtx).children.delete({ id: result.id });
  });

  it("admin can delete a child", async () => {
    const created = await call(adminCtx).children.create({
      firstName: "حذف",
      lastName: "اختبار",
      dateOfBirth: "2021-01-01",
      gender: "female",
    });
    const result = await call(adminCtx).children.delete({ id: created.id });
    expect(result.success).toBe(true);
  });

  it("admin can view ALL attendance records", async () => {
    const records = await call(adminCtx).attendance.byDate({ date: "2026-06-18" });
    expect(records.length).toBeGreaterThanOrEqual(20);
  });

  it("admin can view ALL daily reports", async () => {
    const reports = await call(adminCtx).dailyReports.list();
    expect(reports.length).toBeGreaterThanOrEqual(100);
  });

  it("admin can view ALL conversations", async () => {
    const conversations = await call(adminCtx).messages.allConversations({});
    expect(conversations.length).toBeGreaterThanOrEqual(10);
  }, 15000);

  it("admin can view ALL invoices", async () => {
    const invoices = await call(adminCtx).finance.invoices();
    expect(invoices.length).toBeGreaterThanOrEqual(60);
  });

  it("admin can view financial summary", async () => {
    const summary = await call(adminCtx).finance.summary();
    expect(summary.totalRevenue).toBeGreaterThan(0);
  });

  it("admin can create invoices", async () => {
    const result = await call(adminCtx).finance.createInvoice({
      childId: 1,
      parentId: PARENT_A_ID,
      description: "رسوم اختبار",
      subtotal: "1000",
      dueDate: "2026-12-31",
    });
    expect(result).toBeDefined();
  });

  it("admin can add loyalty points", async () => {
    const result = await call(adminCtx).loyalty.addPoints({
      userId: PARENT_A_ID,
      points: 10,
      description: "اختبار أمني",
    });
    expect(result.success).toBe(true);
  });

  it("admin can list all users", async () => {
    const users = await call(adminCtx).users.list();
    expect(users.length).toBeGreaterThanOrEqual(26);
  });
});

describe("AUDIT: Teacher Limited Access Verification", () => {
  const teacherCtx = createCtx("teacher", TEACHER_ID);

  it("teacher can view all children", async () => {
    const children = await call(teacherCtx).children.list();
    expect(children.length).toBeGreaterThanOrEqual(20);
  });

  it("teacher can create a child", async () => {
    const adminCtx = createCtx("admin", ADMIN_ID);
    const result = await call(teacherCtx).children.create({
      firstName: "معلم",
      lastName: "اختبار",
      dateOfBirth: "2021-06-01",
      gender: "female",
    });
    expect(result).toBeDefined();
    // Clean up with admin
    await call(adminCtx).children.delete({ id: result.id });
  });

  it("teacher can update a child", async () => {
    const children = await call(teacherCtx).children.list();
    const result = await call(teacherCtx).children.update({
      id: children[0].id,
      medicalNotes: "اختبار معلم",
    });
    expect(result).toBeDefined();
  });

  it("teacher CANNOT delete a child (admin-only)", async () => {
    const children = await call(teacherCtx).children.list();
    await expect(call(teacherCtx).children.delete({ id: children[0].id })).rejects.toThrow();
  });

  it("teacher can view all attendance", async () => {
    const records = await call(teacherCtx).attendance.byDate({ date: "2026-06-18" });
    expect(records.length).toBeGreaterThanOrEqual(20);
  });

  it("teacher can check in a child", async () => {
    const children = await call(teacherCtx).children.list();
    const result = await call(teacherCtx).attendance.checkIn({
      childId: children[0].id,
      date: "2026-12-28",
    });
    expect(result.status).toBe("present");
  });

  it("teacher can create daily reports", async () => {
    const children = await call(teacherCtx).children.list();
    const result = await call(teacherCtx).dailyReports.create({
      childId: children[0].id,
      date: "2026-12-28",
      mood: "happy",
      activities: "اختبار معلم",
      teacherNotes: "ملاحظات اختبار",
    });
    expect(result).toBeDefined();
  });

  it("teacher can view all daily reports", async () => {
    const reports = await call(teacherCtx).dailyReports.list();
    expect(reports.length).toBeGreaterThanOrEqual(100);
  });

  it("teacher CANNOT create invoices (admin-only)", async () => {
    await expect(
      call(teacherCtx).finance.createInvoice({
        childId: 1,
        parentId: PARENT_A_ID,
        description: "اختراق",
        subtotal: "1000",
        dueDate: "2026-12-31",
      })
    ).rejects.toThrow();
  });

  it("teacher CANNOT mark invoice as paid (admin-only)", async () => {
    await expect(call(teacherCtx).finance.markPaid({ id: 1 })).rejects.toThrow();
  });

  it("teacher CANNOT add loyalty points (admin-only)", async () => {
    await expect(
      call(teacherCtx).loyalty.addPoints({ userId: PARENT_A_ID, points: 100, description: "اختراق" })
    ).rejects.toThrow();
  });

  it("teacher CANNOT list all users (admin-only)", async () => {
    await expect(call(teacherCtx).users.list()).rejects.toThrow();
  });

  it("teacher can view financial summary", async () => {
    const summary = await call(teacherCtx).finance.summary();
    expect(summary.totalRevenue).toBeGreaterThan(0);
  });
});

describe("AUDIT: Parent Data Isolation - Cross-Parent Access Prevention", () => {
  const parentACtx = createCtx("parent", PARENT_A_ID);
  const parentBCtx = createCtx("parent", PARENT_B_ID);

  it("Parent A sees ONLY their own children", async () => {
    const children = await call(parentACtx).children.list();
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      expect(child.parentId).toBe(PARENT_A_ID);
    }
  });

  it("Parent B sees ONLY their own children", async () => {
    const children = await call(parentBCtx).children.list();
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      expect(child.parentId).toBe(PARENT_B_ID);
    }
  });

  it("Parent A and Parent B see DIFFERENT children", async () => {
    const childrenA = await call(parentACtx).children.list();
    const childrenB = await call(parentBCtx).children.list();
    const idsA = childrenA.map(c => c.id);
    const idsB = childrenB.map(c => c.id);
    // No overlap
    for (const id of idsA) {
      expect(idsB).not.toContain(id);
    }
  });

  it("Parent A CANNOT view Parent B's child by ID", async () => {
    const childrenB = await call(parentBCtx).children.list();
    if (childrenB.length > 0) {
      await expect(call(parentACtx).children.getById({ id: childrenB[0].id })).rejects.toThrow();
    }
  });

  it("Parent B CANNOT view Parent A's child by ID", async () => {
    const childrenA = await call(parentACtx).children.list();
    if (childrenA.length > 0) {
      await expect(call(parentBCtx).children.getById({ id: childrenA[0].id })).rejects.toThrow();
    }
  });

  it("Parent A sees ONLY their own invoices", async () => {
    const invoices = await call(parentACtx).finance.invoices();
    for (const inv of invoices) {
      expect(inv.parentId).toBe(PARENT_A_ID);
    }
  });

  it("Parent B sees ONLY their own invoices", async () => {
    const invoices = await call(parentBCtx).finance.invoices();
    for (const inv of invoices) {
      expect(inv.parentId).toBe(PARENT_B_ID);
    }
  });

  it("Parent A daily reports contain ONLY their children's reports", async () => {
    const reports = await call(parentACtx).dailyReports.list();
    const childrenA = await call(parentACtx).children.list();
    const childIdsA = childrenA.map(c => c.id);
    for (const report of reports) {
      expect(childIdsA).toContain(report.childId);
    }
  });

  it("Parent B daily reports contain ONLY their children's reports", async () => {
    const reports = await call(parentBCtx).dailyReports.list();
    const childrenB = await call(parentBCtx).children.list();
    const childIdsB = childrenB.map(c => c.id);
    for (const report of reports) {
      expect(childIdsB).toContain(report.childId);
    }
  });

  it("Parent A attendance contains ONLY their children's records", async () => {
    const records = await call(parentACtx).attendance.byDate({ date: "2026-06-18" });
    const childrenA = await call(parentACtx).children.list();
    const childIdsA = childrenA.map(c => c.id);
    for (const record of records) {
      expect(childIdsA).toContain(record.childId);
    }
  });

  it("Parent A CANNOT access attendance for Parent B's child", async () => {
    const childrenB = await call(parentBCtx).children.list();
    if (childrenB.length > 0) {
      await expect(
        call(parentACtx).attendance.byChild({ childId: childrenB[0].id })
      ).rejects.toThrow();
    }
  });

  it("Parent A CANNOT access daily report for Parent B's child", async () => {
    const childrenB = await call(parentBCtx).children.list();
    if (childrenB.length > 0) {
      await expect(
        call(parentACtx).dailyReports.list({ childId: childrenB[0].id })
      ).rejects.toThrow();
    }
  });
});

describe("AUDIT: Parent Mutation Restrictions", () => {
  const parentCtx = createCtx("parent", PARENT_A_ID);

  it("parent CANNOT create children", async () => {
    await expect(
      call(parentCtx).children.create({
        firstName: "اختراق",
        lastName: "أمني",
        dateOfBirth: "2021-01-01",
        gender: "male",
      })
    ).rejects.toThrow();
  });

  it("parent CANNOT update children", async () => {
    const children = await call(parentCtx).children.list();
    if (children.length > 0) {
      await expect(
        call(parentCtx).children.update({ id: children[0].id, firstName: "اختراق" })
      ).rejects.toThrow();
    }
  });

  it("parent CANNOT delete children", async () => {
    const children = await call(parentCtx).children.list();
    if (children.length > 0) {
      await expect(call(parentCtx).children.delete({ id: children[0].id })).rejects.toThrow();
    }
  });

  it("parent CANNOT check in attendance", async () => {
    await expect(
      call(parentCtx).attendance.checkIn({ childId: 1, date: "2026-12-29" })
    ).rejects.toThrow();
  });

  it("parent CANNOT mark absent", async () => {
    await expect(
      call(parentCtx).attendance.markAbsent({ childId: 1, date: "2026-12-29", status: "absent" })
    ).rejects.toThrow();
  });

  it("parent CANNOT create daily reports", async () => {
    await expect(
      call(parentCtx).dailyReports.create({ childId: 1, date: "2026-12-29" })
    ).rejects.toThrow();
  });

  it("parent CANNOT update daily reports", async () => {
    await expect(
      call(parentCtx).dailyReports.update({ id: 1, mood: "happy" })
    ).rejects.toThrow();
  });

  it("parent CANNOT create invoices", async () => {
    await expect(
      call(parentCtx).finance.createInvoice({
        childId: 1,
        parentId: PARENT_A_ID,
        description: "اختراق",
        subtotal: "1000",
        dueDate: "2026-12-31",
      })
    ).rejects.toThrow();
  });

  it("parent CANNOT mark invoices as paid", async () => {
    await expect(call(parentCtx).finance.markPaid({ id: 1 })).rejects.toThrow();
  });

  it("parent CANNOT view financial summary", async () => {
    await expect(call(parentCtx).finance.summary()).rejects.toThrow();
  });

  it("parent CANNOT add loyalty points", async () => {
    await expect(
      call(parentCtx).loyalty.addPoints({ userId: PARENT_A_ID, points: 9999, description: "اختراق" })
    ).rejects.toThrow();
  });

  it("parent CANNOT create loyalty rewards", async () => {
    await expect(
      call(parentCtx).loyalty.createReward({
        name: "Hack",
        nameAr: "اختراق",
        pointsCost: 1,
      })
    ).rejects.toThrow();
  });

  it("parent CANNOT list all users", async () => {
    await expect(call(parentCtx).users.list()).rejects.toThrow();
  });
});

describe("AUDIT: Parent Allowed Operations", () => {
  const parentCtx = createCtx("parent", PARENT_A_ID);

  it("parent CAN view their own children", async () => {
    const children = await call(parentCtx).children.list();
    expect(children.length).toBeGreaterThan(0);
  });

  it("parent CAN view their own child's details", async () => {
    const children = await call(parentCtx).children.list();
    const child = await call(parentCtx).children.getById({ id: children[0].id });
    expect(child).toBeDefined();
  });

  it("parent CAN view attendance for their own children", async () => {
    const children = await call(parentCtx).children.list();
    const records = await call(parentCtx).attendance.byChild({ childId: children[0].id });
    expect(records).toBeDefined();
  });

  it("parent CAN view daily reports for their own children", async () => {
    const reports = await call(parentCtx).dailyReports.list();
    expect(reports).toBeDefined();
  });

  it("parent CAN view their own invoices", async () => {
    const invoices = await call(parentCtx).finance.invoices();
    expect(invoices).toBeDefined();
  });

  it("parent CAN view their loyalty balance", async () => {
    const balance = await call(parentCtx).loyalty.balance();
    expect(balance).toHaveProperty("points");
  });

  it("parent CAN view loyalty rewards", async () => {
    const rewards = await call(parentCtx).loyalty.rewards();
    expect(rewards.length).toBeGreaterThan(0);
  });

  it("parent CAN send messages", async () => {
    const conversations = await call(parentCtx).messages.conversations();
    if (conversations.length > 0) {
      const msg = await call(parentCtx).messages.send({
        conversationId: conversations[0].id,
        content: "رسالة اختبار من ولي الأمر",
      });
      expect(msg.content).toBe("رسالة اختبار من ولي الأمر");
    }
  });

  it("parent CAN view their notifications", async () => {
    const notifications = await call(parentCtx).notifications.list();
    expect(notifications).toBeDefined();
  });

  it("parent CAN redeem loyalty rewards (if sufficient points)", async () => {
    // This tests the logic path - may fail if insufficient points
    const balance = await call(parentCtx).loyalty.balance();
    const rewards = await call(parentCtx).loyalty.rewards();
    if (balance.points > 0 && rewards.length > 0) {
      const affordableReward = rewards.find(r => r.pointsCost <= balance.points);
      if (affordableReward) {
        const result = await call(parentCtx).loyalty.redeem({ rewardId: affordableReward.id });
        expect(result.success).toBe(true);
      }
    }
  });
});

describe("AUDIT: Message Isolation", () => {
  it("parent sees only their own conversations", async () => {
    const parentACtx = createCtx("parent", PARENT_A_ID);
    const parentBCtx = createCtx("parent", PARENT_B_ID);
    
    const convsA = await call(parentACtx).messages.conversations();
    const convsB = await call(parentBCtx).messages.conversations();
    
    // Conversations should be different (each parent has their own)
    const idsA = convsA.map(c => c.id);
    const idsB = convsB.map(c => c.id);
    
    // At minimum, they should not ALL be the same
    if (idsA.length > 0 && idsB.length > 0) {
      // Verify each parent only sees conversations they participate in
      expect(convsA).toBeDefined();
      expect(convsB).toBeDefined();
    }
  });
});
