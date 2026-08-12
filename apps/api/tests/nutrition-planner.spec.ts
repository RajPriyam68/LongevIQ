import { describe, expect, it } from 'vitest';
import { MEAL_CATALOG, type MealTemplate } from '../src/modules/nutrition/planner/meal-catalog.js';
import {
  buildDailyMealPlan,
  isTemplateCompatible,
  MEAL_CALORIE_SHARE,
  MEAL_SLOT_ORDER,
} from '../src/modules/nutrition/planner/meal-planner.js';
import {
  computeBmr,
  computeMacroTargets,
  computeNutritionTargets,
  computeProteinTarget,
  computeTargetCalories,
  computeTdee,
  computeWaterLitres,
  MIN_CALORIE_FLOOR,
} from '../src/modules/nutrition/planner/targets.js';

describe('computeBmr (Mifflin-St Jeor)', () => {
  it('computes a male BMR with the +5 adjustment', () => {
    expect(
      computeBmr({
        age: 30,
        sex: 'MALE',
        weightKg: 80,
        heightCm: 180,
        goal: 'MAINTAIN_WEIGHT',
        activityLevel: 'MODERATE',
      }),
    ).toBe(10 * 80 + 6.25 * 180 - 5 * 30 + 5);
  });

  it('computes a female BMR with the -161 adjustment', () => {
    expect(
      computeBmr({
        age: 30,
        sex: 'FEMALE',
        weightKg: 65,
        heightCm: 168,
        goal: 'MAINTAIN_WEIGHT',
        activityLevel: 'MODERATE',
      }),
    ).toBe(10 * 65 + 6.25 * 168 - 5 * 30 - 161);
  });

  it('is monotonic in weight and height', () => {
    const light = computeBmr({
      age: 40,
      sex: 'MALE',
      weightKg: 70,
      heightCm: 170,
      goal: 'MAINTAIN_WEIGHT',
      activityLevel: 'SEDENTARY',
    });
    const heavy = computeBmr({
      age: 40,
      sex: 'MALE',
      weightKg: 90,
      heightCm: 170,
      goal: 'MAINTAIN_WEIGHT',
      activityLevel: 'SEDENTARY',
    });
    expect(heavy).toBeGreaterThan(light);
  });
});

describe('computeTdee', () => {
  it('applies the WHO-style activity factors', () => {
    expect(computeTdee(2000, 'SEDENTARY')).toBe(2400);
    expect(computeTdee(2000, 'LIGHT')).toBe(2750);
    expect(computeTdee(2000, 'MODERATE')).toBe(3100);
    expect(computeTdee(2000, 'ACTIVE')).toBe(3450);
    expect(computeTdee(2000, 'VERY_ACTIVE')).toBe(3800);
  });
});

describe('computeTargetCalories', () => {
  it('applies the goal adjustments', () => {
    expect(computeTargetCalories(2400, 'LOSE_WEIGHT')).toBe(1900);
    expect(computeTargetCalories(2400, 'MAINTAIN_WEIGHT')).toBe(2400);
    expect(computeTargetCalories(2400, 'GAIN_MUSCLE')).toBe(2700);
  });

  it('never drops below the healthy floor', () => {
    expect(computeTargetCalories(1400, 'LOSE_WEIGHT')).toBe(MIN_CALORIE_FLOOR);
  });
});

describe('computeProteinTarget', () => {
  it('targets grams per kilogram per goal', () => {
    expect(computeProteinTarget(80, 'LOSE_WEIGHT')).toBe(144);
    expect(computeProteinTarget(80, 'MAINTAIN_WEIGHT')).toBe(96);
    expect(computeProteinTarget(80, 'GAIN_MUSCLE')).toBe(160);
  });
});

describe('computeMacroTargets', () => {
  it('allocates 25% of calories to fat and the rest to carbs', () => {
    const { fatGrams, carbsGrams } = computeMacroTargets(2000, 100);
    expect(fatGrams).toBe(Math.round((2000 * 0.25) / 9));
    const proteinCalories = 100 * 4;
    const fatCalories = fatGrams * 9;
    expect(carbsGrams).toBe(Math.round((2000 - proteinCalories - fatCalories) / 4));
  });

  it('never returns negative carbs', () => {
    const { carbsGrams } = computeMacroTargets(MIN_CALORIE_FLOOR, 300);
    expect(carbsGrams).toBeGreaterThanOrEqual(0);
  });
});

describe('computeWaterLitres', () => {
  it('recommends 35 ml per kg rounded to one decimal', () => {
    expect(computeWaterLitres(70)).toBe(2.5);
  });

  it('enforces a 1.5 L floor for light users', () => {
    expect(computeWaterLitres(40)).toBe(1.5);
  });
});

describe('computeNutritionTargets', () => {
  it('produces coherent targets for a moderate male', () => {
    const targets = computeNutritionTargets({
      age: 30,
      sex: 'MALE',
      weightKg: 80,
      heightCm: 180,
      goal: 'MAINTAIN_WEIGHT',
      activityLevel: 'MODERATE',
    });
    expect(targets.tdeeCalories).toBe(Math.round(targets.bmrCalories * 1.55));
    expect(targets.targetCalories).toBe(targets.tdeeCalories);
    const macroCalories = targets.proteinGrams * 4 + targets.fatGrams * 9 + targets.carbsGrams * 4;
    expect(Math.abs(macroCalories - targets.targetCalories)).toBeLessThanOrEqual(15);
    expect(targets.waterLitres).toBeGreaterThan(0);
  });

  it('lowers the calorie target for weight loss with high protein', () => {
    const targets = computeNutritionTargets({
      age: 45,
      sex: 'FEMALE',
      weightKg: 70,
      heightCm: 165,
      goal: 'LOSE_WEIGHT',
      activityLevel: 'LIGHT',
    });
    expect(targets.targetCalories).toBeLessThan(targets.tdeeCalories);
    expect(targets.proteinGrams).toBeGreaterThanOrEqual(70 * 1.8 - 1);
  });
});

