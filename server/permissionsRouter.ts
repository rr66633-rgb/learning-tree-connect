import { router, adminProcedure, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { staffPermissions, organizationMembers, users } from "../drizzle/schema";
import { getDb } from "./db";

// Permission keys that can be toggled
const PERMISSION_KEYS = [
  "attendanceAll",
  "reportsAll",
  "weeklyPlans",
  "viewInvoices",
  "createInvoices",
  "manageChildren",
  "viewAllChildren",
  "sendMessages",
] as const;

type PermissionKey = typeof PERMISSION_KEYS[number];

export const permissionsRouter = router({
  // Get all staff members with their permissions for the current org
  listStaffPermissions: adminProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const orgId = ctx.organizationId;

    // Get all non-parent staff members
    const staffMembers = await db
      .select({
        userId: organizationMembers.userId,
        membershipId: organizationMembers.id,
        role: organizationMembers.role,
        isActive: organizationMembers.isActive,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
      })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.isActive, true),
        )
      );

    // Filter out parents and super_admins
    const filteredStaff = staffMembers.filter(
      (m) => m.role !== "parent" && m.role !== "super_admin"
    );

    // Get permissions for all staff
    const permissions = await db
      .select()
      .from(staffPermissions)
      .where(eq(staffPermissions.organizationId, orgId));

    // Map permissions to staff
    const permMap = new Map(permissions.map((p) => [p.userId, p]));

    return filteredStaff.map((staff) => {
      const perms = permMap.get(staff.userId);
      return {
        userId: staff.userId,
        membershipId: staff.membershipId,
        role: staff.role,
        userName: staff.userName,
        userEmail: staff.userEmail,
        permissions: {
          attendanceAll: perms?.attendanceAll ?? false,
          reportsAll: perms?.reportsAll ?? false,
          weeklyPlans: perms?.weeklyPlans ?? false,
          viewInvoices: perms?.viewInvoices ?? false,
          createInvoices: perms?.createInvoices ?? false,
          manageChildren: perms?.manageChildren ?? false,
          viewAllChildren: perms?.viewAllChildren ?? false,
          sendMessages: perms?.sendMessages ?? false,
        },
      };
    });
  }),

  // Update a single permission for a staff member
  updatePermission: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        permission: z.enum(PERMISSION_KEYS),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const orgId = ctx.organizationId;

      // Check user belongs to this org
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, input.userId),
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.isActive, true),
          )
        );

      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود في هذه المنظمة" });
      }

      // Upsert permission record
      const [existing] = await db
        .select()
        .from(staffPermissions)
        .where(
          and(
            eq(staffPermissions.userId, input.userId),
            eq(staffPermissions.organizationId, orgId),
          )
        );

      if (existing) {
        await db
          .update(staffPermissions)
          .set({ [input.permission]: input.enabled })
          .where(eq(staffPermissions.id, existing.id));
      } else {
        await db.insert(staffPermissions).values({
          userId: input.userId,
          organizationId: orgId,
          [input.permission]: input.enabled,
        });
      }

      return { success: true, message: "تم تحديث الصلاحية بنجاح" };
    }),

  // Bulk update all permissions for a staff member
  updateAllPermissions: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        permissions: z.object({
          attendanceAll: z.boolean(),
          reportsAll: z.boolean(),
          weeklyPlans: z.boolean(),
          viewInvoices: z.boolean(),
          createInvoices: z.boolean(),
          manageChildren: z.boolean(),
          viewAllChildren: z.boolean(),
          sendMessages: z.boolean(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const orgId = ctx.organizationId;

      // Check user belongs to this org
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, input.userId),
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.isActive, true),
          )
        );

      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود في هذه المنظمة" });
      }

      // Upsert
      const [existing] = await db
        .select()
        .from(staffPermissions)
        .where(
          and(
            eq(staffPermissions.userId, input.userId),
            eq(staffPermissions.organizationId, orgId),
          )
        );

      if (existing) {
        await db
          .update(staffPermissions)
          .set(input.permissions)
          .where(eq(staffPermissions.id, existing.id));
      } else {
        await db.insert(staffPermissions).values({
          userId: input.userId,
          organizationId: orgId,
          ...input.permissions,
        });
      }

      return { success: true, message: "تم تحديث جميع الصلاحيات بنجاح" };
    }),

  // Get my permissions (for current logged-in user)
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const db = (await getDb())!;
    const orgId = ctx.user.organizationId;
    const role = ctx.user.role;

    // Admins, principals, and super_admins have all permissions by default
    if (role === "super_admin" || role === "admin" || role === "principal" || role === "owner") {
      return {
        attendanceAll: true,
        reportsAll: true,
        weeklyPlans: true,
        viewInvoices: true,
        createInvoices: true,
        manageChildren: true,
        viewAllChildren: true,
        sendMessages: true,
      };
    }

    const [perms] = await db
      .select()
      .from(staffPermissions)
      .where(
        and(
          eq(staffPermissions.userId, ctx.user.id),
          eq(staffPermissions.organizationId, orgId),
        )
      );

    return {
      attendanceAll: perms?.attendanceAll ?? false,
      reportsAll: perms?.reportsAll ?? false,
      weeklyPlans: perms?.weeklyPlans ?? false,
      viewInvoices: perms?.viewInvoices ?? false,
      createInvoices: perms?.createInvoices ?? false,
      manageChildren: perms?.manageChildren ?? false,
      viewAllChildren: perms?.viewAllChildren ?? false,
      sendMessages: perms?.sendMessages ?? false,
    };
  }),
});
