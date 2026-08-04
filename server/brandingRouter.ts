import { router, tenantProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  organizations,
  organizationBranding,
  organizationMembers,
} from "../drizzle/schema";
import { getDb } from "./db";

// Neutral, non-org-specific fallback used when there is no way to resolve a
// real organization (a visitor with no session, or an authenticated user with
// no organization membership row). This is intentionally NOT any real
// organization's data.
const GENERIC_BRANDING_DEFAULTS = {
  organizationId: null as number | null,
  organizationName: "Nashaa",
  organizationNameAr: "نشأة",
  edition: "nashaa",
  primaryColor: "#10b981",
  secondaryColor: "#059669",
  accentColor: "#34d399",
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
  logoUrl: null as string | null,
  logoLightUrl: null as string | null,
  appIcon: null as string | null,
  splashScreenUrl: null as string | null,
  fontFamily: "Noto Sans Arabic",
  borderRadius: "0.5rem",
  sidebarStyle: "dark" as "dark" | "light" | "gradient",
};

export const brandingRouter = router({
  // Get branding for the current user's organization
  getMyBranding: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // SECURITY FIX: previously defaulted to organizationId = 1 (Nashaa's real
    // organization) whenever there was no user session at all, AND whenever an
    // authenticated user had no organizationMembers row -- meaning an
    // orphaned/orgless authenticated account was silently shown Nashaa's real
    // live branding as if it were their own. Only resolve a real org when the
    // caller is authenticated and has an actual membership row; otherwise
    // return the neutral, hardcoded defaults above (never a real org's data).
    let orgId: number | null = null;
    if (ctx.user) {
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, ctx.user.id));
      if (membership) orgId = membership.organizationId;
    }

    if (orgId === null) {
      return GENERIC_BRANDING_DEFAULTS;
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    const [branding] = await db
      .select()
      .from(organizationBranding)
      .where(eq(organizationBranding.organizationId, orgId));

    return {
      organizationId: org?.id ?? orgId,
      organizationName: org?.name || GENERIC_BRANDING_DEFAULTS.organizationName,
      organizationNameAr: org?.nameAr || GENERIC_BRANDING_DEFAULTS.organizationNameAr,
      edition: org?.edition || GENERIC_BRANDING_DEFAULTS.edition,
      primaryColor: branding?.primaryColor || GENERIC_BRANDING_DEFAULTS.primaryColor,
      secondaryColor: branding?.secondaryColor || GENERIC_BRANDING_DEFAULTS.secondaryColor,
      accentColor: branding?.accentColor || GENERIC_BRANDING_DEFAULTS.accentColor,
      backgroundColor: branding?.backgroundColor || GENERIC_BRANDING_DEFAULTS.backgroundColor,
      textColor: branding?.textColor || GENERIC_BRANDING_DEFAULTS.textColor,
      logoUrl: branding?.logoUrl || null,
      logoLightUrl: branding?.logoLightUrl || null,
      appIcon: branding?.appIcon || null,
      splashScreenUrl: branding?.splashScreenUrl || null,
      fontFamily: branding?.fontFamily || GENERIC_BRANDING_DEFAULTS.fontFamily,
      borderRadius: branding?.borderRadius || GENERIC_BRANDING_DEFAULTS.borderRadius,
      sidebarStyle: (branding?.sidebarStyle as "dark" | "light" | "gradient") || GENERIC_BRANDING_DEFAULTS.sidebarStyle,
    };
  }),

  // Update branding for current user's organization (admin only)
  // SECURITY FIX: previously ran on plain protectedProcedure with NO role
  // check at all -- any authenticated user, including a parent, could call
  // this. Now requires an admin-tier role via tenantProcedure, which also
  // guarantees ctx.organizationId is a real, non-null organization.
  updateMyBranding: tenantProcedure
    .input(z.object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      logoUrl: z.string().optional(),
      logoLightUrl: z.string().optional(),
      appIcon: z.string().optional(),
      splashScreenUrl: z.string().optional(),
      fontFamily: z.string().optional(),
      borderRadius: z.string().optional(),
      sidebarStyle: z.enum(["dark", "light", "gradient"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["admin", "super_admin", "principal", "owner"].includes(ctx.user!.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "صلاحية الإدارة مطلوبة" });
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // SECURITY FIX: previously re-derived orgId via an organizationMembers
      // lookup that defaulted to organizationId = 1 if no membership row
      // existed -- meaning an admin-role account with no membership row could
      // silently overwrite organization #1's (Nashaa's) real live branding.
      // ctx.organizationId is the same authoritative tenant key used
      // throughout the rest of this codebase and is guaranteed non-null here.
      const orgId = ctx.organizationId;

      const [existing] = await db
        .select()
        .from(organizationBranding)
        .where(eq(organizationBranding.organizationId, orgId));

      if (existing) {
        await db
          .update(organizationBranding)
          .set(input)
          .where(eq(organizationBranding.organizationId, orgId));
      } else {
        await db.insert(organizationBranding).values({
          organizationId: orgId,
          ...input,
        });
      }

      return { success: true, message: "تم تحديث الهوية البصرية بنجاح" };
    }),
});
