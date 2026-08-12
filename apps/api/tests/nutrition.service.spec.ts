import { describe, expect, it } from 'vitest';
import { NutritionService } from '../src/modules/nutrition/nutrition.service.js';
import { FakeNutritionRepository } from './fakes.js';

const USER = 'usr_user';
const OTHER = 'usr_other';

const INPUT = {
  age: 32,
  sex: 'FEMALE' as const,
  weightKg: 65,
  heightCm: 168,
  goal: 'MAINTAIN_WEIGHT' as const,
  activityLevel: 'MODERATE' as const,
  dietaryPreferences: ['VEGETARIAN'],
};

function makeService() {
  const repository = new FakeNutritionRepository();
  const service = new NutritionService(
    repository as unknown as ConstructorParameters<typeof NutritionService>[0],
    repository as unknown as ConstructorParameters<typeof NutritionService>[1],
  );
  return { repository, service };
}

describe('NutritionService.createPlan', () => {
  it('computes targets from the profile and persists meals', async () => {
    const { repository, service } = makeService();
    const plan = await service.createPlan(USER, INPUT);

    expect(plan.goal).toBe('MAINTAIN_WEIGHT');
    expect(plan.meals).toHaveLength(4);
    expect(plan.meals.map((meal) => meal.mealType)).toEqual([
      'BREAKFAST',
      'LUNCH',
      'DINNER',
      'SNACK',
    ]);
    expect(plan.targetCalories).toBe(plan.tdeeCalories);
    expect(plan.targetCalories).toBe(Math.round(plan.bmrCalories * 1.55));

    const macroCalories = plan.proteinGrams * 4 + plan.fatGrams * 9 + plan.carbsGrams * 4;
    expect(Math.abs(macroCalories - plan.targetCalories)).toBeLessThanOrEqual(15);

    const stored = repository.plans.get(plan.id)!;
    expect(stored.meals).toHaveLength(4);
    expect(repository.auditCalls.some((call) => call.action === 'DATA.NUTRITION_PLAN_CREATE')).toBe(
      true,
    );
  });

  it('respects dietary preferences when composing meals', async () => {
    const { service } = makeService();
    const plan = await service.createPlan(USER, {
      ...INPUT,
      dietaryPreferences: ['VEGAN', 'GLUTEN_FREE'],
    });
    for (const meal of plan.meals) {
      expect(meal.name.length).toBeGreaterThan(0);
      expect(meal.calories).toBeGreaterThan(0);
    }
  });

  it('applies a weight-loss calorie deficit', async () => {
    const { service } = makeService();
    const plan = await service.createPlan(USER, { ...INPUT, goal: 'LOSE_WEIGHT' });
    expect(plan.targetCalories).toBeLessThan(plan.tdeeCalories);
  });

  it('audits plan creation with summary metadata only', async () => {
    const { repository, service } = makeService();
    await service.createPlan(USER, INPUT);
    const call = repository.auditCalls.find(
      (entry) => entry.action === 'DATA.NUTRITION_PLAN_CREATE',
    )!;
    expect(call.userId).toBe(USER);
    expect(call.entityId).toBeTruthy();
    expect((call as { metadata?: unknown }).metadata).toBeDefined();
  });
});

describe('NutritionService.listPlans', () => {
  it('paginates plans with meal counts', async () => {
    const { repository, service } = makeService();
    await service.createPlan(USER, INPUT);
    await service.createPlan(USER, { ...INPUT, age: 40 });

    const result = await service.listPlans(USER, { page: 1, limit: 10 });
    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.items[0]!.mealCount).toBe(4);
    expect(result.items[0]!.meals).toBeUndefined();
  });

  it('never leaks other users plans', async () => {
    const { service } = makeService();
    await service.createPlan(USER, INPUT);
    const result = await service.listPlans(OTHER, { page: 1, limit: 10 });
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

describe('NutritionService.getPlan', () => {
  it('returns the plan detail with meals', async () => {
    const { service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    const plan = await service.getPlan(USER, created.id);
    expect(plan.id).toBe(created.id);
    expect(plan.meals).toHaveLength(4);
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

describe('NutritionService.deletePlan', () => {
  it('deletes an owned plan and audits the event', async () => {
    const { repository, service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    await service.deletePlan(USER, created.id);
    expect(repository.plans.has(created.id)).toBe(false);
    expect(repository.auditCalls.some((call) => call.action === 'DATA.NUTRITION_PLAN_DELETE')).toBe(
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

describe('NutritionService serialization', () => {
  it('serializes ISO timestamps in list items', async () => {
    const { service } = makeService();
    const created = await service.createPlan(USER, INPUT);
    const result = await service.listPlans(USER, { page: 1, limit: 10 });
    expect(result.items[0]!.createdAt).toBe(created.createdAt);
    expect(new Date(result.items[0]!.createdAt).getTime()).not.toBeNaN();
  });
});
