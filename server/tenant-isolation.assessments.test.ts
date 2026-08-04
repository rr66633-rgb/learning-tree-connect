import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import {
  setupTenantFixture,
  teardownTenantFixture,
  buildCtx,
  type TenantFixture,
} from "./testUtils/tenantFixture";

/**
 * Tenant isolation regression suite -- assessmentRouter.ts,
 * customAssessmentRouter.ts, evaluationRouter.ts.
 * See MULTI_TENANT_TEST_PLAN.md section 3.4.
 */

let fixture: TenantFixture;

beforeAll(async () => {
  fixture = await setupTenantFixture();
}, 60000);

afterAll(async () => {
  if (fixture) await teardownTenantFixture(fixture);
}, 60000);

function callerAsOrgAStaff() {
  return appRouter.createCaller(buildCtx("admin", fixture.orgA.adminId, fixture.orgA.organizationId));
}
function callerAsOrgATeacher() {
  return appRouter.createCaller(buildCtx("teacher", fixture.orgA.teacherId, fixture.orgA.organizationId));
}
function callerAsOrgAParent() {
  return appRouter.createCaller(buildCtx("parent", fixture.orgA.parentId, fixture.orgA.organizationId));
}

async function expectRejected(promise: Promise<any>) {
  await expect(promise).rejects.toMatchObject({
    code: expect.stringMatching(/NOT_FOUND|FORBIDDEN|UNAUTHORIZED/),
  });
}

describe("Tenant isolation: assessmentRouter (EYFS developmental assessments)", () => {
  it("P1: Org A staff cannot list assessments for Org B's child", async () => {
    const results = await callerAsOrgAStaff().assessment.getByChild({ childId: fixture.orgB.childId });
    expect(Array.isArray(results) ? results.length : 0).toBe(0);
  });

  it("P1: Org A staff cannot fetch assessment details for a non-existent/foreign id", async () => {
    await expectRejected(callerAsOrgAStaff().assessment.getDetails({ id: 999999999 }));
  });

  it("P4: Org A staff cannot delete a non-existent/foreign assessment id", async () => {
    await expectRejected(callerAsOrgAStaff().assessment.delete({ id: 999999999 }));
  });
});

describe("Tenant isolation: customAssessmentRouter (regression: classId + parentList, fix-sweep-25)", () => {
  it("P3: Org A staff cannot create an assessment tagged with Org B's classId", async () => {
    await expectRejected(
      callerAsOrgATeacher().customAssessment.create({
        title: "Cross-tenant assessment",
        classId: fixture.orgB.classId,
      })
    );
  });

  it("P3: Org A staff cannot retarget an existing assessment's classId to Org B's class", async () => {
    await expectRejected(
      callerAsOrgATeacher().customAssessment.update({
        id: fixture.orgA.customAssessmentId,
        classId: fixture.orgB.classId,
      } as any)
    );
  });

  it("P1: Org A staff cannot read Org B's custom assessment by id", async () => {
    await expectRejected(callerAsOrgATeacher().customAssessment.get({ id: fixture.orgB.customAssessmentId }));
  });

  it("P4: Org A staff cannot update/delete Org B's custom assessment", async () => {
    await expectRejected(
      callerAsOrgATeacher().customAssessment.update({ id: fixture.orgB.customAssessmentId, title: "x" } as any)
    );
    await expectRejected(callerAsOrgATeacher().customAssessment.delete({ id: fixture.orgB.customAssessmentId }));
  });

  it("P2: Org A parent's parentList never surfaces Org B's assessment (defense-in-depth org filter)", async () => {
    const list = await callerAsOrgAParent().customAssessment.parentList();
    expect(list.some((a: any) => a.id === fixture.orgB.customAssessmentId)).toBe(false);
  });

  it("P4: Org A staff cannot add/update/delete questions on Org B's assessment", async () => {
    await expectRejected(
      callerAsOrgATeacher().customAssessment.addQuestion({
        assessmentId: fixture.orgB.customAssessmentId,
        questionText: "hijack?",
        questionType: "text",
      } as any)
    );
    await expectRejected(
      callerAsOrgATeacher().customAssessment.updateQuestion({
        id: fixture.orgB.assessmentQuestionId,
        questionText: "x",
      } as any)
    );
    await expectRejected(
      callerAsOrgATeacher().customAssessment.deleteQuestion({ id: fixture.orgB.assessmentQuestionId })
    );
  });

  it("P1: Org A staff cannot read Org B's assessment responses", async () => {
    await expectRejected(
      callerAsOrgATeacher().customAssessment.getResponses({ assessmentId: fixture.orgB.customAssessmentId } as any)
    );
  });
});

describe("Tenant isolation: evaluationRouter", () => {
  it("P4: Org A admin cannot edit/delete Org B's evaluation criterion", async () => {
    await expectRejected(
      callerAsOrgAStaff().evaluation.upsertCriterion({
        id: fixture.orgB.evaluationCriterionId,
        name: "hijacked",
        maxScore: 5,
      })
    );
    await expectRejected(callerAsOrgAStaff().evaluation.deleteCriterion({ id: fixture.orgB.evaluationCriterionId }));
  });

  it("P1: Org A admin cannot read Org B's evaluation by id", async () => {
    await expectRejected(callerAsOrgAStaff().evaluation.getEvaluation({ id: fixture.orgB.evaluationId }));
  });

  it("P3: Org A admin cannot create an evaluation targeting Org B's user", async () => {
    await expectRejected(
      callerAsOrgAStaff().evaluation.createEvaluation({
        userId: fixture.orgB.teacherId,
        period: "2026-Q1",
        scores: [],
      })
    );
  });

  it("P4: Org A admin cannot update/submit/acknowledge Org B's evaluation", async () => {
    await expectRejected(
      callerAsOrgAStaff().evaluation.updateEvaluation({ id: fixture.orgB.evaluationId, notes: "x" })
    );
    await expectRejected(callerAsOrgAStaff().evaluation.submitEvaluation({ id: fixture.orgB.evaluationId }));
    await expectRejected(callerAsOrgAStaff().evaluation.acknowledgeEvaluation({ id: fixture.orgB.evaluationId }));
  });

  it("P2: Org A admin's listEvaluations never includes Org B's evaluation", async () => {
    const list = await callerAsOrgAStaff().evaluation.listEvaluations({});
    expect(list.some((e: any) => e.id === fixture.orgB.evaluationId)).toBe(false);
  });

  it("P2: Org A admin's listCriteria never includes Org B's criterion", async () => {
    const list = await callerAsOrgAStaff().evaluation.listCriteria();
    expect(list.some((c: any) => c.id === fixture.orgB.evaluationCriterionId)).toBe(false);
  });
});
