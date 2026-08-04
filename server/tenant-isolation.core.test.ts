import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";
import {
  setupTenantFixture,
  teardownTenantFixture,
  buildCtx,
  type TenantFixture,
} from "./testUtils/tenantFixture";

/**
 * Tenant isolation regression suite -- routers.ts core sub-routers.
 * See MULTI_TENANT_TEST_PLAN.md section 3.1 for the full test matrix this
 * file implements. Requires a live database (DATABASE_URL) -- see plan
 * section 6 for why this has not been executed in this engagement's sandbox.
 */

let fixture: TenantFixture;

beforeAll(async () => {
  fixture = await setupTenantFixture();
}, 60000);

afterAll(async () => {
  if (fixture) await teardownTenantFixture(fixture);
}, 60000);

function callerAsOrgAAdmin() {
  const { orgA } = fixture;
  return appRouter.createCaller(buildCtx("admin", orgA.adminId, orgA.organizationId));
}
function callerAsOrgATeacher() {
  const { orgA } = fixture;
  return appRouter.createCaller(buildCtx("teacher", orgA.teacherId, orgA.organizationId));
}
function callerAsOrgAParent() {
  const { orgA } = fixture;
  return appRouter.createCaller(buildCtx("parent", orgA.parentId, orgA.organizationId));
}
function callerAsOrgBAdmin() {
  const { orgB } = fixture;
  return appRouter.createCaller(buildCtx("admin", orgB.adminId, orgB.organizationId));
}

async function expectNotFound(promise: Promise<any>) {
  await expect(promise).rejects.toMatchObject({
    code: expect.stringMatching(/NOT_FOUND|FORBIDDEN/),
  });
}

describe("Tenant isolation: children (P1 read-by-id, P3 create, P4 update/delete)", () => {
  it("P1: Org A admin cannot read Org B's child by id", async () => {
    await expectNotFound(callerAsOrgAAdmin().children.getById({ id: fixture.orgB.childId }));
  });

  it("P2: Org A admin's children.list never includes Org B's child", async () => {
    const list = await callerAsOrgAAdmin().children.list();
    expect(list.some((c: any) => c.id === fixture.orgB.childId)).toBe(false);
  });

  it("P4: Org A admin cannot update Org B's child", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().children.update({ id: fixture.orgB.childId, firstName: "Hijacked" } as any)
    );
  });

  it("P4: Org A admin cannot delete Org B's child", async () => {
    await expectNotFound(callerAsOrgAAdmin().children.delete({ id: fixture.orgB.childId }));
  });

  it("P4: Org A admin cannot archive/activate Org B's child", async () => {
    await expectNotFound(callerAsOrgAAdmin().children.archive({ id: fixture.orgB.childId }));
    await expectNotFound(callerAsOrgAAdmin().children.activate({ id: fixture.orgB.childId }));
  });

  it("P1: Org A admin cannot list Org B's child's parents", async () => {
    await expectNotFound(callerAsOrgAAdmin().children.getParents({ childId: fixture.orgB.childId }));
  });

  it("P4: Org A parent cannot update Org B's child via parentUpdate", async () => {
    await expectNotFound(
      callerAsOrgAParent().children.parentUpdate({ id: fixture.orgB.childId, notes: "x" } as any)
    );
  });
});

describe("Tenant isolation: staffAttendance (P3 create, P4 checkout by id -- fix-sweep-25)", () => {
  it("P4: any authenticated user cannot check out another org's attendance record by id", async () => {
    // regression test for the fix-sweep-25 finding: checkOut previously took
    // a bare id with zero ownership check.
    await expectNotFound(
      callerAsOrgAAdmin().staffAttendance.checkOut({
        id: fixture.orgB.staffAttendanceId,
        gpsLat: 24.7,
        gpsLng: 46.7,
      })
    );
  });

  it("P4: an org admin cannot adminCheckOut another org's attendance record", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().staffAttendance.adminCheckOut({ id: fixture.orgB.staffAttendanceId })
    );
  });

  it("P2: allToday only returns the caller's own organization's records", async () => {
    const rows = await callerAsOrgAAdmin().staffAttendance.allToday();
    expect(rows.some((r: any) => r.id === fixture.orgB.staffAttendanceId)).toBe(false);
  });

  it("P2: userHistory for an Org B userId returns nothing to an Org A admin", async () => {
    const rows = await callerAsOrgAAdmin().staffAttendance.userHistory({ userId: fixture.orgB.teacherId });
    expect(rows.length).toBe(0);
  });
});

