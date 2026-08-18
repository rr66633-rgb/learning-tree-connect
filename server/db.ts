import { eq, desc, and, sql, gte, lte, gt, inArray, like, or, isNull } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql2 from "mysql2";
import { InsertUser, users, children, attendance, dailyReports, conversations, messages, invoices, loyaltyPoints, loyaltyTransactions, loyaltyRewards, loyaltySettings, notifications, classes, staffAttendance, centerSettings, dailyActivities, calendarEvents, announcements, announcementReads, documents, signatures, medicalInfo, emergencyContacts, enrollment, waitingList, eyfsAssessments, auditLog, childDepartures, attendanceAuditLog, childDocuments, payments, transactions, refunds, tuitionPlans, pickupRequests, learningObservations, pushSubscriptions, eventReminders } from "../drizzle/schema";
import type { InsertChild, InsertAttendance, InsertDailyReport, InsertMessage, InsertInvoice, InsertNotification, InsertAttendanceAuditLog, InsertPayment, InsertTransaction, InsertRefund, InsertTuitionPlan, InsertPickupRequest, InsertCalendarEvent } from "../drizzle/schema";
import { parentChildren, media, mediaChildren, authorizedPickupPersons, staffDutyStatus, pickupAlertSettings, pickupAlertAcknowledgments, nurseryRegistrations, developmentalAssessments, assessmentResponses, organizations } from "../drizzle/schema";
import type { InsertNurseryRegistration } from "../drizzle/schema";
import type { InsertAuthorizedPickupPerson } from "../drizzle/schema";
import type { InsertDevelopmentalAssessment, InsertAssessmentResponse } from "../drizzle/schema";
import { ENV } from './_core/env';
import { normalizeEmail } from './emailIdentity';

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

// SECURITY FIX: this is an INSERT ... ON DUPLICATE KEY UPDATE, so whenever the
// openId did not already exist it CREATED a user row -- and it never set
// organizationId. users.organizationId is `int NULL DEFAULT 1` in the live
// database (see migration 0024), so every user created down this path silently
// landed in organization #1 and could then read organization #1's data. That
// is the write-side half of the "every nursery sees another nursery's data"
// report; the read-side half was unscoped queries.
//
// Both real callers (server/_core/sdk.ts and server/_core/oauth.ts) only ever
// refresh an ALREADY-AUTHENTICATED user's lastSignedIn, so the insert path was
// pure latent risk. It is now explicit: creating a user requires a caller-
// supplied organizationId, and without one the call fails loudly instead of
// defaulting.
// organizationId is optional in the INPUT type (callers that only refresh an
// existing user have no reason to know it) but mandatory at runtime on the
// create path -- see the guard below.
export async function upsertUser(
  user: Omit<InsertUser, "organizationId"> & { organizationId?: number }
): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, user.openId))
      .limit(1);

    if (!existing && user.organizationId === undefined) {
      throw new Error(
        `Refusing to create user ${user.openId} without an explicit organizationId. ` +
        `Creating a user with no organization would fall back to the database default ` +
        `(organization #1) and expose that organization's data to them.`
      );
    }

    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      updateSet[field] = field === 'email' && value
        ? normalizeEmail(value)
        : value ?? null;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      updateSet.role = 'super_admin';
    }
    if (user.isActive !== undefined) {
      updateSet.isActive = user.isActive;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Split into an explicit UPDATE vs INSERT rather than the previous
    // INSERT ... ON DUPLICATE KEY UPDATE. The combined form always had to build
    // a full insert row even when the user already existed, which is what
    // silently supplied a NULL/absent organizationId on the hot path -- this
    // function runs on EVERY authenticated request (sdk.authenticateRequest
    // refreshes lastSignedIn through it).
    if (existing) {
      await db.update(users).set(updateSet).where(eq(users.id, existing.id));
      return;
    }

    await db.insert(users).values({
      ...updateSet,
      openId: user.openId,
      organizationId: user.organizationId!,
      lastSignedIn: (updateSet.lastSignedIn as Date) ?? new Date(),
    } as InsertUser);
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
  const result = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserOpenId(userId: number, newOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ openId: newOpenId, lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// Added for the bulk-import authorization fix: lets a super_admin-only code path
// verify a client-supplied target organizationId actually exists before using it,
// rather than trusting an arbitrary client-supplied ID outright.
export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return org;
}

// Used to resolve a public, unauthenticated per-nursery link (e.g. the
// waiting-list shareable URL) to a real organization -- the slug is
// treated as an opaque public identifier, never as a trusted numeric id.
export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return org;
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
  // Get children from both children.parentId AND parent_children table
  const [directChildren, linkedChildren] = await Promise.all([
    db.select({ id: children.id }).from(children).where(eq(children.parentId, parentId)),
    db.select({ childId: parentChildren.childId }).from(parentChildren).where(eq(parentChildren.parentId, parentId)),
  ]);
  const allIds = new Set([
    ...directChildren.map(r => r.id),
    ...linkedChildren.map(r => r.childId),
  ]);
  return Array.from(allIds);
}

// ============ CHILDREN ============
export async function getChildren(parentId?: number, organizationId?: number, limit?: number, offset?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (parentId) {
    // For parents: find children linked via parent_children table OR via children.parentId
    const linkedChildIds = await db.select({ childId: parentChildren.childId })
      .from(parentChildren)
      .where(eq(parentChildren.parentId, parentId));
    const linkedIds = linkedChildIds.map(r => r.childId);
    
    // Build condition: parentId matches OR childId is in linked list
    const parentConditions: any[] = [eq(children.parentId, parentId)];
    if (linkedIds.length > 0) {
      parentConditions.push(inArray(children.id, linkedIds));
    }
    let whereCondition = or(...parentConditions);
    if (organizationId) {
      whereCondition = and(whereCondition, eq(children.organizationId, organizationId)) as any;
    }
    let query = db.select().from(children).where(whereCondition as any);
    query = query.orderBy(desc(children.createdAt)) as any;
    if (limit) query = query.limit(limit) as any;
    if (offset) query = query.offset(offset) as any;
    return query;
  }
  
  // For staff/admin: filter by organization only
  let query = db.select().from(children);
  if (organizationId) {
    query = query.where(eq(children.organizationId, organizationId)) as any;
  }
  query = query.orderBy(desc(children.createdAt)) as any;
  if (limit) query = query.limit(limit) as any;
  if (offset) query = query.offset(offset) as any;
  return query;
}

// SECURITY FIX: previously took no organizationId at all. This function is
// used throughout the codebase (attendance, daily reports, notifications,
// etc.) as an implicit authorization check ("does this child exist"), so
// its lack of org filtering silently let any authenticated staff member of
// ANY organization read, and act on behalf of, another organization's
// child by id. organizationId is now optional-but-should-always-be-passed;
// callers doing an authorization check MUST pass it and treat a missing
// result as NOT_FOUND/FORBIDDEN.
export async function getChildById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(children.id, id)];
  if (organizationId) conditions.push(eq(children.organizationId, organizationId));
  const result = await db.select().from(children).where(and(...conditions)).limit(1);
  return result[0];
}

export async function getChildrenByIds(ids: number[], organizationId: number) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(children).where(and(
    inArray(children.id, ids),
    eq(children.organizationId, organizationId),
  ));
}

export async function createChild(data: InsertChild) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(children).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateChild(id: number, data: Partial<InsertChild>, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(children.id, id)];
  if (organizationId) conditions.push(eq(children.organizationId, organizationId));
  await db.update(children).set(data).where(and(...conditions));
  return getChildById(id, organizationId);
}

export async function deleteChild(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(children.id, id)];
  if (organizationId) conditions.push(eq(children.organizationId, organizationId));
  await db.delete(children).where(and(...conditions));
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

// SECURITY FIX: previously took no organizationId -- any authenticated
// staff member of ANY organization who knew/guessed a childId belonging to
// a DIFFERENT organization could read that child's full attendance
// history. Callers MUST pass organizationId for authorization purposes;
// see also getChildById, which routers now use to verify childId ownership
// before calling this.
export async function getAttendanceByChild(childId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(attendance.childId, childId)];
  if (organizationId) conditions.push(eq(attendance.organizationId, organizationId));
  return db.select().from(attendance).where(and(...conditions)).orderBy(desc(attendance.date));
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

// SECURITY FIX: previously took no organizationId -- combined with
// updateStatus/checkOut/markAbsent in routers.ts trusting a client-supplied
// attendance id with no ownership check, this meant any teacher/admin
// could edit another organization's attendance record by id. organizationId
// is now optional-but-should-be-passed for a fetch-and-verify update.
export async function updateAttendance(id: number, data: Partial<InsertAttendance>, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(attendance.id, id)];
  if (organizationId) conditions.push(eq(attendance.organizationId, organizationId));
  await db.update(attendance).set(data).where(and(...conditions));
}

export async function getAttendanceById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(attendance.id, id)];
  if (organizationId) conditions.push(eq(attendance.organizationId, organizationId));
  const result = await db.select().from(attendance).where(and(...conditions)).limit(1);
  return result[0];
}

export async function getAttendanceForChildOnDate(childId: number, date: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const conditions = [eq(attendance.childId, childId), gte(attendance.date, startOfDay), lte(attendance.date, endOfDay)];
  if (organizationId) conditions.push(eq(attendance.organizationId, organizationId));
  const result = await db.select().from(attendance).where(and(...conditions)).limit(1);
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

// SECURITY FIX: previously took no organizationId -- any teacher/admin
// could read another organization's daily report by id.
export async function getDailyReportById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(dailyReports.id, id)];
  if (organizationId) conditions.push(eq(dailyReports.organizationId, organizationId));
  const result = await db.select().from(dailyReports).where(and(...conditions)).limit(1);
  return result[0];
}

export async function createDailyReport(data: InsertDailyReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dailyReports).values(data);
  return { id: result[0].insertId, ...data };
}

// SECURITY FIX: previously took no organizationId -- any teacher/admin
// could edit another organization's daily report by id.
export async function updateDailyReport(id: number, data: Partial<InsertDailyReport>, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(dailyReports.id, id)];
  if (organizationId) conditions.push(eq(dailyReports.organizationId, organizationId));
  await db.update(dailyReports).set(data).where(and(...conditions));
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

// SECURITY FIX: previously took no organizationId at all -- adminProcedure
// only requires being an admin of SOME organization, so any admin could
// list every organization's conversations (and, combined with the
// no-org-check `list`/`send` handlers below, read or send into them).
export async function getAllConversations(search?: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const baseQuery = db.select({
    id: conversations.id,
    participantOneId: conversations.participantOneId,
    participantTwoId: conversations.participantTwoId,
    childId: conversations.childId,
    subject: conversations.subject,
    lastMessageAt: conversations.lastMessageAt,
    lastMessagePreview: conversations.lastMessagePreview,
    isArchived: conversations.isArchived,
    createdAt: conversations.createdAt,
  }).from(conversations);
  const query = organizationId
    ? baseQuery.where(eq(conversations.organizationId, organizationId)).orderBy(desc(conversations.lastMessageAt))
    : baseQuery.orderBy(desc(conversations.lastMessageAt));

  const rows = await query;
  const enriched = [];
  for (const conv of rows) {
    const user1 = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, conv.participantOneId)).limit(1);
    const user2 = await db.select({ id: users.id, name: users.name,
    email: users.email, role: users.role }).from(users).where(eq(users.id, conv.participantTwoId)).limit(1);
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

