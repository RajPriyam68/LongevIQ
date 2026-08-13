import type {
  WorkoutDay as WorkoutDayModel,
  WorkoutExercise as WorkoutExerciseModel,
  WorkoutPlan as WorkoutPlanModel,
} from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  CreateWorkoutPlanInput,
  WorkoutDayRecord,
  WorkoutPlanListItem,
  WorkoutPlanRecord,
  WorkoutPlanWithDays,
  WorkoutRepository,
} from './workout.repository.types.js';

export class PrismaWorkoutRepository implements WorkoutRepository {
  async createPlan(input: CreateWorkoutPlanInput): Promise<WorkoutPlanWithDays> {
    const plan = await prisma.workoutPlan.create({
      data: {
        userId: input.userId,
        goal: input.goal,
        fitnessLevel: input.fitnessLevel,
        equipment: input.equipment,
        age: input.age,
        sex: input.sex,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        daysPerWeek: input.daysPerWeek,
        sessionDurationMinutes: input.sessionDurationMinutes,
        strengthSessions: input.strengthSessions,
        cardioSessions: input.cardioSessions,
        weeklyMinutes: input.weeklyMinutes,
        warmupMinutesPerSession: input.warmupMinutesPerSession,
        mainMinutesPerSession: input.mainMinutesPerSession,
        cooldownMinutesPerSession: input.cooldownMinutesPerSession,
        days: {
          create: input.days.map((day) => ({
            dayNumber: day.dayNumber,
            focus: day.focus,
            durationMinutes: day.durationMinutes,
            warmupMinutes: day.warmupMinutes,
            mainMinutes: day.mainMinutes,
            cooldownMinutes: day.cooldownMinutes,
            notes: day.notes,
            exercises: { create: day.exercises },
          })),
        },
      },
      include: { days: { include: { exercises: { orderBy: { sortOrder: 'asc' } } } } },
    });
    return toPlanWithDays(plan);
  }

  async findPlanById(id: string): Promise<WorkoutPlanWithDays | null> {
    const plan = await prisma.workoutPlan.findUnique({
      where: { id },
      include: { days: { include: { exercises: { orderBy: { sortOrder: 'asc' } } } } },
    });
    return plan ? toPlanWithDays(plan) : null;
  }

  async listPlansByUser(
    userId: string,
    filter: { page: number; limit: number },
  ): Promise<{ items: WorkoutPlanListItem[]; total: number }> {
    const [rows, total] = await prisma.$transaction([
      prisma.workoutPlan.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: { _count: { select: { days: true } } },
      }),
      prisma.workoutPlan.count({ where: { userId } }),
    ]);

    const items: WorkoutPlanListItem[] = rows.map((row) => ({
      ...toPlanRecord(row),
      dayCount: row._count.days,
    }));
    return { items, total };
  }

  async deletePlan(id: string): Promise<void> {
    await prisma.workoutPlan.delete({ where: { id } });
  }
}

function toPlanRecord(plan: WorkoutPlanModel): WorkoutPlanRecord {
  return {
    id: plan.id,
    userId: plan.userId,
    goal: plan.goal,
    fitnessLevel: plan.fitnessLevel,
    equipment: plan.equipment,
    age: plan.age,
    sex: plan.sex,
    weightKg: plan.weightKg,
    heightCm: plan.heightCm,
    daysPerWeek: plan.daysPerWeek,
    sessionDurationMinutes: plan.sessionDurationMinutes,
    strengthSessions: plan.strengthSessions,
    cardioSessions: plan.cardioSessions,
    weeklyMinutes: plan.weeklyMinutes,
    warmupMinutesPerSession: plan.warmupMinutesPerSession,
    mainMinutesPerSession: plan.mainMinutesPerSession,
    cooldownMinutesPerSession: plan.cooldownMinutesPerSession,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function toDayRecord(
  day: WorkoutDayModel & { exercises: WorkoutExerciseModel[] },
): WorkoutDayRecord {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    focus: day.focus,
    durationMinutes: day.durationMinutes,
    warmupMinutes: day.warmupMinutes,
    mainMinutes: day.mainMinutes,
    cooldownMinutes: day.cooldownMinutes,
    notes: day.notes,
    exercises: day.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
      sortOrder: exercise.sortOrder,
    })),
  };
}

function toPlanWithDays(
  plan: WorkoutPlanModel & { days: Array<WorkoutDayModel & { exercises: WorkoutExerciseModel[] }> },
): WorkoutPlanWithDays {
  return {
    ...toPlanRecord(plan),
    days: plan.days.map(toDayRecord),
  };
}
