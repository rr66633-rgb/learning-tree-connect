import { eq, desc, and, sql, gte, lte, inArray, like, or, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, children, attendance, dailyReports, conversations, messages, invoices, loyaltyPoints, loyaltyTransactions, loyaltyRewards, notifications, classes, staffAttendance, centerSettings, dailyActivities, calendarEvents, announcements, documents, signatures, medicalInfo, emergencyContacts, enrollment, waitingList, eyfsAssessments, auditLog, childDepartures, attendanceAuditLog } from "../drizzle/schema";
import type { InsertChild, InsertAttendance, InsertDailyReport, InsertMessage, InsertInvoice, InsertNotification, InsertAttendanceAuditLog } from "../drizzle/schema";
import { parentChildren } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ============ HELPERS ============
export async function getChildIdsForParent(parentId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ id: children.id }).from(children).where(eq(children.parentId, parentId));
  return result.map(r => r.id);
}

// ============ CHILDREN ============
export async function getChildren(parentId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (parentId) {
    return db.select().from(children).where(eq(children.parentId, parentId)).orderBy(desc(children.createdAt));
  }
  return db.select().from(children).orderBy(desc(children.createdAt));
}

export async function getChildById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(children).where(eq(children.id, id)).limit(1);
  return result[0];
}

export async function createChild(data: InsertChild) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(children).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateChild(id: number, data: Partial<InsertChild>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(children).set(data).where(eq(children.id, id));
  return getChildById(id);
}

export async function deleteChild(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(children).where(eq(children.id, id));
}

// ============ ATTENDANCE ============
export async function getAttendanceByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return db.select().from(attendance).where(and(gte(attendance.date, startOfDay), lte(attendance.date, endOfDay)));
}

export async function getAttendanceByChild(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attendance).where(eq(attendance.childId, childId)).orderBy(desc(attendance.date));
}

export async function getAttendanceByDateForChildren(date: string, childIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (childIds.length === 0) return [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return db.select().from(attendance).where(and(gte(attendance.date, startOfDay), lte(attendance.date, endOfDay), inArray(attendance.childId, childIds)));
}

export async function createAttendance(data: InsertAttendance) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(attendance).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateAttendance(id: number, data: Partial<InsertAttendance>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(attendance).set(data).where(eq(attendance.id, id));
}

export async function getAttendanceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
  return result[0];
}

export async function getAttendanceForChildOnDate(childId: number, date: string) {
  const db = await getDb();
  if (!db) return undefined;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const result = await db.select().from(attendance).where(and(eq(attendance.childId, childId), gte(attendance.date, startOfDay), lte(attendance.date, endOfDay))).limit(1);
  return result[0];
}

// ============ ATTENDANCE AUDIT LOG ============
export async function createAttendanceAuditLog(data: InsertAttendanceAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(attendanceAuditLog).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getAttendanceAuditLogByAttendance(attendanceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attendanceAuditLog).where(eq(attendanceAuditLog.attendanceId, attendanceId)).orderBy(desc(attendanceAuditLog.createdAt));
}

export async function getAttendanceAuditLogByChild(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attendanceAuditLog).where(eq(attendanceAuditLog.childId, childId)).orderBy(desc(attendanceAuditLog.createdAt));
}

// ============ DAILY REPORTS ============
export async function getDailyReports(childId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (childId) {
    return db.select().from(dailyReports).where(eq(dailyReports.childId, childId)).orderBy(desc(dailyReports.date));
  }
  return db.select().from(dailyReports).orderBy(desc(dailyReports.date));
}

export async function getDailyReportsForChildren(childIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (childIds.length === 0) return [];
  return db.select().from(dailyReports).where(inArray(dailyReports.childId, childIds)).orderBy(desc(dailyReports.date));
}

export async function getDailyReportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
  return result[0];
}

export async function createDailyReport(data: InsertDailyReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dailyReports).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateDailyReport(id: number, data: Partial<InsertDailyReport>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dailyReports).set(data).where(eq(dailyReports.id, id));
}

// ============ MESSAGES ============
export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations)
    .where(sql`${conversations.participantOneId} = ${userId} OR ${conversations.participantTwoId} = ${userId}`)
    .orderBy(desc(conversations.lastMessageAt));
}

