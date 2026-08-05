-- Migration 0022: clear stale /manus-storage/* references left over from the
-- Manus-hosted era. These files never existed in the new Cloudflare R2 bucket
-- (the old Manus storage host is gone and unrecoverable), so any branding
-- logo/icon/splash URL still pointing at /manus-storage/* returns a 404 in
-- production. This is a data-only cleanup (no schema change): it resets the
-- broken URL fields back to NULL so the app falls back to its default
-- logo/icon instead of a broken image, and lets each organization re-upload
-- a real logo through the UI. No DROP statements. No rows are deleted.

UPDATE `organization_branding`
SET `logoUrl` = NULL
WHERE `logoUrl` LIKE '%manus-storage%';
--> statement-breakpoint

UPDATE `organization_branding`
SET `logoLightUrl` = NULL
WHERE `logoLightUrl` LIKE '%manus-storage%';
--> statement-breakpoint

UPDATE `organization_branding`
SET `appIcon` = NULL
WHERE `appIcon` LIKE '%manus-storage%';
--> statement-breakpoint

UPDATE `organization_branding`
SET `splashScreenUrl` = NULL
WHERE `splashScreenUrl` LIKE '%manus-storage%';
--> statement-breakpoint

UPDATE `center_settings`
SET `logoUrl` = NULL
WHERE `logoUrl` LIKE '%manus-storage%';
