'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity,
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  HeartPulse,
  Plus,
  Sparkles,
  Timer,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CreateWorkoutPlanInput, WorkoutPlanDetail } from '@longeviq/shared';
import {
  BIOLOGICAL_SEX_VALUES,
  FITNESS_LEVEL_VALUES,
  WORKOUT_EQUIPMENT_VALUES,
  WORKOUT_GOAL_VALUES,
  WORKOUT_MAX_AGE,
  WORKOUT_MAX_DAYS_PER_WEEK,
  WORKOUT_MAX_SESSION_MINUTES,
  WORKOUT_MAX_WEIGHT_KG,
  WORKOUT_MIN_AGE,
  WORKOUT_MIN_DAYS_PER_WEEK,
  WORKOUT_MIN_HEIGHT_CM,
  WORKOUT_MIN_SESSION_MINUTES,
  type BiologicalSex,
  type FitnessLevel,
  type WorkoutEquipment,
  type WorkoutGoal,
} from '@longeviq/shared';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiCreateWorkoutPlan,
  apiDeleteWorkoutPlan,
  apiGetWorkoutPlan,
  apiListWorkoutPlans,
} from '@/lib/workout-api';
import {
  fitnessLevelLabel,
  formatMinutes,
  formatPlanDate,
  formatRestSeconds,
  formatWeeklyMinutes,
  workoutDayFocusLabel,
  workoutEquipmentLabel,
  workoutGoalLabel,
} from '@/lib/workout-format';
import { isApiClientError } from '@/lib/api-client';

