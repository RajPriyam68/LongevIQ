import { z } from 'zod';
import { MEDICATION_ADHERENCE_STATUS_VALUES, MEDICATION_FORM_VALUES } from '../types/medication.js';

export const medicationFormSchema = z.enum(MEDICATION_FORM_VALUES);
export const medicationAdherenceStatusSchema = z.enum(MEDICATION_ADHERENCE_STATUS_VALUES);

export const MEDICATION_NAME_MAX = 100;
export const MEDICATION_DOSAGE_MAX = 60;
export const MEDICATION_INSTRUCTIONS_MAX = 500;
export const MEDICATION_NOTES_MAX = 1000;
export const MEDICATION_MIN_TIMES = 1;
export const MEDICATION_MAX_TIMES = 6;

export const medicationTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Reminder times must use 24-hour HH:mm format.');

// Calendar dates (YYYY-MM-DD). Medication reminders are per-day schedules rather
// than absolute moments, so dates are normalized to UTC midnight when stored.
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must use YYYY-MM-DD format.');

function validateDateOrder(
  data: { startDate?: string; endDate?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must not be before the start date.',
    });
  }
}

export const createMedicationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required.')
      .max(MEDICATION_NAME_MAX, `Name must be at most ${MEDICATION_NAME_MAX} characters.`),
    dosage: z
      .string()
      .trim()
      .min(1, 'Dosage is required.')
      .max(MEDICATION_DOSAGE_MAX, `Dosage must be at most ${MEDICATION_DOSAGE_MAX} characters.`),
    form: medicationFormSchema.default('PILL'),
    reminderTimes: z
      .array(medicationTimeSchema)
      .min(MEDICATION_MIN_TIMES, `Add at least ${MEDICATION_MIN_TIMES} reminder time.`)
      .max(MEDICATION_MAX_TIMES, `Add at most ${MEDICATION_MAX_TIMES} reminder times.`),
    instructions: z
      .string()
      .trim()
      .max(
        MEDICATION_INSTRUCTIONS_MAX,
        `Instructions must be at most ${MEDICATION_INSTRUCTIONS_MAX} characters.`,
      )
      .optional(),
    notes: z
      .string()
      .trim()
      .max(MEDICATION_NOTES_MAX, `Notes must be at most ${MEDICATION_NOTES_MAX} characters.`)
      .optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => validateDateOrder(data, ctx));

export const updateMedicationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required.')
      .max(MEDICATION_NAME_MAX, `Name must be at most ${MEDICATION_NAME_MAX} characters.`)
      .optional(),
    dosage: z
      .string()
      .trim()
      .min(1, 'Dosage is required.')
      .max(MEDICATION_DOSAGE_MAX, `Dosage must be at most ${MEDICATION_DOSAGE_MAX} characters.`)
      .optional(),
    form: medicationFormSchema.optional(),
    reminderTimes: z
      .array(medicationTimeSchema)
      .min(MEDICATION_MIN_TIMES, `Add at least ${MEDICATION_MIN_TIMES} reminder time.`)
      .max(MEDICATION_MAX_TIMES, `Add at most ${MEDICATION_MAX_TIMES} reminder times.`)
      .optional(),
    instructions: z
      .string()
      .trim()
      .max(
        MEDICATION_INSTRUCTIONS_MAX,
        `Instructions must be at most ${MEDICATION_INSTRUCTIONS_MAX} characters.`,
      )
      .nullish()
      .optional(),
    notes: z
      .string()
      .trim()
      .max(MEDICATION_NOTES_MAX, `Notes must be at most ${MEDICATION_NOTES_MAX} characters.`)
      .nullish()
      .optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.nullish().optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    validateDateOrder(data, ctx);
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'At least one field must be provided.',
      });
    }
  });

export const listMedicationsQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const medicationScheduleQuerySchema = z.object({
  date: dateOnlySchema.optional(),
});

export const setDoseStatusSchema = z
  .object({
    time: medicationTimeSchema,
    date: dateOnlySchema,
    status: medicationAdherenceStatusSchema,
  })
  .strict();

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type ListMedicationsQuery = z.infer<typeof listMedicationsQuerySchema>;
export type MedicationScheduleQuery = z.infer<typeof medicationScheduleQuerySchema>;
export type SetDoseStatusInput = z.infer<typeof setDoseStatusSchema>;
