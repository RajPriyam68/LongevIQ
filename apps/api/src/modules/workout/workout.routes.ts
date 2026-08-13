import { Router } from 'express';
import { createWorkoutPlanSchema, listWorkoutPlansQuerySchema } from '@longeviq/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { WorkoutService } from './workout.service.js';
import { WorkoutController } from './workout.controller.js';

export function createWorkoutRouter(service: WorkoutService): Router {
  const controller = new WorkoutController(service);
  const router = Router();

  router.post(
    '/plans',
    validateBody(createWorkoutPlanSchema),
    asyncHandler((req, res) => controller.createPlan(req, res)),
  );
  router.get(
    '/plans',
    validateQuery(listWorkoutPlansQuerySchema),
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
