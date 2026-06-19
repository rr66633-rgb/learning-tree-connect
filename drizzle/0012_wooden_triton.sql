CREATE TABLE `pickup_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`parentId` int NOT NULL,
	`status` enum('waiting','called','ready','picked_up','cancelled') NOT NULL DEFAULT 'waiting',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`calledAt` timestamp,
	`readyAt` timestamp,
	`pickedUpAt` timestamp,
	`pickedUpBy` varchar(255),
	`handledBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pickup_requests_id` PRIMARY KEY(`id`)
);
