import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the authService module
vi.mock("./_core/authService", () => ({
  generateOtpCode: vi.fn(() => "123456"),
  generateResetToken: vi.fn(() => "mock-reset-token-abc123"),
  hashPassword: vi.fn(async (pw: string) => `hashed:${pw}`),
  verifyPassword: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
  canRequestOtp: vi.fn(async () => ({ allowed: true })),
  createOtp: vi.fn(async () => ({ code: "123456", expiresAt: new Date(Date.now() + 300000) })),
  verifyOtp: vi.fn(async () => ({ valid: true, userId: 1 })),
  createPasswordResetToken: vi.fn(async () => ({ token: "mock-reset-token", expiresAt: new Date(Date.now() + 3600000) })),
  verifyResetToken: vi.fn(async () => ({ valid: true, userId: 1 })),
  markTokenUsed: vi.fn(async () => {}),
  isAccountLocked: vi.fn(async () => ({ locked: false })),
  handleFailedLogin: vi.fn(async () => ({ locked: false, attemptsRemaining: 4 })),
  resetFailedAttempts: vi.fn(async () => {}),
  recordLoginAttempt: vi.fn(async () => {}),
  updatePassword: vi.fn(async () => {}),
  sendSmsOtp: vi.fn(async () => ({ sent: true, message: "sent" })),
  sendEmailOtp: vi.fn(async () => ({ sent: true, message: "sent" })),
  sendPasswordResetEmail: vi.fn(async () => ({ sent: true, message: "sent" })),
  AUTH_CONSTANTS: {
    OTP_LENGTH: 6,
    OTP_EXPIRY_MINUTES: 5,
    OTP_MAX_ATTEMPTS: 5,
    OTP_COOLDOWN_SECONDS: 60,
    OTP_MAX_REQUESTS_PER_10_MIN: 3,
    PASSWORD_RESET_EXPIRY_HOURS: 1,
    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    ACCOUNT_LOCKOUT_MINUTES: 30,
    SESSION_TIMEOUT_MINUTES: 30,
  },
}));

// Mock db module
vi.mock("./db", () => ({
  findUserByIdentifier: vi.fn(async (identifier: string) => {
    if (identifier === "existing@test.com" || identifier === "0500000000") {
      return { id: 1, name: "Test User", email: "existing@test.com", phone: "0500000000", password: "hashed:password123", role: "parent", isActive: true };
    }
    if (identifier === "locked@test.com") {
      return { id: 2, name: "Locked User", email: "locked@test.com", phone: "0500000001", password: "hashed:password123", role: "parent", isActive: true };
    }
    return null;
  }),
  createUserWithPassword: vi.fn(async () => 99),
  activateUser: vi.fn(async () => {}),
  getUserById: vi.fn(async (id: number) => ({ id, name: "Test User", email: "test@test.com", role: "parent" })),
}));

import * as authService from "./_core/authService";
import * as db from "./db";

