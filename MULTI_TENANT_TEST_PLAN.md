# Multi-Tenant Integration Test Plan — Nashaa / learning-tree-connect

## 1. Purpose and scope

This plan turns the tenant-isolation policy enforced across five audit sweeps
(`fix-c1` … `fix-sweep-25`) into a permanent, runnable regression suite. The
policy under test:

> No authenticated user belonging to Nursery A may read, create, update, or
> delete any private data belonging to Nursery B, through any API endpoint or
> application workflow. The authenticated Super Admin is the only sanctioned
> exception.

Every finding from the audit (32 confirmed vulnerabilities across five
sweeps) was a *missing or incorrect organization check* on one of four
operations: **list/read**, **read-by-id**, **create with a foreign-key
input**, or **update/delete-by-id**. This plan is organized so every
procedure in the app is classified into one of those four risk categories and
given an explicit test, so the same class of bug cannot regress silently.

This is a living document: `server/testUtils/tenantFixture.ts` and the
`server/tenant-isolation.*.test.ts` files implement the runnable half of this
plan today; the tables below are the checklist those files are graded
against.

## 2. Test methodology

### 2.1 Fixture: two organizations, fully populated

A single shared fixture (`setupTenantFixture()` in
`server/testUtils/tenantFixture.ts`) creates two independent organizations,
**Org A** and **Org B**, each with:

- one admin, one teacher, one parent user
- one class
- one child, linked to the org's parent and class
- one staff profile (for the teacher)
- one attendance / staff-attendance record
- one invoice, payment, refund, transaction
- one tuition plan
- one medical-info record and one emergency contact
- one enrollment record
- one child document
- one custom assessment (+ one question, + one response)
- one weekly plan (draft and published variants)
- one evaluation (+ one criterion + one score)
- one development observation, one readiness score
- one engagement home-learning activity, one family challenge
- one curriculum item
- one goal (performance goal)
- one calendar event (+ reminder)
- one payroll salary record
- one store product, category, order
- one branding record, subscription record

Row IDs for every entity above are captured for both orgs so tests can do the
standard cross probe: **"can a caller authenticated as Org A's `<role>` act
on Org B's `<entity>` by id?"**

### 2.2 Caller construction

Tests call routers in-process via `appRouter.createCaller(ctx)` (as already
used in `full-audit.test.ts`), not over HTTP — this avoids needing a running
server and lets tests assert on the exact `TRPCError` code. Unlike the
existing `full-audit.test.ts` fixture, the context builder used here sets
**both** `ctx.user` and the top-level `ctx.organizationId` field, because
`tenantProcedure` (see `server/_core/trpc.ts`) reads `ctx.organizationId`
directly rather than deriving it from `ctx.user` — a context object that
omits it will fail every `tenantProcedure`-gated call with `FORBIDDEN`
regardless of the isolation bug under test, producing a false pass. This is
called out explicitly because it's an easy way to write a test that always
"passes" for the wrong reason.

### 2.3 The four standard probes

For every procedure, exactly one of these applies:

| Probe | Applies to | Setup | Expected result |
|---|---|---|---|
| **P1 — Cross-org read-by-id** | `getById`, `get`, `getDetails`, and similar single-record fetches | Call as Org A user with Org B's record id | `NOT_FOUND` (never `FORBIDDEN` — the response must not confirm the id exists) or `null`/empty for query-style procedures that return `null` on miss |
| **P2 — Cross-org list leak** | `list`, `all*`, dashboards, reports | Call as Org A user, inspect the returned array/object | Result contains **zero** rows/fields belonging to Org B; row counts match Org A's fixture counts exactly |
| **P3 — Cross-org create via foreign key** | `create`/`generate`/`upsert` procedures that accept a `childId`, `classId`, `userId`, `parentId`, `staffProfileId`, `evaluationId`, etc. | Call as Org A user, pass one of Org B's ids in the foreign-key field | `NOT_FOUND` before any row is written; verify via a same-org read afterward that no Org B-linked row was created |
| **P4 — Cross-org update/delete-by-id** | `update`, `delete`, `archive`, `activate`, `approve`, `reject`, `publish`, `acknowledge`, `resolve`, status-toggle procedures | Call as Org A user with Org B's record id | `NOT_FOUND`; a same-org (Org B) read afterward proves the record is **unchanged** |

