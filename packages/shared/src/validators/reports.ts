import { z } from 'zod';
import { REPORT_STATUS_VALUES } from '../types/enums.js';
import { REPORT_CATEGORY_VALUES } from '../types/reports.js';

export const reportCategorySchema = z.enum(REPORT_CATEGORY_VALUES);
export const reportStatusSchema = z.enum(REPORT_STATUS_VALUES);

export const reportDateSchema = z
  .string()
  .trim()
  .min(1, 'reportDate is required.')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'reportDate must be a valid date.',
  });

export const createReportMetadataSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(120, 'Title must be at most 120 characters.'),
    reportDate: reportDateSchema,
    source: z.string().trim().max(100, 'Source must be at most 100 characters.').optional(),
    category: reportCategorySchema.default('OTHER'),
    notes: z.string().trim().max(500, 'Notes must be at most 500 characters.').optional(),
  })
  .strict();

export const updateReportSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(120, 'Title must be at most 120 characters.')
      .optional(),
    reportDate: reportDateSchema.optional(),
    source: z
      .string()
      .trim()
      .max(100, 'Source must be at most 100 characters.')
      .nullish()
      .optional(),
    category: reportCategorySchema.optional(),
    notes: z.string().trim().max(500, 'Notes must be at most 500 characters.').nullish().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'At least one field must be provided.',
      });
    }
  });

export const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
  category: reportCategorySchema.optional(),
  status: reportStatusSchema.optional(),
});

export type CreateReportMetadata = z.infer<typeof createReportMetadataSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
