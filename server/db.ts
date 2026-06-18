import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, children, attendance, dailyReports, conversations, messages, invoices, loyaltyPoints, loyaltyTransactions, loyaltyRewards, notifications } from "../drizzle/schema";
import type { InsertChild, InsertAttendance, InsertDailyReport, InsertMessage, InsertInvoice, InsertNotification } from "../drizzle/schema";
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

// ============ DAILY REPORTS ============
export async function getDailyReports(childId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (childId) {
    return db.select().from(dailyReports).where(eq(dailyReports.childId, childId)).orderBy(desc(dailyReports.date));
  }
  return db.select().from(dailyReports).orderBy(desc(dailyReports.date));
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
  if (parentId) {
    return db.select().from(invoices).where(eq(invoices.parentId, parentId)).orderBy(desc(invoices.createdAt));
  }
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
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
