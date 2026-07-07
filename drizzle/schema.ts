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
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  accountLockedUntil: timestamp("accountLockedUntil"),
  passwordChangedAt: timestamp("passwordChangedAt"),
  organizationId: int("organizationId").default(1),
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
  organizationId: int("organizationId").default(1),
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
  organizationId: int("organizationId").default(1),
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
  organizationId: int("organizationId").default(1),
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
  isLateRecord: boolean("isLateRecord").default(false),
  lateReason: text("lateReason"),
  actualCheckInTime: timestamp("actualCheckInTime"),
  actualCheckOutTime: timestamp("actualCheckOutTime"),
  organizationId: int("organizationId").default(1),
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
  vatNumber: varchar("vatNumber", { length: 50 }),
  commercialRegister: varchar("commercialRegister", { length: 50 }),
  logoUrl: text("logoUrl"),
  organizationId: int("organizationId").default(1),
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
  organizationId: int("organizationId").default(1),
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
  organizationId: int("organizationId").default(1),
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
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ CALENDAR EVENTS ============
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  titleAr: varchar("titleAr", { length: 300 }).notNull(),
  titleEn: varchar("titleEn", { length: 300 }),
  eventDate: varchar("eventDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }), // optional end date for multi-day events
  eventTime: varchar("eventTime", { length: 10 }), // HH:MM format
  location: varchar("location", { length: 300 }),
  requiredMaterials: text("requiredMaterials"),
  dressCode: varchar("dressCode", { length: 300 }),
  category: mysqlEnum("category", ["holiday", "event", "meeting", "exam", "activity", "celebration", "other"]).default("event").notNull(),
  description: text("description"),
  audience: mysqlEnum("audience", ["all", "parents", "staff", "admin"]).default("all").notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  createdBy: int("createdBy").notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

export const eventReminders = mysqlTable("event_reminders", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  reminderType: mysqlEnum("reminderType", ["parent_upcoming", "parent_update", "parent_cancellation", "teacher_preparation", "teacher_materials", "teacher_setup", "manual"]).default("parent_upcoming").notNull(),
  daysBefore: int("daysBefore").notNull().default(0),
  scheduledAt: timestamp("scheduledAt").notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "cancelled"]).default("pending").notNull(),
  audience: mysqlEnum("audience", ["all", "parents", "staff", "admin"]).default("all").notNull(),
  message: text("message"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EventReminder = typeof eventReminders.$inferSelect;
export type InsertEventReminder = typeof eventReminders.$inferInsert;

// ============ ANNOUNCEMENTS ============
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  audience: mysqlEnum("audience", ["all", "parents", "staff", "class"]).default("all").notNull(),
  classId: int("classId"),
  isPinned: boolean("isPinned").default(false).notNull(),
  imageUrl: text("imageUrl"),
  expiresAt: timestamp("expiresAt"),
  createdBy: int("createdBy").notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ ANNOUNCEMENT READS ============
export const announcementReads = mysqlTable("announcement_reads", {
  id: int("id").autoincrement().primaryKey(),
  announcementId: int("announcementId").notNull(),
  userId: int("userId").notNull(),
  readAt: timestamp("readAt").defaultNow().notNull(),
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
  organizationId: int("organizationId").default(1),
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
  childId: int("childId"), // link conversation to a child for visibility control
  subject: varchar("subject", { length: 255 }),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  lastMessagePreview: varchar("lastMessagePreview", { length: 255 }),
  isArchived: boolean("isArchived").default(false).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachmentUrl"),
  attachmentType: varchar("attachmentType", { length: 50 }), // image, document, pdf
  attachmentName: varchar("attachmentName", { length: 255 }),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;

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
  status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled", "partially_paid"]).default("pending").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidAt: timestamp("paidAt"),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "card", "apple_pay", "mada", "stc_pay"]),
  receiptUrl: text("receiptUrl"),
  invoiceType: mysqlEnum("invoiceType", ["tuition", "activity", "trip", "uniform", "registration", "other"]).default("tuition").notNull(),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  tuitionPlanId: int("tuitionPlanId"),
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdBy: int("createdBy"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ============ PAYMENTS ============
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  parentId: int("parentId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  method: mysqlEnum("method", ["apple_pay", "mada", "visa", "mastercard", "stc_pay", "cash", "bank_transfer"]).notNull(),
  status: mysqlEnum("status", ["initiated", "paid", "failed", "expired", "refunded"]).default("initiated").notNull(),
  moyasarPaymentId: varchar("moyasarPaymentId", { length: 100 }),
  moyasarPaymentUrl: text("moyasarPaymentUrl"),
  callbackUrl: text("callbackUrl"),
  metadata: json("metadata"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============ TRANSACTIONS ============
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: int("paymentId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  parentId: int("parentId").notNull(),
  moyasarTransactionId: varchar("moyasarTransactionId", { length: 100 }),
  type: mysqlEnum("type", ["payment", "refund", "partial_refund"]).default("payment").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  status: mysqlEnum("status", ["completed", "pending", "failed", "refunded"]).default("pending").notNull(),
  method: varchar("method", { length: 50 }),
  cardBrand: varchar("cardBrand", { length: 50 }),
  cardLast4: varchar("cardLast4", { length: 4 }),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ============ REFUNDS ============
export const refunds = mysqlTable("refunds", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: int("transactionId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  parentId: int("parentId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  moyasarRefundId: varchar("moyasarRefundId", { length: 100 }),
  processedBy: int("processedBy"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = typeof refunds.$inferInsert;

// ============ TUITION PLANS ============
export const tuitionPlans = mysqlTable("tuition_plans", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  parentId: int("parentId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "semi_annual", "annual"]).default("monthly").notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  nextBillingDate: timestamp("nextBillingDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TuitionPlan = typeof tuitionPlans.$inferSelect;
export type InsertTuitionPlan = typeof tuitionPlans.$inferInsert;

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
  type: mysqlEnum("type", ["attendance", "report", "message", "payment", "general", "activity", "announcement", "registration", "system"]).default("general").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  link: varchar("link", { length: 500 }),
  metadata: json("metadata"),
  organizationId: int("organizationId").default(1),
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



// ============ MEDIA (Photos & Videos) ============
export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["photo", "video"]).notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  thumbnailUrl: text("thumbnailUrl"),
  caption: text("caption"),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy").notNull(),
  classId: int("classId"),
  visibility: mysqlEnum("visibility", ["class", "specific"]).default("class").notNull(),
  isApproved: boolean("isApproved").default(true).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;

// Junction table for media-children relationship (which children appear in the media)
export const mediaChildren = mysqlTable("media_children", {
  id: int("id").autoincrement().primaryKey(),
  mediaId: int("mediaId").notNull(),
  childId: int("childId").notNull(),
});
export type MediaChild = typeof mediaChildren.$inferSelect;

// ============ OTP CODES ============
export const otpCodes = mysqlTable("otp_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  code: varchar("code", { length: 6 }).notNull(),
  type: mysqlEnum("type", ["registration", "password_reset", "login_verification", "phone_verification", "email_verification"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false).notNull(),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

// ============ PASSWORD RESET TOKENS ============
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  type: mysqlEnum("type", ["email_link", "otp"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ============ LOGIN ATTEMPTS ============
export const loginAttempts = mysqlTable("login_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  identifier: varchar("identifier", { length: 320 }),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  success: boolean("success").default(false).notNull(),
  reason: varchar("reason", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

// ============ PICKUP REQUESTS (6-Step Workflow) ============
export const pickupRequests = mysqlTable("pickup_requests", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  parentId: int("parentId").notNull(),
  // Workflow statuses: waiting_teacher → sent_to_reception → waiting_at_reception → picked_up → cancelled
  status: mysqlEnum("status", ["waiting_teacher", "sent_to_reception", "waiting_at_reception", "picked_up", "cancelled"]).default("waiting_teacher").notNull(),
  // Timestamps for each step
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  teacherResponseAt: timestamp("teacherResponseAt"),
  arrivedReceptionAt: timestamp("arrivedReceptionAt"),
  pickedUpAt: timestamp("pickedUpAt"),
  // Pickup person details
  pickedUpBy: varchar("pickedUpBy", { length: 255 }),
  pickedUpByRelationship: varchar("pickedUpByRelationship", { length: 100 }),
  // Staff handling
  teacherId: int("teacherId"),
  receptionStaffId: int("receptionStaffId"),
  // Escalation
  escalatedAt: timestamp("escalatedAt"),
  // Additional info
  notes: text("notes"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PickupRequest = typeof pickupRequests.$inferSelect;
export type InsertPickupRequest = typeof pickupRequests.$inferInsert;

// ============ AUTHORIZED PICKUP PERSONS ============
export const authorizedPickupPersons = mysqlTable("authorized_pickup_persons", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  relationship: mysqlEnum("relationship", ["father", "mother", "grandfather", "grandmother", "driver", "relative", "other"]).notNull(),
  phone: varchar("phone", { length: 20 }),
  nationalId: varchar("nationalId", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuthorizedPickupPerson = typeof authorizedPickupPersons.$inferSelect;
export type InsertAuthorizedPickupPerson = typeof authorizedPickupPersons.$inferInsert;

// ============ LEARNING OBSERVATIONS ============
export const learningObservations = mysqlTable("learning_observations", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  observedBy: int("observedBy").notNull(),
  area: varchar("area", { length: 200 }).notNull(), // EYFS area
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"), // photo/video URL
  nextSteps: text("nextSteps"),
  linkedAssessmentId: int("linkedAssessmentId"),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ PUSH SUBSCRIPTIONS ============
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ============ AI GENERATED CONTENT ============
export const aiGeneratedContent = mysqlTable("ai_generated_content", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["observation", "weekly_plan", "activity", "progress_report", "parent_message", "newsletter", "story"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: json("content").notNull(),
  language: mysqlEnum("language", ["ar", "en"]).default("ar").notNull(),
  childId: int("childId"),
  classId: int("classId"),
  ageGroup: varchar("ageGroup", { length: 50 }),
  theme: varchar("theme", { length: 200 }),
  inputPrompt: text("inputPrompt"),
  createdBy: int("createdBy").notNull(),
  isSaved: boolean("isSaved").default(false).notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AiGeneratedContent = typeof aiGeneratedContent.$inferSelect;
export type InsertAiGeneratedContent = typeof aiGeneratedContent.$inferInsert;

// ============ AI LIBRARY (Saved & Reusable Content) ============
export const aiLibrary = mysqlTable("ai_library", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  category: mysqlEnum("category", ["observation", "weekly_plan", "activity", "progress_report", "parent_message", "newsletter", "story"]).notNull(),
  tags: json("tags"),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  savedBy: int("savedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiLibrary = typeof aiLibrary.$inferSelect;
export type InsertAiLibrary = typeof aiLibrary.$inferInsert;


// ============ STAFF DUTY STATUS ============
export const staffDutyStatus = mysqlTable("staff_duty_status", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  isOnDuty: boolean("isOnDuty").default(true).notNull(),
  lastToggleAt: timestamp("lastToggleAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StaffDutyStatus = typeof staffDutyStatus.$inferSelect;
export type InsertStaffDutyStatus = typeof staffDutyStatus.$inferInsert;

// ============ PICKUP ALERT SETTINGS ============
export const pickupAlertSettings = mysqlTable("pickup_alert_settings", {
  id: int("id").autoincrement().primaryKey(),
  volume: int("volume").default(80).notNull(), // 0-100
  tone: mysqlEnum("tone", ["urgent", "gentle", "alarm", "chime"]).default("urgent").notNull(),
  repeatIntervalSeconds: int("repeatIntervalSeconds").default(5).notNull(),
  escalationMinutes: int("escalationMinutes").default(2).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PickupAlertSettings = typeof pickupAlertSettings.$inferSelect;

// ============ PICKUP ALERT ACKNOWLEDGMENTS ============
export const pickupAlertAcknowledgments = mysqlTable("pickup_alert_acknowledgments", {
  id: int("id").autoincrement().primaryKey(),
  pickupRequestId: int("pickupRequestId").notNull(),
  userId: int("userId").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
});
export type PickupAlertAcknowledgment = typeof pickupAlertAcknowledgments.$inferSelect;

// ============ WEEKLY PLANS ============
export const weeklyPlans = mysqlTable("weekly_plans", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId"),
  teacherId: int("teacherId").notNull(),
  ageGroup: mysqlEnum("ageGroup", ["nursery", "kg1", "kg2", "kg3"]).notNull(),
  weekStartDate: varchar("weekStartDate", { length: 10 }).notNull(), // YYYY-MM-DD
  weekEndDate: varchar("weekEndDate", { length: 10 }).notNull(), // YYYY-MM-DD
  theme: varchar("theme", { length: 300 }).notNull(),
  language: mysqlEnum("language", ["ar", "en", "bilingual"]).default("ar").notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  sections: json("sections").notNull(), // JSON object with all 14 sections
  publishedAt: timestamp("publishedAt"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WeeklyPlan = typeof weeklyPlans.$inferSelect;
export type InsertWeeklyPlan = typeof weeklyPlans.$inferInsert;


// ============ ORGANIZATIONS (Multi-Tenant) ============
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameAr: varchar("nameAr", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  edition: mysqlEnum("edition", ["learning_tree", "nashaa"]).default("nashaa").notNull(),
  orgType: mysqlEnum("orgType", ["nursery", "school", "independent_teacher"]).default("nursery").notNull(),
  status: mysqlEnum("status", ["active", "suspended", "pending", "trial"]).default("pending").notNull(),
  logoUrl: text("logoUrl"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("SA"),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  maxChildren: int("maxChildren").default(50),
  maxStaff: int("maxStaff").default(20),
  subscriptionPlanId: int("subscriptionPlanId"),
  trialEndsAt: timestamp("trialEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ============ ORGANIZATION BRANDING ============
export const organizationBranding = mysqlTable("organization_branding", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#10b981"),
  secondaryColor: varchar("secondaryColor", { length: 20 }).default("#059669"),
  accentColor: varchar("accentColor", { length: 20 }).default("#34d399"),
  backgroundColor: varchar("backgroundColor", { length: 20 }).default("#0f172a"),
  textColor: varchar("textColor", { length: 20 }).default("#f8fafc"),
  logoUrl: text("logoUrl"),
  logoLightUrl: text("logoLightUrl"),
  appIcon: text("appIcon"),
  splashScreenUrl: text("splashScreenUrl"),
  fontFamily: varchar("fontFamily", { length: 100 }).default("Noto Sans Arabic"),
  borderRadius: varchar("borderRadius", { length: 20 }).default("0.5rem"),
  sidebarStyle: mysqlEnum("sidebarStyle", ["dark", "light", "gradient"]).default("dark"),
  customCss: text("customCss"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OrganizationBranding = typeof organizationBranding.$inferSelect;
export type InsertOrganizationBranding = typeof organizationBranding.$inferInsert;

// ============ SUBSCRIPTION PLANS ============
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("nameAr", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  tier: mysqlEnum("tier", ["starter", "professional", "enterprise"]).notNull(),
  priceMonthly: decimal("priceMonthly", { precision: 10, scale: 2 }).default("0.00").notNull(),
  priceYearly: decimal("priceYearly", { precision: 10, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  maxChildren: int("maxChildren").default(30).notNull(),
  maxStaff: int("maxStaff").default(10).notNull(),
  maxClasses: int("maxClasses").default(5).notNull(),
  storageGb: int("storageGb").default(5).notNull(),
  features: json("features").notNull(), // JSON array of feature keys enabled
  hasAiTools: boolean("hasAiTools").default(false).notNull(),
  hasCustomBranding: boolean("hasCustomBranding").default(false).notNull(),
  hasAdvancedReports: boolean("hasAdvancedReports").default(false).notNull(),
  hasParentApp: boolean("hasParentApp").default(true).notNull(),
  hasPushNotifications: boolean("hasPushNotifications").default(true).notNull(),
  hasApiAccess: boolean("hasApiAccess").default(false).notNull(),
  prioritySupport: boolean("prioritySupport").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

// ============ ORGANIZATION SUBSCRIPTIONS ============
export const organizationSubscriptions = mysqlTable("organization_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled", "past_due", "trialing"]).default("trialing").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).default("monthly").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelledAt: timestamp("cancelledAt"),
  cancelReason: text("cancelReason"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type InsertOrganizationSubscription = typeof organizationSubscriptions.$inferInsert;

// ============ ORGANIZATION MEMBERS (User-Organization mapping) ============
export const organizationMembers = mysqlTable("organization_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "principal", "teacher", "assistant", "accountant", "receptionist", "parent"]).default("parent").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;


// ============ GROWTH & DEVELOPMENT CENTER ============

// Development Areas (7 EYFS Prime + Specific areas with sub-areas)
export const developmentAreas = mysqlTable("development_areas", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameEn: varchar("nameEn", { length: 200 }).notNull(),
  nameAr: varchar("nameAr", { length: 200 }).notNull(),
  category: mysqlEnum("category", ["prime", "specific"]).notNull(),
  parentAreaId: int("parentAreaId"), // for sub-areas
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  ageRangeMonths: varchar("ageRangeMonths", { length: 20 }), // e.g. "0-60"
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DevelopmentArea = typeof developmentAreas.$inferSelect;

// Development Milestones (age-appropriate expectations per area)
export const developmentMilestones = mysqlTable("development_milestones", {
  id: int("id").autoincrement().primaryKey(),
  areaId: int("areaId").notNull(),
  ageRangeStart: int("ageRangeStart").notNull(), // months
  ageRangeEnd: int("ageRangeEnd").notNull(), // months
  titleEn: varchar("titleEn", { length: 300 }).notNull(),
  titleAr: varchar("titleAr", { length: 300 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  expectedLevel: mysqlEnum("expectedLevel", ["emerging", "developing", "secure", "exceeding"]).default("developing").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DevelopmentMilestone = typeof developmentMilestones.$inferSelect;

// Development Observations (detailed teacher observations linked to areas)
export const developmentObservations = mysqlTable("development_observations", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  areaId: int("areaId").notNull(),
  observedBy: int("observedBy").notNull(),
  level: mysqlEnum("level", ["emerging", "developing", "secure", "exceeding"]).default("emerging").notNull(),
  confidenceLevel: mysqlEnum("confidenceLevel", ["low", "medium", "high"]).default("medium").notNull(),
  context: mysqlEnum("context", ["free_play", "guided_activity", "group_work", "outdoor", "routine", "assessment", "other"]).default("guided_activity").notNull(),
  observation: text("observation").notNull(),
  evidence: text("evidence"), // photo/video URLs (JSON array)
  nextSteps: text("nextSteps"),
  linkedMilestoneId: int("linkedMilestoneId"),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  termPeriod: mysqlEnum("termPeriod", ["autumn_1", "autumn_2", "spring_1", "spring_2", "summer_1", "summer_2"]).default("autumn_1").notNull(),
  academicYear: varchar("academicYear", { length: 10 }), // e.g. "2025-2026"
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DevelopmentObservation = typeof developmentObservations.$inferSelect;

// School Readiness Scores (6 dimensions + overall)
export const schoolReadinessScores = mysqlTable("school_readiness_scores", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  assessedBy: int("assessedBy").notNull(),
  languageReadiness: int("languageReadiness").default(0).notNull(), // 0-100
  socialReadiness: int("socialReadiness").default(0).notNull(),
  emotionalReadiness: int("emotionalReadiness").default(0).notNull(),
  cognitiveReadiness: int("cognitiveReadiness").default(0).notNull(),
  physicalReadiness: int("physicalReadiness").default(0).notNull(),
  overallReadiness: int("overallReadiness").default(0).notNull(),
  aiGenerated: boolean("aiGenerated").default(false).notNull(),
  notes: text("notes"),
  termPeriod: mysqlEnum("termPeriod", ["autumn_1", "autumn_2", "spring_1", "spring_2", "summer_1", "summer_2"]).default("autumn_1").notNull(),
  academicYear: varchar("academicYear", { length: 10 }),
  organizationId: int("organizationId").default(1),
  assessedAt: timestamp("assessedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SchoolReadinessScore = typeof schoolReadinessScores.$inferSelect;

// AI Development Analysis (AI-generated insights per child)
export const aiDevelopmentAnalysis = mysqlTable("ai_development_analysis", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  analysisType: mysqlEnum("analysisType", ["strengths", "concerns", "recommendations", "full_report", "school_readiness", "intervention"]).notNull(),
  content: text("content").notNull(), // JSON structured content
  contentAr: text("contentAr"), // Arabic version
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00-1.00
  basedOnObservations: int("basedOnObservations").default(0).notNull(), // count of observations analyzed
  termPeriod: mysqlEnum("termPeriod", ["autumn_1", "autumn_2", "spring_1", "spring_2", "summer_1", "summer_2"]).default("autumn_1").notNull(),
  academicYear: varchar("academicYear", { length: 10 }),
  organizationId: int("organizationId").default(1),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // analysis should be regenerated after this
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiDevelopmentAnalysis = typeof aiDevelopmentAnalysis.$inferSelect;

// Development Recommendations (personalized activities for classroom & home)
export const developmentRecommendations = mysqlTable("development_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  areaId: int("areaId").notNull(),
  type: mysqlEnum("type", ["classroom_activity", "home_activity", "intervention", "enrichment", "parent_tip"]).notNull(),
  titleEn: varchar("titleEn", { length: 300 }).notNull(),
  titleAr: varchar("titleAr", { length: 300 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "dismissed"]).default("pending").notNull(),
  aiGenerated: boolean("aiGenerated").default(true).notNull(),
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DevelopmentRecommendation = typeof developmentRecommendations.$inferSelect;

// Development Alerts (intelligent alerts for developmental concerns)
export const developmentAlerts = mysqlTable("development_alerts", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  areaId: int("areaId"),
  alertType: mysqlEnum("alertType", ["limited_progress", "below_expectations", "follow_up_needed", "multiple_concerns", "regression", "milestone_delayed"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("warning").notNull(),
  titleEn: varchar("titleEn", { length: 300 }).notNull(),
  titleAr: varchar("titleAr", { length: 300 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  suggestedAction: text("suggestedAction"),
  status: mysqlEnum("status", ["active", "acknowledged", "resolved", "dismissed"]).default("active").notNull(),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  resolutionNotes: text("resolutionNotes"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DevelopmentAlert = typeof developmentAlerts.$inferSelect;

// Child Development Summary (cached summary for quick access)
export const childDevelopmentSummary = mysqlTable("child_development_summary", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  totalObservations: int("totalObservations").default(0).notNull(),
  lastObservationDate: timestamp("lastObservationDate"),
  averageLevel: decimal("averageLevel", { precision: 3, scale: 2 }), // numeric avg of levels
  strongestAreaId: int("strongestAreaId"),
  weakestAreaId: int("weakestAreaId"),
  schoolReadinessScore: int("schoolReadinessScore"), // 0-100 overall
  alertCount: int("alertCount").default(0).notNull(),
  lastAnalysisDate: timestamp("lastAnalysisDate"),
  termPeriod: mysqlEnum("termPeriod", ["autumn_1", "autumn_2", "spring_1", "spring_2", "summer_1", "summer_2"]).default("autumn_1").notNull(),
  academicYear: varchar("academicYear", { length: 10 }),
  organizationId: int("organizationId").default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ChildDevelopmentSummary = typeof childDevelopmentSummary.$inferSelect;

// ============ PARENT ENGAGEMENT CENTER ============

// Home Learning Activities (AI-generated personalized activities)
export const homeLearningActivities = mysqlTable("home_learning_activities", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  parentId: int("parentId").notNull(),
  category: mysqlEnum("category", ["language", "fine_motor", "gross_motor", "social_emotional", "early_math", "literacy", "creative", "outdoor"]).notNull(),
  titleEn: varchar("titleEn", { length: 300 }).notNull(),
  titleAr: varchar("titleAr", { length: 300 }).notNull(),
  descriptionEn: text("descriptionEn").notNull(),
  descriptionAr: text("descriptionAr").notNull(),
  materialsEn: text("materialsEn"),
  materialsAr: text("materialsAr"),
  stepsEn: text("stepsEn"),
  stepsAr: text("stepsAr"),
  duration: int("duration"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "challenging"]).default("easy").notNull(),
  ageGroupMonths: int("ageGroupMonths"),
  eyfsAreaId: int("eyfsAreaId"),
  status: mysqlEnum("status", ["pending", "completed", "skipped"]).default("pending").notNull(),
  completedAt: timestamp("completedAt"),
  parentFeedback: text("parentFeedback"),
  rating: int("rating"),
  weekNumber: int("weekNumber"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HomeLearningActivity = typeof homeLearningActivities.$inferSelect;

// Family Challenges (weekly engagement challenges)
export const familyChallenges = mysqlTable("family_challenges", {
  id: int("id").autoincrement().primaryKey(),
  titleEn: varchar("titleEn", { length: 300 }).notNull(),
  titleAr: varchar("titleAr", { length: 300 }).notNull(),
  descriptionEn: text("descriptionEn").notNull(),
  descriptionAr: text("descriptionAr").notNull(),
  category: mysqlEnum("category", ["reading", "kindness", "creativity", "outdoor", "stem", "social", "health", "cultural"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("easy").notNull(),
  durationDays: int("durationDays").default(7).notNull(),
  pointsReward: int("pointsReward").default(10).notNull(),
  badgeId: int("badgeId"),
  weekNumber: int("weekNumber"),
  academicYear: varchar("academicYear", { length: 10 }),
  isActive: boolean("isActive").default(true).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FamilyChallenge = typeof familyChallenges.$inferSelect;

// Challenge Participations (family completion tracking)
export const challengeParticipations = mysqlTable("challenge_participations", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  parentId: int("parentId").notNull(),
  childId: int("childId").notNull(),
  status: mysqlEnum("status", ["enrolled", "in_progress", "completed", "expired"]).default("enrolled").notNull(),
  progressPercent: int("progressPercent").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  evidenceUrl: text("evidenceUrl"),
  notes: text("notes"),
  pointsEarned: int("pointsEarned").default(0),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ChallengeParticipation = typeof challengeParticipations.$inferSelect;

// Home Journal Entries (parent photos, videos, notes, achievements)
export const homeJournalEntries = mysqlTable("home_journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  parentId: int("parentId").notNull(),
  entryType: mysqlEnum("entryType", ["photo", "video", "note", "achievement", "milestone"]).notNull(),
  title: varchar("title", { length: 300 }),
  description: text("description"),
  mediaUrl: text("mediaUrl"),
  mediaType: varchar("mediaType", { length: 50 }),
  eyfsAreaId: int("eyfsAreaId"),
  developmentAreaId: int("developmentAreaId"),
  status: mysqlEnum("status", ["pending_review", "approved", "needs_revision", "rejected"]).default("pending_review").notNull(),
  teacherReviewNotes: text("teacherReviewNotes"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  isHighlighted: boolean("isHighlighted").default(false).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HomeJournalEntry = typeof homeJournalEntries.$inferSelect;

// Parent Observations (parent-submitted observations with AI analysis)
export const parentObservations = mysqlTable("parent_observations", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  parentId: int("parentId").notNull(),
  observationText: text("observationText").notNull(),
  context: mysqlEnum("context", ["home_play", "outdoor", "social", "mealtime", "bedtime", "learning", "creative", "other"]).default("home_play").notNull(),
  mediaUrl: text("mediaUrl"),
  aiAnalysis: json("aiAnalysis"),
  aiSuggestedAreaIds: json("aiSuggestedAreaIds"),
  significance: mysqlEnum("significance", ["routine", "notable", "significant", "concern"]).default("routine").notNull(),
  teacherStatus: mysqlEnum("teacherStatus", ["pending", "reviewed", "flagged", "linked_to_assessment"]).default("pending").notNull(),
  teacherNotes: text("teacherNotes"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  linkedObservationId: int("linkedObservationId"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ParentObservation = typeof parentObservations.$inferSelect;

// Monthly Growth Goals (personalized goals per child)
export const monthlyGrowthGoals = mysqlTable("monthly_growth_goals", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  parentId: int("parentId").notNull(),
  titleEn: varchar("titleEn", { length: 300 }).notNull(),
  titleAr: varchar("titleAr", { length: 300 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  category: mysqlEnum("category", ["vocabulary", "fine_motor", "gross_motor", "social", "independence", "literacy", "numeracy", "creativity"]).notNull(),
  targetMonth: int("targetMonth").notNull(),
  targetYear: int("targetYear").notNull(),
  progressPercent: int("progressPercent").default(0).notNull(),
  status: mysqlEnum("status", ["active", "completed", "partially_completed", "not_started"]).default("not_started").notNull(),
  completedAt: timestamp("completedAt"),
  suggestedActivities: json("suggestedActivities"),
  parentNotes: text("parentNotes"),
  teacherNotes: text("teacherNotes"),
  basedOnAreaId: int("basedOnAreaId"),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MonthlyGrowthGoal = typeof monthlyGrowthGoals.$inferSelect;

// Engagement Scores (monthly/term/annual family engagement)
export const engagementScores = mysqlTable("engagement_scores", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  childId: int("childId").notNull(),
  period: mysqlEnum("period", ["weekly", "monthly", "term", "annual"]).notNull(),
  periodValue: varchar("periodValue", { length: 20 }).notNull(),
  activitiesCompleted: int("activitiesCompleted").default(0).notNull(),
  challengesCompleted: int("challengesCompleted").default(0).notNull(),
  journalEntries: int("journalEntries").default(0).notNull(),
  observationsSubmitted: int("observationsSubmitted").default(0).notNull(),
  goalsCompleted: int("goalsCompleted").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  score: int("score").default(0).notNull(),
  level: mysqlEnum("level", ["inactive", "emerging", "developing", "active", "highly_engaged", "champion"]).default("inactive").notNull(),
  streak: int("streak").default(0).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EngagementScore = typeof engagementScores.$inferSelect;

// Achievement Badges (gamification)
export const achievementBadges = mysqlTable("achievement_badges", {
  id: int("id").autoincrement().primaryKey(),
  nameEn: varchar("nameEn", { length: 200 }).notNull(),
  nameAr: varchar("nameAr", { length: 200 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionAr: text("descriptionAr"),
  icon: varchar("icon", { length: 100 }).notNull(),
  category: mysqlEnum("category", ["activity", "challenge", "journal", "observation", "goal", "streak", "milestone"]).notNull(),
  criteria: json("criteria"),
  pointsRequired: int("pointsRequired").default(0),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"]).default("bronze").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AchievementBadge = typeof achievementBadges.$inferSelect;

// Parent Earned Badges
export const parentBadges = mysqlTable("parent_badges", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  badgeId: int("badgeId").notNull(),
  childId: int("childId"),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  organizationId: int("organizationId").default(1),
});
export type ParentBadge = typeof parentBadges.$inferSelect;

// Family Engagement Config (per-org module settings)
export const familyEngagementConfig = mysqlTable("family_engagement_config", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  activitiesPerWeek: int("activitiesPerWeek").default(3).notNull(),
  challengesEnabled: boolean("challengesEnabled").default(true).notNull(),
  journalEnabled: boolean("journalEnabled").default(true).notNull(),
  parentObservationsEnabled: boolean("parentObservationsEnabled").default(true).notNull(),
  chatbotEnabled: boolean("chatbotEnabled").default(true).notNull(),
  gamificationEnabled: boolean("gamificationEnabled").default(true).notNull(),
  autoGenerateGoals: boolean("autoGenerateGoals").default(true).notNull(),
  defaultLanguage: mysqlEnum("defaultLanguage", ["ar", "en", "both"]).default("both").notNull(),
  customBranding: json("customBranding"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FamilyEngagementConfig = typeof familyEngagementConfig.$inferSelect;


// ============ NURSERY REGISTRATIONS (Self-Registration Requests) ============
export const nurseryRegistrations = mysqlTable("nursery_registrations", {
  id: int("id").autoincrement().primaryKey(),
  // Nursery Info
  nurseryName: varchar("nurseryName", { length: 200 }).notNull(),
  nurseryNameAr: varchar("nurseryNameAr", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  district: varchar("district", { length: 200 }),
  childrenCount: int("childrenCount").notNull(),
  staffCount: int("staffCount").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  // Owner Info
  ownerName: varchar("ownerName", { length: 200 }).notNull(),
  ownerEmail: varchar("ownerEmail", { length: 320 }).notNull(),
  ownerPhone: varchar("ownerPhone", { length: 20 }).notNull(),
  ownerPassword: varchar("ownerPassword", { length: 255 }).notNull(),
  // Plan Selection
  selectedPlan: mysqlEnum("selectedPlan", ["basic", "professional", "enterprise"]).notNull(),
  billingCycle: mysqlEnum("billingCycle", ["yearly"]).default("yearly").notNull(),
  // Status
  status: mysqlEnum("status", ["pending", "approved", "rejected", "converted"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  rejectionReason: text("rejectionReason"),
  convertedOrganizationId: int("convertedOrganizationId"),
  // Metadata
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy"),
});
export type NurseryRegistration = typeof nurseryRegistrations.$inferSelect;
export type InsertNurseryRegistration = typeof nurseryRegistrations.$inferInsert;


// ============ STAFF PROFILES (Extended HR Data) ============
export const staffProfiles = mysqlTable("staff_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // Links to users table
  organizationId: int("organizationId").notNull(),
  // Personal Info
  fullNameAr: varchar("fullNameAr", { length: 200 }),
  fullNameEn: varchar("fullNameEn", { length: 200 }),
  nationalId: varchar("nationalId", { length: 20 }),
  iqamaNumber: varchar("iqamaNumber", { length: 20 }),
  dateOfBirth: timestamp("dateOfBirth"),
  gender: mysqlEnum("gender", ["male", "female"]),
  nationality: varchar("nationality", { length: 100 }),
  maritalStatus: mysqlEnum("maritalStatus", ["single", "married", "divorced", "widowed"]),
  // Contact
  mobile: varchar("mobile", { length: 20 }),
  altPhone: varchar("altPhone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  // Employment Info
  jobTitle: mysqlEnum("jobTitle", ["teacher", "supervisor", "principal", "assistant", "admin_staff", "specialist", "accountant", "receptionist", "driver", "other"]).notNull(),
  customJobTitle: varchar("customJobTitle", { length: 200 }),
  department: varchar("department", { length: 200 }),
  branch: varchar("branch", { length: 200 }),
  hireDate: timestamp("hireDate"),
  contractType: mysqlEnum("contractType", ["full_time", "part_time", "contract", "temporary"]).default("full_time"),
  contractEndDate: timestamp("contractEndDate"),
  // Qualifications
  qualification: varchar("qualification", { length: 200 }),
  specialization: varchar("specialization", { length: 200 }),
  yearsOfExperience: int("yearsOfExperience"),
  certifications: json("certifications"), // JSON array of certification strings
  // Financial (optional)
  bankName: varchar("bankName", { length: 200 }),
  iban: varchar("iban", { length: 50 }),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  // Emergency Contact
  emergencyContactName: varchar("emergencyContactName", { length: 200 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 20 }),
  emergencyContactRelation: varchar("emergencyContactRelation", { length: 100 }),
  // Photo
  photo: text("photo"),
  // Status
  status: mysqlEnum("status", ["active", "inactive", "on_leave", "terminated", "resigned"]).default("active").notNull(),
  terminationDate: timestamp("terminationDate"),
  terminationReason: text("terminationReason"),
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StaffProfile = typeof staffProfiles.$inferSelect;
export type InsertStaffProfile = typeof staffProfiles.$inferInsert;

// ============ STAFF LEAVES ============
export const staffLeaves = mysqlTable("staff_leaves", {
  id: int("id").autoincrement().primaryKey(),
  staffProfileId: int("staffProfileId").notNull(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  type: mysqlEnum("type", ["annual", "sick", "emergency", "unpaid", "maternity", "other"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  totalDays: int("totalDays").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  attachmentUrl: text("attachmentUrl"),
  attachmentKey: varchar("attachmentKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StaffLeave = typeof staffLeaves.$inferSelect;
export type InsertStaffLeave = typeof staffLeaves.$inferInsert;

// ============ STAFF LEAVE BALANCES ============
export const staffLeaveBalances = mysqlTable("staff_leave_balances", {
  id: int("id").autoincrement().primaryKey(),
  staffProfileId: int("staffProfileId").notNull(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  year: int("year").notNull(),
  annualTotal: int("annualTotal").default(21).notNull(),
  annualUsed: int("annualUsed").default(0).notNull(),
  sickTotal: int("sickTotal").default(14).notNull(),
  sickUsed: int("sickUsed").default(0).notNull(),
  emergencyTotal: int("emergencyTotal").default(5).notNull(),
  emergencyUsed: int("emergencyUsed").default(0).notNull(),
  unpaidUsed: int("unpaidUsed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StaffLeaveBalance = typeof staffLeaveBalances.$inferSelect;
export type InsertStaffLeaveBalance = typeof staffLeaveBalances.$inferInsert;

// ============ STAFF NOTES ============
export const staffNotes = mysqlTable("staff_notes", {
  id: int("id").autoincrement().primaryKey(),
  staffProfileId: int("staffProfileId").notNull(),
  organizationId: int("organizationId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["general", "performance", "warning", "appreciation", "meeting", "other"]).default("general").notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StaffNote = typeof staffNotes.$inferSelect;
export type InsertStaffNote = typeof staffNotes.$inferInsert;

// ============ STAFF DOCUMENTS ============
export const staffDocuments = mysqlTable("staff_documents", {
  id: int("id").autoincrement().primaryKey(),
  staffProfileId: int("staffProfileId").notNull(),
  organizationId: int("organizationId").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["contract", "id_copy", "certificate", "license", "medical", "other"]).default("other").notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  expiryDate: timestamp("expiryDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StaffDocument = typeof staffDocuments.$inferSelect;
export type InsertStaffDocument = typeof staffDocuments.$inferInsert;

// ============ DEVELOPMENTAL ASSESSMENTS (مقياس الكشف المبكر) ============
export const developmentalAssessments = mysqlTable("developmental_assessments", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(),
  assessorId: int("assessorId").notNull(),
  ageGroup: mysqlEnum("ageGroup", ["24-36", "36-48", "48-60", "60-72"]).notNull(),
  totalScore: int("totalScore").notNull(),
  maxScore: int("maxScore").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  interpretation: mysqlEnum("interpretation", ["on_track", "needs_support", "needs_referral"]).notNull(),
  notes: text("notes"),
  assessmentDate: timestamp("assessmentDate").notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DevelopmentalAssessment = typeof developmentalAssessments.$inferSelect;
export type InsertDevelopmentalAssessment = typeof developmentalAssessments.$inferInsert;

// ============ ASSESSMENT RESPONSES (إجابات التقييم) ============
export const assessmentResponses = mysqlTable("assessment_responses", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  domain: mysqlEnum("domain", ["communication", "gross_motor", "fine_motor", "problem_solving", "personal_social"]).notNull(),
  itemIndex: int("itemIndex").notNull(),
  itemText: text("itemText").notNull(),
  response: mysqlEnum("response", ["yes", "sometimes", "not_yet"]).notNull(),
  score: int("score").notNull(),
});

export type AssessmentResponse = typeof assessmentResponses.$inferSelect;
export type InsertAssessmentResponse = typeof assessmentResponses.$inferInsert;


// ============ CURRICULUM LIBRARY (مكتبة المناهج) ============
export const curricula = mysqlTable("curricula", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  level: mysqlEnum("level", ["nursery", "kg1", "kg2", "kg3", "all"]).notNull(),
  category: varchar("category", { length: 100 }),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy").notNull(),
  organizationId: int("organizationId").default(1),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Curriculum = typeof curricula.$inferSelect;
export type InsertCurriculum = typeof curricula.$inferInsert;


// ============ CUSTOM ASSESSMENTS ============
export const customAssessments = mysqlTable("custom_assessments", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  classId: int("classId"),
  ageGroup: varchar("ageGroup", { length: 50 }),
  createdBy: int("createdBy").notNull(),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  shareWithParents: boolean("shareWithParents").default(false).notNull(),
  organizationId: int("organizationId").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomAssessment = typeof customAssessments.$inferSelect;
export type InsertCustomAssessment = typeof customAssessments.$inferInsert;

// ============ ASSESSMENT QUESTIONS ============
export const assessmentQuestions = mysqlTable("assessment_questions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  questionText: text("questionText").notNull(),
  questionType: mysqlEnum("questionType", ["multiple_choice", "true_false", "rating", "text"]).notNull(),
  options: json("options"), // For multiple_choice: ["option1", "option2", ...] 
  correctAnswer: text("correctAnswer"), // Optional correct answer
  maxRating: int("maxRating").default(5), // For rating type
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type InsertAssessmentQuestion = typeof assessmentQuestions.$inferInsert;

// ============ CUSTOM ASSESSMENT RESPONSES ============
export const customAssessmentResponses = mysqlTable("custom_assessment_responses", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessmentId").notNull(),
  childId: int("childId").notNull(),
  questionId: int("questionId").notNull(),
  answer: text("answer"), // The child's answer
  rating: int("rating"), // For rating type questions
  notes: text("notes"), // Teacher notes
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomAssessmentResponse = typeof customAssessmentResponses.$inferSelect;
export type InsertCustomAssessmentResponse = typeof customAssessmentResponses.$inferInsert;
