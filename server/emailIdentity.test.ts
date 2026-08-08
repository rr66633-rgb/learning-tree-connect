import { describe, expect, it } from "vitest";
import { isDuplicateEmailError, normalizeEmail } from "./emailIdentity";

describe("unique user email identity", () => {
  it("normalizes case, whitespace, and invisible direction marks", () => {
    expect(normalizeEmail("  \u200fUser@Example.COM\u202c ")).toBe("user@example.com");
  });

  it("recognizes only the users email unique-index violation", () => {
    expect(isDuplicateEmailError({
      code: "ER_DUP_ENTRY",
      message: "Duplicate entry for key 'users.ux_users_email'",
    })).toBe(true);
    expect(isDuplicateEmailError({
      code: "ER_DUP_ENTRY",
      message: "Duplicate entry for key 'organizations.slug'",
    })).toBe(false);
  });
});
