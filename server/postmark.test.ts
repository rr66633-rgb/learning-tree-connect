import { describe, it, expect } from "vitest";

describe("Postmark Email Configuration", () => {
  it("should have POSTMARK_API_TOKEN configured", () => {
    const token = process.env.POSTMARK_API_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
  });

  it("should have EMAIL_FROM configured", () => {
    const from = process.env.EMAIL_FROM;
    expect(from).toBeDefined();
    expect(from).toContain("@naashah.com");
  });

  it("should validate Postmark API token format (UUID)", () => {
    const token = process.env.POSTMARK_API_TOKEN;
    // Postmark tokens are UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(token).toMatch(uuidRegex);
  });

  it("should be able to connect to Postmark API", async () => {
    const token = process.env.POSTMARK_API_TOKEN;
    if (!token) return;
    
    const response = await fetch("https://api.postmarkapp.com/server", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Postmark-Server-Token": token,
      },
    });
    
    // 200 = valid token, 401 = invalid token
    expect(response.status).toBe(200);
  });
});
