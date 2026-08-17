import { Router } from 'express';
import { analyticsQuerySchema } from '@longeviq/shared';
import { validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';

export function createAnalyticsRouter(service: AnalyticsService): Router {
  const controller = new AnalyticsController(service);
  const router = Router();

  router.get(
    '/summary',
    validateQuery(analyticsQuerySchema),
    asyncHandler((req, res) => controller.summary(req, res)),
  );
  router.get(
    '/score',
    asyncHandler((req, res) => controller.score(req, res)),
  );
  router.get(
    '/insights',
    validateQuery(analyticsQuerySchema),
    asyncHandler((req, res) => controller.insights(req, res)),
  );

  return router;
}