describe("Tenant isolation: tuitionPlans (P3 create -- fix-sweep-25)", () => {
  it("P3: Org A admin cannot create a tuition plan attached to Org B's child/parent", async () => {
    // regression test for the fix-sweep-25 finding: create previously
    // trusted childId/parentId with no organization check.
    await expectNotFound(
      callerAsOrgAAdmin().tuitionPlans.create({
        childId: fixture.orgB.childId,
        parentId: fixture.orgB.parentId,
        name: "Cross-tenant plan",
        amount: "999.00",
        frequency: "monthly",
        startDate: new Date().toISOString(),
      })
    );
  });

  it("P4: Org A admin cannot update Org B's tuition plan", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().tuitionPlans.update({ id: fixture.orgB.tuitionPlanId, amount: "1.00" })
    );
  });

  it("P2: tuitionPlans.list never includes Org B's plan", async () => {
    const list = await callerAsOrgAAdmin().tuitionPlans.list();
    expect(list.some((p: any) => p.id === fixture.orgB.tuitionPlanId)).toBe(false);
  });
});

describe("Tenant isolation: finance / payments / transactions / refunds", () => {
  it("P1: Org A admin cannot read Org B's invoice by id", async () => {
    await expectNotFound(callerAsOrgAAdmin().finance.getById({ id: fixture.orgB.invoiceId }));
  });

  it("P4: Org A admin cannot mark Org B's invoice paid", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().finance.markPaid({ id: fixture.orgB.invoiceId, paymentMethod: "cash" })
    );
  });

  it("P4: Org A admin cannot delete Org B's invoice", async () => {
    await expectNotFound(callerAsOrgAAdmin().finance.deleteInvoice({ id: fixture.orgB.invoiceId }));
  });

  it("P2: finance.invoices never includes Org B's invoice", async () => {
    const list = await callerAsOrgAAdmin().finance.invoices({});
    expect(list.some((i: any) => i.id === fixture.orgB.invoiceId)).toBe(false);
  });

  it("P2: transactions.list (admin, org-scoped) never includes Org B's transaction", async () => {
    const list = await callerAsOrgAAdmin().transactions.list({});
    expect(list.some((t: any) => t.id === fixture.orgB.transactionId)).toBe(false);
  });

  it("P2: refunds.list never includes Org B's refund", async () => {
    const list = await callerAsOrgAAdmin().refunds.list({});
    expect(list.some((r: any) => r.id === fixture.orgB.refundId)).toBe(false);
  });

  it("P4: a parent cannot verify/claim another organization's payment by id", async () => {
    await expectNotFound(callerAsOrgAParent().payments.verify({ paymentId: fixture.orgB.paymentId }));
  });
});

