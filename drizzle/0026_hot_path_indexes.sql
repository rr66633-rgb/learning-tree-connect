-- Targeted indexes for the highest-frequency tenant-scoped screens.
-- These match the actual WHERE / JOIN / ORDER BY shapes used by children,
-- attendance, media, messages, notifications, pickup, and weekly plans.

CREATE INDEX `idx_users_org_role_active` ON `users` (`organizationId`, `role`, `isActive`);
--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone`);
--> statement-breakpoint
CREATE INDEX `idx_classes_org_active` ON `classes` (`organizationId`, `isActive`);
--> statement-breakpoint
CREATE INDEX `idx_classes_org_teacher` ON `classes` (`organizationId`, `teacherId`);
--> statement-breakpoint
CREATE INDEX `idx_children_org_created` ON `children` (`organizationId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_children_org_class_status` ON `children` (`organizationId`, `classId`, `status`);
--> statement-breakpoint
CREATE INDEX `idx_children_parent_org` ON `children` (`parentId`, `organizationId`);
--> statement-breakpoint
CREATE INDEX `idx_attendance_org_date` ON `attendance` (`organizationId`, `date`);
--> statement-breakpoint
CREATE INDEX `idx_attendance_org_child_date` ON `attendance` (`organizationId`, `childId`, `date`);
--> statement-breakpoint
CREATE INDEX `idx_staff_attendance_org_date` ON `staff_attendance` (`organizationId`, `date`);
--> statement-breakpoint
CREATE INDEX `idx_staff_attendance_org_user_date` ON `staff_attendance` (`organizationId`, `userId`, `date`);
--> statement-breakpoint
CREATE INDEX `idx_daily_activities_org_child_recorded` ON `daily_activities` (`organizationId`, `childId`, `recordedAt`);
--> statement-breakpoint
CREATE INDEX `idx_daily_activities_org_class_recorded` ON `daily_activities` (`organizationId`, `classId`, `recordedAt`);
--> statement-breakpoint
CREATE INDEX `idx_daily_reports_org_date` ON `daily_reports` (`organizationId`, `date`);
--> statement-breakpoint
CREATE INDEX `idx_daily_reports_org_child_date` ON `daily_reports` (`organizationId`, `childId`, `date`);
--> statement-breakpoint
CREATE INDEX `idx_conversations_org_archived_last` ON `conversations` (`organizationId`, `isArchived`, `lastMessageAt`);
--> statement-breakpoint
CREATE INDEX `idx_conversations_participant_one` ON `conversations` (`participantOneId`, `isArchived`, `lastMessageAt`);
--> statement-breakpoint
CREATE INDEX `idx_conversations_participant_two` ON `conversations` (`participantTwoId`, `isArchived`, `lastMessageAt`);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversationId`, `isDeleted`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_unread` ON `messages` (`conversationId`, `isRead`, `isDeleted`);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`userId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`userId`, `isRead`);
--> statement-breakpoint
CREATE INDEX `idx_parent_children_parent_child` ON `parent_children` (`parentId`, `childId`);
--> statement-breakpoint
CREATE INDEX `idx_parent_children_child_parent` ON `parent_children` (`childId`, `parentId`);
--> statement-breakpoint
CREATE INDEX `idx_media_org_created` ON `media` (`organizationId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_media_org_class_approved_created` ON `media` (`organizationId`, `classId`, `isApproved`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_media_children_child_media` ON `media_children` (`childId`, `mediaId`);
--> statement-breakpoint
CREATE INDEX `idx_media_children_media` ON `media_children` (`mediaId`);
--> statement-breakpoint
CREATE INDEX `idx_pickup_org_status_requested` ON `pickup_requests` (`organizationId`, `status`, `requestedAt`);
--> statement-breakpoint
CREATE INDEX `idx_pickup_parent_requested` ON `pickup_requests` (`parentId`, `requestedAt`);
--> statement-breakpoint
CREATE INDEX `idx_pickup_child_status_requested` ON `pickup_requests` (`childId`, `status`, `requestedAt`);
--> statement-breakpoint
CREATE INDEX `idx_push_subscriptions_user` ON `push_subscriptions` (`userId`);
--> statement-breakpoint
CREATE INDEX `idx_weekly_plans_org_created` ON `weekly_plans` (`organizationId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_weekly_plans_org_teacher_created` ON `weekly_plans` (`organizationId`, `teacherId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_weekly_plans_org_class_status_published` ON `weekly_plans` (`organizationId`, `classId`, `status`, `publishedAt`);
