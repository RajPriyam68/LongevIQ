import { describe, expect, it } from 'vitest';
import {
  fitnessLevelLabel,
  formatMinutes,
  formatPlanDate,
  formatRestSeconds,
  formatWeeklyMinutes,
  workoutDayFocusLabel,
  workoutEquipmentLabel,
  workoutGoalLabel,
} from './workout-format';

describe('workout-format', () => {
  it('labels goals, levels, equipment, and focuses', () => {
    expect(workoutGoalLabel('MUSCLE_GAIN')).toMatch(/muscle/i);
    expect(fitnessLevelLabel('BEGINNER')).toMatch(/beginner/i);
    expect(workoutEquipmentLabel('NONE')).toMatch(/bodyweight/i);
    expect(workoutDayFocusLabel('PUSH')).toBe('Push');
  });

  it('formats minutes', () => {
    expect(formatMinutes(30)).toBe('30 min');
    expect(formatWeeklyMinutes(90)).toBe('90 min/week');
  });

  it('formats rest seconds and hides zero rests', () => {
    expect(formatRestSeconds(60)).toBe('60s rest');
    expect(formatRestSeconds(0)).toBe('');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatPlanDate('not-a-date')).toBe('');
  });
});
