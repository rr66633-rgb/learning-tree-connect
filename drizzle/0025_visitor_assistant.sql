-- Platform-wide visibility control for the public website assistant.
-- The singleton row is created enabled so deploying the feature makes it
-- available immediately; the platform super admin can disable it at any time.

CREATE TABLE IF NOT EXISTS `visitor_assistant_settings` (
	`id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitor_assistant_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT IGNORE INTO `visitor_assistant_settings` (`id`, `enabled`) VALUES (1, true);
