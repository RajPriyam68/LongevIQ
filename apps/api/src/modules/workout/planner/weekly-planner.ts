import type {
  FitnessLevel,
  WorkoutDayFocus,
  WorkoutEquipment,
  WorkoutGoal,
} from '@longeviq/shared';
import { WORKOUT_DAY_FOCUS_LABELS } from '@longeviq/shared';
import { EXERCISE_CATALOG, type ExerciseTemplate } from './exercise-catalog.js';
import { computeWorkoutTargets, type WorkoutProfile, type WorkoutTargets } from './targets.js';

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
  sortOrder: number;
}

export interface GeneratedWorkoutDay {
  dayNumber: number;
  focus: WorkoutDayFocus;
  durationMinutes: number;
  warmupMinutes: number;
  mainMinutes: number;
  cooldownMinutes: number;
  notes: string | null;
  exercises: GeneratedExercise[];
}

export interface BuildWorkoutPlanInput extends WorkoutProfile {
  heightCm: number;
  fitnessLevel: FitnessLevel;
  equipment: WorkoutEquipment;
}

export interface WeeklyWorkoutPlan {
  targets: WorkoutTargets;
  days: GeneratedWorkoutDay[];
}

const LEVEL_RANK: Record<FitnessLevel, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
};

const EQUIPMENT_RANK: Record<WorkoutEquipment, number> = {
  NONE: 0,
  BASIC: 1,
  FULL_GYM: 2,
};

const GOAL_RANK: Record<WorkoutGoal, number> = {
  LOSE_WEIGHT: 0,
  MUSCLE_GAIN: 1,
  GENERAL_FITNESS: 2,
  ENDURANCE: 3,
};

// Split templates per level: the set of day focuses a strength session can
// take. Beginners stay full-body; higher levels rotate splits across the week.
const SPLIT_BY_LEVEL: Record<FitnessLevel, WorkoutDayFocus[]> = {
  BEGINNER: ['FULL_BODY'],
  INTERMEDIATE: ['UPPER_BODY', 'LOWER_BODY', 'CORE', 'FULL_BODY'],
  ADVANCED: ['PUSH', 'PULL', 'LEGS', 'UPPER_BODY', 'CORE'],
};

// Strength rep-range drift per goal. Muscle gain and general fitness stay in
// the classic hypertrophy window; fat-loss and endurance goals drift higher.
const REP_OFFSET_BY_GOAL: Record<WorkoutGoal, number> = {
  LOSE_WEIGHT: 3,
  MUSCLE_GAIN: 0,
  GENERAL_FITNESS: 0,
  ENDURANCE: 6,
};

// Cardio sessions are prescribed by goal as duration/interval guidance rather
// than by sets x reps.
const CARDIO_PRESCRIPTION_BY_GOAL: Record<WorkoutGoal, string> = {
  LOSE_WEIGHT: '20-30 min steady',
  MUSCLE_GAIN: '10-15 min easy',
  GENERAL_FITNESS: '20 min steady + intervals',
  ENDURANCE: '30-40 min steady + intervals',
};

export const STRENGTH_REPS_OFFSET = REP_OFFSET_BY_GOAL;
export const CARDIO_PRESCRIPTION = CARDIO_PRESCRIPTION_BY_GOAL;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Evenly interleaves strength and cardio sessions so conditioning is spread
 * across the week instead of clumped at the end.
 */
export function interleaveSessions(strength: number, cardio: number): Array<'STRENGTH' | 'CARDIO'> {
  const total = strength + cardio;
  if (total === 0) {
    return [];
  }
  const majority: 'STRENGTH' | 'CARDIO' = strength >= cardio ? 'STRENGTH' : 'CARDIO';
  const minority: 'STRENGTH' | 'CARDIO' = majority === 'STRENGTH' ? 'CARDIO' : 'STRENGTH';
  const majorityCount = Math.max(strength, cardio);
  const sequence: Array<'STRENGTH' | 'CARDIO'> = [];
  for (let i = 0; i < total; i++) {
    const isMajority =
      Math.round(((i + 1) * majorityCount) / total) - Math.round((i * majorityCount) / total) === 1;
    sequence.push(isMajority ? majority : minority);
  }
  return sequence;
}

// Shifts a numeric rep range (e.g. '8-12') by the goal offset, preserving any
// suffix such as 'per leg'. Time-based and interval prescriptions are kept as
// authored.
export function shiftReps(reps: string, goal: WorkoutGoal): string {
  const offset = REP_OFFSET_BY_GOAL[goal];
  if (offset === 0 || /(sec|min)/.test(reps)) {
    return reps;
  }
  const match = reps.match(/^(\d+)-(\d+)/);
  if (!match) {
    return reps;
  }
  const low = Number(match[1]) + offset;
  const high = Number(match[2]) + offset;
  return `${low}-${high}${reps.slice(match[0].length)}`;
}

