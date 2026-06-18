import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal } from "drizzle-orm/mysql-core";

// ============ USERS ============
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "teacher", "parent", "user"]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  language: mysqlEnum("language", ["ar", "en"]).default("ar").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ CHILDREN ============
export const children = mysqlTable("children", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  dateOfBirth: timestamp("dateOfBirth").notNull(),
  gender: mysqlEnum("gender", ["male", "female"]).notNull(),
  className: varchar("className", { length: 100 }),
  parentId: int("parentId"),
  photo: text("photo"),
  medicalNotes: text("medicalNotes"),
  allergies: text("allergies"),
  emergencyContact: varchar("emergencyContact", { length: 200 }),
  emergencyPhone: varchar("emergencyPhone", { length: 20 }),
  enrollmentDate: timestamp("enrollmentDate").defaultNow().notNull(),
  status: mysqlEnum("status", ["active", "inactive", "graduated"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Child = typeof children.$inferSelect;
export type InsertChild = typeof children.$inferInsert;

// ============ ATTENDANCE ============
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  date: timestamp("date").notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused"]).default("present").notNull(),
  checkInTime: timestamp("checkInTime"),
  checkOutTime: timestamp("checkOutTime"),
  checkedInBy: int("checkedInBy"),
  checkedOutBy: int("checkedOutBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// ============ DAILY REPORTS ============
export const dailyReports = mysqlTable("daily_reports", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  date: timestamp("date").notNull(),
  teacherId: int("teacherId").notNull(),
  meals: json("meals"),
  sleep: json("sleep"),
  toileting: json("toileting"),
  activities: text("activities"),
  mood: mysqlEnum("mood", ["happy", "calm", "tired", "upset", "excited"]).default("happy"),
  teacherNotes: text("teacherNotes"),
  photos: json("photos"),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = typeof dailyReports.$inferInsert;

// ============ MESSAGES ============
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  participantOneId: int("participantOneId").notNull(),
  participantTwoId: int("participantTwoId").notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============ INVOICES ============
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  parentId: int("parentId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull(),
  description: text("description"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("15.00").notNull(),
  vatAmount: decimal("vatAmount", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ============ LOYALTY ============
export const loyaltyPoints = mysqlTable("loyalty_points", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  points: int("points").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const loyaltyTransactions = mysqlTable("loyalty_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  points: int("points").notNull(),
  type: mysqlEnum("type", ["earned", "redeemed", "adjusted"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const loyaltyRewards = mysqlTable("loyalty_rewards", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameAr: varchar("nameAr", { length: 200 }).notNull(),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  pointsCost: int("pointsCost").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;

// ============ NOTIFICATIONS ============
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  titleAr: varchar("titleAr", { length: 200 }),
  body: text("body").notNull(),
  bodyAr: text("bodyAr"),
  type: mysqlEnum("type", ["attendance", "report", "message", "payment", "general"]).default("general").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
