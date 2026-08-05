-- Migration 0021: correct schema drift introduced by 0020 due to a stale
-- local schema.ts snapshot used when authoring that migration.
--
-- Two issues found after 0020 partially applied in production:
--
-- 1. `fcm_tokens` (FCM push-notification tokens, 8 columns) exists in the
--    real drizzle/schema.ts but was absent from the working copy used to
--    build 0020, so it was never created. Added here via
--    CREATE TABLE IF NOT EXISTS (safe no-op if it already exists).
--
-- 2. Every `organizationId` column added by 0020 (across 37 new/existing
--    tables, including `users` and `calendar_events` from earlier
--    migrations) was created as `NOT NULL DEFAULT 1`, but the real
--    schema.ts declares these columns as `int("organizationId").default(1)`
--    -- i.e. nullable with a default, not NOT NULL. This mismatch caused
--    `drizzle-kit generate` to keep proposing new corrective migrations on
--    every subsequent deploy. Relaxed via MODIFY COLUMN (idempotent -- safe
--    to re-run) to match schema.ts exactly.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fcm_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` text NOT NULL,
	`device` varchar(100),
	`platform` enum('web','android','ios') NOT NULL DEFAULT 'web',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fcm_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `achievement_badges` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `ai_development_analysis` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `ai_generated_content` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `attendance` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `center_settings` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `challenge_participations` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `child_development_summary` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `children` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `classes` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `curricula` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `custom_assessments` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `daily_activities` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `daily_reports` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `development_alerts` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `development_observations` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `development_recommendations` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `developmental_assessments` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `documents` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `engagement_scores` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `eyfs_assessments` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `family_challenges` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `home_journal_entries` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `home_learning_activities` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `learning_observations` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `loyalty_rewards` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `monthly_growth_goals` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `parent_badges` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `parent_observations` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `pickup_requests` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `school_readiness_scores` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `staff_attendance` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `organizationId` int DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `weekly_plans` MODIFY COLUMN `organizationId` int DEFAULT 1;