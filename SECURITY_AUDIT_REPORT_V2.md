# Multi-Tenant Security Audit — Final Report (v3)

> **v3 update:** the user set an explicit, strict policy — *every nursery must be completely isolated from every other nursery; the only exception is the authenticated Super Admin.* All six items listed as "disclosed exceptions" in v2 §5 were re-reviewed one by one against this policy. See §7 for the item-by-item verdicts and fixes, and §8 for the final per-module tenant-isolation checklist. Sections 1–6 below are the original v2 findings and are unchanged (kept for history).

**Scope:** repository-wide audit of `organizationId`-based tenant isolation across every router, database helper, and REST endpoint in the learning-tree-connect ("Nashaa") nursery-management codebase.

**Sandbox constraints (apply to every fix below):** no live database, no test runner, and no `tsc` were available. Every change was verified with `node --experimental-strip-types --check` (syntax only) and by manual code review. Nothing here has been exercised against a running database. Migrations could not be generated or applied (`drizzle-kit` requires `DATABASE_URL`).

All work is committed as a linear branch history: `fix-c1` → `fix-c6` → `fix-sweep-1` … `fix-sweep-21`, each commit scoped to one issue or module with a detailed message. This report covers the full history but focuses on this session's final pass (sweeps 13–21).

---

## 1. Most severe findings this pass

### 1.1 Onboarding never set the new organization's owner's own `users.organizationId` (fix-sweep-13)
`completeOnboarding` created the organization, its branding, its subscription, and an `organizationMembers` row for the caller — but never updated `users.organizationId` on the caller's own row. Every `tenantProcedure` check in the codebase reads `ctx.organizationId`, which comes directly from `users.organizationId`, not `organizationMembers`. Since that column defaults to `1` at the schema level, **every brand-new nursery owner who completed onboarding had all of their subsequent actions (creating children, staff, invoices, calendar events, everything) silently applied to organization #1** instead of the organization they just created. This is assessed as the single most severe bug found in the entire audit, since it explains a plausible total-tenant-isolation failure for every new signup up to this fix.

### 1.2 `registrationRouter.ts` privilege escalation + password hash exposure (fix-sweep-21)
`list`/`getById`/`updateStatus` on the public nursery sign-up review queue were meant to be super-admin-only but the check allowed `role === 'admin' || role === 'owner'` — ordinary **per-organization** roles. Any nursery's own local admin/owner could list, view, and approve/reject every other prospective nursery's registration platform-wide, and `getNurseryRegistrationById` returned every column including `ownerPassword` (a bcrypt hash). Fixed: restricted to `super_admin` only, and switched to an explicit column list that excludes the password hash.

### 1.3 Messaging: admin role bypassed conversation ownership entirely (fix-sweep-15)
`messages.list`/`send` let any user with an admin-like role (`admin`/`super_admin`/`owner`/`principal`) read or send messages into **any conversation in any organization**, because `getConversationById` had no organization filter. Combined with `getAllConversations`, `archiveConversation`, `deleteMessage`, and `getAllActiveStaffAndParents` all having zero org scoping, an admin from Org A could read Org B's private parent-teacher conversations, and see every active staff/parent user across the entire platform as message "contacts."

### 1.4 `centerSettings` and `loyalty_settings` were global singleton rows (fix-sweep-14, fix-sweep-20)
Both tables have an `organizationId` column, but the query layer ignored it — `getCenterSettings()`/`getLoyaltySettings()` read `SELECT * ... LIMIT 1` with no `WHERE`, and `updateLoyaltySettings` hardcoded `WHERE id = 1`. Every organization shared one center-settings row (GPS geofence used to validate staff check-in distance, working hours, VAT number) and one loyalty-program-rules row. Any admin updating "settings" silently overwrote every other organization's values.

