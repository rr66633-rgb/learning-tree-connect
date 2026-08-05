-- Migration 0023: bootstrap the first organization + super_admin account.
--
-- Root cause of all admin login failures being investigated: this app has NO
-- self-service path to create the very first organization/super_admin on a
-- fresh database.
--   - server/superAdminRouter.ts `createOrganization` requires the caller to
--     already be role='super_admin' (chicken-and-egg).
--   - server/registrationRouter.ts `register` requires an existing `orgSlug`
--     to join (confirmed live: 400 "orgSlug ... received undefined" when no
--     org exists to join).
--   - server/onboardingRouter.ts requires an already-existing organizationId.
-- So every admin login attempt has been failing with a generic 401 because
-- no matching account has ever actually existed in this database -- not
-- because of a wrong password.
--
-- This migration is purely additive and idempotent:
--   - Only 2 INSERT statements. No UPDATE, no DELETE, no DROP.
--   - Each INSERT is guarded by `WHERE NOT EXISTS`, so re-running this file
--     (or drizzle re-applying it) is a safe no-op and it can never create
--     duplicates or touch any pre-existing organization/user row.
--   - Every other organization, user, child, parent, attendance, invoice, or
--     other production row is completely untouched.
--
-- Resulting login credentials (for the user to log in and immediately
-- change the password from account settings):
--   email:    rr.66633@gmail.com
--   password: Raghad240
--   role:     super_admin

INSERT INTO `organizations` (`name`, `nameAr`, `slug`, `edition`, `orgType`, `status`, `country`)
SELECT 'Nashaa', 'نشأة', 'nashaa', 'nashaa', 'nursery', 'active', 'SA'
WHERE NOT EXISTS (SELECT 1 FROM `organizations` WHERE `slug` = 'nashaa');
--> statement-breakpoint

INSERT INTO `users` (`openId`, `name`, `email`, `role`, `password`, `isActive`, `organizationId`, `language`)
SELECT
  'bootstrap-super-admin-nashaa-2026',
  'Super Admin',
  'rr.66633@gmail.com',
  'super_admin',
  '$2b$10$8KgA/ZM.SRqOmy6Krz6zMuS1Ll4Tvd/g8E6RDhyQLasGgHT4Y2lRG',
  1,
  (SELECT `id` FROM `organizations` WHERE `slug` = 'nashaa' LIMIT 1),
  'ar'
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `openId` = 'bootstrap-super-admin-nashaa-2026');