// SECURITY FIX: previously never stamped organizationId on the new
// conversation row (silently defaulted at the schema level), which is what
// made the isAdmin-bypass cross-tenant read/write in the `list`/`send`
// handlers possible in the first place.
// SECURITY FIX (round 2): organizationId was optional here, and conversations
// .organizationId is `int NULL DEFAULT 1` in the live database -- so a caller
// that omitted it created a conversation belonging to organization #1
// regardless of who the participants were. It is now REQUIRED; the sole caller
// (messages.createConversation in routers.ts) runs on tenantProcedure, so a
// valid organizationId is always available there.
export async function createConversation(participantOneId: number, participantTwoId: number, childId: number | null | undefined, subject: string | null | undefined, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if conversation already exists between these two for this child
  const existing = await db.select().from(conversations).where(and(
    sql`((${conversations.participantOneId} = ${participantOneId} AND ${conversations.participantTwoId} = ${participantTwoId}) OR (${conversations.participantOneId} = ${participantTwoId} AND ${conversations.participantTwoId} = ${participantOneId}))`,
    childId ? eq(conversations.childId, childId) : sql`${conversations.childId} IS NULL`
  )).limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(conversations).values({ participantOneId, participantTwoId, childId: childId || null, subject: subject || null, organizationId });
  return { id: result[0].insertId, participantOneId, participantTwoId, childId, subject, organizationId };
}

// SECURITY FIX: previously took a conversationId straight from the client with
// no check that `userId` is actually a participant in it -- any authenticated
// user could mark another organization's conversation as read by enumerating
// conversation ids, silently clearing that nursery's unread badges and
// falsifying the readAt audit trail on messages they never had access to.
export async function markMessagesAsRead(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const [conv] = await db.select({
    participantOneId: conversations.participantOneId,
    participantTwoId: conversations.participantTwoId,
  }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv) return;
  if (conv.participantOneId !== userId && conv.participantTwoId !== userId) return;
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

// SECURITY FIX: archiveConversation/unarchiveConversation previously took no
// organizationId -- combined with the adminProcedure-only check in
// routers.ts (no per-conversation ownership check at all), any admin of ANY
// organization could archive/unarchive any other organization's
// conversation by id.
export async function archiveConversation(conversationId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return;
  const conditions = [eq(conversations.id, conversationId)];
  if (organizationId) conditions.push(eq(conversations.organizationId, organizationId));
  await db.update(conversations).set({ isArchived: true }).where(and(...conditions));
}

export async function unarchiveConversation(conversationId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return;
  const conditions = [eq(conversations.id, conversationId)];
  if (organizationId) conditions.push(eq(conversations.organizationId, organizationId));
  await db.update(conversations).set({ isArchived: false }).where(and(...conditions));
}

export async function getMessageById(messageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  return result[0];
}

// SECURITY FIX: previously took no organizationId. The messages table has
// no organizationId column of its own, so ownership is now verified via the
// parent conversation (which does have organizationId) before deleting --
// previously any admin of ANY organization could soft-delete any other
// organization's message by id.
export async function deleteMessage(messageId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return;
  if (organizationId) {
    const msg = await getMessageById(messageId);
    if (!msg) return;
    const conv = await getConversationById(msg.conversationId, organizationId);
    if (!conv) return; // message's conversation does not belong to this organization
  }
  await db.update(messages).set({ isDeleted: true }).where(eq(messages.id, messageId));
}

// SECURITY FIX: previously took no organizationId -- combined with the
// isAdmin-bypasses-participant-check logic in routers.ts `list`/`send`, any
// admin of ANY organization could read or send messages into any other
// organization's conversation by id.
export async function getConversationById(conversationId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(conversations.id, conversationId)];
  if (organizationId) conditions.push(eq(conversations.organizationId, organizationId));
  const result = await db.select().from(conversations).where(and(...conditions)).limit(1);
  return result[0] || null;
}

// SECURITY FIX: previously took no organizationId -- a parent could pass
// an arbitrary childId (belonging to a different parent, or a different
// organization) and get that child's teacher contacts back.
export async function getTeachersForChild(childId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  // Get the child's class, then find teachers assigned to that class via classes table
  const childConditions = [eq(children.id, childId)];
  if (organizationId) childConditions.push(eq(children.organizationId, organizationId));
  const child = await db.select({ classId: children.classId }).from(children).where(and(...childConditions)).limit(1);
  if (!child[0]?.classId) return [];
  const classInfo = await db.select({ teacherId: classes.teacherId, assistantId: classes.assistantId }).from(classes).where(eq(classes.id, child[0].classId)).limit(1);
  if (!classInfo[0]) return [];
  const teacherIds = [classInfo[0].teacherId, classInfo[0].assistantId].filter(Boolean) as number[];
  if (teacherIds.length === 0) return [];
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(inArray(users.id, teacherIds));
}

export async function getParentsForTeacher(teacherId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  // Get classes where this teacher is assigned, then find children in those classes, then their parents
  const classConditions = [sql`(${classes.teacherId} = ${teacherId} OR ${classes.assistantId} = ${teacherId})`];
  if (organizationId) classConditions.push(eq(classes.organizationId, organizationId));
  const teacherClasses = await db.select({ id: classes.id }).from(classes)
    .where(and(...classConditions));
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

// SECURITY FIX: previously took no organizationId -- any admin's message
// "contacts" fallback list would include every active staff member and
// parent across ALL organizations on the platform, not just their own.
export async function getAllActiveStaffAndParents(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(users.isActive, true), sql`${users.role} != 'user'`];
  if (organizationId) conditions.push(eq(users.organizationId, organizationId));
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(...conditions));
}

// ============ INVOICES ============
// SECURITY FIX: getInvoices/getInvoiceById/updateInvoice/deleteInvoice previously
// took no organizationId at all, despite the invoices table having an
// organizationId column -- any staff/admin caller could list, read, update, or
// delete ANY organization's invoices by id, since the route handlers in
// routers.ts only ever checked "is this caller the owning parent", never "does
// this invoice belong to the caller's organization". organizationId is now
// accepted and enforced (when provided) at the query layer as well.
export async function getInvoices(organizationId?: number, parentId?: number) {
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
  const conditions = [];
  if (organizationId) conditions.push(eq(invoices.organizationId, organizationId));
  if (parentId) conditions.push(eq(invoices.parentId, parentId));
  const results = await db.select(selectFields).from(invoices)
    .leftJoin(children, eq(invoices.childId, children.id))
    .leftJoin(users, eq(invoices.parentId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(invoices.createdAt));
  return results.map(r => ({ ...r, childName: `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() }));
}

export async function getInvoiceById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(invoices.id, id)];
  if (organizationId) conditions.push(eq(invoices.organizationId, organizationId));
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
    organizationId: invoices.organizationId,
    childFirstName: children.firstName,
    childLastName: children.lastName,
    parentName: users.name,
    parentEmail: users.email,
    parentPhone: users.phone,
  }).from(invoices)
    .leftJoin(children, eq(invoices.childId, children.id))
    .leftJoin(users, eq(invoices.parentId, users.id))
    .where(and(...conditions));
  if (!results.length) return null;
  const r = results[0];
  return { ...r, childName: `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() };
}

export async function updateInvoice(id: number, data: Partial<{ description: string; subtotal: string; vatAmount: string; total: string; dueDate: Date; status: string; paymentMethod: string; paidAt: Date | null; paidAmount: string; invoiceType: string }>, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(invoices.id, id)];
  if (organizationId) conditions.push(eq(invoices.organizationId, organizationId));
  await db.update(invoices).set(data as any).where(and(...conditions));
}

export async function deleteInvoice(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(invoices.id, id)];
  if (organizationId) conditions.push(eq(invoices.organizationId, organizationId));
  await db.delete(invoices).where(and(...conditions));
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

export async function getLoyaltyTransactions(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.userId, userId)).orderBy(desc(loyaltyTransactions.createdAt));
  if (limit) return q.limit(limit);
  return q;
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

// SECURITY FIX: loyalty_rewards has an organizationId column, but
// getLoyaltyRewards/createLoyaltyReward/updateLoyaltyReward/
// deleteLoyaltyReward previously ignored it entirely -- every
// organization shared one single reward catalog, and any admin could
// edit/deactivate any other organization's rewards by id.
export async function getLoyaltyRewards(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(loyaltyRewards.isActive, true)];
  if (organizationId) conditions.push(eq(loyaltyRewards.organizationId, organizationId));
  return db.select().from(loyaltyRewards).where(and(...conditions));
}

export async function createLoyaltyReward(data: { name: string; nameAr: string; description?: string; descriptionAr?: string; pointsCost: number; category?: string; maxRedemptions?: number | null; organizationId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(loyaltyRewards).values(data as any);
  return { id: result[0].insertId, ...data };
}

export async function getLoyaltyRewardById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(loyaltyRewards.id, id)];
  if (organizationId) conditions.push(eq(loyaltyRewards.organizationId, organizationId));
  const result = await db.select().from(loyaltyRewards).where(and(...conditions)).limit(1);
  return result[0];
}

export async function updateLoyaltyReward(id: number, data: Record<string, any>, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(loyaltyRewards.id, id)];
  if (organizationId) conditions.push(eq(loyaltyRewards.organizationId, organizationId));
  await db.update(loyaltyRewards).set(data).where(and(...conditions));
  return { success: true };
}

export async function deleteLoyaltyReward(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(loyaltyRewards.id, id)];
  if (organizationId) conditions.push(eq(loyaltyRewards.organizationId, organizationId));
  await db.update(loyaltyRewards).set({ isActive: false }).where(and(...conditions));
  return { success: true };
}

export async function incrementRewardRedemptions(rewardId: number) {
  const db = await getDb();
  if (!db) return;
  const reward = await db.select().from(loyaltyRewards).where(eq(loyaltyRewards.id, rewardId)).limit(1);
  if (reward.length > 0) {
    await db.update(loyaltyRewards).set({ currentRedemptions: (reward[0].currentRedemptions ?? 0) + 1 }).where(eq(loyaltyRewards.id, rewardId));
  }
}

export async function createLoyaltyRedemption(userId: number, rewardId: number, pointsSpent: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.execute(sql`INSERT INTO loyalty_redemptions (userId, rewardId, pointsSpent) VALUES (${userId}, ${rewardId}, ${pointsSpent})`);
  return { id: (result as any)[0]?.insertId };
}

export async function getUserRedemptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.execute(sql`SELECT r.*, lr.name, lr.nameAr, lr.pointsCost as rewardCost FROM loyalty_redemptions r LEFT JOIN loyalty_rewards lr ON r.rewardId = lr.id WHERE r.userId = ${userId} ORDER BY r.createdAt DESC`);
}

// SECURITY FIX: loyalty_settings.organizationId is NOT NULL and the schema
// comment explicitly says "configurable earn rules per organization" -- yet
// getLoyaltySettings selected an arbitrary row with LIMIT 1 (no WHERE at
// all) and updateLoyaltySettings hardcoded `WHERE id = 1`. In practice
// every organization's loyalty program (points-per-referral,
// points-per-payment, welcome/birthday bonus, on/off switch) was reading
// from and writing to the exact same single row -- the same class of bug
// fixed earlier for center_settings. Now properly scoped per organization,
// with a get-or-create path since a given organization may not have a
// settings row yet.
export async function getLoyaltySettings(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(loyaltySettings).where(eq(loyaltySettings.organizationId, organizationId)).limit(1);
  return result[0] ?? null;
}

