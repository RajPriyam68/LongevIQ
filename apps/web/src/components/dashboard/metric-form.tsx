'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import {
  createMetricSchema,
  HEALTH_METRIC_META,
  HEALTH_METRIC_TYPE_VALUES,
  isCompoundMetricType,
  type CreateMetricInput,
} from '@longeviq/shared';
import { apiCreateMetric } from '@/lib/metrics-api';
import { isApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type FormValues = {
  type: CreateMetricInput['type'];
  value: number | null;
  valueSecondary?: number | null;
  recordedAt?: string;
  notes?: string;
};

interface MetricFormProps {
  onCreated: () => Promise<void> | void;
}

export function MetricForm({ onCreated }: MetricFormProps) {
  const [open, setOpen] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createMetricSchema as never),
    defaultValues: { type: 'WEIGHT', value: null },
  });

  const selectedType = watch('type');
  const compound = isCompoundMetricType(selectedType);
  const meta = HEALTH_METRIC_META[selectedType];

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: CreateMetricInput = {
        type: values.type,
        value: values.value as number,
        ...(values.valueSecondary !== undefined && values.valueSecondary !== null
          ? { valueSecondary: values.valueSecondary }
          : {}),
        ...(values.recordedAt ? { recordedAt: values.recordedAt } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      };
      await apiCreateMetric(payload);
      toast.success(`${meta.label} recorded.`);
      reset({ type: values.type, value: null });
      await onCreated();
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to record the metric.');
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="size-4" aria-hidden="true" />
        Add measurement
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add measurement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="metric-type">Metric</Label>
              <select
                id="metric-type"
                className={cn(
                  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                )}
                {...register('type')}
              >
                {HEALTH_METRIC_TYPE_VALUES.map((type) => (
                  <option key={type} value={type}>
                    {HEALTH_METRIC_META[type].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric-value">
                {compound ? (meta.secondaryLabel ? 'Systolic' : 'Value') : 'Value'} ({meta.unit})
              </Label>
              <Input
                id="metric-value"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder={`${meta.min}–${meta.max}`}
                aria-invalid={Boolean(errors.value)}
                {...register('value', { valueAsNumber: true })}
              />
              {errors.value ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.value.message}
                </p>
              ) : null}
            </div>
          </div>

          {compound ? (
            <div className="space-y-2">
              <Label htmlFor="metric-secondary">
                {meta.secondaryLabel} ({meta.unit})
              </Label>
              <Input
                id="metric-secondary"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder={
                  meta.secondaryMin !== undefined && meta.secondaryMax !== undefined
                    ? `${meta.secondaryMin}–${meta.secondaryMax}`
                    : undefined
                }
                aria-invalid={Boolean(errors.valueSecondary)}
                {...register('valueSecondary', { valueAsNumber: true })}
              />
              {errors.valueSecondary ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.valueSecondary.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="metric-recordedAt">Recorded at</Label>
              <Input
                id="metric-recordedAt"
                type="datetime-local"
                aria-invalid={Boolean(errors.recordedAt)}
                {...register('recordedAt', {
                  setValueAs: (value: string) =>
                    value ? new Date(value).toISOString() : undefined,
                })}
              />
              {errors.recordedAt ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.recordedAt.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric-notes">Notes</Label>
              <Input
                id="metric-notes"
                placeholder="Optional note"
                aria-invalid={Boolean(errors.notes)}
                {...register('notes')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                'Save measurement'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset({ type: selectedType, value: null });
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
