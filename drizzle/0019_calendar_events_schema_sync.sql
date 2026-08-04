-- SECURITY/BUGFIX MIGRATION: calendar_events schema drift.
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
-- This migration performs a data-preserving reshape: add every new column,
-- backfill each one from its legacy predecessor (including organizationId,
-- backfilled from the creating user's own organization), enforce NOT NULL
-- only once every row has a value, then drop the obsolete legacy columns.

--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `titleEn` varchar(300);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `eventDate` varchar(10);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `endDate_new` varchar(10);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `eventTime` varchar(10);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `location` varchar(300);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `requiredMaterials` text;
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `dressCode` varchar(300);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `category` enum('holiday','event','meeting','exam','activity','celebration','other') DEFAULT 'event' NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `audience` enum('all','parents','staff','admin') DEFAULT 'all' NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `status` enum('draft','published') DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `organizationId` int;
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;
--> statement-breakpoint

-- Backfill new columns from their legacy predecessors for any existing rows.
UPDATE `calendar_events` SET `titleEn` = `title` WHERE `titleEn` IS NULL;
--> statement-breakpoint
UPDATE `calendar_events` SET `titleAr` = `title` WHERE `titleAr` IS NULL OR `titleAr` = '';
--> statement-breakpoint
UPDATE `calendar_events` SET `eventDate` = DATE_FORMAT(`startDate`, '%Y-%m-%d') WHERE `eventDate` IS NULL;
--> statement-breakpoint
UPDATE `calendar_events` SET `endDate_new` = DATE_FORMAT(`endDate`, '%Y-%m-%d') WHERE `endDate` IS NOT NULL;
--> statement-breakpoint
UPDATE `calendar_events` SET `category` = CASE `type`
	WHEN 'trip' THEN 'activity'
	WHEN 'deadline' THEN 'other'
	WHEN 'holiday' THEN 'holiday'
	WHEN 'meeting' THEN 'meeting'
	ELSE 'event'
END;
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

-- Enforce NOT NULL now that every row has a value.
ALTER TABLE `calendar_events` MODIFY COLUMN `titleAr` varchar(300) NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `eventDate` varchar(10) NOT NULL;
--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `organizationId` int NOT NULL;
--> statement-breakpoint

-- Swap the reshaped endDate into place and drop every obsolete legacy column.
ALTER TABLE `calendar_events` DROP COLUMN `endDate`;
--> statement-breakpoint
ALTER TABLE `calendar_events` RENAME COLUMN `endDate_new` TO `endDate`;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP COLUMN `title`;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP COLUMN `startDate`;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP COLUMN `type`;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP COLUMN `classId`;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP COLUMN `isAllDay`;
