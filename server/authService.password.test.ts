import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import {
  findPasswordMatches,
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "./_core/authService";

describe("password compatibility", () => {
  it("verifies current PBKDF2 hashes", async () => {
    const hash = await hashPassword("CurrentPass123!");
    await expect(verifyPassword("CurrentPass123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
    expect(needsPasswordRehash(hash)).toBe(false);
  });

  it("verifies legacy bcrypt hashes and marks them for upgrade", async () => {
    const hash = await bcrypt.hash("LegacyPass123!", 4);
    await expect(verifyPassword("LegacyPass123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
    expect(needsPasswordRehash(hash)).toBe(true);
  });

  it("matches the correct account when an identifier is shared", async () => {
    const firstHash = await hashPassword("first-password");
    const secondHash = await hashPassword("second-password");
    const candidates = [
      { id: 1, password: firstHash },
      { id: 2, password: secondHash },
      { id: 3, password: null },
    ];

    const matches = await findPasswordMatches("second-password", candidates);
    expect(matches.map(candidate => candidate.id)).toEqual([2]);
  });

  it("keeps all matching accounts for explicit tenant selection", async () => {
    const sharedHash = await hashPassword("shared-password");
    const candidates = [
      { id: 1, password: sharedHash },
      { id: 2, password: sharedHash },
    ];

    const matches = await findPasswordMatches("shared-password", candidates);
    expect(matches.map(candidate => candidate.id)).toEqual([1, 2]);
  });

  it("rejects malformed stored hashes", async () => {
    await expect(verifyPassword("anything", "plain-text-password")).resolves.toBe(false);
    await expect(verifyPassword("anything", "bad:hash")).resolves.toBe(false);
  });
});
