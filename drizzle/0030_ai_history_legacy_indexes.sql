CREATE INDEX `idx_readiness_org_user_ai_created`
  ON `school_readiness_scores` (`organizationId`, `assessedBy`, `aiGenerated`, `createdAt`);
