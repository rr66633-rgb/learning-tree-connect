CREATE TABLE `ai_generated_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('observation','weekly_plan','activity','progress_report','parent_message','newsletter','story') NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` json NOT NULL,
	`language` enum('ar','en') NOT NULL DEFAULT 'ar',
	`childId` int,
	`classId` int,
	`ageGroup` varchar(50),
	`theme` varchar(200),
	`inputPrompt` text,
	`createdBy` int NOT NULL,
	`isSaved` boolean NOT NULL DEFAULT false,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_generated_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentId` int NOT NULL,
	`category` enum('observation','weekly_plan','activity','progress_report','parent_message','newsletter','story') NOT NULL,
	`tags` json,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`usageCount` int NOT NULL DEFAULT 0,
	`savedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_library_id` PRIMARY KEY(`id`)
);
