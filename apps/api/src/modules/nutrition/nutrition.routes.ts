import { Router } from 'express';
import { createNutritionPlanSchema, listNutritionPlansQuerySchema } from '@longeviq/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { NutritionService } from './nutrition.service.js';
import { NutritionController } from './nutrition.controller.js';

export function createNutritionRouter(service: NutritionService): Router {
  const controller = new NutritionController(service);
  const router = Router();

  router.post(
    '/plans',
    validateBody(createNutritionPlanSchema),
    asyncHandler((req, res) => controller.createPlan(req, res)),
  );
  router.get(
    '/plans',
    validateQuery(listNutritionPlansQuerySchema),
    asyncHandler((req, res) => controller.listPlans(req, res)),
  );
  router.get(
    '/plans/:id',
    asyncHandler((req, res) => controller.getPlan(req, res)),
  );
  router.delete(
    '/plans/:id',
    asyncHandler((req, res) => controller.removePlan(req, res)),
  );

  return router;
}
