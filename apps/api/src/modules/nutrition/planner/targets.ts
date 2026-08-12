import type { ActivityLevel, BiologicalSex, NutritionGoal } from '@longeviq/shared';

export interface NutritionProfile {
  age: number;
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
}

export interface NutritionTargets {
  bmrCalories: number;
  tdeeCalories: number;
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  waterLitres: number;
}

// The floor for calorie-reduction plans. Going lower would be unhealthy and
// would fail to meet minimum macro requirements.
export const MIN_CALORIE_FLOOR = 1200;

// Mifflin-St Jeor equation. Returns the basal metabolic rate (kcal/day).
export function computeBmr(profile: NutritionProfile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === 'MALE' ? base + 5 : base - 161;
}

// Total daily energy expenditure from activity factors (WHO-style bands).
export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  const factors: Record<ActivityLevel, number> = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9,
  };
  return Math.round(bmr * factors[activityLevel]);
}

// Calorie adjustment per goal, clamped to a healthy floor for weight loss.
export function computeTargetCalories(tdee: number, goal: NutritionGoal): number {
  const adjustments: Record<NutritionGoal, number> = {
    LOSE_WEIGHT: -500,
    MAINTAIN_WEIGHT: 0,
    GAIN_MUSCLE: 300,
  };
  return Math.max(MIN_CALORIE_FLOOR, tdee + adjustments[goal]);
}

// Protein target in grams per kilogram of body weight, per goal.
export function computeProteinTarget(weightKg: number, goal: NutritionGoal): number {
  const gramsPerKg: Record<NutritionGoal, number> = {
    LOSE_WEIGHT: 1.8,
    MAINTAIN_WEIGHT: 1.2,
    GAIN_MUSCLE: 2.0,
  };
  return Math.round(weightKg * gramsPerKg[goal]);
}

// Remaining macro split: 25% of calories from fat (9 kcal/g), the rest from
// carbohydrates (4 kcal/g). Protein calories are fixed by the protein target.
export function computeMacroTargets(
  targetCalories: number,
  proteinGrams: number,
): { fatGrams: number; carbsGrams: number } {
  const proteinCalories = proteinGrams * 4;
  const fatGrams = Math.round((targetCalories * 0.25) / 9);
  const fatCalories = fatGrams * 9;
  const carbsGrams = Math.max(0, Math.round((targetCalories - proteinCalories - fatCalories) / 4));
  return { fatGrams, carbsGrams };
}

// Hydration recommendation of 35 ml per kg of body weight, in litres.
export function computeWaterLitres(weightKg: number): number {
  return Math.max(1.5, Math.round(weightKg * 0.035 * 10) / 10);
}

export function computeNutritionTargets(profile: NutritionProfile): NutritionTargets {
  const bmr = Math.round(computeBmr(profile));
  const tdee = computeTdee(bmr, profile.activityLevel);
  const targetCalories = computeTargetCalories(tdee, profile.goal);
  const proteinGrams = computeProteinTarget(profile.weightKg, profile.goal);
  const { fatGrams, carbsGrams } = computeMacroTargets(targetCalories, proteinGrams);
  return {
    bmrCalories: bmr,
    tdeeCalories: tdee,
    targetCalories,
    proteinGrams,
    fatGrams,
    carbsGrams,
    waterLitres: computeWaterLitres(profile.weightKg),
  };
}
