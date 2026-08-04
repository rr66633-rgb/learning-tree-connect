import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  // SECURITY FIX (C2): previously typed as a plain `number` and defaulted to `1`
  // whenever a user had no organizationId set (`user?.organizationId ?? 1`). That
  // meant any account missing an organization was silently treated as belonging to
  // organization #1 rather than being rejected -- a request-time echo of the same
  // "unassigned data quietly lands on org #1" pattern found in the schema (C3).
  // It is now `number | null` so a missing organization is representable and can be
  // rejected explicitly by `tenantProcedure` (see server/_core/trpc.ts) instead of
  // silently defaulted.
  organizationId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    organizationId: user?.organizationId ?? null,
  };
}
