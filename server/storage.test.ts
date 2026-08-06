import { describe, expect, it } from "vitest";
import {
  MEDIA_UPLOAD_LIMITS,
  getStorageKey,
  getStorageUrl,
  validateMediaUpload,
} from "./storage";

describe("direct R2 media upload validation", () => {
  it("accepts supported media with a matching category", () => {
    expect(validateMediaUpload("photo", "image/webp", 1024)).toMatchObject({
      contentType: "image/webp",
      extension: "webp",
    });
    expect(validateMediaUpload("video", "video/mp4", 1024)).toMatchObject({
      contentType: "video/mp4",
      extension: "mp4",
    });
  });

  it("rejects mismatched types and oversized files", () => {
    expect(() => validateMediaUpload("photo", "video/mp4", 1024)).toThrow("UNSUPPORTED_MEDIA_TYPE");
    expect(() => validateMediaUpload("video", "application/pdf", 1024)).toThrow("UNSUPPORTED_MEDIA_TYPE");
    expect(() => validateMediaUpload("photo", "image/jpeg", MEDIA_UPLOAD_LIMITS.photo + 1)).toThrow("INVALID_MEDIA_SIZE");
    expect(() => validateMediaUpload("video", "video/webm", MEDIA_UPLOAD_LIMITS.video + 1)).toThrow("INVALID_MEDIA_SIZE");
  });

  it("keeps canonical storage URLs separate from direct signed URLs", () => {
    const key = "media/42/photos/2026-08/example.jpg";
    const url = getStorageUrl(key);
    expect(url).toBe(`/manus-storage/${key}`);
    expect(getStorageKey(url)).toBe(key);
    expect(getStorageKey(`https://naashah.com${url}`)).toBe(key);
    expect(getStorageKey("https://example.com/file.jpg")).toBeNull();
  });
});
