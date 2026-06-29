import { eq, desc, and, sql, gte, lte, inArray, like, or, isNull } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql2 from "mysql2";
import { InsertUser, users, children, attendance, dailyReports, conversations, messages, invoices, loyaltyPoints, loyaltyTransactions, loyaltyRewards, notifications, classes, staffAttendance, centerSettings, dailyActivities, calendarEvents, announcements, documents, signatures, medicalInfo, emergencyContacts, enrollment, waitingList, eyfsAssessments, auditLog, childDepartures, attendanceAuditLog, childDocuments, payments, transactions, refunds, tuitionPlans, pickupRequests, learningObservations, pushSubscriptions, eventReminders } from "../drizzle/schema";
import type { InsertChild, InsertAttendance, InsertDailyReport, InsertMessage, InsertInvoice, InsertNotification, InsertAttendanceAuditLog, InsertPayment, InsertTransaction, InsertRefund, InsertTuitionPlan, InsertPickupRequest } from "../drizzle/schema";
import { parentChildren, media, mediaChildren, authorizedPickupPersons, staffDutyStatus, pickupAlertSettings, pickupAlertAcknowledgments, nurseryRegistrations, developmentalAssessments, assessmentResponses } from "../drizzle/schema";
import type { InsertNurseryRegistration } from "../drizzle/schema";
import type { InsertAuthorizedPickupPerson } from "../drizzle/schema";
import type { InsertDevelopmentalAssessment, InsertAssessmentResponse } from "../drizzle/schema";
import { ENV } from './_core/env';

// ============ SINGLETON CONNECTION POOL ============
let _pool: ReturnType<typeof mysql2.createPool> | null = null;
let _db: MySql2Database<Record<string, unknown>> | null = null;

/**
 * Creates and returns a singleton MySQL connection pool with drizzle ORM.
 * This prevents connection leaks by reusing the same pool across all requests.
 * Pool configuration:
 * - connectionLimit: 10 (max concurrent connections)
 * - waitForConnections: true (queue requests when pool is full)
 * - queueLimit: 50 (max queued requests before rejecting)
 * - enableKeepAlive: true (prevent idle connection drops)
 * - keepAliveInitialDelay: 30000ms (30s keep-alive ping)
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql2.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 50,
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000,
        idleTimeout: 60000,
      });
      _db = drizzle(_pool) as unknown as MySql2Database<Record<string, unknown>>;
      console.log("[Database] Connection pool created (limit: 10, queue: 50)");
    } catch (error) {
      console.warn("[Database] Failed to create connection pool:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

/**
 * Returns the raw MySQL pool for health checks or direct queries.
 */
export function getPool() {
  return _pool;
}

/**
 * Gracefully closes the connection pool.
 * Should be called on server shutdown (SIGTERM/SIGINT).
 */
export async function closeDb(): Promise<void> {
  if (_pool) {
    try {
      _pool.end();
      console.log("[Database] Connection pool closed gracefully");
    } catch (error) {
      console.error("[Database] Error closing connection pool:", error);
    } finally {
      _pool = null;
      _db = null;
    }
  }
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
      values.role = 'super_admin';
      updateSet.role = 'super_admin';
    }
    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserOpenId(userId: number, newOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ openId: newOpenId, lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function getAllUsers(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    return db.select().from(users).where(eq(users.organizationId, organizationId)).orderBy(desc(users.createdAt));
  }
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
export async function getChildren(parentId?: number, organizationId?: number, limit?: number, offset?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (parentId) conditions.push(eq(children.parentId, parentId));
  if (organizationId) conditions.push(eq(children.organizationId, organizationId));
  let query = db.select().from(children);
  if (conditions.length > 0) {
    query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
  }
  query = query.orderBy(desc(children.createdAt)) as any;
  if (limit) query = query.limit(limit) as any;
  if (offset) query = query.offset(offset) as any;
  return query;
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
export async function getAttendanceByDate(date: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const conditions = [gte(attendance.date, startOfDay), lte(attendance.date, endOfDay)];
  if (organizationId) conditions.push(eq(attendance.organizationId, organizationId));
  return db.select().from(attendance).where(and(...conditions));
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
export async function getDailyReports(childId?: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (childId) conditions.push(eq(dailyReports.childId, childId));
  if (organizationId) conditions.push(eq(dailyReports.organizationId, organizationId));
  if (conditions.length > 0) {
    return db.select().from(dailyReports).where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(dailyReports.date));
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
  const rows = await db.select({
    id: conversations.id,
    participantOneId: conversations.participantOneId,
    participantTwoId: conversations.participantTwoId,
    childId: conversations.childId,
    subject: conversations.subject,
    lastMessageAt: conversations.lastMessageAt,
    lastMessagePreview: conversations.lastMessagePreview,
    isArchived: conversations.isArchived,
    createdAt: conversations.createdAt,
  }).from(conversations)
    .where(and(
      sql`(${conversations.participantOneId} = ${userId} OR ${conversations.participantTwoId} = ${userId})`,
      eq(conversations.isArchived, false)
    ))
    .orderBy(desc(conversations.lastMessageAt));
  
  // Enrich with participant names and unread counts
  const enriched = [];
  for (const conv of rows) {
    const otherUserId = conv.participantOneId === userId ? conv.participantTwoId : conv.participantOneId;
    const otherUser = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, otherUserId)).limit(1);
    const unreadResult = await db.select({ count: sql<number>`count(*)` }).from(messages)
      .where(and(
        eq(messages.conversationId, conv.id),
        eq(messages.isRead, false),
        sql`${messages.senderId} != ${userId}`,
        eq(messages.isDeleted, false)
      ));
    let childName = null;
    if (conv.childId) {
      const child = await db.select({ firstName: children.firstName, lastName: children.lastName }).from(children).where(eq(children.id, conv.childId)).limit(1);
      childName = child[0] ? `${child[0].firstName} ${child[0].lastName}` : null;
    }
    enriched.push({
      ...conv,
      otherUserName: otherUser[0]?.name || 'مستخدم',
      otherUserRole: otherUser[0]?.role || 'user',
      otherUserId,
      unreadCount: unreadResult[0]?.count ?? 0,
      childName,
    });
  }
  return enriched;
}

export async function getAllConversations(search?: string) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    id: conversations.id,
    participantOneId: conversations.participantOneId,
    participantTwoId: conversations.participantTwoId,
    childId: conversations.childId,
    subject: conversations.subject,
    lastMessageAt: conversations.lastMessageAt,
    lastMessagePreview: conversations.lastMessagePreview,
    isArchived: conversations.isArchived,
    createdAt: conversations.createdAt,
  }).from(conversations).orderBy(desc(conversations.lastMessageAt));
  
  const rows = await query;
  const enriched = [];
  for (const conv of rows) {
    const user1 = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, conv.participantOneId)).limit(1);
    const user2 = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, conv.participantTwoId)).limit(1);
    let childName = null;
    if (conv.childId) {
      const child = await db.select({ firstName: children.firstName, lastName: children.lastName }).from(children).where(eq(children.id, conv.childId)).limit(1);
      childName = child[0] ? `${child[0].firstName} ${child[0].lastName}` : null;
    }
    const item = {
      ...conv,
      participantOneName: user1[0]?.name || 'مستخدم',
      participantOneRole: user1[0]?.role || 'user',
      participantTwoName: user2[0]?.name || 'مستخدم',
      participantTwoRole: user2[0]?.role || 'user',
      childName,
    };
    if (search) {
      const s = search.toLowerCase();
      if (item.participantOneName.toLowerCase().includes(s) || item.participantTwoName.toLowerCase().includes(s) || (item.childName && item.childName.toLowerCase().includes(s)) || (item.subject && item.subject.toLowerCase().includes(s))) {
        enriched.push(item);
      }
    } else {
      enriched.push(item);
    }
  }
  return enriched;
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: messages.id,
    conversationId: messages.conversationId,
    senderId: messages.senderId,
    content: messages.content,
    attachmentUrl: messages.attachmentUrl,
    attachmentType: messages.attachmentType,
    attachmentName: messages.attachmentName,
    isRead: messages.isRead,
    readAt: messages.readAt,
    isDeleted: messages.isDeleted,
    createdAt: messages.createdAt,
    senderName: users.name,
    senderRole: users.role,
  }).from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.conversationId, conversationId), eq(messages.isDeleted, false)))
    .orderBy(messages.createdAt);
  
  return rows.map(r => ({
    ...r,
    senderName: r.senderName || 'مستخدم',
    senderRole: r.senderRole || 'user',
  }));
}

