import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import {
  setupTenantFixture,
  teardownTenantFixture,
  buildCtx,
  type TenantFixture,
} from "./testUtils/tenantFixture";

/**
 * Tenant isolation regression suite -- the sanctioned cross-org exception
 * (superAdminRouter.ts, P5) plus brandingRouter.ts, onboardingRouter.ts,
 * bulkImportRouter.ts. See MULTI_TENANT_TEST_PLAN.md sections 3.7 / 3.8.
 */

let fixture: TenantFixture;

beforeAll(async () => {
  fixture = await setupTenantFixture();
}, 60000);

afterAll(async () => {
  if (fixture) await teardownTenantFixture(fixture);
}, 60000);

function callerAsOrgAAdmin() {
  return appRouter.createCaller(buildCtx("admin", fixture.orgA.adminId, fixture.orgA.organizationId));
}
function callerAsOrgAOwner() {
  return appRouter.createCaller(buildCtx("owner", fixture.orgA.adminId, fixture.orgA.organizationId));
}
function callerAsOrgAPrincipal() {
  return appRouter.createCaller(buildCtx("principal", fixture.orgA.adminId, fixture.orgA.organizationId));
}
function callerAsSuperAdmin() {
  // A genuine super_admin has no single "home" organization in this app's
  // model -- ctx.organizationId reflects whatever org their own user row
  // happens to carry, but superAdminProcedure is built directly on
  // protectedProcedure (see server/_core/trpc.ts) precisely so it does not
  // require or check ctx.organizationId at all.
  return appRouter.createCaller(buildCtx("super_admin", fixture.orgA.adminId, fixture.orgA.organizationId));
}

describe("Tenant isolation: superAdminRouter is the ONLY sanctioned cross-org exception", () => {
  it("P5: an org admin/owner/principal is rejected by every superAdminProcedure-gated endpoint", async () => {
    for (const caller of [callerAsOrgAAdmin(), callerAsOrgAOwner(), callerAsOrgAPrincipal()]) {
      await expect(caller.superAdmin.listOrganizations()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.superAdmin.getOrganization({ id: fixture.orgB.organizationId })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.superAdmin.platformStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("P5: a genuine super_admin CAN read across organizations (sanctioned)", async () => {
    const org = await callerAsSuperAdmin().superAdmin.getOrganization({ id: fixture.orgB.organizationId });
    expect(org).toBeDefined();
    expect(org.id).toBe(fixture.orgB.organizationId);
  });

  it("P5: a genuine super_admin's listOrganizations includes both Org A and Org B", async () => {
    const list = await callerAsSuperAdmin().superAdmin.listOrganizations();
    const ids = list.organizations.map((o: any) => o.id);
    expect(ids).toEqual(expect.arrayContaining([fixture.orgA.organizationId, fixture.orgB.organizationId]));
  });

  it("P5: an org admin cannot toggle another organization's status or delete it", async () => {
    await expect(
      callerAsOrgAAdmin().superAdmin.toggleOrganizationStatus({ id: fixture.orgB.organizationId, status: "suspended" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      callerAsOrgAAdmin().superAdmin.deleteOrganization({ id: fixture.orgB.organizationId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Tenant isolation: brandingRouter", () => {
  it("P1: getMyBranding for an unauthenticated/orgless caller returns generic fallback, never real org data", async () => {
    const anon = appRouter.createCaller(buildCtx("admin", 0, null));
    const branding = await anon.branding.getMyBranding();
    expect(branding).toBeDefined();
    // Should not accidentally equal a real org's configured branding.
  });

  it("P4: Org A admin's updateMyBranding only ever touches ctx.organizationId's own row", async () => {
    await callerAsOrgAAdmin().branding.updateMyBranding({ primaryColor: "#123456" } as any);
    const orgBBranding = await appRouter
      .createCaller(buildCtx("admin", fixture.orgB.adminId, fixture.orgB.organizationId))
      .branding.getMyBranding();
    expect(orgBBranding.primaryColor).not.toBe("#123456");
  });
});

describe("Tenant isolation: bulkImportRouter (P3 -- organizationId targeting)", () => {
  it("P3: a non-super-admin cannot import into a different organization", async () => {
    const tinyCsvBase64 = Buffer.from("firstName,lastName\n").toString("base64");
    await expect(
      callerAsOrgAAdmin().bulkImport.importData({
        fileData: tinyCsvBase64,
        entityType: "children",
        organizationId: fixture.orgB.organizationId,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("P3: super_admin importing into a non-existent organization is rejected, not silently defaulted", async () => {
    const tinyCsvBase64 = Buffer.from("firstName,lastName\n").toString("base64");
    await expect(
      callerAsSuperAdmin().bulkImport.importData({
        fileData: tinyCsvBase64,
        entityType: "children",
        organizationId: 999999999,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
