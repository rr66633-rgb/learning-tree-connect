/**
 * White-Label Architecture Configuration
 * 
 * This file defines the two editions of the platform:
 * 1. Nashaa Edition - Private branded version for Nashaa nursery platform
 * 2. Nashaa Edition - Multi-tenant SaaS platform for nurseries and kindergartens
 * 
 * Both editions share the same:
 * - Backend codebase
 * - Database structure (with tenant isolation via organizationId)
 * - AI engine
 * - Feature set
 * 
 * The difference is in branding, deployment configuration, and access levels.
 */

export type Edition = "learning_tree" | "nashaa";

export interface WhiteLabelConfig {
  edition: Edition;
  name: string;
  nameAr: string;
  domain: string;
  defaultColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  features: {
    multiTenant: boolean;
    selfRegistration: boolean;
    subscriptionPlans: boolean;
    whiteLabeling: boolean;
    superAdminDashboard: boolean;
  };
}

export const EDITIONS: Record<Edition, WhiteLabelConfig> = {
  learning_tree: {
    edition: "learning_tree",
    name: "نشأة",
    nameAr: "مركز شجرة التعلم",
    domain: "learningtree.sa",
    defaultColors: {
      primary: "#2d6a4f",
      secondary: "#40916c",
      accent: "#52b788",
      background: "#0f172a",
      text: "#f8fafc",
    },
    features: {
      multiTenant: false,
      selfRegistration: true,
      subscriptionPlans: false,
      whiteLabeling: false,
      superAdminDashboard: false,
    },
  },
  nashaa: {
    edition: "nashaa",
    name: "Nashaa",
    nameAr: "نشأة",
    domain: "naashah.com",
    defaultColors: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#34d399",
      background: "#0f172a",
      text: "#f8fafc",
    },
    features: {
      multiTenant: true,
      selfRegistration: true,
      subscriptionPlans: true,
      whiteLabeling: true,
      superAdminDashboard: true,
    },
  },
};

/**
 * Subscription plan tiers
 */
export type SubscriptionTier = "starter" | "professional" | "enterprise";

export interface PlanLimits {
  maxChildren: number;
  maxStaff: number;
  maxClasses: number;
  storageGb: number;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  starter: {
    maxChildren: 30,
    maxStaff: 10,
    maxClasses: 5,
    storageGb: 5,
  },
  professional: {
    maxChildren: 100,
    maxStaff: 30,
    maxClasses: 15,
    storageGb: 25,
  },
  enterprise: {
    maxChildren: 9999,
    maxStaff: 9999,
    maxClasses: 9999,
    storageGb: 100,
  },
};

/**
 * Plan features matrix
 */
export interface PlanFeatures {
  hasAiTools: boolean;
  hasCustomBranding: boolean;
  hasAdvancedReports: boolean;
  hasParentApp: boolean;
  hasPushNotifications: boolean;
  hasApiAccess: boolean;
  prioritySupport: boolean;
}

export const PLAN_FEATURES: Record<SubscriptionTier, PlanFeatures> = {
  starter: {
    hasAiTools: false,
    hasCustomBranding: false,
    hasAdvancedReports: false,
    hasParentApp: true,
    hasPushNotifications: true,
    hasApiAccess: false,
    prioritySupport: false,
  },
  professional: {
    hasAiTools: true,
    hasCustomBranding: true,
    hasAdvancedReports: true,
    hasParentApp: true,
    hasPushNotifications: true,
    hasApiAccess: false,
    prioritySupport: false,
  },
  enterprise: {
    hasAiTools: true,
    hasCustomBranding: true,
    hasAdvancedReports: true,
    hasParentApp: true,
    hasPushNotifications: true,
    hasApiAccess: true,
    prioritySupport: true,
  },
};
