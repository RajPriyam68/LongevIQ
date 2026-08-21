import { Router } from 'express';
import { listAdminUsersQuerySchema, listAuditLogsQuerySchema } from '@longeviq/shared';
import { validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';

export function createAdminRouter(service: AdminService): Router {
  const controller = new AdminController(service);
  const router = Router();

  router.get(
    '/summary',
    asyncHandler((req, res) => controller.summary(req, res)),
  );
  router.get(
    '/users',
    validateQuery(listAdminUsersQuerySchema),
    asyncHandler((req, res) => controller.listUsers(req, res)),
  );
  router.get(
    '/audit-logs',
    validateQuery(listAuditLogsQuerySchema),
    asyncHandler((req, res) => controller.listAuditLogs(req, res)),
  );

  return router;
}
