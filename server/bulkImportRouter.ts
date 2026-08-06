import { tenantProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as XLSX from "xlsx";

// SECURITY FIX: this local gate was built on `protectedProcedure`, so it only
// ever verified the caller's ROLE, never that they belong to a real
// organization. Its handler then scoped the import with
// `ctx.organizationId ?? undefined`, and every db helper treats a missing
// organizationId as "no filter" -- so an admin-role account with no
// organization imported rows into, and resolved existing records across, every
// tenant at once. Rebuilt on `tenantProcedure`, which rejects a null/invalid
// organizationId before the handler runs.
const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin' && ctx.user?.role !== 'super_admin' && ctx.user?.role !== 'owner' && ctx.user?.role !== 'principal') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Validation schemas for each entity type
const childRowSchema = z.object({
  name: z.string().min(2),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  classId: z.number().optional(),
  parentPhone: z.string().optional(),
  parentName: z.string().optional(),
  medicalNotes: z.string().optional(),
  allergies: z.string().optional(),
});

const parentRowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(9),
  relationship: z.enum(['father', 'mother', 'guardian']).optional(),
  nationalId: z.string().optional(),
  address: z.string().optional(),
});

const teacherRowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(9),
  specialization: z.string().optional(),
  classId: z.number().optional(),
  qualification: z.string().optional(),
});

const staffRowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(9),
  role: z.enum(['receptionist', 'driver', 'cleaner', 'cook', 'security', 'admin', 'other']).optional(),
  department: z.string().optional(),
});

// Column mapping for Arabic headers
const ARABIC_COLUMN_MAP: Record<string, string> = {
  'الاسم': 'name',
  'اسم الطفل': 'name',
  'اسم المعلمة': 'name',
  'اسم الموظف': 'name',
  'اسم ولي الأمر': 'name',
  'البريد الإلكتروني': 'email',
  'الإيميل': 'email',
  'رقم الجوال': 'phone',
  'الهاتف': 'phone',
  'رقم الهاتف': 'phone',
  'الجنس': 'gender',
  'تاريخ الميلاد': 'dateOfBirth',
  'الفصل': 'classId',
  'رقم الفصل': 'classId',
  'التخصص': 'specialization',
  'المؤهل': 'qualification',
  'العلاقة': 'relationship',
  'صلة القرابة': 'relationship',
  'رقم الهوية': 'nationalId',
  'العنوان': 'address',
  'ملاحظات طبية': 'medicalNotes',
  'الحساسية': 'allergies',
  'القسم': 'department',
  'الوظيفة': 'role',
  'اسم ولي أمر الطفل': 'parentName',
  'جوال ولي الأمر': 'parentPhone',
};

function mapHeaders(headers: string[]): string[] {
  return headers.map(h => {
    const trimmed = h.trim();
    return ARABIC_COLUMN_MAP[trimmed] || trimmed.toLowerCase().replace(/\s+/g, '');
  });
}

function parseExcelBuffer(base64Data: string): any[] {
  const buffer = Buffer.from(base64Data, 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (jsonData.length < 2) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'الملف فارغ أو لا يحتوي على بيانات' });
  }
  
  const rawHeaders = jsonData[0] as string[];
  const mappedHeaders = mapHeaders(rawHeaders);
  
  const rows = jsonData.slice(1)
    .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    .map(row => {
      const obj: Record<string, any> = {};
      mappedHeaders.forEach((header, idx) => {
        if (row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
          obj[header] = String(row[idx]).trim();
        }
      });
      return obj;
    });
  
  return rows;
}