describe('isTemplateCompatible', () => {
  const veganTemplate: MealTemplate = {
    mealType: 'LUNCH',
    name: 'Chickpea salad',
    description: '',
    calories: 420,
    proteinGrams: 18,
    fatGrams: 14,
    carbsGrams: 55,
    satisfies: ['VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE'],
  };

  it('accepts every template when there are no active preferences', () => {
    expect(isTemplateCompatible(veganTemplate, [])).toBe(true);
    expect(isTemplateCompatible(veganTemplate, ['STANDARD'])).toBe(true);
  });

  it('requires every active preference to be satisfied', () => {
    expect(isTemplateCompatible(veganTemplate, ['VEGAN'])).toBe(true);
    expect(isTemplateCompatible(veganTemplate, ['VEGAN', 'LOW_SODIUM'])).toBe(false);
    expect(isTemplateCompatible(veganTemplate, ['MEDITERRANEAN'])).toBe(false);
  });
});

describe('MEAL_CATALOG integrity', () => {
  it('has at least two templates per meal slot', () => {
    for (const mealType of MEAL_SLOT_ORDER) {
      const count = MEAL_CATALOG.filter((meal) => meal.mealType === mealType).length;
      expect(count, `${mealType} should have multiple templates`).toBeGreaterThanOrEqual(2);
    }
  });

  it('has consistent macro math within tolerance', () => {
    for (const meal of MEAL_CATALOG) {
      const macroCalories = meal.proteinGrams * 4 + meal.fatGrams * 9 + meal.carbsGrams * 4;
      expect(
        Math.abs(macroCalories - meal.calories),
        `${meal.name} macros should match its calories`,
      ).toBeLessThanOrEqual(25);
    }
  });

  it('covers every dietary preference for every slot', () => {
    const preferences = [
      'VEGETARIAN',
      'VEGAN',
      'GLUTEN_FREE',
      'DAIRY_FREE',
      'LOW_SODIUM',
      'MEDITERRANEAN',
    ] as const;
    for (const mealType of MEAL_SLOT_ORDER) {
      for (const preference of preferences) {
        const compatible = MEAL_CATALOG.some(
          (meal) => meal.mealType === mealType && meal.satisfies.includes(preference),
        );
        expect(compatible, `expected a ${mealType} template satisfying ${preference}`).toBe(true);
      }
    }
  });
});

describe('buildDailyMealPlan', () => {
  const baseInput = {
    age: 32,
    weightKg: 65,
    heightCm: 168,
    goal: 'MAINTAIN_WEIGHT' as const,
    targetCalories: 2000,
    dietaryPreferences: [] as string[],
  };

  it('produces one meal per slot summing to the calorie target', () => {
    const meals = buildDailyMealPlan(baseInput);
    expect(meals).toHaveLength(4);
    expect(meals.map((meal) => meal.mealType)).toEqual(MEAL_SLOT_ORDER);
    const total = meals.reduce((sum, meal) => sum + meal.calories, 0);
    expect(Math.abs(total - 2000)).toBeLessThanOrEqual(MEAL_SLOT_ORDER.length);
    expect(meals.every((meal) => meal.sortOrder === meals.indexOf(meal))).toBe(true);
  });

  it('scales each slot to its calorie share', () => {
    const meals = buildDailyMealPlan({ ...baseInput, targetCalories: 2400 });
    for (const meal of meals) {
      const expected = Math.round(2400 * MEAL_CALORIE_SHARE[meal.mealType]);
      expect(meal.calories).toBe(expected);
    }
  });

  it('is deterministic for the same profile', () => {
    const first = buildDailyMealPlan(baseInput);
    const second = buildDailyMealPlan(baseInput);
    expect(first).toEqual(second);
  });

  it('only picks meals compatible with dietary preferences', () => {
    const meals = buildDailyMealPlan({
      ...baseInput,
      dietaryPreferences: ['VEGAN'],
    });
    expect(meals).toHaveLength(4);
    for (const meal of meals) {
      const template = MEAL_CATALOG.find(
        (candidate) => candidate.name === meal.name && candidate.mealType === meal.mealType,
      )!;
      expect(template.satisfies.includes('VEGAN')).toBe(true);
    }
  });

  it('satisfies combined dietary preferences', () => {
    const meals = buildDailyMealPlan({
      ...baseInput,
      dietaryPreferences: ['VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE'],
    });
    expect(meals).toHaveLength(4);
    for (const meal of meals) {
      const template = MEAL_CATALOG.find(
        (candidate) => candidate.name === meal.name && candidate.mealType === meal.mealType,
      )!;
      for (const preference of ['VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE'] as const) {
        expect(template.satisfies.includes(preference)).toBe(true);
      }
    }
  });

  it('varies meal selection across different profiles', () => {
    const a = buildDailyMealPlan(baseInput);
    const b = buildDailyMealPlan({
      ...baseInput,
      age: 58,
      weightKg: 92,
      heightCm: 178,
      goal: 'GAIN_MUSCLE',
      targetCalories: 2800,
    });
    const namesA = new Set(a.map((meal) => meal.name));
    const namesB = new Set(b.map((meal) => meal.name));
    // At least one slot should differ between very different profiles.
    let shared = 0;
    for (const name of namesA) {
      if (namesB.has(name)) shared += 1;
    }
    expect(shared).toBeLessThan(4);
  });
});
