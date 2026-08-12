CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`recipientEmail` varchar(255) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(500) NOT NULL,
	`type` varchar(50) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'sent',
	`error` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitor_assistant_settings` (
	`id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitor_assistant_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_plan_generation_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` varchar(36) NOT NULL,
	`organizationId` int NOT NULL,
	`teacherId` int NOT NULL,
	`classId` int,
	`ageGroup` enum('nursery','kg1','kg2','kg3') NOT NULL,
	`weekStartDate` varchar(10) NOT NULL,
	`weekEndDate` varchar(10) NOT NULL,
	`theme` varchar(300) NOT NULL,
	`language` enum('ar','en','bilingual') NOT NULL DEFAULT 'ar',
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`stage` enum('queued','generating','validating','saving','completed','failed') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 5,
	`planId` int,
	`errorCode` varchar(50),
	`errorMessage` text,
	`attempts` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_plan_generation_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_plan_generation_jobs_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
ALTER TABLE `ai_generated_content` MODIFY COLUMN `type` enum('observation','weekly_plan','activity','progress_report','parent_message','newsletter','story','marketing') NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_generated_content` MODIFY COLUMN `language` enum('ar','en','bilingual') NOT NULL DEFAULT 'bilingual';--> statement-breakpoint
ALTER TABLE `ai_generated_content` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_library` MODIFY COLUMN `category` enum('observation','weekly_plan','activity','progress_report','parent_message','newsletter','story','marketing') NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `center_settings` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `children` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `children` MODIFY COLUMN `attendanceDays` json DEFAULT ('[0,1,2,3,4]');--> statement-breakpoint
ALTER TABLE `classes` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_activities` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_reports` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `eyfs_assessments` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_observations` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `loyalty_rewards` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('attendance','report','message','payment','general','activity','announcement','registration','system') NOT NULL DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `pickup_requests` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `staff_attendance` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','principal','owner','teacher','assistant','accountant','receptionist','parent','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `waiting_list` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_plans` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `development_observations` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `school_readiness_scores` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_development_analysis` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `development_recommendations` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `development_alerts` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `child_development_summary` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `home_learning_activities` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `family_challenges` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `challenge_participations` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `home_journal_entries` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `parent_observations` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_growth_goals` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `engagement_scores` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `achievement_badges` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `parent_badges` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developmental_assessments` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `curricula` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_assessments` MODIFY COLUMN `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `fcm_tokens` MODIFY COLUMN `device` varchar(255);--> statement-breakpoint
ALTER TABLE `organizations` ADD `paymentEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `moyasarPublishableKey` varchar(255);--> statement-breakpoint
ALTER TABLE `organizations` ADD `moyasarSecretKey` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `ux_users_email` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `idx_weekly_plan_jobs_org_user_created` ON `weekly_plan_generation_jobs` (`organizationId`,`teacherId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_weekly_plan_jobs_status_updated` ON `weekly_plan_generation_jobs` (`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `idx_ai_content_org_user_created` ON `ai_generated_content` (`organizationId`,`createdBy`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_ai_content_org_type_created` ON `ai_generated_content` (`organizationId`,`type`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_ai_library_user_created` ON `ai_library` (`savedBy`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_attendance_org_date` ON `attendance` (`organizationId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_attendance_org_child_date` ON `attendance` (`organizationId`,`childId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_children_org_created` ON `children` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_children_org_class_status` ON `children` (`organizationId`,`classId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_children_parent_org` ON `children` (`parentId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_classes_org_active` ON `classes` (`organizationId`,`isActive`);--> statement-breakpoint
CREATE INDEX `idx_classes_org_teacher` ON `classes` (`organizationId`,`teacherId`);--> statement-breakpoint
CREATE INDEX `idx_conversations_org_archived_last` ON `conversations` (`organizationId`,`isArchived`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `idx_conversations_participant_one` ON `conversations` (`participantOneId`,`isArchived`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `idx_conversations_participant_two` ON `conversations` (`participantTwoId`,`isArchived`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `idx_daily_activities_org_child_recorded` ON `daily_activities` (`organizationId`,`childId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `idx_daily_activities_org_class_recorded` ON `daily_activities` (`organizationId`,`classId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `idx_daily_reports_org_date` ON `daily_reports` (`organizationId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_reports_org_child_date` ON `daily_reports` (`organizationId`,`childId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_media_org_created` ON `media` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_media_org_class_approved_created` ON `media` (`organizationId`,`classId`,`isApproved`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_media_children_child_media` ON `media_children` (`childId`,`mediaId`);--> statement-breakpoint
CREATE INDEX `idx_media_children_media` ON `media_children` (`mediaId`);--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversationId`,`isDeleted`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_unread` ON `messages` (`conversationId`,`isRead`,`isDeleted`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `idx_parent_children_parent_child` ON `parent_children` (`parentId`,`childId`);--> statement-breakpoint
CREATE INDEX `idx_parent_children_child_parent` ON `parent_children` (`childId`,`parentId`);--> statement-breakpoint
CREATE INDEX `idx_pickup_org_status_requested` ON `pickup_requests` (`organizationId`,`status`,`requestedAt`);--> statement-breakpoint
CREATE INDEX `idx_pickup_parent_requested` ON `pickup_requests` (`parentId`,`requestedAt`);--> statement-breakpoint
CREATE INDEX `idx_pickup_child_status_requested` ON `pickup_requests` (`childId`,`status`,`requestedAt`);--> statement-breakpoint
CREATE INDEX `idx_push_subscriptions_user` ON `push_subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_staff_attendance_org_date` ON `staff_attendance` (`organizationId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_staff_attendance_org_user_date` ON `staff_attendance` (`organizationId`,`userId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_users_org_role_active` ON `users` (`organizationId`,`role`,`isActive`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_waiting_list_org_priority_created` ON `waiting_list` (`organizationId`,`priority`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_weekly_plans_org_created` ON `weekly_plans` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_weekly_plans_org_teacher_created` ON `weekly_plans` (`organizationId`,`teacherId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_weekly_plans_org_class_status_published` ON `weekly_plans` (`organizationId`,`classId`,`status`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `idx_organizations_status_name` ON `organizations` (`status`,`nameAr`);--> statement-breakpoint
CREATE INDEX `idx_readiness_org_user_ai_created` ON `school_readiness_scores` (`organizationId`,`assessedBy`,`aiGenerated`,`createdAt`);