A fifth, non-standard probe is used only where the app has a documented,
intentional cross-org surface:

| Probe | Applies to | Expected result |
|---|---|---|
| **P5 — Sanctioned exception** | Every `superAdminProcedure`-gated endpoint; `storeRouter`'s buyer-side endpoints (`getProduct`, `getCart`, `createOrder` — the store is an intentional cross-org marketplace); registration/waitlist public self-service flows | Cross-org access **succeeds** for a genuine `super_admin` caller and **fails** (`FORBIDDEN`) for every other role, including org admins/owners/principals |

### 2.4 What is explicitly out of scope

Procedures with no database read/write of tenant data are excluded from P1–P4
and noted as such in the tables below: pure LLM passthroughs with no
by-id fetch (`aiRouter.childAssistant`, `aiMarketingRouter`'s generators that
take only free-text input, `posterGenerator`, `capiRouter`), static
reference-data endpoints (`registrationRouter.getPlans`), and endpoints
already covered by the existing `security-audit.test.ts` /
`auth.security.test.ts` files (CSRF, rate limiting, password handling) —
those are authentication/session security, not tenant isolation, and are not
duplicated here.

## 3. Per-router test matrix

Legend: **Probe** column cites which of P1–P5 applies; **Status** reflects
whether the endpoint was a confirmed vulnerability in this engagement
(🔴 fixed this engagement, 🟢 confirmed clean by audit, ⚪ out of scope).

### 3.1 `routers.ts` — core app router

#### `children`

| Procedure | Probe | Status |
|---|---|---|
| `list` | P2 | 🟢 |
| `getById` | P1 | 🟢 |
| `create` (auto-link parent) | P3 (parentId) | 🟢 |
| `update` | P4 | 🟢 |
| `delete` | P4 | 🟢 |
| `archive` / `activate` | P4 | 🟢 |
| `getParents` | P1 | 🟢 |
| `parentRegisterChild` | P3 (org resolved via authed parent, not client input) | 🟢 |
| `parentUpdate` | P4 (ownership via parent-child link) | 🟢 |

#### `attendance` / `staffAttendance`

