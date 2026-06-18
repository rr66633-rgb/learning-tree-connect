import { describe, expect, it } from "vitest";

describe("Upload Endpoint", () => {
  it("rejects request without data field", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Missing data field");
  });

  it("rejects unsupported file types", async () => {
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: Buffer.from("test").toString("base64"),
        contentType: "application/pdf",
        fileName: "test.pdf",
      }),
    });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("نوع الملف غير مدعوم");
  });

  it("uploads a valid image successfully", async () => {
    // Create a minimal 1x1 PNG image
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: pngBase64,
        contentType: "image/png",
        fileName: "test-image.png",
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.url).toBeDefined();
    expect(json.url).toContain("/manus-storage/");
  });
});
