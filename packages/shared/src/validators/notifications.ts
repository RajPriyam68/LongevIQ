import { z } from 'zod';
import { NotificationType } from '../types/notifications.js';

export const listNotificationsQuerySchema = z
  .object({
    read: z.enum(['true', 'false']).optional(),
    type: z
      .enum([
        NotificationType.MEDICATION_DUE,
        NotificationType.REPORT_PROCESSED,
        NotificationType.REPORT_FAILED,
        NotificationType.METRIC_ALERT,
        NotificationType.CARE_CONNECTION,
      ])
      .optional(),
    page: z.coerce
      .number()
      .int('Page must be a whole number.')
      .min(1, 'Page must be at least 1.')
      .default(1),
    limit: z.coerce
      .number()
      .int('Limit must be a whole number.')
      .min(1, 'Limit must be at least 1.')
      .max(100, 'Limit must be at most 100.')
      .default(20),
  })
  .strict();

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
