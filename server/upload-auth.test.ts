import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";

describe("Upload Endpoint - Authenticated", () => {
  // Use the actual owner's openId from the database
  const OWNER_OPEN_ID = "SGXEH7dwGiyEYwA2NMZW2A";

  it("authenticated user can upload a valid image", async () => {
    const token = await sdk.createSessionToken(OWNER_OPEN_ID, { name: "Admin" });

    // Create a minimal 1x1 PNG image
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `app_session_id=${token}`,
      },
      body: JSON.stringify({
        data: pngBase64,
        contentType: "image/png",
        fileName: "test-auth-image.png",
      }),
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.url).toBeDefined();
    expect(json.url).toContain("/manus-storage/");
  });

  it("authenticated user cannot upload unsupported file type", async () => {
    const token = await sdk.createSessionToken(OWNER_OPEN_ID, { name: "Admin" });

    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `app_session_id=${token}`,
      },
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

  it("authenticated user cannot upload without data field", async () => {
    const token = await sdk.createSessionToken(OWNER_OPEN_ID, { name: "Admin" });

    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `app_session_id=${token}`,
      },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Missing data field");
  });
});
