import type { DietaryPreference, MealType } from '@longeviq/shared';
import { MEAL_CATALOG, type MealTemplate } from './meal-catalog.js';

export interface GeneratedMeal {
  mealType: MealType;
  name: string;
  description: string;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  sortOrder: number;
}

export interface BuildMealPlanInput {
  age: number;
  weightKg: number;
  heightCm: number;
  goal: 'LOSE_WEIGHT' | 'MAINTAIN_WEIGHT' | 'GAIN_MUSCLE';
  targetCalories: number;
  dietaryPreferences: DietaryPreference[];
}

// Calorie share per meal slot across the day. Sums to 1.0.
export const MEAL_CALORIE_SHARE: Record<MealType, number> = {
  BREAKFAST: 0.25,
  LUNCH: 0.35,
  DINNER: 0.3,
  SNACK: 0.1,
};

export const MEAL_SLOT_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

const GOAL_RANK: Record<BuildMealPlanInput['goal'], number> = {
  LOSE_WEIGHT: 0,
  MAINTAIN_WEIGHT: 1,
  GAIN_MUSCLE: 2,
};

/**
 * A template satisfies the user when every non-STANDARD preference is present
 * in its `satisfies` list. Users with no active preferences may eat anything.
 */
export function isTemplateCompatible(
  template: MealTemplate,
  preferences: DietaryPreference[],
): boolean {
  const active = preferences.filter((preference) => preference !== 'STANDARD');
  if (active.length === 0) {
    return true;
  }
  return active.every((preference) => template.satisfies.includes(preference));
}

function scaleMeal(
  template: MealTemplate,
  targetCalories: number,
): Omit<GeneratedMeal, 'sortOrder'> {
  const factor = targetCalories / template.calories;
  return {
    mealType: template.mealType,
    name: template.name,
    description: template.description,
    calories: Math.round(targetCalories),
    proteinGrams: Math.round(template.proteinGrams * factor),
    fatGrams: Math.round(template.fatGrams * factor),
    carbsGrams: Math.round(template.carbsGrams * factor),
  };
}

/**
 * Composes a single day's meals from the curated catalog. Templates are
 * filtered to the user's dietary preferences and picked deterministically so a
 * given profile always yields the same plan (and different profiles vary).
 */
export function buildDailyMealPlan(input: BuildMealPlanInput): GeneratedMeal[] {
  const meals: GeneratedMeal[] = [];
  // A stable per-profile offset rotates the selection across compatible meals.
  const seed =
    Math.round(input.weightKg * 10) + input.heightCm + input.age + GOAL_RANK[input.goal] * 7;

  MEAL_SLOT_ORDER.forEach((mealType, slotIndex) => {
    const compatible = MEAL_CATALOG.filter((template) =>
      isTemplateCompatible(template, input.dietaryPreferences),
    ).filter((template) => template.mealType === mealType);

    const template =
      compatible.length > 0
        ? compatible[(seed + slotIndex) % compatible.length]!
        : MEAL_CATALOG.find((candidate) => candidate.mealType === mealType)!;

    const targetCalories = Math.round(input.targetCalories * MEAL_CALORIE_SHARE[mealType]);
    meals.push({ ...scaleMeal(template, targetCalories), sortOrder: slotIndex });
  });

  return meals;
}