export async function createMessage(data: { conversationId: number; senderId: number; content: string; attachmentUrl?: string | null; attachmentType?: string | null; attachmentName?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values({
    conversationId: data.conversationId,
    senderId: data.senderId,
    content: data.content,
    attachmentUrl: data.attachmentUrl || null,
    attachmentType: data.attachmentType || null,
    attachmentName: data.attachmentName || null,
  });
  // Update conversation last message
  const preview = data.content.length > 100 ? data.content.slice(0, 100) + '...' : data.content;
  await db.update(conversations).set({ lastMessageAt: new Date(), lastMessagePreview: preview }).where(eq(conversations.id, data.conversationId));
  return { id: result[0].insertId, ...data };
}

export async function createConversation(participantOneId: number, participantTwoId: number, childId?: number | null, subject?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if conversation already exists between these two for this child
  const existing = await db.select().from(conversations).where(and(
    sql`((${conversations.participantOneId} = ${participantOneId} AND ${conversations.participantTwoId} = ${participantTwoId}) OR (${conversations.participantOneId} = ${participantTwoId} AND ${conversations.participantTwoId} = ${participantOneId}))`,
    childId ? eq(conversations.childId, childId) : sql`${conversations.childId} IS NULL`
  )).limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(conversations).values({ participantOneId, participantTwoId, childId: childId || null, subject: subject || null });
  return { id: result[0].insertId, participantOneId, participantTwoId, childId, subject };
}

export async function markMessagesAsRead(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ isRead: true, readAt: new Date() }).where(and(
    eq(messages.conversationId, conversationId),
    sql`${messages.senderId} != ${userId}`,
    eq(messages.isRead, false)
  ));
}

export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(
      sql`(${conversations.participantOneId} = ${userId} OR ${conversations.participantTwoId} = ${userId})`,
      eq(messages.isRead, false),
      eq(messages.isDeleted, false),
      sql`${messages.senderId} != ${userId}`
    ));
  return result[0]?.count ?? 0;
}

export async function archiveConversation(conversationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set({ isArchived: true }).where(eq(conversations.id, conversationId));
}

export async function unarchiveConversation(conversationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set({ isArchived: false }).where(eq(conversations.id, conversationId));
}

export async function deleteMessage(messageId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ isDeleted: true }).where(eq(messages.id, messageId));
}

export async function getConversationById(conversationId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return result[0] || null;
}

export async function getTeachersForChild(childId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get the child's class, then find teachers assigned to that class via classes table
  const child = await db.select({ classId: children.classId }).from(children).where(eq(children.id, childId)).limit(1);
  if (!child[0]?.classId) return [];
  const classInfo = await db.select({ teacherId: classes.teacherId, assistantId: classes.assistantId }).from(classes).where(eq(classes.id, child[0].classId)).limit(1);
  if (!classInfo[0]) return [];
  const teacherIds = [classInfo[0].teacherId, classInfo[0].assistantId].filter(Boolean) as number[];
  if (teacherIds.length === 0) return [];
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(inArray(users.id, teacherIds));
}

export async function getParentsForTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get classes where this teacher is assigned, then find children in those classes, then their parents
  const teacherClasses = await db.select({ id: classes.id }).from(classes)
    .where(sql`${classes.teacherId} = ${teacherId} OR ${classes.assistantId} = ${teacherId}`);
  if (teacherClasses.length === 0) return [];
  const classIds = teacherClasses.map(c => c.id);
  const childrenInClasses = await db.select({ id: children.id, firstName: children.firstName, lastName: children.lastName, parentId: children.parentId })
    .from(children)
    .where(inArray(children.classId, classIds));
  const parentIds = Array.from(new Set(childrenInClasses.filter(c => c.parentId).map(c => c.parentId!)));
  if (parentIds.length === 0) return [];
  const parents = await db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(inArray(users.id, parentIds));
  return parents.map(p => ({
    ...p,
    children: childrenInClasses.filter(c => c.parentId === p.id).map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))
  }));
}

export async function getAllActiveStaffAndParents() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(
      eq(users.isActive, true),
      sql`${users.role} != 'user'`
    ));
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
    paidAmount: invoices.paidAmount,
    status: invoices.status,
    invoiceType: invoices.invoiceType,
    isRecurring: invoices.isRecurring,
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
    paidAmount: invoices.paidAmount,
    status: invoices.status,
    invoiceType: invoices.invoiceType,
    isRecurring: invoices.isRecurring,
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

