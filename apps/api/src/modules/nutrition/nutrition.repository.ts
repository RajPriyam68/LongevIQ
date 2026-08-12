import type {
  NutritionMeal as NutritionMealModel,
  NutritionPlan as NutritionPlanModel,
} from '@prisma/client';
import type { DietaryPreference } from '@longeviq/shared';
import { prisma } from '../../db/prisma.js';
import type {
  CreateNutritionPlanInput,
  NutritionPlanListItem,
  NutritionPlanRecord,
  NutritionPlanWithMeals,
  NutritionRepository,
} from './nutrition.repository.types.js';

export class PrismaNutritionRepository implements NutritionRepository {
  async createPlan(input: CreateNutritionPlanInput): Promise<NutritionPlanWithMeals> {
    const plan = await prisma.nutritionPlan.create({
      data: {
        userId: input.userId,
        goal: input.goal,
        activityLevel: input.activityLevel,
        age: input.age,
        sex: input.sex,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        dietaryPreferences: input.dietaryPreferences,
        bmrCalories: input.bmrCalories,
        tdeeCalories: input.tdeeCalories,
        targetCalories: input.targetCalories,
        proteinGrams: input.proteinGrams,
        fatGrams: input.fatGrams,
        carbsGrams: input.carbsGrams,
        waterLitres: input.waterLitres,
        meals: { create: input.meals },
      },
      include: { meals: { orderBy: { sortOrder: 'asc' } } },
    });
    return toPlanWithMeals(plan);
  }

  async findPlanById(id: string): Promise<NutritionPlanWithMeals | null> {
    const plan = await prisma.nutritionPlan.findUnique({
      where: { id },
      include: { meals: { orderBy: { sortOrder: 'asc' } } },
    });
    return plan ? toPlanWithMeals(plan) : null;
  }

  async listPlansByUser(
    userId: string,
    filter: { page: number; limit: number },
  ): Promise<{ items: NutritionPlanListItem[]; total: number }> {
    const [rows, total] = await prisma.$transaction([
      prisma.nutritionPlan.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: { _count: { select: { meals: true } } },
      }),
      prisma.nutritionPlan.count({ where: { userId } }),
    ]);

    const items: NutritionPlanListItem[] = rows.map((row) => ({
      ...toPlanRecord(row),
      mealCount: row._count.meals,
    }));
    return { items, total };
  }

  async deletePlan(id: string): Promise<void> {
    await prisma.nutritionPlan.delete({ where: { id } });
  }
}

function toPlanRecord(plan: NutritionPlanModel): NutritionPlanRecord {
  return {
    id: plan.id,
    userId: plan.userId,
    goal: plan.goal,
    activityLevel: plan.activityLevel,
    age: plan.age,
    sex: plan.sex,
    weightKg: plan.weightKg,
    heightCm: plan.heightCm,
    dietaryPreferences: plan.dietaryPreferences as DietaryPreference[],
    bmrCalories: plan.bmrCalories,
    tdeeCalories: plan.tdeeCalories,
    targetCalories: plan.targetCalories,
    proteinGrams: plan.proteinGrams,
    fatGrams: plan.fatGrams,
    carbsGrams: plan.carbsGrams,
    waterLitres: plan.waterLitres,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function toPlanWithMeals(
  plan: NutritionPlanModel & { meals: NutritionMealModel[] },
): NutritionPlanWithMeals {
  return {
    ...toPlanRecord(plan),
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
