-- Migration 0020: Schema catch-up for multi-tenancy security work
--
-- Context: schema.ts was edited directly (adding organizationId and other
-- columns to ~74 tables, plus 52 brand-new tables) as part of the multi-tenant
-- isolation hardening pass, but drizzle-kit generate was never run at the time,
-- so no migration ever shipped these changes. This left the live database
-- badly out of sync with schema.ts, which is what caused auth.login (and many
-- other queries) to fail with "Unknown column" errors.
--
-- This migration is intentionally NON-DESTRUCTIVE:
--   - New tables use CREATE TABLE IF NOT EXISTS (safe no-op if a prior partial
--     deploy already created them).
--   - New columns on existing tables use a guarded PREPARE/EXECUTE pattern
--     that checks INFORMATION_SCHEMA.COLUMNS before running ALTER TABLE, since
--     MySQL has no ADD COLUMN IF NOT EXISTS. Safe no-op if already applied.
--   - No DROP TABLE / DROP COLUMN statements are included anywhere in this
--     file. Some tables from a previous failed deploy attempt may already
--     exist with partial/legacy shape; this migration only adds what's
--     missing and never removes existing data or columns.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `event_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`reminderType` enum('parent_upcoming','parent_update','parent_cancellation','teacher_preparation','teacher_materials','teacher_setup','manual') NOT NULL DEFAULT 'parent_upcoming',
	`daysBefore` int NOT NULL DEFAULT 0,
	`scheduledAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`status` enum('pending','sent','cancelled') NOT NULL DEFAULT 'pending',
	`audience` enum('all','parents','staff','admin') NOT NULL DEFAULT 'all',
	`message` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `announcement_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcement_reads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `loyalty_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`pointsPerReferral` int NOT NULL DEFAULT 100,
	`pointsPerOnTimePayment` int NOT NULL DEFAULT 20,
	`pointsPerPerfectAttendanceWeek` int NOT NULL DEFAULT 10,
	`pointsPerEventParticipation` int NOT NULL DEFAULT 15,
	`pointsPerSurveyCompletion` int NOT NULL DEFAULT 5,
	`pointsPerEarlyPickup` int NOT NULL DEFAULT 5,
	`isActive` boolean NOT NULL DEFAULT true,
	`welcomeBonus` int NOT NULL DEFAULT 50,
	`birthdayBonus` int NOT NULL DEFAULT 25,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `loyalty_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rewardId` int NOT NULL,
	`pointsSpent` int NOT NULL,
	`status` enum('pending','approved','fulfilled','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`fulfilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`nameAr` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`domain` varchar(255),
	`edition` enum('learning_tree','nashaa') NOT NULL DEFAULT 'nashaa',
	`orgType` enum('nursery','school','independent_teacher') NOT NULL DEFAULT 'nursery',
	`status` enum('active','suspended','pending','trial') NOT NULL DEFAULT 'pending',
	`logoUrl` text,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`country` varchar(100) DEFAULT 'SA',
	`licenseNumber` varchar(100),
	`maxChildren` int DEFAULT 50,
	`maxStaff` int DEFAULT 20,
	`subscriptionPlanId` int,
	`trialEndsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `organization_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`primaryColor` varchar(20) DEFAULT '#10b981',
	`secondaryColor` varchar(20) DEFAULT '#059669',
	`accentColor` varchar(20) DEFAULT '#34d399',
	`backgroundColor` varchar(20) DEFAULT '#0f172a',
	`textColor` varchar(20) DEFAULT '#f8fafc',
	`logoUrl` text,
	`logoLightUrl` text,
	`appIcon` text,
	`splashScreenUrl` text,
	`fontFamily` varchar(100) DEFAULT 'Noto Sans Arabic',
	`borderRadius` varchar(20) DEFAULT '0.5rem',
	`sidebarStyle` enum('dark','light','gradient') DEFAULT 'dark',
	`customCss` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_branding_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_branding_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`tier` enum('starter','professional','enterprise') NOT NULL,
	`priceMonthly` decimal(10,2) NOT NULL DEFAULT '0.00',
	`priceYearly` decimal(10,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`maxChildren` int NOT NULL DEFAULT 30,
	`maxStaff` int NOT NULL DEFAULT 10,
	`maxClasses` int NOT NULL DEFAULT 5,
	`storageGb` int NOT NULL DEFAULT 5,
	`features` json NOT NULL,
	`hasAiTools` boolean NOT NULL DEFAULT false,
	`hasCustomBranding` boolean NOT NULL DEFAULT false,
	`hasAdvancedReports` boolean NOT NULL DEFAULT false,
	`hasParentApp` boolean NOT NULL DEFAULT true,
	`hasPushNotifications` boolean NOT NULL DEFAULT true,
	`hasApiAccess` boolean NOT NULL DEFAULT false,
	`prioritySupport` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`discountPercentage` decimal(5,2) DEFAULT '0.00',
	`discountEnabled` boolean DEFAULT false,
	`originalPriceYearly` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `organization_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('active','expired','cancelled','past_due','trialing') NOT NULL DEFAULT 'trialing',
	`billingCycle` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`currentPeriodStart` timestamp NOT NULL,
	`currentPeriodEnd` timestamp NOT NULL,
	`cancelledAt` timestamp,
	`cancelReason` text,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','principal','teacher','assistant','accountant','receptionist','parent') NOT NULL DEFAULT 'parent',
	`isActive` boolean NOT NULL DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `development_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`nameEn` varchar(200) NOT NULL,
	`nameAr` varchar(200) NOT NULL,
	`category` enum('prime','specific') NOT NULL,
	`parentAreaId` int,
	`description` text,
	`descriptionAr` text,
	`ageRangeMonths` varchar(20),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `development_areas_id` PRIMARY KEY(`id`),
	CONSTRAINT `development_areas_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `development_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`areaId` int NOT NULL,
	`ageRangeStart` int NOT NULL,
	`ageRangeEnd` int NOT NULL,
	`titleEn` varchar(300) NOT NULL,
	`titleAr` varchar(300) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`expectedLevel` enum('emerging','developing','secure','exceeding') NOT NULL DEFAULT 'developing',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `development_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `development_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`areaId` int NOT NULL,
	`observedBy` int NOT NULL,
	`level` enum('emerging','developing','secure','exceeding') NOT NULL DEFAULT 'emerging',
	`confidenceLevel` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`context` enum('free_play','guided_activity','group_work','outdoor','routine','assessment','other') NOT NULL DEFAULT 'guided_activity',
	`observation` text NOT NULL,
	`evidence` text,
	`nextSteps` text,
	`linkedMilestoneId` int,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`termPeriod` enum('autumn_1','autumn_2','spring_1','spring_2','summer_1','summer_2') NOT NULL DEFAULT 'autumn_1',
	`academicYear` varchar(10),
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `school_readiness_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`assessedBy` int NOT NULL,
	`languageReadiness` int NOT NULL DEFAULT 0,
	`socialReadiness` int NOT NULL DEFAULT 0,
	`emotionalReadiness` int NOT NULL DEFAULT 0,
	`cognitiveReadiness` int NOT NULL DEFAULT 0,
	`physicalReadiness` int NOT NULL DEFAULT 0,
	`overallReadiness` int NOT NULL DEFAULT 0,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`notes` text,
	`termPeriod` enum('autumn_1','autumn_2','spring_1','spring_2','summer_1','summer_2') NOT NULL DEFAULT 'autumn_1',
	`academicYear` varchar(10),
	`organizationId` int NOT NULL,
	`assessedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `school_readiness_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_development_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`analysisType` enum('strengths','concerns','recommendations','full_report','school_readiness','intervention') NOT NULL,
	`content` text NOT NULL,
	`contentAr` text,
	`confidence` decimal(3,2),
	`basedOnObservations` int NOT NULL DEFAULT 0,
	`termPeriod` enum('autumn_1','autumn_2','spring_1','spring_2','summer_1','summer_2') NOT NULL DEFAULT 'autumn_1',
	`academicYear` varchar(10),
	`organizationId` int NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_development_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `development_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`areaId` int NOT NULL,
	`type` enum('classroom_activity','home_activity','intervention','enrichment','parent_tip') NOT NULL,
	`titleEn` varchar(300) NOT NULL,
	`titleAr` varchar(300) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','dismissed') NOT NULL DEFAULT 'pending',
	`aiGenerated` boolean NOT NULL DEFAULT true,
	`completedAt` timestamp,
	`completedBy` int,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `development_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`areaId` int,
	`alertType` enum('limited_progress','below_expectations','follow_up_needed','multiple_concerns','regression','milestone_delayed') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`titleEn` varchar(300) NOT NULL,
	`titleAr` varchar(300) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`suggestedAction` text,
	`status` enum('active','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'active',
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`resolutionNotes` text,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `child_development_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`totalObservations` int NOT NULL DEFAULT 0,
	`lastObservationDate` timestamp,
	`averageLevel` decimal(3,2),
	`strongestAreaId` int,
	`weakestAreaId` int,
	`schoolReadinessScore` int,
	`alertCount` int NOT NULL DEFAULT 0,
	`lastAnalysisDate` timestamp,
	`termPeriod` enum('autumn_1','autumn_2','spring_1','spring_2','summer_1','summer_2') NOT NULL DEFAULT 'autumn_1',
	`academicYear` varchar(10),
	`organizationId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `child_development_summary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `home_learning_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`parentId` int NOT NULL,
	`category` enum('language','fine_motor','gross_motor','social_emotional','early_math','literacy','creative','outdoor') NOT NULL,
	`titleEn` varchar(300) NOT NULL,
	`titleAr` varchar(300) NOT NULL,
	`descriptionEn` text NOT NULL,
	`descriptionAr` text NOT NULL,
	`materialsEn` text,
	`materialsAr` text,
	`stepsEn` text,
	`stepsAr` text,
	`duration` int,
	`difficulty` enum('easy','medium','challenging') NOT NULL DEFAULT 'easy',
	`ageGroupMonths` int,
	`eyfsAreaId` int,
	`status` enum('pending','completed','skipped') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`parentFeedback` text,
	`rating` int,
	`weekNumber` int,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `home_learning_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `family_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleEn` varchar(300) NOT NULL,
	`titleAr` varchar(300) NOT NULL,
	`descriptionEn` text NOT NULL,
	`descriptionAr` text NOT NULL,
	`category` enum('reading','kindness','creativity','outdoor','stem','social','health','cultural') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'easy',
	`durationDays` int NOT NULL DEFAULT 7,
	`pointsReward` int NOT NULL DEFAULT 10,
	`badgeId` int,
	`weekNumber` int,
	`academicYear` varchar(10),
	`isActive` boolean NOT NULL DEFAULT true,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `challenge_participations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`status` enum('enrolled','in_progress','completed','expired') NOT NULL DEFAULT 'enrolled',
	`progressPercent` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`evidenceUrl` text,
	`notes` text,
	`pointsEarned` int DEFAULT 0,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challenge_participations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `home_journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`parentId` int NOT NULL,
	`entryType` enum('photo','video','note','achievement','milestone') NOT NULL,
	`title` varchar(300),
	`description` text,
	`mediaUrl` text,
	`mediaType` varchar(50),
	`eyfsAreaId` int,
	`developmentAreaId` int,
	`status` enum('pending_review','approved','needs_revision','rejected') NOT NULL DEFAULT 'pending_review',
	`teacherReviewNotes` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`isHighlighted` boolean NOT NULL DEFAULT false,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `home_journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parent_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`parentId` int NOT NULL,
	`observationText` text NOT NULL,
	`context` enum('home_play','outdoor','social','mealtime','bedtime','learning','creative','other') NOT NULL DEFAULT 'home_play',
	`mediaUrl` text,
	`aiAnalysis` json,
	`aiSuggestedAreaIds` json,
	`significance` enum('routine','notable','significant','concern') NOT NULL DEFAULT 'routine',
	`teacherStatus` enum('pending','reviewed','flagged','linked_to_assessment') NOT NULL DEFAULT 'pending',
	`teacherNotes` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`linkedObservationId` int,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parent_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `monthly_growth_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`parentId` int NOT NULL,
	`titleEn` varchar(300) NOT NULL,
	`titleAr` varchar(300) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`category` enum('vocabulary','fine_motor','gross_motor','social','independence','literacy','numeracy','creativity') NOT NULL,
	`targetMonth` int NOT NULL,
	`targetYear` int NOT NULL,
	`progressPercent` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','partially_completed','not_started') NOT NULL DEFAULT 'not_started',
	`completedAt` timestamp,
	`suggestedActivities` json,
	`parentNotes` text,
	`teacherNotes` text,
	`basedOnAreaId` int,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_growth_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `engagement_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`period` enum('weekly','monthly','term','annual') NOT NULL,
	`periodValue` varchar(20) NOT NULL,
	`activitiesCompleted` int NOT NULL DEFAULT 0,
	`challengesCompleted` int NOT NULL DEFAULT 0,
	`journalEntries` int NOT NULL DEFAULT 0,
	`observationsSubmitted` int NOT NULL DEFAULT 0,
	`goalsCompleted` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`score` int NOT NULL DEFAULT 0,
	`level` enum('inactive','emerging','developing','active','highly_engaged','champion') NOT NULL DEFAULT 'inactive',
	`streak` int NOT NULL DEFAULT 0,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `engagement_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `achievement_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(200) NOT NULL,
	`nameAr` varchar(200) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`icon` varchar(100) NOT NULL,
	`category` enum('activity','challenge','journal','observation','goal','streak','milestone') NOT NULL,
	`criteria` json,
	`pointsRequired` int DEFAULT 0,
	`tier` enum('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
	`isActive` boolean NOT NULL DEFAULT true,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievement_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parent_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`badgeId` int NOT NULL,
	`childId` int,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	`organizationId` int NOT NULL,
	CONSTRAINT `parent_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `family_engagement_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`activitiesPerWeek` int NOT NULL DEFAULT 3,
	`challengesEnabled` boolean NOT NULL DEFAULT true,
	`journalEnabled` boolean NOT NULL DEFAULT true,
	`parentObservationsEnabled` boolean NOT NULL DEFAULT true,
	`chatbotEnabled` boolean NOT NULL DEFAULT true,
	`gamificationEnabled` boolean NOT NULL DEFAULT true,
	`autoGenerateGoals` boolean NOT NULL DEFAULT true,
	`defaultLanguage` enum('ar','en','both') NOT NULL DEFAULT 'both',
	`customBranding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_engagement_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `nursery_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nurseryName` varchar(200) NOT NULL,
	`nurseryNameAr` varchar(200) NOT NULL,
	`city` varchar(100) NOT NULL,
	`district` varchar(200),
	`childrenCount` int NOT NULL,
	`staffCount` int NOT NULL,
	`licenseNumber` varchar(100),
	`ownerName` varchar(200) NOT NULL,
	`ownerEmail` varchar(320) NOT NULL,
	`ownerPhone` varchar(20) NOT NULL,
	`ownerPassword` varchar(255) NOT NULL,
	`selectedPlan` enum('basic','professional','enterprise') NOT NULL,
	`billingCycle` enum('yearly') NOT NULL DEFAULT 'yearly',
	`status` enum('pending','approved','rejected','converted') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`rejectionReason` text,
	`convertedOrganizationId` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`reviewedAt` timestamp,
	`reviewedBy` int,
	CONSTRAINT `nursery_registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staff_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`fullNameAr` varchar(200),
	`fullNameEn` varchar(200),
	`nationalId` varchar(20),
	`iqamaNumber` varchar(20),
	`dateOfBirth` timestamp,
	`gender` enum('male','female'),
	`nationality` varchar(100),
	`maritalStatus` enum('single','married','divorced','widowed'),
	`mobile` varchar(20),
	`altPhone` varchar(20),
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`jobTitle` enum('teacher','supervisor','principal','assistant','admin_staff','specialist','accountant','receptionist','driver','other') NOT NULL,
	`customJobTitle` varchar(200),
	`department` varchar(200),
	`branch` varchar(200),
	`hireDate` timestamp,
	`contractType` enum('full_time','part_time','contract','temporary') DEFAULT 'full_time',
	`contractEndDate` timestamp,
	`qualification` varchar(200),
	`specialization` varchar(200),
	`yearsOfExperience` int,
	`certifications` json,
	`bankName` varchar(200),
	`iban` varchar(50),
	`salary` decimal(10,2),
	`emergencyContactName` varchar(200),
	`emergencyContactPhone` varchar(20),
	`emergencyContactRelation` varchar(100),
	`photo` text,
	`status` enum('active','inactive','on_leave','terminated','resigned') NOT NULL DEFAULT 'active',
	`terminationDate` timestamp,
	`terminationReason` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staff_leaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffProfileId` int NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`type` enum('annual','sick','emergency','unpaid','maternity','other') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalDays` int NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`attachmentUrl` text,
	`attachmentKey` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_leaves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staff_leave_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffProfileId` int NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`year` int NOT NULL,
	`annualTotal` int NOT NULL DEFAULT 21,
	`annualUsed` int NOT NULL DEFAULT 0,
	`sickTotal` int NOT NULL DEFAULT 14,
	`sickUsed` int NOT NULL DEFAULT 0,
	`emergencyTotal` int NOT NULL DEFAULT 5,
	`emergencyUsed` int NOT NULL DEFAULT 0,
	`unpaidUsed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_leave_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staff_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffProfileId` int NOT NULL,
	`organizationId` int NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`type` enum('general','performance','warning','appreciation','meeting','other') NOT NULL DEFAULT 'general',
	`isPrivate` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staff_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffProfileId` int NOT NULL,
	`organizationId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('contract','id_copy','certificate','license','medical','other') NOT NULL DEFAULT 'other',
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`expiryDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `developmental_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childId` int NOT NULL,
	`assessorId` int NOT NULL,
	`ageGroup` enum('24-36','36-48','48-60','60-72') NOT NULL,
	`totalScore` int NOT NULL,
	`maxScore` int NOT NULL,
	`percentage` decimal(5,2) NOT NULL,
	`interpretation` enum('on_track','needs_support','needs_referral') NOT NULL,
	`notes` text,
	`assessmentDate` timestamp NOT NULL,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `developmental_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domain` enum('communication','gross_motor','fine_motor','problem_solving','personal_social') NOT NULL,
	`itemIndex` int NOT NULL,
	`itemText` text NOT NULL,
	`response` enum('yes','sometimes','not_yet') NOT NULL,
	`score` int NOT NULL,
	CONSTRAINT `assessment_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `curricula` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`level` enum('nursery','kg1','kg2','kg3','all') NOT NULL,
	`category` varchar(100),
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int,
	`uploadedBy` int NOT NULL,
	`organizationId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curricula_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `custom_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`classId` int,
	`ageGroup` varchar(50),
	`createdBy` int NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`shareWithParents` boolean NOT NULL DEFAULT false,
	`organizationId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`questionText` text NOT NULL,
	`questionType` enum('multiple_choice','true_false','rating','text') NOT NULL,
	`options` json,
	`correctAnswer` text,
	`maxRating` int DEFAULT 5,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `custom_assessment_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`childId` int NOT NULL,
	`questionId` int NOT NULL,
	`answer` text,
	`rating` int,
	`notes` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_assessment_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `store_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`nameAr` varchar(200) NOT NULL,
	`icon` varchar(50),
	`sortOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `store_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`categoryId` int,
	`name` varchar(300) NOT NULL,
	`nameAr` varchar(300) NOT NULL,
	`description` text,
	`descriptionAr` text,
	`price` decimal(10,2) NOT NULL,
	`compareAtPrice` decimal(10,2),
	`imageUrl` text,
	`images` json,
	`type` enum('product','service') NOT NULL DEFAULT 'product',
	`stock` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `store_cart` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_cart_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `store_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`commission` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','processing','ready','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(50),
	`moyasarPaymentId` varchar(255),
	`moyasarPaymentUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `store_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(300) NOT NULL,
	`productNameAr` varchar(300) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL,
	`total` decimal(10,2) NOT NULL,
	CONSTRAINT `store_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `demo_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nurseryName` varchar(300) NOT NULL,
	`contactName` varchar(300) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(300),
	`city` varchar(100),
	`childrenCount` varchar(50),
	`centerType` varchar(100),
	`notes` text,
	`status` varchar(20) NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demo_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `employee_salaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`basicSalary` decimal(10,2) NOT NULL,
	`housingAllowance` decimal(10,2) DEFAULT '0',
	`transportAllowance` decimal(10,2) DEFAULT '0',
	`otherAllowances` decimal(10,2) DEFAULT '0',
	`gosiDeduction` decimal(10,2) DEFAULT '0',
	`otherDeductions` decimal(10,2) DEFAULT '0',
	`bankName` varchar(100),
	`iban` varchar(34),
	`effectiveFrom` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_salaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payroll_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`basicSalary` decimal(10,2) NOT NULL,
	`totalAllowances` decimal(10,2) DEFAULT '0',
	`totalDeductions` decimal(10,2) DEFAULT '0',
	`netSalary` decimal(10,2) NOT NULL,
	`status` enum('draft','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payroll_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `evaluation_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`nameAr` varchar(200),
	`description` text,
	`category` varchar(100),
	`maxScore` int NOT NULL DEFAULT 5,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluation_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`evaluatorId` int NOT NULL,
	`period` varchar(50) NOT NULL,
	`overallScore` decimal(4,2),
	`overallRating` enum('excellent','very_good','good','acceptable','poor'),
	`strengths` text,
	`improvements` text,
	`goals` text,
	`notes` text,
	`status` enum('draft','submitted','reviewed','acknowledged') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `evaluation_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evaluationId` int NOT NULL,
	`criterionId` int NOT NULL,
	`score` int NOT NULL,
	`comment` text,
	CONSTRAINT `evaluation_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `performance_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('professional','personal','training','project') NOT NULL DEFAULT 'professional',
	`targetDate` timestamp,
	`progress` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','cancelled','overdue') NOT NULL DEFAULT 'active',
	`assignedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performance_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `integration_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_config_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `classes` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'children' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `children` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'children' AND COLUMN_NAME = 'attendanceDays') > 0,
	'SELECT 1',
	'ALTER TABLE `children` ADD COLUMN `attendanceDays` json DEFAULT (''[0, 1, 2, 3, 4]'')'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'login_attempts' AND COLUMN_NAME = 'userAgent') > 0,
	'SELECT 1',
	'ALTER TABLE `login_attempts` ADD COLUMN `userAgent` text'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `attendance` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance' AND COLUMN_NAME = 'actualCheckInTime') > 0,
	'SELECT 1',
	'ALTER TABLE `staff_attendance` ADD COLUMN `actualCheckInTime` timestamp'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance' AND COLUMN_NAME = 'actualCheckOutTime') > 0,
	'SELECT 1',
	'ALTER TABLE `staff_attendance` ADD COLUMN `actualCheckOutTime` timestamp'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance' AND COLUMN_NAME = 'isLateRecord') > 0,
	'SELECT 1',
	'ALTER TABLE `staff_attendance` ADD COLUMN `isLateRecord` boolean DEFAULT false'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance' AND COLUMN_NAME = 'lateReason') > 0,
	'SELECT 1',
	'ALTER TABLE `staff_attendance` ADD COLUMN `lateReason` text'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `staff_attendance` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'commercialRegister') > 0,
	'SELECT 1',
	'ALTER TABLE `center_settings` ADD COLUMN `commercialRegister` varchar(50)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'logoUrl') > 0,
	'SELECT 1',
	'ALTER TABLE `center_settings` ADD COLUMN `logoUrl` text'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `center_settings` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'vatNumber') > 0,
	'SELECT 1',
	'ALTER TABLE `center_settings` ADD COLUMN `vatNumber` varchar(50)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_activities' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `daily_activities` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_reports' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `daily_reports` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eyfs_assessments' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `eyfs_assessments` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'expiresAt') > 0,
	'SELECT 1',
	'ALTER TABLE `announcements` ADD COLUMN `expiresAt` timestamp'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'imageUrl') > 0,
	'SELECT 1',
	'ALTER TABLE `announcements` ADD COLUMN `imageUrl` text'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `announcements` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `documents` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waiting_list' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `waiting_list` ADD COLUMN `organizationId` int'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `conversations` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `invoices` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loyalty_rewards' AND COLUMN_NAME = 'category') > 0,
	'SELECT 1',
	'ALTER TABLE `loyalty_rewards` ADD COLUMN `category` enum(''discount'',''free_day'',''gift'',''upgrade'',''custom'') DEFAULT ''custom'''
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loyalty_rewards' AND COLUMN_NAME = 'currentRedemptions') > 0,
	'SELECT 1',
	'ALTER TABLE `loyalty_rewards` ADD COLUMN `currentRedemptions` int DEFAULT 0'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loyalty_rewards' AND COLUMN_NAME = 'imageUrl') > 0,
	'SELECT 1',
	'ALTER TABLE `loyalty_rewards` ADD COLUMN `imageUrl` varchar(500)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loyalty_rewards' AND COLUMN_NAME = 'maxRedemptions') > 0,
	'SELECT 1',
	'ALTER TABLE `loyalty_rewards` ADD COLUMN `maxRedemptions` int'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loyalty_rewards' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `loyalty_rewards` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'link') > 0,
	'SELECT 1',
	'ALTER TABLE `notifications` ADD COLUMN `link` varchar(500)'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `notifications` ADD COLUMN `organizationId` int'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `media` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pickup_requests' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `pickup_requests` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'learning_observations' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `learning_observations` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_generated_content' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `ai_generated_content` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pickup_alert_settings' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `pickup_alert_settings` ADD COLUMN `organizationId` int'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @s = (SELECT IF(
	(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'weekly_plans' AND COLUMN_NAME = 'organizationId') > 0,
	'SELECT 1',
	'ALTER TABLE `weekly_plans` ADD COLUMN `organizationId` int NOT NULL DEFAULT 1'
));
--> statement-breakpoint
PREPARE stmt FROM @s;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;