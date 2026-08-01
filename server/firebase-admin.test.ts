import { describe, it, expect } from "vitest";
import { cert, initializeApp, getApps, deleteApp } from "firebase-admin/app";

describe("Firebase Admin SDK", () => {
  it("should have FIREBASE_PRIVATE_KEY environment variable set", () => {
    const key = process.env.FIREBASE_PRIVATE_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(100);
    expect(key).toContain("PRIVATE KEY");
  });

  it("should initialize Firebase Admin without errors", () => {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    
    // Clean up any existing apps first
    const existingApps = getApps();
    if (existingApps.length > 0) {
      // Already initialized, just verify
      expect(existingApps.length).toBeGreaterThan(0);
      return;
    }
    
    const app = initializeApp({
      credential: cert({
        projectId: "naashah-8d07e",
        clientEmail: "firebase-adminsdk-fbsvc@naashah-8d07e.iam.gserviceaccount.com",
        privateKey,
      }),
    }, "test-app");
    
    expect(getApps().length).toBeGreaterThan(0);
    
    // Cleanup
    deleteApp(app);
  });
});
