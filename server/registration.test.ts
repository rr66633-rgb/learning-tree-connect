import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  checkNurseryRegistrationEmailExists: vi.fn().mockResolvedValue(false),
  findUserByIdentifier: vi.fn().mockResolvedValue(null),
  createNurseryRegistration: vi.fn().mockResolvedValue(1),
  getNurseryRegistrations: vi.fn().mockResolvedValue([]),
  getNurseryRegistrationById: vi.fn().mockResolvedValue(null),
  updateNurseryRegistrationStatus: vi.fn().mockResolvedValue(undefined),
}));

// Mock authService
vi.mock("./_core/authService", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password_123"),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { "user-agent": "test-agent" },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "password",
      role: "super_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

function createRegularUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "password",
      role: "parent",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("Registration Router", () => {
  const caller = appRouter.createCaller;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registration.getPlans", () => {
    it("should return 3 plans with correct pricing", async () => {
      const ctx = createPublicContext();
      const trpc = caller(ctx);
      const plans = await trpc.registration.getPlans();

      expect(plans).toHaveLength(3);
      expect(plans[0].id).toBe("basic");
      expect(plans[0].price).toBe(6900);
      expect(plans[0].period).toBe("سنوياً");
      expect(plans[1].id).toBe("professional");
      expect(plans[1].price).toBe(10900);
      expect(plans[1].popular).toBe(true);
      expect(plans[2].id).toBe("enterprise");
      expect(plans[2].price).toBe(15900);
    });

    it("should include features for each plan", async () => {
      const ctx = createPublicContext();
      const trpc = caller(ctx);
      const plans = await trpc.registration.getPlans();

      plans.forEach((plan) => {
        expect(plan.features.length).toBeGreaterThan(0);
        expect(plan.name).toBeTruthy();
        expect(plan.nameEn).toBeTruthy();
      });
    });
  });

  describe("registration.getCities", () => {
    it("should return Saudi cities list", async () => {
      const ctx = createPublicContext();
      const trpc = caller(ctx);
      const cities = await trpc.registration.getCities();

      expect(cities.length).toBeGreaterThan(0);
      expect(cities).toContain("الرياض");
      expect(cities).toContain("جدة");
      expect(cities).toContain("مكة المكرمة");
    });
  });

  describe("registration.submit", () => {
    const validInput = {
      nurseryName: "Future Buds Nursery",
      nurseryNameAr: "حضانة براعم المستقبل",
      city: "الرياض",
      district: "حي النرجس",
      childrenCount: 30,
      staffCount: 8,
      licenseNumber: "12345",
      ownerName: "أحمد محمد",
      ownerEmail: "ahmed@example.com",
      ownerPhone: "0512345678",
      ownerPassword: "securePass123",
      selectedPlan: "professional" as const,
    };

    it("should successfully submit a registration", async () => {
      const ctx = createPublicContext();
      const trpc = caller(ctx);
      const result = await trpc.registration.submit(validInput);

      expect(result.success).toBe(true);
      expect(result.registrationId).toBe(1);
      expect(result.message).toContain("تم استلام طلب التسجيل");
    });

    it("should reject if email already registered", async () => {
      const db = await import("./db");
      (db.checkNurseryRegistrationEmailExists as any).mockResolvedValueOnce(true);

      const ctx = createPublicContext();
      const trpc = caller(ctx);

      await expect(trpc.registration.submit(validInput)).rejects.toThrow(
        /مسجل مسبقاً/
      );
    });

    it("should reject if user already exists in system", async () => {
      const db = await import("./db");
      (db.findUserByIdentifier as any).mockResolvedValueOnce({ id: 1, email: "ahmed@example.com" });

      const ctx = createPublicContext();
      const trpc = caller(ctx);

      await expect(trpc.registration.submit(validInput)).rejects.toThrow(
        /مسجل مسبقاً/
      );
    });

    it("should validate required fields", async () => {
      const ctx = createPublicContext();
      const trpc = caller(ctx);

      // Missing nurseryNameAr (too short)
      await expect(
        trpc.registration.submit({ ...validInput, nurseryNameAr: "" })
      ).rejects.toThrow();

      // Invalid email
      await expect(
        trpc.registration.submit({ ...validInput, ownerEmail: "invalid" })
      ).rejects.toThrow();

      // Short password
      await expect(
        trpc.registration.submit({ ...validInput, ownerPassword: "123" })
      ).rejects.toThrow();
    });

    it("should validate plan selection", async () => {
      const ctx = createPublicContext();
      const trpc = caller(ctx);

      await expect(
        trpc.registration.submit({ ...validInput, selectedPlan: "invalid" as any })
      ).rejects.toThrow();
    });
  });

  describe("registration.list (admin only)", () => {
    it("should allow super_admin to list registrations", async () => {
      const ctx = createAdminContext();
      const trpc = caller(ctx);
      const result = await trpc.registration.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should reject non-admin users", async () => {
      const ctx = createRegularUserContext();
      const trpc = caller(ctx);

      await expect(trpc.registration.list()).rejects.toThrow(/صلاحيات غير كافية/);
    });
  });

  describe("registration.updateStatus (admin only)", () => {
    it("should reject non-admin users", async () => {
      const ctx = createRegularUserContext();
      const trpc = caller(ctx);

      await expect(
        trpc.registration.updateStatus({ id: 1, status: "approved" })
      ).rejects.toThrow(/صلاحيات غير كافية/);
    });

    it("should reject if registration not found", async () => {
      const ctx = createAdminContext();
      const trpc = caller(ctx);

      await expect(
        trpc.registration.updateStatus({ id: 999, status: "approved" })
      ).rejects.toThrow(/غير موجود/);
    });
  });
});