export async function updateInvoice(id: number, data: Partial<{ description: string; subtotal: string; vatAmount: string; total: string; dueDate: Date; status: string; paymentMethod: string; paidAt: Date | null; paidAmount: string; invoiceType: string }>) {
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

export async function getFinanceSummary(organizationId?: number) {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, pendingAmount: 0, overdueAmount: 0, totalInvoices: 0 };
  const query = organizationId 
    ? db.select().from(invoices).where(eq(invoices.organizationId, organizationId))
    : db.select().from(invoices);
  const allInvoices = await query;
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

export async function deleteNotification(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function deleteAllNotifications(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(notifications).where(eq(notifications.userId, userId));
}

export async function createBatchNotifications(data: InsertNotification[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return [];
  const result = await db.insert(notifications).values(data);
  return result;
}

// ============ ANALYTICS ============
export async function getDashboardStats(organizationId?: number) {
  const db = await getDb();
  if (!db) return { totalChildren: 0, totalStaff: 0, presentToday: 0, totalRevenue: 0 };
  const childConditions = [eq(children.status, 'active')];
  if (organizationId) childConditions.push(eq(children.organizationId, organizationId));
  const allChildren = await db.select({ count: sql<number>`count(*)` }).from(children).where(and(...childConditions));
  const staffConditions = [sql`${users.role} IN ('admin', 'teacher')`];
  if (organizationId) staffConditions.push(eq(users.organizationId, organizationId));
  const allStaff = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(...staffConditions));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const presentToday = await db.select({ count: sql<number>`count(*)` }).from(attendance)
    .where(and(gte(attendance.date, today), lte(attendance.date, todayEnd), eq(attendance.status, 'present')));
  const paidInvoices = await db.select().from(invoices).where(eq(invoices.status, 'paid'));
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.total), 0);
  return { totalChildren: allChildren[0]?.count ?? 0, totalStaff: allStaff[0]?.count ?? 0, presentToday: presentToday[0]?.count ?? 0, totalRevenue };
}

// ============ USER MANAGEMENT (Admin) ============
export async function getUsersByRole(role?: string, search?: string, organizationId?: number, limit?: number, offset?: number) {
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
  if (organizationId) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  let query = db.select().from(users).where(and(...conditions)).orderBy(desc(users.createdAt));
  if (limit) query = query.limit(limit) as any;
  if (offset) query = query.offset(offset) as any;
  return query;
}

export async function getPendingParents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(and(eq(users.role, 'parent'), eq(users.isActive, false))).orderBy(desc(users.createdAt));
}

export async function approveParent(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
}

export async function rejectParent(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Set role to 'user' and keep isActive=false to mark as rejected
  await db.update(users).set({ role: 'user', isActive: false }).where(eq(users.id, userId));
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
export async function getClasses(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    return db.select().from(classes).where(eq(classes.organizationId, organizationId)).orderBy(classes.name);
  }
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
  const results = await db.select({
    id: staffAttendance.id,
    userId: staffAttendance.userId,
    date: staffAttendance.date,
    checkInTime: staffAttendance.checkInTime,
    checkOutTime: staffAttendance.checkOutTime,
    status: staffAttendance.status,
    notes: staffAttendance.notes,
    userName: users.name,
  }).from(staffAttendance)
    .leftJoin(users, eq(staffAttendance.userId, users.id))
    .where(and(gte(staffAttendance.date, startOfDay), lte(staffAttendance.date, endOfDay)));
  return results;
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
export async function getCalendarEvents(filters?: { month?: number; year?: number; audience?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) {
    conditions.push(eq(calendarEvents.status, filters.status as any));
  }
  if (filters?.audience) {
    conditions.push(
      or(eq(calendarEvents.audience, filters.audience as any), eq(calendarEvents.audience, "all"))
    );
  }
  if (filters?.year && filters?.month) {
    const monthStr = String(filters.month).padStart(2, "0");
    const prefix = `${filters.year}-${monthStr}`;
    conditions.push(sql`${calendarEvents.eventDate} LIKE ${prefix + '%'}`);
  }
  const query = conditions.length > 0
    ? db.select().from(calendarEvents).where(and(...conditions)).orderBy(calendarEvents.eventDate)
    : db.select().from(calendarEvents).orderBy(calendarEvents.eventDate);
  return query;
}

export async function getCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  return rows[0] || null;
}

export async function createCalendarEvent(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calendarEvents).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateCalendarEvent(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id));
  return { id, ...data };
}

export async function deleteCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  return { success: true };
}

// ============ EVENT REMINDERS ============
export async function createEventReminder(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(eventReminders).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getEventReminders(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventReminders).where(eq(eventReminders.eventId, eventId)).orderBy(desc(eventReminders.scheduledAt));
}

export async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(eventReminders).where(
    and(
      eq(eventReminders.status, "pending"),
      lte(eventReminders.scheduledAt, now)
    )
  );
}

export async function markReminderSent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(eventReminders).set({ status: "sent", sentAt: new Date() }).where(eq(eventReminders.id, id));
}

export async function cancelEventReminders(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(eventReminders).set({ status: "cancelled" }).where(
    and(
      eq(eventReminders.eventId, eventId),
      eq(eventReminders.status, "pending")
    )
  );
}

export async function cancelSingleReminder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(eventReminders).set({ status: "cancelled" }).where(eq(eventReminders.id, id));
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

// ============ CHILD DOCUMENTS ============
export async function getChildDocuments(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(childDocuments).where(eq(childDocuments.childId, childId)).orderBy(desc(childDocuments.createdAt));
}

export async function getAllChildDocuments(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(childDocuments).where(eq(childDocuments.status, status as any)).orderBy(desc(childDocuments.createdAt));
  }
  return db.select().from(childDocuments).orderBy(desc(childDocuments.createdAt));
}

export async function createChildDocument(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(childDocuments).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateChildDocument(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(childDocuments).set(data).where(eq(childDocuments.id, id));
}

export async function deleteChildDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(childDocuments).where(eq(childDocuments.id, id));
}


