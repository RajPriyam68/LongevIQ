import { z } from 'zod';
import { UserRole } from '../types/enums.js';

export const adminRoleSchema = z.enum([UserRole.USER, UserRole.DOCTOR, UserRole.ADMIN]);

export const listAdminUsersQuerySchema = z
  .object({
    search: z.string().trim().max(100, 'Search must be at most 100 characters long.').optional(),
    role: adminRoleSchema.optional(),
    active: z.enum(['true', 'false']).optional(),
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

export const listAuditLogsQuerySchema = z
  .object({
    action: z.string().trim().max(100, 'Action must be at most 100 characters long.').optional(),
    entity: z.string().trim().max(100, 'Entity must be at most 100 characters long.').optional(),
    userId: z.string().trim().max(100, 'User ID must be at most 100 characters long.').optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
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

export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
