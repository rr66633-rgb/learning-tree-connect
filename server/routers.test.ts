import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      email: "admin@learningtree.sa",
      name: "مدير النظام",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("appRouter", () => {
  describe("auth.me", () => {
    it("returns user when authenticated", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.email).toBe("admin@learningtree.sa");
    });

    it("returns null when not authenticated", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeNull();
    });
  });

  describe("protected routes", () => {
    it("dashboard.stats requires auth", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.dashboard.stats()).rejects.toThrow();
    });

    it("children.list requires auth", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.children.list()).rejects.toThrow();
    });

    it("attendance.byDate requires auth", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.attendance.byDate({ date: "2024-01-01" })).rejects.toThrow();
    });

    it("finance.invoices requires auth", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.finance.invoices()).rejects.toThrow();
    });

    it("loyalty.rewards requires auth", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.loyalty.rewards()).rejects.toThrow();
    });

    it("notifications.list requires auth", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.notifications.list()).rejects.toThrow();
    });

    it("messages.conversations requires auth", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.messages.conversations()).rejects.toThrow();
    });
  });
});
