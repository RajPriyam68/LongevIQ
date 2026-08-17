import { z } from 'zod';
import { ANALYTICS_DEFAULT_DAYS, ANALYTICS_MAX_DAYS } from '../types/analytics.js';

export const analyticsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int('Days must be a whole number.')
    .min(1, 'Days must be at least 1.')
    .max(ANALYTICS_MAX_DAYS, `Days must be at most ${ANALYTICS_MAX_DAYS}.`)
    .default(ANALYTICS_DEFAULT_DAYS),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