export async function getAllConversations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).orderBy(desc(conversations.lastMessageAt));
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, data.conversationId));
  return { id: result[0].insertId, ...data };
}

export async function createConversation(participantOneId: number, participantTwoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conversations).values({ participantOneId, participantTwoId });
  return { id: result[0].insertId, participantOneId, participantTwoId };
}

export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(
      sql`(${conversations.participantOneId} = ${userId} OR ${conversations.participantTwoId} = ${userId})`,
      eq(messages.isRead, false),
      sql`${messages.senderId} != ${userId}`
    ));
  return result[0]?.count ?? 0;
}

// ============ INVOICES ============
export async function getInvoices(parentId?: number) {
  const db = await getDb();
  if (!db) return [];
  const selectFields = {
    id: invoices.id,
    childId: invoices.childId,
    parentId: invoices.parentId,
    invoiceNumber: invoices.invoiceNumber,
    description: invoices.description,
    subtotal: invoices.subtotal,
    vatRate: invoices.vatRate,
    vatAmount: invoices.vatAmount,
    total: invoices.total,
    status: invoices.status,
    dueDate: invoices.dueDate,
    paidAt: invoices.paidAt,
    paymentMethod: invoices.paymentMethod,
    createdAt: invoices.createdAt,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    parentName: users.name,
  };
  if (parentId) {
    const results = await db.select(selectFields).from(invoices)
      .leftJoin(children, eq(invoices.childId, children.id))
      .leftJoin(users, eq(invoices.parentId, users.id))
      .where(eq(invoices.parentId, parentId)).orderBy(desc(invoices.createdAt));
    return results.map(r => ({ ...r, childName: `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() }));
  }
  const results = await db.select(selectFields).from(invoices)
    .leftJoin(children, eq(invoices.childId, children.id))
    .leftJoin(users, eq(invoices.parentId, users.id))
    .orderBy(desc(invoices.createdAt));
  return results.map(r => ({ ...r, childName: `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() }));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select({
    id: invoices.id,
    childId: invoices.childId,
    parentId: invoices.parentId,
    invoiceNumber: invoices.invoiceNumber,
    description: invoices.description,
    subtotal: invoices.subtotal,
    vatRate: invoices.vatRate,
    vatAmount: invoices.vatAmount,
    total: invoices.total,
    status: invoices.status,
    dueDate: invoices.dueDate,
    paidAt: invoices.paidAt,
    paymentMethod: invoices.paymentMethod,
    receiptUrl: invoices.receiptUrl,
    createdAt: invoices.createdAt,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    parentName: users.name,
    parentEmail: users.email,
    parentPhone: users.phone,
  }).from(invoices)
    .leftJoin(children, eq(invoices.childId, children.id))
    .leftJoin(users, eq(invoices.parentId, users.id))
    .where(eq(invoices.id, id));
  if (!results.length) return null;
  const r = results[0];
  return { ...r, childName: `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() };
}

export async function updateInvoice(id: number, data: Partial<{ description: string; subtotal: string; vatAmount: string; total: string; dueDate: Date; status: string; paymentMethod: string; paidAt: Date | null }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set(data as any).where(eq(invoices.id, id));
}

export async function deleteInvoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(invoices).where(eq(invoices.id, id));
}

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateInvoiceStatus(id: number, status: string, paidAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (paidAt) updateData.paidAt = paidAt;
  await db.update(invoices).set(updateData).where(eq(invoices.id, id));
}

export async function getFinanceSummary() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, pendingAmount: 0, overdueAmount: 0, totalInvoices: 0 };
  const allInvoices = await db.select().from(invoices);
  const totalRevenue = allInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0);
  const pendingAmount = allInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.total), 0);
  const overdueAmount = allInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + Number(i.total), 0);
  return { totalRevenue, pendingAmount, overdueAmount, totalInvoices: allInvoices.length };
}

// ============ LOYALTY ============
export async function getLoyaltyBalance(userId: number) {
  const db = await getDb();
  if (!db) return { points: 0 };
  const result = await db.select().from(loyaltyPoints).where(eq(loyaltyPoints.userId, userId)).limit(1);
  return result[0] ?? { points: 0 };
}

export async function getLoyaltyTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.userId, userId)).orderBy(desc(loyaltyTransactions.createdAt));
}

export async function addLoyaltyPoints(userId: number, points: number, type: "earned" | "redeemed" | "adjusted", description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(loyaltyTransactions).values({ userId, points, type, description });
  const existing = await db.select().from(loyaltyPoints).where(eq(loyaltyPoints.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(loyaltyPoints).set({ points: existing[0].points + points }).where(eq(loyaltyPoints.userId, userId));
  } else {
    await db.insert(loyaltyPoints).values({ userId, points });
  }
}

export async function getLoyaltyRewards() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loyaltyRewards).where(eq(loyaltyRewards.isActive, true));
}

export async function createLoyaltyReward(data: { name: string; nameAr: string; description?: string; descriptionAr?: string; pointsCost: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(loyaltyRewards).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ NOTIFICATIONS ============
export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return { id: result[0].insertId, ...data };
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ============ ANALYTICS ============
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalChildren: 0, totalStaff: 0, presentToday: 0, totalRevenue: 0 };
  const allChildren = await db.select({ count: sql<number>`count(*)` }).from(children).where(eq(children.status, 'active'));
  const allStaff = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.role} IN ('admin', 'teacher')`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const presentToday = await db.select({ count: sql<number>`count(*)` }).from(attendance)
    .where(and(gte(attendance.date, today), lte(attendance.date, todayEnd), eq(attendance.status, 'present')));
  const paidInvoices = await db.select().from(invoices).where(eq(invoices.status, 'paid'));
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.total), 0);
  return { totalChildren: allChildren[0]?.count ?? 0, totalStaff: allStaff[0]?.count ?? 0, presentToday: presentToday[0]?.count ?? 0, totalRevenue };
}

