export const NutritionGoal = {
  LOSE_WEIGHT: 'LOSE_WEIGHT',
  MAINTAIN_WEIGHT: 'MAINTAIN_WEIGHT',
  GAIN_MUSCLE: 'GAIN_MUSCLE',
} as const;
export type NutritionGoal = (typeof NutritionGoal)[keyof typeof NutritionGoal];
export const NUTRITION_GOAL_VALUES = Object.values(NutritionGoal) as [
  NutritionGoal,
  ...NutritionGoal[],
];

export const NUTRITION_GOAL_LABELS: Record<NutritionGoal, string> = {
  LOSE_WEIGHT: 'Lose weight',
  MAINTAIN_WEIGHT: 'Maintain weight',
  GAIN_MUSCLE: 'Gain muscle',
};

export const ActivityLevel = {
  SEDENTARY: 'SEDENTARY',
  LIGHT: 'LIGHT',
  MODERATE: 'MODERATE',
  ACTIVE: 'ACTIVE',
  VERY_ACTIVE: 'VERY_ACTIVE',
} as const;
export type ActivityLevel = (typeof ActivityLevel)[keyof typeof ActivityLevel];
export const ACTIVITY_LEVEL_VALUES = Object.values(ActivityLevel) as [
  ActivityLevel,
  ...ActivityLevel[],
];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: 'Sedentary (little or no exercise)',
  LIGHT: 'Lightly active (1–3 days/week)',
  MODERATE: 'Moderately active (3–5 days/week)',
  ACTIVE: 'Active (6–7 days/week)',
  VERY_ACTIVE: 'Very active (physical job or training)',
};

export const DietaryPreference = {
  STANDARD: 'STANDARD',
  VEGETARIAN: 'VEGETARIAN',
  VEGAN: 'VEGAN',
  GLUTEN_FREE: 'GLUTEN_FREE',
  DAIRY_FREE: 'DAIRY_FREE',
  LOW_SODIUM: 'LOW_SODIUM',
  MEDITERRANEAN: 'MEDITERRANEAN',
} as const;
export type DietaryPreference = (typeof DietaryPreference)[keyof typeof DietaryPreference];
export const DIETARY_PREFERENCE_VALUES = Object.values(DietaryPreference) as [
  DietaryPreference,
  ...DietaryPreference[],
];

export const DIETARY_PREFERENCE_LABELS: Record<DietaryPreference, string> = {
  STANDARD: 'No restrictions',
  VEGETARIAN: 'Vegetarian',
  VEGAN: 'Vegan',
  GLUTEN_FREE: 'Gluten-free',
  DAIRY_FREE: 'Dairy-free',
  LOW_SODIUM: 'Low sodium',
  MEDITERRANEAN: 'Mediterranean',
};

export const BiologicalSex = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
} as const;
export type BiologicalSex = (typeof BiologicalSex)[keyof typeof BiologicalSex];
export const BIOLOGICAL_SEX_VALUES = Object.values(BiologicalSex) as [
  BiologicalSex,
  ...BiologicalSex[],
];

export const BIOLOGICAL_SEX_LABELS: Record<BiologicalSex, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
};

export const MealType = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
  SNACK: 'SNACK',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];
export const MEAL_TYPE_VALUES = Object.values(MealType) as [MealType, ...MealType[]];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
};

export interface NutritionMeal {
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

export interface NutritionPlan {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface NutritionPlanListItem extends NutritionPlan {
  mealCount: number;
}

export interface NutritionPlanDetail extends NutritionPlan {
  meals: NutritionMeal[];
}

export interface NutritionPlanListResult {
  items: NutritionPlanListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
