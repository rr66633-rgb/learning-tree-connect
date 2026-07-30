import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { employeeSalaries, payrollRecords, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const payrollRouter = router({
  // Get salary config for an employee
  getSalary: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;
      const [salary] = await db
        .select()
        .from(employeeSalaries)
        .where(and(eq(employeeSalaries.userId, input.userId), eq(employeeSalaries.organizationId, orgId), eq(employeeSalaries.isActive, true)))
        .limit(1);
      return salary || null;
    }),

  // List all employee salaries for the organization
  listSalaries: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId ?? 1;
    const db = (await getDb())!;
    const salaries = await db
      .select({
        id: employeeSalaries.id,
        userId: employeeSalaries.userId,
        userName: users.name,
        userRole: users.role,
        basicSalary: employeeSalaries.basicSalary,
        housingAllowance: employeeSalaries.housingAllowance,
        transportAllowance: employeeSalaries.transportAllowance,
        otherAllowances: employeeSalaries.otherAllowances,
        gosiDeduction: employeeSalaries.gosiDeduction,
        otherDeductions: employeeSalaries.otherDeductions,
        bankName: employeeSalaries.bankName,
        iban: employeeSalaries.iban,
        isActive: employeeSalaries.isActive,
      })
      .from(employeeSalaries)
      .innerJoin(users, eq(users.id, employeeSalaries.userId))
      .where(and(eq(employeeSalaries.organizationId, orgId), eq(employeeSalaries.isActive, true)));
    return salaries;
  }),

  // Create or update salary config
  upsertSalary: protectedProcedure
    .input(z.object({
      userId: z.number(),
      basicSalary: z.string(),
      housingAllowance: z.string().optional(),
      transportAllowance: z.string().optional(),
      otherAllowances: z.string().optional(),
      gosiDeduction: z.string().optional(),
      otherDeductions: z.string().optional(),
      bankName: z.string().optional(),
      iban: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;
      // Deactivate existing
      await db.update(employeeSalaries)
        .set({ isActive: false })
        .where(and(eq(employeeSalaries.userId, input.userId), eq(employeeSalaries.organizationId, orgId)));
      // Create new active record
      const [result] = await db.insert(employeeSalaries).values({
        userId: input.userId,
        organizationId: orgId,
        basicSalary: input.basicSalary,
        housingAllowance: input.housingAllowance || "0",
        transportAllowance: input.transportAllowance || "0",
        otherAllowances: input.otherAllowances || "0",
        gosiDeduction: input.gosiDeduction || "0",
        otherDeductions: input.otherDeductions || "0",
        bankName: input.bankName || null,
        iban: input.iban || null,
      });
      return { id: result.insertId };
    }),

  // Delete salary config
  deleteSalary: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(employeeSalaries).set({ isActive: false }).where(eq(employeeSalaries.id, input.id));
      return { success: true };
    }),

  // Generate monthly payroll for all employees
  generateMonthlyPayroll: protectedProcedure
    .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;
      // Get all active salaries
      const salaries = await db
        .select()
        .from(employeeSalaries)
        .where(and(eq(employeeSalaries.organizationId, orgId), eq(employeeSalaries.isActive, true)));

      // Check if payroll already exists for this month
      const existing = await db
        .select()
        .from(payrollRecords)
        .where(and(
          eq(payrollRecords.organizationId, orgId),
          eq(payrollRecords.month, input.month),
          eq(payrollRecords.year, input.year)
        ));

      if (existing.length > 0) {
        return { error: "مسيّر الرواتب لهذا الشهر موجود مسبقاً", count: 0 };
      }

      // Generate payroll records
      const records = salaries.map((s: any) => {
        const totalAllowances = Number(s.housingAllowance || 0) + Number(s.transportAllowance || 0) + Number(s.otherAllowances || 0);
        const totalDeductions = Number(s.gosiDeduction || 0) + Number(s.otherDeductions || 0);
        const netSalary = Number(s.basicSalary) + totalAllowances - totalDeductions;
        return {
          userId: s.userId,
          organizationId: orgId,
          month: input.month,
          year: input.year,
          basicSalary: s.basicSalary,
          totalAllowances: String(totalAllowances),
          totalDeductions: String(totalDeductions),
          netSalary: String(netSalary),
          status: "draft" as const,
        };
      });

      if (records.length > 0) {
        await db.insert(payrollRecords).values(records);
      }
      return { count: records.length };
    }),

  // List payroll records for a month
  listPayrollRecords: protectedProcedure
    .input(z.object({ month: z.number().optional(), year: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;
      let conditions = [eq(payrollRecords.organizationId, orgId)];
      if (input.month) conditions.push(eq(payrollRecords.month, input.month));
      if (input.year) conditions.push(eq(payrollRecords.year, input.year));

      const records = await db
        .select({
          id: payrollRecords.id,
          userId: payrollRecords.userId,
          userName: users.name,
          month: payrollRecords.month,
          year: payrollRecords.year,
          basicSalary: payrollRecords.basicSalary,
          totalAllowances: payrollRecords.totalAllowances,
          totalDeductions: payrollRecords.totalDeductions,
          netSalary: payrollRecords.netSalary,
          status: payrollRecords.status,
          paidAt: payrollRecords.paidAt,
          notes: payrollRecords.notes,
          createdAt: payrollRecords.createdAt,
        })
        .from(payrollRecords)
        .innerJoin(users, eq(users.id, payrollRecords.userId))
        .where(and(...conditions))
        .orderBy(desc(payrollRecords.createdAt));
      return records;
    }),

  // Update payroll record status
  updatePayrollStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "approved", "paid", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const updateData: any = { status: input.status };
      if (input.status === "paid") {
        updateData.paidAt = new Date();
      }
      await db.update(payrollRecords).set(updateData).where(eq(payrollRecords.id, input.id));
      return { success: true };
    }),

  // Bulk approve/pay all payroll records for a month
  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      month: z.number(),
      year: z.number(),
      status: z.enum(["approved", "paid"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;
      const updateData: any = { status: input.status };
      if (input.status === "paid") {
        updateData.paidAt = new Date();
      }
      await db.update(payrollRecords)
        .set(updateData)
        .where(and(
          eq(payrollRecords.organizationId, orgId),
          eq(payrollRecords.month, input.month),
          eq(payrollRecords.year, input.year)
        ));
      return { success: true };
    }),

  // Get payroll summary for a month
  getPayrollSummary: protectedProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.user.organizationId ?? 1;
      const db = (await getDb())!;
      const records = await db
        .select()
        .from(payrollRecords)
        .where(and(
          eq(payrollRecords.organizationId, orgId),
          eq(payrollRecords.month, input.month),
          eq(payrollRecords.year, input.year)
        ));

      const totalBasic = records.reduce((sum: number, r: any) => sum + Number(r.basicSalary), 0);
      const totalAllowances = records.reduce((sum: number, r: any) => sum + Number(r.totalAllowances), 0);
      const totalDeductions = records.reduce((sum: number, r: any) => sum + Number(r.totalDeductions), 0);
      const totalNet = records.reduce((sum: number, r: any) => sum + Number(r.netSalary), 0);
      const paidCount = records.filter((r: any) => r.status === "paid").length;

      return {
        employeeCount: records.length,
        totalBasic,
        totalAllowances,
        totalDeductions,
        totalNet,
        paidCount,
        pendingCount: records.length - paidCount,
      };
    }),
});