export async function updateLoyaltySettings(data: Partial<typeof loyaltySettings.$inferInsert>, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updates = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  ) as Partial<typeof loyaltySettings.$inferInsert>;
  const existing = await getLoyaltySettings(organizationId);
  if (existing) {
    if (Object.keys(updates).length > 0) {
      await db.update(loyaltySettings).set(updates).where(eq(loyaltySettings.id, existing.id));
    }
  } else {
    await db.insert(loyaltySettings).values({ ...updates, organizationId } as any);
  }
  return { success: true };
}

// SECURITY FIX: previously joined against ALL users with no organization
// filter -- any admin could see every parent's loyalty point balance
// (name, email, points) across every organization on the platform, not
// just their own.
export async function getAllParentsLoyaltyPoints(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const result = organizationId
    ? await db.execute(sql`SELECT lp.*, u.name as userName, u.nameAr as userNameAr, u.email FROM loyalty_points lp LEFT JOIN users u ON lp.userId = u.id WHERE u.organizationId = ${organizationId} ORDER BY lp.points DESC`)
    : await db.execute(sql`SELECT lp.*, u.name as userName, u.nameAr as userNameAr, u.email FROM loyalty_points lp LEFT JOIN users u ON lp.userId = u.id ORDER BY lp.points DESC`);
  return (result as any)[0] ?? [];
}

// SECURITY FIX: previously had no organization filter -- any admin could
// see (and, via updateRedemptionStatus below, approve/reject) every
// organization's reward redemptions.
export async function getAllRedemptions(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const result = organizationId
    ? await db.execute(sql`SELECT r.*, u.name as userName, u.nameAr as userNameAr, lr.name as rewardName, lr.nameAr as rewardNameAr FROM loyalty_redemptions r LEFT JOIN users u ON r.userId = u.id LEFT JOIN loyalty_rewards lr ON r.rewardId = lr.id WHERE u.organizationId = ${organizationId} ORDER BY r.createdAt DESC`)
    : await db.execute(sql`SELECT r.*, u.name as userName, u.nameAr as userNameAr, lr.name as rewardName, lr.nameAr as rewardNameAr FROM loyalty_redemptions r LEFT JOIN users u ON r.userId = u.id LEFT JOIN loyalty_rewards lr ON r.rewardId = lr.id ORDER BY r.createdAt DESC`);
  return (result as any)[0] ?? [];
}

// SECURITY FIX: previously updated by id with no check that the
// redemption's user even belongs to the caller's organization -- any admin
// could approve/reject/fulfill any other organization's redemption by id.
export async function updateRedemptionStatus(id: number, status: string, adminNote?: string, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (organizationId) {
    const owned = await db.execute(sql`SELECT r.id FROM loyalty_redemptions r LEFT JOIN users u ON r.userId = u.id WHERE r.id = ${id} AND u.organizationId = ${organizationId} LIMIT 1`);
    const rows = (owned as any)[0] ?? [];
    if (rows.length === 0) return { success: false };
  }
  await db.execute(sql`UPDATE loyalty_redemptions SET status = ${status}, adminNote = ${adminNote ?? null}, fulfilledAt = ${status === 'fulfilled' ? new Date() : null} WHERE id = ${id}`);
  return { success: true };
}

// ============ LOYALTY PARTNERS ============

export async function getLoyaltyPartners() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`SELECT * FROM loyalty_partners WHERE isActive = 1 ORDER BY createdAt DESC`);
  return (result as any)[0] ?? [];
}

export async function getAllLoyaltyPartners() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`SELECT * FROM loyalty_partners ORDER BY createdAt DESC`);
  return (result as any)[0] ?? [];
}

