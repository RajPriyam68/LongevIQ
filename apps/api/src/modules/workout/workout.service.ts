import type {
  CreateWorkoutPlanInput,
  WorkoutPlanDetail,
  WorkoutPlanListResult,
  WorkoutPlanListItem,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { AuditSink } from '../metrics/metrics.repository.types.js';
import { buildWeeklyWorkoutPlan } from './planner/weekly-planner.js';
import type {
  WorkoutPlanListItem as WorkoutPlanListItemRecord,
  WorkoutPlanWithDays,
  WorkoutRepository,
} from './workout.repository.types.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class WorkoutService {
  constructor(
    private readonly repository: WorkoutRepository,
    private readonly audit?: AuditSink,
  ) {}

  async createPlan(
    userId: string,
    input: CreateWorkoutPlanInput,
    ctx: RequestContext = {},
  ): Promise<WorkoutPlanDetail> {
    const weekly = buildWeeklyWorkoutPlan(input);
    const targets = weekly.targets;

    const plan = await this.repository.createPlan({
      userId,
      goal: input.goal,
      fitnessLevel: input.fitnessLevel,
      equipment: input.equipment,
      age: input.age,
      sex: input.sex,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      daysPerWeek: input.daysPerWeek,
      sessionDurationMinutes: input.sessionDurationMinutes,
      strengthSessions: targets.strengthSessions,
      cardioSessions: targets.cardioSessions,
      weeklyMinutes: targets.weeklyMinutes,
      warmupMinutesPerSession: targets.warmupMinutesPerSession,
      mainMinutesPerSession: targets.mainMinutesPerSession,
      cooldownMinutesPerSession: targets.cooldownMinutesPerSession,
      days: weekly.days,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.WORKOUT_PLAN_CREATE',
      entity: 'WorkoutPlan',
      entityId: plan.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        goal: plan.goal,
        daysPerWeek: plan.daysPerWeek,
        weeklyMinutes: plan.weeklyMinutes,
        dayCount: plan.days.length,
      },
    });

    return serializePlanDetail(plan);
  }

  async listPlans(
    userId: string,
    query: { page: number; limit: number },
  ): Promise<WorkoutPlanListResult> {
    const { items, total } = await this.repository.listPlansByUser(userId, query);
    return {
      items: items.map(serializePlanListItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPlan(userId: string, planId: string): Promise<WorkoutPlanDetail> {
    const plan = await this.requireOwnedPlan(userId, planId);
    return serializePlanDetail(plan);
  }

  async deletePlan(userId: string, planId: string, ctx: RequestContext = {}): Promise<void> {
    const plan = await this.requireOwnedPlan(userId, planId);
    await this.repository.deletePlan(plan.id);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.WORKOUT_PLAN_DELETE',
      entity: 'WorkoutPlan',
      entityId: plan.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  private async requireOwnedPlan(userId: string, planId: string): Promise<WorkoutPlanWithDays> {
    const plan = await this.repository.findPlanById(planId);
    if (!plan || plan.userId !== userId) {
      throw AppError.notFound('Workout plan not found.');
    }
    return plan;
  }
}

function serializePlanListItem(plan: WorkoutPlanListItemRecord): WorkoutPlanListItem {
  return {
    ...serializePlanBase(plan),
    dayCount: plan.dayCount,
  };
}

function serializePlanBase(
  plan: Pick<
    WorkoutPlanWithDays,
    | 'id'
    | 'goal'
    | 'fitnessLevel'
    | 'equipment'
    | 'age'
    | 'sex'
    | 'weightKg'
    | 'heightCm'
    | 'daysPerWeek'
    | 'sessionDurationMinutes'
    | 'strengthSessions'
    | 'cardioSessions'
    | 'weeklyMinutes'
    | 'warmupMinutesPerSession'
    | 'mainMinutesPerSession'
    | 'cooldownMinutesPerSession'
    | 'createdAt'
    | 'updatedAt'
  >,
) {
  return {
    id: plan.id,
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
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function serializePlanDetail(plan: WorkoutPlanWithDays): WorkoutPlanDetail {
  return {
    ...serializePlanBase(plan),
    days: plan.days.map((day) => ({
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
    })),
  };
}
