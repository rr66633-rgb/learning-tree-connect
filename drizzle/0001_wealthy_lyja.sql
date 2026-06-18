CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`date` timestamp NOT NULL,
	`status` enum('present','absent','late','excused') NOT NULL DEFAULT 'present',
	`checkInTime` timestamp,
	`checkOutTime` timestamp,
	`checkedInBy` int,
	`checkedOutBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`dateOfBirth` timestamp NOT NULL,
	`gender` enum('male','female') NOT NULL,
	`className` varchar(100),
	`parentId` int,
	`photo` text,
	`medicalNotes` text,
	`allergies` text,
	`emergencyContact` varchar(200),
	`emergencyPhone` varchar(20),
	`enrollmentDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('active','inactive','graduated') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `children_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantOneId` int NOT NULL,
	`participantTwoId` int NOT NULL,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`date` timestamp NOT NULL,
	`teacherId` int NOT NULL,
	`meals` json,
	`sleep` json,
	`toileting` json,
	`activities` text,
	`mood` enum('happy','calm','tired','upset','excited') DEFAULT 'happy',
	`teacherNotes` text,
	`photos` json,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`parentId` int NOT NULL,
	`invoiceNumber` varchar(50) NOT NULL,
	`description` text,
	`subtotal` decimal(10,2) NOT NULL,
	`vatRate` decimal(5,2) NOT NULL DEFAULT '15.00',
	`vatAmount` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp NOT NULL,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`points` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_rewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`nameAr` varchar(200) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`pointsCost` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_rewards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`points` int NOT NULL,
	`type` enum('earned','redeemed','adjusted') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`titleAr` varchar(200),
	`body` text NOT NULL,
	`bodyAr` text,
	`type` enum('attendance','report','message','payment','general') NOT NULL DEFAULT 'general',
	`isRead` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','teacher','parent','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `language` enum('ar','en') DEFAULT 'ar' NOT NULL;