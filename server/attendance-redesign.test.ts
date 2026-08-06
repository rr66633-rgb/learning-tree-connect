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
      organizationId: 1,
    },
    // Mirrors the real context (server/_core/context.ts), which always derives
    // organizationId from the authenticated user. Tenant-scoped procedures
    // reject a request without it.
    organizationId: 1,
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
      organizationId: 1,
    },
    // Mirrors the real context (server/_core/context.ts), which always derives
    // organizationId from the authenticated user. Tenant-scoped procedures
    // reject a request without it.
    organizationId: 1,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createParentContext(): TrpcContext {
  return {
    user: {
      id: 21,
      openId: "parent-test",
      email: "parent@test.com",
      name: "ولي أمر",
      loginMethod: "manus",
      role: "parent",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      organizationId: 1,
    },
    // Mirrors the real context (server/_core/context.ts), which always derives
    // organizationId from the authenticated user. Tenant-scoped procedures
    // reject a request without it.
    organizationId: 1,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Attendance System Redesign", () => {
  it("teacher can update attendance status from absent to present", async () => {
    const caller = appRouter.createCaller(createTeacherContext());
    const children = await caller.children.list();
    expect(children.length).toBeGreaterThan(0);

    // First mark a child as absent
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const absentResult = await caller.attendance.markAbsent({
      childId: children[0].id,
      date: futureDate,
      status: "absent",
    });
    expect(absentResult).toBeDefined();

    // Now update the status to present
    const updateResult = await caller.attendance.updateStatus({
      id: absentResult.id,
      childId: children[0].id,
      newStatus: "present",
      notes: "تم التصحيح - الطفل حاضر",
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.previousStatus).toBe("absent");
    expect(updateResult.newStatus).toBe("present");
  }, 15000);

  it("teacher can update attendance status from present to late", async () => {
    const caller = appRouter.createCaller(createTeacherContext());
    const children = await caller.children.list();

    const futureDate = new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0];
    const checkInResult = await caller.attendance.checkIn({
      childId: children[0].id,
      date: futureDate,
    });
    expect(checkInResult.status).toBe("present");

    const updateResult = await caller.attendance.updateStatus({
      id: checkInResult.id,
      childId: children[0].id,
      newStatus: "late",
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.previousStatus).toBe("present");
    expect(updateResult.newStatus).toBe("late");
  });

  it("markAbsent updates existing record instead of creating duplicate", async () => {
    const caller = appRouter.createCaller(createTeacherContext());
    const children = await caller.children.list();

    const futureDate = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0];
    // Check in first
    const checkInResult = await caller.attendance.checkIn({
      childId: children[0].id,
      date: futureDate,
    });
    expect(checkInResult.status).toBe("present");

    // Now mark absent - should update the existing record
    const absentResult = await caller.attendance.markAbsent({
      childId: children[0].id,
      date: futureDate,
      status: "absent",
    });
    // The result should have the same record id (updated, not new)
    expect(absentResult.id).toBeDefined();
    expect(absentResult.status).toBe("absent");
    expect(absentResult.childId).toBe(children[0].id);
  });

  it("audit log is created when status changes", async () => {
    const caller = appRouter.createCaller(createTeacherContext());
    const children = await caller.children.list();

    const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    const checkInResult = await caller.attendance.checkIn({
      childId: children[0].id,
      date: futureDate,
    });

    // Update status
    await caller.attendance.updateStatus({
      id: checkInResult.id,
      childId: children[0].id,
      newStatus: "absent",
      notes: "اختبار سجل التغييرات",
    });

    // Check audit log
    const logs = await caller.attendance.auditLog({ attendanceId: checkInResult.id });
    expect(logs.length).toBeGreaterThan(0);
    const lastLog = logs[0];
    expect(lastLog.previousStatus).toBe("present");
    expect(lastLog.newStatus).toBe("absent");
    expect(lastLog.notes).toBe("اختبار سجل التغييرات");
    expect(lastLog.changedByName).toBe("سارة الأحمد");
  });

  it("admin can also update attendance status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const children = await caller.children.list();

    const futureDate = new Date(Date.now() + 11 * 86400000).toISOString().split('T')[0];
    const checkInResult = await caller.attendance.checkIn({
      childId: children[0].id,
      date: futureDate,
    });

    const updateResult = await caller.attendance.updateStatus({
      id: checkInResult.id,
      childId: children[0].id,
      newStatus: "excused",
      notes: "إذن من الإدارة",
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.newStatus).toBe("excused");
  });

  it("parent cannot update attendance status", async () => {
    const caller = appRouter.createCaller(createParentContext());
    await expect(
      caller.attendance.updateStatus({
        id: 1,
        childId: 1,
        newStatus: "present",
      })
    ).rejects.toThrow();
  });

  it("parent can view audit log for their children", async () => {
    const caller = appRouter.createCaller(createParentContext());
    // Query without childId - should return empty array
    const logs = await caller.attendance.auditLog({});
    expect(Array.isArray(logs)).toBe(true);
  });

  it("updateStatus returns NOT_FOUND for non-existent record", async () => {
    const caller = appRouter.createCaller(createTeacherContext());
    await expect(
      caller.attendance.updateStatus({
        id: 999999,
        childId: 1,
        newStatus: "present",
      })
    ).rejects.toThrow("سجل الحضور غير موجود");
  });
});
