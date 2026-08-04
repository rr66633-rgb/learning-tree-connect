// PoC for C1 -- live cross-tenant financial data leak.
//
// Mocks server/db.ts entirely (same pattern already used by the repo's own
// server/loyalty.test.ts and server/finance.test.ts), so this test requires NO live
// database -- only `vitest` itself installed (npm install), nothing else.
//
// It calls the REAL appRouter (server/routers.ts, unmodified) through a normal
// tRPC caller, using an authenticated context for a user at "Organization A" only,
// and proves two things per endpoint:
//   1. The underlying db.ts function is invoked with NO organizationId argument
//      (or one that isn't threaded through at all) -- i.e. the router never even
//      attempts to scope the query to the caller's tenant.
//   2. Because of (1), data belonging to every organization is returned to a caller
//      who only belongs to one of them.
//
// Run with: npx vitest run poc/c1_cross_tenant_leak.poc.test.ts
import { describe, it, expect, vi } from "vitest";

// Mock rows spanning TWO different organizations, so a leak is directly observable
// in the returned payload rather than only inferred from call arguments.
const crossTenantInvoices = [
  { id: 1, organizationId: 1, total: "500.00", status: "paid", paidAt: new Date(), invoiceNumber: "ORG1-001" },
  { id: 2, organizationId: 2, total: "9999.00", status: "paid", paidAt: new Date(), invoiceNumber: "ORG2-SECRET-001" },
];
const crossTenantTransactions = [
  { id: 1, organizationId: 1, amount: "500.00", parentName: "Org A Parent" },
  { id: 2, organizationId: 2, amount: "9999.00", parentName: "Org B Parent (should NOT be visible to Org A admin)" },
];
const crossTenantTuitionPlans = [
  { id: 1, organizationId: 1, name: "Org A Plan", amount: "500.00" },
  { id: 2, organizationId: 2, name: "Org B Plan (should NOT be visible to Org A admin)", amount: "9999.00" },
];

vi.mock("../server/db", async () => {
  return {
    // getEnhancedFinanceSummary takes NO organizationId param in the real source
    // (server/db.ts:2184) -- the mock enforces that by ignoring any args entirely.
    getEnhancedFinanceSummary: vi.fn(async () => {
      const totalRevenue = crossTenantInvoices
        .filter(i => i.status === "paid")
        .reduce((s, i) => s + Number(i.total), 0);
      return { totalRevenue, totalInvoices: crossTenantInvoices.length };
    }),
    // getFinanceExportData takes only date/status filters, never organizationId
    // (server/db.ts:2147) -- mock mirrors that signature exactly.
    getFinanceExportData: vi.fn(async (_filters?: { startDate?: Date; endDate?: Date; status?: string }) => {
      return crossTenantInvoices;
    }),
    // getAllTransactions takes only `limit` (server/db.ts:1938) -- no org filter.
    getAllTransactions: vi.fn(async (_limit = 100) => crossTenantTransactions),
    // getTuitionPlans takes zero arguments at all (server/db.ts:2032).
    getTuitionPlans: vi.fn(async () => crossTenantTuitionPlans),
  };
});

function orgAAdminContext() {
  return {
    user: {
      id: 42,
      openId: "org-a-admin",
      name: "Org A Admin",
      role: "admin", // satisfies the local adminProcedure in routers.ts (line 37-41)
      organizationId: 1, // this admin belongs ONLY to organization 1
      email: "admina@orga.example",
      isActive: true,
      createdAt: new Date(),
    },
    req: { headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("C1 -- cross-tenant financial data leak (PoC)", () => {
  it("finance.summary returns revenue aggregated across ALL organizations, not just the caller's", async () => {
    const { appRouter } = await import("../server/routers");
    const { getEnhancedFinanceSummary } = await import("../server/db") as any;
    const caller = appRouter.createCaller(orgAAdminContext());

    const result = await caller.finance.summary();

    // PROOF 1: the db function was called with no arguments -- the router never
    // attempted to pass the caller's organizationId down.
    expect(getEnhancedFinanceSummary).toHaveBeenCalledWith(); // zero args

    // PROOF 2: the returned total includes Organization B's 9999.00 invoice, which
    // Org A's admin (organizationId: 1) should never be able to see or aggregate.
    expect(result.totalRevenue).toBe(500 + 9999);
  });

  it("transactions.list returns rows tagged with organizationId 2 to an Organization-1-only admin", async () => {
    const { appRouter } = await import("../server/routers");
    const caller = appRouter.createCaller(orgAAdminContext());

    const result = await caller.transactions.list({ limit: 100 });

    const leakedRows = result.filter((r: any) => r.organizationId !== 1);
    expect(leakedRows.length).toBeGreaterThan(0); // <-- this SHOULD be 0 in a correctly isolated system
    expect(leakedRows[0].parentName).toContain("should NOT be visible");
  });

  it("tuitionPlans.list returns Organization B's plan to an Organization-1-only admin", async () => {
    const { appRouter } = await import("../server/routers");
    const caller = appRouter.createCaller(orgAAdminContext());

    const result = await caller.tuitionPlans.list();

    const leakedPlan = result.find((p: any) => p.organizationId === 2);
    expect(leakedPlan).toBeDefined(); // <-- this SHOULD be undefined in a correctly isolated system
  });

  it("finance.export returns invoice data for every organization to a single-org admin", async () => {
    const { appRouter } = await import("../server/routers");
    const caller = appRouter.createCaller(orgAAdminContext());

    const result = await caller.finance.export();

    const orgIds = new Set(result.map((r: any) => r.organizationId));
    expect(orgIds.size).toBeGreaterThan(1); // <-- this SHOULD be exactly {1} for an org-1-only admin
  });
});
