import type { BiologicalSex } from './nutrition.js';

export const WorkoutGoal = {
  LOSE_WEIGHT: 'LOSE_WEIGHT',
  MUSCLE_GAIN: 'MUSCLE_GAIN',
  GENERAL_FITNESS: 'GENERAL_FITNESS',
  ENDURANCE: 'ENDURANCE',
} as const;
export type WorkoutGoal = (typeof WorkoutGoal)[keyof typeof WorkoutGoal];
export const WORKOUT_GOAL_VALUES = Object.values(WorkoutGoal) as [WorkoutGoal, ...WorkoutGoal[]];

export const WORKOUT_GOAL_LABELS: Record<WorkoutGoal, string> = {
  LOSE_WEIGHT: 'Lose weight',
  MUSCLE_GAIN: 'Build muscle',
  GENERAL_FITNESS: 'General fitness',
  ENDURANCE: 'Build endurance',
};

export const FitnessLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
} as const;
export type FitnessLevel = (typeof FitnessLevel)[keyof typeof FitnessLevel];
export const FITNESS_LEVEL_VALUES = Object.values(FitnessLevel) as [
  FitnessLevel,
  ...FitnessLevel[],
];

export const FITNESS_LEVEL_LABELS: Record<FitnessLevel, string> = {
  BEGINNER: 'Beginner (new to training)',
  INTERMEDIATE: 'Intermediate (6+ months consistent)',
  ADVANCED: 'Advanced (2+ years, progressive overload)',
};

export const WorkoutEquipment = {
  NONE: 'NONE',
  BASIC: 'BASIC',
  FULL_GYM: 'FULL_GYM',
} as const;
export type WorkoutEquipment = (typeof WorkoutEquipment)[keyof typeof WorkoutEquipment];
export const WORKOUT_EQUIPMENT_VALUES = Object.values(WorkoutEquipment) as [
  WorkoutEquipment,
  ...WorkoutEquipment[],
];

export const WORKOUT_EQUIPMENT_LABELS: Record<WorkoutEquipment, string> = {
  NONE: 'No equipment (bodyweight)',
  BASIC: 'Basic (dumbbells or bands)',
  FULL_GYM: 'Full gym',
};

export const WorkoutDayFocus = {
  FULL_BODY: 'FULL_BODY',
  UPPER_BODY: 'UPPER_BODY',
  LOWER_BODY: 'LOWER_BODY',
  PUSH: 'PUSH',
  PULL: 'PULL',
  LEGS: 'LEGS',
  CORE: 'CORE',
  CARDIO: 'CARDIO',
} as const;
export type WorkoutDayFocus = (typeof WorkoutDayFocus)[keyof typeof WorkoutDayFocus];
export const WORKOUT_DAY_FOCUS_VALUES = Object.values(WorkoutDayFocus) as [
  WorkoutDayFocus,
  ...WorkoutDayFocus[],
];

export const WORKOUT_DAY_FOCUS_LABELS: Record<WorkoutDayFocus, string> = {
  FULL_BODY: 'Full body',
  UPPER_BODY: 'Upper body',
  LOWER_BODY: 'Lower body',
  PUSH: 'Push',
  PULL: 'Pull',
  LEGS: 'Legs',
  CORE: 'Core',
  CARDIO: 'Cardio',
};

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
  sortOrder: number;
}

export interface WorkoutDay {
  id: string;
  dayNumber: number;
  focus: WorkoutDayFocus;
  durationMinutes: number;
  warmupMinutes: number;
  mainMinutes: number;
  cooldownMinutes: number;
  notes: string | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  id: string;
  goal: WorkoutGoal;
  fitnessLevel: FitnessLevel;
  equipment: WorkoutEquipment;
  age: number;
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  strengthSessions: number;
  cardioSessions: number;
  weeklyMinutes: number;
  warmupMinutesPerSession: number;
  mainMinutesPerSession: number;
  cooldownMinutesPerSession: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutPlanListItem extends WorkoutPlan {
  dayCount: number;
}

export interface WorkoutPlanDetail extends WorkoutPlan {
  days: WorkoutDay[];
}

export interface WorkoutPlanListResult {
  items: WorkoutPlanListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