function prescribeExercise(
  template: ExerciseTemplate,
  profile: BuildWorkoutPlanInput,
): Omit<GeneratedExercise, 'sortOrder'> {
  const isCardio = template.focus.includes('CARDIO');
  const reps = isCardio
    ? CARDIO_PRESCRIPTION_BY_GOAL[profile.goal]
    : shiftReps(template.reps, profile.goal);
  return {
    name: template.name,
    sets: template.setsByLevel[profile.fitnessLevel],
    reps,
    restSeconds: template.restSeconds,
    notes: template.notes ?? null,
  };
}

function compatiblePool(
  focus: WorkoutDayFocus,
  profile: BuildWorkoutPlanInput,
): ExerciseTemplate[] {
  return EXERCISE_CATALOG.filter(
    (template) =>
      template.focus.includes(focus) &&
      LEVEL_RANK[template.minLevel] <= LEVEL_RANK[profile.fitnessLevel] &&
      EQUIPMENT_RANK[template.equipment] <= EQUIPMENT_RANK[profile.equipment],
  );
}

function pickStrengthExercises(
  focus: WorkoutDayFocus,
  profile: BuildWorkoutPlanInput,
  seed: number,
  strengthIndex: number,
  mainMinutes: number,
): GeneratedExercise[] {
  const pool = compatiblePool(focus, profile);
  const count = clamp(Math.round(mainMinutes / 12), 3, 5);
  const start = (seed + strengthIndex * 3 + GOAL_RANK[profile.goal]) % pool.length;
  const step = Math.max(1, Math.floor(pool.length / count));

  const exercises: GeneratedExercise[] = [];
  for (let index = 0; index < count; index++) {
    const template = pool[(start + index * step) % pool.length]!;
    exercises.push({ ...prescribeExercise(template, profile), sortOrder: index });
  }
  return exercises;
}

function pickCardioExercise(
  profile: BuildWorkoutPlanInput,
  seed: number,
  dayIndex: number,
): GeneratedExercise {
  const pool = compatiblePool('CARDIO', profile);
  const template = pool[(seed + dayIndex) % pool.length]!;
  return { ...prescribeExercise(template, profile), sortOrder: 0 };
}

function strengthFocusFor(
  profile: BuildWorkoutPlanInput,
  seed: number,
  strengthIndex: number,
): WorkoutDayFocus {
  const split = SPLIT_BY_LEVEL[profile.fitnessLevel];
  const offset = (GOAL_RANK[profile.goal] * 2 + seed) % split.length;
  return split[(strengthIndex + offset) % split.length]!;
}

/**
 * Composes a full week of sessions from the curated exercise catalog. Selection
 * is deterministic per profile so identical profiles always produce the same
 * plan while different profiles vary. Sessions are split into warmup, main
 * work, and cooldown; strength days rotate splits, cardio days interleave.
 */
export function buildWeeklyWorkoutPlan(input: BuildWorkoutPlanInput): WeeklyWorkoutPlan {
  const targets = computeWorkoutTargets(input);
  const seed =
    input.age +
    Math.round(input.weightKg * 10) +
    input.heightCm +
    GOAL_RANK[input.goal] * 7 +
    LEVEL_RANK[input.fitnessLevel] * 13 +
    EQUIPMENT_RANK[input.equipment] * 5;

  const sequence = interleaveSessions(targets.strengthSessions, targets.cardioSessions);
  const days: GeneratedWorkoutDay[] = [];
  let strengthIndex = 0;

  sequence.forEach((sessionType, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const isCardio = sessionType === 'CARDIO';
    const focus: WorkoutDayFocus = isCardio
      ? 'CARDIO'
      : strengthFocusFor(input, seed, strengthIndex);

    const exercises = isCardio
      ? [pickCardioExercise(input, seed, dayIndex)]
      : pickStrengthExercises(focus, input, seed, strengthIndex, targets.mainMinutesPerSession);
    if (!isCardio) {
      strengthIndex += 1;
    }

    const notes = isCardio
      ? `Steady-state cardio, about ${targets.mainMinutesPerSession} minutes in your aerobic zone.`
      : `${WORKOUT_DAY_FOCUS_LABELS[focus]} day with ${exercises.length} exercises and about ${targets.mainMinutesPerSession} minutes of working sets.`;

    days.push({
      dayNumber,
      focus,
      durationMinutes: input.sessionDurationMinutes,
      warmupMinutes: targets.warmupMinutesPerSession,
      mainMinutes: targets.mainMinutesPerSession,
      cooldownMinutes: targets.cooldownMinutesPerSession,
      notes,
      exercises,
    });
  });

  return { targets, days };
}
