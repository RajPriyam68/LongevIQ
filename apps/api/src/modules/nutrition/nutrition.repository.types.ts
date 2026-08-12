import type {
  ActivityLevel,
  BiologicalSex,
  DietaryPreference,
  MealType,
  NutritionGoal,
} from '@longeviq/shared';

export interface NutritionMealRecord {
  id: string;
  mealType: MealType;
  name: string;
  description: string | null;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  sortOrder: number;
}

export interface NutritionPlanRecord {
  id: string;
  userId: string;
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
  age: number;
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  dietaryPreferences: DietaryPreference[];
  bmrCalories: number;
  tdeeCalories: number;
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  waterLitres: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionPlanWithMeals extends NutritionPlanRecord {
  meals: NutritionMealRecord[];
}

export interface NutritionPlanListItem extends NutritionPlanRecord {
  mealCount: number;
}

export interface CreateNutritionMealInput {
  mealType: MealType;
  name: string;
  description: string | null;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  sortOrder: number;
}

export interface CreateNutritionPlanInput {
  userId: string;
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
  age: number;
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  dietaryPreferences: DietaryPreference[];
  bmrCalories: number;
  tdeeCalories: number;
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  waterLitres: number;
  meals: CreateNutritionMealInput[];
}

export interface NutritionRepository {
  createPlan(input: CreateNutritionPlanInput): Promise<NutritionPlanWithMeals>;
  findPlanById(id: string): Promise<NutritionPlanWithMeals | null>;
  listPlansByUser(
    userId: string,
    filter: { page: number; limit: number },
  ): Promise<{ items: NutritionPlanListItem[]; total: number }>;
  deletePlan(id: string): Promise<void>;
}
