CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`identifier` varchar(320),
	`ip` varchar(45),
	`success` boolean NOT NULL DEFAULT false,
	`reason` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`phone` varchar(20),
	`email` varchar(320),
	`code` varchar(6) NOT NULL,
	`type` enum('registration','password_reset','login_verification','phone_verification','email_verification') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`type` enum('email_link','otp') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `failedLoginAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `accountLockedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordChangedAt` timestamp;