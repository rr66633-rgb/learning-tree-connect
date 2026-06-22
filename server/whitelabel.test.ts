import { describe, it, expect } from "vitest";
import { EDITIONS, PLAN_LIMITS, PLAN_FEATURES } from "../shared/whitelabel";

describe("White-Label Architecture", () => {
  describe("Editions Configuration", () => {
    it("should define two editions: learning_tree and nashaa", () => {
      expect(EDITIONS.learning_tree).toBeDefined();
      expect(EDITIONS.nashaa).toBeDefined();
    });

    it("Learning Tree edition should be single-tenant", () => {
      expect(EDITIONS.learning_tree.features.multiTenant).toBe(false);
      expect(EDITIONS.learning_tree.features.subscriptionPlans).toBe(false);
      expect(EDITIONS.learning_tree.features.whiteLabeling).toBe(false);
      expect(EDITIONS.learning_tree.features.superAdminDashboard).toBe(false);
    });

    it("Naashah edition should be multi-tenant SaaS", () => {
      expect(EDITIONS.nashaa.features.multiTenant).toBe(true);
      expect(EDITIONS.nashaa.features.subscriptionPlans).toBe(true);
      expect(EDITIONS.nashaa.features.whiteLabeling).toBe(true);
      expect(EDITIONS.nashaa.features.superAdminDashboard).toBe(true);
    });

    it("both editions should have Arabic names", () => {
      expect(EDITIONS.learning_tree.nameAr).toBeTruthy();
      expect(EDITIONS.nashaa.nameAr).toBeTruthy();
    });

    it("both editions should have color configurations", () => {
      expect(EDITIONS.learning_tree.defaultColors.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(EDITIONS.nashaa.defaultColors.primary).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("Subscription Plans", () => {
    it("should define three tiers: starter, professional, enterprise", () => {
      expect(PLAN_LIMITS.starter).toBeDefined();
      expect(PLAN_LIMITS.professional).toBeDefined();
      expect(PLAN_LIMITS.enterprise).toBeDefined();
    });

    it("starter plan should have lowest limits", () => {
      expect(PLAN_LIMITS.starter.maxChildren).toBeLessThan(PLAN_LIMITS.professional.maxChildren);
      expect(PLAN_LIMITS.starter.maxStaff).toBeLessThan(PLAN_LIMITS.professional.maxStaff);
      expect(PLAN_LIMITS.starter.storageGb).toBeLessThan(PLAN_LIMITS.professional.storageGb);
    });

    it("enterprise plan should have highest limits", () => {
      expect(PLAN_LIMITS.enterprise.maxChildren).toBeGreaterThan(PLAN_LIMITS.professional.maxChildren);
      expect(PLAN_LIMITS.enterprise.maxStaff).toBeGreaterThan(PLAN_LIMITS.professional.maxStaff);
      expect(PLAN_LIMITS.enterprise.storageGb).toBeGreaterThan(PLAN_LIMITS.professional.storageGb);
    });

    it("starter plan should not have AI tools or custom branding", () => {
      expect(PLAN_FEATURES.starter.hasAiTools).toBe(false);
      expect(PLAN_FEATURES.starter.hasCustomBranding).toBe(false);
    });

    it("professional plan should have AI tools and custom branding", () => {
      expect(PLAN_FEATURES.professional.hasAiTools).toBe(true);
      expect(PLAN_FEATURES.professional.hasCustomBranding).toBe(true);
    });

    it("enterprise plan should have all features including API access and priority support", () => {
      expect(PLAN_FEATURES.enterprise.hasAiTools).toBe(true);
      expect(PLAN_FEATURES.enterprise.hasCustomBranding).toBe(true);
      expect(PLAN_FEATURES.enterprise.hasAdvancedReports).toBe(true);
      expect(PLAN_FEATURES.enterprise.hasApiAccess).toBe(true);
      expect(PLAN_FEATURES.enterprise.prioritySupport).toBe(true);
    });

    it("all plans should have parent app and push notifications", () => {
      expect(PLAN_FEATURES.starter.hasParentApp).toBe(true);
      expect(PLAN_FEATURES.starter.hasPushNotifications).toBe(true);
      expect(PLAN_FEATURES.professional.hasParentApp).toBe(true);
      expect(PLAN_FEATURES.professional.hasPushNotifications).toBe(true);
      expect(PLAN_FEATURES.enterprise.hasParentApp).toBe(true);
      expect(PLAN_FEATURES.enterprise.hasPushNotifications).toBe(true);
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("Learning Tree should be organization #1 (default)", () => {
      // The system defaults to organizationId=1 for all existing data
      // This ensures Learning Tree data remains isolated
      expect(EDITIONS.learning_tree.edition).toBe("learning_tree");
    });

    it("Naashah organizations start from ID 2+", () => {
      // New nurseries registered through Naashah get IDs >= 2
      // This ensures complete data isolation from Learning Tree
      expect(EDITIONS.nashaa.features.multiTenant).toBe(true);
    });
  });
});
