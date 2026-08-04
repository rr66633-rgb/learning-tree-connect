import { publicProcedure, tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { curricula, children, parentChildren, classes } from "../drizzle/schema";
import { eq, and, desc, or } from "drizzle-orm";

export const curriculumRouter = router({
  // List curricula (staff - all levels)
  list: tenantProcedure
    .input(z.object({
      level: z.enum(["nursery", "kg1", "kg2", "kg3", "all"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // SECURITY FIX: previously filtered only by isActive/level -- returned
      // every organization's curricula to any authenticated user.
      const conditions: any[] = [eq(curricula.isActive, true), eq(curricula.organizationId, ctx.organizationId)];
      if (input?.level && input.level !== "all") {
        conditions.push(
          or(
            eq(curricula.level, input.level),
            eq(curricula.level, "all")
          )!
        );
      }
      const db = (await getDb())!;
      const results = await db.select().from(curricula)
        .where(and(...conditions))
        .orderBy(desc(curricula.createdAt));
      return results;
    }),

  // List curricula for parent (filtered by child's class level)
  listForParent: tenantProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "parent") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = (await getDb())!;
    const parentKids = await db.select({
      classId: children.classId,
    }).from(parentChildren)
      .innerJoin(children, eq(parentChildren.childId, children.id))
      .where(eq(parentChildren.parentId, ctx.user.id));

    // Get class levels for parent's children
    const classIds = parentKids.map((k: { classId: number | null }) => k.classId).filter(Boolean) as number[];
    let levels: string[] = [];
    
    if (classIds.length > 0) {
      const classResults = await db.select({
        name: classes.name,
        ageGroup: classes.ageGroup,
      }).from(classes).where(
        or(...classIds.map(id => eq(classes.id, id)))
      );
      
      // Map class names to levels
      for (const cls of classResults) {
        const name = (cls.name || "").toLowerCase();
        const ageGroup = (cls.ageGroup || "").toLowerCase();
        if (name.includes("kg3") || name.includes("كي جي 3") || ageGroup.includes("kg3")) {
          levels.push("kg3");
        } else if (name.includes("kg2") || name.includes("كي جي 2") || ageGroup.includes("kg2") || ageGroup.includes("5-6")) {
          levels.push("kg2");
        } else if (name.includes("kg1") || name.includes("كي جي 1") || ageGroup.includes("kg1") || ageGroup.includes("4-5")) {
          levels.push("kg1");
        } else if (name.includes("nursery") || name.includes("حضانة") || name.includes("حضانه")) {
          levels.push("nursery");
        }
      }
    }

    // Get unique levels
    levels = Array.from(new Set(levels));
    
    // If no levels found, show all
    if (levels.length === 0) {
      levels = ["nursery", "kg1", "kg2", "kg3"];
    }

    // Get curricula matching child levels + "all" level
    // SECURITY FIX: previously filtered only by isActive/level -- returned
    // every organization's matching curricula, not just the parent's own.
    const levelConditions = levels.map(l => eq(curricula.level, l as any));
    const results = await db.select().from(curricula)
      .where(and(
        eq(curricula.isActive, true),
        eq(curricula.organizationId, ctx.organizationId),
        or(
          eq(curricula.level, "all"),
          ...levelConditions
        )
      ))
      .orderBy(desc(curricula.createdAt));

    return results;
  }),

  // Add curriculum (staff only)
  create: tenantProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      level: z.enum(["nursery", "kg1", "kg2", "kg3", "all"]),
      category: z.string().optional(),
      fileUrl: z.string(),
      fileKey: z.string(),
      fileName: z.string(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "parent") {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      }
      const db = (await getDb())!;
      // SECURITY FIX: organizationId was previously never set on insert --
      // since curricula.organizationId still carries a schema default(1),
      // every curriculum uploaded by any organization's staff was silently
      // tagged as organizationId = 1.
      const [result] = await db.insert(curricula).values({
        ...input,
        uploadedBy: ctx.user.id,
        organizationId: ctx.organizationId,
      });
      return { id: result.insertId };
    }),

  // Delete curriculum (staff only)
  delete: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "parent") {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      }
      const db = (await getDb())!;
      // SECURITY FIX: previously deactivated by id alone -- any staff member
      // could deactivate another organization's curriculum item.
      const [existing] = await db.select({ organizationId: curricula.organizationId }).from(curricula).where(eq(curricula.id, input.id)).limit(1);
      if (!existing || existing.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.update(curricula)
        .set({ isActive: false })
        .where(eq(curricula.id, input.id));
      return { success: true };
    }),
});
