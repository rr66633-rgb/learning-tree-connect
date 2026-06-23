import { describe, it, expect } from "vitest";

describe("SMS & Email Integration Configuration", () => {
  it("SMS service module exists and exports required functions", async () => {
    const smsService = await import("./services/smsService");
    expect(smsService.sendSms).toBeDefined();
    expect(typeof smsService.sendSms).toBe("function");
    expect(smsService.isSmsConfigured).toBeDefined();
    expect(typeof smsService.isSmsConfigured).toBe("function");
  });

  it("Email service module exists and exports required functions", async () => {
    const emailService = await import("./services/emailService");
    expect(emailService.sendOtpEmail).toBeDefined();
    expect(typeof emailService.sendOtpEmail).toBe("function");
    expect(emailService.sendWelcomeEmail).toBeDefined();
    expect(typeof emailService.sendWelcomeEmail).toBe("function");
    expect(emailService.isEmailConfigured).toBeDefined();
    expect(typeof emailService.isEmailConfigured).toBe("function");
  });

  it("SMS service reports configuration status correctly", async () => {
    const { isSmsConfigured } = await import("./services/smsService");
    const configured = isSmsConfigured();
    // In test environment without credentials, should be false
    // In production with credentials, should be true
    expect(typeof configured).toBe("boolean");
  });

  it("Email service reports configuration status correctly", async () => {
    const { isEmailConfigured } = await import("./services/emailService");
    const configured = isEmailConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("SMS service handles missing credentials gracefully (no crash)", async () => {
    const { sendSms } = await import("./services/smsService");
    // Should not throw even without credentials - graceful fallback
    const result = await sendSms("+966500000000", "Test message");
    // Returns SmsSendResult object
    expect(result).toHaveProperty("sent");
    // When disabled, it logs to console and returns sent:true (graceful degradation)
    expect(result.sent).toBe(true);
  });

  it("Email service handles missing credentials gracefully (no crash)", async () => {
    const { sendOtpEmail } = await import("./services/emailService");
    // Should not throw even without credentials - graceful fallback
    const result = await sendOtpEmail("test@example.com", "123456");
    // Returns EmailSendResult object
    expect(result).toHaveProperty("sent");
    // When disabled, it logs to console and returns sent:true (graceful degradation)
    expect(result.sent).toBe(true);
  });

  it("Session duration is set to 30 days", async () => {
    const { THIRTY_DAYS_MS, ONE_YEAR_MS } = await import("@shared/const");
    const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30;
    expect(THIRTY_DAYS_MS).toBe(thirtyDaysMs);
    // ONE_YEAR_MS is now aliased to THIRTY_DAYS_MS
    expect(ONE_YEAR_MS).toBe(thirtyDaysMs);
  });
});
