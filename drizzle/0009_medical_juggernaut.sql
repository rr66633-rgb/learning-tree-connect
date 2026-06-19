CREATE TABLE `child_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`type` enum('birth_certificate','family_id','immunization','passport','national_id','medical_report','allergy_report','photo','other') NOT NULL DEFAULT 'other',
	`name` varchar(200) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500),
	`mimeType` varchar(100),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewNote` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `child_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('photo','video') NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500),
	`thumbnailUrl` text,
	`caption` text,
	`mimeType` varchar(100),
	`fileSize` int,
	`uploadedBy` int NOT NULL,
	`classId` int,
	`visibility` enum('class','specific') NOT NULL DEFAULT 'class',
	`isApproved` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_children` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mediaId` int NOT NULL,
	`childId` int NOT NULL,
	CONSTRAINT `media_children_id` PRIMARY KEY(`id`)
);
