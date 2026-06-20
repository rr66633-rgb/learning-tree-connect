ALTER TABLE `conversations` ADD `childId` int;--> statement-breakpoint
ALTER TABLE `conversations` ADD `subject` varchar(255);--> statement-breakpoint
ALTER TABLE `conversations` ADD `lastMessagePreview` varchar(255);--> statement-breakpoint
ALTER TABLE `conversations` ADD `isArchived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentUrl` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentType` varchar(50);--> statement-breakpoint
ALTER TABLE `messages` ADD `attachmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `messages` ADD `readAt` timestamp;--> statement-breakpoint
ALTER TABLE `messages` ADD `isDeleted` boolean DEFAULT false NOT NULL;