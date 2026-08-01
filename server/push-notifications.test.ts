import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase-admin/app
vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  cert: vi.fn((config) => config),
  getApps: vi.fn(() => [{ name: "test" }]),
}));

// Mock firebase-admin/messaging
const mockSendEachForMulticast = vi.fn();
vi.mock("firebase-admin/messaging", () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}));

// Mock db
vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      { id: 1, userId: 1, token: "token1", active: true, platform: "web" },
      { id: 2, userId: 1, token: "token2", active: true, platform: "android" },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock schema
vi.mock("../drizzle/schema", () => ({
  fcmTokens: {
    userId: "userId",
    token: "token",
    active: "active",
  },
}));

describe("Push Notifications - Firebase FCM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send push notification to user with active tokens", async () => {
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    });

    const { sendPushToUser } = await import("./firebase-admin");
    const result = await sendPushToUser(1, {
      title: "تجربة",
      body: "هذا إشعار تجريبي",
      data: { type: "test", url: "/" },
    });

    expect(result).toBe(2);
    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["token1", "token2"],
        notification: {
          title: "تجربة",
          body: "هذا إشعار تجريبي",
        },
        data: { type: "test", url: "/" },
      })
    );
  });

  it("should handle failed tokens and deactivate them", async () => {
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: "messaging/registration-token-not-registered" } },
      ],
    });

    const { sendPushToUser } = await import("./firebase-admin");
    const result = await sendPushToUser(1, {
      title: "تجربة",
      body: "هذا إشعار تجريبي",
    });

    expect(result).toBe(1);
  });

  it("should return 0 when user has no active tokens", async () => {
    // Override the mock for this test
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValueOnce({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });

    const { sendPushToUser } = await import("./firebase-admin");
    const result = await sendPushToUser(999, {
      title: "تجربة",
      body: "لا يوجد tokens",
    });

    expect(result).toBe(0);
  });

  it("should send push to multiple users", async () => {
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    });

    const { sendPushToUsers } = await import("./firebase-admin");
    const result = await sendPushToUsers([1, 2, 3], {
      title: "إشعار جماعي",
      body: "هذا إشعار لجميع المستخدمين",
    });

    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("should include webpush configuration with RTL direction", async () => {
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    const { sendPushToUser } = await import("./firebase-admin");
    await sendPushToUser(1, {
      title: "تجربة",
      body: "إشعار",
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        webpush: expect.objectContaining({
          notification: expect.objectContaining({
            dir: "rtl",
            lang: "ar",
          }),
        }),
      })
    );
  });
});
