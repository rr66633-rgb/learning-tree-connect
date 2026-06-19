CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`parentId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`method` enum('apple_pay','mada','visa','mastercard','stc_pay','cash','bank_transfer') NOT NULL,
	`status` enum('initiated','paid','failed','expired','refunded') NOT NULL DEFAULT 'initiated',
	`moyasarPaymentId` varchar(100),
	`moyasarPaymentUrl` text,
	`callbackUrl` text,
	`metadata` json,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`parentId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`reason` text,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`moyasarRefundId` varchar(100),
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`parentId` int NOT NULL,
	`moyasarTransactionId` varchar(100),
	`type` enum('payment','refund','partial_refund') NOT NULL DEFAULT 'payment',
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`status` enum('completed','pending','failed','refunded') NOT NULL DEFAULT 'pending',
	`method` varchar(50),
	`cardBrand` varchar(50),
	`cardLast4` varchar(4),
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tuition_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`parentId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`frequency` enum('monthly','quarterly','semi_annual','annual') NOT NULL DEFAULT 'monthly',
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`nextBillingDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tuition_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `status` enum('pending','paid','overdue','cancelled','partially_paid') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `paymentMethod` enum('cash','bank_transfer','card','apple_pay','mada','stc_pay');--> statement-breakpoint
ALTER TABLE `invoices` ADD `invoiceType` enum('tuition','activity','trip','uniform','registration','other') DEFAULT 'tuition' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `isRecurring` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `tuitionPlanId` int;--> statement-breakpoint
ALTER TABLE `invoices` ADD `paidAmount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `createdBy` int;