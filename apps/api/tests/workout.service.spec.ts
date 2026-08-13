import { describe, expect, it } from 'vitest';
import { WorkoutService } from '../src/modules/workout/workout.service.js';
import { FakeWorkoutRepository } from './fakes.js';

const USER = 'usr_user';
const OTHER = 'usr_other';

const INPUT = {
  age: 32,
  sex: 'FEMALE' as const,
  weightKg: 65,
  heightCm: 168,
  goal: 'GENERAL_FITNESS' as const,
  fitnessLevel: 'BEGINNER' as const,
  equipment: 'NONE' as const,
  daysPerWeek: 3,
  sessionDurationMinutes: 30,
};

function makeService() {
  const repository = new FakeWorkoutRepository();
  const service = new WorkoutService(
    repository as unknown as ConstructorParameters<typeof WorkoutService>[0],
    repository as unknown as ConstructorParameters<typeof WorkoutService>[1],
  );
  return { repository, service };
}

describe('WorkoutService.createPlan', () => {
  it('computes targets from the profile and persists the week', async () => {
    const { repository, service } = makeService();
    const plan = await service.createPlan(USER, INPUT);

    expect(plan.daysPerWeek).toBe(3);
    expect(plan.days).toHaveLength(3);
    expect(plan.days.map((day) => day.dayNumber)).toEqual([1, 2, 3]);
    expect(plan.weeklyMinutes).toBe(90);
    expect(plan.strengthSessions + plan.cardioSessions).toBe(3);
    expect(plan.days.every((day) => day.exercises.length > 0)).toBe(true);

    const stored = repository.plans.get(plan.id)!;
    expect(stored.days).toHaveLength(3);
    expect(repository.auditCalls.some((call) => call.action === 'DATA.WORKOUT_PLAN_CREATE')).toBe(
      true,
    );
  });

  it('includes cardio sessions for weight-loss goals', async () => {
    const { service } = makeService();
    const plan = await service.createPlan(USER, { ...INPUT, goal: 'LOSE_WEIGHT' });
    expect(plan.cardioSessions).toBeGreaterThan(0);
    expect(plan.days.some((day) => day.focus === 'CARDIO')).toBe(true);
  });

  it('rotates strength splits for advanced users', async () => {
    const { service } = makeService();
    const plan = await service.createPlan(USER, {
      ...INPUT,
      fitnessLevel: 'ADVANCED',
      daysPerWeek: 5,
    });
    const strengthDays = plan.days.filter((day) => day.focus !== 'CARDIO');
    const focuses = new Set(strengthDays.map((day) => day.focus));
    expect(focuses.size).toBeGreaterThan(1);
  });

  it('audits plan creation with summary metadata only', async () => {
    const { repository, service } = makeService();
    await service.createPlan(USER, INPUT);
    const call = repository.auditCalls.find(
      (entry) => entry.action === 'DATA.WORKOUT_PLAN_CREATE',
    )!;
    expect(call.userId).toBe(USER);
    expect(call.entityId).toBeTruthy();
    expect((call as { metadata?: unknown }).metadata).toBeDefined();
  });
});

describe('WorkoutService.listPlans', () => {
  it('paginates plans with day counts', async () => {
    const { repository, service } = makeService();
    await service.createPlan(USER, INPUT);
    await service.createPlan(USER, { ...INPUT, daysPerWeek: 4 });

    const result = await service.listPlans(USER, { page: 1, limit: 10 });
    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.items[0]!.dayCount).toBe(4);
    expect(result.items[0]!.days).toBeUndefined();
    expect(repository.auditCalls.some((call) => call.action === 'DATA.WORKOUT_PLAN_CREATE')).toBe(
      true,
    );
  });

  it('never leaks other users plans', async () => {
    const { service } = makeService();
    await service.createPlan(USER, INPUT);
    const result = await service.listPlans(OTHER, { page: 1, limit: 10 });
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

describe('WorkoutService.getPlan', () => {
  it('returns the plan detail with days and exercises', async () => {
    const { service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    const plan = await service.getPlan(USER, created.id);
    expect(plan.id).toBe(created.id);
    expect(plan.days).toHaveLength(3);
    expect(plan.days[0]!.exercises.length).toBeGreaterThan(0);
  });

  it('returns 404 for another users plan', async () => {
    const { service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    await expect(service.getPlan(OTHER, created.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 404 for a missing plan', async () => {
    const { service } = makeService();
    await expect(service.getPlan(USER, 'nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('WorkoutService.deletePlan', () => {
  it('deletes an owned plan and audits the event', async () => {
    const { repository, service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    await service.deletePlan(USER, created.id);
    expect(repository.plans.has(created.id)).toBe(false);
    expect(repository.auditCalls.some((call) => call.action === 'DATA.WORKOUT_PLAN_DELETE')).toBe(
      true,
    );
  });

  it('refuses to delete another users plan', async () => {
    const { repository, service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    await expect(service.deletePlan(OTHER, created.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repository.plans.has(created.id)).toBe(true);
  });
});

describe('WorkoutService serialization', () => {
  it('serializes ISO timestamps in list items', async () => {
    const { service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    const result = await service.listPlans(USER, { page: 1, limit: 10 });
    expect(result.items[0]!.createdAt).toBe(created.createdAt);
    expect(new Date(result.items[0]!.createdAt).getTime()).not.toBeNaN();
  });
});
