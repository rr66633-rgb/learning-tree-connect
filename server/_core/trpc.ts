import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { EMAIL_ALREADY_USED_MESSAGE, isDuplicateEmailError } from "../emailIdentity";

// ---------------------------------------------------------------------------
// SECURITY FIX: stop internal detail reaching the browser.
//
// Two leaks, both on EVERY tRPC error, on every page of the app:
//
//  1. `data.stack` was sent to the client in full -- including absolute server
//     paths (/Users/.../server/_core/trpc.ts), the dependency tree and exact
//     library versions. That is a map of the server handed to any visitor.
//
//  2. `message` was whatever was thrown. Anything raised by a third-party
//     client came through verbatim, e.g.
//       "LLM invoke failed: 401 Unauthorized - Incorrect API key provided:
//        sk-proj-****DlgA. You can find your API key at
//        https://platform.openai.com/account/api-keys"
//     which names the AI provider, part of the key and the vendor's console
//     URL -- shown to a nursery teacher inside the app.
//
// Fixing it at each call site was the wrong approach (I tried that first and it
// only covered the weekly plan). This formatter is the single place every tRPC
// error passes through, so it holds for all ~30 routers and anything added
// later. Full detail is still logged server-side.
// ---------------------------------------------------------------------------

// Anything that names infrastructure, a vendor, a credential or a file path.
const LEAK_PATTERNS = [
  /openai|anthropic|cloudflare|r2\.|amazonaws|s3[-_. ]|forge\.manus|platform\.openai/i,
  /api[ _-]?key|secret|token|bearer|authorization|sk-[A-Za-z0-9_-]{8,}|cfat_/i,
  /\/Users\/|\/home\/|node_modules|\.ts:\d+|\.js:\d+|at\s+\w+\s+\(/,
  /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed/i,
  /mysql|sql syntax|ER_[A-Z_]+|drizzle|column .* doesn't exist|unknown column/i,
  /LLM invoke failed|SignatureDoesNotMatch|AccessDenied|NoSuchKey/i,
  /\b\d{1,3}(\.\d{1,3}){3}\b|localhost:\d+|https?:\/\//i,
];

const GENERIC_MESSAGE = "تعذّر إتمام العملية، يرجى المحاولة مرة أخرى";

function looksLikeInternalDetail(message: string): boolean {
  return LEAK_PATTERNS.some(re => re.test(message));
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const { stack, ...safeData } = shape.data as Record<string, unknown>;

    // A deliberate, curated message is thrown as a TRPCError with no wrapped
    // cause. An unexpected failure arrives wrapped, with the original error in
    // `cause` -- that one is never safe to show.
    const wrappedUnexpected =
      error.code === "INTERNAL_SERVER_ERROR" && error.cause !== undefined;

    const duplicateEmail = isDuplicateEmailError(error);
    const message = duplicateEmail
      ? EMAIL_ALREADY_USED_MESSAGE
      : wrappedUnexpected || looksLikeInternalDetail(shape.message)
        ? GENERIC_MESSAGE
        : shape.message;

    if (duplicateEmail) {
      // Do not echo the conflicting address from the database driver into
      // application logs; the index name is enough to diagnose this case.
      console.warn(`[tRPC] ${(safeData as any).path ?? "unknown"} -> duplicate user email blocked`);
    } else if (message !== shape.message) {
      // Keep the real reason where it belongs: the server log.
      console.error(
        `[tRPC] ${(safeData as any).path ?? "unknown"} -> ${error.code}:`,
        error.cause ?? shape.message,
      );
    }

    return { ...shape, message, data: safeData };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// SECURITY FIX (C2): root-cause fix for the missing tenant-isolation enforcement
// that made the C1 cross-tenant data leak possible (and can reproduce the same
// leak class anywhere a query helper is called with an organizationId that ends up
// null/undefined -- see server/_core/context.ts, which used to silently default a
// missing organizationId to 1 rather than rejecting the request).
//
// This does NOT retroactively scope every existing query in the codebase -- it is
// a building block. Any procedure built on `tenantProcedure` is guaranteed that
// `ctx.organizationId` is a real, positive integer by the time its handler runs, or
// the request is rejected before the handler ever executes. Existing per-router
// procedures (e.g. the local `adminProcedure`/`teacherProcedure`/`parentProcedure`
// in server/routers.ts) should be migrated to build on this instead of directly on
// `protectedProcedure` so their handlers can rely on `ctx.organizationId` being
// trustworthy. superAdminRouter.ts's separate `superAdminProcedure` intentionally
// stays on `protectedProcedure` directly, since super-admin operations are meant to
// be cross-organization by design.
//
// KNOWN REMAINING SCOPE: as of this commit, only server/routers.ts has been
// migrated to use this (see that file for details). The other sub-routers
// (calendarRouter.ts, staffManagementRouter.ts, assessmentRouter.ts, and ~19 more)
// each define their own local role-check procedures independently and have NOT
// been migrated yet -- that is necessary follow-up work, not something this commit
// claims to have completed everywhere.
export const tenantProcedure = protectedProcedure.use(async opts => {
  const { ctx, next } = opts;

  if (
    ctx.organizationId === null ||
    ctx.organizationId === undefined ||
    !Number.isInteger(ctx.organizationId) ||
    ctx.organizationId <= 0
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "لا يوجد حساب مرتبط بمنظمة صالحة", // "No account linked to a valid organization"
    });
  }

  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId,
    },
  });
});

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// SECURITY FIX: this is the single, canonical gate for the one deliberate
// cross-organization exception in the whole codebase -- the authenticated
// platform Super Admin. Every place that needs to read or act across more
// than one organization's data MUST build on this (or on the pre-existing,
// functionally-identical local `superAdminProcedure` in
// server/superAdminRouter.ts) instead of writing its own inline
// `ctx.user?.role !== 'super_admin'` check. Before this fix, at least four
// separate files (registrationRouter.ts, storeRouter.ts x2, and the
// loyalty admin-catalog endpoints in routers.ts) each implemented their own
// ad hoc version of this exact check directly on `protectedProcedure` --
// functionally correct individually, but a single missed `!==` or an
// accidentally-broadened role list in any one of those copies would have
// reopened a cross-tenant leak without anyone needing to touch this file.
// Intentionally built on `protectedProcedure` (not `tenantProcedure`):
// super-admin actions are cross-organization by design and must not be
// blocked by "does this super-admin's own account have an organizationId".
export const superAdminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (ctx.user!.role !== 'super_admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: "صلاحيات المدير العام مطلوبة" });
    }
    return next({ ctx });
  }),
);
