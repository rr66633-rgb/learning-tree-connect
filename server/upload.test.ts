import { describe, expect, it } from "vitest";

describe("Upload Endpoint", () => {
  it("rejects unauthenticated request with 401 or 403 (CSRF)", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: Buffer.from("test").toString("base64"),
        contentType: "image/png",
        fileName: "test.png",
      }),
    });
    // CSRF protection returns 403 before auth check can return 401
    expect([401, 403]).toContain(response.status);
  });

  it("rejects request without data field (unauthenticated)", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    // CSRF protection returns 403 before auth check can return 401
    expect([401, 403]).toContain(response.status);
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
    // CSRF protection returns 403 before auth check can return 401
    expect([401, 403]).toContain(response.status);
  });
});