### 1.5 AI-generated content (`aiRouter.ts`) — entirely unaudited until this pass (fix-sweep-19)
Seven of nine `aiGeneratedContent` insert sites never stamped `organizationId`. `getById` (library) had no ownership check at all — any staff member could read any organization's AI-generated progress reports, which embed real children's names, attendance percentages, and assessment summaries. `generateProgressReport`/`generateCertificate`/`generateAssessment` fetched the target child with no organization filter at all.

### 1.6 Widespread "fetch by client-supplied id, no ownership check" pattern
Repeated across attendance, daily reports, media, EYFS assessments, learning observations, emergency contacts, enrollment, and the AI content library: routes accepted a client-supplied `id`/`childId` and used it directly with, at most, a parent-role check — non-parent (teacher/admin) roles had no check at all. Fixed by adding fetch-and-verify (`getXById(id, organizationId)` → `NOT_FOUND` if missing) before every read or mutation. `emergencyContacts.delete` had **no check of any kind for any role** — any authenticated user could delete any organization's emergency contact by guessing its id.

---

## 2. Every vulnerability fixed, by module (this session, sweeps 13–21)

| Module | Fixed |
|---|---|
| Onboarding | New org owner's `users.organizationId` never stamped (root cause of total isolation failure) |
| SMS/email integrations | `ctx.user?.organizationId ?? 1` fallback on Twilio/SendGrid credential read/write |
| REST bulk import/export (`_core/index.ts`) | 4× `\|\| 1` fallback; unscoped class-name matching; unscoped parent-account linking by email/phone |
| Classes | `getById`/`children` had no org check; `update`/`delete` had no ownership check |
| Staff GPS attendance | `byDate`/`userHistory` had no org filter; GPS geofence validated against wrong org's center settings |
| Center settings | Single shared global row across all organizations |
| Attendance | `getChildById` (used everywhere as an implicit auth check) had no org param at all; `checkIn`/`checkOut`/`markAbsent`/`updateStatus`/`auditLog` trusted client ids with no ownership check |
| Daily reports | `getById`/`create`/`update` had no org check |
| Messaging/conversations | Admin-role bypass granted cross-org read/write access to any conversation; `getAllConversations`/`archiveConversation`/`deleteMessage`/`getAllActiveStaffAndParents` had zero org scoping; `createConversation` never stamped `organizationId` |
| Daily activities | `byChild`/`byClass`/`create` had no org check |
| Media (photos/videos) | Entire module had no org filtering anywhere — list/approve/delete/getChildren all fixed |
| Medical info | Staff/admin path had no org check at all (only parents were checked) |
| Emergency contacts | `delete` had no ownership check for any role |
| Enrollment | `list` returned every org's records; `create`/`update` had no ownership check |
| Waiting list | No org scoping anywhere; **schema had no `organizationId` column at all** — added (nullable) |
| EYFS assessments / learning observations | Staff/admin path had no org check; `create` never stamped org |
| AI routes (`aiRouter.ts`) | 7/9 insert sites never stamped org; `getById`/`saveToLibrary`/`removeFromLibrary`/`toggleFavorite` had no ownership check; `generateProgressReport`/`generateCertificate`/`generateAssessment` fetched children with no org filter |
| Loyalty program | Rewards catalog and settings shared globally; `addPoints`/`deductPoints` trusted arbitrary `userId`; admin views (`allParentsPoints`/`allRedemptions`) leaked every organization's parent data; `updateRedemptionStatus` had no ownership check |
| `registrationRouter.ts` | Platform-wide privilege escalation (see §1.2) + password hash exposure |

Plus everything fixed in earlier sweeps this session (1–12, C1–C6): the C1 cross-tenant financial data leak, the C2 `tenantProcedure` root-cause fix, C3's `.default(1)` removal across 16 tables, C4 SQL injection in loyalty/center settings raw queries, C5 payment-status spoofing, C6 hardcoded CSRF secret, calendar events (creation + read-side), finance module (invoices/payments/transactions/refunds), announcements, `getUsersByRoles` broadcast leak, pickup workflow (6-step), documents/child-documents, and the per-router sweeps for `assessmentRouter`, `curriculumRouter`, `customAssessmentRouter`, `developmentRouter`, `engagementRouter`, `evaluationRouter`, `staffManagementRouter`, `subscriptionPaymentRouter`, `weeklyPlanRouter`, `brandingRouter`, `payrollRouter`, `goalsRouter`.