const planFormSchema = z.object({
  age: z.coerce.number().int().min(WORKOUT_MIN_AGE).max(WORKOUT_MAX_AGE),
  sex: z.enum(BIOLOGICAL_SEX_VALUES),
  weightKg: z.coerce.number().positive().max(WORKOUT_MAX_WEIGHT_KG),
  heightCm: z.coerce.number().int().min(WORKOUT_MIN_HEIGHT_CM).max(250),
  goal: z.enum(WORKOUT_GOAL_VALUES),
  fitnessLevel: z.enum(FITNESS_LEVEL_VALUES),
  equipment: z.enum(WORKOUT_EQUIPMENT_VALUES),
  daysPerWeek: z.coerce
    .number()
    .int()
    .min(WORKOUT_MIN_DAYS_PER_WEEK)
    .max(WORKOUT_MAX_DAYS_PER_WEEK),
  sessionDurationMinutes: z.coerce
    .number()
    .int()
    .min(WORKOUT_MIN_SESSION_MINUTES)
    .max(WORKOUT_MAX_SESSION_MINUTES),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

const FORM_DEFAULTS: PlanFormValues = {
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

const SESSION_DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120];
const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlanBuilderForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: CreateWorkoutPlanInput) => void;
  submitting: boolean;
}) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: FORM_DEFAULTS,
  });

  const submit = (values: PlanFormValues) => {
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            inputMode="numeric"
            min={WORKOUT_MIN_AGE}
            max={WORKOUT_MAX_AGE}
            {...register('age')}
          />
          {errors.age ? <p className="text-xs text-destructive">{errors.age.message}</p> : null}
        </div>
        <SelectField
          id="sex"
          label="Sex"
          value={watch('sex')}
          onChange={(value) => setValue('sex', value as BiologicalSex)}
          options={BIOLOGICAL_SEX_VALUES.map((value) => ({
            value,
            label: value === 'MALE' ? 'Male' : 'Female',
          }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="weightKg">Weight (kg)</Label>
          <Input
            id="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={1}
            max={WORKOUT_MAX_WEIGHT_KG}
            {...register('weightKg')}
          />
          {errors.weightKg ? (
            <p className="text-xs text-destructive">{errors.weightKg.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heightCm">Height (cm)</Label>
          <Input
            id="heightCm"
            type="number"
            inputMode="numeric"
            min={WORKOUT_MIN_HEIGHT_CM}
            max={250}
            {...register('heightCm')}
          />
          {errors.heightCm ? (
            <p className="text-xs text-destructive">{errors.heightCm.message}</p>
          ) : null}
        </div>
      </div>

      <SelectField
        id="goal"
        label="Goal"
        value={watch('goal')}
        onChange={(value) => setValue('goal', value as WorkoutGoal)}
        options={WORKOUT_GOAL_VALUES.map((value) => ({
          value,
          label: workoutGoalLabel(value),
        }))}
      />
      <SelectField
        id="fitnessLevel"
        label="Fitness level"
        value={watch('fitnessLevel')}
        onChange={(value) => setValue('fitnessLevel', value as FitnessLevel)}
        options={FITNESS_LEVEL_VALUES.map((value) => ({
          value,
          label: fitnessLevelLabel(value),
        }))}
      />
      <SelectField
        id="equipment"
        label="Equipment"
        value={watch('equipment')}
        onChange={(value) => setValue('equipment', value as WorkoutEquipment)}
        options={WORKOUT_EQUIPMENT_VALUES.map((value) => ({
          value,
          label: workoutEquipmentLabel(value),
        }))}
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="daysPerWeek"
          label="Days per week"
          value={String(watch('daysPerWeek'))}
          onChange={(value) => setValue('daysPerWeek', Number(value))}
          options={DAYS_PER_WEEK_OPTIONS.map((value) => ({
            value: String(value),
            label: `${value} ${value === 1 ? 'day' : 'days'}`,
          }))}
        />
        <SelectField
          id="sessionDurationMinutes"
          label="Session length"
          value={String(watch('sessionDurationMinutes'))}
          onChange={(value) => setValue('sessionDurationMinutes', Number(value))}
          options={SESSION_DURATION_OPTIONS.map((value) => ({
            value: String(value),
            label: formatMinutes(value),
          }))}
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-2">
        <Sparkles className="size-4" aria-hidden="true" />
        {submitting ? 'Building plan…' : 'Build my plan'}
      </Button>
    </form>
  );
}

function TargetStat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function PlanView({ plan }: { plan: WorkoutPlanDetail }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Weekly targets</h2>
            <p className="text-sm text-muted-foreground">
              {workoutGoalLabel(plan.goal)} · {fitnessLevelLabel(plan.fitnessLevel)} · built{' '}
              {formatPlanDate(plan.createdAt)}
            </p>
          </div>
          <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
            {workoutEquipmentLabel(plan.equipment)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <TargetStat
            label="Weekly volume"
            value={formatWeeklyMinutes(plan.weeklyMinutes)}
            sub={`${plan.daysPerWeek} ${plan.daysPerWeek === 1 ? 'session' : 'sessions'}/week`}
            icon={<CalendarDays className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <TargetStat
            label="Strength sessions"
            value={String(plan.strengthSessions)}
            icon={<Dumbbell className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <TargetStat
            label="Cardio sessions"
            value={String(plan.cardioSessions)}
            icon={<HeartPulse className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <TargetStat
            label="Session length"
            value={formatMinutes(plan.sessionDurationMinutes)}
            sub={`main ${formatMinutes(plan.mainMinutesPerSession)}`}
            icon={<Clock3 className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <TargetStat
            label="Warm-up / cool-down"
            value={`${formatMinutes(plan.warmupMinutesPerSession)} / ${formatMinutes(plan.cooldownMinutesPerSession)}`}
            icon={<Timer className="size-3.5 text-primary" aria-hidden="true" />}
          />
        </div>
      </div>

      <div className="space-y-4">
        {plan.days.map((day) => (
          <section key={day.id} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden="true"
              >
                {day.focus === 'CARDIO' ? (
                  <HeartPulse className="size-4" />
                ) : (
                  <Dumbbell className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold">
                  Day {day.dayNumber} · {workoutDayFocusLabel(day.focus)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {day.warmupMinutes} min warm-up · {day.mainMinutes} min main ·{' '}
                  {day.cooldownMinutes} min cool-down
                </p>
              </div>
              <span className="ml-auto shrink-0 text-sm text-muted-foreground">
                {formatMinutes(day.durationMinutes)}
              </span>
            </div>

            {day.notes ? <p className="mb-3 text-xs text-muted-foreground">{day.notes}</p> : null}

            <ul className="space-y-2">
              {day.exercises.map((exercise) => (
                <li key={exercise.id} className="rounded-lg border bg-muted/40 px-3 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{exercise.name}</p>
                    <p className="shrink-0 text-xs font-medium tabular-nums">
                      {exercise.sets} × {exercise.reps}
                      {exercise.restSeconds > 0
                        ? ` · ${formatRestSeconds(exercise.restSeconds)}`
                        : ''}
                    </p>
                  </div>
                  {exercise.notes ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{exercise.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null);
  const [building, setBuilding] = React.useState(false);

  const plansQuery = useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => apiListWorkoutPlans(1, 20),
  });

  const selectedPlan = plansQuery.data?.items.find((plan) => plan.id === selectedPlanId) ?? null;
  const detailQuery = useQuery({
    queryKey: ['workout-plan', selectedPlanId],
    queryFn: () => apiGetWorkoutPlan(selectedPlanId!),
    enabled: selectedPlanId !== null && selectedPlan !== null,
  });

  React.useEffect(() => {
    if (selectedPlanId === null && plansQuery.data?.items.length) {
      setSelectedPlanId(plansQuery.data.items[0]!.id);
    }
  }, [selectedPlanId, plansQuery.data]);

  const createMutation = useMutation({
    mutationFn: (input: CreateWorkoutPlanInput) => apiCreateWorkoutPlan(input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      setSelectedPlanId(result.plan.id);
      setBuilding(false);
      toast.success('Workout plan built.');
    },
    onError: (error) => {
      toast.error(
        isApiClientError(error) ? error.message : 'Unable to build a plan. Please try again.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteWorkoutPlan(id),
    onSuccess: async (_result, id) => {
      if (selectedPlanId === id) {
        setSelectedPlanId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      toast.success('Plan deleted.');
    },
    onError: () => {
      toast.error('Unable to delete the plan.');
    },
  });

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Activity className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Workout planner</h1>
            <p className="text-sm text-muted-foreground">
              Personalized, educational training plans aligned with your fitness level and goals.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Flame className="size-4 text-primary" aria-hidden="true" />
                  {building ? 'New plan' : 'Build a plan'}
                </h2>
                {building ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBuilding(false)}
                    aria-label="Cancel building a plan"
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
              {building ? (
                <PlanBuilderForm
                  onSubmit={(input) => createMutation.mutate(input)}
                  submitting={createMutation.isPending}
                />
              ) : (
                <div className="space-y-4">
                  <Button className="w-full gap-2" onClick={() => setBuilding(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Build a new plan
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Plans are personalized from your goal, fitness level, equipment, and weekly
                    availability. Educational only — always consult a clinician before starting a
                    new training program.
                  </p>
                </div>
              )}
            </div>

            <nav aria-label="Plan history" className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Your plans</h2>
              {plansQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : plansQuery.data?.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans yet.</p>
              ) : (
                <ul className="space-y-1">
                  {plansQuery.data!.items.map((plan) => (
                    <li key={plan.id}>
                      <div
                        className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          selectedPlanId === plan.id
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        onClick={() => setSelectedPlanId(plan.id)}
                      >
                        <span className="flex-1 truncate">
                          {workoutGoalLabel(plan.goal)} · {plan.daysPerWeek} days
                        </span>
                        <button
                          type="button"
                          aria-label="Delete this plan"
                          title="Delete plan"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteMutation.mutate(plan.id);
                          }}
                          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </aside>

          <section className="min-w-0">
            {plansQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : detailQuery.data ? (
              <PlanView plan={detailQuery.data.plan} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/40 px-6 py-20 text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <Dumbbell className="size-6" />
                </span>
                <h2 className="text-lg font-semibold">Build your first workout plan</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Tell us about your goal, level, and available equipment and we will compose a
                  balanced weekly training schedule with exercises, sets, reps, and rests.
                </p>
                <Button className="mt-2 gap-2" onClick={() => setBuilding(true)}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  Get started
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
