import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal } from "drizzle-orm/mysql-core";

// ============ USERS ============
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "principal", "teacher", "assistant", "accountant", "receptionist", "parent", "user"]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  nationalId: varchar("nationalId", { length: 20 }),
  password: varchar("password", { length: 255 }),
  language: mysqlEnum("language", ["ar", "en"]).default("ar").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ CLASSES ============
export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("nameAr", { length: 100 }),
  ageGroup: varchar("ageGroup", { length: 50 }),
  capacity: int("capacity").default(20).notNull(),
  teacherId: int("teacherId"),
  assistantId: int("assistantId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

// ============ CHILDREN ============
export const children = mysqlTable("children", {
  id: int("id").autoincrement().primaryKey(),
  // Personal Information
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  arabicName: varchar("arabicName", { length: 200 }),
  dateOfBirth: timestamp("dateOfBirth").notNull(),
  gender: mysqlEnum("gender", ["male", "female"]).notNull(),
  nationality: varchar("nationality", { length: 100 }),
  childNationalId: varchar("childNationalId", { length: 20 }),
  classId: int("classId"),
  enrollmentDate: timestamp("enrollmentDate").defaultNow().notNull(),
  photo: text("photo"),
  // Parent Information
  parentId: int("parentId"),
  fatherName: varchar("fatherName", { length: 200 }),
  motherName: varchar("motherName", { length: 200 }),
  parentEmail: varchar("parentEmail", { length: 320 }),
  parentMobile: varchar("parentMobile", { length: 20 }),
  altPhone: varchar("altPhone", { length: 20 }),
  homeAddress: text("homeAddress"),
  // Medical Information
  allergies: text("allergies"),
  medicalConditions: text("medicalConditions"),
  medications: text("medications"),
  specialNeeds: text("specialNeeds"),
  doctorName: varchar("doctorName", { length: 200 }),
  bloodType: varchar("bloodType", { length: 10 }),
  medicalNotes: text("medicalNotes"),
  // Nursery Information
  pickupAuthorization: text("pickupAuthorization"),
  busRequired: boolean("busRequired").default(false).notNull(),
  notes: text("notes"),
  // Status & Metadata
  status: mysqlEnum("status", ["active", "inactive", "graduated", "waitlist"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Child = typeof children.$inferSelect;
export type InsertChild = typeof children.$inferInsert;

// ============ EMERGENCY CONTACTS ============
export const emergencyContacts = mysqlTable("emergency_contacts", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  relationship: varchar("relationship", { length: 100 }).notNull(),
  isAuthorizedPickup: boolean("isAuthorizedPickup").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ MEDICAL INFO ============
export const medicalInfo = mysqlTable("medical_info", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  conditions: text("conditions"),
  medications: text("medications"),
  allergies: text("allergies"),
  doctorName: varchar("doctorName", { length: 200 }),
  doctorPhone: varchar("doctorPhone", { length: 20 }),
  insuranceInfo: text("insuranceInfo"),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ CHILD ATTENDANCE ============
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  date: timestamp("date").notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused", "checked_in", "checked_out"]).default("present").notNull(),
  checkInTime: timestamp("checkInTime"),
  checkOutTime: timestamp("checkOutTime"),
  checkedInBy: int("checkedInBy"),
  checkedOutBy: int("checkedOutBy"),
  droppedOffBy: varchar("droppedOffBy", { length: 200 }),
  droppedOffRelationship: mysqlEnum("droppedOffRelationship", ["mother", "father", "driver", "grandparent", "other"]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// ============ STAFF ATTENDANCE (GPS) ============
export const staffAttendance = mysqlTable("staff_attendance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: timestamp("date").notNull(),
  checkInTime: timestamp("checkInTime"),
  checkOutTime: timestamp("checkOutTime"),
  checkInLat: decimal("checkInLat", { precision: 10, scale: 7 }),
  checkInLng: decimal("checkInLng", { precision: 10, scale: 7 }),
  checkOutLat: decimal("checkOutLat", { precision: 10, scale: 7 }),
  checkOutLng: decimal("checkOutLng", { precision: 10, scale: 7 }),
  deviceInfo: text("deviceInfo"),
  status: mysqlEnum("status", ["checked_in", "checked_out", "absent", "late"]).default("checked_in").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffAttendance = typeof staffAttendance.$inferSelect;

// ============ CENTER SETTINGS ============
export const centerSettings = mysqlTable("center_settings", {
  id: int("id").autoincrement().primaryKey(),
  centerName: varchar("centerName", { length: 200 }).default("Learning Tree Kids Center").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  allowedRadius: int("allowedRadius").default(100).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  workingHoursStart: varchar("workingHoursStart", { length: 10 }).default("07:00"),
  workingHoursEnd: varchar("workingHoursEnd", { length: 10 }).default("17:00"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ DAILY ACTIVITIES (Childcare Log) ============
export const dailyActivities = mysqlTable("daily_activities", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  classId: int("classId"),
  type: mysqlEnum("type", [
    "arrival", "breakfast", "morning_snack", "lunch", "afternoon_snack",
    "nap_start", "nap_end", "diaper", "toilet", "medication",
    "mood", "learning_activity", "outdoor_play", "departure",
    "meal", "snack", "water", "indoor_play", "temperature", "photo", "note", "observation"
  ]).notNull(),
  details: json("details"),
  notes: text("notes"),
  photoUrl: text("photoUrl"),
  recordedBy: int("recordedBy").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyActivity = typeof dailyActivities.$inferSelect;

// ============ DAILY REPORTS (Auto-generated summaries) ============
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

// ============ EYFS ASSESSMENTS ============
export const eyfsAssessments = mysqlTable("eyfs_assessments", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  area: varchar("area", { length: 200 }).notNull(),
  aspect: varchar("aspect", { length: 200 }),
  level: mysqlEnum("level", ["emerging", "developing", "secure", "exceeding"]).default("emerging").notNull(),
  notes: text("notes"),
  assessedBy: int("assessedBy").notNull(),
  assessedAt: timestamp("assessedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ CALENDAR EVENTS ============
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  titleAr: varchar("titleAr", { length: 200 }),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  type: mysqlEnum("type", ["holiday", "event", "trip", "meeting", "deadline"]).default("event").notNull(),
  classId: int("classId"),
  isAllDay: boolean("isAllDay").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ ANNOUNCEMENTS ============
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  audience: mysqlEnum("audience", ["all", "parents", "staff", "class"]).default("all").notNull(),
  classId: int("classId"),
  isPinned: boolean("isPinned").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ DOCUMENTS ============
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["policy", "form", "consent", "report", "other"]).default("other").notNull(),
  url: text("url").notNull(),
  childId: int("childId"),
  requiresSignature: boolean("requiresSignature").default(false).notNull(),
  audience: mysqlEnum("audience", ["all", "parents", "staff"]).default("all").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ DIGITAL SIGNATURES ============
export const signatures = mysqlTable("signatures", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  parentId: int("parentId").notNull(),
  signatureData: text("signatureData"),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
});

// ============ ENROLLMENT ============
export const enrollment = mysqlTable("enrollment", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  classId: int("classId"),
  status: mysqlEnum("status", ["active", "pending", "completed", "withdrawn"]).default("pending").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ WAITING LIST ============
export const waitingList = mysqlTable("waiting_list", {
  id: int("id").autoincrement().primaryKey(),
  childName: varchar("childName", { length: 200 }).notNull(),
  parentName: varchar("parentName", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  dateOfBirth: timestamp("dateOfBirth"),
  preferredClass: varchar("preferredClass", { length: 100 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["waiting", "contacted", "enrolled", "cancelled"]).default("waiting").notNull(),
  priority: int("priority").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "card"]),
  receiptUrl: text("receiptUrl"),
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
  type: mysqlEnum("type", ["attendance", "report", "message", "payment", "general", "activity", "announcement"]).default("general").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============ CHILD DEPARTURES ============
export const childDepartures = mysqlTable("child_departures", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  attendanceId: int("attendanceId"),
  departureTime: timestamp("departureTime").notNull(),
  pickedUpBy: varchar("pickedUpBy", { length: 200 }).notNull(),
  relationship: mysqlEnum("relationship", ["mother", "father", "driver", "grandparent", "guardian", "other"]).notNull(),
  pickedUpById: int("pickedUpById"),
  signatureData: text("signatureData"),
  notes: text("notes"),
  status: mysqlEnum("status", ["completed", "pending", "late"]).default("completed").notNull(),
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChildDeparture = typeof childDepartures.$inferSelect;
export type InsertChildDeparture = typeof childDepartures.$inferInsert;

// ============ ATTENDANCE AUDIT LOG ============
export const attendanceAuditLog = mysqlTable("attendance_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull(),
  childId: int("childId").notNull(),
  previousStatus: varchar("previousStatus", { length: 50 }).notNull(),
  newStatus: varchar("newStatus", { length: 50 }).notNull(),
  changedBy: int("changedBy").notNull(),
  changedByName: varchar("changedByName", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AttendanceAuditLog = typeof attendanceAuditLog.$inferSelect;
export type InsertAttendanceAuditLog = typeof attendanceAuditLog.$inferInsert;
// ============ PARENT-CHILDREN JUNCTION (Many-to-Many) ============
export const parentChildren = mysqlTable("parent_children", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  childId: int("childId").notNull(),
  relationship: varchar("relationship", { length: 50 }).default("parent").notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ParentChild = typeof parentChildren.$inferSelect;
export type InsertParentChild = typeof parentChildren.$inferInsert;
// ============ AUDIT LOG ============
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: int("resourceId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const childDocuments = mysqlTable("child_documents", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  type: mysqlEnum("type", ["birth_certificate", "family_id", "immunization", "passport", "national_id", "medical_report", "allergy_report", "photo", "other"]).default("other").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  mimeType: varchar("mimeType", { length: 100 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewNote: text("reviewNote"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

