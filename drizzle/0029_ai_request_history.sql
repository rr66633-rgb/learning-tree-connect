ALTER TABLE `ai_generated_content`
  MODIFY COLUMN `type` enum('observation','weekly_plan','activity','progress_report','parent_message','newsletter','story','marketing') NOT NULL;
--> statement-breakpoint
ALTER TABLE `ai_library`
  MODIFY COLUMN `category` enum('observation','weekly_plan','activity','progress_report','parent_message','newsletter','story','marketing') NOT NULL;
--> statement-breakpoint
CREATE INDEX `idx_ai_content_org_user_created` ON `ai_generated_content` (`organizationId`, `createdBy`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_ai_content_org_type_created` ON `ai_generated_content` (`organizationId`, `type`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_ai_library_user_created` ON `ai_library` (`savedBy`, `createdAt`);
