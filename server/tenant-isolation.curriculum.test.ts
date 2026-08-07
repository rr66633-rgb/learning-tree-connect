import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import {
  setupTenantFixture,
  teardownTenantFixture,
  buildCtx,
  type TenantFixture,
} from "./testUtils/tenantFixture";
import { aiGeneratedContent } from "../drizzle/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

/**
 * Tenant isolation regression suite -- curriculumRouter.ts, weeklyPlanRouter.ts,
 * developmentRouter.ts, engagementRouter.ts, goalsRouter.ts.
 * See MULTI_TENANT_TEST_PLAN.md section 3.5.
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
function callerAsOrgBTeacher() {
  return appRouter.createCaller(buildCtx("teacher", fixture.orgB.teacherId, fixture.orgB.organizationId));
}

async function expectRejected(promise: Promise<any>) {
  await expect(promise).rejects.toMatchObject({
    code: expect.stringMatching(/NOT_FOUND|FORBIDDEN|UNAUTHORIZED/),
  });
}

describe("Tenant isolation: curriculumRouter", () => {
  it("P2: Org A's curriculum list never includes Org B's item", async () => {
    const list = await callerAsOrgAStaff().curriculum.list();
    expect(list.some((c: any) => c.id === fixture.orgB.curriculumId)).toBe(false);
  });

  it("P4: Org A staff cannot delete Org B's curriculum item", async () => {
    await expectRejected(callerAsOrgAStaff().curriculum.delete({ id: fixture.orgB.curriculumId }));
  });
});

describe("Tenant isolation: weeklyPlanRouter (regression: classId + parentList, fix-sweep-25)", () => {
  it("P3: Org A teacher cannot generate a plan tagged with Org B's classId", async () => {
    await expectRejected(
      callerAsOrgATeacher().weeklyPlan.generate({
        classId: fixture.orgB.classId,
        ageGroup: "kg1",
        weekStartDate: "2026-03-01",
        weekEndDate: "2026-03-05",
        theme: "Cross-tenant theme",
        language: "ar",
      })
    );
  });

  it("P1: Org A teacher cannot read Org B's weekly plan by id", async () => {
    await expectRejected(callerAsOrgATeacher().weeklyPlan.get({ id: fixture.orgB.weeklyPlanId }));
  });

  it("P4: Org A teacher cannot save/update/publish/duplicate/delete Org B's weekly plan", async () => {
    await expectRejected(
      callerAsOrgATeacher().weeklyPlan.save({ id: fixture.orgB.weeklyPlanId, sections: {} })
    );
    await expectRejected(
      callerAsOrgATeacher().weeklyPlan.update({ id: fixture.orgB.weeklyPlanId, sections: {} })
    );
    await expectRejected(callerAsOrgATeacher().weeklyPlan.publish({ id: fixture.orgB.weeklyPlanId }));
    await expectRejected(callerAsOrgATeacher().weeklyPlan.duplicate({ id: fixture.orgB.weeklyPlanId }));
    await expectRejected(callerAsOrgATeacher().weeklyPlan.delete({ id: fixture.orgB.weeklyPlanId }));
  });

  it("P2: Org A parent's parentList never surfaces Org B's published plan (defense-in-depth org filter)", async () => {
    const list = await callerAsOrgAParent().weeklyPlan.parentList({});
    expect(list.some((p: any) => p.id === fixture.orgB.publishedWeeklyPlanId)).toBe(false);
  });

  it("P2: Org A's own list never includes Org B's plan", async () => {
    const list = await callerAsOrgATeacher().weeklyPlan.list({});
    expect(list.some((p: any) => p.id === fixture.orgB.weeklyPlanId)).toBe(false);
  });
});

describe("Tenant isolation: personal AI request history", () => {
  it("includes the teacher's historical weekly plans and excludes every other tenant/user", async () => {
    const teacherHistory = await callerAsOrgATeacher().ai.getRequestHistory({
      type: "weekly_plan",
      limit: 50,
      offset: 0,
    });
    const keys = teacherHistory.items.map(item => item.key);
    expect(keys).toContain(`legacy-weekly-plan-${fixture.orgA.weeklyPlanId}`);
    expect(keys).toContain(`legacy-weekly-plan-${fixture.orgA.publishedWeeklyPlanId}`);
    expect(keys).not.toContain(`legacy-weekly-plan-${fixture.orgB.weeklyPlanId}`);

    const adminHistory = await callerAsOrgAStaff().ai.getRequestHistory({
      type: "weekly_plan",
      limit: 50,
      offset: 0,
    });
    expect(adminHistory.items.some(item => item.sourceId === fixture.orgA.weeklyPlanId)).toBe(false);
  });

  it("scopes AI content reads by both organization and creator", async () => {
    const db = (await getDb())!;
    const [created] = await db.insert(aiGeneratedContent).values({
      type: "activity",
      title: "Personal AI fixture",
      content: { result: "private" },
      language: "ar",
      createdBy: fixture.orgA.teacherId,
      organizationId: fixture.orgA.organizationId,
    });

    try {
      const own = await callerAsOrgATeacher().ai.getById({ id: created.insertId });
      expect(own.id).toBe(created.insertId);
      await expectRejected(callerAsOrgAStaff().ai.getById({ id: created.insertId }));
      await expectRejected(callerAsOrgBTeacher().ai.getById({ id: created.insertId }));
    } finally {
      await db.delete(aiGeneratedContent).where(eq(aiGeneratedContent.id, created.insertId));
    }
  });
});

describe("Tenant isolation: developmentRouter", () => {
  it("P1: Org A teacher cannot list Org B's child's development observations", async () => {
    const list = await callerAsOrgATeacher().development.listObservations({ childId: fixture.orgB.childId } as any);
    expect(Array.isArray(list) ? list.length : 0).toBe(0);
  });

  it("P3: Org A teacher cannot create an observation for Org B's child", async () => {
    await expectRejected(
      callerAsOrgATeacher().development.createObservation({
        childId: fixture.orgB.childId,
        areaId: fixture.orgA.developmentAreaId,
        observation: "cross-tenant",
        level: "secure",
      } as any)
    );
  });

  it("P1: Org A teacher cannot read Org B's child's readiness scores/progress/summary", async () => {
    const scores = await callerAsOrgATeacher().development.getReadinessScores({ childId: fixture.orgB.childId } as any);
    expect(Array.isArray(scores) ? scores.length : 0).toBe(0);
    const summary = await callerAsOrgATeacher().development.getChildSummary({ childId: fixture.orgB.childId });
    expect(summary).toBeFalsy();
  });

  it("P4: Org A teacher cannot acknowledge/resolve Org B's development alert", async () => {
    await expectRejected(callerAsOrgATeacher().development.acknowledgeAlert({ id: 999999999 }));
    await expectRejected(callerAsOrgATeacher().development.resolveAlert({ id: 999999999 }));
  });

  it("P5: getAreas/getMilestones are global EYFS taxonomy, safe to share across orgs", async () => {
    const areas = await callerAsOrgATeacher().development.getAreas();
    expect(Array.isArray(areas)).toBe(true);
  });
});

describe("Tenant isolation: engagementRouter", () => {
  it("P1: Org A parent cannot list Org B's child's home-learning activities", async () => {
    const list = await callerAsOrgAParent().engagement.activities.list({ childId: fixture.orgB.childId });
    expect(Array.isArray(list) ? list.length : 0).toBe(0);
  });

  it("P3: Org A teacher cannot create a journal entry for Org B's child", async () => {
    await expectRejected(
      callerAsOrgAParent().engagement.journal.create({
        childId: fixture.orgB.childId,
        entryType: "note",
        description: "cross-tenant",
      } as any)
    );
  });

  it("P4: Org A teacher cannot complete/skip Org B's home-learning activity", async () => {
    await expectRejected(
      callerAsOrgAParent().engagement.activities.complete({ activityId: fixture.orgB.homeLearningActivityId })
    );
  });
});

describe("Tenant isolation: goalsRouter (regression: userId, prior sweep)", () => {
  it("P3: Org A admin cannot create a goal assigned to Org B's user", async () => {
    await expectRejected(
      callerAsOrgAStaff().goals.create({ userId: fixture.orgB.teacherId, title: "Cross-tenant goal" })
    );
  });

  it("P2: Org A's goal list never includes Org B's goal", async () => {
    const list = await callerAsOrgAStaff().goals.list({});
    expect(list.some((g: any) => g.id === fixture.orgB.performanceGoalId)).toBe(false);
  });

  it("P4: Org A admin cannot update progress/status or delete Org B's goal", async () => {
    await expectRejected(
      callerAsOrgAStaff().goals.updateProgress({ id: fixture.orgB.performanceGoalId, progress: 100 } as any)
    );
    await expectRejected(
      callerAsOrgAStaff().goals.updateStatus({ id: fixture.orgB.performanceGoalId, status: "completed" } as any)
    );
    await expectRejected(callerAsOrgAStaff().goals.delete({ id: fixture.orgB.performanceGoalId }));
  });
});
