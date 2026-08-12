import type { DietaryPreference, MealType } from '@longeviq/shared';

export interface MealTemplate {
  mealType: MealType;
  name: string;
  description: string;
  // Base portion in kcal; the planner scales the template to each meal slot.
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  // The dietary preferences this template satisfies. A template with an empty
  // list is compatible only with unrestricted (STANDARD) eaters.
  satisfies: DietaryPreference[];
}

const BREAKFAST = 'BREAKFAST' as const;
const LUNCH = 'LUNCH' as const;
const DINNER = 'DINNER' as const;
const SNACK = 'SNACK' as const;

export const MEAL_CATALOG: MealTemplate[] = [
  // --- Breakfast ---------------------------------------------------------
  {
    mealType: BREAKFAST,
    name: 'Oatmeal with berries and nuts',
    description: 'Rolled oats cooked with water, topped with mixed berries and chopped almonds.',
    calories: 350,
    proteinGrams: 12,
    fatGrams: 10,
    carbsGrams: 52,
    satisfies: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: BREAKFAST,
    name: 'Greek yogurt parfait',
    description:
      'Plain Greek yogurt layered with granola-free oats, berries, and a drizzle of honey.',
    calories: 320,
    proteinGrams: 22,
    fatGrams: 9,
    carbsGrams: 38,
    satisfies: ['VEGETARIAN', 'GLUTEN_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: BREAKFAST,
    name: 'Veggie omelette with toast',
    description:
      'Two-egg omelette with spinach, peppers, and mushrooms, served with whole-grain toast.',
    calories: 380,
    proteinGrams: 24,
    fatGrams: 18,
    carbsGrams: 30,
    satisfies: ['VEGETARIAN', 'LOW_SODIUM'],
  },
  {
    mealType: BREAKFAST,
    name: 'Eggs and avocado toast',
    description: 'Two boiled eggs with smashed avocado on whole-grain toast.',
    calories: 420,
    proteinGrams: 22,
    fatGrams: 24,
    carbsGrams: 30,
    satisfies: [],
  },
  {
    mealType: BREAKFAST,
    name: 'Smoothie bowl',
    description: 'Blended banana, spinach, and plant milk topped with seeds and sliced fruit.',
    calories: 300,
    proteinGrams: 10,
    fatGrams: 8,
    carbsGrams: 46,
    satisfies: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: BREAKFAST,
    name: 'Mediterranean shakshuka',
    description: 'Eggs poached in a spiced tomato, pepper, and olive oil sauce with fresh herbs.',
    calories: 360,
    proteinGrams: 20,
    fatGrams: 16,
    carbsGrams: 32,
    satisfies: ['VEGETARIAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM', 'MEDITERRANEAN'],
  },

  // --- Lunch -------------------------------------------------------------
  {
    mealType: LUNCH,
    name: 'Grilled chicken quinoa bowl',
    description:
      'Grilled chicken breast over quinoa with cucumber, tomato, and a lemon-olive oil dressing.',
    calories: 520,
    proteinGrams: 38,
    fatGrams: 16,
    carbsGrams: 55,
    satisfies: ['GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: LUNCH,
    name: 'Salmon and roasted vegetables',
    description: 'Oven-roasted salmon fillet with seasonal vegetables and olive oil.',
    calories: 480,
    proteinGrams: 34,
    fatGrams: 22,
    carbsGrams: 35,
    satisfies: ['GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM', 'MEDITERRANEAN'],
  },
  {
    mealType: LUNCH,
    name: 'Lentil and vegetable soup',
    description: 'Hearty lentil and vegetable soup served with a crusty whole-grain roll.',
    calories: 450,
    proteinGrams: 20,
    fatGrams: 8,
    carbsGrams: 70,
    satisfies: ['VEGETARIAN', 'VEGAN', 'LOW_SODIUM'],
  },
  {
    mealType: LUNCH,
    name: 'Turkey and avocado wrap',
    description: 'Sliced turkey, avocado, and greens in a whole-wheat tortilla.',
    calories: 480,
    proteinGrams: 32,
    fatGrams: 20,
    carbsGrams: 42,
    satisfies: ['LOW_SODIUM'],
  },
  {
    mealType: LUNCH,
    name: 'Chickpea and quinoa salad',
    description:
      'Chickpeas, quinoa, cherry tomatoes, cucumber, and parsley with lemon-tahini dressing.',
    calories: 420,
    proteinGrams: 18,
    fatGrams: 14,
    carbsGrams: 55,
    satisfies: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM', 'MEDITERRANEAN'],
  },
  {
    mealType: LUNCH,
    name: 'Tuna salad lettuce wraps',
    description: 'Tuna salad with Greek yogurt and celery, wrapped in crisp lettuce leaves.',
    calories: 360,
    proteinGrams: 34,
    fatGrams: 14,
    carbsGrams: 24,
    satisfies: ['GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },

  // --- Dinner ------------------------------------------------------------
  {
    mealType: DINNER,
    name: 'Baked chicken, brown rice, and broccoli',
    description: 'Herb-baked chicken breast with brown rice and steamed broccoli.',
    calories: 550,
    proteinGrams: 42,
    fatGrams: 16,
    carbsGrams: 55,
    satisfies: ['GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: DINNER,
    name: 'Grilled fish with couscous',
    description: 'Grilled white fish with couscous, olives, tomatoes, and a drizzle of olive oil.',
    calories: 520,
    proteinGrams: 38,
    fatGrams: 18,
    carbsGrams: 46,
    satisfies: ['DAIRY_FREE', 'LOW_SODIUM', 'MEDITERRANEAN'],
  },
  {
    mealType: DINNER,
    name: 'Stir-fried tofu and vegetables',
    description: 'Crispy tofu stir-fried with mixed vegetables in a light ginger-garlic sauce.',
    calories: 480,
    proteinGrams: 26,
    fatGrams: 18,
    carbsGrams: 52,
    satisfies: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: DINNER,
    name: 'Lean beef and sweet potato',
    description: 'Lean grilled beef strips with roasted sweet potato and green beans.',
    calories: 540,
    proteinGrams: 40,
    fatGrams: 20,
    carbsGrams: 48,
    satisfies: ['GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: DINNER,
    name: 'Whole-wheat pasta primavera',
    description: 'Whole-wheat pasta tossed with seasonal vegetables, olive oil, and Parmesan.',
    calories: 520,
    proteinGrams: 24,
    fatGrams: 16,
    carbsGrams: 70,
    satisfies: ['VEGETARIAN', 'LOW_SODIUM'],
  },
  {
    mealType: DINNER,
    name: 'Baked cod, quinoa, and greens',
    description: 'Lemon-herb baked cod served with quinoa and sautéed leafy greens.',
    calories: 480,
    proteinGrams: 40,
    fatGrams: 16,
    carbsGrams: 42,
    satisfies: ['GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM', 'MEDITERRANEAN'],
  },

  // --- Snack -------------------------------------------------------------
  {
    mealType: SNACK,
    name: 'Apple with peanut butter',
    description: 'Sliced apple with a measured serving of natural peanut butter.',
    calories: 250,
    proteinGrams: 7,
    fatGrams: 12,
    carbsGrams: 30,
    satisfies: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: SNACK,
    name: 'Cottage cheese and fruit',
    description: 'Low-fat cottage cheese with a handful of fresh fruit.',
    calories: 220,
    proteinGrams: 22,
    fatGrams: 6,
    carbsGrams: 20,
    satisfies: ['VEGETARIAN', 'GLUTEN_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: SNACK,
    name: 'Hummus and carrot sticks',
    description: 'Carrot and cucumber sticks with a serving of hummus.',
    calories: 230,
    proteinGrams: 8,
    fatGrams: 12,
    carbsGrams: 24,
    satisfies: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM', 'MEDITERRANEAN'],
  },
  {
    mealType: SNACK,
    name: 'Greek yogurt with almonds',
    description: 'Plain Greek yogurt topped with a small handful of almonds.',
    calories: 260,
    proteinGrams: 18,
    fatGrams: 14,
    carbsGrams: 18,
    satisfies: ['VEGETARIAN', 'GLUTEN_FREE', 'LOW_SODIUM'],
  },
  {
    mealType: SNACK,
    name: 'Rice cakes with almond butter',
    description: 'Whole-grain rice cakes spread with a measured serving of almond butter.',
    calories: 200,
    proteinGrams: 6,
    fatGrams: 10,
    carbsGrams: 24,
    satisfies: ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'LOW_SODIUM'],
  },
];
