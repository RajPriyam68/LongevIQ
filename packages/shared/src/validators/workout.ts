import { z } from 'zod';
import { biologicalSexSchema } from './nutrition.js';
import {
  FITNESS_LEVEL_VALUES,
  WORKOUT_EQUIPMENT_VALUES,
  WORKOUT_GOAL_VALUES,
} from '../types/workout.js';

export const workoutGoalSchema = z.enum(WORKOUT_GOAL_VALUES);
export const fitnessLevelSchema = z.enum(FITNESS_LEVEL_VALUES);
export const workoutEquipmentSchema = z.enum(WORKOUT_EQUIPMENT_VALUES);

// Input bounds for the plan generator. The planner keeps session lengths and
// weekly volume inside safe, educational ranges.
export const WORKOUT_MIN_AGE = 18;
export const WORKOUT_MAX_AGE = 100;
export const WORKOUT_MAX_WEIGHT_KG = 300;
export const WORKOUT_MIN_HEIGHT_CM = 100;
export const WORKOUT_MAX_HEIGHT_CM = 250;
export const WORKOUT_MIN_DAYS_PER_WEEK = 1;
export const WORKOUT_MAX_DAYS_PER_WEEK = 7;
export const WORKOUT_MIN_SESSION_MINUTES = 15;
export const WORKOUT_MAX_SESSION_MINUTES = 120;

export const createWorkoutPlanSchema = z
  .object({
    age: z
      .number()
      .int('Age must be a whole number.')
      .min(WORKOUT_MIN_AGE, `Age must be at least ${WORKOUT_MIN_AGE}.`)
      .max(WORKOUT_MAX_AGE, `Age must be at most ${WORKOUT_MAX_AGE}.`),
    sex: biologicalSexSchema,
    weightKg: z
      .number()
      .positive('Weight must be positive.')
      .max(WORKOUT_MAX_WEIGHT_KG, `Weight must be at most ${WORKOUT_MAX_WEIGHT_KG} kg.`),
    heightCm: z
      .number()
      .int('Height must be a whole number.')
      .min(WORKOUT_MIN_HEIGHT_CM, `Height must be at least ${WORKOUT_MIN_HEIGHT_CM} cm.`)
      .max(WORKOUT_MAX_HEIGHT_CM, `Height must be at most ${WORKOUT_MAX_HEIGHT_CM} cm.`),
    goal: workoutGoalSchema,
    fitnessLevel: fitnessLevelSchema,
    equipment: workoutEquipmentSchema,
    daysPerWeek: z
      .number()
      .int('Days per week must be a whole number.')
      .min(WORKOUT_MIN_DAYS_PER_WEEK, `Train at least ${WORKOUT_MIN_DAYS_PER_WEEK} day per week.`)
      .max(WORKOUT_MAX_DAYS_PER_WEEK, `Train at most ${WORKOUT_MAX_DAYS_PER_WEEK} days per week.`),
    sessionDurationMinutes: z
      .number()
      .int('Session duration must be a whole number.')
      .min(
        WORKOUT_MIN_SESSION_MINUTES,
        `Sessions must be at least ${WORKOUT_MIN_SESSION_MINUTES} minutes.`,
      )
      .max(
        WORKOUT_MAX_SESSION_MINUTES,
        `Sessions must be at most ${WORKOUT_MAX_SESSION_MINUTES} minutes.`,
      ),
  })
  .strict();

export const listWorkoutPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type ListWorkoutPlansQuery = z.infer<typeof listWorkoutPlansQuerySchema>;
