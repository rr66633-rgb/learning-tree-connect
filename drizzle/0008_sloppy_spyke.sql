ALTER TABLE `children` ADD `nationality` varchar(100);--> statement-breakpoint
ALTER TABLE `children` ADD `childNationalId` varchar(20);--> statement-breakpoint
ALTER TABLE `children` ADD `fatherName` varchar(200);--> statement-breakpoint
ALTER TABLE `children` ADD `motherName` varchar(200);--> statement-breakpoint
ALTER TABLE `children` ADD `parentEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `children` ADD `parentMobile` varchar(20);--> statement-breakpoint
ALTER TABLE `children` ADD `altPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `children` ADD `homeAddress` text;--> statement-breakpoint
ALTER TABLE `children` ADD `medicalConditions` text;--> statement-breakpoint
ALTER TABLE `children` ADD `medications` text;--> statement-breakpoint
ALTER TABLE `children` ADD `specialNeeds` text;--> statement-breakpoint
ALTER TABLE `children` ADD `doctorName` varchar(200);--> statement-breakpoint
ALTER TABLE `children` ADD `pickupAuthorization` text;--> statement-breakpoint
ALTER TABLE `children` ADD `busRequired` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `children` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);