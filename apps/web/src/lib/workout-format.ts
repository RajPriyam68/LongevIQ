import {
  FITNESS_LEVEL_LABELS,
  WORKOUT_DAY_FOCUS_LABELS,
  WORKOUT_EQUIPMENT_LABELS,
  WORKOUT_GOAL_LABELS,
  type FitnessLevel,
  type WorkoutDayFocus,
  type WorkoutEquipment,
  type WorkoutGoal,
} from '@longeviq/shared';

export function workoutGoalLabel(goal: WorkoutGoal): string {
  return WORKOUT_GOAL_LABELS[goal];
}

export function fitnessLevelLabel(level: FitnessLevel): string {
  return FITNESS_LEVEL_LABELS[level];
}

export function workoutEquipmentLabel(equipment: WorkoutEquipment): string {
  return WORKOUT_EQUIPMENT_LABELS[equipment];
}

export function workoutDayFocusLabel(focus: WorkoutDayFocus): string {
  return WORKOUT_DAY_FOCUS_LABELS[focus];
}

export function formatMinutes(minutes: number): string {
  return `${Math.round(minutes)} min`;
}

export function formatWeeklyMinutes(minutes: number): string {
  return `${Math.round(minutes)} min/week`;
}

export function formatRestSeconds(seconds: number): string {
  if (seconds <= 0) {
    return '';
  }
  return `${seconds}s rest`;
}

export function formatPlanDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}