// ============ MEDIA ============
export async function createMedia(data: { type: string; url: string; fileKey?: string; thumbnailUrl?: string; caption?: string; mimeType?: string; fileSize?: number; uploadedBy: number; classId?: number; visibility?: string; childIds?: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { childIds, ...mediaData } = data;
  const result = await db.insert(media).values(mediaData as any);
  const mediaId = result[0].insertId;
  
  // Link children to media
  if (childIds && childIds.length > 0) {
    const links = childIds.map(childId => ({ mediaId, childId }));
    await db.insert(mediaChildren).values(links);
  }
  
  return { id: mediaId, ...mediaData };
}

export async function getMediaForClass(classId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(media)
    .where(and(eq(media.classId, classId), eq(media.isApproved, true)))
    .orderBy(desc(media.createdAt))
    .limit(limit);
}

export async function getMediaForChild(childId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  // Get media where this child is tagged
  const tagged = await db.select({ mediaId: mediaChildren.mediaId })
    .from(mediaChildren)
    .where(eq(mediaChildren.childId, childId));
  
  if (tagged.length === 0) return [];
  const mediaIds = tagged.map(t => t.mediaId);
  return db.select().from(media)
    .where(and(inArray(media.id, mediaIds), eq(media.isApproved, true)))
    .orderBy(desc(media.createdAt))
    .limit(limit);
}

export async function getMediaForChildren(childIds: number[], limit = 50) {
  const db = await getDb();
  if (!db) return [];
  if (childIds.length === 0) return [];
  // Get media where any of these children are tagged
  const tagged = await db.select({ mediaId: mediaChildren.mediaId })
    .from(mediaChildren)
    .where(inArray(mediaChildren.childId, childIds));
  
  if (tagged.length === 0) return [];
  const mediaIds = Array.from(new Set(tagged.map(t => t.mediaId)));
  return db.select().from(media)
    .where(and(inArray(media.id, mediaIds), eq(media.isApproved, true)))
    .orderBy(desc(media.createdAt))
    .limit(limit);
}

export async function getAllMedia(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(media).orderBy(desc(media.createdAt)).limit(limit);
}

export async function getMediaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return result[0];
}

export async function getMediaChildren(mediaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaChildren).where(eq(mediaChildren.mediaId, mediaId));
}

export async function deleteMedia(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(mediaChildren).where(eq(mediaChildren.mediaId, id));
  await db.delete(media).where(eq(media.id, id));
}

export async function updateMediaApproval(id: number, isApproved: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(media).set({ isApproved }).where(eq(media.id, id));
}

// ============ PAYMENTS & TRANSACTIONS ============

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result[0];
}

export async function getPaymentByMoyasarId(moyasarPaymentId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.moyasarPaymentId, moyasarPaymentId)).limit(1);
  return result[0];
}

export async function updatePayment(id: number, data: Partial<{ status: string; paidAt: Date; moyasarPaymentId: string; moyasarPaymentUrl: string; metadata: any }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(payments).set(data as any).where(eq(payments.id, id));
}

export async function getPaymentsByInvoice(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.createdAt));
}

export async function getPaymentsByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: payments.id,
    invoiceId: payments.invoiceId,
    amount: payments.amount,
    currency: payments.currency,
    method: payments.method,
    status: payments.status,
    moyasarPaymentId: payments.moyasarPaymentId,
    paidAt: payments.paidAt,
    createdAt: payments.createdAt,
    invoiceNumber: invoices.invoiceNumber,
    invoiceDescription: invoices.description,
    childFirstName: children.firstName,
    childLastName: children.lastName,
  }).from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(children, eq(invoices.childId, children.id))
    .where(eq(payments.parentId, parentId))
    .orderBy(desc(payments.createdAt));
}

// ============ TRANSACTIONS ============

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transactions).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getTransactionsByInvoice(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.invoiceId, invoiceId)).orderBy(desc(transactions.createdAt));
}

export async function getTransactionsByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.parentId, parentId)).orderBy(desc(transactions.createdAt));
}

export async function getAllTransactions(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: transactions.id,
    paymentId: transactions.paymentId,
    invoiceId: transactions.invoiceId,
    parentId: transactions.parentId,
    moyasarTransactionId: transactions.moyasarTransactionId,
    type: transactions.type,
    amount: transactions.amount,
    currency: transactions.currency,
    status: transactions.status,
    method: transactions.method,
    cardBrand: transactions.cardBrand,
    cardLast4: transactions.cardLast4,
    description: transactions.description,
    createdAt: transactions.createdAt,
    invoiceNumber: invoices.invoiceNumber,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    parentName: users.name,
  }).from(transactions)
    .leftJoin(invoices, eq(transactions.invoiceId, invoices.id))
    .leftJoin(children, eq(invoices.childId, children.id))
    .leftJoin(users, eq(transactions.parentId, users.id))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function updateTransaction(id: number, data: Partial<{ status: string; moyasarTransactionId: string; metadata: any }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(transactions).set(data as any).where(eq(transactions.id, id));
}

// ============ REFUNDS ============

export async function createRefund(data: InsertRefund) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(refunds).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getRefundsByInvoice(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(refunds).where(eq(refunds.invoiceId, invoiceId)).orderBy(desc(refunds.createdAt));
}

export async function getAllRefunds(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: refunds.id,
    transactionId: refunds.transactionId,
    invoiceId: refunds.invoiceId,
    parentId: refunds.parentId,
    amount: refunds.amount,
    currency: refunds.currency,
    reason: refunds.reason,
    status: refunds.status,
    moyasarRefundId: refunds.moyasarRefundId,
    processedBy: refunds.processedBy,
    processedAt: refunds.processedAt,
    createdAt: refunds.createdAt,
    invoiceNumber: invoices.invoiceNumber,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    parentName: users.name,
  }).from(refunds)
    .leftJoin(invoices, eq(refunds.invoiceId, invoices.id))
    .leftJoin(children, eq(invoices.childId, children.id))
    .leftJoin(users, eq(refunds.parentId, users.id))
    .orderBy(desc(refunds.createdAt))
    .limit(limit);
}

export async function updateRefund(id: number, data: Partial<{ status: string; moyasarRefundId: string; processedBy: number; processedAt: Date }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(refunds).set(data as any).where(eq(refunds.id, id));
}

// ============ TUITION PLANS ============

export async function createTuitionPlan(data: InsertTuitionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tuitionPlans).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getTuitionPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: tuitionPlans.id,
    childId: tuitionPlans.childId,
    parentId: tuitionPlans.parentId,
    name: tuitionPlans.name,
    amount: tuitionPlans.amount,
    frequency: tuitionPlans.frequency,
    description: tuitionPlans.description,
    startDate: tuitionPlans.startDate,
    endDate: tuitionPlans.endDate,
    nextBillingDate: tuitionPlans.nextBillingDate,
    isActive: tuitionPlans.isActive,
    createdAt: tuitionPlans.createdAt,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    parentName: users.name,
  }).from(tuitionPlans)
    .leftJoin(children, eq(tuitionPlans.childId, children.id))
    .leftJoin(users, eq(tuitionPlans.parentId, users.id))
    .orderBy(desc(tuitionPlans.createdAt));
}

