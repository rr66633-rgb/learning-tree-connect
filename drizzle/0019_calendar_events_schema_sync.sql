-- SECURITY/BUGFIX MIGRATION: calendar_events schema drift, plus a missing
-- `users` migration this migration depends on.
--
-- Root cause of "insert into calendar_events fails after deployment":
-- migration 0002_icy_lockjaw.sql created calendar_events with an old shape
-- (`title`, `startDate`, `type`, `classId`, `isAllDay`, no `organizationId`),
-- and NO migration since then ever brought the table in line with the
-- calendarEvents definition in drizzle/schema.ts (titleAr/titleEn,
-- eventDate/endDate/eventTime, location, requiredMaterials, dressCode,
-- category, audience, status, organizationId, updatedAt). The 0018 snapshot
-- (the last committed migration state) still shows the ORIGINAL 0002 shape,
-- confirming this table's schema was only ever changed in schema.ts and was
-- never migrated -- so `db.createCalendarEvent()` (server/db.ts), which
-- inserts by the new column names, fails against any database built from
-- these migration files, either with "Unknown column" errors for the new
-- columns or a NOT NULL violation on the legacy `title`/`startDate` columns
-- it no longer supplies.
--
-- SECOND, DEEPER ROOT CAUSE FOUND WHEN THIS MIGRATION WAS FIRST ACTUALLY RUN
-- against a real fresh database (2026-08-05): the multi-tenancy security
-- work that added `organizationId` (and `deletionRequestedAt` /
-- `deletionScheduledAt`) to the `users` table in drizzle/schema.ts was NEVER
-- accompanied by a migration file that adds those columns to the real
-- `users` table -- they exist only in schema.ts. Every one of the 0000-0018
-- migrations was grepped and none of them add `organizationId`,
-- `deletionRequestedAt`, or `deletionScheduledAt` to `users`. This is the
-- actual root cause of the production login 500 error (auth.login's SELECT
-- lists these columns) and of this migration's own backfill UPDATE below
-- (`... JOIN users u ... SET ce.organizationId = u.organizationId`) failing
-- with "Unknown column 'u.organizationId'". This migration now adds the
-- missing `users` columns FIRST, before doing anything else.
--
-- THIRD: because MySQL DDL auto-commits and cannot be rolled back, a prior
-- failed run of this exact migration (before the users fix above) may have
-- already applied some of the calendar_events ADD COLUMN / DROP COLUMN
-- statements below before failing on the users join. Every structural
-- statement in this file is therefore guarded with an
-- INFORMATION_SCHEMA.COLUMNS existence check via PREPARE/EXECUTE so the
-- whole file is safe to re-run to completion from any partially-applied
-- state.
--
-- This migration performs a data-preserving reshape: add every new column,
-- backfill each one from its legacy predecessor (including organizationId,
-- backfilled from the creating user's own organization), enforce NOT NULL
-- only once every row has a value, then drop the obsolete legacy columns.

--> statement-breakpoint
-- Add the missing users columns (guarded -- see THIRD note above).
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `users` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deletionRequestedAt') > 0,
	'SELECT 1',
	'ALTER TABLE `users` ADD COLUMN `deletionRequestedAt` timestamp'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deletionScheduledAt') > 0,
	'SELECT 1',
	'ALTER TABLE `users` ADD COLUMN `deletionScheduledAt` timestamp'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- Add every new calendar_events column (each guarded).
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'titleEn') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `titleEn` varchar(300)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'eventDate') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `eventDate` varchar(10)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'endDate_new') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `endDate_new` varchar(10)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'eventTime') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `eventTime` varchar(10)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'location') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `location` varchar(300)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'requiredMaterials') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `requiredMaterials` text'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'dressCode') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `dressCode` varchar(300)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'category') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `category` enum(''holiday'',''event'',''meeting'',''exam'',''activity'',''celebration'',''other'') DEFAULT ''event'' NOT NULL'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'audience') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `audience` enum(''all'',''parents'',''staff'',''admin'') DEFAULT ''all'' NOT NULL'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'status') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `status` enum(''draft'',''published'') DEFAULT ''draft'' NOT NULL'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `organizationId` int'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'updatedAt') > 0,
	'SELECT 1',
	'ALTER TABLE `calendar_events` ADD COLUMN `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

--> statement-breakpoint
-- Backfill new columns from their legacy predecessors for any existing rows.
-- (Naturally idempotent -- every UPDATE below is scoped with WHERE ... IS NULL
-- or only touches rows that still need it, and the legacy source columns
-- aren't dropped until after this block.)
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'title') > 0,
	'UPDATE `calendar_events` SET `titleEn` = `title` WHERE `titleEn` IS NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'title') > 0,
	'UPDATE `calendar_events` SET `titleAr` = `title` WHERE `titleAr` IS NULL OR `titleAr` = ''''',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'startDate') > 0,
	'UPDATE `calendar_events` SET `eventDate` = DATE_FORMAT(`startDate`, ''%Y-%m-%d'') WHERE `eventDate` IS NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'endDate' AND DATA_TYPE = 'timestamp') > 0,
	'UPDATE `calendar_events` SET `endDate_new` = DATE_FORMAT(`endDate`, ''%Y-%m-%d'') WHERE `endDate` IS NOT NULL AND `endDate_new` IS NULL',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'type') > 0,
	'UPDATE `calendar_events` SET `category` = CASE `type` WHEN ''trip'' THEN ''activity'' WHEN ''deadline'' THEN ''other'' WHEN ''holiday'' THEN ''holiday'' WHEN ''meeting'' THEN ''meeting'' ELSE ''event'' END',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
UPDATE `calendar_events` ce JOIN `users` u ON ce.`createdBy` = u.`id` SET ce.`organizationId` = u.`organizationId` WHERE ce.`organizationId` IS NULL;

--> statement-breakpoint
-- Any row whose creator has since been deleted (createdBy no longer joins to
-- a user) cannot be attributed to an organization automatically. Surface it
-- loudly instead of leaving organizationId NULL (which the NOT NULL below
-- would reject anyway) -- an operator must resolve these manually before
-- this migration can complete on a database with such orphaned rows.
SELECT COUNT(*) AS unresolved_calendar_events_missing_organization_id FROM `calendar_events` WHERE `organizationId` IS NULL;

--> statement-breakpoint
-- Enforce NOT NULL now that every row has a value. Safe to re-run.
ALTER TABLE `calendar_events` MODIFY COLUMN `titleAr` varchar(300) NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `eventDate` varchar(10) NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `organizationId` int NOT NULL;

--> statement-breakpoint
-- Swap the reshaped endDate into place and drop every obsolete legacy column
-- (each guarded so a partially-applied prior run can't fail here again).
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'endDate' AND DATA_TYPE = 'timestamp') > 0,
	'ALTER TABLE `calendar_events` DROP COLUMN `endDate`',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'endDate_new') > 0,
	'ALTER TABLE `calendar_events` RENAME COLUMN `endDate_new` TO `endDate`',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'title') > 0,
	'ALTER TABLE `calendar_events` DROP COLUMN `title`',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'startDate') > 0,
	'ALTER TABLE `calendar_events` DROP COLUMN `startDate`',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'type') > 0,
	'ALTER TABLE `calendar_events` DROP COLUMN `type`',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'classId') > 0,
	'ALTER TABLE `calendar_events` DROP COLUMN `classId`',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'isAllDay') > 0,
	'ALTER TABLE `calendar_events` DROP COLUMN `isAllDay`',
	'SELECT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
