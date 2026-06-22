import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  organizations,
  organizationBranding,
  organizationMembers,
} from "../drizzle/schema";

async function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return drizzle(process.env.DATABASE_URL);
}

export const brandingRouter = router({
  // Get branding for the current user's organization
  getMyBranding: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    // Default to organization 1 (Learning Tree) if no user or no org membership
    let orgId = 1;

    if (ctx.user) {
      // Find user's organization membership
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, ctx.user.id));

      if (membership) {
        orgId = membership.organizationId;
      }
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
      organizationId: org?.id || 1,
      organizationName: org?.name || "Learning Tree Nursery",
      organizationNameAr: org?.nameAr || "حضانة شجرة التعلم",
      edition: org?.edition || "learning_tree",
      primaryColor: branding?.primaryColor || "#10b981",
      secondaryColor: branding?.secondaryColor || "#059669",
      accentColor: branding?.accentColor || "#34d399",
      backgroundColor: branding?.backgroundColor || "#0f172a",
      textColor: branding?.textColor || "#f8fafc",
      logoUrl: branding?.logoUrl || null,
      logoLightUrl: branding?.logoLightUrl || null,
      appIcon: branding?.appIcon || null,
      splashScreenUrl: branding?.splashScreenUrl || null,
      fontFamily: branding?.fontFamily || "Noto Sans Arabic",
      borderRadius: branding?.borderRadius || "0.5rem",
      sidebarStyle: (branding?.sidebarStyle as "dark" | "light" | "gradient") || "dark",
    };
  }),

  // Update branding for current user's organization (admin only)
  updateMyBranding: protectedProcedure
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
      const db = await getDb();

      // Get user's organization
      let orgId = 1;
      if (ctx.user) {
        const [membership] = await db
          .select()
          .from(organizationMembers)
          .where(eq(organizationMembers.userId, ctx.user.id));
        if (membership) orgId = membership.organizationId;
      }

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