## 3. Every modified file (cumulative, `master` → `fix-sweep-21`)

`drizzle/schema.ts`, `server/_core/context.ts`, `server/_core/index.ts`, `server/_core/trpc.ts`, `server/aiRouter.ts`, `server/assessmentRouter.ts`, `server/brandingRouter.ts`, `server/bulkImportRouter.ts`, `server/calendarRouter.ts`, `server/curriculumRouter.ts`, `server/customAssessmentRouter.ts`, `server/db.ts`, `server/developmentRouter.ts`, `server/engagementRouter.ts`, `server/enrollment-expiry-handler.ts`, `server/evaluation-reminder-handler.ts`, `server/evaluationRouter.ts`, `server/event-reminders-handler.ts`, `server/goalsRouter.ts`, `server/onboardingRouter.ts`, `server/payrollRouter.ts`, `server/pickup-escalation.ts`, `server/registrationRouter.ts`, `server/routers.ts`, `server/staffManagementRouter.ts`, `server/storeRouter.ts`, `server/subscriptionPaymentRouter.ts`, `server/weeklyPlanRouter.ts`.

`server/routers.ts` and `server/db.ts` account for the large majority of changes, since nearly every module routes through them.

## 4. Verified safe / correctly designed as-is (no changes needed)

- **`storeRouter.ts`** — a genuine cross-organization marketplace by design (parents browse and buy from any nursery's store). Public product/category browsing is intentionally unscoped; all admin-facing product/category/order management is already correctly scoped by `ctx.user.organizationId`; `superAdminGetAllOrders`/`superAdminGetCommissionReport` are correctly gated on `role === 'super_admin'`.
- **`aiMarketingRouter.ts`, `capiRouter.ts`, `demoRouter.ts`, `posterGenerator.ts`** — no database reads of tenant data; pure content-generation, ad-tracking passthrough, or insert-only public lead forms.
- **`developmentRouter.ts`, `engagementRouter.ts`, `weeklyPlanRouter.ts`, `assessmentRouter.ts`, `curriculumRouter.ts`, `customAssessmentRouter.ts`** — re-verified this pass; all consistently fetch-and-verify by organization before every read/write.
- Daily backup / account-cleanup scheduled handlers — intentional cross-organization operations by design (platform-wide backup, platform-wide stale-account cleanup).

## 5. Remaining intentional/disclosed exceptions

These were **not** fixed, with the reason documented in code and here:

1. **`pickup_alert_settings`** — no `organizationId` column at all; appears to be a genuine global default-settings table (no per-org override ever implemented). Not touched, to avoid guessing at unintended behavior change.
2. **`waitingList.publicRegister`** — an unauthenticated public form with no organization-identifying parameter in its input schema at all (no slug, no subdomain). There is no tenant context to stamp on new rows. Fixing this requires a product/frontend change (passing an org slug from the URL), not a server-side patch. New rows are left with `organizationId: null`.
3. **`loyalty_partners`, `loyalty_cards`, `loyalty_card_templates`** — managed via raw SQL, no `organizationId` column at all, unlike `loyalty_rewards`/`loyalty_settings` (which clearly were designed per-organization and have been fixed). Ambiguous whether this is a deliberate shared "Nashaa loyalty" partner/card network across the whole platform (plausible given the `naashah_loyalty` branding in the QR payload) or an oversight — flagged for a product decision rather than guessed.
4. **`superAdminRouter.ts`'s `addMember`** — when adding an *existing* user to a second organization's `organizationMembers`, it does not update that user's primary `users.organizationId`. Not changed: the codebase has no single source of truth for "a user who is a member of two organizations," and forcing an overwrite could itself move a user out of an organization they were legitimately operating in. Flagged as a data-model ambiguity needing a product decision.
5. **`waiting_list.organizationId`** — added as a **nullable** column (no default, no `NOT NULL`) rather than backfilled, since there is no live database in this sandbox to run an `UPDATE` migrating existing rows to their correct organization. At deploy time: existing rows should be backfilled where recoverable, and a `drizzle-kit` migration must be generated/run against a live database before this filter is fully protective (existing NULL rows will not appear in any org-filtered query until backfilled).
6. **Schema changes generally** — every schema.ts edit this session (removing `.default(1)`, adding the `waiting_list.organizationId` column) was made directly in the TypeScript schema file. No `drizzle-kit generate`/`push` was run and no migration SQL exists, because `drizzle-kit` requires `DATABASE_URL`, which is unavailable in this sandbox. **This must be run against a live database before deploy.**

## 6. Confirmation: is tenant isolation complete?

**No audit of this size can be certified "complete" without live-database testing**, and that caveat applies to every claim below. With that said:

- Every table with an `organizationId` column that was found unfiltered has been fixed (25 tables from the schema census, all now consistently filtered/stamped where accessed).
- Every router file in `server/` has been read and audited this session (across this and prior sweeps), including previously-unaudited files discovered this pass: `aiRouter.ts`, `registrationRouter.ts`, `aiMarketingRouter.ts`, `capiRouter.ts`, `demoRouter.ts`, `storeRouter.ts`, `posterGenerator.ts`.
- The single most severe bug (onboarding never setting the new org owner's `users.organizationId`) is fixed.
- The most severe finding of *this specific pass* (registrationRouter's platform-wide privilege escalation) is fixed.
- Six items remain as **disclosed, intentional, or product-decision-pending exceptions** (§5) rather than silently unfixed bugs.

What **cannot** be verified in this sandbox and should be done before relying on this audit in production:
- Running `drizzle-kit generate && drizzle-kit push` (or equivalent) against a real database to materialize the schema changes, and backfilling `waiting_list.organizationId` for existing rows.
- End-to-end testing: creating two organizations, seeding cross-referencing data, and confirming no query returns data across the boundary — this audit was 100% static code review, not dynamic testing.
- A full type-check (`tsc --noEmit`) — this sandbox only supports syntax checking via `node --experimental-strip-types --check`, which cannot catch logic errors in the fetch-and-verify patterns added.
- Load-bearing confirmation that no other, not-yet-discovered router files exist beyond the ones enumerated in `server/*.ts` at the time of this audit.

---

## 7. Policy applied: complete tenant isolation, Super Admin is the only exception

The user's instruction was explicit and strict: every nursery must be fully isolated from every other nursery, with the authenticated Super Admin as the sole cross-organization exception, and every one of the six items below had to be either fixed completely or proven safe — not left as an ambiguous "product decision."

Before touching individual endpoints, one piece of shared infrastructure was built: a single canonical `superAdminProcedure` was added to `server/_core/trpc.ts`. Previously, the "is this really the platform Super Admin" check was reimplemented inline, separately, in four different places (`registrationRouter.ts` ×3, `storeRouter.ts` ×2, and would have needed a fifth copy in the loyalty endpoints below). Four separately-typed copies of the same security-critical check is itself a latent risk — one missed `!==` or one accidentally-broadened role list in any single copy reopens a cross-tenant hole without anyone needing to touch the others. All five of those call sites, plus the pre-existing local `superAdminProcedure` in `superAdminRouter.ts`, now build on the one shared gate.

### 7.1 `pickup_alert_settings` — **was a real security issue. Fixed.**

**Verdict: security issue, not intentional.** On reflection against the strict policy, a single shared row controlling every nursery's pickup-alarm volume, tone, repeat interval, and escalation timing is not "a global default" in any defensible sense — it is a live operational control, and any organization's own admin calling `updateAlertSettings` silently changed every other organization's staff pickup-alarm behavior (an alarm that's too quiet, or with too long an escalation window, is a child-safety-adjacent issue in a nursery context).

**Fix:** added a nullable `organizationId` column to `pickup_alert_settings` (nullable because there is no live database in this sandbox to backfill existing rows — see §7.5). `getPickupAlertSettings`/`updatePickupAlertSettings` in `server/db.ts` now take an optional `organizationId` and do get-or-create scoped to that organization; the `alertSettings`/`updateAlertSettings` tRPC endpoints in `server/routers.ts` now pass `ctx.organizationId`. A legacy global-row fallback path is kept only for the case where no organization context is available at all (defensive, not a regression).

### 7.2 `waitingList.publicRegister` — **was a real security/availability issue. Fixed.**

**Verdict: security issue.** This is a public, unauthenticated form, so it can never leak data *back* to an attacker by itself — but with no organization identifier anywhere in its input, every public waitlist submission across the entire platform was being silently attributed to no organization at all (`organizationId: null`), meaning it would never appear in *any* nursery's waiting-list view. That's a full availability failure for every nursery depending on this feature, and before the `waiting_list.organizationId` column existed at all, it was worse: a single shared table with no partitioning column meant every nursery's front-desk staff could see every other nursery's prospective families.

**Fix, end-to-end:**
- The public link is now per-nursery: `/waitlist/:orgSlug` (frontend routing in `client/src/App.tsx`, form component `client/src/pages/PublicWaitlist.tsx` updated to read the slug from the URL and show a clear "invalid link" state if it's missing).
- The tRPC input for `waitingList.publicRegister` now requires `orgSlug`; a new `getOrganizationBySlug` helper in `server/db.ts` resolves it server-side to a real, non-suspended organization (the slug is treated as an opaque public identifier, never as a trusted numeric id — an unknown or suspended slug is rejected with `NOT_FOUND`, not silently accepted).
- The "new waitlist entry" notification, which previously broadcast to `notifyOwner` platform-wide, now only notifies that specific organization's own admins/owners/principals.

### 7.3 `loyalty_partners`, `loyalty_cards`, `loyalty_card_templates` — **mixed: confirmed intentionally global where safe, fixed where it wasn't.**

**Verdict: genuinely intentional shared catalog for the read-only, non-PII parts — but the admin-write and bulk-read endpoints were a real security issue and are fixed.**

This table set has no `organizationId` column at all, unlike `loyalty_rewards`/`loyalty_settings` (already fixed in earlier sweeps), and the QR payload's `naashah_loyalty` branding confirms this is a single shared "Nashaa loyalty" partner network and card-design catalog spanning every nursery on the platform by design — not an oversight. Splitting this analysis by what each endpoint actually exposes:

- **Confirmed safe, left as shared/`protectedProcedure`:** `partners` (list of discount partners) and `cardTemplates` (card background designs) are read-only catalog data with no tenant identity or PII in them at all — every nursery's parents seeing the same list of partner discounts and the same card designs cannot expose one nursery's private data to another, because there is no per-nursery data here to leak. `myCard`/`generateCard` only ever touch the calling user's own card (`ctx.user!.id`), so they were already correctly scoped by identity, not by organization.
- **Was a real security issue, fixed:** `allPartners`, `createPartner`, `updatePartner`, `deletePartner`, and `createCardTemplate` are *writes* to that shared platform-wide catalog — previously gated only by the local, per-organization `adminProcedure`, meaning **any single nursery's own admin could edit or delete the shared discount-partner list or card templates seen by every other nursery's parents.** These are now restricted to the shared `superAdminProcedure` (genuine platform Super Admin only).
- **Was a real security issue, fixed:** `allCards` returns every cardholder's name, email, and points balance across the entire platform in one call — also previously gated only by the local `adminProcedure`, so any nursery's own admin could see every other nursery's parents' loyalty data. Restricted to `superAdminProcedure`.
- **Was a real security issue, fixed:** `validateCard` (looks up one card by number, used to scan/validate a card) had **no ownership check of any kind** — any authenticated staff member at any nursery could validate/view any other nursery's parent's card (name + points balance) just by knowing or guessing the card number. `server/db.ts`'s `getCardByNumber` now also returns the card owner's `organizationId`, and `validateCard` returns `null` (not a different error, so it's indistinguishable from "card not found") unless the caller is `super_admin` or the card owner is in the caller's own organization.

### 7.4 `superAdminRouter.ts`'s `addMember` — **confirmed not a security issue.**

**Verdict: intentionally global (Super Admin only), and confirmed it cannot expose cross-tenant data.** This endpoint can add an *existing* user (who already has a `users.organizationId` pointing at some other organization) as a member of a *second* organization via an `organizationMembers` row, without changing that user's primary `users.organizationId`. That could look like a cross-tenant access grant, but a full-codebase search confirms `organizationMembers` is **never read by any authorization check anywhere in this codebase** — every single tenant-scoping decision in every router goes through `ctx.organizationId`, which is derived solely from `users.organizationId` (see `server/_core/context.ts`). So adding a user to a second org's membership list here does not, and cannot, grant that user tenant-scoped access to that org's data; their session continues to resolve to their one, original `users.organizationId`. `organizationMembers` is effectively a decorative "members list" feature for the UI, not an access-control table. A code comment documenting this was added directly above `addMember` so this isn't rediscovered as a false alarm later. The endpoint itself is already restricted to `superAdminProcedure`, consistent with the policy that only Super Admin performs cross-organization actions.

### 7.5 `waiting_list.organizationId` (nullable, not backfilled) — **intentionally left nullable; deployment prerequisite, not a code vulnerability.**

**Verdict: not a code-level security issue — an operational/deployment gap.** The column was added nullable (no default, no `NOT NULL`) because this sandbox has no live database and no `DATABASE_URL`, so there is no way to run the `UPDATE` that would backfill existing rows to their correct organization. Every *code path* that reads or writes this table now filters/stamps by `organizationId` correctly (§7.2 and the earlier `waitingList.list`/`create` fixes) — the only remaining gap is pre-existing rows in a real production database, which this sandbox cannot see or modify. This cannot expose one organization's data to another (a NULL row is invisible to every org-filtered query, the opposite of a leak — it's an availability gap, not a confidentiality one), but it does mean pre-existing rows won't reappear in anyone's waiting list until backfilled. **Action required at deploy time:** run a one-time backfill `UPDATE` against the real database (using whatever historical source of truth exists for which nursery each row belongs to), then optionally tighten the column to `NOT NULL`.

### 7.6 Schema migrations never run against a live database — **deployment prerequisite, not a code vulnerability.**

**Verdict: not a code-level security issue.** Every schema change made across this entire audit (removing `.default(1)` from 16+ tables, adding `waiting_list.organizationId`, adding `pickup_alert_settings.organizationId`) was made directly in `drizzle/schema.ts`. No `drizzle-kit generate`/`push` has been run and no migration SQL exists, because `drizzle-kit` requires `DATABASE_URL`, which this sandbox does not have. **Action required at deploy time:** run `drizzle-kit generate && drizzle-kit push` (or the project's equivalent migration flow) against the real database before deploying any of this code, and confirm the resulting migration SQL matches what's described here.

### Files changed in this round (v2 → v3)

`server/_core/trpc.ts` (new shared `superAdminProcedure`), `server/superAdminRouter.ts` (consumes the shared procedure instead of a local copy; documents `addMember`/`organizationMembers`), `server/registrationRouter.ts` (migrated 3 endpoints to the shared procedure), `server/storeRouter.ts` (migrated 2 endpoints to the shared procedure), `server/routers.ts` (pickup alert settings scoped by org; waiting-list public registration reworked; loyalty endpoints migrated/scoped), `server/db.ts` (pickup alert settings get-or-create by org; new `getOrganizationBySlug`; `getCardByNumber` now returns card owner's org), `drizzle/schema.ts` (`pickup_alert_settings.organizationId`, nullable), `client/src/App.tsx` and `client/src/pages/PublicWaitlist.tsx` (per-nursery waitlist link `/waitlist/:orgSlug`).

All backend (`.ts`) changes were verified with `node --experimental-strip-types --check`. The two `.tsx` frontend changes could not be syntax-checked automatically in this sandbox (no `node_modules`, npm registry blocked, and `node --check` does not support `.tsx`) — they were verified by careful manual re-reading only. This should be confirmed with a real build (`tsc`/`vite build`) before deploying.

## 8. Final tenant-isolation checklist, by module

| Module | Fully tenant-isolated? | Notes |
|---|---|---|
| Calendar | Yes | Fixed in earlier sweeps (creation + read-side); fetch-and-verify by org throughout. |
| Children | Yes | Fetch-and-verify by org on every read/write. |
| Parents | Yes | Scoped via child/organization relationships; enrollment and medical-info paths fixed. |
| Staff / GPS attendance | Yes | `byDate`/`userHistory`/geofence validation all org-scoped. |
| Finance (invoices/payments/transactions/refunds) | Yes | Fixed in earlier sweeps; payment-status spoofing (C5) also fixed. |
| Payroll | Yes | `payrollRouter.ts` re-verified this session. |
| Attendance | Yes | `getChildById` and all check-in/out/absence/status/audit paths org-scoped. |
| Announcements | Yes | Fixed and re-audited this session. |
| Notifications | Yes | `getUsersByRoles` broadcast leak fixed; `createNotification` call sites audited (35 sites). |
| AI (progress reports / certificates / assessments / content library) | Yes | All 9 insert sites stamp org; `getById`/library actions ownership-checked. |
| Messaging | Yes | Admin-role cross-org bypass fixed; all conversation/message paths org-scoped. |
| Waiting list | Conditional yes — see note | Code is fully org-scoped both for the public form (`orgSlug` → resolved server-side) and the admin `list`/`create`. Pre-existing rows in a real database will read as NULL until a one-time backfill is run (§7.5) — not a code gap, a deploy-time data step. |
| Loyalty | Yes | Read-only catalog (`partners`, `cardTemplates`) confirmed safe to stay shared (no PII, no tenant data). All catalog writes and the bulk cardholder read (`allPartners`/`createPartner`/`updatePartner`/`deletePartner`/`allCards`/`createCardTemplate`) restricted to Super Admin. `validateCard` now enforces same-organization ownership (or Super Admin). |
| Reports | Yes | Covered by the underlying per-module fixes above (reports read from already-scoped tables). |
| Pickup / pickup alerts | Yes | Pickup workflow fixed in an earlier sweep; `pickup_alert_settings` (this round) now scoped per organization instead of one shared global row. |
| Store / marketplace | Yes (by design, dual-mode) | Public product browsing is intentionally cross-organization (parents shop any nursery's store) — this is the product, not a leak, since store products/categories carry no other tenant's private data. Admin-facing product/order management is org-scoped. `superAdminGetAllOrders`/`superAdminGetCommissionReport` (genuinely cross-org, for the platform operator) migrated to the shared `superAdminProcedure`. |
| Registration (nursery sign-up review queue) | Yes | Migrated to the shared `superAdminProcedure`; password-hash exposure already fixed in the prior sweep. |
| Super Admin actions (organization management, `addMember`, etc.) | Yes (by design) | This is the sole authorized cross-organization actor per policy; `organizationMembers` confirmed not to be an authorization surface (§7.4), so no cross-tenant grant is possible even via `addMember`. |

**Outstanding items are deployment steps, not code vulnerabilities:** (1) backfilling `waiting_list.organizationId` for pre-existing rows, and (2) running `drizzle-kit generate/push` against a live database to materialize every schema change made across this audit. Both are called out explicitly so they aren't missed at deploy time.
