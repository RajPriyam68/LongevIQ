import type {
  CreateNutritionPlanInput,
  NutritionPlanDetail,
  NutritionPlanListResult,
  NutritionPlanListItem,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { AuditSink } from '../metrics/metrics.repository.types.js';
import { computeNutritionTargets } from './planner/targets.js';
import { buildDailyMealPlan } from './planner/meal-planner.js';
import type {
  NutritionPlanListItem as NutritionPlanListItemRecord,
  NutritionPlanWithMeals,
  NutritionRepository,
} from './nutrition.repository.types.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class NutritionService {
  constructor(
    private readonly repository: NutritionRepository,
    private readonly audit?: AuditSink,
  ) {}

  async createPlan(
    userId: string,
    input: CreateNutritionPlanInput,
    ctx: RequestContext = {},
  ): Promise<NutritionPlanDetail> {
    const targets = computeNutritionTargets({
      age: input.age,
      sex: input.sex,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      goal: input.goal,
      activityLevel: input.activityLevel,
    });
    const meals = buildDailyMealPlan({
      age: input.age,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      goal: input.goal,
      targetCalories: targets.targetCalories,
      dietaryPreferences: input.dietaryPreferences,
    });

    const plan = await this.repository.createPlan({
      userId,
      goal: input.goal,
      activityLevel: input.activityLevel,
      age: input.age,
      sex: input.sex,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      dietaryPreferences: input.dietaryPreferences,
      ...targets,
      meals,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.NUTRITION_PLAN_CREATE',
      entity: 'NutritionPlan',
      entityId: plan.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        goal: plan.goal,
        targetCalories: plan.targetCalories,
        mealCount: plan.meals.length,
      },
    });

    return serializePlanDetail(plan);
  }

  async listPlans(
    userId: string,
    query: { page: number; limit: number },
  ): Promise<NutritionPlanListResult> {
    const { items, total } = await this.repository.listPlansByUser(userId, query);
    return {
      items: items.map(serializePlanListItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPlan(userId: string, planId: string): Promise<NutritionPlanDetail> {
    const plan = await this.requireOwnedPlan(userId, planId);
    return serializePlanDetail(plan);
  }

  async deletePlan(userId: string, planId: string, ctx: RequestContext = {}): Promise<void> {
    const plan = await this.requireOwnedPlan(userId, planId);
    await this.repository.deletePlan(plan.id);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.NUTRITION_PLAN_DELETE',
      entity: 'NutritionPlan',
      entityId: plan.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  private async requireOwnedPlan(userId: string, planId: string): Promise<NutritionPlanWithMeals> {
    const plan = await this.repository.findPlanById(planId);
    if (!plan || plan.userId !== userId) {
      throw AppError.notFound('Nutrition plan not found.');
    }
    return plan;
  }
}

function serializePlanListItem(plan: NutritionPlanListItemRecord): NutritionPlanListItem {
  return {
    ...serializePlanBase(plan),
    mealCount: plan.mealCount,
  };
}

function serializePlanBase(
  plan: Pick<
    NutritionPlanWithMeals,
    | 'id'
    | 'goal'
    | 'activityLevel'
    | 'age'
    | 'sex'
    | 'weightKg'
    | 'heightCm'
    | 'dietaryPreferences'
    | 'bmrCalories'
    | 'tdeeCalories'
    | 'targetCalories'
    | 'proteinGrams'
    | 'fatGrams'
    | 'carbsGrams'
    | 'waterLitres'
    | 'createdAt'
    | 'updatedAt'
  >,
) {
  return {
    id: plan.id,
    goal: plan.goal,
    activityLevel: plan.activityLevel,
    age: plan.age,
    sex: plan.sex,
    weightKg: plan.weightKg,
    heightCm: plan.heightCm,
    dietaryPreferences: plan.dietaryPreferences,
    bmrCalories: plan.bmrCalories,
    tdeeCalories: plan.tdeeCalories,
    targetCalories: plan.targetCalories,
    proteinGrams: plan.proteinGrams,
    fatGrams: plan.fatGrams,
    carbsGrams: plan.carbsGrams,
    waterLitres: plan.waterLitres,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function serializePlanDetail(plan: NutritionPlanWithMeals): NutritionPlanDetail {
  return {
    ...serializePlanBase(plan),
    meals: plan.meals.map((meal) => ({
      id: meal.id,
      mealType: meal.mealType,
      name: meal.name,
      description: meal.description,
      calories: meal.calories,
      proteinGrams: meal.proteinGrams,
      fatGrams: meal.fatGrams,
      carbsGrams: meal.carbsGrams,
      sortOrder: meal.sortOrder,
    })),
  };
}