// ============ USER MANAGEMENT (Admin) ============
export async function getUsersByRole(role?: string, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (role && role !== 'all') {
    conditions.push(eq(users.role, role as any));
  } else {
    // Exclude 'user' role (unassigned), show only admin/teacher/parent
    conditions.push(sql`${users.role} IN ('admin', 'teacher', 'parent')`);
  }
  if (search) {
    conditions.push(
      or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.phone, `%${search}%`)
      )!
    );
  }
  return db.select().from(users).where(and(...conditions)).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUser(data: { name: string; email: string; phone?: string; role: string; openId: string; nationalId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    role: data.role as any,
    nationalId: (data as any).nationalId || null,
    lastSignedIn: new Date(),
  });
  return { id: result[0].insertId, ...data };
}

export async function updateUser(id: number, data: { name?: string; email?: string; phone?: string; role?: string; nationalId?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, id));
  }
  return getUserById(id);
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Unlink children from this parent before deleting
  await db.update(children).set({ parentId: null }).where(eq(children.parentId, id));
  await db.delete(users).where(eq(users.id, id));
  return { success: true };
}

export async function linkParentToChild(parentId: number, childId: number, relationship: string = 'parent') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if link already exists
  const existing = await db.select().from(parentChildren)
    .where(and(eq(parentChildren.parentId, parentId), eq(parentChildren.childId, childId)))
    .limit(1);
  if (existing.length > 0) return { success: true, id: existing[0].id };
  const result = await db.insert(parentChildren).values({ parentId, childId, relationship });
  // Also update legacy parentId column for backward compatibility
  await db.update(children).set({ parentId }).where(eq(children.id, childId));
  return { success: true, id: result[0].insertId };
}

export async function unlinkParentFromChild(parentId: number, childId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(parentChildren).where(
    and(eq(parentChildren.parentId, parentId), eq(parentChildren.childId, childId))
  );
  // Check if child has any other parents, if not clear legacy parentId
  const remaining = await db.select().from(parentChildren).where(eq(parentChildren.childId, childId));
  if (remaining.length === 0) {
    await db.update(children).set({ parentId: null }).where(eq(children.id, childId));
  }
  return { success: true };
}

export async function getChildrenForParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(parentChildren).where(eq(parentChildren.parentId, parentId));
  if (links.length === 0) {
    // Fallback to legacy parentId
    return db.select().from(children).where(eq(children.parentId, parentId));
  }
  const childIds = links.map(l => l.childId);
  return db.select().from(children).where(inArray(children.id, childIds));
}

