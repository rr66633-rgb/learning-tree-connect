import { z } from "zod";
import { tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, createNotification } from "./db";
import { employeeSalaries, payrollRecords, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { sendPushToUser } from "./_core/webPush";
import { getPushSubscriptionsForUser } from "./db";

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

// SECURITY FIX: organizationId is now a required parameter and passed through
// to createNotification -- previously it was never set here at all, and since
// notifications.organizationId still carries a schema default(1), every
// salary-paid notification (from any organization) was silently written into
// organization #1's notifications regardless of the employee's real
// organization.
async function sendSalaryPaidNotification(userId: number, netSalary: string, month: number, year: number, organizationId: number) {
  const monthName = monthNames[month - 1];
  try {
    await createNotification({
      userId,
      organizationId,
      title: "Salary Paid",
      titleAr: "تم صرف الراتب",
      body: `Your salary for ${monthName} ${year} has been paid. Net amount: ${Number(netSalary).toLocaleString()} SAR`,
      bodyAr: `تم صرف راتبك عن شهر ${monthName} ${year}. صافي المبلغ: ${Number(netSalary).toLocaleString()} ر.س`,
      type: "payment",
      link: "/staff/payroll",
      metadata: { month, year, netSalary, type: "salary_paid" },
    });
    // Send push notification
    await sendPushToUser(userId, {
      title: "تم صرف الراتب",
      body: `تم صرف راتبك عن شهر ${monthName} ${year}. صافي المبلغ: ${Number(netSalary).toLocaleString()} ر.س`,
      data: { url: "/staff/payroll" },
    }, getPushSubscriptionsForUser);
  } catch (e) {
    // Notification failure shouldn't block the operation
    console.error("Failed to send salary notification:", e);
  }
}

export const payrollRouter = router({
  // Get salary config for an employee
  getSalary: tenantProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      const [salary] = await db
        .select()
        .from(employeeSalaries)
        .where(and(eq(employeeSalaries.userId, input.userId), eq(employeeSalaries.organizationId, orgId), eq(employeeSalaries.isActive, true)))
        .limit(1);
      return salary || null;
    }),

  // List all employee salaries for the organization
  listSalaries: tenantProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId;
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
  upsertSalary: tenantProcedure
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
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      // SECURITY FIX: previously trusted input.userId with no check that the
      // target user belongs to the caller's organization -- an admin could
      // attach a salary record (organizationId: orgId) to a user from a
      // DIFFERENT organization, which listSalaries/getAnnualReport/
      // getPayrollSummary would then join against `users` and display that
      // foreign user's name and role inside this organization's own payroll.
      const [targetUser] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser || targetUser.organizationId !== orgId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }
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
  deleteSalary: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously deactivated by id alone -- any user could
      // deactivate another organization's employeeSalaries record.
      const [existing] = await db.select({ organizationId: employeeSalaries.organizationId }).from(employeeSalaries).where(eq(employeeSalaries.id, input.id)).limit(1);
      if (!existing || existing.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.update(employeeSalaries).set({ isActive: false }).where(eq(employeeSalaries.id, input.id));
      return { success: true };
    }),

  // Generate monthly payroll for all employees
  generateMonthlyPayroll: tenantProcedure
    .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
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
  listPayrollRecords: tenantProcedure
    .input(z.object({ month: z.number().optional(), year: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
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
  updatePayrollStatus: tenantProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "approved", "paid", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // SECURITY FIX: previously updated by id alone with no organization
      // check -- any user could flip another organization's payroll record to
      // "paid", triggering an unauthorized salary-paid notification to that
      // foreign-org employee and exposing their netSalary in the process.
      const [existing] = await db.select({ organizationId: payrollRecords.organizationId }).from(payrollRecords).where(eq(payrollRecords.id, input.id)).limit(1);
      if (!existing || existing.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updateData: any = { status: input.status };
      if (input.status === "paid") {
        updateData.paidAt = new Date();
      }
      await db.update(payrollRecords).set(updateData).where(eq(payrollRecords.id, input.id));

      // Send notification when status is "paid"
      if (input.status === "paid") {
        const [record] = await db.select().from(payrollRecords).where(eq(payrollRecords.id, input.id)).limit(1);
        if (record) {
          await sendSalaryPaidNotification(record.userId, record.netSalary, record.month, record.year, ctx.organizationId);
        }
      }
      return { success: true };
    }),

  // Bulk approve/pay all payroll records for a month
  bulkUpdateStatus: tenantProcedure
    .input(z.object({
      month: z.number(),
      year: z.number(),
      status: z.enum(["approved", "paid"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
      const updateData: any = { status: input.status };
      if (input.status === "paid") {
        updateData.paidAt = new Date();
      }
      
      // Get records before updating (for notifications)
      const recordsToUpdate = await db
        .select()
        .from(payrollRecords)
        .where(and(
          eq(payrollRecords.organizationId, orgId),
          eq(payrollRecords.month, input.month),
          eq(payrollRecords.year, input.year)
        ));
      
      await db.update(payrollRecords)
        .set(updateData)
        .where(and(
          eq(payrollRecords.organizationId, orgId),
          eq(payrollRecords.month, input.month),
          eq(payrollRecords.year, input.year)
        ));
      
      // Send notifications when status is "paid"
      if (input.status === "paid") {
        for (const record of recordsToUpdate) {
          await sendSalaryPaidNotification(record.userId, record.netSalary, input.month, input.year, orgId);
        }
      }
      return { success: true };
    }),

  // Get payroll summary for a month
  // Annual payroll report - all months for a year
  getAnnualReport: tenantProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
      const db = (await getDb())!;
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
        })
        .from(payrollRecords)
        .innerJoin(users, eq(users.id, payrollRecords.userId))
        .where(and(
          eq(payrollRecords.organizationId, orgId),
          eq(payrollRecords.year, input.year)
        ))
        .orderBy(payrollRecords.month, payrollRecords.userId);

      // Group by month for summary
      const monthlySummary = Array.from({ length: 12 }, (_, i) => {
        const monthRecords = records.filter((r: any) => r.month === i + 1);
        return {
          month: i + 1,
          employeeCount: monthRecords.length,
          totalBasic: monthRecords.reduce((s: number, r: any) => s + Number(r.basicSalary), 0),
          totalAllowances: monthRecords.reduce((s: number, r: any) => s + Number(r.totalAllowances), 0),
          totalDeductions: monthRecords.reduce((s: number, r: any) => s + Number(r.totalDeductions), 0),
          totalNet: monthRecords.reduce((s: number, r: any) => s + Number(r.netSalary), 0),
          paidCount: monthRecords.filter((r: any) => r.status === "paid").length,
        };
      });

      const annualTotal = {
        totalBasic: records.reduce((s: number, r: any) => s + Number(r.basicSalary), 0),
        totalAllowances: records.reduce((s: number, r: any) => s + Number(r.totalAllowances), 0),
        totalDeductions: records.reduce((s: number, r: any) => s + Number(r.totalDeductions), 0),
        totalNet: records.reduce((s: number, r: any) => s + Number(r.netSalary), 0),
        totalRecords: records.length,
      };

      return { records, monthlySummary, annualTotal, year: input.year };
    }),

  getPayrollSummary: tenantProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input, ctx }) => {
      const orgId = ctx.organizationId;
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
