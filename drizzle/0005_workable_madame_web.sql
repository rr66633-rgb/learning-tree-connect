CREATE TABLE `attendance_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceId` int NOT NULL,
	`childId` int NOT NULL,
	`previousStatus` varchar(50) NOT NULL,
	`newStatus` varchar(50) NOT NULL,
	`changedBy` int NOT NULL,
	`changedByName` varchar(200),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance` MODIFY COLUMN `status` enum('present','absent','late','excused','checked_in','checked_out') NOT NULL DEFAULT 'present';