| Procedure | Probe | Status |
|---|---|---|
| `attendance.byDate` / `byChild` | P1/P2 | 🟢 |
| `attendance.checkIn` / `checkOut` / `markAbsent` / `updateStatus` | P3/P4 | 🟢 |
| `staffAttendance.today` / `myHistory` | P1 (own record only) | 🟢 |
| `staffAttendance.byDate` / `userHistory` / `allToday` | P2 | 🟢 |
| `staffAttendance.checkIn` / `quickCheckIn` / `lateCheckIn` | P3 (organizationId stamped) | 🔴 fixed fix-sweep-24 |
| `staffAttendance.checkOut` | P4 (bare id, no ownership check) | 🔴 **fixed fix-sweep-25** |
| `staffAttendance.adminCheckOut` | P4 (bare id, no org check) | 🔴 **fixed fix-sweep-25** |
| `staffAttendance.quickCheckOut` / `lateCheckOut` | P4 (resolves via caller's own today-record, not a client id) | 🟢 |

#### `dailyReports`, `messages`

| Procedure | Probe | Status |
|---|---|---|
| `dailyReports.list` / `getById` / `create` / `update` | P1–P4 | 🟢 |
| `messages.conversations` / `list` / `send` / `createConversation` | P1/P2 | 🟢 |
| `messages.allConversations` (admin) | P2 | 🟢 |
| `messages.archive` / `unarchive` / `deleteMessage` | P4 | 🟢 |

#### `finance` (`invoices`), `payments`, `transactions`, `refunds`, `tuitionPlans`

| Procedure | Probe | Status |
|---|---|---|
| `finance.invoices` / `getById` | P1/P2 | 🟢 |
| `finance.createInvoice` / `updateInvoice` | P3/P4 | 🟢 |
| `finance.markPaid` / `markPending` / `deleteInvoice` / `sendReminder` / `sendInvoiceEmail` | P4 | 🟢 |
| `payments.initiate` / `saveFromMoyasar` / `verify` | P3/P4 (payment ownership + org match on the related invoice) | 🔴 fixed fix-c5 (spoofing), 🔴 fixed earlier sweep (ownership on `verify`) |
| `payments.history` / `byInvoice` | P1/P2 | 🟢 |
| `transactions.list` / `byInvoice` / `byParent` | P2 | 🟢 |
| `refunds.list` | P2 | 🟢 |
| `tuitionPlans.list` | P2 | 🟢 |
| `tuitionPlans.create` (childId + parentId foreign keys) | P3 | 🔴 **fixed fix-sweep-25** |
| `tuitionPlans.update` | P4 | 🟢 |
| `tuitionPlans.generateInvoices` | P2 (must only touch caller's org) | 🟢 |

#### `loyalty`

| Procedure | Probe | Status |
|---|---|---|
| `balance` / `transactions` / `rewards` / `myRedemptions` | P1 (own data) | 🟢 |
| `redeem` | P3/P4 (reward must belong to caller's org) | 🟢 |
| `addPoints` / `deductPoints` (admin, arbitrary `userId`) | P3 | 🔴 fixed prior sweep |
| `createReward` / `updateReward` / `deleteReward` | P3/P4 | 🟢 |
| `getSettings` / `updateSettings` | P1/P4 | 🟢 |
| `allParentsPoints` / `allRedemptions` / `updateRedemptionStatus` | P2/P4 | 🟢 |
| `partners` / `allPartners` / `createPartner` / `updatePartner` / `deletePartner` | P5 (global loyalty-partner catalog, intentionally shared — confirmed via schema, no organizationId column) | 🟢 |
| `myCard` / `generateCard` / `validateCard` / `cardTemplates` / `createCardTemplate` | P1/P5 (templates are global; card ownership is per-user) | 🟢 |

#### `notifications`

| Procedure | Probe | Status |
|---|---|---|
| `list` / `unreadCount` | P1 (own notifications only) | 🟢 |
| `markRead` | P4 (ownership check on `userId`) | 🔴 fixed prior sweep (`markNotificationRead`) |
| `markAllRead` / `delete` / `deleteAll` | P4 | 🟢 |

#### `classes`, `centerSettings`, `dailyActivities`, `departures`, `media`, `announcements`, `documents`

| Procedure | Probe | Status |
|---|---|---|
| `classes.list` / `getById` / `children` / `create` / `update` / `delete` | P1–P4 | 🟢 |
| `centerSettings.get` / `update` | P1/P4 (single-row-per-org pattern) | 🔴 fixed prior sweep (shared global row) |
| `dailyActivities.byChild` / `byClass` / `create` | P1/P3 | 🟢 |
| `departures.byDate` / `byChild` / `create` | P1/P3 | 🟢 |
| `media.list` / `getChildren` / `upload` / `uploadBatch` / `delete` / `approve` / `aiCaption` / `aiSuggestChildren` | P1–P4 | 🟢 |
| `announcements.list` / `create` / `update` / `delete` / `readers` / `readCount` | P1–P4 | 🟢 |
| `documents.list` / `create` / `delete` / `sign` / `signatures` | P1–P4 | 🟢 |

#### `childDocuments`, `medicalInfo`, `emergencyContacts`, `enrollment`, `waitingList`

| Procedure | Probe | Status |
|---|---|---|
| `childDocuments.listByChild` / `listAll` / `create` / `approve` / `reject` / `delete` | P1–P4 | 🟢 |
| `medicalInfo.get` / `upsert` | P1/P3 | 🟢 |
| `emergencyContacts.list` / `create` / `delete` | P1/P3/P4 | 🟢 |
| `enrollment.list` / `create` / `update` | P2/P3/P4 (no own `organizationId` column — enforced via join to `children`) | 🟢 |
| `waitingList.list` / `create` / `update` / `delete` / `publicRegister` | P2–P4 | 🟢 |

#### `eyfs`, `observations`, `auditLog`, `users`, `pickup`, `push`

| Procedure | Probe | Status |
|---|---|---|
| `eyfs.assessments` / `create` | P1/P3 | 🟢 |
| `observations.list` / `create` / `byArea` | P1/P3 | 🟢 |
| `auditLog.list` / `create` | P2 | 🟢 |
| `users.list` / `getById` / `create` / `update` / `delete` / `linkChild` / `unlinkChild` / `getChildren` / `getUnlinkedChildren` / `getParentsForChild` / `activate` / `deactivate` / `pending` / `approveAsParent` / `reject` | P1–P4 | 🔴 fixed prior sweep ("users admin sub-router" — the largest single group of fixes in this engagement) |
| `pickup.request` / `teacherSendToReception` / `markWaitingAtReception` / `completePickup` / `cancel` / `myRequests` / `activeForChild` / `active` / `teacherRequests` / `stats` / `authorizedPersons` / `addAuthorizedPerson` / `removeAuthorizedPerson` / `history` / `acknowledge` / `unacknowledgedAlerts` / `alertSettings` / `updateAlertSettings` / `testAlert` | P1–P4 | 🔴 `removeAuthorizedPerson` fixed prior sweep; rest 🟢 |
| `push.subscribe` / `unsubscribe` / `test` | P4 (own subscription only) | 🟢 |

### 3.2 `calendarRouter.ts`

| Procedure | Probe | Status |
|---|---|---|
| `list` / `get` | P1/P2 | 🟢 |
| `create` / `update` / `delete` | P3/P4 | 🔴 fixed fix-calendar-orgid / fix-calendar-read |
| `publish` / `sendReminder` / `scheduleReminder` / `cancelReminders` / `reminderHistory` | P4 | 🟢 |
| `processPendingReminders` | P5 (must require cron-or-super_admin, not be publicly callable) | 🔴 **fixed fix-sweep-25** |

### 3.3 `staffManagementRouter.ts`

| Procedure | Probe | Status |
|---|---|---|
| `list` / `getById` / `create` / `update` / `delete` | P1–P4 | 🟢 |
| `getDepartments` / `getBranches` / `getStats` | P2 | 🟢 |
| `leaves.list` / `request` / `approve` / `reject` / `getBalance` / `myBalance` / `myLeaves` | P1–P4 | 🟢 |
| `notes.list` / `create` / `update` / `delete` | P1–P4 (via `assertStaffProfileInOrg` helper) | 🟢 |
| `documents.list` / `create` / `delete` | P1–P4 | 🟢 |

### 3.4 `assessmentRouter.ts`, `customAssessmentRouter.ts`, `evaluationRouter.ts`

| Procedure | Probe | Status |
|---|---|---|
| `assessmentRouter.getItems` / `create` / `getByChild` / `getDetails` / `getAll` / `delete` / `getForParent` | P1–P4 | 🟢 |
| `customAssessmentRouter.create` / `update` (classId foreign key) | P3 | 🔴 **fixed fix-sweep-25** |
| `customAssessmentRouter.parentList` (classId-based join) | P2 (defense in depth) | 🔴 **fixed fix-sweep-25** |
| `customAssessmentRouter.delete` / `list` / `get` / `addQuestion` / `updateQuestion` / `deleteQuestion` / `saveResponses` / `getResponses` / `getAllResponses` / `emailReportToParents` | P1–P4 | 🟢 |
| `evaluationRouter.listCriteria` / `upsertCriterion` / `deleteCriterion` | P1/P3/P4 | 🟢 |
| `evaluationRouter.listEvaluations` / `getEvaluation` / `createEvaluation` (userId foreign key) / `updateEvaluation` / `submitEvaluation` / `acknowledgeEvaluation` | P1–P4 | 🟢 |

### 3.5 `curriculumRouter.ts`, `weeklyPlanRouter.ts`, `developmentRouter.ts`, `engagementRouter.ts`, `goalsRouter.ts`

| Procedure | Probe | Status |
|---|---|---|
| `curriculumRouter.list` / `listForParent` / `create` / `delete` | P1–P4 | 🟢 |
| `weeklyPlanRouter.generate` (classId foreign key) | P3 | 🔴 **fixed fix-sweep-25** |
| `weeklyPlanRouter.save` / `list` / `get` / `update` / `publish` / `duplicate` / `delete` | P1–P4 | 🟢 |
| `weeklyPlanRouter.parentList` (classId-based join) | P2 (defense in depth) | 🔴 **fixed fix-sweep-25** |
| `developmentRouter.getAreas` / `getMilestones` | P5 (global EYFS taxonomy — no `organizationId` column on either table, confirmed against schema) | 🟢 |
| `developmentRouter.createObservation` / `listObservations` / `getChildProgress` / `getReadinessScores` / `generateReadinessScore` / `analyzeChild` / `getLatestAnalysis` / `getRecommendations` / `updateRecommendationStatus` / `getAlerts` / `acknowledgeAlert` / `resolveAlert` / `teacherDashboard` / `getBenchmark` / `getChildSummary` / `generateReport` | P1–P4 | 🟢 |
| `engagementRouter` — `activities.*` / `challenges.*` / `journal.*` / `observations.*` / `goals.*` / `engagement.*` / `chatbot.ask` / `analytics.*` / `reports.generate` / `config.*` | P1–P4 | 🟢 |
| `goalsRouter.list` / `create` (userId foreign key) / `updateProgress` / `updateStatus` / `delete` / `summary` | P1–P4 | 🟢 |

### 3.6 `payrollRouter.ts`

| Procedure | Probe | Status |
|---|---|---|
| `upsertSalary` (userId foreign key) | P3 | 🔴 **fixed fix-sweep-25** |
| `listSalaries` / `getAnnualReport` / `getPayrollSummary` | P2 | 🟢 (relies on the `upsertSalary` fix above) |
| Remaining payroll-record endpoints | P1–P4 | 🟢 |

### 3.7 `storeRouter.ts`, `subscriptionPaymentRouter.ts`

| Procedure | Probe | Status |
|---|---|---|
| `getStoreOrganizations` / `getProducts` / `getCategories` / `getProduct` / `getCart` / `addToCart` / `updateCartItem` / `removeFromCart` / `clearCart` / `createOrder` / `verifyPayment` / `getMyOrders` / `getOrderDetails` | P5 (intentional cross-org marketplace — buyer can browse/order from any org's store; verify a buyer can only see their **own** orders, never another buyer's) | 🟢 |
| `adminGetProducts` / `adminCreateProduct` / `adminUpdateProduct` / `adminDeleteProduct` / `adminGetCategories` / `adminCreateCategory` / `adminDeleteCategory` / `adminGetOrders` / `adminUpdateOrderStatus` / `adminGetOrderDetails` | P1–P4 (seller-side; must stay org-scoped despite the marketplace pattern above) | 🟢 |
| `superAdminGetAllOrders` / `adminGetSalesReport` / `superAdminGetCommissionReport` | P5 | 🟢 |
| `subscriptionPaymentRouter.activate` / `status` | P4 (`input.organizationId !== ctx.organizationId` check) | 🟢 |

### 3.7 `brandingRouter.ts`, `subscriptionPaymentRouter.ts`, `onboardingRouter.ts`, `bulkImportRouter.ts`

| Procedure | Probe | Status |
|---|---|---|
| `brandingRouter.getMyBranding` (public, generic-fallback only) / `updateMyBranding` | P1/P4 | 🟢 |
| `onboardingRouter.completeOnboarding` | P4 (protectedProcedure by design — new orgs have no context yet); known accepted gap: an already-affiliated user can re-onboard and reassign their **own** account to a new org — does not read/write another org's data, out of strict policy scope, tracked as a product decision not a vulnerability | ⚪ documented exception |
| `bulkImportRouter.importData` (children/parents/teachers/staff) | P3 (super_admin may target any org after verifying it exists; everyone else locked to own org) | 🟢 |

### 3.8 `superAdminRouter.ts` (P5 — sanctioned cross-org exception)

| Procedure | Probe | Status |
|---|---|---|
| `listOrganizations` / `getOrganization` / `createOrganization` / `updateOrganization` / `toggleOrganizationStatus` / `deleteOrganization` | P5 | 🟢 (all 20 procedures confirmed built on the single canonical `superAdminProcedure`, fix-sweep-25 confirmation pass) |
| `getBranding` / `updateBranding` / `listPlans` / `updatePlanPricing` / `assignPlan` | P5 | 🟢 |
| `listMembers` / `addMember` / `removeMember` / `toggleMemberStatus` | P5 | 🟢 |
| `listSubscriptions` / `renewSubscription` / `cancelSubscription` | P5 | 🟢 |
| `platformStats` / `paymentsReport` | P5 | 🟢 |

Test requirement specific to this router: every procedure must reject a
caller whose `ctx.user.role !== 'super_admin'` — including org `admin`,
`owner`, and `principal` — with `FORBIDDEN`, even though those roles pass
`adminProcedure` elsewhere in the app.

### 3.9 `aiRouter.ts`, `aiMarketingRouter.ts`, `registrationRouter.ts`, cron handlers

| Procedure | Probe | Status |
|---|---|---|
| `aiRouter.generateObservation` / `generateWeeklyPlan` / `generateActivity` / `generateProgressReport` / `generateParentMessage` / `generateNewsletter` / `generateStory` / `generateCertificate` / `generateAssessment` (all stamp `organizationId` on save) | P3 | 🟢 |
| `aiRouter.saveToLibrary` / `getById` / `deleteContent` | P1/P4 | 🟢 |
| `aiMarketingRouter.*` | ⚪ free-text input only, no DB fetch-by-id | ⚪ out of scope |
| `registrationRouter.publicRegister` flow (`/register/:orgSlug`) | P3 (org resolved server-side via slug, never trusts a client-supplied numeric id) | 🔴 fixed fix-sweep-24 |
| `registrationRouter`'s super-admin approval endpoints | P5 | 🟢 |
| `account-cleanup.ts` / `backup.ts` / `enrollment-expiry-handler.ts` / `evaluation-reminder-handler.ts` / `event-reminders-handler.ts` / `pickup-escalation.ts` (`/api/scheduled/*`) | P5 (must require `isCron \|\| role === 'super_admin'`, reject plain org `admin`) | 🔴 fixed fix-sweep-24 |

## 4. Coverage tiers in the runnable suite

Given the size of this app (~300 procedures across 23 router files), the
runnable test files implement three coverage tiers, called out per file:

- **Tier 1 (full P1–P4 coverage):** every procedure marked 🔴 above — i.e.
  every procedure that was a confirmed vulnerability at some point in this
  engagement. Regressing any of these is the highest-priority signal.
- **Tier 2 (representative P1–P4 coverage):** every by-id read/update/delete
  and every foreign-key-accepting create across the remaining 🟢 procedures.
  This is the bulk of the suite.
- **Tier 3 (spot-check):** pure list/dashboard/summary endpoints where a
  single row-count-and-content assertion per router is sufficient, since
  these all share the same `eq(table.organizationId, ctx.organizationId)`
  pattern verified during the audit.

## 5. Files in this deliverable

| File | Contents |
|---|---|
| `server/testUtils/tenantFixture.ts` | Shared two-org fixture: creates/tears down Org A and Org B with the full entity set described in §2.1 |
| `server/tenant-isolation.core.test.ts` | `routers.ts`: children, attendance/staffAttendance, finance/payments/refunds/transactions, tuitionPlans, loyalty, notifications, classes, centerSettings, media, announcements, documents, childDocuments, medicalInfo, emergencyContacts, enrollment, users, pickup |
| `server/tenant-isolation.calendar-staff.test.ts` | `calendarRouter.ts`, `staffManagementRouter.ts` |
| `server/tenant-isolation.assessments.test.ts` | `assessmentRouter.ts`, `customAssessmentRouter.ts`, `evaluationRouter.ts` |
| `server/tenant-isolation.curriculum.test.ts` | `curriculumRouter.ts`, `weeklyPlanRouter.ts`, `developmentRouter.ts`, `engagementRouter.ts`, `goalsRouter.ts` |
| `server/tenant-isolation.payroll-commerce.test.ts` | `payrollRouter.ts`, `storeRouter.ts`, `subscriptionPaymentRouter.ts` |
| `server/tenant-isolation.admin-exceptions.test.ts` | `superAdminRouter.ts` (P5), `brandingRouter.ts`, `onboardingRouter.ts`, `bulkImportRouter.ts`, `registrationRouter.ts`, cron handler role gates |

## 6. Known limitation

These tests require a live MySQL database reachable via `DATABASE_URL` and
run through `vitest run` (`npm test`). They were authored and syntax-checked
in a sandbox with no live database, no `tsc`, and no test runner available —
they have **not** been executed against a real database as part of this
engagement. Running `npm test` in an environment with `DATABASE_URL` set is
the remaining step to turn this from a reviewed static plan into a passing
green build, and is the only way to move from "the code looks correct" to
"this is verified."
