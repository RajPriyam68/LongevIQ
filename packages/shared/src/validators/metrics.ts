import { z } from 'zod';
import { HEALTH_METRIC_TYPE_VALUES } from '../types/enums.js';
import { HEALTH_METRIC_META, isCompoundMetricType } from '../types/metrics.js';

export const healthMetricTypeSchema = z.enum(HEALTH_METRIC_TYPE_VALUES);

export const notesSchema = z
  .string()
  .trim()
  .max(500, 'Notes must be at most 500 characters long.')
  .optional();

export const recordedAtSchema = z
  .string()
  .datetime({ offset: true, message: 'recordedAt must be an ISO-8601 date-time string.' })
  .optional();

function rangeFor(type: z.infer<typeof healthMetricTypeSchema>) {
  const meta = HEALTH_METRIC_META[type];
  return { min: meta.min, max: meta.max };
}

function applyRange(
  type: z.infer<typeof healthMetricTypeSchema>,
  value: number | undefined,
  secondary: number | undefined,
  ctx: z.RefinementCtx,
): void {
  if (value === undefined) return;
  const meta = HEALTH_METRIC_META[type];
  if (value < meta.min || value > meta.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: `${meta.label} must be between ${meta.min} and ${meta.max} ${meta.unit}.`,
    });
  }
  if (secondary === undefined) return;
  if (meta.secondaryMin !== undefined && meta.secondaryMax !== undefined) {
    if (secondary < meta.secondaryMin || secondary > meta.secondaryMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valueSecondary'],
        message: `${meta.secondaryLabel} must be between ${meta.secondaryMin} and ${meta.secondaryMax} ${meta.unit}.`,
      });
    }
  }
}

export const createMetricSchema = z
  .object({
    type: healthMetricTypeSchema,
    value: z.number().finite('Value must be a finite number.'),
    valueSecondary: z.number().finite('Secondary value must be a finite number.').optional(),
    recordedAt: recordedAtSchema,
    notes: notesSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (isCompoundMetricType(data.type) && data.valueSecondary === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valueSecondary'],
        message: `${HEALTH_METRIC_META[data.type].secondaryLabel} is required for ${HEALTH_METRIC_META[data.type].label}.`,
      });
    }
    if (!isCompoundMetricType(data.type) && data.valueSecondary !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valueSecondary'],
        message: `Secondary value is not supported for ${HEALTH_METRIC_META[data.type].label}.`,
      });
    }
    applyRange(data.type, data.value, data.valueSecondary, ctx);
  });

export const updateMetricSchema = z
  .object({
    type: healthMetricTypeSchema.optional(),
    value: z.number().finite('Value must be a finite number.').optional(),
    valueSecondary: z
      .number()
      .finite('Secondary value must be a finite number.')
      .nullish()
      .optional(),
    recordedAt: recordedAtSchema,
    notes: notesSchema.nullish(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const type = data.type ?? undefined;
    if (type !== undefined) {
      if (isCompoundMetricType(type) && data.valueSecondary === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valueSecondary'],
          message: `${HEALTH_METRIC_META[type].secondaryLabel} is required for ${HEALTH_METRIC_META[type].label}.`,
        });
      }
      if (!isCompoundMetricType(type) && data.valueSecondary !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['valueSecondary'],
          message: `Secondary value is not supported for ${HEALTH_METRIC_META[type].label}.`,
        });
      }
    }
    if (data.value !== undefined) {
      applyRange(type ?? 'WEIGHT', data.value, data.valueSecondary ?? undefined, ctx);
    }
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'At least one field must be provided.',
      });
    }
  });

export const listMetricsQuerySchema = z.object({
  type: healthMetricTypeSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;
export type ListMetricsQuery = z.infer<typeof listMetricsQuerySchema>;
