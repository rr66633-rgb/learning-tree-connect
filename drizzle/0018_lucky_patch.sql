CREATE TABLE `pickup_alert_acknowledgments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pickupRequestId` int NOT NULL,
	`userId` int NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pickup_alert_acknowledgments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pickup_alert_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`volume` int NOT NULL DEFAULT 80,
	`tone` enum('urgent','gentle','alarm','chime') NOT NULL DEFAULT 'urgent',
	`repeatIntervalSeconds` int NOT NULL DEFAULT 5,
	`escalationMinutes` int NOT NULL DEFAULT 2,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pickup_alert_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_duty_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`isOnDuty` boolean NOT NULL DEFAULT true,
	`lastToggleAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_duty_status_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_duty_status_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `weekly_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int,
	`teacherId` int NOT NULL,
	`ageGroup` enum('nursery','kg1','kg2','kg3') NOT NULL,
	`weekStartDate` varchar(10) NOT NULL,
	`weekEndDate` varchar(10) NOT NULL,
	`theme` varchar(300) NOT NULL,
	`language` enum('ar','en','bilingual') NOT NULL DEFAULT 'ar',
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`sections` json NOT NULL,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pickup_requests` ADD `escalatedAt` timestamp;