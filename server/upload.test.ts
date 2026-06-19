import { describe, expect, it } from "vitest";

describe("Upload Endpoint", () => {
  it("rejects unauthenticated request with 401", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: Buffer.from("test").toString("base64"),
        contentType: "image/png",
        fileName: "test.png",
      }),
    });
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeTruthy();
  });

  it("rejects request without data field (unauthenticated)", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    // Should get 401 before even checking data field
    expect(response.status).toBe(401);
  });

  it("rejects unsupported file types (unauthenticated)", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: Buffer.from("test").toString("base64"),
        contentType: "application/pdf",
        fileName: "test.pdf",
      }),
    });
    // Should get 401 before even checking content type
    expect(response.status).toBe(401);
  });
});
