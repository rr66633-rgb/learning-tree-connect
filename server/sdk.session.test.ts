import { afterEach, describe, expect, it, vi } from "vitest";

const originalSecret = process.env.JWT_SECRET;
const originalAppId = process.env.VITE_APP_ID;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  if (originalAppId === undefined) delete process.env.VITE_APP_ID;
  else process.env.VITE_APP_ID = originalAppId;
  vi.resetModules();
});

describe("independent signed sessions", () => {
  it("accepts an empty legacy app id and display name", async () => {
    process.env.JWT_SECRET = "session-test-secret-at-least-32-characters";
    process.env.VITE_APP_ID = "";
    vi.resetModules();
    const { sdk } = await import("./_core/sdk");

    const token = await sdk.createSessionToken("local-user-id", { name: "" });
    await expect(sdk.verifySession(token)).resolves.toEqual({
      openId: "local-user-id",
      appId: "",
      name: "",
    });
  });
});
