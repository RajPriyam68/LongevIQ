import type { WorkoutGoal } from '@longeviq/shared';

export interface WorkoutProfile {
  age: number;
  weightKg: number;
  goal: WorkoutGoal;
  daysPerWeek: number;
  sessionDurationMinutes: number;
}

export interface WorkoutTargets {
  strengthSessions: number;
  cardioSessions: number;
  weeklyMinutes: number;
  warmupMinutesPerSession: number;
  mainMinutesPerSession: number;
  cooldownMinutesPerSession: number;
}

// Fraction of weekly sessions allocated to resistance training per goal. The
// remainder is cardiovascular conditioning.
const STRENGTH_SHARE: Record<WorkoutGoal, number> = {
  LOSE_WEIGHT: 0.5,
  MUSCLE_GAIN: 0.8,
  GENERAL_FITNESS: 0.7,
  ENDURANCE: 0.4,
};

// MET estimates used only for the educational per-session note. Strength and
// conditioning work is modelled at a moderate-to-vigorous intensity.
export const MET_BY_GOAL: Record<WorkoutGoal, number> = {
  LOSE_WEIGHT: 6.0,
  MUSCLE_GAIN: 5.0,
  GENERAL_FITNESS: 5.5,
  ENDURANCE: 7.0,
};

export function computeWorkoutTargets(profile: WorkoutProfile): WorkoutTargets {
  const strengthSessions = Math.round(profile.daysPerWeek * STRENGTH_SHARE[profile.goal]);
  const cardioSessions = Math.max(0, profile.daysPerWeek - strengthSessions);

  const duration = profile.sessionDurationMinutes;
  const warmupMinutesPerSession = Math.max(3, Math.round(duration * 0.15));
  const cooldownMinutesPerSession = Math.max(2, Math.round(duration * 0.1));
  const mainMinutesPerSession = Math.max(
    5,
    duration - warmupMinutesPerSession - cooldownMinutesPerSession,
  );

  return {
    strengthSessions,
    cardioSessions,
    weeklyMinutes: profile.daysPerWeek * duration,
    warmupMinutesPerSession,
    mainMinutesPerSession,
    cooldownMinutesPerSession,
  };
}

// Approximate calories expended per session (MET x weight kg x hours). Used in
// the plan headline to keep targets motivating but clearly educational.
export function estimateSessionCalories(
  weightKg: number,
  durationMinutes: number,
  goal: WorkoutGoal,
): number {
  return Math.round((MET_BY_GOAL[goal] * weightKg * durationMinutes) / 60);
}
