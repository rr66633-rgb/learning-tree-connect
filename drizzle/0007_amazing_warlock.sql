CREATE TABLE `parent_children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`relationship` varchar(50) NOT NULL DEFAULT 'parent',
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parent_children_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `children` ADD `arabicName` varchar(200);--> statement-breakpoint
ALTER TABLE `users` ADD `nationalId` varchar(20);