import {
  ACTIVITY_LEVEL_LABELS,
  BIOLOGICAL_SEX_LABELS,
  DIETARY_PREFERENCE_LABELS,
  MEAL_TYPE_LABELS,
  NUTRITION_GOAL_LABELS,
  type ActivityLevel,
  type BiologicalSex,
  type DietaryPreference,
  type MealType,
  type NutritionGoal,
} from '@longeviq/shared';

export function nutritionGoalLabel(goal: NutritionGoal): string {
  return NUTRITION_GOAL_LABELS[goal];
}

export function activityLevelLabel(level: ActivityLevel): string {
  return ACTIVITY_LEVEL_LABELS[level];
}

export function biologicalSexLabel(sex: BiologicalSex): string {
  return BIOLOGICAL_SEX_LABELS[sex];
}

export function mealTypeLabel(mealType: MealType): string {
  return MEAL_TYPE_LABELS[mealType];
}

export function dietaryPreferenceLabel(preference: DietaryPreference): string {
  return DIETARY_PREFERENCE_LABELS[preference];
}

export function formatCalories(calories: number): string {
  return `${Math.round(calories)} kcal`;
}

export function formatGrams(grams: number): string {
  return `${Math.round(grams)} g`;
}

export function formatWaterLitres(litres: number): string {
  return `${litres.toFixed(1)} L`;
}

export function formatPlanDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}
