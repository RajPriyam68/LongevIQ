'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Pill,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  CreateMedicationInput,
  Medication,
  MedicationAdherenceStatus,
  MedicationScheduleDose,
  UpdateMedicationInput,
} from '@longeviq/shared';
import {
  MEDICATION_FORM_VALUES,
  MEDICATION_MAX_TIMES,
  MEDICATION_MIN_TIMES,
  medicationTimeSchema,
} from '@longeviq/shared';
import { RequireAuth } from '@/components/auth/require-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiCreateMedication,
  apiDeleteMedication,
  apiGetMedicationSchedule,
  apiListMedications,
  apiSetDoseStatus,
  apiUpdateMedication,
} from '@/lib/medications-api';
import {
  formatReminderTimes,
  formatScheduleDate,
  formatTime12h,
  medicationFormLabel,
  medicationStatusLabel,
  shiftDate,
  todayDateString,
} from '@/lib/medications-format';
import { isApiClientError } from '@/lib/api-client';

const medicationFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  dosage: z.string().trim().min(1, 'Dosage is required.').max(60),
  form: z.enum(MEDICATION_FORM_VALUES),
  reminderTimes: z.array(medicationTimeSchema).min(MEDICATION_MIN_TIMES).max(MEDICATION_MAX_TIMES),
  instructions: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  active: z.boolean(),
});

type MedicationFormValues = z.infer<typeof medicationFormSchema>;

const DEFAULT_FORM: MedicationFormValues = {
  name: '',
  dosage: '',
  form: 'PILL',
  reminderTimes: ['08:00', '20:00'],
  instructions: '',
  notes: '',
  startDate: '',
  endDate: '',
  active: true,
};

function toFormValues(medication: Medication): MedicationFormValues {
  return {
    name: medication.name,
    dosage: medication.dosage,
    form: medication.form,
    reminderTimes: medication.reminderTimes,
    instructions: medication.instructions ?? '',
    notes: medication.notes ?? '',
    startDate: medication.startDate,
    endDate: medication.endDate ?? '',
    active: medication.active,
  };
}

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

