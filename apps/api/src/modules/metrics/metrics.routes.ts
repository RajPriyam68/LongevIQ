import { Router } from 'express';
import { createMetricSchema, listMetricsQuerySchema, updateMetricSchema } from '@longeviq/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { MetricsService } from './metrics.service.js';
import { MetricsController } from './metrics.controller.js';

export function createMetricsRouter(service: MetricsService): Router {
  const controller = new MetricsController(service);
  const router = Router();

  router.post(
    '/',
    validateBody(createMetricSchema),
    asyncHandler((req, res) => controller.create(req, res)),
  );
  router.get(
    '/',
    validateQuery(listMetricsQuerySchema),
    asyncHandler((req, res) => controller.list(req, res)),
  );
  router.get(
    '/:id',
    asyncHandler((req, res) => controller.getOne(req, res)),
  );
  router.patch(
    '/:id',
    validateBody(updateMetricSchema),
    asyncHandler((req, res) => controller.update(req, res)),
  );
  router.delete(
    '/:id',
    asyncHandler((req, res) => controller.remove(req, res)),
  );

  return router;
}
