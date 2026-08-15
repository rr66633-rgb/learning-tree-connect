ALTER TABLE `organization_subscriptions` ADD `moyasarPaymentId` varchar(255);--> statement-breakpoint
ALTER TABLE `organization_subscriptions` ADD `gracePeriodEnd` timestamp;--> statement-breakpoint
ALTER TABLE `organization_subscriptions` ADD `remindersSent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD `maxOrganizations` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD `pricePerExtraOrg` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD `trialDays` int DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD `discountExpiresAt` timestamp;