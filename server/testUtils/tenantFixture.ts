// Shared two-organization fixture for the tenant-isolation regression suite.
//
// See MULTI_TENANT_TEST_PLAN.md section 2.1 for the rationale. This module
// creates two fully-populated, independent organizations ("Org A" / "Org B")
// so every test file can do the standard cross probe: "can a caller
// authenticated as Org A's <role> act on Org B's <entity> by id?"
//
// IMPORTANT: this requires a live MySQL database reachable via
// process.env.DATABASE_URL. It has not been executed in the sandbox this
// suite was authored in (no live database available there) -- see
// MULTI_TENANT_TEST_PLAN.md section 6.
import { getDb } from "../db";
import type { TrpcContext } from "../_core/context";
import type { User } from "../../drizzle/schema";
import {
  organizations,
  organizationBranding,
  organizationSubscriptions,
  organizationMembers,
  users,
  classes,
  children,
  staffProfiles,
  staffAttendance,
  invoices,
  payments,
  transactions,
  refunds,
  tuitionPlans,
  medicalInfo,
  emergencyContacts,
  enrollment,
  childDocuments,
  customAssessments,
  assessmentQuestions,
  customAssessmentResponses,
  weeklyPlans,
  evaluationCriteria,
  evaluations,
  evaluationScores,
  developmentAreas,
  developmentObservations,
  homeLearningActivities,
  curricula,
  performanceGoals,
  calendarEvents,
  employeeSalaries,
  storeProducts,
  storeCategories,
  storeOrders,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type OrgFixture = {
  organizationId: number;
  adminId: number;
  teacherId: number;
  parentId: number;
  staffProfileId: number;
  classId: number;
  childId: number;
  staffAttendanceId: number;
  invoiceId: number;
  paymentId: number;
  transactionId: number;
  refundId: number;
  tuitionPlanId: number;
  emergencyContactId: number;
  enrollmentId: number;
  childDocumentId: number;
  customAssessmentId: number;
  assessmentQuestionId: number;
  assessmentResponseId: number;
  weeklyPlanId: number;
  publishedWeeklyPlanId: number;
  evaluationCriterionId: number;
  evaluationId: number;
  evaluationScoreId: number;
  developmentAreaId: number;
  developmentObservationId: number;
  homeLearningActivityId: number;
  curriculumId: number;
  performanceGoalId: number;
  calendarEventId: number;
  employeeSalaryId: number;
  storeCategoryId: number;
  storeProductId: number;
  storeOrderId: number;
};

export type TenantFixture = {
  orgA: OrgFixture;
  orgB: OrgFixture;
};

function randOpenId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

async function buildOrg(label: "A" | "B"): Promise<OrgFixture> {
  const db = (await getDb())!;

  const [orgResult] = await db.insert(organizations).values({
    name: `Tenant Fixture Org ${label}`,
    nameAr: `منظمة اختبار ${label}`,
    slug: `tenant-fixture-org-${label.toLowerCase()}-${Date.now()}`,
    status: "active",
  } as any);
  const organizationId = orgResult.insertId;

  await db.insert(organizationBranding).values({ organizationId } as any);

  const [adminResult] = await db.insert(users).values({
    openId: randOpenId(`fixture-admin-${label}`),
    name: `Fixture Admin ${label}`,
    email: `fixture-admin-${label.toLowerCase()}-${Date.now()}@test.local`,
    role: "admin",
    organizationId,
  } as any);
  const adminId = adminResult.insertId;

  const [teacherResult] = await db.insert(users).values({
    openId: randOpenId(`fixture-teacher-${label}`),
    name: `Fixture Teacher ${label}`,
    email: `fixture-teacher-${label.toLowerCase()}-${Date.now()}@test.local`,
    role: "teacher",
    organizationId,
  } as any);
  const teacherId = teacherResult.insertId;

  const [parentResult] = await db.insert(users).values({
    openId: randOpenId(`fixture-parent-${label}`),
    name: `Fixture Parent ${label}`,
    email: `fixture-parent-${label.toLowerCase()}-${Date.now()}@test.local`,
    role: "parent",
    organizationId,
  } as any);
  const parentId = parentResult.insertId;

  await db.insert(organizationMembers).values([
    { organizationId, userId: adminId, role: "admin", isActive: true },
    { organizationId, userId: teacherId, role: "teacher", isActive: true },
    { organizationId, userId: parentId, role: "parent", isActive: true },
  ] as any);

  const [staffProfileResult] = await db.insert(staffProfiles).values({
    userId: teacherId,
    organizationId,
    jobTitle: "teacher",
  } as any);
  const staffProfileId = staffProfileResult.insertId;

  const [classResult] = await db.insert(classes).values({
    name: `Fixture Class ${label}`,
    organizationId,
  } as any);
  const classId = classResult.insertId;

  const [childResult] = await db.insert(children).values({
    firstName: `Fixture`,
    lastName: `Child ${label}`,
    dateOfBirth: new Date(2021, 0, 1),
    gender: "male",
    organizationId,
    classId,
    parentId,
  } as any);
  const childId = childResult.insertId;

  const [staffAttendanceResult] = await db.insert(staffAttendance).values({
    userId: teacherId,
    date: new Date(),
    checkInTime: new Date(),
    status: "checked_in",
    organizationId,
  } as any);
  const staffAttendanceId = staffAttendanceResult.insertId;

  const [invoiceResult] = await db.insert(invoices).values({
    childId,
    parentId,
    invoiceNumber: `FIX-${label}-${Date.now()}`,
    subtotal: "100.00",
    vatAmount: "15.00",
    total: "115.00",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    organizationId,
    status: "pending",
  } as any);
  const invoiceId = invoiceResult.insertId;

  const [paymentResult] = await db.insert(payments).values({
    invoiceId,
    parentId,
    amount: "115.00",
    method: "cash",
    status: "initiated",
  } as any);
  const paymentId = paymentResult.insertId;

  const [transactionResult] = await db.insert(transactions).values({
    paymentId,
    invoiceId,
    parentId,
    amount: "115.00",
    type: "payment",
    status: "completed",
  } as any);
  const transactionId = transactionResult.insertId;

  const [refundResult] = await db.insert(refunds).values({
    transactionId,
    invoiceId,
    parentId,
    amount: "50.00",
    status: "pending",
  } as any);
  const refundId = refundResult.insertId;

  const [tuitionPlanResult] = await db.insert(tuitionPlans).values({
    childId,
    parentId,
    name: `Fixture Tuition Plan ${label}`,
    amount: "500.00",
    frequency: "monthly",
    startDate: new Date(),
    nextBillingDate: new Date(),
    isActive: true,
    createdBy: adminId,
  } as any);
  const tuitionPlanId = tuitionPlanResult.insertId;

  await db.insert(medicalInfo).values({ childId } as any);

  const [emergencyContactResult] = await db.insert(emergencyContacts).values({
    childId,
    name: `Fixture Emergency Contact ${label}`,
    phone: "0500000000",
    relationship: "father",
  } as any);
  const emergencyContactId = emergencyContactResult.insertId;

  const [enrollmentResult] = await db.insert(enrollment).values({
    childId,
    classId,
    startDate: new Date(),
    status: "active",
  } as any);
  const enrollmentId = enrollmentResult.insertId;

  const [childDocumentResult] = await db.insert(childDocuments).values({
    childId,
    type: "other",
    name: `Fixture Document ${label}`,
    fileUrl: "https://example.test/fixture.pdf",
    uploadedBy: adminId,
    status: "approved",
  } as any);
  const childDocumentId = childDocumentResult.insertId;

  const [customAssessmentResult] = await db.insert(customAssessments).values({
    title: `Fixture Assessment ${label}`,
    createdBy: adminId,
    organizationId,
    classId,
    shareWithParents: true,
    status: "active",
  } as any);
  const customAssessmentId = customAssessmentResult.insertId;

  const [assessmentQuestionResult] = await db.insert(assessmentQuestions).values({
    assessmentId: customAssessmentId,
    questionText: "Fixture question?",
    questionType: "text",
  } as any);
  const assessmentQuestionId = assessmentQuestionResult.insertId;

  const [assessmentResponseResult] = await db.insert(customAssessmentResponses).values({
    assessmentId: customAssessmentId,
    childId,
    questionId: assessmentQuestionId,
    recordedBy: teacherId,
    organizationId,
  } as any);
  const assessmentResponseId = assessmentResponseResult.insertId;

  const weeklyPlanSections = { theme_overview: "fixture" };
  const [weeklyPlanResult] = await db.insert(weeklyPlans).values({
    classId,
    teacherId,
    organizationId,
    ageGroup: "kg1",
    weekStartDate: "2026-01-05",
    weekEndDate: "2026-01-09",
    theme: `Fixture Theme ${label}`,
    language: "ar",
    status: "draft",
    sections: weeklyPlanSections,
  } as any);
  const weeklyPlanId = weeklyPlanResult.insertId;

  const [publishedWeeklyPlanResult] = await db.insert(weeklyPlans).values({
    classId,
    teacherId,
    organizationId,
    ageGroup: "kg1",
    weekStartDate: "2026-01-12",
    weekEndDate: "2026-01-16",
    theme: `Fixture Published Theme ${label}`,
    language: "ar",
    status: "published",
    publishedAt: new Date(),
    sections: weeklyPlanSections,
  } as any);
  const publishedWeeklyPlanId = publishedWeeklyPlanResult.insertId;

  const [evaluationCriterionResult] = await db.insert(evaluationCriteria).values({
    organizationId,
    name: `Fixture Criterion ${label}`,
    maxScore: 5,
    isActive: true,
  } as any);
  const evaluationCriterionId = evaluationCriterionResult.insertId;

  const [evaluationResult] = await db.insert(evaluations).values({
    userId: teacherId,
    organizationId,
    evaluatorId: adminId,
    period: "2026-Q1",
    status: "draft",
  } as any);
  const evaluationId = evaluationResult.insertId;

  const [evaluationScoreResult] = await db.insert(evaluationScores).values({
    evaluationId,
    criterionId: evaluationCriterionId,
    score: 4,
    organizationId,
  } as any);
  const evaluationScoreId = evaluationScoreResult.insertId;

  // developmentAreas is global/shared (no organizationId column, confirmed
  // in MULTI_TENANT_TEST_PLAN.md 3.5) -- reuse or create one row, not per-org.
  let developmentAreaId: number;
  const existingAreas = await db.select().from(developmentAreas).limit(1);
  if (existingAreas.length > 0) {
    developmentAreaId = existingAreas[0].id;
  } else {
    const [areaResult] = await db.insert(developmentAreas).values({
      code: "fixture_area",
      nameEn: "Fixture Area",
      nameAr: "مجال اختبار",
      category: "prime",
    } as any);
    developmentAreaId = areaResult.insertId;
  }

  const [developmentObservationResult] = await db.insert(developmentObservations).values({
    childId,
    areaId: developmentAreaId,
    observedBy: teacherId,
    observation: `Fixture observation ${label}`,
    level: "secure",
    organizationId,
  } as any);
  const developmentObservationId = developmentObservationResult.insertId;

  const [homeLearningActivityResult] = await db.insert(homeLearningActivities).values({
    childId,
    parentId,
    category: "language",
    titleEn: `Fixture Activity ${label}`,
    titleAr: `نشاط اختبار ${label}`,
    descriptionEn: "Fixture description",
    descriptionAr: "وصف اختبار",
    organizationId,
    status: "pending",
  } as any);
  const homeLearningActivityId = homeLearningActivityResult.insertId;

  const [curriculumResult] = await db.insert(curricula).values({
    title: `Fixture Curriculum ${label}`,
    level: "kg1",
    fileUrl: "https://example.test/fixture-curriculum.pdf",
    fileKey: `fixture-curriculum-${label}-${Date.now()}`,
    fileName: "fixture-curriculum.pdf",
    uploadedBy: adminId,
    organizationId,
  } as any);
  const curriculumId = curriculumResult.insertId;

  const [performanceGoalResult] = await db.insert(performanceGoals).values({
    userId: teacherId,
    organizationId,
    title: `Fixture Goal ${label}`,
    status: "active",
  } as any);
  const performanceGoalId = performanceGoalResult.insertId;

  const [calendarEventResult] = await db.insert(calendarEvents).values({
    title: `Fixture Event ${label}`,
    titleAr: `فعالية اختبار ${label}`,
    eventDate: "2026-02-01",
    createdBy: adminId,
    organizationId,
  } as any);
  const calendarEventId = calendarEventResult.insertId;

  const [employeeSalaryResult] = await db.insert(employeeSalaries).values({
    userId: teacherId,
    organizationId,
    basicSalary: "5000.00",
    isActive: true,
  } as any);
  const employeeSalaryId = employeeSalaryResult.insertId;

  const [storeCategoryResult] = await db.insert(storeCategories).values({
    organizationId,
    name: `Fixture Category ${label}`,
    nameAr: `فئة اختبار ${label}`,
    isActive: true,
  } as any);
  const storeCategoryId = storeCategoryResult.insertId;

  const [storeProductResult] = await db.insert(storeProducts).values({
    organizationId,
    name: `Fixture Product ${label}`,
    nameAr: `منتج اختبار ${label}`,
    price: "50.00",
    categoryId: storeCategoryId,
    isActive: true,
    type: "product",
    stock: 10,
  } as any);
  const storeProductId = storeProductResult.insertId;

  const [storeOrderResult] = await db.insert(storeOrders).values({
    orderNumber: `FIX-ORDER-${label}-${Date.now()}`,
    userId: parentId,
    organizationId,
    subtotal: "50.00",
    commission: "5.00",
    total: "55.00",
    status: "processing",
  } as any);
  const storeOrderId = storeOrderResult.insertId;

  return {
    organizationId,
    adminId,
    teacherId,
    parentId,
    staffProfileId,
    classId,
    childId,
    staffAttendanceId,
    invoiceId,
    paymentId,
    transactionId,
    refundId,
    tuitionPlanId,
    emergencyContactId,
    enrollmentId,
    childDocumentId,
    customAssessmentId,
    assessmentQuestionId,
    assessmentResponseId,
    weeklyPlanId,
    publishedWeeklyPlanId,
    evaluationCriterionId,
    evaluationId,
    evaluationScoreId,
    developmentAreaId,
    developmentObservationId,
    homeLearningActivityId,
    curriculumId,
    performanceGoalId,
    calendarEventId,
    employeeSalaryId,
    storeCategoryId,
    storeProductId,
    storeOrderId,
  };
}

export async function setupTenantFixture(): Promise<TenantFixture> {
  const orgA = await buildOrg("A");
  const orgB = await buildOrg("B");
  return { orgA, orgB };
}

// Deletes everything created by setupTenantFixture(), for both orgs, in an
// order that respects foreign keys. Uses raw deletes (not the app's own
// delete procedures) since this is test cleanup, not something under test.
export async function teardownTenantFixture(fixture: TenantFixture) {
  const db = (await getDb())!;
  for (const org of [fixture.orgA, fixture.orgB]) {
    await db.delete(storeOrders).where(eq(storeOrders.id, org.storeOrderId));
    await db.delete(storeProducts).where(eq(storeProducts.id, org.storeProductId));
    await db.delete(storeCategories).where(eq(storeCategories.id, org.storeCategoryId));
    await db.delete(employeeSalaries).where(eq(employeeSalaries.id, org.employeeSalaryId));
    await db.delete(calendarEvents).where(eq(calendarEvents.id, org.calendarEventId));
    await db.delete(performanceGoals).where(eq(performanceGoals.id, org.performanceGoalId));
    await db.delete(curricula).where(eq(curricula.id, org.curriculumId));
    await db.delete(homeLearningActivities).where(eq(homeLearningActivities.id, org.homeLearningActivityId));
    await db.delete(developmentObservations).where(eq(developmentObservations.id, org.developmentObservationId));
    await db.delete(evaluationScores).where(eq(evaluationScores.id, org.evaluationScoreId));
    await db.delete(evaluations).where(eq(evaluations.id, org.evaluationId));
    await db.delete(evaluationCriteria).where(eq(evaluationCriteria.id, org.evaluationCriterionId));
    await db.delete(weeklyPlans).where(eq(weeklyPlans.id, org.weeklyPlanId));
    await db.delete(weeklyPlans).where(eq(weeklyPlans.id, org.publishedWeeklyPlanId));
    await db.delete(customAssessmentResponses).where(eq(customAssessmentResponses.id, org.assessmentResponseId));
    await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, org.assessmentQuestionId));
    await db.delete(customAssessments).where(eq(customAssessments.id, org.customAssessmentId));
    await db.delete(childDocuments).where(eq(childDocuments.id, org.childDocumentId));
    await db.delete(enrollment).where(eq(enrollment.id, org.enrollmentId));
    await db.delete(emergencyContacts).where(eq(emergencyContacts.id, org.emergencyContactId));
    await db.delete(medicalInfo).where(eq(medicalInfo.childId, org.childId));
    await db.delete(tuitionPlans).where(eq(tuitionPlans.id, org.tuitionPlanId));
    await db.delete(refunds).where(eq(refunds.id, org.refundId));
    await db.delete(transactions).where(eq(transactions.id, org.transactionId));
    await db.delete(payments).where(eq(payments.id, org.paymentId));
    await db.delete(invoices).where(eq(invoices.id, org.invoiceId));
    await db.delete(staffAttendance).where(eq(staffAttendance.id, org.staffAttendanceId));
    await db.delete(children).where(eq(children.id, org.childId));
    await db.delete(classes).where(eq(classes.id, org.classId));
    await db.delete(staffProfiles).where(eq(staffProfiles.id, org.staffProfileId));
    await db.delete(organizationMembers).where(eq(organizationMembers.organizationId, org.organizationId));
    await db.delete(users).where(eq(users.id, org.adminId));
    await db.delete(users).where(eq(users.id, org.teacherId));
    await db.delete(users).where(eq(users.id, org.parentId));
    await db.delete(organizationSubscriptions).where(eq(organizationSubscriptions.organizationId, org.organizationId));
    await db.delete(organizationBranding).where(eq(organizationBranding.organizationId, org.organizationId));
    await db.delete(organizations).where(eq(organizations.id, org.organizationId));
  }
}

// Builds a TrpcContext for appRouter.createCaller(). Sets BOTH ctx.user and
// the top-level ctx.organizationId -- tenantProcedure reads ctx.organizationId
// directly (see server/_core/trpc.ts), not ctx.user.organizationId, so a
// fixture that omits it makes every tenantProcedure-gated call fail with
// FORBIDDEN regardless of the isolation bug under test. See
// MULTI_TENANT_TEST_PLAN.md section 2.2.
export function buildCtx(
  role: "super_admin" | "admin" | "teacher" | "parent" | "owner" | "principal",
  userId: number,
  organizationId: number | null,
): TrpcContext {
  const user = {
    id: userId,
    openId: `ctx-${userId}`,
    name: `Ctx ${role} ${userId}`,
    email: `ctx-${userId}@test.local`,
    loginMethod: "manus",
    role,
    phone: null,
    avatar: null,
    nationalId: null,
    password: null,
    language: "ar",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    passwordChangedAt: null,
    organizationId,
    deletionRequestedAt: null,
    deletionScheduledAt: null,
  } as unknown as User;

  return {
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
    user,
    organizationId,
  };
}
