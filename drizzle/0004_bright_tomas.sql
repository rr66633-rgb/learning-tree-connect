ALTER TABLE `child_departures` MODIFY COLUMN `relationship` enum('mother','father','driver','grandparent','guardian','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance` ADD `droppedOffBy` varchar(200);--> statement-breakpoint
ALTER TABLE `attendance` ADD `droppedOffRelationship` enum('mother','father','driver','grandparent','other');--> statement-breakpoint
ALTER TABLE `child_departures` ADD `signatureData` text;