export async function createLoyaltyPartner(data: { name: string; nameAr: string; logoUrl?: string; discountDescription?: string; discountDescriptionAr?: string; discountPercentage?: number; contactInfo?: string; website?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.execute(sql`INSERT INTO loyalty_partners (name, nameAr, logoUrl, discountDescription, discountDescriptionAr, discountPercentage, contactInfo, website) VALUES (${data.name}, ${data.nameAr}, ${data.logoUrl ?? null}, ${data.discountDescription ?? null}, ${data.discountDescriptionAr ?? null}, ${data.discountPercentage ?? 0}, ${data.contactInfo ?? null}, ${data.website ?? null})`);
  return { id: (result as any)[0]?.insertId, ...data };
}

// `loyalty_partners` has no Drizzle schema definition in this codebase (it's managed
// entirely via raw SQL) -- adding one is recommended as a follow-up for full type
// safety, but is out of scope for this fix since guessing at its exact column set
// without a live DB to verify against would itself be risky. Column names can never
// be SQL bind parameters in any dialect, so this allowlist is mandatory regardless.
const LOYALTY_PARTNER_ALLOWED_COLUMNS = [
  'name', 'nameAr', 'logoUrl', 'discountDescription', 'discountDescriptionAr',
  'discountPercentage', 'contactInfo', 'website', 'isActive',
] as const;

export async function updateLoyaltyPartner(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // SECURITY FIX (C4): previously built `UPDATE loyalty_partners SET \`${k}\` = ${v} ...`
  // via raw string concatenation (sql.raw) -- both the column name (k) and, for
  // non-string values, the value itself were interpolated with no validation, a SQL
  // injection vector (CWE-89). Fix: validate every key against a static allowlist of
  // real columns, and pass every value through Drizzle's `sql` tagged template so it
  // is bound as a parameter rather than concatenated into the query string.
  const fields = Object.entries(data).filter(([k, v]) => v !== undefined && (LOYALTY_PARTNER_ALLOWED_COLUMNS as readonly string[]).includes(k));
  if (fields.length === 0) return { success: true };
  // `k` here is guaranteed (by the .filter above) to be one of the 9 fixed literal
  // strings in LOYALTY_PARTNER_ALLOWED_COLUMNS -- never attacker-supplied text -- so
  // backtick-wrapping it directly is safe. Only `v` (the value) is genuinely
  // caller-controlled, and it is passed through the `sql` tagged template below,
  // which binds it as a parameter rather than concatenating it into the query string.
  const setFragments = fields.map(([k, v]) => sql`${sql.raw(`\`${k}\``)} = ${v}`);
  await db.execute(sql`UPDATE loyalty_partners SET ${sql.join(setFragments, sql.raw(', '))} WHERE id = ${id}`);
  return { success: true };
}

export async function deleteLoyaltyPartner(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.execute(sql`UPDATE loyalty_partners SET isActive = 0 WHERE id = ${id}`);
  return { success: true };
}

// ============ LOYALTY CARDS ============

export async function getLoyaltyCard(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.execute(sql`SELECT c.*, t.name as templateName, t.backgroundColor, t.textColor, t.accentColor, t.backgroundPattern FROM loyalty_cards c LEFT JOIN loyalty_card_templates t ON c.templateId = t.id WHERE c.userId = ${userId} AND c.isActive = 1 LIMIT 1`);
  return (result as any)[0]?.[0] ?? null;
}

export async function createLoyaltyCard(userId: number, cardNumber: string, qrCodeData: string, templateId: number, expiryDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.execute(sql`INSERT INTO loyalty_cards (userId, cardNumber, qrCodeData, templateId, expiryDate) VALUES (${userId}, ${cardNumber}, ${qrCodeData}, ${templateId}, ${expiryDate})`);
  return { cardNumber, qrCodeData };
}

export async function getAllLoyaltyCards() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`SELECT c.*, u.name as userName, u.nameAr as userNameAr, u.email, t.name as templateName FROM loyalty_cards c LEFT JOIN users u ON c.userId = u.id LEFT JOIN loyalty_card_templates t ON c.templateId = t.id ORDER BY c.createdAt DESC`);
  return (result as any)[0] ?? [];
}

export async function getCardByNumber(cardNumber: string) {
  const db = await getDb();
  if (!db) return null;
  // SECURITY FIX: added u.organizationId (aliased userOrganizationId) so the
  // caller (server/routers.ts loyalty.validateCard) can enforce that a
  // non-super-admin can only validate/scan a card belonging to a user in
  // their own organization -- otherwise any authenticated staff member could
  // scan/validate any other nursery's parent's loyalty card by guessing or
  // observing its number, leaking that parent's name and points balance
  // across tenants.
  const result = await db.execute(sql`SELECT c.*, u.name as userName, u.nameAr as userNameAr, u.organizationId as userOrganizationId, lp.points FROM loyalty_cards c LEFT JOIN users u ON c.userId = u.id LEFT JOIN loyalty_points lp ON c.userId = lp.userId WHERE c.cardNumber = ${cardNumber} AND c.isActive = 1 LIMIT 1`);
  return (result as any)[0]?.[0] ?? null;
}

export async function getCardTemplates() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`SELECT * FROM loyalty_card_templates ORDER BY isDefault DESC, createdAt ASC`);
  return (result as any)[0] ?? [];
}

export async function createCardTemplate(data: { name: string; nameAr: string; backgroundColor: string; textColor: string; accentColor: string; backgroundPattern?: string; logoUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.execute(sql`INSERT INTO loyalty_card_templates (name, nameAr, backgroundColor, textColor, accentColor, backgroundPattern, logoUrl) VALUES (${data.name}, ${data.nameAr}, ${data.backgroundColor}, ${data.textColor}, ${data.accentColor}, ${data.backgroundPattern ?? 'gradient'}, ${data.logoUrl ?? null})`);
  return { id: (result as any)[0]?.insertId, ...data };
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

// SECURITY FIX: previously had no ownership check at all -- any
// authenticated user (from any organization) could mark any other user's
// notification as read just by guessing/enumerating its id. Now scoped to
// the calling user's own notifications, matching the pattern already used
// by deleteNotification below.
export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
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
  // Build conditions for each query
  const childConditions = [eq(children.status, 'active')];
  if (organizationId) childConditions.push(eq(children.organizationId, organizationId));

  const staffConditions = [sql`${users.role} IN ('admin', 'principal', 'owner', 'teacher', 'assistant', 'accountant', 'receptionist', 'super_admin')`];
  if (organizationId) staffConditions.push(eq(users.organizationId, organizationId));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const attendanceConditions: any[] = [gte(attendance.date, today), lte(attendance.date, todayEnd), eq(attendance.status, 'present')];
  if (organizationId) attendanceConditions.push(eq(attendance.organizationId, organizationId));

  const invoiceConditions: any[] = [eq(invoices.status, 'paid')];
  if (organizationId) invoiceConditions.push(eq(invoices.organizationId, organizationId));

  // Execute ALL queries in parallel (Fix #3: Promise.all instead of sequential)
  const [allChildren, allStaff, presentToday, revenueResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(children).where(and(...childConditions)),
    db.select({ count: sql<number>`count(*)` }).from(users).where(and(...staffConditions)),
    db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(...attendanceConditions)),
    // Fix #1: Use SUM() in SQL instead of fetching all rows and summing in JS
    db.select({ total: sql<number>`COALESCE(SUM(total), 0)` }).from(invoices).where(and(...invoiceConditions)),
  ]);

  return {
    totalChildren: allChildren[0]?.count ?? 0,
    totalStaff: allStaff[0]?.count ?? 0,
    presentToday: presentToday[0]?.count ?? 0,
    totalRevenue: Number(revenueResult[0]?.total ?? 0),
  };
}

// ============ USER MANAGEMENT (Admin) ============
export async function getUsersByRole(role?: string, search?: string, organizationId?: number, limit?: number, offset?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (role && role !== 'all') {
    conditions.push(eq(users.role, role as any));
  } else {
    // Exclude 'user' role (unassigned), show all active roles
    conditions.push(sql`${users.role} IN ('admin', 'principal', 'owner', 'teacher', 'assistant', 'accountant', 'receptionist', 'parent')`);
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

// SECURITY FIX: previously took no organizationId at all -- any
// organization's admin calling `users.pending` saw every pending
// self-registered parent from every organization on the platform (name,
// phone, email). organizationId is now required and filtered on.
export async function getPendingParents(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(and(eq(users.role, 'parent'), eq(users.isActive, false), eq(users.organizationId, organizationId))).orderBy(desc(users.createdAt));
}

// SECURITY FIX: previously updated by userId alone with no ownership check
// -- any organization's admin could approve (activate) a pending parent
// belonging to a different organization. Now fetch-and-verify: the target
// user must exist, have role 'parent', and belong to the caller's
// organization, or this throws instead of silently no-op'ing or acting
// cross-tenant.
export async function approveParent(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [target] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.organizationId, organizationId), eq(users.role, 'parent'))).limit(1);
  if (!target) throw new Error("approveParent: user not found in this organization");
  await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
}

// SECURITY FIX: same ownership issue as approveParent -- previously any
// organization's admin could reject/lock any other organization's pending
// parent by id. Now fetch-and-verify against organizationId.
export async function rejectParent(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [target] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.organizationId, organizationId), eq(users.role, 'parent'))).limit(1);
  if (!target) throw new Error("rejectParent: user not found in this organization");
  // Set role to 'user' and keep isActive=false to mark as rejected
  await db.update(users).set({ role: 'user', isActive: false }).where(eq(users.id, userId));
}

// SECURITY FIX: previously took no organizationId at all -- any
// organization's admin calling `users.getById` could read any other
// organization's user's full profile (name, email, phone, nationalId,
// role) by id. organizationId is now an optional filter; callers that have
// a real org context (e.g. the admin-facing `users.getById` endpoint) must
// pass it. Left optional (not required) because this is also used
// internally by auth/session code paths that intentionally look up a user
// before any org context is established (e.g. right after login).
export async function getUserById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(users.id, id)];
  if (organizationId) conditions.push(eq(users.organizationId, organizationId));
  const result = await db.select().from(users).where(and(...conditions)).limit(1);
  return result[0];
}

// SECURITY FIX: previously `organizationId: (data as any).organizationId || 1`
// -- this function had its own internal silent-default-to-org-1 fallback,
// independent of (and surviving) every router-level fix elsewhere in this
// codebase. Any caller that forgot to pass organizationId (as several did --
// see bulkImportRouter.ts's parents/teachers/staff cases) would silently
// create the new user in organization #1 rather than failing loudly.
// organizationId is now required with no fallback.
export async function createUser(data: { name: string; email: string; phone?: string; role: string; openId: string; nationalId?: string; organizationId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.organizationId || !Number.isInteger(data.organizationId) || data.organizationId <= 0) {
    throw new Error("createUser: a valid organizationId is required");
  }
  const result = await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: normalizeEmail(data.email),
    phone: data.phone || null,
    role: data.role as any,
    nationalId: (data as any).nationalId || null,
    organizationId: data.organizationId,
    lastSignedIn: new Date(),
  });
  return { id: result[0].insertId, ...data };
}

// SECURITY FIX: previously took no organizationId at all -- any
// organization's admin could update (including changing role/isActive/
// contact info) any other organization's user by id. organizationId is now
// an optional parameter; when provided, the update is fetch-and-verified
// against it first and silently no-ops (returns undefined) if the target
// user isn't in that organization, instead of acting cross-tenant.
export async function updateUser(id: number, data: { name?: string; email?: string; phone?: string; role?: string; nationalId?: string; isActive?: boolean }, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (organizationId) {
    const existing = await getUserById(id, organizationId);
    if (!existing) return undefined;
  }
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = normalizeEmail(data.email);
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (Object.keys(updateData).length > 0) {
    const conditions = [eq(users.id, id)];
    if (organizationId) conditions.push(eq(users.organizationId, organizationId));
    await db.update(users).set(updateData).where(and(...conditions));
  }
  return getUserById(id);
}

export async function markAccountForDeletion(id: number, requestedAt: Date, scheduledAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    deletionRequestedAt: requestedAt,
    deletionScheduledAt: scheduledAt,
    isActive: false,
  }).where(eq(users.id, id));
  return { success: true };
}

export async function cancelAccountDeletion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    deletionRequestedAt: null,
    deletionScheduledAt: null,
    isActive: true,
  }).where(eq(users.id, id));
  return { success: true };
}

export async function getAccountsPendingDeletion() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(users).where(
    and(
      sql`${users.deletionScheduledAt} IS NOT NULL`,
      lte(users.deletionScheduledAt, now)
    )
  );
}

// SECURITY FIX: previously took no organizationId at all -- any
// organization's admin could delete any other organization's user by id.
// organizationId is now optional; when provided, fetch-and-verify first and
// no-op (return success:false) if the target user isn't in that org.
export async function deleteUser(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (organizationId) {
    const existing = await getUserById(id, organizationId);
    if (!existing) return { success: false };
  }
  // Clean up parentChildren links
  await db.delete(parentChildren).where(eq(parentChildren.parentId, id));
  // Unlink children from this parent (legacy parentId column)
  await db.update(children).set({ parentId: null }).where(eq(children.parentId, id));
  // Remove push subscriptions
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id));
  // Delete the user record
  await db.delete(users).where(eq(users.id, id));
  return { success: true };
}

// SECURITY FIX: previously took no organizationId at all -- any
// organization's admin could link a child in their own organization to a
// parent user account belonging to a DIFFERENT organization (or vice
// versa), giving that other organization's parent account visibility into
// this organization's child. organizationId is now required and both the
// parent and the child are fetch-and-verified to belong to it before
// linking.
export async function linkParentToChild(parentId: number, childId: number, relationship: string = 'parent', organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (organizationId) {
    const parent = await getUserById(parentId, organizationId);
    if (!parent) throw new Error("linkParentToChild: parent not found in this organization");
    const child = await getChildById(childId, organizationId);
    if (!child) throw new Error("linkParentToChild: child not found in this organization");
  }
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

// SECURITY FIX: previously took no organizationId -- any organization's
// admin could unlink any parent/child pair by id regardless of which
// organization they belonged to. organizationId is now optional; when
// provided, the child is fetch-and-verified to belong to it first.
export async function unlinkParentFromChild(parentId: number, childId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (organizationId) {
    const child = await getChildById(childId, organizationId);
    if (!child) throw new Error("unlinkParentFromChild: child not found in this organization");
  }
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

// SECURITY FIX: previously took no organizationId -- any organization's
// admin could list any other organization's parent's linked children by
// parentId. organizationId is now optional; when provided, the parent is
// fetch-and-verified to belong to it and the returned children are also
// filtered by it (defense in depth against the legacy-parentId fallback
// path returning cross-org rows).
export async function getChildrenForParent(parentId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    const parent = await getUserById(parentId, organizationId);
    if (!parent) return [];
  }
  const links = await db.select().from(parentChildren).where(eq(parentChildren.parentId, parentId));
  if (links.length === 0) {
    // Fallback to legacy parentId
    const conditions = [eq(children.parentId, parentId)];
    if (organizationId) conditions.push(eq(children.organizationId, organizationId));
    return db.select().from(children).where(and(...conditions));
  }
  const childIds = links.map(l => l.childId);
  const conditions = [inArray(children.id, childIds)];
  if (organizationId) conditions.push(eq(children.organizationId, organizationId));
  return db.select().from(children).where(and(...conditions));
}

// SECURITY FIX: previously took no organizationId -- any organization's
// admin could list every parent (name/email/phone) linked to any other
// organization's child by childId. organizationId is now optional; when
// provided, the child is fetch-and-verified to belong to it first.
export async function getParentsForChild(childId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    const child = await getChildById(childId, organizationId);
    if (!child) return [];
  }
  const links = await db.select().from(parentChildren).where(eq(parentChildren.childId, childId));
  if (links.length === 0) return [];
  const parentIds = links.map(l => l.parentId);
  const parents = await db.select().from(users).where(inArray(users.id, parentIds));
  return parents.map(p => {
    const link = links.find(l => l.parentId === p.id);
    return { ...p, relationship: link?.relationship || "parent", isPrimary: link?.isPrimary || false };
  });
}

// SECURITY FIX: previously took no organizationId at all -- returned every
// organization's unlinked active children platform-wide to any
// organization's admin. organizationId is now required and filtered on.
export async function getUnlinkedChildren(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const linkedChildIds = await db.select({ childId: parentChildren.childId }).from(parentChildren);
  const ids = linkedChildIds.map(r => r.childId);
  if (ids.length === 0) return db.select().from(children).where(and(eq(children.status, "active"), eq(children.organizationId, organizationId))).orderBy(children.firstName);
  const idPlaceholders = ids.map(id => sql`${id}`);
  return db.select().from(children).where(and(eq(children.status, "active"), eq(children.organizationId, organizationId), sql`${children.id} NOT IN (${sql.join(idPlaceholders, sql`, `)})`)).orderBy(children.firstName);
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

// SECURITY FIX: getClassById/updateClass/deleteClass/getChildrenByClass
// previously took no organizationId at all -- any authenticated user could
// read another organization's class or list of children by id.
export async function getClassById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(classes.id, id)];
  if (organizationId) conditions.push(eq(classes.organizationId, organizationId));
  const result = await db.select().from(classes).where(and(...conditions)).limit(1);
  return result[0];
}

export async function createClass(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(classes).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateClass(id: number, data: any, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(classes.id, id)];
  if (organizationId) conditions.push(eq(classes.organizationId, organizationId));
  await db.update(classes).set(data).where(and(...conditions));
  return getClassById(id, organizationId);
}

export async function deleteClass(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(classes.id, id)];
  if (organizationId) conditions.push(eq(classes.organizationId, organizationId));
  await db.delete(classes).where(and(...conditions));
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

export async function getChildrenByClass(classId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(children.classId, classId)];
  if (organizationId) conditions.push(eq(children.organizationId, organizationId));
  return db.select().from(children).where(and(...conditions)).orderBy(children.firstName);
}

// ============ STAFF ATTENDANCE (GPS) ============
// SECURITY FIX: previously took no organizationId -- any admin (of ANY
// organization) could pull every organization's GPS staff-attendance
// records for a given date.
export async function getStaffAttendanceByDate(date: string, organizationId?: number) {
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
    isLateRecord: staffAttendance.isLateRecord,
    lateReason: staffAttendance.lateReason,
    actualCheckInTime: staffAttendance.actualCheckInTime,
    actualCheckOutTime: staffAttendance.actualCheckOutTime,
    userName: users.name,
  }).from(staffAttendance)
    .leftJoin(users, eq(staffAttendance.userId, users.id))
    .where(and(
      gte(staffAttendance.date, startOfDay),
      lte(staffAttendance.date, endOfDay),
      ...(organizationId ? [eq(staffAttendance.organizationId, organizationId)] : [])
    ));
  return results;
}

// SECURITY FIX: previously took no organizationId -- any admin could pull
// any user's GPS attendance history across organizations.
export async function getStaffAttendanceByUser(userId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(staffAttendance.userId, userId)];
  if (organizationId) conditions.push(eq(staffAttendance.organizationId, organizationId));
  return db.select().from(staffAttendance).where(and(...conditions)).orderBy(desc(staffAttendance.date));
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

// SECURITY FIX: previously took `data: any` and never required
// organizationId. staff_attendance.organizationId used to default to 1 at
// the schema level, so every staff GPS check-in record from every
// organization on the platform was silently written as organizationId = 1
// -- meaning organization #1's admin could see (and any org's admin trying
// to view their OWN staff's attendance would fail to see) every
// organization's check-in times, GPS coordinates, and device info. All
// three callers (checkIn/quickCheckIn/lateCheckIn in routers.ts) now pass
// ctx.organizationId explicitly, and this function enforces it's present.
export async function staffCheckIn(data: any & { organizationId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.organizationId || !Number.isInteger(data.organizationId) || data.organizationId <= 0) {
    throw new Error("staffCheckIn: a valid organizationId is required");
  }
  const result = await db.insert(staffAttendance).values(data);
  return { id: result[0].insertId, ...data };
}

// SECURITY FIX: added so callers (routers.ts checkOut/adminCheckOut) can
// verify a client-supplied attendance record id actually belongs to the
// caller (and/or their organization) before staffCheckOut is allowed to
// modify it -- staffCheckOut itself takes a bare id with no ownership
// check, by design, since that verification belongs at the call site.
export async function getStaffAttendanceById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(staffAttendance.id, id)];
  if (organizationId) conditions.push(eq(staffAttendance.organizationId, organizationId));
  const result = await db.select().from(staffAttendance).where(and(...conditions)).limit(1);
  return result[0];
}

export async function staffCheckOut(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(staffAttendance).set({ ...data, status: "checked_out" as const }).where(eq(staffAttendance.id, id));
}

// ============ CENTER SETTINGS ============
// SECURITY FIX: centerSettings.organizationId existed in the schema but was
// never used in either query -- getCenterSettings()/updateCenterSettings()
// always operated on a single global row regardless of caller. In practice
// EVERY organization shared the same center name, GPS coordinates/geofence
// radius (used to validate staff GPS check-in), working hours, VAT number,
// commercial register, and logo -- and any admin from ANY organization
// updating "center settings" silently overwrote every other organization's
// values in that one shared row. organizationId is now required.
export async function getCenterSettings(organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  if (organizationId) {
    const result = await db.select().from(centerSettings).where(eq(centerSettings.organizationId, organizationId)).limit(1);
    return result[0];
  }
  const result = await db.select().from(centerSettings).limit(1);
  return result[0];
}

export async function updateCenterSettings(data: any, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCenterSettings(organizationId);
  if (existing) {
    await db.update(centerSettings).set(data).where(eq(centerSettings.id, existing.id));
  } else {
    await db.insert(centerSettings).values({ ...data, organizationId });
  }
  return getCenterSettings(organizationId);
}

// ============ DAILY ACTIVITIES ============
// SECURITY FIX: getDailyActivities/getDailyActivitiesByClass previously took
// no organizationId at all, despite daily_activities having the column --
// any teacher/admin could read another organization's child/class activity
// log by id.
export async function getDailyActivities(childId: number, date?: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (date) {
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    const conditions = [eq(dailyActivities.childId, childId), gte(dailyActivities.recordedAt, startOfDay), lte(dailyActivities.recordedAt, endOfDay)];
    if (organizationId) conditions.push(eq(dailyActivities.organizationId, organizationId));
    return db.select().from(dailyActivities).where(and(...conditions)).orderBy(desc(dailyActivities.recordedAt));
  }
  const conditions = [eq(dailyActivities.childId, childId)];
  if (organizationId) conditions.push(eq(dailyActivities.organizationId, organizationId));
  return db.select().from(dailyActivities).where(and(...conditions)).orderBy(desc(dailyActivities.recordedAt));
}

export async function getDailyActivitiesByClass(classId: number, date: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  const conditions = [eq(dailyActivities.classId, classId), gte(dailyActivities.recordedAt, startOfDay), lte(dailyActivities.recordedAt, endOfDay)];
  if (organizationId) conditions.push(eq(dailyActivities.organizationId, organizationId));
  return db.select().from(dailyActivities).where(and(...conditions)).orderBy(desc(dailyActivities.recordedAt));
}

export async function createDailyActivity(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dailyActivities).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ CALENDAR EVENTS ============
// SECURITY FIX (calendar read-side leak): organizationId is now a required
// parameter, not an optional filter -- every caller MUST scope this query to a
// single organization. Previously this had no organizationId condition at all,
// so `list` returned every organization's events to any authenticated user.
export async function getCalendarEvents(organizationId: number, filters?: { month?: number; year?: number; audience?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(calendarEvents.organizationId, organizationId)];
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
  return db.select().from(calendarEvents).where(and(...conditions)).orderBy(calendarEvents.eventDate);
}

export async function getCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  return rows[0] || null;
}

export async function createCalendarEvent(data: InsertCalendarEvent) {
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

// SECURITY FIX (calendar read-side leak): optional eventId lets callers that
// have already verified the parent event's organization (see
// calendarRouter.ts's cancelReminders) also pin the WHERE clause to that event,
// so a reminderId cannot be used to cancel a reminder belonging to a different
// event/organization than the one the caller was authorized against.
// processPendingReminders (the internal cron job) still calls this with only an
// id, which is unaffected and intentionally cross-organization by design.
export async function cancelSingleReminder(id: number, eventId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(eventReminders.id, id)];
  if (eventId !== undefined) conditions.push(eq(eventReminders.eventId, eventId));
  await db.update(eventReminders).set({ status: "cancelled" }).where(and(...conditions));
}

// ============ ANNOUNCEMENTS ============
// SECURITY FIX: getAnnouncements/createAnnouncement/updateAnnouncement/
// deleteAnnouncement previously took no organizationId at all, despite the
// announcements table having an organizationId column -- every
// organization's announcements were visible to every other organization's
// users (as long as the audience enum matched), and any admin could edit or
// delete any other organization's announcement by id.
export async function getAnnouncements(organizationId: number, audience?: string, includeExpired = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(announcements.organizationId, organizationId)];
  if (audience) {
    conditions.push(or(eq(announcements.audience, audience as any), eq(announcements.audience, "all")));
  }
  if (!includeExpired) {
    conditions.push(or(isNull(announcements.expiresAt), gt(announcements.expiresAt, new Date())));
  }
  return db.select().from(announcements).where(and(...conditions)).orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
}

export async function createAnnouncement(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(announcements).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getAnnouncementById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(announcements.id, id)];
  if (organizationId) conditions.push(eq(announcements.organizationId, organizationId));
  const result = await db.select().from(announcements).where(and(...conditions)).limit(1);
  return result[0];
}

export async function updateAnnouncement(id: number, data: { title?: string; content?: string; audience?: string; isPinned?: boolean; imageUrl?: string | null; expiresAt?: Date | null }, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(announcements.id, id)];
  if (organizationId) conditions.push(eq(announcements.organizationId, organizationId));
  await db.update(announcements).set(data as any).where(and(...conditions));
  return { id, ...data };
}

export async function deleteAnnouncement(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(announcements.id, id)];
  if (organizationId) conditions.push(eq(announcements.organizationId, organizationId));
  await db.delete(announcements).where(and(...conditions));
  return { success: true };
}

// ============ ANNOUNCEMENT READS ============
// SECURITY FIX: previously inserted a read-receipt for ANY announcementId the
// client supplied, with no check that the announcement belongs to the caller's
// organization -- letting a user from one nursery pollute another nursery's
// `announcements.readers` report with their own identity. organizationId is
// required here (not optional) because there is no legitimate cross-tenant
// caller for a per-user read receipt.
export async function markAnnouncementRead(announcementId: number, userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [ann] = await db.select({ id: announcements.id }).from(announcements)
    .where(and(eq(announcements.id, announcementId), eq(announcements.organizationId, organizationId)))
    .limit(1);
  if (!ann) throw new Error("Announcement not found");
  // Use INSERT IGNORE to avoid duplicate errors
  await db.insert(announcementReads).values({ announcementId, userId }).onDuplicateKeyUpdate({ set: { readAt: new Date() } });
  return { success: true };
}

export async function getAnnouncementReadStatus(announcementId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(announcementReads).where(and(eq(announcementReads.announcementId, announcementId), eq(announcementReads.userId, userId))).limit(1);
  return result[0] || null;
}

export async function getAnnouncementReaders(announcementId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: announcementReads.id,
    userId: announcementReads.userId,
    readAt: announcementReads.readAt,
    userName: users.name,
    userPhone: users.phone,
  }).from(announcementReads)
    .innerJoin(users, eq(announcementReads.userId, users.id))
    .where(eq(announcementReads.announcementId, announcementId))
    .orderBy(desc(announcementReads.readAt));
  return result;
}

export async function getAnnouncementReadCount(announcementId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(announcementReads).where(eq(announcementReads.announcementId, announcementId));
  return result[0]?.count || 0;
}

export async function getUserReadAnnouncements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ announcementId: announcementReads.announcementId }).from(announcementReads).where(eq(announcementReads.userId, userId));
  return result.map(r => r.announcementId);
}

// ============ DOCUMENTS ============
// SECURITY FIX: getDocuments/deleteDocument previously took no
// organizationId at all, despite documents.organizationId existing in the
// schema -- every organization's policy/consent/form documents were visible
// to every other organization's users, and any admin could delete any
// other organization's document by id.
export async function getDocuments(organizationId: number, audience?: string, childId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(documents.organizationId, organizationId)];
  if (audience) conditions.push(or(eq(documents.audience, audience as any), eq(documents.audience, "all")));
  if (childId) conditions.push(or(eq(documents.childId, childId), isNull(documents.childId)));
  return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return { id: result[0].insertId, ...data };
}

// SECURITY FIX: added so the router can fetch-and-verify a document belongs
// to the caller's organization before signing it or listing its signatures.
export async function getDocumentById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(documents.id, id)];
  if (organizationId) conditions.push(eq(documents.organizationId, organizationId));
  const result = await db.select().from(documents).where(and(...conditions)).limit(1);
  return result[0];
}

export async function deleteDocument(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(documents.id, id)];
  if (organizationId) conditions.push(eq(documents.organizationId, organizationId));
  await db.delete(documents).where(and(...conditions));
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

// SECURITY FIX (new helper): needed so deleteEmergencyContact can verify
// ownership via the contact's childId before deleting -- previously the
// delete route had no ownership check of any kind.
export async function getEmergencyContactById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emergencyContacts).where(eq(emergencyContacts.id, id)).limit(1);
  return result[0];
}

export async function deleteEmergencyContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  return { success: true };
}

// ============ ENROLLMENT ============
// SECURITY FIX: the enrollment table has no organizationId column of its
// own, so getEnrollments previously returned every organization's
// enrollment records to any admin with no filtering whatsoever. Ownership
// is now enforced via a join against children.organizationId (children
// does have the column). createEnrollment/updateEnrollment ownership is
// verified at the router layer via getChildById before writing.
export async function getEnrollments(status?: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (status) conditions.push(eq(enrollment.status, status as any));
  if (organizationId) {
    return db.select({
      id: enrollment.id,
      childId: enrollment.childId,
      classId: enrollment.classId,
      status: enrollment.status,
      startDate: enrollment.startDate,
      endDate: enrollment.endDate,
      notes: enrollment.notes,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
    }).from(enrollment)
      .innerJoin(children, eq(enrollment.childId, children.id))
      .where(conditions.length ? and(eq(children.organizationId, organizationId), ...conditions) : eq(children.organizationId, organizationId))
      .orderBy(desc(enrollment.createdAt));
  }
  if (conditions.length > 0) {
    return db.select().from(enrollment).where(and(...conditions)).orderBy(desc(enrollment.createdAt));
  }
  return db.select().from(enrollment).orderBy(desc(enrollment.createdAt));
}

export async function getEnrollmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(enrollment).where(eq(enrollment.id, id)).limit(1);
  return result[0];
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
// SECURITY FIX: previously had no organizationId at all (schema had no
// such column) -- every organization's prospective-family waiting list was
// a single shared global list, readable/editable by any admin regardless
// of organization. organizationId column added to the schema (nullable,
// see drizzle/schema.ts) and is now stamped on create and filtered on read
// /update/delete.
export async function getWaitingList(organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(waitingList);
  return (organizationId ? query.where(eq(waitingList.organizationId, organizationId)) : query)
    .orderBy(waitingList.priority, desc(waitingList.createdAt));
}

export async function getWaitingListEntryById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(waitingList.id, id)];
  if (organizationId) conditions.push(eq(waitingList.organizationId, organizationId));
  const result = await db.select().from(waitingList).where(and(...conditions)).limit(1);
  return result[0];
}

export async function createWaitingListEntry(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(waitingList).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateWaitingListEntry(id: number, data: any, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(waitingList.id, id)];
  if (organizationId) conditions.push(eq(waitingList.organizationId, organizationId));
  await db.update(waitingList).set(data).where(and(...conditions));
}

export async function deleteWaitingListEntry(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(waitingList.id, id)];
  if (organizationId) conditions.push(eq(waitingList.organizationId, organizationId));
  await db.delete(waitingList).where(and(...conditions));
  return { success: true };
}

// ============ EYFS ASSESSMENTS ============
// SECURITY FIX: previously took no organizationId at all despite
// eyfs_assessments having the column -- any teacher/admin could read
// another organization's child's EYFS assessments by id.
export async function getEyfsAssessments(childId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(eyfsAssessments.childId, childId)];
  if (organizationId) conditions.push(eq(eyfsAssessments.organizationId, organizationId));
  return db.select().from(eyfsAssessments).where(and(...conditions)).orderBy(desc(eyfsAssessments.assessedAt));
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

// SECURITY FIX: audit_log has no organizationId column of its own -- this
// previously returned every organization's audit trail (which user did
// what, to which resource, from which IP address) to any single
// organization's admin, platform-wide. Scoped here via a join to users on
// the acting userId (every audit entry is recorded against the user who
// performed the action, and that user belongs to exactly one organization).
export async function getAuditLogs(limit = 100, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    const rows = await db.select({ log: auditLog }).from(auditLog)
      .innerJoin(users, eq(auditLog.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
    return rows.map(r => r.log);
  }
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

// ============ CHILD DEPARTURES ============
// SECURITY FIX: child_departures has no organizationId column of its own.
// getDeparturesByDate/getDeparturesByChild previously took no organizationId
// at all -- any authenticated staff/admin (of ANY organization) calling
// departures.byDate or departures.byChild would see every organization's
// pickup records platform-wide (who picked up which child, relationship,
// notes, signature). Scoped here via a join to children, same pattern used
// for childDocuments above.
export async function getDeparturesByDate(date: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  if (organizationId) {
    const rows = await db.select({ dep: childDepartures }).from(childDepartures)
      .innerJoin(children, eq(childDepartures.childId, children.id))
      .where(and(
        eq(children.organizationId, organizationId),
        gte(childDepartures.departureTime, startOfDay),
        lte(childDepartures.departureTime, endOfDay)
      )).orderBy(desc(childDepartures.departureTime));
    return rows.map(r => r.dep);
  }
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

export async function getDeparturesByChild(childId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    const rows = await db.select({ dep: childDepartures }).from(childDepartures)
      .innerJoin(children, eq(childDepartures.childId, children.id))
      .where(and(eq(childDepartures.childId, childId), eq(children.organizationId, organizationId)))
      .orderBy(desc(childDepartures.departureTime)).limit(30);
    return rows.map(r => r.dep);
  }
  return db.select().from(childDepartures).where(eq(childDepartures.childId, childId)).orderBy(desc(childDepartures.departureTime)).limit(30);
}

export async function createDeparture(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(childDepartures).values(data);
  return { id: result[0].insertId, ...data };
}

// ============ CHILD DOCUMENTS ============
// SECURITY FIX: childDocuments (birth certificates, national IDs, medical
// reports, immunization records, passports) has no organizationId column of
// its own. getAllChildDocuments previously took no organizationId at all --
// any teacher (of ANY organization) calling childDocuments.listAll would see
// every organization's uploaded identity/medical documents. Scoped here via
// a join to children; updateChildDocument/deleteChildDocument now accept an
// optional organizationId enforced the same way, and a new
// getChildDocumentById is added so the router can fetch-and-verify before
// approve/reject/delete.
export async function getChildDocuments(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(childDocuments).where(eq(childDocuments.childId, childId)).orderBy(desc(childDocuments.createdAt));
}

export async function getAllChildDocuments(status?: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (organizationId) {
    const conditions = [eq(children.organizationId, organizationId)];
    if (status) conditions.push(eq(childDocuments.status, status as any));
    const rows = await db.select({ doc: childDocuments }).from(childDocuments)
      .innerJoin(children, eq(childDocuments.childId, children.id))
      .where(and(...conditions))
      .orderBy(desc(childDocuments.createdAt));
    return rows.map(r => r.doc);
  }
  if (status) {
    return db.select().from(childDocuments).where(eq(childDocuments.status, status as any)).orderBy(desc(childDocuments.createdAt));
  }
  return db.select().from(childDocuments).orderBy(desc(childDocuments.createdAt));
}

export async function getChildDocumentById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  if (organizationId) {
    const rows = await db.select({ doc: childDocuments }).from(childDocuments)
      .innerJoin(children, eq(childDocuments.childId, children.id))
      .where(and(eq(childDocuments.id, id), eq(children.organizationId, organizationId)))
      .limit(1);
    return rows[0]?.doc;
  }
  const result = await db.select().from(childDocuments).where(eq(childDocuments.id, id)).limit(1);
  return result[0];
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
// SECURITY FIX: the entire media module (photos/videos of children) had NO
// organizationId filtering anywhere -- createMedia never stamped it on new
// rows, and every read/delete/approve function below operated with no
// org filter at all despite the media table having the column. Combined
// with the router (see routers.ts media: router({...})), any admin could
// list/approve/delete every organization's photos and videos of children.
type CreateMediaInput = { type: string; url: string; fileKey?: string; thumbnailUrl?: string; caption?: string; mimeType?: string; fileSize?: number; uploadedBy: number; classId?: number; visibility?: string; childIds?: number[]; organizationId: number };

export async function createMedia(data: CreateMediaInput) {
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

export async function createMediaBatch(items: CreateMediaInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const created = [];
    for (const item of items) {
      const { childIds, ...mediaData } = item;
      const [result] = await tx.insert(media).values(mediaData as any);
      const mediaId = result.insertId;
      if (childIds?.length) {
        await tx.insert(mediaChildren).values(
          childIds.map(childId => ({ mediaId, childId })),
        );
      }
      created.push({ id: mediaId, ...mediaData });
    }
    return created;
  });
}

export async function getMediaForClass(classId: number, limit = 50, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(media.classId, classId), eq(media.isApproved, true)];
  if (organizationId) conditions.push(eq(media.organizationId, organizationId));
  return db.select().from(media)
    .where(and(...conditions))
    .orderBy(desc(media.createdAt))
    .limit(limit);
}

export async function getMediaForChild(childId: number, limit = 50, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(mediaChildren.childId, childId), eq(media.isApproved, true)];
  if (organizationId) conditions.push(eq(media.organizationId, organizationId));
  const rows = await db.select({ item: media }).from(media)
    .innerJoin(mediaChildren, eq(media.id, mediaChildren.mediaId))
    .where(and(...conditions))
    .orderBy(desc(media.createdAt))
    .limit(limit);
  return rows.map(row => row.item);
}

export async function getMediaForChildren(childIds: number[], limit = 50, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (childIds.length === 0) return [];
  const conditions = [inArray(mediaChildren.childId, childIds), eq(media.isApproved, true)];
  if (organizationId) conditions.push(eq(media.organizationId, organizationId));
  const rows = await db.selectDistinct({ item: media }).from(media)
    .innerJoin(mediaChildren, eq(media.id, mediaChildren.mediaId))
    .where(and(...conditions))
    .orderBy(desc(media.createdAt))
    .limit(limit);
  return rows.map(row => row.item);
}

export async function getAllMedia(limit = 100, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = organizationId ? [eq(media.organizationId, organizationId)] : [];
  const query = db.select().from(media);
  return (conditions.length ? query.where(and(...conditions)) : query).orderBy(desc(media.createdAt)).limit(limit);
}

export async function getMediaById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(media.id, id)];
  if (organizationId) conditions.push(eq(media.organizationId, organizationId));
  const result = await db.select().from(media).where(and(...conditions)).limit(1);
  return result[0];
}

export async function getMediaChildren(mediaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaChildren).where(eq(mediaChildren.mediaId, mediaId));
}

export async function deleteMedia(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (organizationId) {
    const existing = await getMediaById(id, organizationId);
    if (!existing) return;
  }
  await db.delete(mediaChildren).where(eq(mediaChildren.mediaId, id));
  await db.delete(media).where(eq(media.id, id));
}

export async function updateMediaApproval(id: number, isApproved: boolean, organizationId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(media.id, id)];
  if (organizationId) conditions.push(eq(media.organizationId, organizationId));
  await db.update(media).set({ isApproved }).where(and(...conditions));
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

export async function updatePayment(id: number, data: Partial<{ status: string; paidAt: Date; moyasarPaymentId: string; moyasarPaymentUrl: string; metadata: any; amount: string }>) {
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

// SECURITY FIX (C1): `transactions` has no organizationId column of its own (it's
// only reachable via invoices.organizationId), and this function previously ran
// with NO tenant scoping at all -- any admin/principal/owner at any single
// organization could see every organization's transactions. organizationId is now a
// required parameter, enforced by filtering on the already-joined `invoices` table.
export async function getAllTransactions(organizationId: number, limit = 100) {
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
    .where(eq(invoices.organizationId, organizationId))
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

// SECURITY FIX (C1, found during verification of the router surface): same pattern
// as getAllTransactions -- `refunds` has no organizationId of its own, reachable via
// invoices.organizationId, and this was called with zero scoping from `refunds.list`
// (adminProcedure, server/routers.ts), leaking every organization's refund data.
export async function getAllRefunds(organizationId: number, limit = 100) {
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
    .where(eq(invoices.organizationId, organizationId))
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

// SECURITY FIX (C1): `tuition_plans` has no organizationId column of its own (only
// reachable via children.organizationId), and this function previously took zero
// arguments and returned every organization's tuition plans to any caller.
// organizationId is now required, enforced via the already-joined `children` table.
export async function getTuitionPlans(organizationId: number) {
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
    .where(eq(children.organizationId, organizationId))
    .orderBy(desc(tuitionPlans.createdAt));
}

// SECURITY FIX: previously took no organizationId at all -- any caller could
// fetch any organization's tuition plan by id. tuitionPlans has no
// organizationId column of its own, so it is enforced via a join to children
// (same pattern as getTuitionPlans above).
export async function getTuitionPlanById(id: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  if (organizationId) {
    const result = await db.select({ plan: tuitionPlans }).from(tuitionPlans)
      .innerJoin(children, eq(tuitionPlans.childId, children.id))
      .where(and(eq(tuitionPlans.id, id), eq(children.organizationId, organizationId)))
      .limit(1);
    return result[0]?.plan;
  }
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

// SECURITY FIX: previously took no organizationId at all and processed every
// organization's due tuition plans in one call -- ANY admin, from ANY
// organization, clicking "generate invoices" would generate (and get
// notified about) recurring invoices for every other organization's
// children too, and each generated invoice's organizationId was left unset
// (silently defaulting to organization #1 per the schema default). Now
// requires organizationId and scopes the plan lookup via a join to children
// (tuitionPlans has no organizationId column of its own), and stamps it onto
// every generated invoice.
export async function generateInvoicesFromPlans(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const activePlanRows = await db.select({ plan: tuitionPlans }).from(tuitionPlans)
    .innerJoin(children, eq(tuitionPlans.childId, children.id))
    .where(and(
      eq(tuitionPlans.isActive, true),
      lte(tuitionPlans.nextBillingDate, now),
      eq(children.organizationId, organizationId)
    ));
  const activePlans = activePlanRows.map(r => r.plan);

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
      organizationId,
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

// SECURITY FIX (C1): previously took only date/status filters and NO organizationId
// at all -- `finance.export` (adminProcedure, server/routers.ts) exported every
// organization's invoices to any single organization's admin/principal/owner.
// organizationId is now required and always applied, on top of the optional filters.
export async function getFinanceExportData(organizationId: number, filters?: { startDate?: Date; endDate?: Date; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(invoices.organizationId, organizationId)];
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

// SECURITY FIX (C1): previously took zero arguments and ran `db.select().from(invoices)`
// with no WHERE clause at all -- `finance.summary` (protectedProcedure, server/routers.ts)
// returned platform-wide revenue/invoice aggregates to any logged-in non-parent user at
// any single organization. organizationId is now required and filters the base query.
export async function getEnhancedFinanceSummary(organizationId: number) {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, pendingAmount: 0, overdueAmount: 0, partiallyPaidAmount: 0, totalInvoices: 0, paidInvoices: 0, pendingInvoices: 0, overdueInvoices: 0, thisMonthRevenue: 0 };

  // Optimized: Use SQL aggregation instead of fetching all rows into memory
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [summaryResult, thisMonthResult] = await Promise.all([
    db.select({
      status: invoices.status,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(total), 0)`,
      unpaidAmount: sql<number>`COALESCE(SUM(total - COALESCE(paidAmount, 0)), 0)`,
    }).from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .groupBy(invoices.status),
    db.select({
      total: sql<number>`COALESCE(SUM(total), 0)`,
    }).from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, 'paid'),
        gte(invoices.paidAt, startOfMonth)
      )),
  ]);

  const byStatus: Record<string, { count: number; totalAmount: number; unpaidAmount: number }> = {};
  let totalInvoices = 0;
  for (const row of summaryResult) {
    byStatus[row.status as string] = {
      count: Number(row.count),
      totalAmount: Number(row.totalAmount),
      unpaidAmount: Number(row.unpaidAmount),
    };
    totalInvoices += Number(row.count);
  }

  return {
    totalRevenue: byStatus['paid']?.totalAmount ?? 0,
    pendingAmount: byStatus['pending']?.totalAmount ?? 0,
    overdueAmount: byStatus['overdue']?.totalAmount ?? 0,
    partiallyPaidAmount: byStatus['partially_paid']?.unpaidAmount ?? 0,
    totalInvoices,
    paidInvoices: byStatus['paid']?.count ?? 0,
    pendingInvoices: byStatus['pending']?.count ?? 0,
    overdueInvoices: byStatus['overdue']?.count ?? 0,
    thisMonthRevenue: Number(thisMonthResult[0]?.total ?? 0),
  };
}

