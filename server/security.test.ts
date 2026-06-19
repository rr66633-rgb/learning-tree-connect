import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";

// Helper to create a mock context for different roles
function createMockContext(role: "admin" | "teacher" | "parent", userId: number = 1) {
  return {
    req: {} as any,
    res: { clearCookie: () => {} } as any,
    user: { id: userId, openId: `user-${userId}`, name: `Test ${role}`, role, email: null, loginMethod: null, lastSignedIn: new Date(), createdAt: new Date() },
  };
}

function createUnauthContext() {
  return {
    req: {} as any,
    res: { clearCookie: () => {} } as any,
    user: null,
  };
}

const caller = (ctx: any) => appRouter.createCaller(ctx);

describe("Data Isolation - Parent Access Control", () => {
  it("parent children.list returns only their own children", async () => {
    // Parent with ID 2 should only get children where parentId = 2
    const parentCtx = createMockContext("parent", 2);
    const result = await caller(parentCtx).children.list();
    // All returned children should belong to parent 2
    for (const child of result) {
      expect(child.parentId).toBe(2);
    }
  });

  it("admin children.list returns all children", async () => {
    const adminCtx = createMockContext("admin", 1);
    const result = await caller(adminCtx).children.list();
    // Admin should see children from multiple parents
    expect(result.length).toBeGreaterThan(0);
  });

  it("parent cannot view another parent's child by ID", async () => {
    // First get a child that belongs to parent 2
    const adminCtx = createMockContext("admin", 1);
    const allChildren = await caller(adminCtx).children.list();
    // Find a child that does NOT belong to parent 7 (pick parent 2's child)
    const otherChild = allChildren.find(c => c.parentId !== 7);
    if (otherChild) {
      const parentCtx = createMockContext("parent", 7);
      await expect(caller(parentCtx).children.getById({ id: otherChild.id })).rejects.toThrow();
    }
  });

  it("parent finance.invoices returns only their own invoices", async () => {
    const parentCtx = createMockContext("parent", 2);
    const result = await caller(parentCtx).finance.invoices();
    for (const invoice of result) {
      expect(invoice.parentId).toBe(2);
    }
  });

  it("parent cannot access finance.summary", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(caller(parentCtx).finance.summary()).rejects.toThrow();
  });

  it("parent attendance.byDate returns only their children's attendance", async () => {
    const parentCtx = createMockContext("parent", 2);
    const today = new Date().toISOString().split("T")[0];
    const result = await caller(parentCtx).attendance.byDate({ date: today });
    // Get parent's child IDs
    const parentChildren = await caller(parentCtx).children.list();
    const childIds = parentChildren.map(c => c.id);
    for (const record of result) {
      expect(childIds).toContain(record.childId);
    }
  });

  it("parent dailyReports.list returns only their children's reports", async () => {
    const parentCtx = createMockContext("parent", 2);
    const result = await caller(parentCtx).dailyReports.list();
    // Get parent's child IDs
    const parentChildren = await caller(parentCtx).children.list();
    const childIds = parentChildren.map(c => c.id);
    for (const report of result) {
      expect(childIds).toContain(report.childId);
    }
  });

  it("parent loyalty.balance returns their own balance", async () => {
    const parentCtx = createMockContext("parent", 2);
    const result = await caller(parentCtx).loyalty.balance();
    expect(result).toHaveProperty("points");
  });

  it("parent loyalty.transactions returns their own transactions", async () => {
    const parentCtx = createMockContext("parent", 2);
    const result = await caller(parentCtx).loyalty.transactions();
    for (const tx of result) {
      expect(tx.userId).toBe(2);
    }
  });
});

describe("Role-Based Access Control - Mutations", () => {
  it("parent cannot create a child (teacher-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(
      caller(parentCtx).children.create({
        firstName: "Test",
        lastName: "Child",
        dateOfBirth: "2020-01-01",
        gender: "male",
      })
    ).rejects.toThrow();
  });

  it("parent cannot update a child (teacher-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(
      caller(parentCtx).children.update({ id: 1, firstName: "Hacked" })
    ).rejects.toThrow();
  });

  it("parent cannot delete a child (admin-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(caller(parentCtx).children.delete({ id: 1 })).rejects.toThrow();
  });

  it("teacher cannot delete a child (admin-only)", async () => {
    const teacherCtx = createMockContext("teacher", 3);
    await expect(caller(teacherCtx).children.delete({ id: 1 })).rejects.toThrow();
  });

  it("parent cannot check in attendance (teacher-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(
      caller(parentCtx).attendance.checkIn({ childId: 1, date: "2026-06-19" })
    ).rejects.toThrow();
  });

  it("parent cannot create daily reports (teacher-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(
      caller(parentCtx).dailyReports.create({ childId: 1, date: "2026-06-19" })
    ).rejects.toThrow();
  });

  it("parent cannot create invoices (admin-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(
      caller(parentCtx).finance.createInvoice({
        childId: 1,
        parentId: 2,
        description: "Test",
        subtotal: "100",
        dueDate: "2026-07-01",
      })
    ).rejects.toThrow();
  });

  it("parent cannot mark invoice as paid (admin-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(caller(parentCtx).finance.markPaid({ id: 1 })).rejects.toThrow();
  });

  it("parent cannot add loyalty points (admin-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(
      caller(parentCtx).loyalty.addPoints({ userId: 2, points: 100, description: "Hack" })
    ).rejects.toThrow();
  });

  it("parent cannot list all users (admin-only)", async () => {
    const parentCtx = createMockContext("parent", 2);
    await expect(caller(parentCtx).users.list()).rejects.toThrow();
  });
});

describe("Upload Endpoint Authentication", () => {
  it("unauthenticated upload request returns 401", async () => {
    // Test the upload endpoint directly using fetch
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "dGVzdA==", contentType: "image/png", fileName: "test.png" }),
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
