CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`audience` enum('all','parents','staff','class') NOT NULL DEFAULT 'all',
	`classId` int,
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`resource` varchar(100) NOT NULL,
	`resourceId` int,
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`titleAr` varchar(200),
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`type` enum('holiday','event','trip','meeting','deadline') NOT NULL DEFAULT 'event',
	`classId` int,
	`isAllDay` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `center_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`centerName` varchar(200) NOT NULL DEFAULT 'Learning Tree Kids Center',
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`allowedRadius` int NOT NULL DEFAULT 100,
	`address` text,
	`phone` varchar(20),
	`email` varchar(320),
	`workingHoursStart` varchar(10) DEFAULT '07:00',
	`workingHoursEnd` varchar(10) DEFAULT '17:00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `center_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100),
	`ageGroup` varchar(50),
	`capacity` int NOT NULL DEFAULT 20,
	`teacherId` int,
	`assistantId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`classId` int,
	`type` enum('meal','snack','nap_start','nap_end','diaper','toilet','water','medication','outdoor_play','indoor_play','mood','temperature','photo','note','observation') NOT NULL,
	`details` json,
	`notes` text,
	`photoUrl` text,
	`recordedBy` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('policy','form','consent','report','other') NOT NULL DEFAULT 'other',
	`url` text NOT NULL,
	`childId` int,
	`requiresSignature` boolean NOT NULL DEFAULT false,
	`audience` enum('all','parents','staff') NOT NULL DEFAULT 'all',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emergency_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`relationship` varchar(100) NOT NULL,
	`isAuthorizedPickup` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emergency_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`classId` int,
	`status` enum('active','pending','completed','withdrawn') NOT NULL DEFAULT 'pending',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eyfs_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`area` varchar(200) NOT NULL,
	`aspect` varchar(200),
	`level` enum('emerging','developing','secure','exceeding') NOT NULL DEFAULT 'emerging',
	`notes` text,
	`assessedBy` int NOT NULL,
	`assessedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eyfs_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`conditions` text,
	`medications` text,
	`allergies` text,
	`doctorName` varchar(200),
	`doctorPhone` varchar(20),
	`insuranceInfo` text,
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_info_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`parentId` int NOT NULL,
	`signatureData` text,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` timestamp NOT NULL,
	`checkInTime` timestamp,
	`checkOutTime` timestamp,
	`checkInLat` decimal(10,7),
	`checkInLng` decimal(10,7),
	`checkOutLat` decimal(10,7),
	`checkOutLng` decimal(10,7),
	`deviceInfo` text,
	`status` enum('checked_in','checked_out','absent','late') NOT NULL DEFAULT 'checked_in',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waiting_list` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childName` varchar(200) NOT NULL,
	`parentName` varchar(200) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`dateOfBirth` timestamp,
	`preferredClass` varchar(100),
	`notes` text,
	`status` enum('waiting','contacted','enrolled','cancelled') NOT NULL DEFAULT 'waiting',
	`priority` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waiting_list_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `children` MODIFY COLUMN `status` enum('active','inactive','graduated','waitlist') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('attendance','report','message','payment','general','activity','announcement') NOT NULL DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','principal','teacher','assistant','accountant','receptionist','parent','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `children` ADD `classId` int;--> statement-breakpoint
ALTER TABLE `children` ADD `bloodType` varchar(10);--> statement-breakpoint
ALTER TABLE `invoices` ADD `receiptUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `children` DROP COLUMN `className`;--> statement-breakpoint
ALTER TABLE `children` DROP COLUMN `emergencyContact`;--> statement-breakpoint
ALTER TABLE `children` DROP COLUMN `emergencyPhone`;