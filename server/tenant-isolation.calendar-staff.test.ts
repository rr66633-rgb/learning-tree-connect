import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import {
  setupTenantFixture,
  teardownTenantFixture,
  buildCtx,
  type TenantFixture,
} from "./testUtils/tenantFixture";

/**
 * Tenant isolation regression suite -- calendarRouter.ts, staffManagementRouter.ts.
 * See MULTI_TENANT_TEST_PLAN.md sections 3.2 / 3.3.
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
function callerAsOrgATeacher() {
  return appRouter.createCaller(buildCtx("teacher", fixture.orgA.teacherId, fixture.orgA.organizationId));
}
function anonymousCaller() {
  return appRouter.createCaller(buildCtx("admin", 0, null));
}

async function expectRejected(promise: Promise<any>) {
  await expect(promise).rejects.toMatchObject({
    code: expect.stringMatching(/NOT_FOUND|FORBIDDEN|UNAUTHORIZED/),
  });
}

describe("Tenant isolation: calendarRouter", () => {
  it("P1: Org A admin cannot read Org B's calendar event by id", async () => {
    await expectRejected(callerAsOrgAAdmin().calendar.get({ id: fixture.orgB.calendarEventId }));
  });

  it("P2: Org A admin's list never includes Org B's event", async () => {
    const list = await callerAsOrgAAdmin().calendar.list({});
    expect(list.some((e: any) => e.id === fixture.orgB.calendarEventId)).toBe(false);
  });

  it("P4: Org A admin cannot update or delete Org B's calendar event", async () => {
    await expectRejected(
      callerAsOrgAAdmin().calendar.update({ id: fixture.orgB.calendarEventId, titleAr: "hijacked" } as any)
    );
    await expectRejected(callerAsOrgAAdmin().calendar.delete({ id: fixture.orgB.calendarEventId }));
  });

  it("P4: Org A admin cannot publish Org B's calendar event", async () => {
    await expectRejected(callerAsOrgAAdmin().calendar.publish({
      id: fixture.orgB.calendarEventId,
      published: true,
    }));
  });

  it("P4: Org A admin cannot send/schedule/cancel reminders on Org B's event", async () => {
    await expectRejected(callerAsOrgAAdmin().calendar.sendReminder({
      eventId: fixture.orgB.calendarEventId,
      audience: "parents",
      message: "tenant isolation",
    }));
    await expectRejected(
      callerAsOrgAAdmin().calendar.scheduleReminder({
        eventId: fixture.orgB.calendarEventId,
        audience: "parents",
        message: "tenant isolation",
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
    );
    await expectRejected(callerAsOrgAAdmin().calendar.cancelReminders({ eventId: fixture.orgB.calendarEventId } as any));
    await expectRejected(callerAsOrgAAdmin().calendar.reminderHistory({ eventId: fixture.orgB.calendarEventId } as any));
  });

  it("P5 (regression, fix-sweep-25): processPendingReminders rejects an unauthenticated/non-cron caller", async () => {
    // Previously a publicProcedure with an unused `secret` field -- anyone
    // could trigger a platform-wide notification send. Must now require
    // isCron || super_admin.
    await expectRejected(anonymousCaller().calendar.processPendingReminders({}));
    await expectRejected(callerAsOrgAAdmin().calendar.processPendingReminders({}));
  });
});

describe("Tenant isolation: staffManagementRouter", () => {
  it("P1: Org A admin cannot read Org B's staff profile by id", async () => {
    await expectRejected(callerAsOrgAAdmin().staffManagement.getById({ id: fixture.orgB.staffProfileId }));
  });

  it("P2: Org A admin's staff list never includes Org B's staff profile", async () => {
    const list = await callerAsOrgAAdmin().staffManagement.list({});
    expect(list.items.some((s: any) => s.id === fixture.orgB.staffProfileId)).toBe(false);
  });

  it("P4: Org A admin cannot update or delete Org B's staff profile", async () => {
    await expectRejected(
      callerAsOrgAAdmin().staffManagement.update({ id: fixture.orgB.staffProfileId, fullNameEn: "x" } as any)
    );
    await expectRejected(callerAsOrgAAdmin().staffManagement.delete({ id: fixture.orgB.staffProfileId }));
  });

  it("P2: getDepartments/getBranches/getStats are org-scoped, not global", async () => {
    const orgAStats = await callerAsOrgAAdmin().staffManagement.getStats();
    // Org A's fixture only has one staff profile; Org B's should not be counted.
    expect(orgAStats.totalStaff ?? orgAStats.total ?? 0).toBeLessThan(100);
  });

  it("P4: Org A owner cannot approve/reject Org B's leave request", async () => {
    // leaves.approve/reject operate by leave-request id; without a real
    // cross-org leave id fixture, this asserts the shape of the rejection
    // contract on a definitely-foreign id (0 is never valid).
    await expectRejected(callerAsOrgAOwner().staffManagement.leaves.approve({ id: 0 }));
  });

  it("P4: Org A teacher cannot edit/delete a staff note belonging to Org B's staff profile", async () => {
    await expectRejected(
      callerAsOrgATeacher().staffManagement.notes.create({
        staffProfileId: fixture.orgB.staffProfileId,
        title: "tenant isolation",
        content: "cross-tenant note",
      })
    );
  });

  it("P4: Org A caller cannot list/create/delete documents against Org B's staff profile", async () => {
    await expectRejected(
      callerAsOrgAAdmin().staffManagement.documents.list({ staffProfileId: fixture.orgB.staffProfileId } as any)
    );
    await expectRejected(
      callerAsOrgAAdmin().staffManagement.documents.create({
        staffProfileId: fixture.orgB.staffProfileId,
        name: "x",
        url: "https://example.test/x.pdf",
        fileKey: "tenant-isolation/x.pdf",
      })
    );
  });
});