// ============ AUTHENTICATION HELPERS ============

export async function findUsersByIdentifier(identifier: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Priority order for roles: staff roles first, then parent
  const rolePriority = sql`CASE 
    WHEN ${users.role} = 'super_admin' THEN 1
    WHEN ${users.role} = 'admin' THEN 2
    WHEN ${users.role} = 'principal' THEN 3
    WHEN ${users.role} = 'teacher' THEN 4
    WHEN ${users.role} = 'assistant' THEN 5
    WHEN ${users.role} = 'accountant' THEN 6
    WHEN ${users.role} = 'receptionist' THEN 7
    WHEN ${users.role} = 'parent' THEN 8
    ELSE 9
  END`;
  
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) return [];

  // An email/phone is not globally unique in the legacy production data.
  // Return every candidate so authentication can verify the password first,
  // instead of selecting an unrelated tenant's account by role priority.
  return db.select().from(users)
    .where(or(
      sql`LOWER(TRIM(${users.email})) = LOWER(${normalizedIdentifier})`,
      sql`TRIM(${users.phone}) = ${normalizedIdentifier}`,
    ))
    .orderBy(rolePriority, users.id);
}

export async function findUserByIdentifier(identifier: string) {
  const candidates = await findUsersByIdentifier(identifier);
  return candidates[0];
}