export async function getTuitionPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tuitionPlans).where(eq(tuitionPlans.id, id)).limit(1);
  return result[0];
}

export async function updateTuitionPlan(id: number, data: Partial<{ name: string; amount: string; frequency: string; description: string; nextBillingDate: Date; isActive: boolean; endDate: Date }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tuitionPlans).set(data as any).where(eq(tuitionPlans.id, id));
}

export async function getActiveTuitionPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tuitionPlans).where(eq(tuitionPlans.isActive, true));
}

export async function generateInvoicesFromPlans() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const activePlans = await db.select().from(tuitionPlans)
    .where(and(
      eq(tuitionPlans.isActive, true),
      lte(tuitionPlans.nextBillingDate, now)
    ));
  
  const generatedInvoices: any[] = [];
  
  for (const plan of activePlans) {
    if (!plan.nextBillingDate) continue;
    
    const subtotal = Number(plan.amount);
    const vatRate = 15;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    
    // Calculate due date (15 days from billing date)
    const dueDate = new Date(plan.nextBillingDate);
    dueDate.setDate(dueDate.getDate() + 15);
    
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${plan.childId}`;
    
    const invoiceData: InsertInvoice = {
      childId: plan.childId,
      parentId: plan.parentId,
      invoiceNumber,
      description: plan.description || plan.name,
      subtotal: subtotal.toFixed(2),
      vatRate: vatRate.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      total: total.toFixed(2),
      status: 'pending',
      dueDate,
      invoiceType: 'tuition',
      isRecurring: true,
      tuitionPlanId: plan.id,
      paidAmount: '0.00',
    };
    
    const invoice = await db.insert(invoices).values(invoiceData);
    generatedInvoices.push({ id: invoice[0].insertId, ...invoiceData });
    
    // Calculate next billing date based on frequency
    const nextDate = new Date(plan.nextBillingDate);
    switch (plan.frequency) {
      case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
      case 'semi_annual': nextDate.setMonth(nextDate.getMonth() + 6); break;
      case 'annual': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    }
    
    // Update next billing date
    await db.update(tuitionPlans).set({ nextBillingDate: nextDate }).where(eq(tuitionPlans.id, plan.id));
    
    // Check if plan has ended
    if (plan.endDate && nextDate > plan.endDate) {
      await db.update(tuitionPlans).set({ isActive: false }).where(eq(tuitionPlans.id, plan.id));
    }
  }
  
  return generatedInvoices;
}

// ============ FINANCE ENHANCED ============

export async function getFinanceExportData(filters?: { startDate?: Date; endDate?: Date; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  if (filters?.startDate) conditions.push(gte(invoices.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(invoices.createdAt, filters.endDate));
  if (filters?.status) conditions.push(eq(invoices.status, filters.status as any));
  
  const query = db.select({
    id: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
    description: invoices.description,
    subtotal: invoices.subtotal,
    vatAmount: invoices.vatAmount,
    total: invoices.total,
    paidAmount: invoices.paidAmount,
    status: invoices.status,
    invoiceType: invoices.invoiceType,
    dueDate: invoices.dueDate,
    paidAt: invoices.paidAt,
    paymentMethod: invoices.paymentMethod,
    createdAt: invoices.createdAt,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    parentName: users.name,
    parentEmail: users.email,
  }).from(invoices)
    .leftJoin(children, eq(invoices.childId, children.id))
    .leftJoin(users, eq(invoices.parentId, users.id));
  
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(invoices.createdAt));
  }
  return query.orderBy(desc(invoices.createdAt));
}

export async function getEnhancedFinanceSummary() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, pendingAmount: 0, overdueAmount: 0, partiallyPaidAmount: 0, totalInvoices: 0, paidInvoices: 0, pendingInvoices: 0, overdueInvoices: 0, thisMonthRevenue: 0 };
  
  const allInvoices = await db.select().from(invoices);
  
  const totalRevenue = allInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0);
  const pendingAmount = allInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.total), 0);
  const overdueAmount = allInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + Number(i.total), 0);
  const partiallyPaidAmount = allInvoices.filter(i => i.status === 'partially_paid').reduce((sum, i) => sum + (Number(i.total) - Number(i.paidAmount)), 0);
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthRevenue = allInvoices
    .filter(i => i.status === 'paid' && i.paidAt && new Date(i.paidAt) >= startOfMonth)
    .reduce((sum, i) => sum + Number(i.total), 0);
  
  return {
    totalRevenue,
    pendingAmount,
    overdueAmount,
    partiallyPaidAmount,
    totalInvoices: allInvoices.length,
    paidInvoices: allInvoices.filter(i => i.status === 'paid').length,
    pendingInvoices: allInvoices.filter(i => i.status === 'pending').length,
    overdueInvoices: allInvoices.filter(i => i.status === 'overdue').length,
    thisMonthRevenue,
  };
}

// ============ AUTHENTICATION HELPERS ============

export async function findUserByIdentifier(identifier: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Try to find by email first (case-insensitive), then by phone
  const normalizedIdentifier = identifier.trim();
  const byEmail = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${normalizedIdentifier})`).limit(1);
  if (byEmail.length > 0) return byEmail[0];
  
  const byPhone = await db.select().from(users).where(eq(users.phone, identifier)).limit(1);
  if (byPhone.length > 0) return byPhone[0];
  
  return undefined;
}

export async function createUserWithPassword(data: {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    phone: data.phone,
    email: data.email,
    password: data.password,
    role: data.role as any,
    isActive: data.isActive,
  });
  
  return result[0].insertId;
}

export async function activateUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
}


// ============ PICKUP WORKFLOW (6-Step) ============
export async function createPickupRequest(data: InsertPickupRequest) {
  const db = await getDb();
  const result = await db!.insert(pickupRequests).values(data);
  return result[0].insertId;
}

