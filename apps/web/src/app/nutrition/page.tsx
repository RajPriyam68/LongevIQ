'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calculator,
  Check,
  Clock3,
  Droplets,
  Flame,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CreateNutritionPlanInput, NutritionPlanDetail } from '@longeviq/shared';
import {
  ACTIVITY_LEVEL_VALUES,
  BIOLOGICAL_SEX_VALUES,
  DIETARY_PREFERENCE_VALUES,
  NUTRITION_GOAL_VALUES,
  NUTRITION_MAX_AGE,
  NUTRITION_MAX_DIETARY_PREFERENCES,
  NUTRITION_MAX_WEIGHT_KG,
  NUTRITION_MIN_AGE,
  NUTRITION_MIN_HEIGHT_CM,
  type ActivityLevel,
  type BiologicalSex,
  type DietaryPreference,
  type NutritionGoal,
} from '@longeviq/shared';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiCreateNutritionPlan,
  apiDeleteNutritionPlan,
  apiGetNutritionPlan,
  apiListNutritionPlans,
} from '@/lib/nutrition-api';
import {
  activityLevelLabel,
  biologicalSexLabel,
  dietaryPreferenceLabel,
  formatCalories,
  formatGrams,
  formatPlanDate,
  formatWaterLitres,
  mealTypeLabel,
  nutritionGoalLabel,
} from '@/lib/nutrition-format';
import { isApiClientError } from '@/lib/api-client';