export async function getParentsForChild(childId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(parentChildren).where(eq(parentChildren.childId, childId));
  if (links.length === 0) return [];
  const parentIds = links.map(l => l.parentId);
  const parents = await db.select().from(users).where(inArray(users.id, parentIds));
  return parents.map(p => {
    const link = links.find(l => l.parentId === p.id);
    return { ...p, relationship: link?.relationship || "parent", isPrimary: link?.isPrimary || false };
  });
}

export async function getUnlinkedChildren() {
  const db = await getDb();
  if (!db) return [];
  const linkedChildIds = await db.select({ childId: parentChildren.childId }).from(parentChildren);
  const ids = linkedChildIds.map(r => r.childId);
  if (ids.length === 0) return db.select().from(children).where(eq(children.status, "active")).orderBy(children.firstName);
  const idPlaceholders = ids.map(id => sql`${id}`);
  return db.select().from(children).where(and(eq(children.status, "active"), sql`${children.id} NOT IN (${sql.join(idPlaceholders, sql`, `)})`)).orderBy(children.firstName);
}

// ============ CLASSES ============
export async function getClasses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classes).orderBy(classes.name);
}

export async function getClassById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  return result[0];
}

export async function createClass(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(classes).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateClass(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(classes).set(data).where(eq(classes.id, id));
  return getClassById(id);
}

export async function deleteClass(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(classes).where(eq(classes.id, id));
  return { success: true };
}

export async function getClassForTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(classes).where(
    or(eq(classes.teacherId, teacherId), eq(classes.assistantId, teacherId))
  ).limit(1);
  return result[0] || null;
}

export async function getChildrenByClass(classId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(children).where(eq(children.classId, classId)).orderBy(children.firstName);
}

// ============ STAFF ATTENDANCE (GPS) ============
export async function getStaffAttendanceByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  return db.select().from(staffAttendance).where(and(gte(staffAttendance.date, startOfDay), lte(staffAttendance.date, endOfDay)));
}

export async function getStaffAttendanceByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffAttendance).where(eq(staffAttendance.userId, userId)).orderBy(desc(staffAttendance.date));
}

export async function getTodayStaffAttendance(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const result = await db.select().from(staffAttendance).where(and(
    eq(staffAttendance.userId, userId),
    gte(staffAttendance.date, today),
    lte(staffAttendance.date, todayEnd)
  )).limit(1);
  return result[0] ?? null;
}

export async function staffCheckIn(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(staffAttendance).values(data);
  return { id: result[0].insertId, ...data };
}

export async function staffCheckOut(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(staffAttendance).set({ ...data, status: "checked_out" as const }).where(eq(staffAttendance.id, id));
}

// ============ CENTER SETTINGS ============
export async function getCenterSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(centerSettings).limit(1);
  return result[0];
}

export async function updateCenterSettings(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCenterSettings();
  if (existing) {
    await db.update(centerSettings).set(data).where(eq(centerSettings.id, existing.id));
  } else {
    await db.insert(centerSettings).values(data);
  }
  return getCenterSettings();
}

// ============ DAILY ACTIVITIES ============
export async function getDailyActivities(childId: number, date?: string) {
  const db = await getDb();
  if (!db) return [];
  if (date) {
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    return db.select().from(dailyActivities).where(and(
      eq(dailyActivities.childId, childId),
      gte(dailyActivities.recordedAt, startOfDay),
      lte(dailyActivities.recordedAt, endOfDay)
    )).orderBy(desc(dailyActivities.recordedAt));
  }
  return db.select().from(dailyActivities).where(eq(dailyActivities.childId, childId)).orderBy(desc(dailyActivities.recordedAt));
}

export async function getDailyActivitiesByClass(classId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  return db.select().from(dailyActivities).where(and(
    eq(dailyActivities.classId, classId),
    gte(dailyActivities.recordedAt, startOfDay),
    lte(dailyActivities.recordedAt, endOfDay)
  )).orderBy(desc(dailyActivities.recordedAt));
}

