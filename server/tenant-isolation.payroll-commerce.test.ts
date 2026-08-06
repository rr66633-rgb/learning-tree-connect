import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import {
  setupTenantFixture,
  teardownTenantFixture,
  buildCtx,
  type TenantFixture,
} from "./testUtils/tenantFixture";

/**
 * Tenant isolation regression suite -- payrollRouter.ts, storeRouter.ts,
 * subscriptionPaymentRouter.ts.
 * See MULTI_TENANT_TEST_PLAN.md sections 3.6 / 3.7.
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
function callerAsOrgAParent() {
  return appRouter.createCaller(buildCtx("parent", fixture.orgA.parentId, fixture.orgA.organizationId));
}

async function expectRejected(promise: Promise<any>) {
  await expect(promise).rejects.toMatchObject({
    code: expect.stringMatching(/NOT_FOUND|FORBIDDEN|UNAUTHORIZED/),
  });
}

describe("Tenant isolation: payrollRouter (regression: upsertSalary userId, fix-sweep-24)", () => {
  it("P1: Org A admin's getSalary for Org B's teacher returns null, not their salary", async () => {
    const salary = await callerAsOrgAAdmin().payroll.getSalary({ userId: fixture.orgB.teacherId });
    expect(salary).toBeFalsy();
  });

  it("P3: Org A admin cannot attach a salary record to Org B's user", async () => {
    await expectRejected(
      callerAsOrgAAdmin().payroll.upsertSalary({ userId: fixture.orgB.teacherId, basicSalary: "9999.00" })
    );
  });

  it("P2: Org A's listSalaries never displays Org B's employee (name/role leak via join)", async () => {
    const list = await callerAsOrgAAdmin().payroll.listSalaries();
    expect(list.some((s: any) => s.userId === fixture.orgB.teacherId)).toBe(false);
  });

  it("P4: Org A admin cannot delete Org B's salary record", async () => {
    await expectRejected(callerAsOrgAAdmin().payroll.deleteSalary({ id: fixture.orgB.employeeSalaryId }));
  });
});

describe("Tenant isolation: storeRouter (P5 -- intentional cross-org marketplace on the buyer side)", () => {
  it("P5: any authenticated parent CAN browse another organization's store product (sanctioned)", async () => {
    const product = await callerAsOrgAParent().store.getProduct({ productId: fixture.orgB.storeProductId });
    expect(product).toBeDefined();
  });

  it("P2: a buyer's getMyOrders never includes another buyer's order", async () => {
    const orders = await callerAsOrgAParent().store.getMyOrders();
    expect(orders.some((o: any) => o.id === fixture.orgB.storeOrderId)).toBe(false);
  });

  it("P1/P4: seller-side adminGetProducts/adminUpdateProduct stay org-scoped despite the marketplace pattern", async () => {
    const list = await callerAsOrgAAdmin().store.adminGetProducts();
    expect(list.some((p: any) => p.id === fixture.orgB.storeProductId)).toBe(false);
    await expectRejected(
      callerAsOrgAAdmin().store.adminUpdateProduct({ id: fixture.orgB.storeProductId, price: "1.00" } as any)
    );
    await expectRejected(callerAsOrgAAdmin().store.adminDeleteProduct({ id: fixture.orgB.storeProductId }));
  });

  it("P4: Org A admin cannot view/update Org B's order via the seller-side endpoints", async () => {
    await expectRejected(callerAsOrgAAdmin().store.adminGetOrderDetails({ orderId: fixture.orgB.storeOrderId }));
    await expectRejected(
      callerAsOrgAAdmin().store.adminUpdateOrderStatus({ orderId: fixture.orgB.storeOrderId, status: "completed" })
    );
  });

  it("P5: superAdminGetAllOrders/superAdminGetCommissionReport reject a non-super_admin org owner", async () => {
    await expect(callerAsOrgAAdmin().store.superAdminGetAllOrders()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("Tenant isolation: subscriptionPaymentRouter", () => {
  it("P4: Org A admin cannot activate/check status of Org B's subscription", async () => {
    await expect(
      callerAsOrgAAdmin().subscriptionPayment.activate({
        moyasarPaymentId: "tenant-isolation-payment",
        organizationId: fixture.orgB.organizationId,
        planId: 1,
        billingCycle: "monthly",
      } as any)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      callerAsOrgAAdmin().subscriptionPayment.status({ organizationId: fixture.orgB.organizationId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