export const bulkImportRouter = router({
  // Validate uploaded Excel file and return preview
  validateFile: adminProcedure
    .input(z.object({
      fileData: z.string(), // base64 encoded file
      entityType: z.enum(['children', 'parents', 'teachers', 'staff']),
    }))
    .mutation(async ({ input }) => {
      const rows = parseExcelBuffer(input.fileData);
      
      const validRows: any[] = [];
      const errors: { row: number; field: string; message: string }[] = [];
      
      let schema: z.ZodSchema;
      switch (input.entityType) {
        case 'children': schema = childRowSchema; break;
        case 'parents': schema = parentRowSchema; break;
        case 'teachers': schema = teacherRowSchema; break;
        case 'staff': schema = staffRowSchema; break;
      }
      
      rows.forEach((row, idx) => {
        const result = schema.safeParse(row);
        if (result.success) {
          validRows.push(result.data);
        } else {
          (result.error as any).errors.forEach((err: any) => {
            errors.push({
              row: idx + 2, // +2 for header row and 0-index
              field: err.path.join('.'),
              message: err.message,
            });
          });
          // Still add row with partial data for preview
          validRows.push(row);
        }
      });
      
      return {
        totalRows: rows.length,
        validCount: rows.length - errors.length,
        errorCount: errors.length,
        errors: errors.slice(0, 50), // Limit errors shown
        preview: validRows.slice(0, 10), // First 10 rows for preview
        headers: Object.keys(rows[0] || {}),
      };
    }),
  
  // Execute the bulk import
  importData: adminProcedure
    .input(z.object({
      fileData: z.string(), // base64 encoded file
      entityType: z.enum(['children', 'parents', 'teachers', 'staff']),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // SECURITY FIX: previously `input.organizationId || ctx.user!.organizationId || 1`
      // -- a client-supplied, optional field was trusted BEFORE the authenticated
      // user's own organization, and a missing value silently fell back to
      // organization #1. Any authenticated user with bulk-import access could supply
      // an arbitrary organizationId and inject rows into an organization they don't
      // belong to.
      //
      // Fix: non-super-admin users may ONLY import into their own organization --
      // input.organizationId is never trusted for them, and an explicit attempt to
      // use it for a different org is rejected outright (rather than silently
      // ignored) so a bug or probing attempt is visible, not swallowed. Only
      // super_admin may perform a cross-organization import, and only via an
      // explicit target organizationId that is verified to exist first.
      let orgId: number;
      if (ctx.user!.role === 'super_admin') {
        if (input.organizationId !== undefined) {
          const targetOrg = await db.getOrganizationById(input.organizationId);
          if (!targetOrg) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'المنظمة المحددة غير موجودة' });
          }
          orgId = input.organizationId;
        } else if (ctx.organizationId) {
          orgId = ctx.organizationId;
        } else {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'يجب تحديد المنظمة الهدف للاستيراد' });
        }
      } else {
        if (input.organizationId !== undefined && input.organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكنك الاستيراد إلى منظمة أخرى' });
        }
        if (!ctx.organizationId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يوجد حساب مرتبط بمنظمة صالحة' });
        }
        orgId = ctx.organizationId;
      }

      // Resolve and authorize the target tenant before parsing untrusted file
      // contents. This keeps authorization fail-closed and avoids spending CPU
      // on files that the caller is not allowed to import.
      const rows = parseExcelBuffer(input.fileData);

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; message: string }[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          switch (input.entityType) {
            case 'children':
              await db.createChild({
                name: row.name,
                dateOfBirth: row.dateOfBirth || null,
                gender: row.gender || 'male',
                classId: row.classId ? Number(row.classId) : null,
                organizationId: orgId,
                medicalNotes: row.medicalNotes || null,
                allergies: row.allergies || null,
              } as any);
              break;
            // SECURITY FIX: these three cases previously omitted
            // organizationId entirely -- every parent/teacher/staff account
            // bulk-imported here silently landed on organization #1
            // (users.organizationId's schema default) regardless of which
            // organization the importing admin actually targeted (orgId,
            // resolved and validated above). Only the 'children' case above
            // was setting it correctly.
            case 'parents':
              await db.createUser({
                name: row.name,
                email: row.email || `parent_${Date.now()}_${i}@temp.com`,
                phone: row.phone || undefined,
                role: 'parent',
                openId: `import_parent_${Date.now()}_${i}`,
                nationalId: row.nationalId || undefined,
                organizationId: orgId,
              });
              break;
            case 'teachers':
              await db.createUser({
                name: row.name,
                email: row.email || `teacher_${Date.now()}_${i}@temp.com`,
                phone: row.phone || undefined,
                role: 'teacher',
                openId: `import_teacher_${Date.now()}_${i}`,
                organizationId: orgId,
              });
              break;
            case 'staff':
              await db.createUser({
                name: row.name,
                email: row.email || `staff_${Date.now()}_${i}@temp.com`,
                phone: row.phone || undefined,
                role: row.role || 'receptionist',
                openId: `import_staff_${Date.now()}_${i}`,
                organizationId: orgId,
              });
              break;
          }
          imported++;
        } catch (err: any) {
          if (err.code === 'ER_DUP_ENTRY') {
            skipped++;
          } else {
            errors.push({ row: i + 2, message: err.message || 'خطأ غير معروف' });
          }
        }
      }
      
      return {
        totalRows: rows.length,
        imported,
        skipped,
        errorCount: errors.length,
        errors: errors.slice(0, 20),
      };
    }),
  
  // Download template Excel file
  getTemplate: adminProcedure
    .input(z.object({
      entityType: z.enum(['children', 'parents', 'teachers', 'staff']),
    }))
    .mutation(async ({ input }) => {
      const headers: Record<string, string[]> = {
        children: ['اسم الطفل', 'تاريخ الميلاد', 'الجنس', 'رقم الفصل', 'اسم ولي أمر الطفل', 'جوال ولي الأمر', 'ملاحظات طبية', 'الحساسية'],
        parents: ['اسم ولي الأمر', 'البريد الإلكتروني', 'رقم الجوال', 'صلة القرابة', 'رقم الهوية', 'العنوان'],
        teachers: ['اسم المعلمة', 'البريد الإلكتروني', 'رقم الجوال', 'التخصص', 'رقم الفصل', 'المؤهل'],
        staff: ['اسم الموظف', 'البريد الإلكتروني', 'رقم الجوال', 'الوظيفة', 'القسم'],
      };
      
      const sampleData: Record<string, any[]> = {
        children: [
          ['ليان أحمد', '2021-03-15', 'أنثى', '1', 'أحمد محمد', '0501234567', '', ''],
          ['يزن خالد', '2020-08-22', 'ذكر', '2', 'خالد عبدالله', '0559876543', 'ربو خفيف', 'مكسرات'],
        ],
        parents: [
          ['أحمد محمد الغامدي', 'ahmed@example.com', '0501234567', 'أب', '1234567890', 'الرياض - حي النرجس'],
          ['فاطمة علي', 'fatima@example.com', '0559876543', 'أم', '0987654321', 'الرياض - حي الياسمين'],
        ],
        teachers: [
          ['نورة الشمري', 'noura@example.com', '0501112233', 'رياض أطفال', '1', 'بكالوريوس تربية'],
          ['سارة القحطاني', 'sara@example.com', '0504445566', 'تعليم مبكر', '2', 'ماجستير تربوي'],
        ],
        staff: [
          ['محمد العتيبي', 'mohammed@example.com', '0507778899', 'receptionist', 'الاستقبال'],
          ['عبدالله الحربي', 'abdullah@example.com', '0502223344', 'driver', 'النقل'],
        ],
      };
      
      const wb = XLSX.utils.book_new();
      const wsData = [headers[input.entityType], ...sampleData[input.entityType]];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = headers[input.entityType].map(() => ({ wch: 20 }));
      
      XLSX.utils.book_append_sheet(wb, ws, 'بيانات');
      
      const buffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      return {
        fileName: `template_${input.entityType}.xlsx`,
        data: buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),
});