export async function createDailyActivity(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dailyActivities).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ CALENDAR EVENTS ============
export async function getCalendarEvents(classId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (classId) {
    return db.select().from(calendarEvents).where(
      or(eq(calendarEvents.classId, classId), isNull(calendarEvents.classId))
    ).orderBy(calendarEvents.startDate);
  }
  return db.select().from(calendarEvents).orderBy(calendarEvents.startDate);
}

export async function createCalendarEvent(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calendarEvents).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  return { success: true };
}

// ============ ANNOUNCEMENTS ============
export async function getAnnouncements(audience?: string) {
  const db = await getDb();
  if (!db) return [];
  if (audience) {
    return db.select().from(announcements).where(
      or(eq(announcements.audience, audience as any), eq(announcements.audience, "all"))
    ).orderBy(desc(announcements.createdAt));
  }
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function createAnnouncement(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(announcements).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(announcements).where(eq(announcements.id, id));
  return { success: true };
}

// ============ DOCUMENTS ============
export async function getDocuments(audience?: string, childId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (audience) conditions.push(or(eq(documents.audience, audience as any), eq(documents.audience, "all")));
  if (childId) conditions.push(or(eq(documents.childId, childId), isNull(documents.childId)));
  if (conditions.length > 0) {
    return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt));
  }
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documents).where(eq(documents.id, id));
  return { success: true };
}

// ============ SIGNATURES ============
export async function getSignaturesForDocument(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(signatures).where(eq(signatures.documentId, documentId));
}

export async function createSignature(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(signatures).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ MEDICAL INFO ============
export async function getMedicalInfo(childId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(medicalInfo).where(eq(medicalInfo.childId, childId)).limit(1);
  return result[0];
}

export async function upsertMedicalInfo(childId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getMedicalInfo(childId);
  if (existing) {
    await db.update(medicalInfo).set(data).where(eq(medicalInfo.childId, childId));
  } else {
    await db.insert(medicalInfo).values({ childId, ...data });
  }
  return getMedicalInfo(childId);
}

// ============ EMERGENCY CONTACTS ============
export async function getEmergencyContacts(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emergencyContacts).where(eq(emergencyContacts.childId, childId));
}

export async function createEmergencyContact(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emergencyContacts).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteEmergencyContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  return { success: true };
}

// ============ ENROLLMENT ============
export async function getEnrollments(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(enrollment).where(eq(enrollment.status, status as any)).orderBy(desc(enrollment.createdAt));
  }
  return db.select().from(enrollment).orderBy(desc(enrollment.createdAt));
}

export async function createEnrollment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(enrollment).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateEnrollment(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(enrollment).set(data).where(eq(enrollment.id, id));
}

// ============ WAITING LIST ============
export async function getWaitingList() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waitingList).orderBy(waitingList.priority, desc(waitingList.createdAt));
}

export async function createWaitingListEntry(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(waitingList).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateWaitingListEntry(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(waitingList).set(data).where(eq(waitingList.id, id));
}

export async function deleteWaitingListEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(waitingList).where(eq(waitingList.id, id));
  return { success: true };
}

// ============ EYFS ASSESSMENTS ============
export async function getEyfsAssessments(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eyfsAssessments).where(eq(eyfsAssessments.childId, childId)).orderBy(desc(eyfsAssessments.assessedAt));
}

export async function createEyfsAssessment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(eyfsAssessments).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ AUDIT LOG ============
export async function createAuditLog(data: any) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values(data);
}

export async function getAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

// ============ CHILD DEPARTURES ============
export async function getDeparturesByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  return db.select().from(childDepartures).where(and(
    gte(childDepartures.departureTime, startOfDay),
    lte(childDepartures.departureTime, endOfDay)
  )).orderBy(desc(childDepartures.departureTime));
}

export async function getDeparturesByDateForChildren(date: string, childIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (childIds.length === 0) return [];
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  return db.select().from(childDepartures).where(and(
    inArray(childDepartures.childId, childIds),
    gte(childDepartures.departureTime, startOfDay),
    lte(childDepartures.departureTime, endOfDay)
  )).orderBy(desc(childDepartures.departureTime));
}

export async function getDeparturesByChild(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(childDepartures).where(eq(childDepartures.childId, childId)).orderBy(desc(childDepartures.departureTime)).limit(30);
}

export async function createDeparture(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(childDepartures).values(data);
  return { id: result[0].insertId, ...data };
}
