import { z } from "zod";
import { router, tenantProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { staffProfiles, staffLeaves, staffLeaveBalances, staffNotes, staffDocuments, users } from "../drizzle/schema";
import { eq, and, or, like, desc, asc, sql, inArray } from "drizzle-orm";

// Helper: check if user is admin or principal
function assertAdminOrPrincipal(role: string) {
  if (role !== 'admin' && role !== 'principal' && role !== 'owner' && role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'ليس لديك صلاحية للوصول لهذه الميزة' });
  }
}

// SECURITY FIX helper: staffNotes/staffDocuments have their own organizationId
// column but are always reached via a staffProfileId, so notes/documents
// routes must verify the *profile* belongs to the caller's organization before
// touching any note/document tied to it.
async function assertStaffProfileInOrg(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, staffProfileId: number, organizationId: number) {
  const [profile] = await db.select({ id: staffProfiles.id }).from(staffProfiles)
    .where(and(eq(staffProfiles.id, staffProfileId), eq(staffProfiles.organizationId, organizationId)))
    .limit(1);
  if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'الموظف غير موجود' });
}

export const staffManagementRouter = router({
  // ============ STAFF PROFILES ============
  
  // List all staff with filters, search, sorting, pagination
  list: tenantProcedure.input(z.object({
    search: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    branch: z.string().optional(),
    status: z.string().optional(),
    sortBy: z.enum(["name", "hireDate", "jobTitle", "department", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    page: z.number().default(1),
    limit: z.number().default(20),
  }).optional()).query(async ({ ctx, input }) => {
    assertAdminOrPrincipal(ctx.user!.role);
    const db = await getDb();
    if (!db) return { items: [], total: 0 };
    
    const orgId = ctx.organizationId;
    const conditions: any[] = [eq(staffProfiles.organizationId, orgId)];
    
    if (input?.search) {
      conditions.push(
        or(
          like(staffProfiles.fullNameAr, `%${input.search}%`),
          like(staffProfiles.fullNameEn, `%${input.search}%`),
          like(staffProfiles.mobile, `%${input.search}%`),
          like(staffProfiles.nationalId, `%${input.search}%`),
          like(staffProfiles.email, `%${input.search}%`)
        )
      );
    }
    if (input?.jobTitle && input.jobTitle !== 'all') {
      conditions.push(eq(staffProfiles.jobTitle, input.jobTitle as any));
    }
    if (input?.department && input.department !== 'all') {
      conditions.push(eq(staffProfiles.department, input.department));
    }
    if (input?.branch && input.branch !== 'all') {
      conditions.push(eq(staffProfiles.branch, input.branch));
    }
    if (input?.status && input.status !== 'all') {
      conditions.push(eq(staffProfiles.status, input.status as any));
    }
    
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`COUNT(*)` })
      .from(staffProfiles)
      .where(and(...conditions));
    const total = countResult[0]?.count ?? 0;
    
    // Determine sort
    let orderBy: any = desc(staffProfiles.createdAt);
    if (input?.sortBy === 'name') orderBy = input?.sortOrder === 'desc' ? desc(staffProfiles.fullNameAr) : asc(staffProfiles.fullNameAr);
    if (input?.sortBy === 'hireDate') orderBy = input?.sortOrder === 'desc' ? desc(staffProfiles.hireDate) : asc(staffProfiles.hireDate);
    if (input?.sortBy === 'jobTitle') orderBy = input?.sortOrder === 'desc' ? desc(staffProfiles.jobTitle) : asc(staffProfiles.jobTitle);
    if (input?.sortBy === 'department') orderBy = input?.sortOrder === 'desc' ? desc(staffProfiles.department) : asc(staffProfiles.department);
    if (input?.sortBy === 'createdAt') orderBy = input?.sortOrder === 'desc' ? desc(staffProfiles.createdAt) : asc(staffProfiles.createdAt);
    
    const items = await db.select()
      .from(staffProfiles)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    
    return { items, total };
  }),
  
  // Get single staff profile by ID
  getById: tenantProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    assertAdminOrPrincipal(ctx.user!.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    
    const result = await db.select().from(staffProfiles).where(eq(staffProfiles.id, input.id)).limit(1);
    // SECURITY FIX: previously fetched by id alone -- any admin/principal from
    // any organization could view any other organization's staff profile.
    if (!result[0] || result[0].organizationId !== ctx.organizationId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'الموظف غير موجود' });
    }
    return result[0];
  }),
  
  // Create new staff profile
  create: tenantProcedure.input(z.object({
    fullNameAr: z.string().min(1, "الاسم بالعربي مطلوب"),
    fullNameEn: z.string().optional(),
    nationalId: z.string().optional(),
    iqamaNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["male", "female"]).optional(),
    nationality: z.string().optional(),
    maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
    mobile: z.string().min(1, "رقم الجوال مطلوب"),
    altPhone: z.string().optional(),
    email: z.string().email("البريد الإلكتروني غير صحيح"),
    address: z.string().optional(),
    city: z.string().optional(),
    jobTitle: z.enum(["teacher", "supervisor", "principal", "assistant", "admin_staff", "specialist", "accountant", "receptionist", "driver", "other"]),
    customJobTitle: z.string().optional(),
    department: z.string().optional(),
    branch: z.string().optional(),
    hireDate: z.string().optional(),
    contractType: z.enum(["full_time", "part_time", "contract", "temporary"]).optional(),
    contractEndDate: z.string().optional(),
    qualification: z.string().optional(),
    specialization: z.string().optional(),
    yearsOfExperience: z.number().optional(),
    certifications: z.array(z.string()).optional(),
    bankName: z.string().optional(),
    iban: z.string().optional(),
    salary: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    photo: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdminOrPrincipal(ctx.user!.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    
    const orgId = ctx.organizationId;
    
    // Create a user account for this staff member
    const openId = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const roleMapping: Record<string, string> = {
      teacher: 'teacher',
      supervisor: 'principal',
      principal: 'principal',
      assistant: 'assistant',
      admin_staff: 'admin',
      specialist: 'teacher',
      accountant: 'accountant',
      receptionist: 'receptionist',
      driver: 'assistant',
      other: 'assistant',
    };
    const userRole = roleMapping[input.jobTitle] || 'assistant';
    
    const userResult = await db.insert(users).values({
      openId,
      name: input.fullNameAr,
      email: input.email,
      phone: input.mobile,
      role: userRole as any,
      nationalId: input.nationalId || input.iqamaNumber || null,
      organizationId: orgId,
      isActive: true,
      lastSignedIn: new Date(),
    });
    const userId = userResult[0].insertId;
    
    // Create staff profile
    const profileResult = await db.insert(staffProfiles).values({
      userId,
      organizationId: orgId,
      fullNameAr: input.fullNameAr,
      fullNameEn: input.fullNameEn || null,
      nationalId: input.nationalId || null,
      iqamaNumber: input.iqamaNumber || null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      gender: input.gender || null,
      nationality: input.nationality || null,
      maritalStatus: input.maritalStatus || null,
      mobile: input.mobile,
      altPhone: input.altPhone || null,
      email: input.email,
      address: input.address || null,
      city: input.city || null,
      jobTitle: input.jobTitle,
      customJobTitle: input.customJobTitle || null,
      department: input.department || null,
      branch: input.branch || null,
      hireDate: input.hireDate ? new Date(input.hireDate) : null,
      contractType: input.contractType || 'full_time',
      contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : null,
      qualification: input.qualification || null,
      specialization: input.specialization || null,
      yearsOfExperience: input.yearsOfExperience ?? null,
      certifications: input.certifications || null,
      bankName: input.bankName || null,
      iban: input.iban || null,
      salary: input.salary || null,
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      emergencyContactRelation: input.emergencyContactRelation || null,
      photo: input.photo || null,
      notes: input.notes || null,
      status: 'active',
    });
    
    // Create leave balance for current year
    const currentYear = new Date().getFullYear();
    await db.insert(staffLeaveBalances).values({
      staffProfileId: profileResult[0].insertId,
      userId,
      organizationId: orgId,
      year: currentYear,
    });
    
    return { id: profileResult[0].insertId, userId };
  }),
  
  // Update staff profile
  update: tenantProcedure.input(z.object({
    id: z.number(),
    fullNameAr: z.string().optional(),
    fullNameEn: z.string().optional(),
    nationalId: z.string().optional(),
    iqamaNumber: z.string().optional(),
    dateOfBirth: z.string().nullable().optional(),
    gender: z.enum(["male", "female"]).nullable().optional(),
    nationality: z.string().optional(),
    maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).nullable().optional(),
    mobile: z.string().optional(),
    altPhone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    jobTitle: z.enum(["teacher", "supervisor", "principal", "assistant", "admin_staff", "specialist", "accountant", "receptionist", "driver", "other"]).optional(),
    customJobTitle: z.string().optional(),
    department: z.string().optional(),
    branch: z.string().optional(),
    hireDate: z.string().nullable().optional(),
    contractType: z.enum(["full_time", "part_time", "contract", "temporary"]).optional(),
    contractEndDate: z.string().nullable().optional(),
    qualification: z.string().optional(),
    specialization: z.string().optional(),
    yearsOfExperience: z.number().nullable().optional(),
    certifications: z.array(z.string()).optional(),
    bankName: z.string().optional(),
    iban: z.string().optional(),
    salary: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    photo: z.string().nullable().optional(),
    status: z.enum(["active", "inactive", "on_leave", "terminated", "resigned"]).optional(),
    terminationDate: z.string().nullable().optional(),
    terminationReason: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdminOrPrincipal(ctx.user!.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

    // SECURITY FIX: previously updated by id alone with no organization check
    // -- any admin/principal from any organization could edit any other
    // organization's staff profile (and cascade into their linked user record).
    const existing = await db.select().from(staffProfiles).where(eq(staffProfiles.id, input.id)).limit(1);
    if (!existing[0] || existing[0].organizationId !== ctx.organizationId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'الموظف غير موجود' });
    }

    const { id, ...data } = input;
    const updateData: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (['dateOfBirth', 'hireDate', 'contractEndDate', 'terminationDate'].includes(key)) {
          updateData[key] = value ? new Date(value as string) : null;
        } else {
          updateData[key] = value;
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(staffProfiles).set(updateData).where(eq(staffProfiles.id, id));
    }
    
    // Also update the linked user record
    const profile = await db.select().from(staffProfiles).where(eq(staffProfiles.id, id)).limit(1);
    if (profile[0]) {
      const userUpdate: Record<string, any> = {};
      if (data.fullNameAr) userUpdate.name = data.fullNameAr;
      if (data.email) userUpdate.email = data.email;
      if (data.mobile) userUpdate.phone = data.mobile;
      if (data.status === 'active') userUpdate.isActive = true;
      if (data.status === 'inactive' || data.status === 'terminated' || data.status === 'resigned') userUpdate.isActive = false;
      if (Object.keys(userUpdate).length > 0) {
        await db.update(users).set(userUpdate).where(eq(users.id, profile[0].userId));
      }
    }
    
    return { success: true };
  }),
  
  // Delete staff profile
  delete: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdminOrPrincipal(ctx.user!.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    
    // Get the profile to find linked user
    const profile = await db.select().from(staffProfiles).where(eq(staffProfiles.id, input.id)).limit(1);
    // SECURITY FIX: previously deleted by id alone -- any admin/principal from
    // any organization could delete any other organization's staff profile
    // (cascading into their leaves/balances/notes/documents and deactivating
    // their user account).
    if (!profile[0] || profile[0].organizationId !== ctx.organizationId) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // Delete related records
    await db.delete(staffLeaves).where(eq(staffLeaves.staffProfileId, input.id));
    await db.delete(staffLeaveBalances).where(eq(staffLeaveBalances.staffProfileId, input.id));
    await db.delete(staffNotes).where(eq(staffNotes.staffProfileId, input.id));
    await db.delete(staffDocuments).where(eq(staffDocuments.staffProfileId, input.id));
    await db.delete(staffProfiles).where(eq(staffProfiles.id, input.id));
    
    // Deactivate the user account
    await db.update(users).set({ isActive: false }).where(eq(users.id, profile[0].userId));
    
    return { success: true };
  }),
  
  // Get departments list for filters
  getDepartments: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const orgId = ctx.organizationId;
    const result = await db.selectDistinct({ department: staffProfiles.department })
      .from(staffProfiles)
      .where(and(eq(staffProfiles.organizationId, orgId), sql`${staffProfiles.department} IS NOT NULL AND ${staffProfiles.department} != ''`));
    return result.map(r => r.department).filter(Boolean) as string[];
  }),
  
  // Get branches list for filters
  getBranches: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const orgId = ctx.organizationId;
    const result = await db.selectDistinct({ branch: staffProfiles.branch })
      .from(staffProfiles)
      .where(and(eq(staffProfiles.organizationId, orgId), sql`${staffProfiles.branch} IS NOT NULL AND ${staffProfiles.branch} != ''`));
    return result.map(r => r.branch).filter(Boolean) as string[];
  }),
  
  // Get staff stats
  getStats: tenantProcedure.query(async ({ ctx }) => {
    assertAdminOrPrincipal(ctx.user!.role);
    const db = await getDb();
    if (!db) return { total: 0, active: 0, onLeave: 0, inactive: 0, byJobTitle: {} };
    
    const orgId = ctx.organizationId;
    const all = await db.select().from(staffProfiles).where(eq(staffProfiles.organizationId, orgId));
    
    const stats = {
      total: all.length,
      active: all.filter(s => s.status === 'active').length,
      onLeave: all.filter(s => s.status === 'on_leave').length,
      inactive: all.filter(s => s.status === 'inactive' || s.status === 'terminated' || s.status === 'resigned').length,
      byJobTitle: {} as Record<string, number>,
    };
    
    for (const staff of all) {
      stats.byJobTitle[staff.jobTitle] = (stats.byJobTitle[staff.jobTitle] || 0) + 1;
    }
    
    return stats;
  }),

  // ============ LEAVE MANAGEMENT ============
  
  // List leaves with filters
  leaves: router({
    list: tenantProcedure.input(z.object({
      staffProfileId: z.number().optional(),
      status: z.string().optional(),
      type: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional()).query(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      
      const orgId = ctx.organizationId;
      const conditions: any[] = [eq(staffLeaves.organizationId, orgId)];
      
      if (input?.staffProfileId) conditions.push(eq(staffLeaves.staffProfileId, input.staffProfileId));
      if (input?.status && input.status !== 'all') conditions.push(eq(staffLeaves.status, input.status as any));
      if (input?.type && input.type !== 'all') conditions.push(eq(staffLeaves.type, input.type as any));
      
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;
      
      const countResult = await db.select({ count: sql<number>`COUNT(*)` })
        .from(staffLeaves).where(and(...conditions));
      const total = countResult[0]?.count ?? 0;
      
      const items = await db.select({
        leave: staffLeaves,
        staffName: staffProfiles.fullNameAr,
        staffPhoto: staffProfiles.photo,
        staffJobTitle: staffProfiles.jobTitle,
      })
        .from(staffLeaves)
        .leftJoin(staffProfiles, eq(staffLeaves.staffProfileId, staffProfiles.id))
        .where(and(...conditions))
        .orderBy(desc(staffLeaves.createdAt))
        .limit(limit)
        .offset(offset);
      
      return { items, total };
    }),
    
    // Request leave (by staff themselves)
    request: tenantProcedure.input(z.object({
      type: z.enum(["annual", "sick", "emergency", "unpaid", "maternity", "other"]),
      startDate: z.string(),
      endDate: z.string(),
      reason: z.string().optional(),
      attachmentUrl: z.string().optional(),
      attachmentKey: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      const orgId = ctx.organizationId;
      
      // Find staff profile for this user
      const profile = await db.select().from(staffProfiles)
        .where(eq(staffProfiles.userId, ctx.user!.id)).limit(1);
      if (!profile[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'لم يتم العثور على ملفك الوظيفي' });
      
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const result = await db.insert(staffLeaves).values({
        staffProfileId: profile[0].id,
        userId: ctx.user!.id,
        organizationId: orgId,
        type: input.type,
        startDate: start,
        endDate: end,
        totalDays,
        reason: input.reason || null,
        attachmentUrl: input.attachmentUrl || null,
        attachmentKey: input.attachmentKey || null,
      });
      
      return { id: result[0].insertId };
    }),
    
    // Approve leave
    approve: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      
      const leave = await db.select().from(staffLeaves).where(eq(staffLeaves.id, input.id)).limit(1);
      // SECURITY FIX: previously fetched by id alone -- any admin/principal
      // from any organization could approve another organization's leave
      // request, which also mutated that organization's leave balances below.
      if (!leave[0] || leave[0].organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await db.update(staffLeaves).set({
        status: 'approved',
        approvedBy: ctx.user!.id,
        approvedAt: new Date(),
      }).where(eq(staffLeaves.id, input.id));
      
      // Update leave balance
      const currentYear = new Date().getFullYear();
      const leaveType = leave[0].type;
      const totalDays = leave[0].totalDays;
      
      if (['annual', 'sick', 'emergency'].includes(leaveType)) {
        const colUsed = leaveType === 'annual' ? 'annualUsed' : leaveType === 'sick' ? 'sickUsed' : 'emergencyUsed';
        await db.update(staffLeaveBalances)
          .set({ [colUsed]: sql`${sql.identifier(colUsed)} + ${totalDays}` } as any)
          .where(and(
            eq(staffLeaveBalances.staffProfileId, leave[0].staffProfileId),
            eq(staffLeaveBalances.year, currentYear)
          ));
      } else if (leaveType === 'unpaid') {
        await db.update(staffLeaveBalances)
          .set({ unpaidUsed: sql`unpaidUsed + ${totalDays}` } as any)
          .where(and(
            eq(staffLeaveBalances.staffProfileId, leave[0].staffProfileId),
            eq(staffLeaveBalances.year, currentYear)
          ));
      }
      
      return { success: true };
    }),
    
    // Reject leave
    reject: tenantProcedure.input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // SECURITY FIX: previously updated by id alone with no existence or
      // organization check at all -- any admin/principal from any organization
      // could reject another organization's leave request.
      const leave = await db.select().from(staffLeaves).where(eq(staffLeaves.id, input.id)).limit(1);
      if (!leave[0] || leave[0].organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await db.update(staffLeaves).set({
        status: 'rejected',
        approvedBy: ctx.user!.id,
        rejectionReason: input.reason || null,
      }).where(eq(staffLeaves.id, input.id));

      return { success: true };
    }),

    // Get leave balance for a staff member
    getBalance: tenantProcedure.input(z.object({
      staffProfileId: z.number(),
      year: z.number().optional(),
    })).query(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) return null;

      // SECURITY FIX: previously had NO role check and NO organization check --
      // any authenticated user could read any staff member's leave balance
      // across organizations by staffProfileId.
      const profile = await db.select().from(staffProfiles).where(eq(staffProfiles.id, input.staffProfileId)).limit(1);
      if (!profile[0] || profile[0].organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الموظف غير موجود' });
      }

      const year = input.year ?? new Date().getFullYear();
      const result = await db.select().from(staffLeaveBalances)
        .where(and(
          eq(staffLeaveBalances.staffProfileId, input.staffProfileId),
          eq(staffLeaveBalances.year, year)
        )).limit(1);

      return result[0] || null;
    }),
    
    // Get my leave balance (for staff themselves)
    myBalance: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      
      const profile = await db.select().from(staffProfiles)
        .where(eq(staffProfiles.userId, ctx.user!.id)).limit(1);
      if (!profile[0]) return null;
      
      const year = new Date().getFullYear();
      const result = await db.select().from(staffLeaveBalances)
        .where(and(
          eq(staffLeaveBalances.staffProfileId, profile[0].id),
          eq(staffLeaveBalances.year, year)
        )).limit(1);
      
      return result[0] || null;
    }),
    
    // Get my leaves history
    myLeaves: tenantProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      
      return db.select().from(staffLeaves)
        .where(eq(staffLeaves.userId, ctx.user!.id))
        .orderBy(desc(staffLeaves.createdAt));
    }),
  }),

  // ============ STAFF NOTES ============
  notes: router({
    list: tenantProcedure.input(z.object({
      staffProfileId: z.number(),
    })).query(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) return [];

      // SECURITY FIX: previously listed by staffProfileId alone with no
      // organization check -- any admin/principal could read another
      // organization's staff notes by supplying a foreign staffProfileId.
      await assertStaffProfileInOrg(db, input.staffProfileId, ctx.organizationId);

      return db.select({
        note: staffNotes,
        authorName: users.name,
      })
        .from(staffNotes)
        .leftJoin(users, eq(staffNotes.authorId, users.id))
        .where(eq(staffNotes.staffProfileId, input.staffProfileId))
        .orderBy(desc(staffNotes.createdAt));
    }),

    create: tenantProcedure.input(z.object({
      staffProfileId: z.number(),
      title: z.string().min(1),
      content: z.string().min(1),
      type: z.enum(["general", "performance", "warning", "appreciation", "meeting", "other"]).optional(),
      isPrivate: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const orgId = ctx.organizationId;
      // SECURITY FIX: previously tagged the note with the caller's own org but
      // never verified staffProfileId belonged to it -- a note could be
      // attached to a foreign organization's staff profile.
      await assertStaffProfileInOrg(db, input.staffProfileId, orgId);
      const result = await db.insert(staffNotes).values({
        staffProfileId: input.staffProfileId,
        organizationId: orgId,
        authorId: ctx.user!.id,
        title: input.title,
        content: input.content,
        type: input.type || 'general',
        isPrivate: input.isPrivate || false,
      });
      
      return { id: result[0].insertId };
    }),
    
    update: tenantProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      type: z.enum(["general", "performance", "warning", "appreciation", "meeting", "other"]).optional(),
      isPrivate: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // SECURITY FIX: previously updated by id alone -- any admin/principal
      // could edit another organization's staff note.
      const [existingNote] = await db.select({ organizationId: staffNotes.organizationId }).from(staffNotes).where(eq(staffNotes.id, input.id)).limit(1);
      if (!existingNote || existingNote.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const { id, ...data } = input;
      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;

      await db.update(staffNotes).set(updateData).where(eq(staffNotes.id, id));
      return { success: true };
    }),

    delete: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // SECURITY FIX: previously deleted by id alone -- any admin/principal
      // could delete another organization's staff note.
      const [existingNote] = await db.select({ organizationId: staffNotes.organizationId }).from(staffNotes).where(eq(staffNotes.id, input.id)).limit(1);
      if (!existingNote || existingNote.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await db.delete(staffNotes).where(eq(staffNotes.id, input.id));
      return { success: true };
    }),
  }),

  // ============ STAFF DOCUMENTS ============
  documents: router({
    list: tenantProcedure.input(z.object({
      staffProfileId: z.number(),
    })).query(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) return [];

      // SECURITY FIX: previously listed by staffProfileId alone with no
      // organization check.
      await assertStaffProfileInOrg(db, input.staffProfileId, ctx.organizationId);

      return db.select()
        .from(staffDocuments)
        .where(eq(staffDocuments.staffProfileId, input.staffProfileId))
        .orderBy(desc(staffDocuments.createdAt));
    }),

    create: tenantProcedure.input(z.object({
      staffProfileId: z.number(),
      name: z.string().min(1),
      type: z.enum(["contract", "id_copy", "certificate", "license", "medical", "other"]).optional(),
      url: z.string(),
      fileKey: z.string(),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
      expiryDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const orgId = ctx.organizationId;
      // SECURITY FIX: previously tagged the document with the caller's own org
      // but never verified staffProfileId belonged to it.
      await assertStaffProfileInOrg(db, input.staffProfileId, orgId);
      const result = await db.insert(staffDocuments).values({
        staffProfileId: input.staffProfileId,
        organizationId: orgId,
        uploadedBy: ctx.user!.id,
        name: input.name,
        type: input.type || 'other',
        url: input.url,
        fileKey: input.fileKey,
        mimeType: input.mimeType || null,
        fileSize: input.fileSize ?? null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        notes: input.notes || null,
      });
      
      return { id: result[0].insertId };
    }),
    
    delete: tenantProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      assertAdminOrPrincipal(ctx.user!.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // SECURITY FIX: previously deleted by id alone -- any admin/principal
      // could delete another organization's staff document.
      const [existingDoc] = await db.select({ organizationId: staffDocuments.organizationId }).from(staffDocuments).where(eq(staffDocuments.id, input.id)).limit(1);
      if (!existingDoc || existingDoc.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await db.delete(staffDocuments).where(eq(staffDocuments.id, input.id));
      return { success: true };
    }),
  }),
});