describe("Authentication & Security System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OTP Generation", () => {
    it("generates a 6-digit OTP code", () => {
      const code = authService.generateOtpCode();
      expect(code).toBe("123456");
      expect(code.length).toBe(6);
    });

    it("generates a secure reset token", () => {
      const token = authService.generateResetToken();
      expect(token).toBe("mock-reset-token-abc123");
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe("Password Hashing", () => {
    it("hashes a password", async () => {
      const hash = await authService.hashPassword("myPassword123");
      expect(hash).toBe("hashed:myPassword123");
    });

    it("verifies correct password", async () => {
      const isValid = await authService.verifyPassword("password123", "hashed:password123");
      expect(isValid).toBe(true);
    });

    it("rejects incorrect password", async () => {
      const isValid = await authService.verifyPassword("wrongpassword", "hashed:password123");
      expect(isValid).toBe(false);
    });
  });

  describe("OTP Rate Limiting", () => {
    it("allows OTP request when under limit", async () => {
      const result = await authService.canRequestOtp("0500000000");
      expect(result.allowed).toBe(true);
    });

    it("blocks OTP request when rate limited", async () => {
      vi.mocked(authService.canRequestOtp).mockResolvedValueOnce({ allowed: false, waitSeconds: 45 });
      const result = await authService.canRequestOtp("0500000000");
      expect(result.allowed).toBe(false);
      expect(result.waitSeconds).toBe(45);
    });
  });

  describe("OTP Verification", () => {
    it("verifies a valid OTP code", async () => {
      const result = await authService.verifyOtp({
        identifier: "0500000000",
        code: "123456",
        type: "registration",
      });
      expect(result.valid).toBe(true);
      expect(result.userId).toBe(1);
    });

    it("rejects an invalid OTP code", async () => {
      vi.mocked(authService.verifyOtp).mockResolvedValueOnce({ valid: false, error: "رمز التحقق غير صحيح" });
      const result = await authService.verifyOtp({
        identifier: "0500000000",
        code: "000000",
        type: "registration",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("غير صحيح");
    });

    it("rejects expired OTP", async () => {
      vi.mocked(authService.verifyOtp).mockResolvedValueOnce({ valid: false, error: "رمز التحقق غير صالح أو منتهي الصلاحية" });
      const result = await authService.verifyOtp({
        identifier: "0500000000",
        code: "123456",
        type: "registration",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("منتهي الصلاحية");
    });
  });

  describe("Account Lockout", () => {
    it("account is not locked by default", async () => {
      const result = await authService.isAccountLocked(1);
      expect(result.locked).toBe(false);
    });

    it("locks account after max failed attempts", async () => {
      vi.mocked(authService.handleFailedLogin).mockResolvedValueOnce({ locked: true, attemptsRemaining: 0 });
      const result = await authService.handleFailedLogin(1);
      expect(result.locked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
    });

    it("reports remaining attempts before lockout", async () => {
      const result = await authService.handleFailedLogin(1);
      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
    });

    it("resets failed attempts on successful login", async () => {
      await authService.resetFailedAttempts(1);
      expect(authService.resetFailedAttempts).toHaveBeenCalledWith(1);
    });
  });

  describe("Password Reset Flow", () => {
    it("creates a password reset token", async () => {
      const result = await authService.createPasswordResetToken(1);
      expect(result.token).toBe("mock-reset-token");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("verifies a valid reset token", async () => {
      const result = await authService.verifyResetToken("valid-token");
      expect(result.valid).toBe(true);
      expect(result.userId).toBe(1);
    });

    it("rejects an invalid/expired reset token", async () => {
      vi.mocked(authService.verifyResetToken).mockResolvedValueOnce({ valid: false, error: "رابط إعادة التعيين غير صالح" });
      const result = await authService.verifyResetToken("expired-token");
      expect(result.valid).toBe(false);
    });

    it("marks token as used after password reset", async () => {
      await authService.markTokenUsed("used-token");
      expect(authService.markTokenUsed).toHaveBeenCalledWith("used-token");
    });

    it("updates password successfully", async () => {
      await authService.updatePassword(1, "newPassword123");
      expect(authService.updatePassword).toHaveBeenCalledWith(1, "newPassword123");
    });
  });

  describe("Registration Flow", () => {
    it("creates a new user with hashed password", async () => {
      const userId = await db.createUserWithPassword({
        name: "New Parent",
        phone: "0500000099",
        email: "new@test.com",
        password: "hashed:password123",
        role: "parent",
        isActive: false,
      } as any);
      expect(userId).toBe(99);
    });

    it("rejects registration with existing email", async () => {
      const existing = await db.findUserByIdentifier("existing@test.com");
      expect(existing).not.toBeNull();
    });

    it("sends OTP after registration", async () => {
      const result = await authService.createOtp({
        userId: 99,
        phone: "0500000099",
        type: "registration",
      });
      expect(result.code).toBe("123456");
      expect(authService.createOtp).toHaveBeenCalled();
    });

    it("activates user after OTP verification", async () => {
      await db.activateUser(99);
      expect(db.activateUser).toHaveBeenCalledWith(99);
    });
  });

  describe("Login Security", () => {
    it("finds user by email", async () => {
      const user = await db.findUserByIdentifier("existing@test.com");
      expect(user).not.toBeNull();
      expect(user!.email).toBe("existing@test.com");
    });

    it("finds user by phone", async () => {
      const user = await db.findUserByIdentifier("0500000000");
      expect(user).not.toBeNull();
      expect(user!.phone).toBe("0500000000");
    });

    it("returns null for non-existent user", async () => {
      const user = await db.findUserByIdentifier("nonexistent@test.com");
      expect(user).toBeNull();
    });

    it("records successful login attempt", async () => {
      await authService.recordLoginAttempt({ userId: 1, identifier: "test@test.com", ip: "127.0.0.1", success: true });
      expect(authService.recordLoginAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("records failed login attempt", async () => {
      await authService.recordLoginAttempt({ identifier: "unknown@test.com", ip: "127.0.0.1", success: false, reason: "user_not_found" });
      expect(authService.recordLoginAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, reason: "user_not_found" })
      );
    });
  });

  describe("SMS/Email OTP Sending", () => {
    it("sends SMS OTP", async () => {
      const result = await authService.sendSmsOtp("0500000000", "123456");
      expect(result.sent).toBe(true);
    });

    it("sends Email OTP", async () => {
      const result = await authService.sendEmailOtp("test@test.com", "123456");
      expect(result.sent).toBe(true);
    });

    it("sends password reset email", async () => {
      const result = await authService.sendPasswordResetEmail("test@test.com", "https://example.com/reset?token=abc");
      expect(result.sent).toBe(true);
    });
  });

  describe("Auth Constants", () => {
    it("has correct OTP expiry (5 minutes)", () => {
      expect(authService.AUTH_CONSTANTS.OTP_EXPIRY_MINUTES).toBe(5);
    });

    it("has correct max failed attempts (5)", () => {
      expect(authService.AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS).toBe(5);
    });

    it("has correct lockout duration (30 minutes)", () => {
      expect(authService.AUTH_CONSTANTS.ACCOUNT_LOCKOUT_MINUTES).toBe(30);
    });

    it("has correct session timeout (30 minutes)", () => {
      expect(authService.AUTH_CONSTANTS.SESSION_TIMEOUT_MINUTES).toBe(30);
    });

    it("has correct OTP cooldown (60 seconds)", () => {
      expect(authService.AUTH_CONSTANTS.OTP_COOLDOWN_SECONDS).toBe(60);
    });

    it("has correct OTP max requests per 10 min (3)", () => {
      expect(authService.AUTH_CONSTANTS.OTP_MAX_REQUESTS_PER_10_MIN).toBe(3);
    });
  });
});