export async function getActivePickupRequests() {
  const db = await getDb();
  const results = await db!.select({
    id: pickupRequests.id,
    childId: pickupRequests.childId,
    parentId: pickupRequests.parentId,
    status: pickupRequests.status,
    requestedAt: pickupRequests.requestedAt,
    teacherResponseAt: pickupRequests.teacherResponseAt,
    arrivedReceptionAt: pickupRequests.arrivedReceptionAt,
    pickedUpAt: pickupRequests.pickedUpAt,
    pickedUpBy: pickupRequests.pickedUpBy,
    pickedUpByRelationship: pickupRequests.pickedUpByRelationship,
    teacherId: pickupRequests.teacherId,
    receptionStaffId: pickupRequests.receptionStaffId,
    escalatedAt: pickupRequests.escalatedAt,
    notes: pickupRequests.notes,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    childPhoto: children.photo,
    childClassId: children.classId,
    parentName: users.name,
    parentPhone: users.phone,
    className: classes.name,
    classNameAr: classes.nameAr,
  })
  .from(pickupRequests)
  .leftJoin(children, eq(pickupRequests.childId, children.id))
  .leftJoin(users, eq(pickupRequests.parentId, users.id))
  .leftJoin(classes, eq(children.classId, classes.id))
  .where(
    and(
      inArray(pickupRequests.status, ["waiting_teacher", "sent_to_reception", "waiting_at_reception"]),
      gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`)
    )
  )
  .orderBy(desc(pickupRequests.requestedAt));

  // Enrich with teacher name
  const enriched = await Promise.all(results.map(async (r) => {
    let teacherName = '';
    if (r.childClassId) {
      const classInfo = await db!.select({ teacherId: classes.teacherId }).from(classes).where(eq(classes.id, r.childClassId)).limit(1);
      if (classInfo[0]?.teacherId) {
        const teacher = await db!.select({ name: users.name }).from(users).where(eq(users.id, classInfo[0].teacherId)).limit(1);
        teacherName = teacher[0]?.name || '';
      }
    }
    return { ...r, teacherName };
  }));
  return enriched;
}

export async function getPickupRequestsByParent(parentId: number) {
  const db = await getDb();
  return db!.select({
    id: pickupRequests.id,
    childId: pickupRequests.childId,
    status: pickupRequests.status,
    requestedAt: pickupRequests.requestedAt,
    teacherResponseAt: pickupRequests.teacherResponseAt,
    arrivedReceptionAt: pickupRequests.arrivedReceptionAt,
    pickedUpAt: pickupRequests.pickedUpAt,
    pickedUpBy: pickupRequests.pickedUpBy,
    pickedUpByRelationship: pickupRequests.pickedUpByRelationship,
    notes: pickupRequests.notes,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    childPhoto: children.photo,
  })
  .from(pickupRequests)
  .leftJoin(children, eq(pickupRequests.childId, children.id))
  .where(eq(pickupRequests.parentId, parentId))
  .orderBy(desc(pickupRequests.requestedAt))
  .limit(50);
}

export async function getActivePickupForChild(childId: number) {
  const db = await getDb();
  const results = await db!.select()
    .from(pickupRequests)
    .where(
      and(
        eq(pickupRequests.childId, childId),
        inArray(pickupRequests.status, ["waiting_teacher", "sent_to_reception", "waiting_at_reception"]),
        gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`)
      )
    )
    .limit(1);
  return results[0] || null;
}

export async function updatePickupRequestStatus(id: number, status: string, extra: Record<string, any> = {}) {
  const db = await getDb();
  const updateData: any = { status, ...extra };
  if (status === "sent_to_reception") updateData.teacherResponseAt = new Date();
  if (status === "waiting_at_reception") updateData.arrivedReceptionAt = new Date();
  if (status === "picked_up") updateData.pickedUpAt = new Date();
  await db!.update(pickupRequests).set(updateData).where(eq(pickupRequests.id, id));
}

