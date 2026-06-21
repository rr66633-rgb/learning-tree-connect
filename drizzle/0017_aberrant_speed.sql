CREATE TABLE `authorized_pickup_persons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`relationship` enum('father','mother','grandfather','grandmother','driver','relative','other') NOT NULL,
	`phone` varchar(20),
	`nationalId` varchar(20),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authorized_pickup_persons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pickup_requests` MODIFY COLUMN `status` enum('waiting_teacher','sent_to_reception','waiting_at_reception','picked_up','cancelled') NOT NULL DEFAULT 'waiting_teacher';--> statement-breakpoint
ALTER TABLE `pickup_requests` ADD `teacherResponseAt` timestamp;--> statement-breakpoint
ALTER TABLE `pickup_requests` ADD `arrivedReceptionAt` timestamp;--> statement-breakpoint
ALTER TABLE `pickup_requests` ADD `pickedUpByRelationship` varchar(100);--> statement-breakpoint
ALTER TABLE `pickup_requests` ADD `teacherId` int;--> statement-breakpoint
ALTER TABLE `pickup_requests` ADD `receptionStaffId` int;--> statement-breakpoint
ALTER TABLE `pickup_requests` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `pickup_requests` DROP COLUMN `calledAt`;--> statement-breakpoint
ALTER TABLE `pickup_requests` DROP COLUMN `readyAt`;--> statement-breakpoint
ALTER TABLE `pickup_requests` DROP COLUMN `handledBy`;