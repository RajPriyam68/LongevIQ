import { z } from 'zod';
import {
  ACTIVITY_LEVEL_VALUES,
  BIOLOGICAL_SEX_VALUES,
  DIETARY_PREFERENCE_VALUES,
  NUTRITION_GOAL_VALUES,
} from '../types/nutrition.js';

export const nutritionGoalSchema = z.enum(NUTRITION_GOAL_VALUES);
export const activityLevelSchema = z.enum(ACTIVITY_LEVEL_VALUES);
export const dietaryPreferenceSchema = z.enum(DIETARY_PREFERENCE_VALUES);
export const biologicalSexSchema = z.enum(BIOLOGICAL_SEX_VALUES);

// Input bounds for the plan generator. The planner never returns an unhealthy
// calorie floor: LOSE_WEIGHT targets are clamped at 1200 kcal.
export const NUTRITION_MIN_AGE = 18;
export const NUTRITION_MAX_AGE = 100;
export const NUTRITION_MAX_WEIGHT_KG = 300;
export const NUTRITION_MIN_HEIGHT_CM = 100;
export const NUTRITION_MAX_HEIGHT_CM = 250;
export const NUTRITION_MAX_DIETARY_PREFERENCES = 5;

export const createNutritionPlanSchema = z
  .object({
    age: z
      .number()
      .int('Age must be a whole number.')
      .min(NUTRITION_MIN_AGE, `Age must be at least ${NUTRITION_MIN_AGE}.`)
      .max(NUTRITION_MAX_AGE, `Age must be at most ${NUTRITION_MAX_AGE}.`),
    sex: biologicalSexSchema,
    weightKg: z
      .number()
      .positive('Weight must be positive.')
      .max(NUTRITION_MAX_WEIGHT_KG, `Weight must be at most ${NUTRITION_MAX_WEIGHT_KG} kg.`),
    heightCm: z
      .number()
      .int('Height must be a whole number.')
      .min(NUTRITION_MIN_HEIGHT_CM, `Height must be at least ${NUTRITION_MIN_HEIGHT_CM} cm.`)
      .max(NUTRITION_MAX_HEIGHT_CM, `Height must be at most ${NUTRITION_MAX_HEIGHT_CM} cm.`),
    goal: nutritionGoalSchema,
    activityLevel: activityLevelSchema,
    dietaryPreferences: z
      .array(dietaryPreferenceSchema)
      .max(
        NUTRITION_MAX_DIETARY_PREFERENCES,
        `Choose at most ${NUTRITION_MAX_DIETARY_PREFERENCES} dietary preferences.`,
      )
      .default([]),
  })
  .strict();

export const listNutritionPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateNutritionPlanInput = z.infer<typeof createNutritionPlanSchema>;
export type ListNutritionPlansQuery = z.infer<typeof listNutritionPlansQuerySchema>;