export async function getPickupRequestsForTeacher(teacherId: number) {
  const db = await getDb();
  // Get classes taught by this teacher
  const teacherClasses = await db!.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, teacherId));
  const classIds = teacherClasses.map(c => c.id);
  if (classIds.length === 0) return [];
  
  return db!.select({
    id: pickupRequests.id,
    childId: pickupRequests.childId,
    parentId: pickupRequests.parentId,
    status: pickupRequests.status,
    requestedAt: pickupRequests.requestedAt,
    teacherResponseAt: pickupRequests.teacherResponseAt,
    notes: pickupRequests.notes,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    childPhoto: children.photo,
    childClassId: children.classId,
    parentName: users.name,
    className: classes.name,
    classNameAr: classes.nameAr,
  })
  .from(pickupRequests)
  .leftJoin(children, eq(pickupRequests.childId, children.id))
  .leftJoin(users, eq(pickupRequests.parentId, users.id))
  .leftJoin(classes, eq(children.classId, classes.id))
  .where(
    and(
      inArray(children.classId, classIds),
      inArray(pickupRequests.status, ["waiting_teacher", "sent_to_reception"]),
      gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`)
    )
  )
  .orderBy(desc(pickupRequests.requestedAt));
}

export async function getPickupHistory(limit = 100) {
  const db = await getDb();
  return db!.select({
    id: pickupRequests.id,
    childId: pickupRequests.childId,
    parentId: pickupRequests.parentId,
    status: pickupRequests.status,
    requestedAt: pickupRequests.requestedAt,
    teacherResponseAt: pickupRequests.teacherResponseAt,
    arrivedReceptionAt: pickupRequests.arrivedReceptionAt,
    pickedUpAt: pickupRequests.pickedUpAt,
    pickedUpBy: pickupRequests.pickedUpBy,
    pickedUpByRelationship: pickupRequests.pickedUpByRelationship,
    receptionStaffId: pickupRequests.receptionStaffId,
    notes: pickupRequests.notes,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    childPhoto: children.photo,
    parentName: users.name,
    className: classes.name,
    classNameAr: classes.nameAr,
  })
  .from(pickupRequests)
  .leftJoin(children, eq(pickupRequests.childId, children.id))
  .leftJoin(users, eq(pickupRequests.parentId, users.id))
  .leftJoin(classes, eq(children.classId, classes.id))
  .where(eq(pickupRequests.status, "picked_up"))
  .orderBy(desc(pickupRequests.pickedUpAt))
  .limit(limit);
}

export async function getPickupStats() {
  const db = await getDb();
  const pending = await db!.select({ count: sql<number>`count(*)` })
    .from(pickupRequests)
    .where(and(
      inArray(pickupRequests.status, ['waiting_teacher', 'sent_to_reception', 'waiting_at_reception']),
      gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`)
    ));
  
  const completedToday = await db!.select({ count: sql<number>`count(*)` })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'picked_up'),
      gte(pickupRequests.pickedUpAt, sql`CURDATE()`)
    ));
  
  const avgResponse = await db!.select({
    avgSeconds: sql<number>`AVG(TIMESTAMPDIFF(SECOND, requestedAt, teacherResponseAt))`
  })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'picked_up'),
      gte(pickupRequests.pickedUpAt, sql`CURDATE()`),
      sql`teacherResponseAt IS NOT NULL`
    ));
  
  const avgTotal = await db!.select({
    avgSeconds: sql<number>`AVG(TIMESTAMPDIFF(SECOND, requestedAt, pickedUpAt))`
  })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'picked_up'),
      gte(pickupRequests.pickedUpAt, sql`CURDATE()`)
    ));

  // Count escalated requests (waiting_teacher + escalatedAt not null)
  const escalated = await db!.select({ count: sql<number>`count(*)` })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'waiting_teacher'),
      sql`escalatedAt IS NOT NULL`,
      gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`)
    ));

  return {
    pendingCount: pending[0]?.count || 0,
    completedToday: completedToday[0]?.count || 0,
    avgResponseSeconds: avgResponse[0]?.avgSeconds || 0,
    avgTotalSeconds: avgTotal[0]?.avgSeconds || 0,
    escalatedCount: escalated[0]?.count || 0,
  };
}

// ============ AUTHORIZED PICKUP PERSONS ============
export async function getAuthorizedPickupPersons(childId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get explicitly registered authorized persons
  const registeredPersons = await db.select()
    .from(authorizedPickupPersons)
    .where(and(
      eq(authorizedPickupPersons.childId, childId),
      eq(authorizedPickupPersons.isActive, true)
    ));
  
  // Auto-include linked parents from parent_children junction table
  const links = await db.select().from(parentChildren).where(eq(parentChildren.childId, childId));
  if (links.length > 0) {
    const parentIds = links.map(l => l.parentId);
    const linkedParents = await db.select().from(users).where(inArray(users.id, parentIds));
    for (const parent of linkedParents) {
      const link = links.find(l => l.parentId === parent.id);
      // Check if this parent is already explicitly registered
      const alreadyRegistered = registeredPersons.some(
        (p) => (p.phone && p.phone === parent.phone) || p.name === parent.name
      );
      if (!alreadyRegistered) {
        const relMap: Record<string, string> = { mother: 'mother', father: 'father', guardian: 'father', parent: 'father' };
        const rel = (relMap[link?.relationship || ''] || 'father') as 'father' | 'mother';
        registeredPersons.unshift({
          id: -(parent.id * 1000 + childId), // unique negative ID for virtual entry
          childId,
          name: parent.name || '\u0648\u0644\u064a \u0627\u0644\u0623\u0645\u0631',
          relationship: rel,
          phone: parent.phone || null,
          nationalId: parent.nationalId || null,
          isActive: true,
          createdAt: parent.createdAt || new Date(),
        });
      }
    }
  } else {
    // Fallback: use legacy children.parentId
    const child = await getChildById(childId);
    if (child?.parentId) {
      const parent = await getUserById(child.parentId);
      if (parent) {
        const alreadyRegistered = registeredPersons.some(
          (p) => (p.phone && p.phone === parent.phone) || p.name === parent.name
        );
        if (!alreadyRegistered) {
          registeredPersons.unshift({
            id: -(parent.id * 1000 + childId),
            childId,
            name: parent.name || '\u0648\u0644\u064a \u0627\u0644\u0623\u0645\u0631',
            relationship: 'father' as const,
            phone: parent.phone || null,
            nationalId: parent.nationalId || null,
            isActive: true,
            createdAt: parent.createdAt || new Date(),
          });
        }
      }
    }
  }
  
  return registeredPersons;
}

export async function addAuthorizedPickupPerson(data: InsertAuthorizedPickupPerson) {
  const db = await getDb();
  const result = await db!.insert(authorizedPickupPersons).values(data);
  return result[0].insertId;
}

export async function removeAuthorizedPickupPerson(id: number) {
  const db = await getDb();
  await db!.update(authorizedPickupPersons).set({ isActive: false }).where(eq(authorizedPickupPersons.id, id));
}

export async function getAllAuthorizedPickupPersonsForChildren(childIds: number[]) {
  const db = await getDb();
  if (!db || childIds.length === 0) return [];
  return db.select()
    .from(authorizedPickupPersons)
    .where(and(
      inArray(authorizedPickupPersons.childId, childIds),
      eq(authorizedPickupPersons.isActive, true)
    ));
}

// ============ LEARNING OBSERVATIONS ============
export async function getLearningObservations(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learningObservations).where(eq(learningObservations.childId, childId)).orderBy(desc(learningObservations.observedAt));
}

export async function createLearningObservation(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(learningObservations).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getLearningObservationsByArea(childId: number, area: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learningObservations).where(and(eq(learningObservations.childId, childId), eq(learningObservations.area, area))).orderBy(desc(learningObservations.observedAt));
}

// ============ PUSH SUBSCRIPTIONS ============
export async function savePushSubscription(data: { userId: number; endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
  const db = await getDb();
  if (!db) return null;
  // Remove existing subscription with same endpoint to avoid duplicates
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint));
  const [result] = await db.insert(pushSubscriptions).values(data).$returningId();
  return result;
}

export async function removePushSubscription(endpoint: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
}

export async function removeExpiredSubscriptions(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return;
  await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, ids));
}

export async function getPushSubscriptionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function getPushSubscriptionsForUsers(userIds: number[]) {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];
  return db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
}

// ============ STAFF USERS HELPER ============
export async function getStaffUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(
      inArray(users.role, ['super_admin', 'admin', 'principal', 'teacher', 'assistant', 'receptionist']),
      eq(users.isActive, true)
    ));
}

export async function getUsersByRoles(roles: string[]) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    role: users.role,
    phone: users.phone,
  })
    .from(users)
    .where(and(
      inArray(users.role, roles as any),
      eq(users.isActive, true)
    ));
}


// ============ STAFF DUTY STATUS ============
export async function getStaffDutyStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(staffDutyStatus).where(eq(staffDutyStatus.userId, userId)).limit(1);
  return rows[0] || null;
}

export async function setStaffDutyStatus(userId: number, isOnDuty: boolean) {
  const db = await getDb();
  if (!db) return;
  const existing = await getStaffDutyStatus(userId);
  if (existing) {
    await db.update(staffDutyStatus)
      .set({ isOnDuty, lastToggleAt: new Date() })
      .where(eq(staffDutyStatus.userId, userId));
  } else {
    await db.insert(staffDutyStatus).values({ userId, isOnDuty, lastToggleAt: new Date() });
  }
}

export async function getOnDutyStaffIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  // Staff who are ON DUTY (either explicitly set or have no record = default on duty)
  const allStaff = await db.select({ id: users.id }).from(users).where(
    and(
      inArray(users.role, ['teacher', 'assistant', 'receptionist', 'admin', 'principal', 'super_admin'] as any),
      eq(users.isActive, true)
    )
  );
  const offDutyRows = await db.select({ userId: staffDutyStatus.userId }).from(staffDutyStatus).where(eq(staffDutyStatus.isOnDuty, false));
  const offDutyIds = new Set(offDutyRows.map(r => r.userId));
  return allStaff.filter(s => !offDutyIds.has(s.id)).map(s => s.id);
}

// ============ PICKUP ALERT SETTINGS ============
export async function getPickupAlertSettings() {
  const db = await getDb();
  if (!db) return { volume: 80, tone: 'urgent' as const, repeatIntervalSeconds: 5, escalationMinutes: 2 };
  const rows = await db.select().from(pickupAlertSettings).limit(1);
  return rows[0] || { volume: 80, tone: 'urgent' as const, repeatIntervalSeconds: 5, escalationMinutes: 2 };
}

export async function updatePickupAlertSettings(data: { volume?: number; tone?: string; repeatIntervalSeconds?: number; escalationMinutes?: number }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(pickupAlertSettings).limit(1);
  if (existing.length > 0) {
    await db.update(pickupAlertSettings).set(data as any).where(eq(pickupAlertSettings.id, existing[0].id));
  } else {
    await db.insert(pickupAlertSettings).values(data as any);
  }
}

// ============ PICKUP ALERT ACKNOWLEDGMENTS ============
export async function acknowledgePickupAlert(pickupRequestId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Check if already acknowledged
  const existing = await db.select().from(pickupAlertAcknowledgments)
    .where(and(
      eq(pickupAlertAcknowledgments.pickupRequestId, pickupRequestId),
      eq(pickupAlertAcknowledgments.userId, userId)
    )).limit(1);
  if (existing.length === 0) {
    await db.insert(pickupAlertAcknowledgments).values({ pickupRequestId, userId });
  }
}

export async function isPickupAlertAcknowledged(pickupRequestId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(pickupAlertAcknowledgments)
    .where(eq(pickupAlertAcknowledgments.pickupRequestId, pickupRequestId)).limit(1);
  return rows.length > 0;
}

export async function getUnacknowledgedPickupAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get active pickup requests that this user hasn't acknowledged
  const activeRequests = await db.select().from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'waiting_teacher'),
      isNull(pickupRequests.escalatedAt)
    ));
  
  if (activeRequests.length === 0) return [];
  
  const ackRows = await db.select().from(pickupAlertAcknowledgments)
    .where(and(
      inArray(pickupAlertAcknowledgments.pickupRequestId, activeRequests.map(r => r.id)),
      eq(pickupAlertAcknowledgments.userId, userId)
    ));
  const ackedIds = new Set(ackRows.map(r => r.pickupRequestId));
  
  const unacked = activeRequests.filter(r => !ackedIds.has(r.id));
  
  // Enrich with child info
  const result = await Promise.all(unacked.map(async (req) => {
    const child = await getChildById(req.childId);
    const classInfo = child?.classId ? await getClassById(child.classId) : null;
    return {
      id: req.id,
      childId: req.childId,
      childName: child ? `${child.firstName} ${child.lastName}` : 'طفل',
      childPhoto: child?.photo || null,
      className: classInfo?.nameAr || classInfo?.name || '',
      requestedAt: req.requestedAt,
      parentId: req.parentId,
    };
  }));
  
  return result;
}


// ============ NURSERY REGISTRATIONS ============

export async function createNurseryRegistration(data: InsertNurseryRegistration) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const result = await database.insert(nurseryRegistrations).values(data);
  return result[0].insertId;
}

export async function getNurseryRegistrations(status?: string) {
  const database = await getDb();
  if (!database) return [];
  if (status) {
    return database.select().from(nurseryRegistrations).where(eq(nurseryRegistrations.status, status as any)).orderBy(desc(nurseryRegistrations.createdAt));
  }
  return database.select().from(nurseryRegistrations).orderBy(desc(nurseryRegistrations.createdAt));
}

export async function getNurseryRegistrationById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database.select().from(nurseryRegistrations).where(eq(nurseryRegistrations.id, id));
  return rows[0] || null;
}

export async function updateNurseryRegistrationStatus(id: number, status: string, reviewedBy?: number, notes?: string, rejectionReason?: string) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  await database.update(nurseryRegistrations).set({
    status: status as any,
    reviewedBy: reviewedBy || null,
    reviewedAt: new Date(),
    adminNotes: notes || null,
    rejectionReason: rejectionReason || null,
  }).where(eq(nurseryRegistrations.id, id));
}

export async function checkNurseryRegistrationEmailExists(email: string) {
  const database = await getDb();
  if (!database) return false;
  const rows = await database.select().from(nurseryRegistrations).where(
    and(
      eq(nurseryRegistrations.ownerEmail, email),
      or(
        eq(nurseryRegistrations.status, 'pending'),
        eq(nurseryRegistrations.status, 'approved')
      )
    )
  );
  return rows.length > 0;
}

// ============ DEVELOPMENTAL ASSESSMENTS (مقياس الكشف المبكر) ============

export async function createDevelopmentalAssessment(data: InsertDevelopmentalAssessment) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  const result = await database.insert(developmentalAssessments).values(data);
  return result[0].insertId;
}

export async function createAssessmentResponses(responses: InsertAssessmentResponse[]) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  await database.insert(assessmentResponses).values(responses);
}

export async function getAssessmentsByChild(childId: number) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select().from(developmentalAssessments)
    .where(eq(developmentalAssessments.childId, childId))
    .orderBy(desc(developmentalAssessments.assessmentDate));
  return rows;
}

export async function getAssessmentById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database.select().from(developmentalAssessments)
    .where(eq(developmentalAssessments.id, id));
  return rows[0] || null;
}

export async function getAssessmentResponsesByAssessmentId(assessmentId: number) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select().from(assessmentResponses)
    .where(eq(assessmentResponses.assessmentId, assessmentId));
  return rows;
}

export async function getAllDevelopmentalAssessments(organizationId: number = 1) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select().from(developmentalAssessments)
    .where(eq(developmentalAssessments.organizationId, organizationId))
    .orderBy(desc(developmentalAssessments.createdAt));
  return rows;
}

export async function deleteDevelopmentalAssessment(id: number) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  await database.delete(assessmentResponses).where(eq(assessmentResponses.assessmentId, id));
  await database.delete(developmentalAssessments).where(eq(developmentalAssessments.id, id));
}
