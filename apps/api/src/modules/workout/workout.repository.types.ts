import type {
  BiologicalSex,
  FitnessLevel,
  WorkoutDayFocus,
  WorkoutEquipment,
  WorkoutGoal,
} from '@longeviq/shared';

export interface WorkoutExerciseRecord {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
  sortOrder: number;
}

export interface WorkoutDayRecord {
  id: string;
  dayNumber: number;
  focus: WorkoutDayFocus;
  durationMinutes: number;
  warmupMinutes: number;
  mainMinutes: number;
  cooldownMinutes: number;
  notes: string | null;
  exercises: WorkoutExerciseRecord[];
}

export interface WorkoutPlanRecord {
  id: string;
  userId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutPlanWithDays extends WorkoutPlanRecord {
  days: WorkoutDayRecord[];
}

export interface WorkoutPlanListItem extends WorkoutPlanRecord {
  dayCount: number;
}

export interface CreateWorkoutExerciseInput {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
  sortOrder: number;
}

export interface CreateWorkoutDayInput {
  dayNumber: number;
  focus: WorkoutDayFocus;
  durationMinutes: number;
  warmupMinutes: number;
  mainMinutes: number;
  cooldownMinutes: number;
  notes: string | null;
  exercises: CreateWorkoutExerciseInput[];
}

export interface CreateWorkoutPlanInput {
  userId: string;
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
  days: CreateWorkoutDayInput[];
}

export interface WorkoutRepository {
  createPlan(input: CreateWorkoutPlanInput): Promise<WorkoutPlanWithDays>;
  findPlanById(id: string): Promise<WorkoutPlanWithDays | null>;
  listPlansByUser(
    userId: string,
    filter: { page: number; limit: number },
  ): Promise<{ items: WorkoutPlanListItem[]; total: number }>;
  deletePlan(id: string): Promise<void>;
}