describe("Tenant isolation: medicalInfo / emergencyContacts / enrollment / childDocuments", () => {
  it("P1: Org A teacher cannot read Org B's child's medical info", async () => {
    const result = await callerAsOrgATeacher().medicalInfo.get({ childId: fixture.orgB.childId }).catch((e) => e);
    // upsert-only table with no dedicated NOT_FOUND-on-miss contract for
    // `get` in some code paths -- accept either explicit rejection or a
    // response that contains no Org B data.
    if (result instanceof TRPCError || result?.code) {
      expect(String(result.code)).toMatch(/NOT_FOUND|FORBIDDEN/);
    } else {
      expect(result).toBeFalsy();
    }
  });

  it("P3: Org A teacher cannot upsert medical info for Org B's child", async () => {
    await expectNotFound(
      callerAsOrgATeacher().medicalInfo.upsert({ childId: fixture.orgB.childId, bloodType: "O+" })
    );
  });

  it("P4: Org A caller cannot delete Org B's emergency contact", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().emergencyContacts.delete({ id: fixture.orgB.emergencyContactId })
    );
  });

  it("P3: Org A caller cannot create an emergency contact for Org B's child", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().emergencyContacts.create({
        childId: fixture.orgB.childId,
        name: "Intruder",
        phone: "0500000001",
        relationship: "other",
      } as any)
    );
  });

  it("P4: Org A admin cannot update Org B's enrollment record", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().enrollment.update({ id: fixture.orgB.enrollmentId, status: "withdrawn" })
    );
  });

  it("P3: Org A admin cannot create an enrollment record for Org B's child", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().enrollment.create({
        childId: fixture.orgB.childId,
        startDate: new Date().toISOString(),
      })
    );
  });

  it("P4: Org A teacher cannot approve/reject Org B's child document", async () => {
    await expectNotFound(callerAsOrgATeacher().childDocuments.approve({ id: fixture.orgB.childDocumentId }));
    await expectNotFound(callerAsOrgATeacher().childDocuments.reject({ id: fixture.orgB.childDocumentId }));
  });

  it("P4: Org A caller cannot delete Org B's child document", async () => {
    await expectNotFound(callerAsOrgAAdmin().childDocuments.delete({ id: fixture.orgB.childDocumentId }));
  });
});

describe("Tenant isolation: users admin sub-router", () => {
  it("P1: Org A admin cannot read Org B's user by id", async () => {
    await expectNotFound(callerAsOrgAAdmin().users.getById({ id: fixture.orgB.teacherId }));
  });

  it("P4: Org A admin cannot update Org B's user", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().users.update({ id: fixture.orgB.teacherId, name: "Hijacked" } as any)
    );
  });

  it("P4: Org A admin cannot delete/deactivate Org B's user", async () => {
    await expectNotFound(callerAsOrgAAdmin().users.delete({ id: fixture.orgB.teacherId }));
    await expectNotFound(callerAsOrgAAdmin().users.deactivate({ id: fixture.orgB.teacherId }));
  });

  it("P4: Org A admin cannot link/unlink Org B's child to any parent", async () => {
    await expectNotFound(
      callerAsOrgAAdmin().users.linkChild({ parentId: fixture.orgA.parentId, childId: fixture.orgB.childId })
    );
  });

  it("P2: Org A admin's users.list never includes Org B's users", async () => {
    const list = await callerAsOrgAAdmin().users.list({});
    expect(list.some((u: any) => u.id === fixture.orgB.teacherId)).toBe(false);
  });
});

describe("Tenant isolation: classes / centerSettings", () => {
  it("P1: Org A admin cannot read Org B's class by id", async () => {
    await expectNotFound(callerAsOrgAAdmin().classes.getById({ id: fixture.orgB.classId }));
  });

  it("P4: Org A admin cannot update/delete Org B's class", async () => {
    await expectNotFound(callerAsOrgAAdmin().classes.update({ id: fixture.orgB.classId, name: "x" } as any));
    await expectNotFound(callerAsOrgAAdmin().classes.delete({ id: fixture.orgB.classId }));
  });

  it("P1/P4: centerSettings is per-organization, not a shared global row", async () => {
    await callerAsOrgAAdmin().centerSettings.update({ centerName: "Org A Center" } as any);
    const orgBSettings = await callerAsOrgBAdmin().centerSettings.get();
    expect(orgBSettings?.centerName).not.toBe("Org A Center");
  });
});

describe("Sanity: fixture itself is org-isolated", () => {
  it("Org A and Org B fixtures use distinct organizationIds", () => {
    expect(fixture.orgA.organizationId).not.toBe(fixture.orgB.organizationId);
  });

  it("Org B admin CAN read Org B's own child (positive control)", async () => {
    const child = await callerAsOrgBAdmin().children.getById({ id: fixture.orgB.childId });
    expect(child).toBeDefined();
    expect(child.id).toBe(fixture.orgB.childId);
  });
});