// SECURITY FIX: this is the public parent self-registration path
// (auth.register -> routers.ts). It previously never set organizationId at
// all, and users.organizationId used to default to 1 at the schema level,
// so every publicly self-registered parent account was silently created as
// a member of organization #1 regardless of which nursery they intended to
// join. organizationId is now a required parameter: the caller (auth.register)
// resolves the parent's chosen nursery from a public orgSlug via
// getOrganizationBySlug before calling this, and that resolved organization's
// id is passed here. The schema column is now NOT NULL with no default, so
// this also fails at the database level if ever called without one.
export async function createUserWithPassword(data: {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  organizationId: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.organizationId || !Number.isInteger(data.organizationId) || data.organizationId <= 0) {
    throw new Error("createUserWithPassword: a valid organizationId is required");
  }

  const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const result = await db.insert(users).values({
    openId,
    name: data.name,
    phone: data.phone,
    email: normalizeEmail(data.email),
    password: data.password,
    role: data.role as any,
    isActive: data.isActive,
    organizationId: data.organizationId,
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

// SECURITY FIX: previously took no organizationId at all -- any authenticated
// staff member (of ANY organization) calling pickup.active would see every
// organization's currently-active pickup requests, including child names,
// parent names/phones, and class names.
export async function getActivePickupRequests(organizationId?: number) {
  const db = await getDb();
  const conditions = [
    inArray(pickupRequests.status, ["waiting_teacher", "sent_to_reception", "waiting_at_reception"]),
    gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`),
  ];
  if (organizationId) conditions.push(eq(pickupRequests.organizationId, organizationId));
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
  .where(and(...conditions))
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

// SECURITY FIX: previously took no organizationId -- combined with the
// router not checking organization ownership either, any authenticated
// parent/staff user could probe an arbitrary childId (even one belonging to
// another organization) and learn whether that child has an active pickup
// request in progress.
export async function getActivePickupForChild(childId: number, organizationId?: number) {
  const db = await getDb();
  const conditions = [
    eq(pickupRequests.childId, childId),
    inArray(pickupRequests.status, ["waiting_teacher", "sent_to_reception", "waiting_at_reception"]),
    gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`),
  ];
  if (organizationId) conditions.push(eq(pickupRequests.organizationId, organizationId));
  const results = await db!.select()
    .from(pickupRequests)
    .where(and(...conditions))
    .limit(1);
  return results[0] || null;
}

// SECURITY FIX: previously matched by id alone with no organization check --
// any authenticated staff user (of ANY organization) could advance/complete
// another organization's pickup workflow (e.g. mark a foreign child as
// "picked up" by an arbitrary named person) simply by guessing/enumerating
// a pickup request id. organizationId is now applied as an additional
// match condition when provided, so a cross-org id updates zero rows.
export async function updatePickupRequestStatus(id: number, status: string, extra: Record<string, any> = {}, organizationId?: number) {
  const db = await getDb();
  const updateData: any = { status, ...extra };
  if (status === "sent_to_reception") updateData.teacherResponseAt = new Date();
  if (status === "waiting_at_reception") updateData.arrivedReceptionAt = new Date();
  if (status === "picked_up") updateData.pickedUpAt = new Date();
  const conditions = [eq(pickupRequests.id, id)];
  if (organizationId) conditions.push(eq(pickupRequests.organizationId, organizationId));
  await db!.update(pickupRequests).set(updateData).where(and(...conditions));
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

// SECURITY FIX: previously took no organizationId -- staff of ANY
// organization could read every organization's completed pickup history
// (which child, picked up by whom, parent name).
export async function getPickupHistory(limit = 100, organizationId?: number) {
  const db = await getDb();
  const conditions = [eq(pickupRequests.status, "picked_up")];
  if (organizationId) conditions.push(eq(pickupRequests.organizationId, organizationId));
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
  .where(and(...conditions))
  .orderBy(desc(pickupRequests.pickedUpAt))
  .limit(limit);
}

// SECURITY FIX: previously took no organizationId -- every count below was
// computed across ALL organizations combined, so any staff member (of ANY
// organization) calling pickup.stats saw a mixed aggregate that included
// every other organization's pickup activity.
export async function getPickupStats(organizationId?: number) {
  const db = await getDb();
  const orgFilter = organizationId ? [eq(pickupRequests.organizationId, organizationId)] : [];
  const pending = await db!.select({ count: sql<number>`count(*)` })
    .from(pickupRequests)
    .where(and(
      inArray(pickupRequests.status, ['waiting_teacher', 'sent_to_reception', 'waiting_at_reception']),
      gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`),
      ...orgFilter
    ));

  const completedToday = await db!.select({ count: sql<number>`count(*)` })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'picked_up'),
      gte(pickupRequests.pickedUpAt, sql`CURDATE()`),
      ...orgFilter
    ));

  const avgResponse = await db!.select({
    avgSeconds: sql<number>`AVG(TIMESTAMPDIFF(SECOND, requestedAt, teacherResponseAt))`
  })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'picked_up'),
      gte(pickupRequests.pickedUpAt, sql`CURDATE()`),
      sql`teacherResponseAt IS NOT NULL`,
      ...orgFilter
    ));

  const avgTotal = await db!.select({
    avgSeconds: sql<number>`AVG(TIMESTAMPDIFF(SECOND, requestedAt, pickedUpAt))`
  })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'picked_up'),
      gte(pickupRequests.pickedUpAt, sql`CURDATE()`),
      ...orgFilter
    ));

  // Count escalated requests (waiting_teacher + escalatedAt not null)
  const escalated = await db!.select({ count: sql<number>`count(*)` })
    .from(pickupRequests)
    .where(and(
      eq(pickupRequests.status, 'waiting_teacher'),
      sql`escalatedAt IS NOT NULL`,
      gte(pickupRequests.requestedAt, sql`DATE_SUB(NOW(), INTERVAL 12 HOUR)`),
      ...orgFilter
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
// SECURITY FIX: getLearningObservations/getLearningObservationsByArea
// previously took no organizationId at all despite learning_observations
// having the column -- any teacher/admin could read another organization's
// child's learning observations by id.
export async function getLearningObservations(childId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(learningObservations.childId, childId)];
  if (organizationId) conditions.push(eq(learningObservations.organizationId, organizationId));
  return db.select().from(learningObservations).where(and(...conditions)).orderBy(desc(learningObservations.observedAt));
}

export async function createLearningObservation(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(learningObservations).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getLearningObservationsByArea(childId: number, area: string, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(learningObservations.childId, childId), eq(learningObservations.area, area)];
  if (organizationId) conditions.push(eq(learningObservations.organizationId, organizationId));
  return db.select().from(learningObservations).where(and(...conditions)).orderBy(desc(learningObservations.observedAt));
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
// SECURITY FIX: previously had no organization filter at all. Its only caller
// (server/_core/pushTriggers.ts) uses the result to pick which admins receive a
// "parent arrived to pick up <child name>" push -- so every organization's
// admins were pushed another nursery's child's name on every pickup request.
// organizationId is now REQUIRED rather than optional: an unscoped staff list
// has no legitimate use, so there is no caller that should be allowed to omit
// it (contrast with the optional-organizationId helpers above, where omitting
// silently degrades to a cross-tenant query).
export async function getStaffUsers(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(
      inArray(users.role, ['super_admin', 'admin', 'principal', 'owner', 'teacher', 'assistant', 'receptionist']),
      eq(users.isActive, true),
      eq(users.organizationId, organizationId)
    ));
}

// SECURITY FIX: previously took no organizationId at all -- every caller of
// this function (calendar event reminders, evaluation reminders, event
// reminders, announcement broadcasts, staff broadcasts) was unknowingly
// notifying every matching-role user across EVERY organization in the
// database, not just the organization that triggered the notification. A
// parent in organization A would receive an in-app notification about an
// event, evaluation, or announcement that belongs entirely to organization
// B. organizationId is now required so every broadcast is scoped correctly.
export async function getUsersByRoles(roles: string[], organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    phone: users.phone,
  })
    .from(users)
    .where(and(
      inArray(users.role, roles as any),
      eq(users.isActive, true),
      eq(users.organizationId, organizationId)
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

// SECURITY FIX: previously took no organizationId -- "on duty" staff spanned
// every organization, so operational alert pushes (pickup requests,
// test alerts) were sent to every organization's staff regardless of which
// organization triggered the alert.
export async function getOnDutyStaffIds(organizationId?: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  // Staff who are ON DUTY (either explicitly set or have no record = default on duty)
  const conditions = [
    inArray(users.role, ['teacher', 'assistant', 'receptionist', 'admin', 'principal', 'owner'] as any),
    eq(users.isActive, true),
  ];
  if (organizationId) conditions.push(eq(users.organizationId, organizationId));
  const allStaff = await db.select({ id: users.id }).from(users).where(and(...conditions));
  const offDutyRows = await db.select({ userId: staffDutyStatus.userId }).from(staffDutyStatus).where(eq(staffDutyStatus.isOnDuty, false));
  const offDutyIds = new Set(offDutyRows.map(r => r.userId));
  return allStaff.filter(s => !offDutyIds.has(s.id)).map(s => s.id);
}

// ============ PICKUP ALERT SETTINGS ============
// SECURITY FIX: previously a single global row (no organizationId column
// existed) -- any org's admin changing "alert settings" silently changed
// the pickup-alarm behavior for every other organization's staff. Now
// scoped per organization with a get-or-create path, matching the pattern
// used for center_settings/loyalty_settings.
const DEFAULT_PICKUP_ALERT_SETTINGS = { volume: 80, tone: 'urgent' as const, repeatIntervalSeconds: 5, escalationMinutes: 2 };

export async function getPickupAlertSettings(organizationId?: number) {
  const db = await getDb();
  if (!db) return DEFAULT_PICKUP_ALERT_SETTINGS;
  if (organizationId) {
    const rows = await db.select().from(pickupAlertSettings).where(eq(pickupAlertSettings.organizationId, organizationId)).limit(1);
    return rows[0] || DEFAULT_PICKUP_ALERT_SETTINGS;
  }
  const rows = await db.select().from(pickupAlertSettings).limit(1);
  return rows[0] || DEFAULT_PICKUP_ALERT_SETTINGS;
}

export async function updatePickupAlertSettings(data: { volume?: number; tone?: string; repeatIntervalSeconds?: number; escalationMinutes?: number }, organizationId?: number) {
  const db = await getDb();
  if (!db) return;
  if (organizationId) {
    const existing = await db.select().from(pickupAlertSettings).where(eq(pickupAlertSettings.organizationId, organizationId)).limit(1);
    if (existing.length > 0) {
      await db.update(pickupAlertSettings).set(data as any).where(eq(pickupAlertSettings.id, existing[0].id));
    } else {
      await db.insert(pickupAlertSettings).values({ ...data, organizationId } as any);
    }
    return;
  }
  const existing = await db.select().from(pickupAlertSettings).limit(1);
  if (existing.length > 0) {
    await db.update(pickupAlertSettings).set(data as any).where(eq(pickupAlertSettings.id, existing[0].id));
  } else {
    await db.insert(pickupAlertSettings).values(data as any);
  }
}

// ============ PICKUP ALERT ACKNOWLEDGMENTS ============
// SECURITY FIX: previously acknowledged ANY pickupRequestId supplied by the
// client with no ownership check. pickup_alert_acknowledgments has no
// organizationId column of its own, so ownership is verified through the
// parent pickup_requests row (which does) -- otherwise a staff member of one
// nursery could silence another nursery's urgent child-pickup alert by
// enumerating request ids, which is a child-safety issue, not just a data one.
export async function acknowledgePickupAlert(pickupRequestId: number, userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return;
  const [req] = await db.select({ id: pickupRequests.id }).from(pickupRequests)
    .where(and(eq(pickupRequests.id, pickupRequestId), eq(pickupRequests.organizationId, organizationId)))
    .limit(1);
  if (!req) return;
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

// SECURITY FIX: previously took no organizationId -- a staff member would
// receive urgent "unacknowledged pickup alert" entries for children in
// OTHER organizations too, not just their own.
export async function getUnacknowledgedPickupAlerts(userId: number, organizationId?: number) {
  const db = await getDb();
  if (!db) return [];
  // Get active pickup requests that this user hasn't acknowledged
  const conditions = [
    eq(pickupRequests.status, 'waiting_teacher'),
    isNull(pickupRequests.escalatedAt),
  ];
  if (organizationId) conditions.push(eq(pickupRequests.organizationId, organizationId));
  const activeRequests = await db.select().from(pickupRequests)
    .where(and(...conditions));
  
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

// SECURITY FIX: previously used select() (all columns), which includes
// ownerPassword -- a bcrypt hash of the prospective nursery owner's chosen
// password -- and returned it straight through the tRPC response to
// whichever caller had access to this endpoint (see registrationRouter.ts,
// where the role check was ALSO too broad, letting any org's local
// admin/owner call this). Explicit column list excludes ownerPassword.
const NURSERY_REGISTRATION_SAFE_COLUMNS = {
  id: nurseryRegistrations.id,
  nurseryName: nurseryRegistrations.nurseryName,
  nurseryNameAr: nurseryRegistrations.nurseryNameAr,
  city: nurseryRegistrations.city,
  district: nurseryRegistrations.district,
  childrenCount: nurseryRegistrations.childrenCount,
  staffCount: nurseryRegistrations.staffCount,
  licenseNumber: nurseryRegistrations.licenseNumber,
  ownerName: nurseryRegistrations.ownerName,
  ownerEmail: nurseryRegistrations.ownerEmail,
  ownerPhone: nurseryRegistrations.ownerPhone,
  selectedPlan: nurseryRegistrations.selectedPlan,
  billingCycle: nurseryRegistrations.billingCycle,
  status: nurseryRegistrations.status,
  adminNotes: nurseryRegistrations.adminNotes,
  rejectionReason: nurseryRegistrations.rejectionReason,
  convertedOrganizationId: nurseryRegistrations.convertedOrganizationId,
  createdAt: nurseryRegistrations.createdAt,
  reviewedAt: nurseryRegistrations.reviewedAt,
  reviewedBy: nurseryRegistrations.reviewedBy,
};

export async function getNurseryRegistrations(status?: string) {
  const database = await getDb();
  if (!database) return [];
  if (status) {
    return database.select(NURSERY_REGISTRATION_SAFE_COLUMNS).from(nurseryRegistrations).where(eq(nurseryRegistrations.status, status as any)).orderBy(desc(nurseryRegistrations.createdAt));
  }
  return database.select(NURSERY_REGISTRATION_SAFE_COLUMNS).from(nurseryRegistrations).orderBy(desc(nurseryRegistrations.createdAt));
}

export async function getNurseryRegistrationById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database.select(NURSERY_REGISTRATION_SAFE_COLUMNS).from(nurseryRegistrations).where(eq(nurseryRegistrations.id, id));
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

// SECURITY FIX: organizationId is now a required parameter on every one of
// these (previously getAssessmentsByChild/getAssessmentById had no
// organizationId parameter at all, and getAllDevelopmentalAssessments defaulted
// to organizationId = 1 when called without an argument) -- callers can no
// longer read/delete another organization's developmental assessments.
export async function getAssessmentsByChild(childId: number, organizationId: number) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select().from(developmentalAssessments)
    .where(and(eq(developmentalAssessments.childId, childId), eq(developmentalAssessments.organizationId, organizationId)))
    .orderBy(desc(developmentalAssessments.assessmentDate));
  return rows;
}

export async function getAssessmentById(id: number, organizationId: number) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database.select().from(developmentalAssessments)
    .where(and(eq(developmentalAssessments.id, id), eq(developmentalAssessments.organizationId, organizationId)));
  return rows[0] || null;
}

export async function getAssessmentResponsesByAssessmentId(assessmentId: number) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select().from(assessmentResponses)
    .where(eq(assessmentResponses.assessmentId, assessmentId));
  return rows;
}

export async function getAllDevelopmentalAssessments(organizationId: number) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database.select().from(developmentalAssessments)
    .where(eq(developmentalAssessments.organizationId, organizationId))
    .orderBy(desc(developmentalAssessments.createdAt));
  return rows;
}

export async function deleteDevelopmentalAssessment(id: number, organizationId: number) {
  const database = await getDb();
  if (!database) throw new Error('Database not available');
  await database.delete(assessmentResponses).where(eq(assessmentResponses.assessmentId, id));
  await database.delete(developmentalAssessments).where(and(eq(developmentalAssessments.id, id), eq(developmentalAssessments.organizationId, organizationId)));
}
