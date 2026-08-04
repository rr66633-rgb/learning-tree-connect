import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";

/**
 * USER MANAGEMENT SECURITY TESTS
 * Verifies that only admins can manage users
 * Tests CRUD operations and role-based access control
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

const ADMIN_ID = 30001;
const TEACHER_ID = 1;
const PARENT_ID = 6;

describe("USER MANAGEMENT: Admin Access", () => {
  it("admin can list users", async () => {
    const result = await call(createCtx("admin", ADMIN_ID)).users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can list users filtered by role", async () => {
    const result = await call(createCtx("admin", ADMIN_ID)).users.list({ role: "teacher" });
    expect(Array.isArray(result)).toBe(true);
    result.forEach((u: any) => expect(u.role).toBe("teacher"));
  });

  it("admin can create a teacher user", async () => {
    const result = await call(createCtx("admin", ADMIN_ID)).users.create({
      name: "معلمة اختبار",
      email: "test-teacher-new@test.com",
      phone: "+966500000001",
      role: "teacher",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("admin can create a parent user", async () => {
    const result = await call(createCtx("admin", ADMIN_ID)).users.create({
      name: "ولي أمر اختبار",
      email: "test-parent-new@test.com",
      phone: "+966500000002",
      role: "parent",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("admin can update a user", async () => {
    // First create a user to update
    const created = await call(createCtx("admin", ADMIN_ID)).users.create({
      name: "مستخدم للتحديث",
      email: "update-test@test.com",
      role: "teacher",
    });
    const updated = await call(createCtx("admin", ADMIN_ID)).users.update({
      id: created.id,
      name: "اسم محدث",
      phone: "+966511111111",
    });
    expect(updated?.name).toBe("اسم محدث");
    expect(updated?.phone).toBe("+966511111111");
  });

  it("admin can delete a user", async () => {
    const created = await call(createCtx("admin", ADMIN_ID)).users.create({
      name: "مستخدم للحذف",
      email: "delete-test@test.com",
      role: "parent",
    });
    const result = await call(createCtx("admin", ADMIN_ID)).users.delete({ id: created.id });
    expect(result.success).toBe(true);
  });

  it("admin can get unlinked children", async () => {
    const result = await call(createCtx("admin", ADMIN_ID)).users.getUnlinkedChildren();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("USER MANAGEMENT: Teacher Access Denied", () => {
  it("teacher CANNOT list users", async () => {
    await expect(
      call(createCtx("teacher", TEACHER_ID)).users.list()
    ).rejects.toThrow(TRPCError);
  });

  it("teacher CANNOT create users", async () => {
    await expect(
      call(createCtx("teacher", TEACHER_ID)).users.create({
        name: "محاولة غير مصرح بها",
        email: "unauthorized@test.com",
        role: "parent",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("teacher CANNOT update users", async () => {
    await expect(
      call(createCtx("teacher", TEACHER_ID)).users.update({
        id: 1,
        name: "محاولة تعديل",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("teacher CANNOT delete users", async () => {
    await expect(
      call(createCtx("teacher", TEACHER_ID)).users.delete({ id: 1 })
    ).rejects.toThrow(TRPCError);
  });
});

describe("USER MANAGEMENT: Parent Access Denied", () => {
  it("parent CANNOT list users", async () => {
    await expect(
      call(createCtx("parent", PARENT_ID)).users.list()
    ).rejects.toThrow(TRPCError);
  });

  it("parent CANNOT create users", async () => {
    await expect(
      call(createCtx("parent", PARENT_ID)).users.create({
        name: "محاولة غير مصرح بها",
        email: "unauthorized2@test.com",
        role: "teacher",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("parent CANNOT update users", async () => {
    await expect(
      call(createCtx("parent", PARENT_ID)).users.update({
        id: 1,
        name: "محاولة تعديل",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("parent CANNOT delete users", async () => {
    await expect(
      call(createCtx("parent", PARENT_ID)).users.delete({ id: 1 })
    ).rejects.toThrow(TRPCError);
  });
});

describe("USER MANAGEMENT: Unauthenticated Access Denied", () => {
  it("unauthenticated user CANNOT list users", async () => {
    await expect(
      call(createUnauthCtx()).users.list()
    ).rejects.toThrow();
  });

  it("unauthenticated user CANNOT create users", async () => {
    await expect(
      call(createUnauthCtx()).users.create({
        name: "محاولة",
        email: "anon@test.com",
        role: "teacher",
      })
    ).rejects.toThrow();
  });
});