const planFormSchema = z.object({
  age: z.coerce.number().int().min(NUTRITION_MIN_AGE).max(NUTRITION_MAX_AGE),
  sex: z.enum(BIOLOGICAL_SEX_VALUES),
  weightKg: z.coerce.number().positive().max(NUTRITION_MAX_WEIGHT_KG),
  heightCm: z.coerce.number().int().min(NUTRITION_MIN_HEIGHT_CM).max(250),
  goal: z.enum(NUTRITION_GOAL_VALUES),
  activityLevel: z.enum(ACTIVITY_LEVEL_VALUES),
  dietaryPreferences: z
    .array(z.enum(DIETARY_PREFERENCE_VALUES))
    .max(NUTRITION_MAX_DIETARY_PREFERENCES),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

const FORM_DEFAULTS: PlanFormValues = {
  age: 32,
  sex: 'FEMALE',
  weightKg: 65,
  heightCm: 168,
  goal: 'MAINTAIN_WEIGHT',
  activityLevel: 'MODERATE',
  dietaryPreferences: [],
};

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
  onSubmit: (input: CreateNutritionPlanInput) => void;
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

  const dietaryPreferences = watch('dietaryPreferences');

  const togglePreference = (preference: DietaryPreference) => {
    const current = dietaryPreferences;
    const next = current.includes(preference)
      ? current.filter((item) => item !== preference)
      : [...current, preference];
    setValue('dietaryPreferences', next, { shouldValidate: true });
  };

  const submit = (values: PlanFormValues) => {
    onSubmit({ ...values, dietaryPreferences: values.dietaryPreferences });
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
            min={NUTRITION_MIN_AGE}
            max={NUTRITION_MAX_AGE}
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
            label: biologicalSexLabel(value),
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
            max={NUTRITION_MAX_WEIGHT_KG}
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
            min={NUTRITION_MIN_HEIGHT_CM}
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
        onChange={(value) => setValue('goal', value as NutritionGoal)}
        options={NUTRITION_GOAL_VALUES.map((value) => ({
          value,
          label: nutritionGoalLabel(value),
        }))}
      />
      <SelectField
        id="activityLevel"
        label="Activity level"
        value={watch('activityLevel')}
        onChange={(value) => setValue('activityLevel', value as ActivityLevel)}
        options={ACTIVITY_LEVEL_VALUES.map((value) => ({
          value,
          label: activityLevelLabel(value),
        }))}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Dietary preferences</legend>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_PREFERENCE_VALUES.filter((value) => value !== 'STANDARD').map((preference) => {
            const selected = dietaryPreferences.includes(preference);
            return (
              <button
                key={preference}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePreference(preference)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:border-primary hover:text-foreground'
                }`}
              >
                {selected ? <Check className="size-3" aria-hidden="true" /> : null}
                {dietaryPreferenceLabel(preference)}
              </button>
            );
          })}
        </div>
        {errors.dietaryPreferences ? (
          <p className="text-xs text-destructive">{errors.dietaryPreferences.message}</p>
        ) : null}
      </fieldset>

      <Button type="submit" disabled={submitting} className="w-full gap-2">
        <Sparkles className="size-4" aria-hidden="true" />
        {submitting ? 'Building plan…' : 'Build my plan'}
      </Button>
    </form>
  );
}

function MacroStat({
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

function PlanView({ plan }: { plan: NutritionPlanDetail }) {
  const grouped = (['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((mealType) => ({
    mealType,
    meals: plan.meals.filter((meal) => meal.mealType === mealType),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Daily targets</h2>
            <p className="text-sm text-muted-foreground">
              {nutritionGoalLabel(plan.goal)} · {activityLevelLabel(plan.activityLevel)} · built{' '}
              {formatPlanDate(plan.createdAt)}
            </p>
          </div>
          {plan.dietaryPreferences.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {plan.dietaryPreferences.map((preference) => (
                <span
                  key={preference}
                  className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {dietaryPreferenceLabel(preference)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MacroStat
            label="Calories"
            value={formatCalories(plan.targetCalories)}
            sub={`TDEE ${formatCalories(plan.tdeeCalories)}`}
            icon={<Flame className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <MacroStat
            label="Protein"
            value={formatGrams(plan.proteinGrams)}
            icon={<Utensils className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <MacroStat
            label="Fat"
            value={formatGrams(plan.fatGrams)}
            icon={<Utensils className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <MacroStat
            label="Carbs"
            value={formatGrams(plan.carbsGrams)}
            icon={<Utensils className="size-3.5 text-primary" aria-hidden="true" />}
          />
          <MacroStat
            label="Water"
            value={formatWaterLitres(plan.waterLitres)}
            icon={<Droplets className="size-3.5 text-primary" aria-hidden="true" />}
          />
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map(({ mealType, meals }) => (
          <section key={mealType} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {mealType === 'BREAKFAST' ? (
                  <Clock3 className="size-4" aria-hidden="true" />
                ) : (
                  <Utensils className="size-4" aria-hidden="true" />
                )}
              </span>
              <h3 className="font-semibold">{mealTypeLabel(mealType)}</h3>
              <span className="ml-auto text-sm text-muted-foreground">
                {meals.reduce((sum, meal) => sum + meal.calories, 0)} kcal
              </span>
            </div>
            <ul className="space-y-2">
              {meals.map((meal) => (
                <li key={meal.id} className="rounded-lg border bg-muted/40 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{meal.name}</p>
                    <p className="shrink-0 text-xs font-medium tabular-nums">
                      {formatCalories(meal.calories)}
                    </p>
                  </div>
                  {meal.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{meal.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    P {formatGrams(meal.proteinGrams)} · F {formatGrams(meal.fatGrams)} · C{' '}
                    {formatGrams(meal.carbsGrams)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null);
  const [building, setBuilding] = React.useState(false);

  const plansQuery = useQuery({
    queryKey: ['nutrition-plans'],
    queryFn: () => apiListNutritionPlans(1, 20),
  });

  const selectedPlan = plansQuery.data?.items.find((plan) => plan.id === selectedPlanId) ?? null;
  const detailQuery = useQuery({
    queryKey: ['nutrition-plan', selectedPlanId],
    queryFn: () => apiGetNutritionPlan(selectedPlanId!),
    enabled: selectedPlanId !== null && selectedPlan !== null,
  });

  React.useEffect(() => {
    if (selectedPlanId === null && plansQuery.data?.items.length) {
      setSelectedPlanId(plansQuery.data.items[0]!.id);
    }
  }, [selectedPlanId, plansQuery.data]);

  const createMutation = useMutation({
    mutationFn: (input: CreateNutritionPlanInput) => apiCreateNutritionPlan(input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] });
      setSelectedPlanId(result.plan.id);
      setBuilding(false);
      toast.success('Nutrition plan built.');
    },
    onError: (error) => {
      toast.error(
        isApiClientError(error) ? error.message : 'Unable to build a plan. Please try again.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteNutritionPlan(id),
    onSuccess: async (_result, id) => {
      if (selectedPlanId === id) {
        setSelectedPlanId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ['nutrition-plans'] });
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
            <Utensils className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Nutrition planner</h1>
            <p className="text-sm text-muted-foreground">
              Personalized, educational meal plans aligned with your health profile.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Calculator className="size-4 text-primary" aria-hidden="true" />
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
                    Plans are personalized from your age, body metrics, activity level, and dietary
                    preferences. Educational only — always consult a clinician for medical advice.
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
                          {nutritionGoalLabel(plan.goal)} · {formatCalories(plan.targetCalories)}
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
                  <Utensils className="size-6" />
                </span>
                <h2 className="text-lg font-semibold">Build your first nutrition plan</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Tell us about yourself and we will compute your daily calorie and macro targets
                  and compose a balanced, educationally grounded meal plan.
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
