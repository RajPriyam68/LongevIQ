import { describe, expect, it } from 'vitest';
import {
  activityLevelLabel,
  biologicalSexLabel,
  dietaryPreferenceLabel,
  formatCalories,
  formatGrams,
  formatPlanDate,
  formatWaterLitres,
  mealTypeLabel,
  nutritionGoalLabel,
} from './nutrition-format';

describe('nutrition formatting helpers', () => {
  it('maps enum values to human labels', () => {
    expect(nutritionGoalLabel('LOSE_WEIGHT')).toBe('Lose weight');
    expect(nutritionGoalLabel('GAIN_MUSCLE')).toBe('Gain muscle');
    expect(activityLevelLabel('VERY_ACTIVE')).toContain('Very active');
    expect(biologicalSexLabel('FEMALE')).toBe('Female');
    expect(mealTypeLabel('DINNER')).toBe('Dinner');
    expect(dietaryPreferenceLabel('VEGAN')).toBe('Vegan');
    expect(dietaryPreferenceLabel('STANDARD')).toBe('No restrictions');
  });

  it('formats calorie and macro amounts', () => {
    expect(formatCalories(2000)).toBe('2000 kcal');
    expect(formatCalories(120.4)).toBe('120 kcal');
    expect(formatGrams(42.6)).toBe('43 g');
    expect(formatWaterLitres(2.5)).toBe('2.5 L');
    expect(formatWaterLitres(1)).toBe('1.0 L');
  });

  it('formats plan dates without throwing on invalid input', () => {
    const iso = new Date('2026-08-12T12:00:00.000Z').toISOString();
    expect(formatPlanDate(iso)).toMatch(/2026/);
    expect(formatPlanDate('not-a-date')).toBe('');
  });
});
