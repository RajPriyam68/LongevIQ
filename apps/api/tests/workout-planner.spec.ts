import { describe, expect, it } from 'vitest';
import type {
  FitnessLevel,
  WorkoutDayFocus,
  WorkoutEquipment,
  WorkoutGoal,
} from '@longeviq/shared';
import { EXERCISE_CATALOG } from '../src/modules/workout/planner/exercise-catalog.js';
import {
  computeWorkoutTargets,
  estimateSessionCalories,
  MET_BY_GOAL,
} from '../src/modules/workout/planner/targets.js';
import {
  buildWeeklyWorkoutPlan,
  interleaveSessions,
  shiftReps,
  type BuildWorkoutPlanInput,
} from '../src/modules/workout/planner/weekly-planner.js';

const BASE_PROFILE: BuildWorkoutPlanInput = {
  age: 32,
  sex: 'FEMALE',
  weightKg: 65,
  heightCm: 168,
  goal: 'GENERAL_FITNESS',
  fitnessLevel: 'BEGINNER',
  equipment: 'NONE',
  daysPerWeek: 3,
  sessionDurationMinutes: 30,
};

describe('computeWorkoutTargets', () => {
  it('allocates weekly sessions between strength and cardio per goal', () => {
    const loseWeight = computeWorkoutTargets({ ...BASE_PROFILE, goal: 'LOSE_WEIGHT' });
    expect(loseWeight.strengthSessions + loseWeight.cardioSessions).toBe(3);
    expect(loseWeight.cardioSessions).toBeGreaterThan(0);

    const muscle = computeWorkoutTargets({ ...BASE_PROFILE, goal: 'MUSCLE_GAIN' });
    expect(muscle.strengthSessions).toBe(2);
    expect(muscle.cardioSessions).toBe(1);

    const endurance = computeWorkoutTargets({ ...BASE_PROFILE, goal: 'ENDURANCE' });
    expect(endurance.cardioSessions).toBeGreaterThan(endurance.strengthSessions);
  });

  it('never returns more sessions than days per week', () => {
    for (const goal of ['LOSE_WEIGHT', 'MUSCLE_GAIN', 'GENERAL_FITNESS', 'ENDURANCE'] as const) {
      for (const daysPerWeek of [1, 2, 5, 7]) {
        const targets = computeWorkoutTargets({ ...BASE_PROFILE, goal, daysPerWeek });
        expect(targets.strengthSessions + targets.cardioSessions).toBe(daysPerWeek);
        expect(targets.strengthSessions).toBeGreaterThanOrEqual(0);
        expect(targets.cardioSessions).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('splits each session into warmup, main work, and cooldown', () => {
    const targets = computeWorkoutTargets(BASE_PROFILE);
    expect(
      targets.warmupMinutesPerSession +
        targets.mainMinutesPerSession +
        targets.cooldownMinutesPerSession,
    ).toBe(30);
    expect(targets.warmupMinutesPerSession).toBeGreaterThanOrEqual(3);
    expect(targets.cooldownMinutesPerSession).toBeGreaterThanOrEqual(2);
    expect(targets.mainMinutesPerSession).toBeGreaterThanOrEqual(5);
  });

  it('computes weekly volume as days times session length', () => {
    const targets = computeWorkoutTargets({ ...BASE_PROFILE, daysPerWeek: 4 });
    expect(targets.weeklyMinutes).toBe(120);
  });
});

describe('estimateSessionCalories', () => {
  it('uses MET x weight x hours', () => {
    const goal: WorkoutGoal = 'GENERAL_FITNESS';
    const met = MET_BY_GOAL[goal];
    expect(estimateSessionCalories(70, 60, goal)).toBe(Math.round((met * 70 * 60) / 60));
  });

  it('scales with duration', () => {
    expect(estimateSessionCalories(70, 30, 'GENERAL_FITNESS')).toBeLessThan(
      estimateSessionCalories(70, 60, 'GENERAL_FITNESS'),
    );
  });
});

describe('interleaveSessions', () => {
  it('spreads cardio across the week instead of clumping it', () => {
    const sequence = interleaveSessions(3, 1);
    expect(sequence).toEqual(['STRENGTH', 'STRENGTH', 'CARDIO', 'STRENGTH']);
    expect(sequence.filter((item) => item === 'STRENGTH')).toHaveLength(3);
    expect(sequence.filter((item) => item === 'CARDIO')).toHaveLength(1);
  });

  it('returns all-strength when there is no cardio', () => {
    expect(interleaveSessions(3, 0)).toEqual(['STRENGTH', 'STRENGTH', 'STRENGTH']);
  });

  it('returns all-cardio when there is no strength', () => {
    expect(interleaveSessions(0, 2)).toEqual(['CARDIO', 'CARDIO']);
  });

  it('returns an empty sequence for zero days', () => {
    expect(interleaveSessions(0, 0)).toEqual([]);
  });
});

describe('shiftReps', () => {
  it('keeps the classic hypertrophy window for muscle gain', () => {
    expect(shiftReps('8-12', 'MUSCLE_GAIN')).toBe('8-12');
    expect(shiftReps('8-12', 'GENERAL_FITNESS')).toBe('8-12');
  });

  it('drifts rep ranges higher for fat loss and endurance', () => {
    expect(shiftReps('8-12', 'LOSE_WEIGHT')).toBe('11-15');
    expect(shiftReps('8-12', 'ENDURANCE')).toBe('14-18');
  });

  it('preserves suffixes such as per side', () => {
    expect(shiftReps('10-12 per side', 'ENDURANCE')).toBe('16-18 per side');
  });

  it('leaves time-based prescriptions unchanged', () => {
    expect(shiftReps('30-45 sec', 'ENDURANCE')).toBe('30-45 sec');
  });
});

describe('EXERCISE_CATALOG integrity', () => {
  const strengthFocuses: WorkoutDayFocus[] = [
    'FULL_BODY',
    'UPPER_BODY',
    'LOWER_BODY',
    'PUSH',
    'PULL',
    'LEGS',
    'CORE',
  ];
  const levels: FitnessLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  const equipment: WorkoutEquipment[] = ['NONE', 'BASIC', 'FULL_GYM'];
  const levelRank: Record<FitnessLevel, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };
  const equipmentRank: Record<WorkoutEquipment, number> = { NONE: 0, BASIC: 1, FULL_GYM: 2 };

  it('has at least three exercises for every strength focus with no equipment', () => {
    for (const focus of strengthFocuses) {
      const count = EXERCISE_CATALOG.filter(
        (exercise) => exercise.focus.includes(focus) && exercise.equipment === 'NONE',
      ).length;
      expect(count, `${focus} should have multiple bodyweight options`).toBeGreaterThanOrEqual(3);
    }
  });

  it('has at least three compatible exercises for every profile combination', () => {
    for (const focus of strengthFocuses) {
      for (const userLevel of levels) {
        for (const userEquipment of equipment) {
          const compatible = EXERCISE_CATALOG.filter(
            (exercise) =>
              exercise.focus.includes(focus) &&
              levelRank[exercise.minLevel] <= levelRank[userLevel] &&
              equipmentRank[exercise.equipment] <= equipmentRank[userEquipment],
          );
          expect(
            compatible.length,
            `${focus}/${userLevel}/${userEquipment} needs a full session`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('has at least one cardio exercise for every equipment and level', () => {
    for (const userLevel of levels) {
      for (const userEquipment of equipment) {
        const compatible = EXERCISE_CATALOG.filter(
          (exercise) =>
            exercise.focus.includes('CARDIO') &&
            levelRank[exercise.minLevel] <= levelRank[userLevel] &&
            equipmentRank[exercise.equipment] <= equipmentRank[userEquipment],
        );
        expect(compatible.length, `${userLevel}/${userEquipment} cardio`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('uses consistent set counts per level', () => {
    for (const exercise of EXERCISE_CATALOG) {
      for (const level of levels) {
        const sets = exercise.setsByLevel[level];
        expect(sets, `${exercise.name} at ${level}`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('buildWeeklyWorkoutPlan', () => {
  it('produces one session per day with consistent durations', () => {
    const { days, targets } = buildWeeklyWorkoutPlan(BASE_PROFILE);
    expect(days).toHaveLength(3);
    for (const day of days) {
      expect(day.durationMinutes).toBe(30);
      expect(day.warmupMinutes + day.mainMinutes + day.cooldownMinutes).toBe(30);
      expect(day.dayNumber).toBe(days.indexOf(day) + 1);
      expect(day.exercises.length).toBeGreaterThan(0);
    }
    expect(targets.weeklyMinutes).toBe(90);
  });

  it('keeps beginners on full-body sessions', () => {
    const { days } = buildWeeklyWorkoutPlan(BASE_PROFILE);
    const strengthDays = days.filter((day) => day.focus !== 'CARDIO');
    expect(strengthDays.length).toBeGreaterThan(0);
    expect(strengthDays.every((day) => day.focus === 'FULL_BODY')).toBe(true);
  });

  it('respects the equipment constraint', () => {
    const { days } = buildWeeklyWorkoutPlan(BASE_PROFILE);
    const allowed = ['NONE'] as const;
    for (const day of days) {
      for (const exercise of day.exercises) {
        const template = EXERCISE_CATALOG.find((candidate) => candidate.name === exercise.name)!;
        expect(allowed).toContain(template.equipment);
      }
    }
  });

  it('respects the fitness level constraint', () => {
    const { days } = buildWeeklyWorkoutPlan({ ...BASE_PROFILE, fitnessLevel: 'ADVANCED' });
    for (const day of days) {
      for (const exercise of day.exercises) {
        const template = EXERCISE_CATALOG.find((candidate) => candidate.name === exercise.name)!;
        expect(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).toContain(template.minLevel);
      }
    }
  });

  it('includes cardio sessions for fat-loss and endurance goals', () => {
    const loss = buildWeeklyWorkoutPlan({ ...BASE_PROFILE, goal: 'LOSE_WEIGHT' });
    const endurance = buildWeeklyWorkoutPlan({ ...BASE_PROFILE, goal: 'ENDURANCE' });
    expect(loss.days.some((day) => day.focus === 'CARDIO')).toBe(true);
    expect(endurance.days.some((day) => day.focus === 'CARDIO')).toBe(true);
  });

  it('scales sets by fitness level', () => {
    const beginner = buildWeeklyWorkoutPlan(BASE_PROFILE);
    const advanced = buildWeeklyWorkoutPlan({ ...BASE_PROFILE, fitnessLevel: 'ADVANCED' });
    const beginnerSets = beginner.days
      .flatMap((day) => day.exercises)
      .reduce((sum, exercise) => sum + exercise.sets, 0);
    const advancedSets = advanced.days
      .flatMap((day) => day.exercises)
      .reduce((sum, exercise) => sum + exercise.sets, 0);
    expect(advancedSets).toBeGreaterThan(beginnerSets);
  });

  it('is deterministic for the same profile', () => {
    const first = buildWeeklyWorkoutPlan(BASE_PROFILE);
    const second = buildWeeklyWorkoutPlan(BASE_PROFILE);
    expect(first).toEqual(second);
  });

  it('varies the plan across different profiles', () => {
    const a = buildWeeklyWorkoutPlan(BASE_PROFILE);
    const b = buildWeeklyWorkoutPlan({
      ...BASE_PROFILE,
      age: 58,
      weightKg: 92,
      heightCm: 178,
      goal: 'MUSCLE_GAIN',
      fitnessLevel: 'ADVANCED',
      equipment: 'FULL_GYM',
      daysPerWeek: 5,
      sessionDurationMinutes: 60,
    });
    const namesA = new Set(a.days.flatMap((day) => day.exercises).map((exercise) => exercise.name));
    const namesB = new Set(b.days.flatMap((day) => day.exercises).map((exercise) => exercise.name));
    let shared = 0;
    for (const name of namesA) {
      if (namesB.has(name)) shared += 1;
    }
    expect(shared).toBeLessThan(namesA.size);
  });
});
