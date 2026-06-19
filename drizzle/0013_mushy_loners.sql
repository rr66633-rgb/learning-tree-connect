CREATE TABLE `learning_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`observedBy` int NOT NULL,
	`area` varchar(200) NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text NOT NULL,
	`evidence` text,
	`nextSteps` text,
	`linkedAssessmentId` int,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learning_observations_id` PRIMARY KEY(`id`)
);
