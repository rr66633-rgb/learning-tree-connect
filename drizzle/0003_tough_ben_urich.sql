CREATE TABLE `child_departures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`attendanceId` int,
	`departureTime` timestamp NOT NULL,
	`pickedUpBy` varchar(200) NOT NULL,
	`relationship` enum('parent','driver','guardian','other') NOT NULL,
	`pickedUpById` int,
	`notes` text,
	`status` enum('completed','pending','late') NOT NULL DEFAULT 'completed',
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `child_departures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `daily_activities` MODIFY COLUMN `type` enum('arrival','breakfast','morning_snack','lunch','afternoon_snack','nap_start','nap_end','diaper','toilet','medication','mood','learning_activity','outdoor_play','departure','meal','snack','water','indoor_play','temperature','photo','note','observation') NOT NULL;