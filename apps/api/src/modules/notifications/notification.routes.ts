import { Router } from 'express';
import { listNotificationsQuerySchema } from '@longeviq/shared';
import { validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';

export function createNotificationRouter(service: NotificationService): Router {
  const controller = new NotificationController(service);
  const router = Router();

  router.get(
    '/',
    validateQuery(listNotificationsQuerySchema),
    asyncHandler((req, res) => controller.list(req, res)),
  );
  router.get(
    '/unread-count',
    asyncHandler((req, res) => controller.unreadCount(req, res)),
  );
  router.patch(
    '/read-all',
    asyncHandler((req, res) => controller.markAllRead(req, res)),
  );
  router.patch(
    '/:id/read',
    asyncHandler((req, res) => controller.markRead(req, res)),
  );
  router.delete(
    '/:id',
    asyncHandler((req, res) => controller.remove(req, res)),
  );

  return router;
}