function MedicationForm({
  defaultValues,
  submitting,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  defaultValues: MedicationFormValues;
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: MedicationFormValues) => void;
}) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues,
  });

  const reminderTimes = watch('reminderTimes');

  const addReminderTime = () => {
    setValue('reminderTimes', [...reminderTimes, '12:00']);
  };

  const removeReminderTime = (index: number) => {
    setValue(
      'reminderTimes',
      reminderTimes.filter((_, i) => i !== index),
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text" placeholder="e.g. Metformin" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dosage">Dosage</Label>
          <Input id="dosage" type="text" placeholder="e.g. 500 mg" {...register('dosage')} />
          {errors.dosage ? (
            <p className="text-xs text-destructive">{errors.dosage.message}</p>
          ) : null}
        </div>
        <SelectField
          id="form"
          label="Form"
          value={watch('form')}
          onChange={(value) => setValue('form', value as MedicationFormValues['form'])}
          options={MEDICATION_FORM_VALUES.map((value) => ({
            value,
            label: medicationFormLabel(value),
          }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Reminder times</Label>
        <ul className="space-y-2">
          {reminderTimes.map((_, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                type="time"
                aria-label="Reminder time"
                {...register(`reminderTimes.${index}` as const)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove reminder time"
                disabled={reminderTimes.length <= MEDICATION_MIN_TIMES}
                onClick={() => removeReminderTime(index)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        {errors.reminderTimes ? (
          <p className="text-xs text-destructive">{errors.reminderTimes.message}</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={reminderTimes.length >= MEDICATION_MAX_TIMES}
          onClick={addReminderTime}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add a time
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Input
          id="instructions"
          type="text"
          placeholder="e.g. Take with food"
          {...register('instructions')}
        />
        {errors.instructions ? (
          <p className="text-xs text-destructive">{errors.instructions.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          type="text"
          placeholder="e.g. Refill every 30 days"
          {...register('notes')}
        />
        {errors.notes ? <p className="text-xs text-destructive">{errors.notes.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" {...register('startDate')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End date (optional)</Label>
          <Input id="endDate" type="date" {...register('endDate')} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register('active')} />
        Active (shown on the daily schedule)
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} className="flex-1 gap-2">
          <Sparkles className="size-4" aria-hidden="true" />
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DoseRow({
  dose,
  onStatus,
  busy,
}: {
  dose: MedicationScheduleDose;
  onStatus: (status: MedicationAdherenceStatus) => void;
  busy: boolean;
}) {
  const isTaken = dose.status === 'TAKEN';
  const isSkipped = dose.status === 'SKIPPED';

  return (
    <li className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {dose.medicationName} <span className="text-muted-foreground">· {dose.dosage}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {medicationFormLabel(dose.form)} · {formatTime12h(dose.time)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              isTaken
                ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                : isSkipped
                  ? 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-300'
                  : 'text-muted-foreground'
            }`}
          >
            {medicationStatusLabel(dose.status)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onStatus(isTaken ? 'PENDING' : 'TAKEN')}
          >
            <Check className="size-3.5" aria-hidden="true" />
            {isTaken ? 'Undo' : 'Taken'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onStatus(isSkipped ? 'PENDING' : 'SKIPPED')}
          >
            {isSkipped ? 'Undo' : 'Skip'}
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function MedicationsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [scheduleDate, setScheduleDate] = React.useState(() => todayDateString());

  const medicationsQuery = useQuery({
    queryKey: ['medications'],
    queryFn: () => apiListMedications(1, 100),
  });

  const scheduleQuery = useQuery({
    queryKey: ['medication-schedule', scheduleDate],
    queryFn: () => apiGetMedicationSchedule(scheduleDate),
  });

  const medications = medicationsQuery.data?.items ?? [];
  const editingMedication = medications.find((medication) => medication.id === editingId) ?? null;

  const invalidateMedications = async () => {
    await queryClient.invalidateQueries({ queryKey: ['medications'] });
    await queryClient.invalidateQueries({ queryKey: ['medication-schedule'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateMedicationInput) => apiCreateMedication(input),
    onSuccess: async () => {
      await invalidateMedications();
      setCreating(false);
      toast.success('Medication added.');
    },
    onError: (error) => {
      toast.error(
        isApiClientError(error) ? error.message : 'Unable to add the medication. Please try again.',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMedicationInput }) =>
      apiUpdateMedication(id, input),
    onSuccess: async () => {
      await invalidateMedications();
      setEditingId(null);
      toast.success('Medication updated.');
    },
    onError: (error) => {
      toast.error(
        isApiClientError(error)
          ? error.message
          : 'Unable to update the medication. Please try again.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteMedication(id),
    onSuccess: async () => {
      await invalidateMedications();
      setEditingId(null);
      toast.success('Medication deleted.');
    },
    onError: () => {
      toast.error('Unable to delete the medication.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      medicationId,
      time,
      status,
    }: {
      medicationId: string;
      time: string;
      status: MedicationAdherenceStatus;
    }) => apiSetDoseStatus(medicationId, { date: scheduleDate, time, status }),
    onError: (error) => {
      toast.error(
        isApiClientError(error) ? error.message : 'Unable to update the dose. Please try again.',
      );
    },
  });

  const handleStatus = (dose: MedicationScheduleDose, status: MedicationAdherenceStatus) => {
    statusMutation.mutate(
      { medicationId: dose.medicationId, time: dose.time, status },
      {
        onSuccess: (result) => {
          queryClient.setQueryData(['medication-schedule', scheduleDate], result);
        },
      },
    );
  };

  const submitCreate = (values: MedicationFormValues) => {
    const { name, dosage, form, reminderTimes, instructions, notes, startDate, endDate } = values;
    createMutation.mutate({
      name,
      dosage,
      form,
      reminderTimes,
      instructions: instructions?.trim() ? instructions.trim() : undefined,
      notes: notes?.trim() ? notes.trim() : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const submitUpdate = (values: MedicationFormValues) => {
    if (!editingId) return;
    const payload: UpdateMedicationInput = { active: values.active };
    if (values.name !== editingMedication?.name) payload.name = values.name;
    if (values.dosage !== editingMedication?.dosage) payload.dosage = values.dosage;
    if (values.form !== editingMedication?.form) payload.form = values.form;
    if (
      values.reminderTimes.slice().sort().join(',') !==
      editingMedication?.reminderTimes.slice().sort().join(',')
    ) {
      payload.reminderTimes = values.reminderTimes;
    }
    if ((values.instructions ?? '') !== (editingMedication?.instructions ?? '')) {
      payload.instructions = values.instructions?.trim() || null;
    }
    if ((values.notes ?? '') !== (editingMedication?.notes ?? '')) {
      payload.notes = values.notes?.trim() || null;
    }
    if (values.startDate !== editingMedication?.startDate) {
      payload.startDate = values.startDate || editingMedication!.startDate;
    }
    if ((values.endDate || '') !== (editingMedication?.endDate ?? '')) {
      payload.endDate = values.endDate || null;
    }
    updateMutation.mutate({ id: editingId, input: payload });
  };

  const editingFormValues = editingMedication ? toFormValues(editingMedication) : DEFAULT_FORM;

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Pill className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Medication reminders</h1>
            <p className="text-sm text-muted-foreground">
              Track your medications, daily dose times, and adherence — educational support, not a
              replacement for your pharmacist or physician.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Pencil className="size-4 text-primary" aria-hidden="true" />
                  {editingMedication ? 'Edit medication' : 'Add medication'}
                </h2>
                {creating || editingMedication ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreating(false);
                      setEditingId(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
              {creating || editingMedication ? (
                <MedicationForm
                  key={editingId ?? 'new'}
                  defaultValues={editingFormValues}
                  submitting={createMutation.isPending || updateMutation.isPending}
                  submitLabel={editingMedication ? 'Save changes' : 'Add medication'}
                  onCancel={() => {
                    setCreating(false);
                    setEditingId(null);
                  }}
                  onSubmit={editingMedication ? submitUpdate : submitCreate}
                />
              ) : (
                <div className="space-y-4">
                  <Button className="w-full gap-2" onClick={() => setCreating(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add a medication
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Add medications with their daily dose times. You will see them on the daily
                    schedule and can mark each dose taken or skipped.
                  </p>
                </div>
              )}
            </div>

            <nav aria-label="Medication list" className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Your medications</h2>
              {medicationsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : medications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medications yet.</p>
              ) : (
                <ul className="space-y-1">
                  {medications.map((medication) => (
                    <li key={medication.id}>
                      <div
                        className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          editingId === medication.id
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        onClick={() => {
                          setEditingId(medication.id);
                          setCreating(false);
                        }}
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-foreground">
                            {medication.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {medication.dosage} · {formatReminderTimes(medication.reminderTimes)}
                          </span>
                        </span>
                        <button
                          type="button"
                          aria-label="Delete this medication"
                          title="Delete medication"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteMutation.mutate(medication.id);
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <CalendarDays className="size-5 text-primary" aria-hidden="true" />
                Daily schedule
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous day"
                  onClick={() => setScheduleDate((date) => shiftDate(date, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-36 text-center text-sm text-muted-foreground">
                  {formatScheduleDate(scheduleDate)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next day"
                  onClick={() => setScheduleDate((date) => shiftDate(date, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-1"
                  onClick={() => setScheduleDate(todayDateString())}
                >
                  Today
                </Button>
              </div>
            </div>

            {scheduleQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : scheduleQuery.data?.schedule.doses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/40 px-6 py-20 text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <Clock3 className="size-6" />
                </span>
                <h2 className="text-lg font-semibold">No doses scheduled</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  {medications.length === 0
                    ? 'Add your first medication to see its daily dose times here.'
                    : 'No active medications are scheduled for this day. Try another date.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {scheduleQuery.data!.schedule.doses.map((dose) => (
                  <DoseRow
                    key={`${dose.medicationId}:${dose.time}`}
                    dose={dose}
                    busy={statusMutation.isPending}
                    onStatus={(status) => handleStatus(dose, status)}
                  />
                ))}
              </ul>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              {scheduleQuery.data?.schedule.doses.length
                ? `${scheduleQuery.data.schedule.doses.length} dose${scheduleQuery.data.schedule.doses.length === 1 ? '' : 's'} on this day.`
                : ''}
            </p>
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
