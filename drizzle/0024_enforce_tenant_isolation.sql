-- Migration 0024: remove the silent "default to organization #1" fallback.
--
-- ROOT CAUSE of the reported bug "every nursery can see another nursery's data".
--
-- drizzle/schema.ts declares organizationId as .notNull() on 58 tables, but the
-- LIVE database never matched that. Migration 0021 deliberately relaxed every
-- organizationId column to `int DEFAULT 1` (nullable, defaulting to 1) to match
-- an older schema.ts that used .default(1). schema.ts was later hardened to
-- .notNull() during the multi-tenancy security pass, but no migration was ever
-- generated to bring the database back in line. The result, verified against a
-- freshly-migrated database:
--
--     38 tables : organizationId int NULL DEFAULT 1
--      3 tables : organizationId int NULL          (no default)
--     19 tables : organizationId int NOT NULL      (correct)
--
-- That produced tenant bleed in BOTH directions:
--
--   WRITE side -- any INSERT that omitted organizationId silently landed in
--   organization #1 instead of failing. db.upsertUser() did exactly this on its
--   create path, so users created through it became members of organization #1
--   and could then read organization #1's children, invoices and messages.
--
--   READ side -- organizationId being nullable meant ctx.organizationId could be
--   null, and essentially every query helper in server/db.ts is written as
--   `if (organizationId) conditions.push(eq(t.organizationId, organizationId))`.
--   A null organization therefore did not restrict the query -- it removed the
--   filter entirely, returning every tenant's rows. The isolation check failed
--   OPEN rather than closed.
--
-- This migration makes a forgotten organizationId a loud error at INSERT time
-- instead of a silent cross-tenant assignment.
--
-- SAFETY: NOT NULL is only applied to a table when that table currently has zero
-- NULL organizationId rows, checked at run time -- so this cannot fail on a
-- database that still holds unassigned rows. The DEFAULT is dropped
-- unconditionally either way, because the default is the actively dangerous
-- half: it converts "developer forgot to pass the org" into "row belongs to
-- organization #1". A table left nullable by the guard still fails closed on
-- read (a NULL org matches no organization's filter) rather than leaking.
-- Re-runnable from any partially-applied state.
--
-- NOT INCLUDED -- `notifications`: its organizationId is legitimately nullable.
-- server/registrationRouter.ts creates platform-level "a new nursery applied"
-- notices addressed to super_admins, which by definition belong to no
-- organization yet, and passes organizationId: null explicitly.


--> statement-breakpoint
-- achievement_badges
ALTER TABLE `achievement_badges` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `achievement_badges` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `achievement_badges` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- ai_development_analysis
ALTER TABLE `ai_development_analysis` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `ai_development_analysis` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `ai_development_analysis` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- ai_generated_content
ALTER TABLE `ai_generated_content` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `ai_generated_content` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `ai_generated_content` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- announcements
ALTER TABLE `announcements` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `announcements` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `announcements` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- attendance
ALTER TABLE `attendance` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `attendance` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `attendance` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- calendar_events
ALTER TABLE `calendar_events` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `calendar_events` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `calendar_events` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- center_settings
ALTER TABLE `center_settings` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `center_settings` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `center_settings` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- challenge_participations
ALTER TABLE `challenge_participations` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `challenge_participations` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `challenge_participations` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- child_development_summary
ALTER TABLE `child_development_summary` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `child_development_summary` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `child_development_summary` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- children
ALTER TABLE `children` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `children` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `children` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- classes
ALTER TABLE `classes` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `classes` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `classes` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- conversations
ALTER TABLE `conversations` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `conversations` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `conversations` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- curricula
ALTER TABLE `curricula` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `curricula` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `curricula` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- custom_assessments
ALTER TABLE `custom_assessments` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `custom_assessments` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `custom_assessments` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- daily_activities
ALTER TABLE `daily_activities` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `daily_activities` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `daily_activities` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- daily_reports
ALTER TABLE `daily_reports` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `daily_reports` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `daily_reports` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- development_alerts
ALTER TABLE `development_alerts` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `development_alerts` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `development_alerts` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- development_observations
ALTER TABLE `development_observations` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `development_observations` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `development_observations` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- development_recommendations
ALTER TABLE `development_recommendations` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `development_recommendations` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `development_recommendations` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- developmental_assessments
ALTER TABLE `developmental_assessments` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `developmental_assessments` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `developmental_assessments` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- documents
ALTER TABLE `documents` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `documents` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `documents` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- engagement_scores
ALTER TABLE `engagement_scores` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `engagement_scores` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `engagement_scores` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- eyfs_assessments
ALTER TABLE `eyfs_assessments` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `eyfs_assessments` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `eyfs_assessments` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- family_challenges
ALTER TABLE `family_challenges` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `family_challenges` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `family_challenges` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- home_journal_entries
ALTER TABLE `home_journal_entries` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `home_journal_entries` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `home_journal_entries` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- home_learning_activities
ALTER TABLE `home_learning_activities` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `home_learning_activities` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `home_learning_activities` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- invoices
ALTER TABLE `invoices` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `invoices` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `invoices` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- learning_observations
ALTER TABLE `learning_observations` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `learning_observations` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `learning_observations` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- loyalty_rewards
ALTER TABLE `loyalty_rewards` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `loyalty_rewards` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `loyalty_rewards` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- media
ALTER TABLE `media` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `media` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `media` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- monthly_growth_goals
ALTER TABLE `monthly_growth_goals` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `monthly_growth_goals` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `monthly_growth_goals` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- parent_badges
ALTER TABLE `parent_badges` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `parent_badges` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `parent_badges` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- parent_observations
ALTER TABLE `parent_observations` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `parent_observations` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `parent_observations` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- pickup_requests
ALTER TABLE `pickup_requests` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `pickup_requests` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `pickup_requests` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- school_readiness_scores
ALTER TABLE `school_readiness_scores` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `school_readiness_scores` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `school_readiness_scores` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- staff_attendance
ALTER TABLE `staff_attendance` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `staff_attendance` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `staff_attendance` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- users
ALTER TABLE `users` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `users` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `users` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- weekly_plans
ALTER TABLE `weekly_plans` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `weekly_plans` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `weekly_plans` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- pickup_alert_settings
ALTER TABLE `pickup_alert_settings` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `pickup_alert_settings` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `pickup_alert_settings` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- waiting_list
ALTER TABLE `waiting_list` ALTER COLUMN `organizationId` DROP DEFAULT;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM `waiting_list` WHERE `organizationId` IS NULL) = 0,
	'ALTER TABLE `waiting_list` MODIFY COLUMN `organizationId` int NOT NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
