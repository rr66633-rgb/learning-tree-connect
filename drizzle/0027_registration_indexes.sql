-- Public nursery discovery and tenant-scoped waiting-list screens.
CREATE INDEX `idx_organizations_status_name` ON `organizations` (`status`, `nameAr`);
--> statement-breakpoint
CREATE INDEX `idx_waiting_list_org_priority_created` ON `waiting_list` (`organizationId`, `priority`, `createdAt`);
